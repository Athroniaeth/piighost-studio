# Preset detectors & pipelines — design

**Date:** 2026-06-02
**Status:** approved (content + architecture)

## Problem

The playground ships empty: a visitor must build a detector or pipeline from
scratch before they can test anything. We want ready-made **starter detectors**
and **domain pipelines** that a visitor can load and run in one click, mirroring
the use-cases piighost demonstrates in `examples/`.

## Goals & constraints

- **English only.** Preset names, descriptions, and labels are fixed English
  strings (no i18n duplication). Only the surrounding UI chrome (the "Examples"
  heading) follows the site's EN/FR locale.
- **Business domains, not regions.** Healthcare, finance, HR, support, legal —
  not FR/EU/US geographic packs.
- **Runs live in the browser.** Every preset is testable in the live bench;
  none requires a server. No `llm` detector in presets.
- **Read-only and code-defined.** Presets live in a module, never in
  localStorage, so they stay fresh and never collide with the user's saved work.

## Detector strategy (validated empirically in the live bench)

Live tests on representative texts showed:

- **Classic NER** (`Xenova/bert-base-NER`, mapped `PER→PERSON`, `ORG→ORGANIZATION`,
  `LOC→LOCATION`) is clean and high-confidence (95-100%) for names/orgs/places.
- **Regex** is deterministic (100%) for structured PII (email, phone, SSN, IBAN,
  credit card, formatted dates, IDs).
- **GLiNER (ONNX small & multi_pii)** is noisy: overlapping spans, false
  positives, low confidence (30-60%), and it mishandles structured tokens and
  even misses names. Its only reliable added value is soft, free-form entities
  (e.g. a medical condition/diagnosis).

**Decision:** presets use a **regex + classic-NER backbone**. GLiNER appears only
as an optional layer where a soft entity matters — in practice, the medical
**condition** in the Healthcare pipeline.

## Catalog

### Detector bricks (standalone presets)

| Brick | Type | Labels / patterns |
|-------|------|-------------------|
| **Contact & web** | regex | `EMAIL`, `URL`, `IP_V4`, `IP_V6`, `PHONE`, `CREDIT_CARD` |
| **Financial identifiers** | regex | `IBAN`, `CREDIT_CARD`, `US_SSN`, `US_BANK_ROUTING` |
| **API keys & secrets** | regex | `OPENAI_API_KEY`, `AWS_ACCESS_KEY`, `GITHUB_TOKEN`, `STRIPE_KEY` |
| **Dates** | regex | `DATE` (ISO `2023-11-08`, `MM/DD/YYYY`, `Month D, YYYY`) |
| **People, orgs & places** | transformers (classic NER) | emits `PERSON`, `ORGANIZATION`, `LOCATION` |
| **Medical condition** (optional GLiNER) | gliner2 | `CONDITION` → `"medical condition or diagnosis"` |

### Domain pipelines

Every pipeline ends with span resolver `confidence`, linker `exact`, resolver
`merge`, anonymizer `label_counter` (`<<LABEL:N>>`).

| Pipeline | Detectors composed |
|----------|--------------------|
| **General PII** | People, orgs & places (NER) + Contact & web (regex) |
| **Healthcare (HIPAA)** | People, orgs & places (NER) + regex(`EMAIL`,`PHONE`,`US_SSN`,`DATE`) + Medical condition (GLiNER) |
| **Banking & finance** | Financial identifiers (regex) + People, orgs & places (NER) |
| **HR & recruiting** | People, orgs & places (NER) + regex(`EMAIL`,`PHONE`,`DATE`) |
| **Customer support / CRM** | regex(`EMAIL`,`PHONE`,`CREDIT_CARD`) + People, orgs & places (NER) |
| **Legal & contracts** | People, orgs & places (NER) + regex(`EMAIL`,`PHONE`,`DATE`) |

Detector configs are embedded inline in each pipeline (a `ConfigPipeline`
already stores its detectors), so pipelines are self-contained.

## Architecture

### Preset module — `src/lib/presets.ts`

A read-only, code-defined module:

```ts
export type PresetDetector = { name: string; description: string; config: DetectorConfig };
export type PresetPipeline = { name: string; description: string; pipeline: ConfigPipeline };
export const PRESET_DETECTORS: PresetDetector[];
export const PRESET_PIPELINES: PresetPipeline[];
```

`name`/`description` are English literals. Configs reuse the existing
`DetectorConfig`/`ConfigPipeline` types verbatim — no new runtime concepts.

### UI — an "Examples" group in each library panel

Both library panels gain a read-only **Examples** group above the existing
"Your saved …" list:

- **`/playground/detector`** (the saved-detectors aside): lists `PRESET_DETECTORS`;
  each row has the preset name + a one-line description and a **Load** action
  that populates the editor (`setConfig(preset.config)`, `setName(preset.name)`).
  No Delete (read-only).
- **`/playground`** (the pipeline builder's library): lists `PRESET_PIPELINES`;
  each **Load** action populates the builder (`setPipeline(preset.pipeline)`,
  `setName(preset.name)`).

Loading a preset does NOT persist it — it just fills the editor/builder, where
the user can run the live test, tweak, "Save a copy", or Export. This keeps
presets out of localStorage and always in sync with the code.

### i18n

One new chrome key (`playground.examplesTitle`: "Examples" / "Exemples"). Preset
names, descriptions, and labels are NOT translated (English literals in
`presets.ts`), per the "English only" constraint.

## Out of scope

- No `llm`/server presets, no Pyodide changes.
- No gallery/modal (deferred; the inline Examples group is enough).
- No editing/curating presets from the UI (they are code-defined).
- Regex pattern semantics, the live test, and export are unchanged.

## Testing

- Unit (Vitest): `presets.ts` is well-formed — every `PRESET_DETECTORS` entry is
  a valid `DetectorConfig`; every `PRESET_PIPELINES` entry is a valid
  `ConfigPipeline` whose detectors are non-empty and whose stages are set; every
  regex pattern compiles (`new RegExp`).
- Component (Testing Library): the Examples group renders the presets and a
  Load click calls the load handler with the right preset.
- Manual: load each pipeline in the live bench on a representative text and
  confirm sensible detections (the detector choices were already validated live).
