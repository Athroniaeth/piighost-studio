# Line-based Label-Mapping Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-text labels `<textarea>` (gliner2 + transformers) in the detector playground with a structured, reusable line-based editor: one row per entity, `[ searched ] → [ emitted as ]`, with add/remove.

**Architecture:** A new `LabelMappingEditor` client component holds local `rows` state and commits live (on every change) by converting rows to a `LabelSpec` and calling `onChange`. The parent stores the `LabelSpec` in `config.labels`. Detector identity is encoded in the editor's React `key`, so switching type / loading a saved detector remounts and re-seeds it — replacing the current fragile resync `useEffect`. Two new pure helpers in `labels.ts` (`rowsToLabelSpec`, `labelSpecToRows`) replace `parseLabelSpec` / `labelSpecToText`.

**Tech Stack:** Next.js 16 (static export), React 19, TypeScript, Tailwind v4, shadcn/ui base-ui Button, lucide-react, Vitest + Testing Library + jsdom.

**Spec:** `docs/superpowers/specs/2026-06-02-label-mapping-editor-design.md`

---

### Task 1: Conversion helpers `rowsToLabelSpec` / `labelSpecToRows`

Add the structured-row helpers alongside the existing ones. The old
`parseLabelSpec` / `labelSpecToText` stay for now (still used by the component)
and are removed in Task 4 so the build stays green between tasks.

**Files:**
- Modify: `src/lib/labels.ts` (add after `labelSpecToText`, before `internalLabels` at line 131)
- Test: `src/lib/labels.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/labels.test.ts` after the `labelSpecToText` describe block (line 79). Also add `rowsToLabelSpec, labelSpecToRows, type LabelRow` to the import from `"./labels"` at the top.

```ts
describe("rowsToLabelSpec", () => {
  const rows = (...pairs: [string, string][]) =>
    pairs.map(([model, emitted]) => ({ model, emitted }));

  it("returns a plain list when no row remaps", () => {
    expect(rowsToLabelSpec(rows(["person", ""], ["location", ""]))).toEqual([
      "person",
      "location",
    ]);
  });
  it("treats emitted === model as identity (still a list)", () => {
    expect(rowsToLabelSpec(rows(["person", "person"]))).toEqual(["person"]);
  });
  it("returns an {emitted: model} dict when any row remaps", () => {
    expect(rowsToLabelSpec(rows(["person", "PERSONNE"], ["location", ""]))).toEqual({
      PERSONNE: "person",
      location: "location",
    });
  });
  it("trims fields and drops rows whose model is blank", () => {
    expect(rowsToLabelSpec(rows([" person ", " PERSONNE "], ["  ", "X"]))).toEqual({
      PERSONNE: "person",
    });
  });
  it("dedupes by model, case-insensitively, keeping the first row", () => {
    expect(rowsToLabelSpec(rows(["person", "A"], ["PERSON", "B"]))).toEqual({
      A: "person",
    });
  });
  it("returns an empty list for no usable rows", () => {
    expect(rowsToLabelSpec(rows(["", ""]))).toEqual([]);
  });
});

describe("labelSpecToRows", () => {
  it("maps a list to rows with an empty emitted field", () => {
    expect(labelSpecToRows(["person", "location"])).toEqual([
      { model: "person", emitted: "" },
      { model: "location", emitted: "" },
    ]);
  });
  it("maps a dict to {model, emitted} rows", () => {
    expect(labelSpecToRows({ PERSONNE: "person" })).toEqual([
      { model: "person", emitted: "PERSONNE" },
    ]);
  });
  it("collapses an identity dict entry to a blank emitted field", () => {
    expect(labelSpecToRows({ person: "person", LIEU: "location" })).toEqual([
      { model: "person", emitted: "" },
      { model: "location", emitted: "LIEU" },
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/lib/labels.test.ts`
Expected: FAIL — `rowsToLabelSpec`/`labelSpecToRows`/`LabelRow` are not exported.

- [ ] **Step 3: Implement the helpers**

In `src/lib/labels.ts`, insert after `labelSpecToText` (after line 129):

```ts
/** One editable row of the label editor: the model-facing label, and the
 *  emitted label (blank means "same as the model label"). */
export type LabelRow = { model: string; emitted: string };

/** Build a LabelSpec from editor rows. Trims both fields, drops rows whose
 *  model side is blank, dedupes by model (case-insensitive, first wins). The
 *  effective emitted label is `emitted || model`; if no row's emitted differs
 *  from its model, returns a plain identity list, otherwise an
 *  {emitted: model} dict. */
export function rowsToLabelSpec(rows: LabelRow[]): LabelSpec {
  const list: string[] = [];
  const map: Record<string, string> = {};
  const seen = new Set<string>();
  let hasMapping = false;
  for (const row of rows) {
    const model = row.model.trim();
    if (!model) continue;
    const key = model.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const emitted = row.emitted.trim() || model;
    if (emitted !== model) hasMapping = true;
    list.push(model);
    map[emitted] = model;
  }
  return hasMapping ? map : list;
}

/** Expand a LabelSpec into editor rows. A list yields rows with a blank emitted
 *  field; a dict yields {model, emitted} rows, collapsing identity entries
 *  (emitted === model) to a blank emitted field so they read cleanly. */
export function labelSpecToRows(spec: LabelSpec): LabelRow[] {
  if (Array.isArray(spec)) return spec.map((model) => ({ model, emitted: "" }));
  return Object.entries(spec).map(([emitted, model]) => ({
    model,
    emitted: emitted === model ? "" : emitted,
  }));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/lib/labels.test.ts`
Expected: PASS (all existing + new tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/labels.ts src/lib/labels.test.ts
git commit -m "feat(labels): row<->LabelSpec helpers for the mapping editor"
```

---

### Task 2: i18n keys for the editor

Add the new copy and remove the keys the textarea used (now dead). Order
matters: `types.ts` first (the dictionaries are shape-checked against it).

**Files:**
- Modify: `src/i18n/types.ts:128-132`
- Modify: `src/i18n/en.ts:260-264`
- Modify: `src/i18n/fr.ts:261-265`

- [ ] **Step 1: Update the Dictionary type**

In `src/i18n/types.ts`, replace lines 128-132:

```ts
    glinerLabelsLabel: string;
    glinerLabelsPlaceholder: string;
    glinerLabelsHint: string;
    labelsHint: string;
    labelsLabel: string;
```

with:

```ts
    glinerLabelsLabel: string;
    labelSearchedPlaceholder: string;
    labelEmittedPlaceholder: string;
    labelAdd: string;
    labelEmittedHint: string;
```

- [ ] **Step 2: Update the English dictionary**

In `src/i18n/en.ts`, replace lines 260-264:

```ts
    glinerLabelsLabel: "Types to detect",
    glinerLabelsPlaceholder: "person, email, phone number, address",
    glinerLabelsHint: "Comma-separated. Re-run the analysis to apply new types.",
    labelsHint: "One per line. Map with \"EMITTED: model\" (e.g. PERSON: person), or a bare label for identity.",
    labelsLabel: "Allowed labels",
```

with:

```ts
    glinerLabelsLabel: "Types to detect",
    labelSearchedPlaceholder: "person",
    labelEmittedPlaceholder: "emitted as (optional)",
    labelAdd: "Add an entity",
    labelEmittedHint: "Left: what the model looks for. Right: the emitted label (blank = identical).",
```

- [ ] **Step 3: Update the French dictionary**

In `src/i18n/fr.ts`, replace lines 261-265:

```ts
    glinerLabelsLabel: "Types à détecter",
    glinerLabelsPlaceholder: "person, email, phone number, address",
    glinerLabelsHint: "Séparés par des virgules. Relancez l'analyse pour appliquer.",
    labelsHint: "Une par ligne. Mappez avec « ÉMIS: modèle » (ex. PERSONNE: person), ou un label seul pour l’identité.",
    labelsLabel: "Labels autorisés",
```

with:

```ts
    glinerLabelsLabel: "Types à détecter",
    labelSearchedPlaceholder: "person",
    labelEmittedPlaceholder: "étiqueté comme (optionnel)",
    labelAdd: "Ajouter une entité",
    labelEmittedHint: "Gauche : ce que cherche le modèle. Droite : le label émis (vide = identique).",
```

- [ ] **Step 4: Verify the types compile**

Run: `pnpm exec tsc --noEmit`
Expected: FAIL at `detector-playground.tsx` (it still references `pg.glinerLabelsPlaceholder` / `pg.labelsHint`). That is expected and fixed in Task 4. Confirm there are NO errors in `src/i18n/*.ts` themselves.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/types.ts src/i18n/en.ts src/i18n/fr.ts
git commit -m "i18n: editor row labels; drop dead textarea label keys"
```

---

### Task 3: `LabelMappingEditor` component

**Files:**
- Create: `src/components/playground/label-mapping-editor.tsx`
- Test: `src/components/playground/label-mapping-editor.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/playground/label-mapping-editor.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/i18n/use-t", () => ({
  useT: () => ({
    t: {
      playground: {
        labelSearchedPlaceholder: "person",
        labelEmittedPlaceholder: "emitted as (optional)",
        labelAdd: "Add an entity",
        labelEmittedHint: "hint",
        remove: "Remove",
      },
    },
  }),
}));

import { LabelMappingEditor } from "./label-mapping-editor";

const searched = () => screen.getAllByPlaceholderText("person");
const emitted = () => screen.getAllByPlaceholderText("emitted as (optional)");

describe("LabelMappingEditor", () => {
  it("seeds one row per list label, with empty emitted fields", () => {
    render(<LabelMappingEditor value={["person", "location"]} onChange={() => {}} />);
    expect(searched().map((i) => (i as HTMLInputElement).value)).toEqual(["person", "location"]);
    expect(emitted().every((i) => (i as HTMLInputElement).value === "")).toBe(true);
  });

  it("seeds rows from a dict mapping", () => {
    render(<LabelMappingEditor value={{ PERSONNE: "person" }} onChange={() => {}} />);
    expect((searched()[0] as HTMLInputElement).value).toBe("person");
    expect((emitted()[0] as HTMLInputElement).value).toBe("PERSONNE");
  });

  it("shows a single blank row when value is empty", () => {
    render(<LabelMappingEditor value={[]} onChange={() => {}} />);
    expect(searched()).toHaveLength(1);
    expect((searched()[0] as HTMLInputElement).value).toBe("");
  });

  it("emits a dict when an emitted field is filled in", async () => {
    const onChange = vi.fn();
    render(<LabelMappingEditor value={["person"]} onChange={onChange} />);
    await userEvent.type(emitted()[0], "PERSONNE");
    expect(onChange).toHaveBeenLastCalledWith({ PERSONNE: "person" });
  });

  it("adds a row and emits the updated list", async () => {
    const onChange = vi.fn();
    render(<LabelMappingEditor value={["person"]} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Add an entity" }));
    expect(searched()).toHaveLength(2);
    await userEvent.type(searched()[1], "location");
    expect(onChange).toHaveBeenLastCalledWith(["person", "location"]);
  });

  it("removes a row and emits the remaining list", async () => {
    const onChange = vi.fn();
    render(<LabelMappingEditor value={["person", "location"]} onChange={onChange} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    expect(onChange).toHaveBeenLastCalledWith(["location"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/components/playground/label-mapping-editor.test.tsx`
Expected: FAIL — module `./label-mapping-editor` does not exist.

- [ ] **Step 3: Implement the component**

Create `src/components/playground/label-mapping-editor.tsx`:

```tsx
"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { labelSpecToRows, rowsToLabelSpec, type LabelRow, type LabelSpec } from "@/lib/labels";
import { useT } from "@/i18n/use-t";

function seed(value: LabelSpec): LabelRow[] {
  const rows = labelSpecToRows(value);
  return rows.length ? rows : [{ model: "", emitted: "" }];
}

/** Structured editor for a detector's labels. Each row is one entity:
 *  `searched -> emitted`. Commits live: every edit converts the rows to a
 *  LabelSpec and calls onChange. The parent re-seeds it by changing the
 *  component `key` (detector identity), so there is no resync effect here. */
export function LabelMappingEditor({
  value,
  onChange,
  disabled,
}: {
  value: LabelSpec;
  onChange: (spec: LabelSpec) => void;
  disabled?: boolean;
}) {
  const { t } = useT();
  const pg = t.playground;
  const [rows, setRows] = useState<LabelRow[]>(() => seed(value));

  function commit(next: LabelRow[]) {
    setRows(next);
    onChange(rowsToLabelSpec(next));
  }

  const inputClass =
    "min-w-0 flex-1 rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs";

  return (
    <div className="space-y-1.5">
      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              className={inputClass}
              value={row.model}
              placeholder={pg.labelSearchedPlaceholder}
              disabled={disabled}
              onChange={(e) =>
                commit(rows.map((r, j) => (j === i ? { ...r, model: e.target.value } : r)))
              }
            />
            <span aria-hidden className="shrink-0 text-muted-foreground">
              →
            </span>
            <input
              className={inputClass}
              value={row.emitted}
              placeholder={pg.labelEmittedPlaceholder}
              disabled={disabled}
              onChange={(e) =>
                commit(rows.map((r, j) => (j === i ? { ...r, emitted: e.target.value } : r)))
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-label={pg.remove}
              disabled={disabled}
              onClick={() => {
                const next = rows.filter((_, j) => j !== i);
                commit(next.length ? next : [{ model: "", emitted: "" }]);
              }}
            >
              <X />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => commit([...rows, { model: "", emitted: "" }])}
      >
        <Plus /> {pg.labelAdd}
      </Button>
      <p className="text-xs text-muted-foreground">{pg.labelEmittedHint}</p>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/components/playground/label-mapping-editor.test.tsx`
Expected: PASS (6 tests).

Note: if `@testing-library/user-event` is not already a dependency, check with `grep user-event package.json`; the existing component tests use Testing Library — if `user-event` is missing, use `fireEvent.change`/`fireEvent.click` from `@testing-library/react` instead (adjust the test accordingly; `fireEvent.change(input, { target: { value: "X" } })` fires one change).

- [ ] **Step 5: Commit**

```bash
git add src/components/playground/label-mapping-editor.tsx src/components/playground/label-mapping-editor.test.tsx
git commit -m "feat(playground): LabelMappingEditor row-based labels component"
```

---

### Task 4: Wire the editor into the detector playground; remove the textarea path

Replace both label `<textarea>`s with the editor, drop the dead label state /
helpers, and remove `parseLabelSpec` / `labelSpecToText` (now unused).

**Files:**
- Modify: `src/components/playground/detector-playground.tsx`
- Modify: `src/lib/labels.ts` (remove `parseLabelSpec`, `labelSpecToText`)
- Modify: `src/lib/labels.test.ts` (remove their describe blocks)

- [ ] **Step 1: Import the editor; drop the old labels import**

In `detector-playground.tsx` line 10, change:

```ts
import { assignLabelColors, labelStyle, parseLabelSpec, labelSpecToText } from "@/lib/labels";
```

to:

```ts
import { assignLabelColors, labelStyle, type LabelSpec } from "@/lib/labels";
import { LabelMappingEditor } from "@/components/playground/label-mapping-editor";
```

- [ ] **Step 2: Remove `labelsText` state and the resync effect**

Delete line 82 (`const [labelsText, setLabelsText] = useState("");`) and the entire resync `useEffect` at lines 96-101:

```ts
  useEffect(() => {
    if (config.type === "gliner2" || config.type === "transformers") {
      setLabelsText(labelSpecToText(config.labels ?? []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.type, "model" in config ? config.model : config.type, name]);
```

If `useEffect` is now used only once (the mount effect at line 84), keep the import — it is still used. Do not remove the `useEffect` import.

- [ ] **Step 3: Simplify `test()` and `save()`; delete `configWithLabels` and `commitLabels`**

Replace the `configWithLabels` helper + `test()` + `save()` + `commitLabels` block (currently lines ~113-153) with:

```ts
  async function test() {
    try {
      setStatus("running");
      setDurationMs(null);
      const started = performance.now();
      const result = await runDetector(config, text);
      setDurationMs(performance.now() - started);
      setAllEntities(result);
      setAnalyzed(text);
      setStatus("done");
    } catch (err) {
      console.error("detector test failed", err);
      setStatus("error");
    }
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaved(saveDetector(trimmed, config));
  }
```

(Removes `configWithLabels()`, `commitLabels()`, and the `parseLabelSpec` re-parse — `config.labels` is now always current because the editor commits live.)

- [ ] **Step 4: Replace the transformers labels textarea**

In the transformers block, replace (lines ~264-275):

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

with:

```tsx
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{pg.glinerLabelsLabel}</label>
                  <LabelMappingEditor
                    key={`transformers-${config.model}-${name}`}
                    value={config.labels ?? []}
                    disabled={busy}
                    onChange={(labels) => setConfig({ ...config, labels })}
                  />
                </div>
```

- [ ] **Step 5: Replace the gliner2 labels textarea**

In the gliner2 block, replace the equivalent textarea div (lines ~294-305) with:

```tsx
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{pg.glinerLabelsLabel}</label>
                  <LabelMappingEditor
                    key={`gliner2-${config.model}-${name}`}
                    value={config.labels}
                    disabled={busy}
                    onChange={(labels) => setConfig({ ...config, labels })}
                  />
                </div>
```

Note: `config.labels` is required on gliner2 (no `?? []`) and optional on transformers (`config.labels ?? []`), matching their types. The `onChange` setConfig narrows correctly because it is inside the `config.type === "..."` guard; if TypeScript complains about the spread, cast via `setConfig({ ...config, labels } as DetectorConfig)`.

- [ ] **Step 6: Remove the now-unused helpers**

In `src/lib/labels.ts`, delete `parseLabelSpec` (lines 90-121) and `labelSpecToText` (lines 123-129), including their doc comments. Keep `LabelSpec`, `LabelRow`, `rowsToLabelSpec`, `labelSpecToRows`, `internalLabels`, `remapLabel`.

In `src/lib/labels.test.ts`, remove the `describe("parseLabelSpec", …)` and `describe("labelSpecToText", …)` blocks, and drop `parseLabelSpec, labelSpecToText` from the import.

- [ ] **Step 7: Verify everything compiles, lints, tests, and builds**

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
```
Expected: all green. No remaining references to `labelsText`, `parseLabelSpec`, `labelSpecToText`, `glinerLabelsPlaceholder`, `glinerLabelsHint`, `labelsHint`, or `labelsLabel` (grep to confirm).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(playground): replace labels textarea with the row editor"
```

---

## Self-review notes

- Spec coverage: row editor (Task 3), live commit + key-based resync (Task 3 + Task 4 steps 4-5), helpers with identity/dict collapse + dedupe + blank drop (Task 1), i18n (Task 2), removal of the textarea path and dead helpers (Task 4). Export/remap untouched (not in any task — correct).
- Type consistency: `LabelRow = { model, emitted }`, `rowsToLabelSpec`/`labelSpecToRows`, `LabelMappingEditor` props `{ value, onChange, disabled }`, and the i18n keys `labelSearchedPlaceholder`/`labelEmittedPlaceholder`/`labelAdd`/`labelEmittedHint` are used identically across tasks.
- Build stays green per task: Task 1 adds without removing; Task 2 intentionally leaves `detector-playground.tsx` failing typecheck (documented); Task 4 fixes it and removes the dead code in one commit.
