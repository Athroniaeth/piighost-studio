# NER Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/playground` page to the piighost-website that runs named-entity recognition entirely in the visitor's browser, with no backend.

**Architecture:** A client-only React page lazily loads transformers.js (ONNX in WASM, WebGPU when available), downloads a token-classification model on first use with a progress bar, runs inference, and renders the text with entities highlighted. Two pure functions (`groupEntities`, `toSegments`) hold the only non-trivial logic and are covered by unit tests; the model wrapper and UI are thin around them.

**Tech Stack:** Next.js 16 (App Router, static export), React 19, Tailwind v4, shadcn/base-ui components, `@huggingface/transformers` (transformers.js v3), Vitest + React Testing Library.

---

## File Structure

- `src/lib/ner.ts` — types, `groupEntities` (pure), `toSegments` (pure), `loadNer`/`runNer` (transformers.js wrapper, singleton per model).
- `src/lib/ner.test.ts` — unit tests for `groupEntities` and `toSegments`.
- `src/components/playground/entity-highlight.tsx` — renders highlighted text from segments + a label legend.
- `src/components/playground/ner-playground.tsx` — client orchestrator (state machine, textarea, model select, progress, results).
- `src/app/playground/page.tsx` — route (metadata) rendering the orchestrator.
- `src/i18n/types.ts` — add `playground` to `Dictionary` and `nav.playground` stays; add `nav.playgroundLabel` if needed (reuse existing pattern).
- `src/i18n/en.ts`, `src/i18n/fr.ts` — `playground` dictionary content.
- `src/components/site-navbar.tsx` — add a "Playground" link.

---

### Task 1: Add the transformers.js dependency

**Files:**
- Modify: `package.json` (via pnpm)

- [ ] **Step 1: Install the package**

Run:
```bash
cd ~/PycharmProjects/piighost-website && pnpm add @huggingface/transformers
```
Expected: package added to `dependencies`, lockfile updated, no errors.

- [ ] **Step 2: Verify the project still builds**

Run:
```bash
cd ~/PycharmProjects/piighost-website && pnpm build 2>&1 | tail -5
```
Expected: build succeeds (the package is not imported anywhere yet, so this only confirms the install did not break resolution).

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build: add @huggingface/transformers for the NER playground"
```

---

### Task 2: NER types and the `groupEntities` pure function (TDD)

transformers.js token-classification returns one object per token: `{ entity, score, index, word, start, end }`, where `entity` is a BIO tag like `"B-PER"`/`"I-PER"` and `start`/`end` are character offsets into the input text (may be `null` for some tokenizers). `groupEntities` merges these tokens into whole entities.

**Files:**
- Create: `src/lib/ner.ts`
- Test: `src/lib/ner.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ner.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { groupEntities, type RawToken } from "./ner";

const tok = (
  entity: string,
  score: number,
  start: number,
  end: number,
): RawToken => ({ entity, score, index: 0, word: "x", start, end });

describe("groupEntities", () => {
  const text = "Sarah Connor works at Cyberdyne in Los Angeles";

  it("merges B-/I- tokens of the same type into one entity", () => {
    const tokens = [tok("B-PER", 0.99, 0, 5), tok("I-PER", 0.97, 6, 12)];
    const entities = groupEntities(tokens, text);
    expect(entities).toHaveLength(1);
    expect(entities[0]).toMatchObject({ text: "Sarah Connor", label: "PER", start: 0, end: 12 });
    expect(entities[0].score).toBeCloseTo(0.98, 2);
  });

  it("splits adjacent tokens of different types", () => {
    const tokens = [tok("B-PER", 0.9, 0, 5), tok("B-LOC", 0.8, 35, 46)];
    const entities = groupEntities(tokens, text);
    expect(entities.map((e) => e.label)).toEqual(["PER", "LOC"]);
    expect(entities[1].text).toBe("Los Angeles");
  });

  it("starts a new entity on a B- tag even when the type repeats", () => {
    const tokens = [tok("B-PER", 0.9, 0, 5), tok("B-PER", 0.9, 6, 12)];
    expect(groupEntities(tokens, text)).toHaveLength(2);
  });

  it("ignores O (outside) tokens", () => {
    const tokens = [tok("O", 0.9, 0, 5)];
    expect(groupEntities(tokens, text)).toHaveLength(0);
  });

  it("returns an empty array for no tokens", () => {
    expect(groupEntities([], text)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd ~/PycharmProjects/piighost-website && pnpm vitest run src/lib/ner.test.ts
```
Expected: FAIL with a module/export resolution error (`ner.ts` does not exist yet).

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/ner.ts`:
```ts
export type RawToken = {
  entity: string;
  score: number;
  index: number;
  word: string;
  start: number | null;
  end: number | null;
};

export type Entity = {
  text: string;
  label: string;
  score: number;
  start: number;
  end: number;
};

function baseLabel(entity: string): string {
  return entity.replace(/^[BI]-/, "");
}

/**
 * Merge per-token BIO predictions into whole entities, using the character
 * offsets to slice the original text (avoids subword "##" reconstruction).
 * A new entity starts on a "B-" tag, on a label change, or on a gap.
 */
export function groupEntities(tokens: RawToken[], text: string): Entity[] {
  const entities: Entity[] = [];
  let current: { label: string; start: number; end: number; scores: number[] } | null = null;

  const flush = () => {
    if (!current) return;
    const score = current.scores.reduce((a, b) => a + b, 0) / current.scores.length;
    entities.push({
      text: text.slice(current.start, current.end),
      label: current.label,
      score,
      start: current.start,
      end: current.end,
    });
    current = null;
  };

  for (const t of tokens) {
    if (t.entity === "O" || t.start == null || t.end == null) {
      flush();
      continue;
    }
    const label = baseLabel(t.entity);
    const isBegin = t.entity.startsWith("B-");
    const continues =
      current !== null && !isBegin && current.label === label && t.start <= current.end + 1;

    if (continues && current) {
      current.end = t.end;
      current.scores.push(t.score);
    } else {
      flush();
      current = { label, start: t.start, end: t.end, scores: [t.score] };
    }
  }
  flush();
  return entities;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
cd ~/PycharmProjects/piighost-website && pnpm vitest run src/lib/ner.test.ts
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ner.ts src/lib/ner.test.ts
git commit -m "feat(ner): group token-level BIO predictions into entities"
```

---

### Task 3: The `toSegments` pure function (TDD)

Splits the original text into an ordered list of segments so the renderer can wrap entity spans without touching plain text.

**Files:**
- Modify: `src/lib/ner.ts`
- Modify: `src/lib/ner.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/ner.test.ts`:
```ts
import { toSegments } from "./ner";

describe("toSegments", () => {
  const e = (text: string, label: string, start: number, end: number) => ({
    text,
    label,
    score: 1,
    start,
    end,
  });

  it("wraps a single entity in the middle", () => {
    const text = "I am Bob now";
    const segs = toSegments(text, [e("Bob", "PER", 5, 8)]);
    expect(segs).toEqual([
      { value: "I am " },
      { value: "Bob", entity: e("Bob", "PER", 5, 8) },
      { value: " now" },
    ]);
  });

  it("handles an entity at the very start", () => {
    const text = "Bob waved";
    const segs = toSegments(text, [e("Bob", "PER", 0, 3)]);
    expect(segs[0]).toEqual({ value: "Bob", entity: e("Bob", "PER", 0, 3) });
    expect(segs[1]).toEqual({ value: " waved" });
  });

  it("returns the whole text when there are no entities", () => {
    expect(toSegments("plain text", [])).toEqual([{ value: "plain text" }]);
  });

  it("keeps entities ordered by position", () => {
    const text = "Bob and Ann";
    const segs = toSegments(text, [e("Ann", "PER", 8, 11), e("Bob", "PER", 0, 3)]);
    expect(segs.map((s) => s.value)).toEqual(["Bob", " and ", "Ann"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd ~/PycharmProjects/piighost-website && pnpm vitest run src/lib/ner.test.ts
```
Expected: FAIL with "toSegments is not exported / not a function".

- [ ] **Step 3: Write the minimal implementation**

Append to `src/lib/ner.ts`:
```ts
export type Segment = { value: string; entity?: Entity };

/** Split text into plain and entity segments, ordered by character position. */
export function toSegments(text: string, entities: Entity[]): Segment[] {
  const sorted = [...entities].sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let cursor = 0;
  for (const entity of sorted) {
    if (entity.start > cursor) {
      segments.push({ value: text.slice(cursor, entity.start) });
    }
    segments.push({ value: text.slice(entity.start, entity.end), entity });
    cursor = entity.end;
  }
  if (cursor < text.length) {
    segments.push({ value: text.slice(cursor) });
  }
  return segments;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
cd ~/PycharmProjects/piighost-website && pnpm vitest run src/lib/ner.test.ts
```
Expected: PASS (all tests, both describe blocks).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ner.ts src/lib/ner.test.ts
git commit -m "feat(ner): split text into ordered entity segments"
```

---

### Task 4: The transformers.js wrapper (`loadNer` / `runNer`)

A thin, browser-only wrapper. Not unit-tested (it downloads and runs a model); it is exercised by manual verification in Task 8. transformers.js is imported dynamically so it never runs during server prerender or static export.

**Files:**
- Modify: `src/lib/ner.ts`

- [ ] **Step 1: Add the model list, env setup, and load/run functions**

Append to `src/lib/ner.ts`:
```ts
export type ModelId =
  | "Xenova/bert-base-multilingual-cased-ner-hrl"
  | "Xenova/bert-base-NER";

export type ProgressEvent = {
  status: string;
  file?: string;
  progress?: number;
};

// One cached pipeline per model id.
const pipelines = new Map<ModelId, Promise<unknown>>();

async function getPipeline(model: ModelId, onProgress?: (e: ProgressEvent) => void) {
  let existing = pipelines.get(model);
  if (existing) return existing;

  const created = (async () => {
    const { pipeline, env } = await import("@huggingface/transformers");
    // Never look for local model files; always fetch from the HF CDN and use
    // the browser cache.
    env.allowLocalModels = false;
    const device =
      typeof navigator !== "undefined" && "gpu" in navigator ? "webgpu" : "wasm";
    return pipeline("token-classification", model, {
      progress_callback: onProgress,
      device,
    });
  })();

  pipelines.set(model, created);
  return created;
}

/** Pre-load a model (download + warmup). Safe to call repeatedly. */
export async function loadNer(model: ModelId, onProgress?: (e: ProgressEvent) => void) {
  await getPipeline(model, onProgress);
}

/** Run NER on the given text and return grouped entities. */
export async function runNer(model: ModelId, text: string): Promise<Entity[]> {
  const pipe = (await getPipeline(model)) as (
    input: string,
  ) => Promise<RawToken[]>;
  const tokens = await pipe(text);
  return groupEntities(tokens, text);
}
```

- [ ] **Step 2: Verify types compile**

Run:
```bash
cd ~/PycharmProjects/piighost-website && pnpm build 2>&1 | tail -8
```
Expected: build succeeds. If it fails because a node-only module (e.g. `onnxruntime-node`) is pulled into the server bundle, add this to `next.config.ts` under the config object: `serverExternalPackages: ["@huggingface/transformers"]`, then rebuild. (The dynamic `import()` keeps it out of the prerender path, so this is usually unnecessary.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/ner.ts
git commit -m "feat(ner): browser-only transformers.js load/run wrapper"
```

---

### Task 5: Playground i18n dictionary

**Files:**
- Modify: `src/i18n/types.ts`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/fr.ts`
- Modify: `src/i18n/types.ts` (`nav`)

- [ ] **Step 1: Add the types**

In `src/i18n/types.ts`, add `playground: string;` to the `nav` object type, and add this top-level member to `Dictionary` (next to `philosophy`):
```ts
  playground: {
    eyebrow: string;
    title: string;
    description: string;
    modelLabel: string;
    models: { multilingual: string; english: string };
    inputLabel: string;
    example: string;
    analyze: string;
    analyzing: string;
    loadingModel: string;
    firstLoadNote: string;
    resultsTitle: string;
    noEntities: string;
    columns: { text: string; label: string; score: string };
    errorTitle: string;
    retry: string;
  };
```

- [ ] **Step 2: Add the English content**

In `src/i18n/en.ts`, add `playground: "Playground",` to `nav`, and add this member (next to `philosophy`):
```ts
  playground: {
    eyebrow: "Playground",
    title: "Detect PII in your browser",
    description:
      "This runs a named-entity recognition model entirely in your browser. No text leaves your machine. Pick a model, paste some text, and see what gets flagged.",
    modelLabel: "Model",
    models: {
      multilingual: "Multilingual (EN, FR, ...)",
      english: "English only",
    },
    inputLabel: "Your text",
    example:
      "Hi, my name is Sarah Connor. I work at Cyberdyne Systems in Los Angeles, and my colleague James Reese is based in London.",
    analyze: "Analyze",
    analyzing: "Analyzing...",
    loadingModel: "Downloading the model...",
    firstLoadNote:
      "The first run downloads the model to your browser (tens to a few hundred MB). It is cached afterwards, so later runs are instant.",
    resultsTitle: "Detected entities",
    noEntities: "No entities detected.",
    columns: { text: "Text", label: "Label", score: "Score" },
    errorTitle: "Something went wrong",
    retry: "Try again",
  },
```

- [ ] **Step 3: Add the French content**

In `src/i18n/fr.ts`, add `playground: "Playground",` to `nav`, and add this member (next to `philosophy`):
```ts
  playground: {
    eyebrow: "Playground",
    title: "Détectez les données personnelles dans votre navigateur",
    description:
      "Ceci exécute un modèle de reconnaissance d'entités nommées entièrement dans votre navigateur. Aucun texte ne quitte votre machine. Choisissez un modèle, collez un texte, et voyez ce qui est repéré.",
    modelLabel: "Modèle",
    models: {
      multilingual: "Multilingue (EN, FR, ...)",
      english: "Anglais uniquement",
    },
    inputLabel: "Votre texte",
    example:
      "Bonjour, je m'appelle Marie Lambert. Je travaille chez Société Générale à Paris, et mon collègue Jean Moreau est basé à Lyon.",
    analyze: "Analyser",
    analyzing: "Analyse en cours...",
    loadingModel: "Téléchargement du modèle...",
    firstLoadNote:
      "Le premier lancement télécharge le modèle dans votre navigateur (de quelques dizaines à quelques centaines de Mo). Il est ensuite mis en cache, donc les analyses suivantes sont instantanées.",
    resultsTitle: "Entités détectées",
    noEntities: "Aucune entité détectée.",
    columns: { text: "Texte", label: "Label", score: "Score" },
    errorTitle: "Une erreur est survenue",
    retry: "Réessayer",
  },
```

- [ ] **Step 4: Verify types compile**

Run:
```bash
cd ~/PycharmProjects/piighost-website && pnpm build 2>&1 | tail -5
```
Expected: build succeeds (both dictionaries satisfy the `Dictionary` type).

- [ ] **Step 5: Commit**

```bash
git add src/i18n/types.ts src/i18n/en.ts src/i18n/fr.ts
git commit -m "feat(i18n): playground dictionary in EN and FR"
```

---

### Task 6: The `EntityHighlight` component

**Files:**
- Create: `src/components/playground/entity-highlight.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/playground/entity-highlight.tsx`:
```tsx
"use client";

import { toSegments, type Entity } from "@/lib/ner";

const LABEL_STYLES: Record<string, string> = {
  PER: "bg-primary/10 text-primary",
  ORG: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  LOC: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  MISC: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
};

function styleFor(label: string): string {
  return LABEL_STYLES[label] ?? "bg-muted text-foreground";
}

export function EntityHighlight({ text, entities }: { text: string; entities: Entity[] }) {
  const segments = toSegments(text, entities);
  const labels = Array.from(new Set(entities.map((e) => e.label)));

  return (
    <div className="space-y-4">
      <p className="leading-relaxed whitespace-pre-wrap">
        {segments.map((seg, i) =>
          seg.entity ? (
            <span
              key={i}
              className={`rounded px-1 ${styleFor(seg.entity.label)}`}
              title={`${seg.entity.label} (${(seg.entity.score * 100).toFixed(0)}%)`}
            >
              {seg.value}
            </span>
          ) : (
            <span key={i}>{seg.value}</span>
          ),
        )}
      </p>
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {labels.map((label) => (
            <span
              key={label}
              className={`rounded px-2 py-0.5 text-xs font-medium ${styleFor(label)}`}
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
cd ~/PycharmProjects/piighost-website && pnpm build 2>&1 | tail -5
```
Expected: build succeeds (component is not yet referenced, this only type-checks it).

- [ ] **Step 3: Commit**

```bash
git add src/components/playground/entity-highlight.tsx
git commit -m "feat(playground): highlighted text + label legend"
```

---

### Task 7: The `NerPlayground` orchestrator

A client state machine: `idle -> loading -> analyzing -> done` (or `error`). Loads the model on the first Analyze, caches it, runs inference, shows results.

**Files:**
- Create: `src/components/playground/ner-playground.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/playground/ner-playground.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityHighlight } from "@/components/playground/entity-highlight";
import { loadNer, runNer, type Entity, type ModelId, type ProgressEvent } from "@/lib/ner";
import { useT } from "@/i18n/use-t";

type Status = "idle" | "loading" | "analyzing" | "done" | "error";

const MODELS: { id: ModelId; key: "multilingual" | "english" }[] = [
  { id: "Xenova/bert-base-multilingual-cased-ner-hrl", key: "multilingual" },
  { id: "Xenova/bert-base-NER", key: "english" },
];

export function NerPlayground() {
  const { t } = useT();
  const pg = t.playground;
  const [model, setModel] = useState<ModelId>(MODELS[0].id);
  const [text, setText] = useState(pg.example);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [analyzed, setAnalyzed] = useState("");

  async function analyze() {
    try {
      setStatus("loading");
      setProgress(0);
      await loadNer(model, (e: ProgressEvent) => {
        if (e.status === "progress" && typeof e.progress === "number") {
          setProgress(Math.round(e.progress));
        }
      });
      setStatus("analyzing");
      const result = await runNer(model, text);
      setEntities(result);
      setAnalyzed(text);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  const busy = status === "loading" || status === "analyzing";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium" htmlFor="ner-model">
          {pg.modelLabel}
        </label>
        <select
          id="ner-model"
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
          value={model}
          disabled={busy}
          onChange={(e) => setModel(e.target.value as ModelId)}
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {pg.models[m.key]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="ner-input">
          {pg.inputLabel}
        </label>
        <textarea
          id="ner-input"
          className="min-h-32 w-full rounded-lg border bg-background p-3 text-sm"
          value={text}
          disabled={busy}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{pg.firstLoadNote}</p>
      </div>

      <div className="flex items-center gap-3">
        <Button size="lg" onClick={analyze} disabled={busy || text.trim().length === 0}>
          {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
          {status === "loading"
            ? `${pg.loadingModel} ${progress > 0 ? `${progress}%` : ""}`
            : status === "analyzing"
              ? pg.analyzing
              : pg.analyze}
        </Button>
      </div>

      {status === "error" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{pg.errorTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={analyze}>
              {pg.retry}
            </Button>
          </CardContent>
        </Card>
      )}

      {status === "done" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{pg.resultsTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <EntityHighlight text={analyzed} entities={entities} />
            {entities.length === 0 ? (
              <p className="text-sm text-muted-foreground">{pg.noEntities}</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-4 font-medium">{pg.columns.text}</th>
                    <th className="py-1 pr-4 font-medium">{pg.columns.label}</th>
                    <th className="py-1 font-medium">{pg.columns.score}</th>
                  </tr>
                </thead>
                <tbody>
                  {entities.map((e, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-1 pr-4 font-mono">{e.text}</td>
                      <td className="py-1 pr-4">{e.label}</td>
                      <td className="py-1">{(e.score * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
cd ~/PycharmProjects/piighost-website && pnpm build 2>&1 | tail -5
```
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/playground/ner-playground.tsx
git commit -m "feat(playground): NER orchestrator with model load and results"
```

---

### Task 8: The `/playground` route and navbar link

**Files:**
- Create: `src/app/playground/page.tsx`
- Modify: `src/components/site-navbar.tsx`

- [ ] **Step 1: Create the page**

Create `src/app/playground/page.tsx`:
```tsx
import { NerPlayground } from "@/components/playground/ner-playground";

export const metadata = { title: "Playground" };

export default function PlaygroundPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <NerPlayground />
    </div>
  );
}
```

- [ ] **Step 2: Add the navbar link**

In `src/components/site-navbar.tsx`, find the line rendering the philosophy link:
```tsx
          <NavLink href="/philosophy" label={t.nav.philosophy} />
```
Add a playground link immediately before it:
```tsx
          <NavLink href="/playground" label={t.nav.playground} />
          <NavLink href="/philosophy" label={t.nav.philosophy} />
```

- [ ] **Step 3: Build and verify the route is generated**

Run:
```bash
cd ~/PycharmProjects/piighost-website && pnpm build 2>&1 | tail -15
```
Expected: build succeeds and the route list includes `/playground`.

- [ ] **Step 4: Manual verification in the dev server**

Run (if not already running):
```bash
cd ~/PycharmProjects/piighost-website && pnpm dev
```
Then in a browser at `http://localhost:3000/playground`:
- The page loads with the example text and the model select.
- Click "Analyze": a progress percentage appears while the model downloads, then "Analyzing...", then results.
- The example names/orgs/locations are highlighted and listed in the table with labels and scores.
- Switch the language toggle to FR: all playground labels and the example text switch to French.
- A second Analyze is fast (model cached).

Confirm each point before committing.

- [ ] **Step 5: Commit**

```bash
git add src/app/playground/page.tsx src/components/site-navbar.tsx
git commit -m "feat(playground): /playground route and navbar link"
```

---

### Task 9: Full verification

- [ ] **Step 1: Run the test suite**

Run:
```bash
cd ~/PycharmProjects/piighost-website && pnpm vitest run
```
Expected: all tests pass, including the new `src/lib/ner.test.ts`.

- [ ] **Step 2: Run the content audit (no em-dashes, no banned words)**

Run:
```bash
cd ~/PycharmProjects/piighost-website && grep -rn "—" src/i18n/ src/components/playground/ 2>/dev/null; grep -rniE "delve|seamless|robust|leverage" src/i18n/ src/components/playground/ 2>/dev/null; echo "audit done"
```
Expected: only "audit done" prints (no matches).

- [ ] **Step 3: Final production build**

Run:
```bash
cd ~/PycharmProjects/piighost-website && pnpm build 2>&1 | tail -15
```
Expected: build succeeds, `/playground` listed as a static route.

---

## Notes for the implementer

- **Static export + transformers.js:** the package is only ever reached through a dynamic `import()` inside `src/lib/ner.ts`, which runs in the browser on user action. It must never be imported at the top level of a server-rendered module. If `pnpm build` ever pulls a node-only dependency into the server bundle, set `serverExternalPackages: ["@huggingface/transformers"]` in `next.config.ts`.
- **Why offsets, not word reconstruction:** `groupEntities` slices the original text using `start`/`end`, so subword `##` tokens never need stitching. If a future model returns `null` offsets, those tokens are skipped (the entity is simply not shown) rather than mis-rendered.
- **Model labels:** `Xenova/bert-base-multilingual-cased-ner-hrl` emits `PER`/`ORG`/`LOC`; `Xenova/bert-base-NER` emits `PER`/`ORG`/`LOC`/`MISC`. Both are covered by `LABEL_STYLES`, with a fallback style for anything else.
- **Scope:** regex, LLM/Mistral, and GLiNER zero-shot are explicitly out of scope for this plan (later phases).
