# Preset Detectors & Pipelines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship ready-made starter detectors and domain pipelines that a visitor can load into the playground in one click and run live.

**Architecture:** A read-only, code-defined module (`src/lib/presets.ts`) exports `PRESET_DETECTORS` and `PRESET_PIPELINES` (reusing the existing `DetectorConfig`/`ConfigPipeline` types). A small pure `PresetList` component renders an "Examples" group; the detector page wires it to load a preset detector into the editor, the pipeline page to load a preset pipeline into the builder. Presets never touch localStorage.

**Tech Stack:** Next.js 16 (static export), React 19, TypeScript, Tailwind v4, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-02-preset-detectors-pipelines-design.md`

**Background facts (verified):**
- `DetectorConfig` variants: `{type:'regex', patterns: Record<string,string>, name?}`, `{type:'transformers', model, threshold, labels?}`, `{type:'gliner2', model, labels, threshold, flatNer}`.
- `ConfigPipeline = { name, detectors: PipelineDetector[], spanResolver, entityLinker, entityResolver, entityResolverThreshold, placeholder }`; `PipelineDetector = { name, config, enabled }`.
- Defaults: `spanResolver:'confidence'`, `entityLinker:'exact'`, `entityResolver:'merge'`, `entityResolverThreshold:0.85`, `placeholder:{type:'label_counter'}`.
- Classic NER model id: `Xenova/bert-base-NER` (emits `PER`/`ORG`/`LOC`/`MISC`); GLiNER browser model id: `onnx-community/gliner_small-v2.1`.
- Detector labels use the `{emitted: model}` mapping (e.g. `{PERSON:'PER'}` remaps the model's `PER` to `PERSON`).
- Regex patterns are stored as JS-string source (backslashes doubled), compiled by `regex-detect.ts`.

---

### Task 1: Presets module

**Files:**
- Create: `src/lib/presets.ts`
- Test: `src/lib/presets.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/presets.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { PRESET_DETECTORS, PRESET_PIPELINES } from "./presets";

function regexPatterns(cfg: { type: string; patterns?: Record<string, string> }) {
  return cfg.type === "regex" ? Object.entries(cfg.patterns ?? {}) : [];
}

describe("PRESET_DETECTORS", () => {
  it("has the six expected bricks with unique names", () => {
    const names = PRESET_DETECTORS.map((d) => d.name);
    expect(names).toEqual([
      "Contact & web",
      "Financial identifiers",
      "API keys & secrets",
      "Dates",
      "People, orgs & places",
      "Medical condition",
    ]);
    expect(new Set(names).size).toBe(names.length);
  });

  it("gives every preset a non-empty description", () => {
    for (const d of PRESET_DETECTORS) expect(d.description.length).toBeGreaterThan(0);
  });

  it("only every regex pattern compiles", () => {
    for (const d of PRESET_DETECTORS) {
      for (const [label, pattern] of regexPatterns(d.config)) {
        expect(() => new RegExp(pattern), `${d.name}/${label}`).not.toThrow();
      }
    }
  });
});

describe("PRESET_PIPELINES", () => {
  it("has the six domain pipelines with unique names", () => {
    const names = PRESET_PIPELINES.map((p) => p.name);
    expect(names).toEqual([
      "General PII",
      "Healthcare (HIPAA)",
      "Banking & finance",
      "HR & recruiting",
      "Customer support / CRM",
      "Legal & contracts",
    ]);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every pipeline has detectors, default stages, and counter tokens", () => {
    for (const { pipeline } of PRESET_PIPELINES) {
      expect(pipeline.detectors.length).toBeGreaterThan(0);
      expect(pipeline.spanResolver).toBe("confidence");
      expect(pipeline.entityLinker).toBe("exact");
      expect(pipeline.entityResolver).toBe("merge");
      expect(pipeline.placeholder.type).toBe("label_counter");
      // detector names are unique within a pipeline (builder keys by name)
      const dn = pipeline.detectors.map((d) => d.name);
      expect(new Set(dn).size).toBe(dn.length);
      for (const d of pipeline.detectors) expect(d.enabled).toBe(true);
    }
  });

  it("every regex pattern inside a pipeline compiles", () => {
    for (const { pipeline } of PRESET_PIPELINES) {
      for (const d of pipeline.detectors) {
        for (const [label, pattern] of regexPatterns(d.config)) {
          expect(() => new RegExp(pattern), `${pipeline.name}/${d.name}/${label}`).not.toThrow();
        }
      }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/lib/presets.test.ts`
Expected: FAIL — module `./presets` does not exist.

- [ ] **Step 3: Implement the module**

Create `src/lib/presets.ts`:

```ts
import type { ConfigPipeline, DetectorConfig, PipelineDetector } from "./detector-config";

export type PresetDetector = { name: string; description: string; config: DetectorConfig };
export type PresetPipeline = { name: string; description: string; pipeline: ConfigPipeline };

// --- Regex pattern atoms (JS-string source; backslashes doubled). Ported from
// piighost's pattern packs (generic/us/eu) and examples/detectors/common.py. ---
const EMAIL = "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}";
const URL = "https?://[^\\s<>\"']+[^\\s<>\"'.,;:!?\\)\\]}]";
const IP_V4 =
  "(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)";
const IP_V6 =
  "\\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\\b|\\b(?:[0-9a-fA-F]{1,4}:){1,7}:\\b|\\b::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}\\b";
const PHONE = "\\+\\d{1,3}[\\s.\\-]?\\(?\\d{1,4}\\)?(?:[\\s.\\-]?\\d{1,4}){1,4}";
const US_PHONE = "\\b(?:\\+?1[\\s.-]?)?\\(?[2-9]\\d{2}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}\\b";
const CREDIT_CARD = "\\b\\d{4}[\\s\\-]\\d{4}[\\s\\-]\\d{4}[\\s\\-]\\d{4}\\b";
const IBAN = "\\b[A-Z]{2}\\d{2}(?:[\\s-]?[A-Z0-9]){11,30}\\b";
const US_SSN = "\\b\\d{3}-\\d{2}-\\d{4}\\b";
const US_BANK_ROUTING = "\\b\\d{9}\\b";
const OPENAI_API_KEY = "sk-(?:proj-)?[A-Za-z0-9\\-_]{20,}";
const AWS_ACCESS_KEY = "\\bAKIA[0-9A-Z]{16}\\b";
const GITHUB_TOKEN = "\\bgh[ps]_[A-Za-z0-9_]{36,}\\b";
const STRIPE_KEY = "\\b[sr]k_(?:live|test)_[A-Za-z0-9]{24,}\\b";
const DATE =
  "\\b(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}/\\d{2,4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2},?\\s+\\d{4})\\b";

// --- Detector building blocks ---
const regex = (patterns: Record<string, string>): DetectorConfig => ({ type: "regex", patterns });

const CONTACT_WEB = regex({ EMAIL, URL, IP_V4, IP_V6, PHONE, CREDIT_CARD });
const FINANCIAL = regex({ IBAN, CREDIT_CARD, US_SSN, US_BANK_ROUTING });
const SECRETS = regex({ OPENAI_API_KEY, AWS_ACCESS_KEY, GITHUB_TOKEN, STRIPE_KEY });
const DATES = regex({ DATE });

// Classic NER (clean for names/orgs/places). Remaps the model's PER/ORG/LOC.
const NER_PEOPLE: DetectorConfig = {
  type: "transformers",
  model: "Xenova/bert-base-NER",
  threshold: 0.5,
  labels: { PERSON: "PER", ORGANIZATION: "ORG", LOCATION: "LOC" },
};

// Optional GLiNER layer for a soft, free-form entity (lower confidence).
const MEDICAL_CONDITION: DetectorConfig = {
  type: "gliner2",
  model: "onnx-community/gliner_small-v2.1",
  threshold: 0.5,
  flatNer: true,
  labels: { CONDITION: "medical condition or diagnosis" },
};

export const PRESET_DETECTORS: PresetDetector[] = [
  { name: "Contact & web", description: "Emails, URLs, IPs, phone numbers, credit cards.", config: CONTACT_WEB },
  { name: "Financial identifiers", description: "IBAN, credit cards, US SSN, bank routing numbers.", config: FINANCIAL },
  { name: "API keys & secrets", description: "OpenAI, AWS, GitHub, and Stripe keys.", config: SECRETS },
  { name: "Dates", description: "ISO, slashed, and “Month D, YYYY” dates.", config: DATES },
  { name: "People, orgs & places", description: "Names, organizations, and locations via classic NER.", config: NER_PEOPLE },
  { name: "Medical condition", description: "Free-form diagnoses via GLiNER (optional, lower confidence).", config: MEDICAL_CONDITION },
];

// --- Pipeline composition helpers ---
const det = (name: string, config: DetectorConfig): PipelineDetector => ({ name, config, enabled: true });
const pipe = (name: string, detectors: PipelineDetector[]): ConfigPipeline => ({
  name,
  detectors,
  spanResolver: "confidence",
  entityLinker: "exact",
  entityResolver: "merge",
  entityResolverThreshold: 0.85,
  placeholder: { type: "label_counter" },
});

export const PRESET_PIPELINES: PresetPipeline[] = [
  {
    name: "General PII",
    description: "Names and organizations plus everyday contact and web identifiers.",
    pipeline: pipe("General PII", [
      det("People, orgs & places", NER_PEOPLE),
      det("Contact & web", CONTACT_WEB),
    ]),
  },
  {
    name: "Healthcare (HIPAA)",
    description: "Patient names, dates, contact, SSN, and free-form diagnoses.",
    pipeline: pipe("Healthcare (HIPAA)", [
      det("People, orgs & places", NER_PEOPLE),
      det("Contact & IDs", regex({ EMAIL, US_PHONE, US_SSN, DATE })),
      det("Medical condition", MEDICAL_CONDITION),
    ]),
  },
  {
    name: "Banking & finance",
    description: "Account and card identifiers plus customer names and institutions.",
    pipeline: pipe("Banking & finance", [
      det("Financial identifiers", FINANCIAL),
      det("People, orgs & places", NER_PEOPLE),
    ]),
  },
  {
    name: "HR & recruiting",
    description: "Candidate names, locations, employers, contact details, and dates.",
    pipeline: pipe("HR & recruiting", [
      det("People, orgs & places", NER_PEOPLE),
      det("Contact & dates", regex({ EMAIL, US_PHONE, DATE })),
    ]),
  },
  {
    name: "Customer support / CRM",
    description: "Contact details and card numbers from tickets, plus names and companies.",
    pipeline: pipe("Customer support / CRM", [
      det("Contact & cards", regex({ EMAIL, US_PHONE, CREDIT_CARD })),
      det("People, orgs & places", NER_PEOPLE),
    ]),
  },
  {
    name: "Legal & contracts",
    description: "Parties, organizations, locations, dates, and contact details.",
    pipeline: pipe("Legal & contracts", [
      det("People, orgs & places", NER_PEOPLE),
      det("Contact & dates", regex({ EMAIL, US_PHONE, DATE })),
    ]),
  },
];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/lib/presets.test.ts`
Expected: PASS (all describe blocks).

Also run `pnpm exec tsc --noEmit` — expected clean (the configs must satisfy `DetectorConfig`/`ConfigPipeline`; if a field is wrong, tsc fails here).

- [ ] **Step 5: Commit**

```bash
git add src/lib/presets.ts src/lib/presets.test.ts
git commit -m "feat(presets): code-defined starter detectors and domain pipelines"
```

---

### Task 2: i18n "Examples" heading

**Files:**
- Modify: `src/i18n/types.ts` (the `playground` block)
- Modify: `src/i18n/en.ts` (the `playground` block)
- Modify: `src/i18n/fr.ts` (the `playground` block)

- [ ] **Step 1: Add the type key**

In `src/i18n/types.ts`, inside the `playground: { ... }` object, add after `savedDetectors: string;`:

```ts
    examplesTitle: string;
```

- [ ] **Step 2: Add the English string**

In `src/i18n/en.ts`, inside `playground`, add near `savedDetectors`:

```ts
    examplesTitle: "Examples",
```

- [ ] **Step 3: Add the French string**

In `src/i18n/fr.ts`, inside `playground`, add near `savedDetectors`:

```ts
    examplesTitle: "Exemples",
```

- [ ] **Step 4: Verify types compile**

Run: `pnpm exec tsc --noEmit`
Expected: clean (both dictionaries now satisfy the `Dictionary` type).

- [ ] **Step 5: Commit**

```bash
git add src/i18n/types.ts src/i18n/en.ts src/i18n/fr.ts
git commit -m "i18n: Examples section heading"
```

---

### Task 3: `PresetList` component

A pure, reusable presentational list used by both pages. Generic over items that have `name` + `description`.

**Files:**
- Create: `src/components/playground/preset-list.tsx`
- Test: `src/components/playground/preset-list.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/playground/preset-list.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PresetList } from "./preset-list";

const items = [
  { name: "General PII", description: "Names and contact." },
  { name: "Healthcare (HIPAA)", description: "Patient data." },
];

describe("PresetList", () => {
  it("renders the title, names, and descriptions", () => {
    render(<PresetList title="Examples" items={items} loadLabel="Load" onLoad={() => {}} />);
    expect(screen.getByText("Examples")).toBeInTheDocument();
    expect(screen.getByText("General PII")).toBeInTheDocument();
    expect(screen.getByText("Patient data.")).toBeInTheDocument();
  });

  it("calls onLoad with the clicked item", async () => {
    const onLoad = vi.fn();
    render(<PresetList title="Examples" items={items} loadLabel="Load" onLoad={onLoad} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Load" })[1]);
    expect(onLoad).toHaveBeenCalledWith(items[1]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/components/playground/preset-list.test.tsx`
Expected: FAIL — module `./preset-list` does not exist.

- [ ] **Step 3: Implement the component**

Create `src/components/playground/preset-list.tsx`:

```tsx
"use client";

/** Read-only "Examples" list: one row per preset (name + description) with a
 *  Load button. Pure and generic — the page decides what loading does. */
export function PresetList<T extends { name: string; description: string }>({
  title,
  items,
  loadLabel,
  onLoad,
}: {
  title: string;
  items: T[];
  loadLabel: string;
  onLoad: (item: T) => void;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.name} className="rounded-md border bg-background p-2 text-sm">
            <p className="truncate font-mono">{item.name}</p>
            <p className="mb-1 text-xs text-muted-foreground">{item.description}</p>
            <button
              type="button"
              className="text-xs text-muted-foreground"
              onClick={() => onLoad(item)}
            >
              {loadLabel}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/components/playground/preset-list.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/playground/preset-list.tsx src/components/playground/preset-list.test.tsx
git commit -m "feat(playground): PresetList read-only examples component"
```

---

### Task 4: Wire Examples into the detector page

**Files:**
- Modify: `src/components/playground/detector-playground.tsx`

- [ ] **Step 1: Add imports**

Near the other imports (after the `saved-detectors` import block), add:

```ts
import { PresetList } from "@/components/playground/preset-list";
import { PRESET_DETECTORS } from "@/lib/presets";
```

- [ ] **Step 2: Render the Examples group at the top of the aside**

In the `<aside …>` (the dashed saved-detectors panel), insert the Examples group as the FIRST child, immediately after the opening `<aside …>` tag and before the `<div className="space-y-2">` that holds the save form:

```tsx
          <PresetList
            title={pg.examplesTitle}
            items={PRESET_DETECTORS}
            loadLabel={pg.loadLabel}
            onLoad={(p) => {
              setConfig(p.config);
              setName(p.name);
            }}
          />
```

(`setConfig`/`setName` already exist in this component. Loading a preset fills the editor; the `LabelMappingEditor` re-seeds because its `key` includes `name`.)

- [ ] **Step 3: Verify compile, lint, tests, build**

```bash
pnpm exec tsc --noEmit
pnpm test
pnpm build
```
Expected: all green (the pre-existing `language-provider.tsx` lint warning is unrelated; no NEW lint errors).

- [ ] **Step 4: Manual browser check (no automated test — the host component pulls in ML deps that make full RTL impractical)**

Start `pnpm dev`, open `http://localhost:3000/playground/detector`. Confirm: an "Examples" group lists the six preset detectors above "Your saved detectors"; clicking **Load** on "Contact & web" switches the config to a regex detector with the contact patterns; clicking **Load** on "People, orgs & places" switches to the classic NER config. Run a quick Test on a sample text to confirm it detects.

- [ ] **Step 5: Commit**

```bash
git add src/components/playground/detector-playground.tsx
git commit -m "feat(playground): Examples preset detectors in the detector library"
```

---

### Task 5: Wire Examples into the pipeline builder

**Files:**
- Modify: `src/components/playground/config-builder.tsx`

- [ ] **Step 1: Add imports**

Near the other imports, add:

```ts
import { PresetList } from "@/components/playground/preset-list";
import { PRESET_PIPELINES } from "@/lib/presets";
```

- [ ] **Step 2: Render the Examples group at the top of the configuration column**

In the configuration `<section …>`, immediately after the `<h2>{pg.configTitle}</h2>` heading and before the `{/* Détecteurs */}` block, insert:

```tsx
          <PresetList
            title={pg.examplesTitle}
            items={PRESET_PIPELINES}
            loadLabel={pg.loadLabel}
            onLoad={(p) => {
              setPipeline(p.pipeline);
              setSaveName(p.pipeline.name);
            }}
          />
```

(`setPipeline` and `setSaveName` already exist in this component. Loading a preset pipeline replaces the builder's pipeline with the self-contained preset, including its embedded detectors and stages.)

- [ ] **Step 3: Verify compile, lint, tests, build**

```bash
pnpm exec tsc --noEmit
pnpm test
pnpm build
```
Expected: all green; no new lint errors.

- [ ] **Step 4: Manual browser check**

Open `http://localhost:3000/playground`. Confirm: an "Examples" group lists the six preset pipelines at the top of the Configuration column; clicking **Load** on "Banking & finance" fills the pipeline with two detectors (Financial identifiers + People, orgs & places), the default stages, and `label_counter` tokens; the live test runs and produces anonymized output. Spot-check "General PII" and "Healthcare (HIPAA)" likewise.

- [ ] **Step 5: Commit**

```bash
git add src/components/playground/config-builder.tsx
git commit -m "feat(playground): Examples preset pipelines in the pipeline builder"
```

---

## Self-review notes

- **Spec coverage:** module + types (Task 1), the 6 detectors and 6 pipelines with the validated regex+classic-NER backbone and optional GLiNER condition (Task 1), i18n `examplesTitle` (Task 2), read-only Examples UI on both pages via a pure component (Tasks 3-5), no localStorage/persistence (load only). All spec sections covered.
- **English-only:** preset names/descriptions/labels are English literals in `presets.ts`; only `examplesTitle` is translated. Matches the constraint.
- **Placeholder scan:** every code step has complete code; regex atoms are concrete; no TBD/TODO. Manual-check steps are explicitly justified (host components pull ML deps); the pure `PresetList` carries the automated UI coverage, so UI behavior is not left untested — only the thin wiring is manual.
- **Type consistency:** `PresetDetector`/`PresetPipeline`, `PRESET_DETECTORS`/`PRESET_PIPELINES`, and the `det`/`pipe`/`regex` helpers are used consistently; detector/pipeline shapes match `DetectorConfig`/`ConfigPipeline`/`PipelineDetector` verbatim. `setConfig`/`setName` (detector page) and `setPipeline`/`setSaveName` (pipeline page) are confirmed to exist.
- **Build stays green per task:** Tasks 1-3 add unconsumed modules; Tasks 4-5 wire them in. Each task compiles on its own.
