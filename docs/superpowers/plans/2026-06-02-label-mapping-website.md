# Label→entity mapping — Phase B: website

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the playground express a detector's labels as a list (identity) or an `{emitted: model}` mapping, apply it in the live test, and export it to TOML — using the published piighost 0.13.0.

**Architecture:** A pure `labels.ts` layer (`parseLabelSpec`/`labelSpecToText`/`internalLabels`/`remapLabel`) does all the list-vs-dict logic. The gliner2/transformers configs carry a `LabelSpec`; `runDetector` queries the model with the internal labels and remaps outputs to the emitted labels; the TOML export emits a list or an inline table. The "Types to detect" field becomes one-entry-per-line with a raw-text state parsed on blur (fixes the eaten comma).

**Tech Stack:** Next.js 16 (static export), React 19, TypeScript, Vitest; piighost 0.13.0 via Pyodide.

**Spec:** `docs/superpowers/specs/2026-06-02-label-mapping-detectors-design.md` (Partie B). Depends on piighost **0.13.0** (already on PyPI).
**Branch:** `feat/label-mapping` (already checked out; the spec + Phase A plan live here).

**Scope note:** Live-test remap applies to the browser detectors `gliner2` and `transformers`. The UI mapping editor is added to `gliner2` and `transformers`. `llm` does not run in the browser and has no config editor in the site today — its type + TOML export support the dict, but no `llm` UI editor is added (out of scope, consistent with the current UI).

---

## File Structure
- **Modify** `src/lib/labels.ts` — add `LabelSpec` + `parseLabelSpec`/`labelSpecToText`/`internalLabels`/`remapLabel`.
- **Modify** `src/lib/labels.test.ts` — tests for the new helpers.
- **Modify** `src/lib/detector-config.ts` — `LabelSpec` on gliner2/llm; optional on transformers; remap in `runDetector`.
- **Modify** `src/lib/pipeline-export.ts` — emit list or inline-table labels in TOML.
- **Modify** `src/lib/pipeline-export.test.ts` — export tests for the dict case (if the file exists; else add focused tests).
- **Modify** `src/components/playground/detector-playground.tsx` — line-based labels editor (raw text + parse on blur) for gliner2 and transformers.
- **Modify** `src/lib/piighost-runtime.ts` — pin `PIIGHOST_VERSION = "0.13.0"`.
- **Modify** `src/i18n/{types,en,fr}.ts` — labels-field hint copy (one key).

---

## Task 1: labels.ts spec helpers (TDD)

**Files:** Modify `src/lib/labels.ts`; Test `src/lib/labels.test.ts`.

- [ ] **Step 1: Write failing tests** — append to `src/lib/labels.test.ts`:

```ts
import {
  parseLabelSpec,
  labelSpecToText,
  internalLabels,
  remapLabel,
} from "./labels";

describe("parseLabelSpec", () => {
  it("returns a plain list when every line is identity", () => {
    expect(parseLabelSpec("person\norganization")).toEqual(["person", "organization"]);
  });
  it("returns an {emitted: model} dict when any line maps", () => {
    expect(parseLabelSpec("PERSONNE: person\norganization")).toEqual({
      PERSONNE: "person",
      organization: "organization",
    });
  });
  it("trims, skips blank lines, and dedupes by emitted (case-insensitive)", () => {
    expect(parseLabelSpec("  person \n\nPERSON\n")).toEqual(["person"]);
  });
  it("ignores a line whose emitted or model side is empty", () => {
    expect(parseLabelSpec("person\n: x\nLIEU:")).toEqual(["person"]);
  });
});

describe("labelSpecToText", () => {
  it("round-trips a list (one per line)", () => {
    expect(labelSpecToText(["a", "b"])).toBe("a\nb");
  });
  it("renders a dict, identity entries as a bare label", () => {
    expect(labelSpecToText({ PERSONNE: "person", organization: "organization" })).toBe(
      "PERSONNE: person\norganization",
    );
  });
});

describe("internalLabels", () => {
  it("returns the list itself, or the dict values", () => {
    expect(internalLabels(["a", "b"])).toEqual(["a", "b"]);
    expect(internalLabels({ PERSONNE: "person" })).toEqual(["person"]);
  });
});

describe("remapLabel", () => {
  it("is identity for a list", () => {
    expect(remapLabel("person", ["person"])).toBe("person");
  });
  it("maps a model label back to the emitted label for a dict", () => {
    expect(remapLabel("person", { PERSONNE: "person" })).toBe("PERSONNE");
  });
  it("falls back to the input when unmapped", () => {
    expect(remapLabel("date", { PERSONNE: "person" })).toBe("date");
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm exec vitest run src/lib/labels.test.ts`
Expected: FAIL — the four functions aren't exported yet.

- [ ] **Step 3: Implement** — add to `src/lib/labels.ts` (keep the existing `parseLabels`, `LABEL_STYLES`, etc.):

```ts
/** A labels spec: a plain list (identity) or an {emitted: model} mapping. */
export type LabelSpec = string[] | Record<string, string>;

/** Parse the "Types to detect" textarea: one entry per line. "EMITTED: model"
 *  maps; a bare "label" is identity. Returns a plain list when every entry is
 *  identity, otherwise an {emitted: model} dict (identity entries become
 *  {label: label}). Trims, skips blanks, dedupes by emitted (case-insensitive). */
export function parseLabelSpec(input: string): LabelSpec {
  const list: string[] = [];
  const map: Record<string, string> = {};
  const seen = new Set<string>();
  let hasMapping = false;
  for (const line of input.split("\n")) {
    const raw = line.trim();
    if (!raw) continue;
    const i = raw.indexOf(":");
    let emitted: string;
    let model: string;
    if (i === -1) {
      emitted = raw;
      model = raw;
    } else {
      emitted = raw.slice(0, i).trim();
      model = raw.slice(i + 1).trim();
      if (!emitted || !model) continue;
      if (emitted !== model) hasMapping = true;
    }
    const key = emitted.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(emitted);
    map[emitted] = model;
  }
  return hasMapping ? map : list;
}

/** Render a LabelSpec back to the textarea text (one entry per line). */
export function labelSpecToText(spec: LabelSpec): string {
  if (Array.isArray(spec)) return spec.join("\n");
  return Object.entries(spec)
    .map(([emitted, model]) => (emitted === model ? emitted : `${emitted}: ${model}`))
    .join("\n");
}

/** Labels passed to the model (the dict values, or the list itself). */
export function internalLabels(spec: LabelSpec): string[] {
  return Array.isArray(spec) ? spec : Object.values(spec);
}

/** Map a model-emitted (internal) label back to the external label. Identity for
 *  a list or an unmapped label. */
export function remapLabel(label: string, spec: LabelSpec): string {
  if (Array.isArray(spec)) return label;
  for (const [emitted, model] of Object.entries(spec)) {
    if (model === label) return emitted;
  }
  return label;
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm exec vitest run src/lib/labels.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/labels.ts src/lib/labels.test.ts
git commit -m "feat(labels): list|mapping label-spec helpers (parse/render/internal/remap)"
```

---

## Task 2: detector-config types + runDetector remap

**Files:** Modify `src/lib/detector-config.ts`.

- [ ] **Step 1: Widen the types and remap in runDetector.**

In `src/lib/detector-config.ts`:
- Add to the imports at the top:
```ts
import { internalLabels, remapLabel, type LabelSpec } from "./labels";
```
- Change `Gliner2DetectorConfig.labels` and `LlmDetectorConfig.labels` from `labels: string[];` to:
```ts
  labels: LabelSpec;
```
- In `TransformersDetectorConfig`, add a field after `threshold: number;`:
```ts
  labels?: LabelSpec;
```
- In `runDetector`, replace the `gliner2` and `transformers` cases:
```ts
    case "transformers": {
      const ents = await runNer(config.model, text);
      return config.labels
        ? ents.map((e) => ({ ...e, label: remapLabel(e.label, config.labels!) }))
        : ents;
    }
    case "gliner2": {
      const ents = await runGliner(config.model, internalLabels(config.labels), text);
      return ents.map((e) => ({ ...e, label: remapLabel(e.label, config.labels) }));
    }
```
(`defaultConfig` keeps `labels: ["person", ...]` for gliner2 and `["PER", "LOC"]` for llm — plain lists are valid `LabelSpec`s. `runGliner`'s signature stays `(model, labels: string[], text)`; we pass `internalLabels(...)`.)

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS. (If `config.labels!` non-null assertion is flagged, it is guarded by the `config.labels ?` ternary — keep it; the runtime path is correct. If tsc still objects, hoist to `const map = config.labels; return map ? ... : ents;`.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/detector-config.ts
git commit -m "feat(config): detector labels accept a mapping; remap live detections"
```

---

## Task 3: TOML export emits list or inline table

**Files:** Modify `src/lib/pipeline-export.ts`; Test `src/lib/pipeline-export.test.ts`.

- [ ] **Step 1: Write failing tests** — add to `src/lib/pipeline-export.test.ts` (it already imports `toToml` and builds pipelines; mirror its existing helpers/imports):

```ts
import { toToml } from "./pipeline-export";
import { defaultPipeline } from "./detector-config";

describe("toToml detector labels", () => {
  const withDetector = (labels: string[] | Record<string, string>) => ({
    ...defaultPipeline(),
    name: "p",
    detectors: [
      {
        name: "g",
        enabled: true,
        config: {
          type: "gliner2" as const,
          model: "onnx-community/gliner_small-v2.1" as const,
          labels,
          threshold: 0.5,
          flatNer: true,
        },
      },
    ],
  });

  it("emits a list for plain labels", () => {
    expect(toToml(withDetector(["person", "org"]))).toContain('labels = ["person", "org"]');
  });

  it("emits an inline table for a mapping", () => {
    expect(toToml(withDetector({ PERSONNE: "person" }))).toContain('labels = { PERSONNE = "person" }');
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm exec vitest run src/lib/pipeline-export.test.ts`
Expected: FAIL — the mapping case currently throws or emits `[object Object]`/`d.labels.map is not a function`.

- [ ] **Step 3: Implement** — in `src/lib/pipeline-export.ts`, add a helper near `patternsInline`:
```ts
function labelsToml(labels: string[] | Record<string, string>): string {
  if (Array.isArray(labels)) return `[${labels.map(basicString).join(", ")}]`;
  const entries = Object.entries(labels).map(([emitted, model]) => `${emitted} = ${basicString(model)}`);
  return `{ ${entries.join(", ")} }`;
}
```
In `detectorToml`, change the gliner2 `labels` line:
```ts
        `labels = ${labelsToml(d.labels)}`,
```
and the llm `labels` line the same:
```ts
        `labels = ${labelsToml(d.labels)}`,
```
In the `transformers` case, emit `labels` only when present — change it to:
```ts
    case "transformers":
      lines.push(`model = ${basicString(d.model)}`, `threshold = ${d.threshold}`);
      if (d.labels) lines.push(`labels = ${labelsToml(d.labels)}`);
      break;
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm exec vitest run src/lib/pipeline-export.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pipeline-export.ts src/lib/pipeline-export.test.ts
git commit -m "feat(export): emit labels as a TOML list or inline table"
```

---

## Task 4: Labels editor UI (gliner2 + transformers), line-based, parse on blur

**Files:** Modify `src/components/playground/detector-playground.tsx`; `src/i18n/{types,en,fr}.ts`.

- [ ] **Step 1: i18n hint copy.**
- `src/i18n/types.ts` (playground section): add `labelsHint: string;` near `glinerLabelsPlaceholder`.
- `src/i18n/en.ts` (playground): add `labelsHint: "One per line. Map with \"EMITTED: model\" (e.g. PERSON: person), or a bare label for identity.",`
- `src/i18n/fr.ts` (playground): add `labelsHint: "Une par ligne. Mappez avec « ÉMIS: modèle » (ex. PERSONNE: person), ou un label seul pour l'identité.",`

- [ ] **Step 2: Update the labels editor in `detector-playground.tsx`.**

Replace the import line:
```ts
import { assignLabelColors, labelStyle, parseLabels } from "@/lib/labels";
```
with:
```ts
import { assignLabelColors, labelStyle, parseLabelSpec, labelSpecToText } from "@/lib/labels";
```

Add a raw-text state and a resync effect (place the state with the other `useState`s, and the effect with the other effects). The effect resyncs the textarea ONLY when the edited detector identity changes (load/switch), not on our own blur-parse:
```ts
  const [labelsText, setLabelsText] = useState("");
  useEffect(() => {
    if (config.type === "gliner2" || config.type === "transformers") {
      setLabelsText(labelSpecToText(config.labels ?? []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.type, "model" in config ? config.model : config.type, name]);
```
(`name` is the existing detector-name state; loading a saved detector sets `name` + `config`, so the textarea resyncs then. Typing in the textarea changes only `labelsText`, and blur changes `config.labels` — neither retriggers this effect, so typing is never re-normalized.)

Define a small handler near the other handlers:
```ts
  function commitLabels() {
    setConfig((c) =>
      c.type === "gliner2" || c.type === "transformers"
        ? { ...c, labels: parseLabelSpec(labelsText) }
        : c,
    );
  }
```
(If `setConfig` is a plain `useState` setter that does not take an updater elsewhere in this file, match the file's style: `setConfig({ ...config, labels: parseLabelSpec(labelsText) })` guarded by `config.type`.)

In the **gliner2** branch, replace the existing labels textarea (currently `value={config.labels.join(", ")}` + `onChange={... parseLabels ...}`) with:
```tsx
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{pg.glinerLabelsLabel}</label>
                  <textarea
                    className="min-h-20 w-full resize-none rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs"
                    value={labelsText}
                    placeholder={pg.glinerLabelsPlaceholder}
                    disabled={busy}
                    onChange={(e) => setLabelsText(e.target.value)}
                    onBlur={commitLabels}
                  />
                  <p className="text-xs text-muted-foreground">{pg.labelsHint}</p>
                </div>
```
(Use the same `busy`/disabled variable the surrounding fields use; check the file.)

In the **transformers** branch (which today shows only model + threshold), add the SAME labels editor block after the model field, so a transformers detector can optionally remap its fixed model labels:
```tsx
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{pg.glinerLabelsLabel}</label>
                  <textarea
                    className="min-h-20 w-full resize-none rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs"
                    value={labelsText}
                    placeholder={pg.glinerLabelsPlaceholder}
                    disabled={busy}
                    onChange={(e) => setLabelsText(e.target.value)}
                    onBlur={commitLabels}
                  />
                  <p className="text-xs text-muted-foreground">{pg.labelsHint}</p>
                </div>
```

- [ ] **Step 3: Type-check + build**

Run: `pnpm exec tsc --noEmit && pnpm build`
Expected: green. Resolve any error (e.g. if `parseLabels` is referenced elsewhere in the file, replace those usages too — `grep -n parseLabels src/components/playground/detector-playground.tsx`).

- [ ] **Step 4: Commit**

```bash
git add src/components/playground/detector-playground.tsx src/i18n/types.ts src/i18n/en.ts src/i18n/fr.ts
git commit -m "feat(playground): line-based labels editor with mapping (gliner2 + transformers)"
```

---

## Task 5: Pin piighost 0.13.0

**Files:** Modify `src/lib/piighost-runtime.ts`.

- [ ] **Step 1: Bump the pin.** Change `const PIIGHOST_VERSION = "0.12.1";` to:
```ts
const PIIGHOST_VERSION = "0.13.0";
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/piighost-runtime.ts
git commit -m "chore(config): pin piighost==0.13.0 (label mapping)"
```

---

## Task 6: Verify

**Files:** none (verification only).

- [ ] **Step 1: Fast suite + build**

Run: `pnpm test && pnpm build`
Expected: all tests pass (incl. the new labels + export tests); build prerenders `/playground` and `/playground/pipeline`.

- [ ] **Step 2: Integration smoke with 0.13.0**

Run: `pnpm test:integration`
Expected: PASS (loads real piighost 0.13.0; the existing assembly tests still pass — the version bump must not break them).

- [ ] **Step 3: Manual browser check (the mapping)**

`pnpm dev`, open `/playground/detector`. Build a **GLiNER** detector, and in "Types to detect" enter (one per line):
```
PERSONNE: person
LIEU: location
```
- Confirm you can type `:` and that lines/commas are NOT eaten.
- Set text with a person + place, click Test. Expected: detected entities are labelled **PERSONNE** / **LIEU** (not "person"/"location") — the model is queried with the internal labels but emits the mapped ones.
- Save the detector, go to `/playground/pipeline`, add it, click **Export** → the TOML shows `labels = { PERSONNE = "person", LIEU = "location" }`.

- [ ] **Step 4: Final commit (only if a fix was needed)**

If any step required changes, commit them; otherwise nothing to do.

---

## Self-Review notes
- **Spec coverage (Partie B):** B1 types → Task 2; B2 line-based field + parse-on-blur → Tasks 1 & 4; B3 detection remap (gliner2 + transformers) → Task 2; B4 export → Task 3; B5 pin → Task 5; B6 tests → Tasks 1 & 3 + the integration/browser checks in Task 6.
- **Type consistency:** `LabelSpec` (labels.ts) is the single type used by the configs (Task 2), the export helper (Task 3), and the editor (Task 4). `internalLabels`/`remapLabel`/`parseLabelSpec`/`labelSpecToText` keep the same signatures throughout.
- **Scope:** `llm` UI editor intentionally omitted (no llm config UI exists today); its type + TOML export still support the dict.
- **Known nuance:** the site `transformers` remap does not *filter* to the mapped labels (piighost's transformers detector with a label_map also filters). The site applies remap only; acceptable since the primary, demonstrated case is GLiNER. Noted, not a blocker.
