# Sample texts & Examples column — design

**Date:** 2026-06-02
**Status:** approved

## Problem

Two playground pain points:
1. The preset **Examples** list lives inside the configuration column (pipeline
   page) / the saved aside (detector page); it crowds the config and there is
   no roomy, consistent place for it.
2. There is no quick way to drop a **raw test text** into the "Your text" box.
   Loading a preset sets a domain text, but the user wants to swap test inputs
   freely, independent of the chosen detector/pipeline.

## Goals

- A dedicated left **Examples column** on BOTH playground pages (consistent).
- A **"Load sample text" dropdown** at the top of the "Your text" area that
  fills the box from a small curated library of raw texts.
- Wider padding so the extra column breathes.
- English-only content (text names), consistent with the presets.

## Components & changes

### 1. Sample-text library — `src/lib/sample-texts.ts`

```ts
export type SampleText = { name: string; text: string };
export const SAMPLE_TEXTS: SampleText[];
```

Six curated English texts, each exercising several PII types: **Email thread,
Medical note, Bank statement, Support ticket, Contract excerpt, Resume**. Names
are fixed English literals (not translated).

### 2. `SampleTextPicker` — `src/components/playground/sample-text-picker.tsx`

A small pure component: a `<select>` labelled "Load sample text" whose options
are the `SAMPLE_TEXTS` names. Picking an option calls `onPick(text)` and resets
itself to the placeholder (so the same text can be re-picked). Props:
`{ label: string; onPick: (text: string) => void; disabled?: boolean }`. Styled
like the other selects in the app (no px font sizes).

### 3. Placement of the picker (top of "Your text")

- **Detector page:** the `Region` helper gains an optional `action?: ReactNode`
  rendered right-aligned in its header next to the title. The "Your text" Region
  passes the `SampleTextPicker`.
- **Pipeline page:** the picker sits in the existing input/anonymized toggle row
  (right side) of the text section.

Picking a text calls the page's existing text setter (`setText` / `setTestText`)
and resets stale results (`setStatus("idle")` / `setTestStatus("idle")`).

### 4. Examples column

- **Pipeline page:** wrap the current 3-column panel in an outer
  `aside | panel` grid (mirroring the detector page). The left `aside` (dashed,
  muted) holds `<PresetList items={PRESET_PIPELINES} defaultOpen />`. The presets
  move OUT of the configuration column, freeing config space.
- **Detector page:** already has the aside; set its `PresetList` to
  `defaultOpen` (the collapse was only needed when it crowded the config, which
  no longer applies in a dedicated column). The "Your saved detectors" section
  stays in the same aside below Examples.

### 5. Padding / width

Both page containers widen from `max-w-[79rem]` to `max-w-[88rem]` to accommodate
the extra column comfortably.

### 6. Preset text behavior (unchanged)

Loading a preset still fills the text box with that preset's `sampleText`
(out-of-box experience). The new dropdown is an independent way to swap to any of
the six generic texts. Both sources coexist.

### 7. i18n

One new chrome key `playground.loadSampleText` ("Load sample text" / "Charger un
texte"). Sample-text names stay English literals.

## Out of scope

- The detector/pipeline preset catalog (unchanged).
- Detection/anonymization logic, export (unchanged).
- Persisting picked texts (the box is ephemeral as today).

## Testing

- Unit (Vitest): `SAMPLE_TEXTS` is well-formed — 6 entries, unique names,
  non-empty texts.
- Component (Testing Library): `SampleTextPicker` renders an option per sample
  and calls `onPick` with the corresponding text on selection.
- Manual (browser): on both pages confirm the Examples column renders and loads
  presets, the dropdown fills "Your text", and the wider layout holds up.
