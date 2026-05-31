# Real piighost in the /config live test (Pyodide) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the JavaScript pipeline-assembly approximation in the `/config` live test with the real piighost library running in the browser via Pyodide, keeping detection in JS and only assembly in Python.

**Architecture:** JS runs the enabled detectors (existing `runDetector`) and produces detections. A lazily-loaded Pyodide runtime installs piighost from PyPI (micropip) and runs a small Python "glue" that maps the website config to piighost's resolver/linker/factory classes, runs the assembly pipeline, and returns the anonymized text, the entity list, colored segments, and source highlights as JSON. The website renders the same 3-column UI from that result.

**Tech Stack:** Next.js 16 (static export), React 19, TypeScript, Vitest; `pyodide` (npm loader + jsDelivr CDN assets); piighost (pure-Python core, installed via micropip).

**Spec:** `docs/superpowers/specs/2026-05-31-pyodide-piighost-config-design.md`

---

## File Structure

- **Create** `src/lib/piighost-bridge.ts` — pure JS: bridge types + `toBridgeConfig`, `detectionsToBridge`, `parseAssembleResult`. No side effects, fully unit-tested.
- **Create** `src/lib/piighost-bridge.test.ts` — unit tests for the pure bridge functions.
- **Create** `src/lib/piighost-runtime.ts` — the Pyodide singleton loader, the embedded Python glue, and `loadPiighostRuntime()` / `assembleWithPiighost()`. Side-effectful; integration-tested.
- **Create** `src/lib/piighost-runtime.integration.test.ts` — slow smoke test that loads the real Pyodide + piighost (Node, network). Excluded from the default `pnpm test`.
- **Create** `vitest.integration.config.ts` — vitest config that runs ONLY `*.integration.test.ts` in the `node` environment.
- **Modify** `vitest.config.ts` — exclude `*.integration.test.ts` from the default run.
- **Modify** `package.json` — add `pyodide` dependency and a `test:integration` script.
- **Modify** `src/lib/run-pipeline.ts` — remove all JS assembly (`assemblePipeline`, `assignToken`, `createTokenContext`, `resolveSpans`, `hashValue`, segment building); keep the detector loop; delegate assembly to `assembleWithPiighost`.
- **Modify** `src/lib/run-pipeline.test.ts` — remove the assembly tests (logic now lives in piighost); keep nothing that references removed functions.
- **Modify** `src/components/playground/config-builder.tsx` — add a `"loading"` status, await the runtime, map the result to the three columns, drop the "approximation" label.
- **Modify** `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/fr.ts` — add `loadingRuntime`; change `approximationNote` text.

---

## Task 1: Dependencies, version pins, and the integration test harness

**Files:**
- Modify: `package.json`
- Create: `vitest.integration.config.ts`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Install Pyodide and confirm its version**

Run:
```bash
pnpm add pyodide
node -e "console.log(require('pyodide/package.json').version)"
```
Expected: a version string is printed, e.g. `0.28.3`. Note it — you will use it as `PYODIDE_VERSION` in Task 3 so the CDN `indexURL` matches the installed loader.

- [ ] **Step 2: Confirm the latest piighost version on PyPI**

Run:
```bash
curl -s https://pypi.org/pypi/piighost/json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).info.version))"
```
Expected: a version string, e.g. `0.12.0`. Use it as `PIIGHOST_VERSION` in Task 3. If the command fails (offline), default to `0.12.0`.

- [ ] **Step 3: Add the `test:integration` script**

In `package.json`, add to `scripts` (keep the existing entries):
```json
    "test:integration": "vitest run --config vitest.integration.config.ts"
```

- [ ] **Step 4: Exclude integration tests from the default run**

Replace the contents of `vitest.config.ts` with:
```ts
import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: [...configDefaults.exclude, "**/*.integration.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 5: Create the integration vitest config**

Create `vitest.integration.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.integration.test.ts"],
    testTimeout: 120_000, // Pyodide download + piighost install is slow
    hookTimeout: 120_000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 6: Verify the default suite still passes and excludes integration**

Run: `pnpm test`
Expected: PASS, the existing 72 tests run (no integration tests exist yet).

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts vitest.integration.config.ts
git commit -m "chore(config): add pyodide dep and integration test harness"
```

---

## Task 2: Pure bridge module (`piighost-bridge.ts`)

**Files:**
- Create: `src/lib/piighost-bridge.ts`
- Test: `src/lib/piighost-bridge.test.ts`

This module is pure (no Pyodide). It defines the JS↔Python contract and the
serialization/parse functions.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/piighost-bridge.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { toBridgeConfig, detectionsToBridge, parseAssembleResult } from "./piighost-bridge";
import { defaultPipeline } from "./detector-config";
import type { Entity } from "./ner";

describe("toBridgeConfig", () => {
  it("projects the pipeline stages and placeholder verbatim", () => {
    const p = { ...defaultPipeline(), name: "x", entityResolverThreshold: 0.9 };
    const b = toBridgeConfig(p);
    expect(b.spanResolver).toBe(p.spanResolver);
    expect(b.entityLinker).toBe(p.entityLinker);
    expect(b.entityResolver).toBe(p.entityResolver);
    expect(b.entityResolverThreshold).toBe(0.9);
    expect(b.placeholder).toEqual(p.placeholder);
  });
});

describe("detectionsToBridge", () => {
  it("maps Entity fields to piighost's Detection.from_dict shape", () => {
    const e: Entity = { text: "Marie", label: "PER", score: 0.8, start: 0, end: 5 };
    expect(detectionsToBridge([e])).toEqual([
      { text: "Marie", label: "PER", start_pos: 0, end_pos: 5, confidence: 0.8 },
    ]);
  });
});

describe("parseAssembleResult", () => {
  it("returns the validated shape", () => {
    const raw = {
      anonymized: "<<PER:1>>",
      entities: [{ label: "PER", text: "Marie", score: 1, token: "<<PER:1>>" }],
      segments: [{ value: "<<PER:1>>", label: "PER" }],
      highlights: [{ start: 0, end: 5, label: "PER", score: 1, text: "Marie" }],
    };
    expect(parseAssembleResult(raw)).toEqual(raw);
  });

  it("throws on a malformed payload", () => {
    expect(() => parseAssembleResult({ anonymized: "x" })).toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/lib/piighost-bridge.test.ts`
Expected: FAIL — `piighost-bridge` module not found.

- [ ] **Step 3: Implement the bridge module**

Create `src/lib/piighost-bridge.ts`:
```ts
import type { ConfigPipeline, Placeholder } from "./detector-config";
import type { Entity } from "./ner";

/** One detection as piighost's `Detection.from_dict` expects it. */
export type BridgeDetection = {
  text: string;
  label: string;
  start_pos: number;
  end_pos: number;
  confidence: number;
};

/** The pipeline config the Python glue understands (a projection of the
 *  website ConfigPipeline — the stage names and placeholder shape already
 *  match piighost's vocabulary). */
export type BridgeConfig = {
  spanResolver: ConfigPipeline["spanResolver"];
  entityLinker: ConfigPipeline["entityLinker"];
  entityResolver: ConfigPipeline["entityResolver"];
  entityResolverThreshold: number;
  placeholder: Placeholder;
};

/** A piece of the anonymized output: plain text, or a replacement token
 *  carrying the label of the entity it stands in for (for coloring). */
export type AnonSegment = { value: string; label?: string };

/** The parsed result of one assembly run. */
export type AssembleResult = {
  anonymized: string;
  entities: { label: string; text: string; score: number; token: string }[];
  segments: AnonSegment[];
  highlights: { start: number; end: number; label: string; score: number; text: string }[];
};

export function toBridgeConfig(pipeline: ConfigPipeline): BridgeConfig {
  return {
    spanResolver: pipeline.spanResolver,
    entityLinker: pipeline.entityLinker,
    entityResolver: pipeline.entityResolver,
    entityResolverThreshold: pipeline.entityResolverThreshold,
    placeholder: pipeline.placeholder,
  };
}

export function detectionsToBridge(entities: Entity[]): BridgeDetection[] {
  return entities.map((e) => ({
    text: e.text,
    label: e.label,
    start_pos: e.start,
    end_pos: e.end,
    confidence: e.score,
  }));
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

/** Validate the JSON the Python glue returns. Throws on a shape mismatch so a
 *  bridge bug surfaces loudly rather than rendering garbage. */
export function parseAssembleResult(raw: unknown): AssembleResult {
  if (
    !isObject(raw) ||
    typeof raw.anonymized !== "string" ||
    !Array.isArray(raw.entities) ||
    !Array.isArray(raw.segments) ||
    !Array.isArray(raw.highlights)
  ) {
    throw new Error("piighost bridge: malformed assemble result");
  }
  return raw as AssembleResult;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/lib/piighost-bridge.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/piighost-bridge.ts src/lib/piighost-bridge.test.ts
git commit -m "feat(config): pure JS bridge contract for the piighost runtime"
```

---

## Task 3: Pyodide runtime + Python glue (`piighost-runtime.ts`)

**Files:**
- Create: `src/lib/piighost-runtime.ts`

This module owns the Pyodide singleton and the embedded Python glue. Replace
`<PYODIDE_VERSION>` and `<PIIGHOST_VERSION>` with the exact versions you noted in
Task 1 (e.g. `0.28.3` and `0.12.0`).

- [ ] **Step 1: Implement the runtime module**

Create `src/lib/piighost-runtime.ts`:
```ts
import { loadPyodide, type PyodideInterface } from "pyodide";
import {
  toBridgeConfig,
  detectionsToBridge,
  parseAssembleResult,
  type AssembleResult,
} from "./piighost-bridge";
import type { ConfigPipeline } from "./detector-config";
import type { Entity } from "./ner";

// Keep these in lockstep: the CDN assets must match the installed loader.
const PYODIDE_VERSION = "<PYODIDE_VERSION>";
const PIIGHOST_VERSION = "<PIIGHOST_VERSION>";

// Python glue. NOTE: we import piighost SUBMODULES, never the top-level
// `piighost` package — the top-level __init__ imports ph_factory.faker_hash,
// which pulls `faker` (an extra we do not install).
const GLUE = `
import json
from piighost.models import Detection
from piighost.anonymizer import Anonymizer
from piighost.resolver.span import (
    ConfidenceSpanConflictResolver,
    DisabledSpanConflictResolver,
)
from piighost.linker.entity import ExactEntityLinker, DisabledEntityLinker
from piighost.resolver.entity import (
    MergeEntityConflictResolver,
    FuzzyEntityConflictResolver,
    DisabledEntityConflictResolver,
)
from piighost.placeholder import (
    LabelCounterPlaceholderFactory,
    LabelHashPlaceholderFactory,
    LabelPlaceholderFactory,
    MaskPlaceholderFactory,
    RedactCounterPlaceholderFactory,
    RedactHashPlaceholderFactory,
    RedactPlaceholderFactory,
)


def _span_resolver(name):
    if name == "disabled":
        return DisabledSpanConflictResolver()
    return ConfidenceSpanConflictResolver()


def _linker(name):
    if name == "disabled":
        return DisabledEntityLinker()
    return ExactEntityLinker()


def _entity_resolver(name, threshold):
    if name == "disabled":
        return DisabledEntityConflictResolver()
    if name == "fuzzy":
        return FuzzyEntityConflictResolver(threshold=threshold)
    return MergeEntityConflictResolver()


def _factory(ph):
    t = ph["type"]
    if t == "label_counter":
        return LabelCounterPlaceholderFactory()
    if t == "label_hash":
        return LabelHashPlaceholderFactory(hash_length=ph["hashLength"])
    if t == "label":
        return LabelPlaceholderFactory()
    if t == "mask":
        return MaskPlaceholderFactory(mask_char=ph["maskChar"])
    if t == "redact_counter":
        return RedactCounterPlaceholderFactory()
    if t == "redact_hash":
        return RedactHashPlaceholderFactory(hash_length=ph["hashLength"])
    return RedactPlaceholderFactory()


def assemble(payload_json):
    payload = json.loads(payload_json)
    text = payload["text"]
    cfg = payload["config"]
    detections = [Detection.from_dict(d) for d in payload["detections"]]

    detections = _span_resolver(cfg["spanResolver"]).resolve(detections)
    entities = _linker(cfg["entityLinker"]).link(text, detections)
    entities = _entity_resolver(
        cfg["entityResolver"], cfg["entityResolverThreshold"]
    ).resolve(entities)

    factory = _factory(cfg["placeholder"])
    anonymized = Anonymizer(ph_factory=factory).anonymize(text, entities)
    tokens = factory.create(entities)  # dict[Entity, str], in entity (appearance) order

    # col 3: one row per entity (surface = first detection; score = its confidence)
    entity_rows = []
    # gather every detection span for segments + highlights
    spans = []  # (start, end, token, label, score, surface)
    for entity, token in tokens.items():
        first = entity.detections[0]
        entity_rows.append(
            {"label": entity.label, "text": first.text,
             "score": first.confidence, "token": token}
        )
        for det in entity.detections:
            spans.append((det.position.start_pos, det.position.end_pos,
                          token, entity.label, det.confidence, det.text))

    spans.sort(key=lambda s: s[0])

    # col 2: colored anonymized text (tokens + raw-text gaps)
    segments = []
    # col 1: source-text highlights
    highlights = []
    cursor = 0
    for start, end, token, label, score, surface in spans:
        if start < cursor:
            continue  # overlap leftover (only possible when span resolver disabled)
        if start > cursor:
            segments.append({"value": text[cursor:start]})
        segments.append({"value": token, "label": label})
        highlights.append({"start": start, "end": end, "label": label,
                           "score": score, "text": surface})
        cursor = end
    if cursor < len(text):
        segments.append({"value": text[cursor:]})

    return json.dumps({
        "anonymized": anonymized,
        "entities": entity_rows,
        "segments": segments,
        "highlights": highlights,
    })
`;

let runtime: Promise<PyodideInterface> | null = null;

/** Lazily load Pyodide, install piighost, and define the glue. Cached; evicted
 *  on failure so a later Retry re-downloads instead of replaying a rejection. */
export function loadPiighostRuntime(): Promise<PyodideInterface> {
  if (runtime) return runtime;

  const created = (async () => {
    // In the browser, fetch the WASM/stdlib assets from the CDN (we do not
    // self-host them). In Node (integration tests), the npm package ships its
    // own assets, so let loadPyodide use its default location.
    const inBrowser = typeof window !== "undefined";
    const py = await loadPyodide(
      inBrowser
        ? { indexURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/` }
        : {},
    );
    await py.loadPackage("micropip");
    const micropip = py.pyimport("micropip");
    await micropip.install(`piighost==${PIIGHOST_VERSION}`);
    py.runPython(GLUE);
    return py;
  })();

  created.catch(() => {
    runtime = null;
  });
  runtime = created;
  return runtime;
}

/** Run the assembly pipeline of the real piighost over the given detections. */
export async function assembleWithPiighost(
  text: string,
  detections: Entity[],
  pipeline: ConfigPipeline,
): Promise<AssembleResult> {
  const py = await loadPiighostRuntime();
  const payload = JSON.stringify({
    text,
    detections: detectionsToBridge(detections),
    config: toBridgeConfig(pipeline),
  });
  py.globals.set("__piighost_payload", payload);
  const raw = py.runPython("assemble(__piighost_payload)") as string;
  return parseAssembleResult(JSON.parse(raw));
}
```

- [ ] **Step 2: Type-check the module**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (no type errors). If `pyodide` types are missing, confirm Task 1 installed it.

- [ ] **Step 3: Commit**

```bash
git add src/lib/piighost-runtime.ts
git commit -m "feat(config): Pyodide runtime running the real piighost assembly"
```

---

## Task 4: Delegate assembly in `run-pipeline.ts`

**Files:**
- Modify: `src/lib/run-pipeline.ts`
- Modify: `src/lib/run-pipeline.test.ts`

- [ ] **Step 1: Replace the whole `run-pipeline.ts` with the detector loop + delegation**

Replace the entire contents of `src/lib/run-pipeline.ts` with:
```ts
import type { Entity } from "./ner";
import type { ConfigPipeline } from "./detector-config";
import { runDetector } from "./detector-config";
import { assembleWithPiighost } from "./piighost-runtime";
import type { AssembleResult } from "./piighost-bridge";

/** Run the whole pipeline in the browser: every ENABLED detector runs in JS
 *  (filtered by its own threshold), then the real piighost assembles the result
 *  via Pyodide. The llm detector is skipped (it does not run in the browser). */
export async function runPipeline(
  pipeline: ConfigPipeline,
  text: string,
): Promise<AssembleResult> {
  const detections: Entity[] = [];
  for (const d of pipeline.detectors) {
    if (!d.enabled || d.config.type === "llm") continue;
    const result = await runDetector(d.config, text);
    const threshold =
      d.config.type === "transformers" || d.config.type === "gliner2" ? d.config.threshold : 0;
    for (const entity of result) {
      if (entity.score >= threshold) detections.push(entity);
    }
  }
  return assembleWithPiighost(text, detections, pipeline);
}
```

- [ ] **Step 2: Remove the obsolete assembly tests**

The previous `run-pipeline.test.ts` tested `hashValue`, `assignToken`, and
`assemblePipeline`, which no longer exist (that logic now lives in piighost).
Delete the file:
```bash
git rm src/lib/run-pipeline.test.ts
```

- [ ] **Step 3: Verify nothing else imports the removed symbols**

Run:
```bash
grep -rn "assemblePipeline\|assignToken\|createTokenContext\|resolveSpans\|hashValue" src
```
Expected: no matches (empty output). If any appear, they are stale references — remove them.

- [ ] **Step 4: Run the default test suite**

Run: `pnpm test`
Expected: PASS. (The assembly tests are gone; `piighost-bridge.test.ts` passes.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/run-pipeline.ts
git commit -m "refactor(config): delegate pipeline assembly to the piighost runtime"
```

---

## Task 5: Wire the UI (`config-builder.tsx`) + i18n

**Files:**
- Modify: `src/i18n/types.ts`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/fr.ts`
- Modify: `src/components/playground/config-builder.tsx`

- [ ] **Step 1: Add the i18n key to the type**

In `src/i18n/types.ts`, find the `playground` section and add a `loadingRuntime`
field next to `approximationNote` (match the surrounding type style, e.g.):
```ts
    loadingRuntime: string;
```

- [ ] **Step 2: Add the English copy and retune the note**

In `src/i18n/en.ts`, in the `playground` block:
- Add: `loadingRuntime: "Loading the piighost engine...",`
- Change `approximationNote` to: `approximationNote: "Runs the real piighost in your browser.",`

- [ ] **Step 3: Add the French copy and retune the note**

In `src/i18n/fr.ts`, in the `playground` block:
- Add: `loadingRuntime: "Chargement du moteur piighost...",`
- Change `approximationNote` to: `approximationNote: "Exécute le vrai piighost dans votre navigateur.",`

- [ ] **Step 4: Verify the dictionaries still type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (both dictionaries satisfy the `Dictionary` type).

- [ ] **Step 5: Update the imports and state in `config-builder.tsx`**

In `src/components/playground/config-builder.tsx`:

Replace the run-pipeline/bridge imports near the top:
```ts
import { runPipeline } from "@/lib/run-pipeline";
import { loadPiighostRuntime } from "@/lib/piighost-runtime";
import type { AnonSegment } from "@/lib/piighost-bridge";
```
(Remove the old `import { runPipeline, type AnonSegment } from "@/lib/run-pipeline";` line.)

Change the status type and add a highlights state. Replace:
```ts
  const [testStatus, setTestStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [testEntities, setTestEntities] = useState<Entity[]>([]);
  const [testAnonSegments, setTestAnonSegments] = useState<AnonSegment[]>([]);
  const [testAnalyzed, setTestAnalyzed] = useState("");
```
with:
```ts
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "running" | "done" | "error">("idle");
  const [testHighlights, setTestHighlights] = useState<Entity[]>([]);
  const [testRows, setTestRows] = useState<AssembleResult["entities"]>([]);
  const [testAnonSegments, setTestAnonSegments] = useState<AnonSegment[]>([]);
  const [testAnalyzed, setTestAnalyzed] = useState("");
```
Add the `AssembleResult` type import to the bridge import line:
```ts
import type { AnonSegment, AssembleResult } from "@/lib/piighost-bridge";
```

- [ ] **Step 6: Update `testColors` and `runTest`**

Replace the `testColors` memo (which referenced `testEntities`):
```ts
  const testColors = useMemo(
    () => assignLabelColors(testHighlights.map((e) => e.label)),
    [testHighlights],
  );
```

Replace `runTest` with:
```ts
  async function runTest() {
    try {
      setTestStatus("loading");
      await loadPiighostRuntime();
      setTestStatus("running");
      const result = await runPipeline(pipeline, testText);
      setTestHighlights(
        result.highlights.map((h) => ({
          text: h.text,
          label: h.label,
          score: h.score,
          start: h.start,
          end: h.end,
        })),
      );
      setTestRows(result.entities);
      setTestAnonSegments(result.segments);
      setTestAnalyzed(testText);
      setTestSnapshot(JSON.stringify({ pipeline, text: testText }));
      setTestStatus("done");
    } catch (err) {
      console.error("pipeline test failed", err);
      setTestStatus("error");
    }
  }
```

- [ ] **Step 7: Update column 1 (input) — loading state, highlight, button disabling**

In the input column, the colored highlight currently reads `testEntities`; point
it at `testHighlights`:
```tsx
              <EntityHighlight text={testAnalyzed} entities={testHighlights} colors={testColors} />
```
Disable the textarea while loading too:
```tsx
              disabled={testStatus === "running" || testStatus === "loading"}
```
In the button row, disable Test while loading and show the loading note. Replace
the Test button's `disabled` and add the loading message:
```tsx
            <Button
              onClick={runTest}
              disabled={
                testStatus === "running" ||
                testStatus === "loading" ||
                !hasEnabledDetector ||
                testText.trim().length === 0
              }
            >
              {(testStatus === "running" || testStatus === "loading") && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              {pg.test}
            </Button>
            {testStatus === "loading" && (
              <span className="text-xs text-muted-foreground">{pg.loadingRuntime}</span>
            )}
```
Keep the existing `done`/`error`/`noEnabledDetectors`/`llmDeploymentNote`/`staleNote` chips. The "done" branch (showing the colored highlight + Edit button) stays as-is.

- [ ] **Step 8: Update column 3 (entities) to read `testRows`**

The entities column currently maps `testEntities`. Replace its empty-check and
list to use `testRows`:
```tsx
          {testStatus !== "done" ? (
            <p className="text-sm text-muted-foreground">{pg.emptyHint}</p>
          ) : testRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{pg.noEntities}</p>
          ) : (
            <ul className="space-y-2">
              {testRows.map((e, i) => (
                <li
                  key={`${e.token}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${testColors.get(e.label) ?? labelStyle(e.label)}`}
                    >
                      {e.label}
                    </span>
                    <span className="truncate font-mono text-sm">{e.text}</span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {(e.score * 100).toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
```
(Column 2 — the anonymized `testAnonSegments` — is unchanged.)

- [ ] **Step 9: Remove the now-unused `Entity` import if needed**

Run: `pnpm exec tsc --noEmit`
Expected: PASS. If it reports `Entity` is unused, the type is still needed for
`useState<Entity[]>` — keep it. Fix any other reported errors (e.g. a leftover
reference to `testEntities`).

- [ ] **Step 10: Build to confirm the static export still compiles**

Run: `pnpm build`
Expected: PASS — all routes prerender, including `/config`.

- [ ] **Step 11: Commit**

```bash
git add src/i18n/types.ts src/i18n/en.ts src/i18n/fr.ts src/components/playground/config-builder.tsx
git commit -m "feat(config): run the real piighost in the live test (loading state, real ids)"
```

---

## Task 6: Integration smoke test

**Files:**
- Create: `src/lib/piighost-runtime.integration.test.ts`

This test loads the real Pyodide + piighost (Node, network). It is excluded from
`pnpm test` and runs via `pnpm test:integration`.

- [ ] **Step 1: Write the smoke test**

Create `src/lib/piighost-runtime.integration.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { assembleWithPiighost } from "./piighost-runtime";
import { defaultPipeline, type ConfigPipeline } from "./detector-config";
import type { Entity } from "./ner";

const det = (text: string, label: string, start: number, score = 0.9): Entity => ({
  text,
  label,
  score,
  start,
  end: start + text.length,
});

describe("assembleWithPiighost (real piighost via Pyodide)", () => {
  beforeAll(async () => {
    // Warm the runtime once (download + install) before the assertions.
    const base: ConfigPipeline = { ...defaultPipeline(), name: "warmup" };
    await assembleWithPiighost("warm up", [], base);
  }, 120_000);

  it("links case variants of the same occurrence to one id (label_counter)", async () => {
    const text = "London team. London is good. london too.";
    const cfg: ConfigPipeline = { ...defaultPipeline(), name: "t" };
    const r = await assembleWithPiighost(
      text,
      [det("London", "LOC", 0), det("London", "LOC", 13), det("london", "LOC", 29)],
      cfg,
    );
    // All three resolve to the same id despite the case difference.
    expect(r.anonymized).toContain("<<LOC:1>>");
    expect(r.anonymized).not.toContain("<<LOC:2>>");
    expect(r.entities).toHaveLength(1);
    expect(r.entities[0].token).toBe("<<LOC:1>>");
  });

  it("produces a deterministic SHA-256 short hash (label_hash)", async () => {
    const cfg: ConfigPipeline = {
      ...defaultPipeline(),
      name: "h",
      placeholder: { type: "label_hash", hashLength: 8 },
    };
    const r1 = await assembleWithPiighost("Marie", [det("Marie", "PER", 0)], cfg);
    const r2 = await assembleWithPiighost("Marie", [det("Marie", "PER", 0)], cfg);
    expect(r1.entities[0].token).toMatch(/^<<PER:[0-9a-f]{8}>>$/);
    expect(r1.entities[0].token).toBe(r2.entities[0].token); // deterministic
  });

  it("returns colored segments and source highlights", async () => {
    const cfg: ConfigPipeline = { ...defaultPipeline(), name: "s" };
    const r = await assembleWithPiighost("Hi Marie", [det("Marie", "PER", 3)], cfg);
    expect(r.segments).toEqual([
      { value: "Hi " },
      { value: "<<PER:1>>", label: "PER" },
    ]);
    expect(r.highlights).toEqual([
      { start: 3, end: 8, label: "PER", score: 0.9, text: "Marie" },
    ]);
  });
});
```

- [ ] **Step 2: Run the integration suite**

Run: `pnpm test:integration`
Expected: PASS (3 tests). First run is slow (Pyodide download + piighost install).
If it fails on the case-insensitive assertion, re-check `ExactEntityLinker`
semantics in the spec — the canonical key is `(text.lower(), label)`.

- [ ] **Step 3: Confirm the default suite is unaffected**

Run: `pnpm test`
Expected: PASS, and the integration test is NOT among the run files.

- [ ] **Step 4: Commit**

```bash
git add src/lib/piighost-runtime.integration.test.ts
git commit -m "test(config): integration smoke test for the piighost runtime"
```

---

## Task 7: Full verification + manual browser check

**Files:** none (verification only)

- [ ] **Step 1: Lint, build, and the fast suite**

Run:
```bash
pnpm build && pnpm test
```
Expected: build prerenders all routes; the fast suite passes. (Pre-existing lint
error in `src/i18n/language-provider.tsx` is unrelated — do not "fix" it here.)

- [ ] **Step 2: Manual browser verification on /config**

Start the dev server (`pnpm dev`) and open `http://localhost:3000/config`.
Inject a regex detector and run a test (the saved-detector localStorage key is
`piighost.detectors`):
```js
// in the browser console, then reload:
localStorage.setItem("piighost.detectors", JSON.stringify([{
  name: "regex-pii",
  config: { type: "regex", patterns: { EMAIL: "[\\w.+-]+@[\\w-]+\\.[\\w.-]+" } },
}]));
```
Add `regex-pii` from the "Add from saved" select, set the test text to something
with a repeated email (e.g. "mail a@b.com then again a@b.com"), and click Test.
Expected:
- A "Loading the piighost engine..." note appears on the first run, then results.
- Both occurrences of the email get the SAME id (`<<EMAIL:1>>`) in the anonymized
  column.
- Column 1 highlights both occurrences in the source; column 3 lists one entity.
- No "approximation" wording remains.

- [ ] **Step 3: Final commit if any verification fix was needed**

If steps required no changes, nothing to commit. Otherwise:
```bash
git add -A
git commit -m "fix(config): address verification findings for the piighost runtime"
```

---

## Self-Review notes (for the implementer)

- **Spec coverage:** packaging via micropip (Task 3), replace-entirely UX + loading
  state (Task 5), detectors stay in JS (Task 4), tests = fast JS + separate
  integration (Tasks 2/6), config→piighost mapping (Task 3 glue), removal of JS
  assembly (Task 4), drop "approximation" label (Task 5). All covered.
- **Version pins:** `PYODIDE_VERSION` and `PIIGHOST_VERSION` are determined by the
  Task 1 commands and substituted in Task 3 — not left as guesses.
- **Type consistency:** `AssembleResult` (bridge) is the single result shape used by
  `assembleWithPiighost`, `runPipeline`, and the UI. The glue's JSON keys
  (`anonymized`, `entities`, `segments`, `highlights`) match `parseAssembleResult`.
- **Known cosmetic gap:** the website `mask` placeholder only carries `maskChar`;
  piighost's `MaskPlaceholderFactory` also has `visible_chars` (default 4) and
  per-label strategies. We pass `mask_char` only and accept piighost's richer,
  now-authoritative masking behavior (the static `tokenExample` preview for mask
  is indicative only and need not match exactly).
