# Label-mapping editor — design

**Date:** 2026-06-02
**Status:** approved

## Problem

The playground edits a label-bearing detector's labels through a free-text
`<textarea>` in the `EMITTED: model` line format (`font-mono`). It has no
structure: the user must know the syntax, typos are silent, and a multi-label
mapping reads as an opaque block. We want a structured list editor instead.

## Goal

Replace the labels `<textarea>` (gliner2 + transformers) with a reusable
**line-based editor**: one row per entity with two fields,
`[ searched ] → [ emitted as ]`, an `×` to remove the row, and a
`+ Add an entity` button. The left field is what the model is queried with
(required); the right field is the emitted entity label (optional — blank means
the emitted label is identical to the searched one).

This is a UI/UX change only. The persisted shape (`LabelSpec`), the live remap
(`internalLabels` / `remapLabel`), and the TOML export (`labelsToml`) keep their
current semantics.

## Components & data flow

### `LabelRow` and conversion helpers (`src/lib/labels.ts`)

Add `export type LabelRow = { model: string; emitted: string }` and two pure
helpers that replace `parseLabelSpec` / `labelSpecToText` (which only served the
textarea and are removed along with their tests):

- `rowsToLabelSpec(rows: LabelRow[]): LabelSpec`
  - Trim both fields of each row; drop rows whose `model` is blank.
  - Dedupe by `model` case-insensitively, keeping the first occurrence.
  - The effective emitted label of a row is `emitted || model`.
  - If no row has an `emitted` that differs from its `model` → return a
    `string[]` of the models (identity list).
  - Otherwise → return a dict `{ effectiveEmitted: model }`.
- `labelSpecToRows(spec: LabelSpec): LabelRow[]`
  - Array → `rows` of `{ model: label, emitted: "" }`.
  - Dict `{ emitted: model }` → `{ model, emitted }`, but collapse `emitted` to
    `""` when it equals `model` (so identity reads cleanly in the editor).

`internalLabels` / `remapLabel` are unchanged.

### `LabelMappingEditor` (`src/components/playground/label-mapping-editor.tsx`)

Reusable component, used by both gliner2 and transformers config blocks.

- Props: `{ value: LabelSpec; onChange: (spec: LabelSpec) => void; disabled?: boolean }`.
- Internal state `rows: LabelRow[]`, seeded from `labelSpecToRows(value)`; if the
  seed is empty, start with a single blank row so there is always something to
  type into.
- Every mutation (edit a field, add a row, remove a row) updates local `rows`
  **and** calls `onChange(rowsToLabelSpec(rows))` — commit is **live**, not on
  blur.
- Renders each row as two text inputs separated by a `→`, plus an `×` button;
  a `+ Add an entity` button below. Uses `useT()` for all copy.

### Resync via `key` (not `useEffect`)

`detector-playground.tsx` mounts the editor with
`key={`${config.type}-${model}-${name}`}`. Switching detector type, loading a
saved detector, or opening `?edit=` changes the key and remounts the editor,
re-seeding `rows` from the new `value`. This removes the current fragile resync
`useEffect`.

### Simplifications this enables

Because commit is now live, `detector-playground.tsx` drops:
- the `labelsText` state and both `<textarea>`s,
- `commitLabels`, the labels resync `useEffect`,
- `configWithLabels()` — `save()` and `test()` use `config` directly again.

The regex `patterns` textarea (a different field) is untouched.

### i18n (`src/i18n/{types,en,fr}.ts`)

Add: `labelSearchedPlaceholder`, `labelEmittedPlaceholder`, `labelAdd`,
`labelEmittedHint` ("blank = identical"). Remove the now-unused `labelsHint`
(and the dead `glinerLabelsPlaceholder` / `glinerLabelsHint` textarea keys).
`glinerLabelsLabel` stays as the section title.

## Out of scope

- Regex pattern editing (separate textarea, unchanged).
- The TOML export format and the live remap logic (unchanged).
- piighost itself (already supports the mapping).

## Testing

- Unit (Vitest): `rowsToLabelSpec` / `labelSpecToRows` round-trips, identity-vs-
  dict collapse, dedupe, blank-field dropping.
- Component (Testing Library): renders seeded rows, add/remove a row, editing a
  field emits the expected `LabelSpec` via `onChange`.
