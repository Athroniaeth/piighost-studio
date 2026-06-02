# Sample Texts & Examples Column Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a curated raw-text picker at the top of "Your text", give both playground pages a dedicated left Examples column, and widen the layout.

**Architecture:** A code-defined `sample-texts.ts` library feeds a pure `SampleTextPicker` `<select>`. The detector page's `Region` gains an `action` slot for the picker; the pipeline page gets the picker in its text toggle row and a new left `aside` Examples column (mirroring the detector page). Containers widen from `max-w-[79rem]` to `max-w-[88rem]`.

**Tech Stack:** Next.js 16 (static export), React 19, TypeScript, Tailwind v4, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-02-sample-texts-and-examples-column-design.md`

**Verified facts:**
- Detector page (`detector-playground.tsx`): container `max-w-[79rem]` (line ~153); left `aside` already holds `<PresetList items={PRESET_DETECTORS} …>` (line ~160); `Region` helper at lines ~61-66 renders an `<h2>` then children; the "Your text" area is `<Region title={pg.inputLabel}>` (line ~345); state setters `setText`, `setStatus`, and `busy = status === "running"` exist.
- Pipeline page (`config-builder.tsx`): container `max-w-[79rem]` (line ~233); panel grid `lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2.4fr)_minmax(0,0.7fr)]` (line ~236); the Examples `<PresetList items={PRESET_PIPELINES} …>` is inside the config `<section>` (lines ~243-251); the text `<section>` has a toggle row `<div className="mb-2 flex … justify-between gap-2"><div className="flex gap-1">…toggles…</div></div>` (lines ~455-476); setters `setTestText`, `setTestStatus`, `pg = t.playground` exist.

---

### Task 1: Sample-text library

**Files:**
- Create: `src/lib/sample-texts.ts`
- Test: `src/lib/sample-texts.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/sample-texts.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { SAMPLE_TEXTS } from "./sample-texts";

describe("SAMPLE_TEXTS", () => {
  it("has six entries with unique names", () => {
    expect(SAMPLE_TEXTS).toHaveLength(6);
    const names = SAMPLE_TEXTS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("gives every entry a non-empty name and text", () => {
    for (const s of SAMPLE_TEXTS) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.text.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/lib/sample-texts.test.ts`
Expected: FAIL — module `./sample-texts` does not exist.

- [ ] **Step 3: Implement**

Create `src/lib/sample-texts.ts`:

```ts
export type SampleText = { name: string; text: string };

/** A small library of raw test texts for the playground. Each one exercises
 *  several PII types. Names are fixed English literals (not translated). */
export const SAMPLE_TEXTS: SampleText[] = [
  {
    name: "Email thread",
    text: "From: sarah.connor@cyberdyne.com\nTo: j.reese@initech.io\nHi James, can you call me at +1 415 555 0132 before the Los Angeles meeting on March 3, 2024? Heads up: our key AKIA1234567890ABCDEF leaked in the last push. — Sarah",
  },
  {
    name: "Medical note",
    text: "Patient Maria Gomez, date of birth 04/12/1979, MRN-884213, was admitted to St. Mary's Hospital in Boston on 2023-11-08 and diagnosed with type 2 diabetes. Contact maria.gomez@mail.com or (617) 555-0148. SSN 123-45-6789.",
  },
  {
    name: "Bank statement",
    text: "Account holder John Miller. Transfer of 4,200 EUR from IBAN DE89 3704 0044 0532 0130 00 to Barclays on 01/15/2024. Card 4111 1111 1111 1111, routing number 021000021, SSN 078-05-1120.",
  },
  {
    name: "Support ticket",
    text: "Ticket #4471 from emma.stone@mail.com, phone (212) 555-0177: the customer at Globex says card 4111 1111 1111 1111 was charged twice on 2024-02-10. Escalated by agent Tom Hardy.",
  },
  {
    name: "Contract excerpt",
    text: "This agreement, made on March 3, 2024 in New York, is entered into between Acme Corp and Globex Inc. Notices to counsel jane.roe@lawfirm.com or (212) 555-0143. Effective date 2024-04-01.",
  },
  {
    name: "Resume",
    text: "David Lee — Seattle, WA. david.lee@gmail.com, (206) 555-0190. Experience: Software Engineer at Microsoft (2019-2023), Intern at Acme Corp in 2018. Education: University of Washington, graduated June 2019.",
  },
];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/lib/sample-texts.test.ts`
Expected: PASS. Also `pnpm exec tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sample-texts.ts src/lib/sample-texts.test.ts
git commit -m "feat(playground): curated raw sample-text library"
```

---

### Task 2: i18n "Load sample text"

**Files:**
- Modify: `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/fr.ts` (the `playground` block)

- [ ] **Step 1: Add the type key**

In `src/i18n/types.ts`, inside `playground`, add after `examplesTitle: string;`:

```ts
    loadSampleText: string;
```

- [ ] **Step 2: English string**

In `src/i18n/en.ts`, inside `playground`, after `examplesTitle: "Examples",`:

```ts
    loadSampleText: "Load sample text",
```

- [ ] **Step 3: French string**

In `src/i18n/fr.ts`, inside `playground`, after `examplesTitle: "Exemples",`:

```ts
    loadSampleText: "Charger un texte",
```

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit`
Expected: clean (both dictionaries satisfy `Dictionary`).

- [ ] **Step 5: Commit**

```bash
git add src/i18n/types.ts src/i18n/en.ts src/i18n/fr.ts
git commit -m "i18n: Load sample text label"
```

---

### Task 3: `SampleTextPicker` component

**Files:**
- Create: `src/components/playground/sample-text-picker.tsx`
- Test: `src/components/playground/sample-text-picker.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/playground/sample-text-picker.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { SampleTextPicker } from "./sample-text-picker";
import { SAMPLE_TEXTS } from "@/lib/sample-texts";

describe("SampleTextPicker", () => {
  it("renders the label and one option per sample", () => {
    render(<SampleTextPicker label="Load sample text" onPick={() => {}} />);
    const select = screen.getByRole("combobox", { name: "Load sample text" });
    expect(select.querySelectorAll("option")).toHaveLength(SAMPLE_TEXTS.length + 1);
  });

  it("calls onPick with the chosen sample's text", async () => {
    const onPick = vi.fn();
    render(<SampleTextPicker label="Load sample text" onPick={onPick} />);
    const first = SAMPLE_TEXTS[0];
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Load sample text" }),
      first.name,
    );
    expect(onPick).toHaveBeenCalledWith(first.text);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/components/playground/sample-text-picker.test.tsx`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/components/playground/sample-text-picker.tsx`:

```tsx
"use client";

import { SAMPLE_TEXTS } from "@/lib/sample-texts";

/** A "Load sample text" dropdown. Picking an entry calls onPick with its raw
 *  text, then resets to the placeholder so the same entry can be re-picked.
 *  Pure — the page decides what to do with the text. */
export function SampleTextPicker({
  label,
  onPick,
  disabled,
}: {
  label: string;
  onPick: (text: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      aria-label={label}
      disabled={disabled}
      value=""
      onChange={(e) => {
        const sample = SAMPLE_TEXTS.find((s) => s.name === e.target.value);
        if (sample) onPick(sample.text);
        e.currentTarget.selectedIndex = 0;
      }}
      className="rounded-md border bg-background px-2 py-1 text-xs"
    >
      <option value="">{label}</option>
      {SAMPLE_TEXTS.map((s) => (
        <option key={s.name} value={s.name}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/components/playground/sample-text-picker.test.tsx`
Expected: PASS (2 tests). Also `pnpm exec tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/playground/sample-text-picker.tsx src/components/playground/sample-text-picker.test.tsx
git commit -m "feat(playground): SampleTextPicker dropdown"
```

---

### Task 4: Detector page — picker, Examples open, wider container

**Files:**
- Modify: `src/components/playground/detector-playground.tsx`

- [ ] **Step 1: Add the import**

Near the other imports:

```ts
import { SampleTextPicker } from "@/components/playground/sample-text-picker";
```

- [ ] **Step 2: Give `Region` an `action` slot**

Replace the `Region` helper (lines ~61-66):

```tsx
function Region({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex min-h-0 flex-col overflow-auto p-4">
      <h2 className="mb-3 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
```

with:

```tsx
function Region({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-col overflow-auto p-4">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        {action}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
```

- [ ] **Step 3: Pass the picker to the "Your text" Region**

Find `<Region title={pg.inputLabel}>` (line ~345) and change it to:

```tsx
        <Region
          title={pg.inputLabel}
          action={
            <SampleTextPicker
              label={pg.loadSampleText}
              disabled={busy}
              onPick={(t) => {
                setText(t);
                setStatus("idle");
              }}
            />
          }
        >
```

(Leave the Region's children unchanged.)

- [ ] **Step 4: Open the Examples list by default**

Find the aside `<PresetList … items={PRESET_DETECTORS} …>` (line ~160) and add the `defaultOpen` prop:

```tsx
          <PresetList
            title={pg.examplesTitle}
            items={PRESET_DETECTORS}
            loadLabel={pg.loadLabel}
            defaultOpen
            onLoad={(p) => {
              setConfig(p.config);
              setName(p.name);
              setText(p.sampleText);
              setStatus("idle");
            }}
          />
```

- [ ] **Step 5: Widen the container**

On the container div (line ~153), change `max-w-[79rem]` to `max-w-[88rem]`.

- [ ] **Step 6: Verify**

```bash
pnpm exec tsc --noEmit
pnpm test
pnpm build
```
All green (the pre-existing `language-provider.tsx` lint error is out of scope; no NEW lint errors).

- [ ] **Step 7: Manual browser check**

`pnpm dev`, open `/playground/detector`: the Examples column shows expanded; the "Your text" header has a "Load sample text" dropdown; picking "Medical note" fills the box; loading a preset still fills config + its text.

- [ ] **Step 8: Commit**

```bash
git add src/components/playground/detector-playground.tsx
git commit -m "feat(playground): detector sample-text picker, open Examples, wider layout"
```

---

### Task 5: Pipeline page — Examples column, picker, wider container

This is the structural task — READ the file and verify line numbers before editing.

**Files:**
- Modify: `src/components/playground/config-builder.tsx`

- [ ] **Step 1: Add the import**

Near the other imports:

```ts
import { SampleTextPicker } from "@/components/playground/sample-text-picker";
```

- [ ] **Step 2: Wrap the panel in an `aside | panel` grid and move Examples into the aside**

The container currently is (line ~233):

```tsx
    <div className="mx-auto flex w-full max-w-[79rem] flex-col p-4 lg:h-[calc(100dvh-4rem)]">
      <PlaygroundTabs />
      {/* Unified panel … */}
      <div className="grid min-h-0 flex-1 divide-y divide-border overflow-hidden rounded-xl border bg-card shadow-sm lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2.4fr)_minmax(0,0.7fr)] lg:divide-x lg:divide-y-0">
```

Change the container's `max-w-[79rem]` to `max-w-[88rem]`, then wrap the existing `<div className="grid … rounded-xl border bg-card …">` (the panel) in a new outer grid with a left `aside`. After the change the top of the return looks like:

```tsx
    <div className="mx-auto flex w-full max-w-[88rem] flex-col p-4 lg:h-[calc(100dvh-4rem)]">
      <PlaygroundTabs />
      <div className="grid flex-1 gap-4 overflow-hidden lg:min-h-0 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,3.4fr)]">
        <aside className="flex min-h-0 flex-col gap-4 overflow-auto rounded-xl border border-dashed bg-muted/30 p-4">
          <PresetList
            title={pg.examplesTitle}
            items={PRESET_PIPELINES}
            loadLabel={pg.loadLabel}
            defaultOpen
            onLoad={(p) => {
              setPipeline(p.pipeline);
              setSaveName(p.pipeline.name);
              setTestText(p.sampleText);
              setTestStatus("idle");
            }}
          />
        </aside>
        {/* Unified panel … */}
        <div className="grid min-h-0 flex-1 divide-y divide-border overflow-hidden rounded-xl border bg-card shadow-sm lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2.4fr)_minmax(0,0.7fr)] lg:divide-x lg:divide-y-0">
```

You are adding two opening tags (`<div outer grid>` and `<aside>…PresetList…</aside>`) before the existing panel `<div className="grid …">`. You MUST add the two matching closing tags: the existing panel `</div>` is followed by the page's closing structure — add `</div>` (close outer grid) after the panel closes. Find where the panel grid div closes (just before the final action bar / the container's closing). Carefully balance the tags — run `pnpm exec tsc --noEmit` and `pnpm build` to confirm JSX is balanced.

- [ ] **Step 3: Remove the old Examples block from the config section**

Delete the `<PresetList … items={PRESET_PIPELINES} …/>` that currently sits inside the config `<section>` (lines ~243-251), since it now lives in the aside. Leave the `{/* Détecteurs */}` block and everything else intact.

- [ ] **Step 4: Add the picker to the text toggle row**

In the text `<section>`, the toggle row is:

```tsx
          <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
            <div className="flex gap-1">
              {(
                [
                  ["input", pg.inputLabel],
                  ["anonymized", pg.anonymizedLabel],
                ] as const
              ).map(([v, label]) => (
                … toggle buttons …
              ))}
            </div>
          </div>
```

Add the picker as the second child of the `justify-between` div, right after the closing `</div>` of the `flex gap-1` toggle group:

```tsx
            <SampleTextPicker
              label={pg.loadSampleText}
              disabled={testStatus === "running" || testStatus === "loading"}
              onPick={(t) => {
                setTestText(t);
                setTestStatus("idle");
                setResultView("input");
              }}
            />
```

(`setResultView("input")` ensures the editable text is shown after picking.)

- [ ] **Step 5: Verify**

```bash
pnpm exec tsc --noEmit
pnpm test
pnpm build
```
All green; JSX balanced; no new lint errors.

- [ ] **Step 6: Manual browser check**

Open `/playground`: a left Examples column lists the six pipelines (expanded) with Load; the config column no longer holds the examples; the text section has a "Load sample text" dropdown that fills the box; loading a pipeline still fills detectors + its text; the wider layout holds.

- [ ] **Step 7: Commit**

```bash
git add src/components/playground/config-builder.tsx
git commit -m "feat(playground): pipeline Examples column, sample-text picker, wider layout"
```

---

## Self-review notes

- **Spec coverage:** sample-text library (Task 1), i18n label (Task 2), `SampleTextPicker` (Task 3), detector picker + open Examples + wider container (Task 4), pipeline Examples column + picker + wider container (Task 5). Preset-sets-text behavior preserved in both onLoad handlers. All spec sections covered.
- **Placeholder scan:** every code step has complete code; the only judgement step is the pipeline JSX re-wrap (Task 5 Step 2), where tag-balancing is called out explicitly with tsc/build as the gate.
- **Type consistency:** `SampleText`/`SAMPLE_TEXTS`, `SampleTextPicker` props `{ label, onPick, disabled }`, the `Region` `action` prop, and the i18n key `loadSampleText` are used identically across tasks. `setText`/`setStatus`/`busy` (detector) and `setTestText`/`setTestStatus`/`setResultView` (pipeline) are confirmed to exist.
- **Build stays green per task:** Tasks 1-3 add unconsumed modules; Tasks 4-5 wire them in independently per page.
- **Manual-check justification:** the two host pages pull in ML/Pyodide deps that make full RTL impractical; the pure units (`SAMPLE_TEXTS`, `SampleTextPicker`) carry the automated coverage, so only the thin wiring + layout is verified manually.
