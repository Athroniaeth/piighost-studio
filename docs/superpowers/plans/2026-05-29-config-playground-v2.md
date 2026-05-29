# Playground de config piighost (phase 2, v2) — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deux pages reliées : `/playground` (tester et **sauvegarder** un détecteur) et `/config` (composer un pipeline complet — détecteurs sauvegardés, activer/désactiver les composants, configurer l'anonymizer, exporter TOML + Python).

**Architecture:** Réutilise le socle existant (`runRegex`, `detector-config`, `detector-bench`, `pipeline-export`). Ajoute un store `localStorage` de détecteurs, étend le modèle/export à un pipeline complet, et remplace le builder maître-détail (rejeté) par deux composants de page.

**Tech Stack:** Next.js 16 (export statique), React 19, TypeScript, Vitest. localStorage pour la persistance navigateur.

---

## État de départ (branche `feat/config-playground`)

Déjà présents et réutilisés : `src/lib/regex-detect.ts`, `src/lib/detector-config.ts`,
`src/lib/pipeline-export.ts`, `src/components/playground/detector-bench.tsx`,
les clés i18n du builder (Task 5 de l'ancien plan). À **supprimer** :
`src/components/playground/pipeline-builder.tsx`.

## Structure des fichiers

- **Créer** `src/lib/saved-detectors.ts` (+ test) — store localStorage.
- **Modifier** `src/lib/detector-config.ts` — ajouter `ConfigPipeline`,
  `PipelineDetector`, `Placeholder`, `defaultPipeline` ; retirer l'ancien
  `Pipeline`.
- **Modifier** `src/lib/pipeline-export.ts` (+ test) — `toToml`/`toPython` sur
  `ConfigPipeline` (étapes + anonymizer + exclusion des détecteurs désactivés).
- **Modifier** `src/components/playground/detector-bench.tsx` — retirer
  `onValidate` et le bouton « Valider ».
- **Créer** `src/components/playground/detector-playground.tsx` — page `/playground`.
- **Créer** `src/components/playground/config-builder.tsx` — page `/config`.
- **Créer** `src/app/config/page.tsx`.
- **Modifier** `src/app/playground/page.tsx` — rendre `DetectorPlayground`.
- **Modifier** `src/components/site-navbar.tsx` — lien « Config ».
- **Modifier** `src/i18n/{types,en,fr}.ts` — `nav.config` + clés de page.
- **Supprimer** `src/components/playground/pipeline-builder.tsx`.

---

## Task 1 : store localStorage des détecteurs

**Files:**
- Créer : `src/lib/saved-detectors.ts`
- Test : `src/lib/saved-detectors.test.ts`

- [ ] **Step 1 : test (échoue)**

Créer `src/lib/saved-detectors.test.ts` :

```ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  serialize,
  parse,
  loadSaved,
  saveDetector,
  deleteSaved,
  type SavedDetector,
} from "./saved-detectors";
import type { DetectorConfig } from "./detector-config";

const cfg: DetectorConfig = { type: "regex", patterns: { EMAIL: "\\w+@\\w+" } };

describe("serialize/parse", () => {
  it("round-trips a list", () => {
    const list: SavedDetector[] = [{ name: "a", config: cfg }];
    expect(parse(serialize(list))).toEqual(list);
  });

  it("returns [] for null or invalid input", () => {
    expect(parse(null)).toEqual([]);
    expect(parse("not json")).toEqual([]);
  });
});

describe("localStorage store", () => {
  beforeEach(() => window.localStorage.clear());

  it("saves and loads a detector", () => {
    saveDetector("emails", cfg);
    expect(loadSaved()).toEqual([{ name: "emails", config: cfg }]);
  });

  it("replaces an entry with the same name", () => {
    saveDetector("x", cfg);
    const cfg2: DetectorConfig = { type: "regex", patterns: { N: "\\d+" } };
    const after = saveDetector("x", cfg2);
    expect(after).toEqual([{ name: "x", config: cfg2 }]);
  });

  it("deletes by name", () => {
    saveDetector("x", cfg);
    expect(deleteSaved("x")).toEqual([]);
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `pnpm exec vitest run src/lib/saved-detectors.test.ts`
Expected: FAIL (module manquant).

- [ ] **Step 3 : implémenter `src/lib/saved-detectors.ts`**

```ts
import type { DetectorConfig } from "./detector-config";

export type SavedDetector = { name: string; config: DetectorConfig };

const KEY = "piighost.detectors";

/** Serialize a list of saved detectors to a JSON string. */
export function serialize(list: SavedDetector[]): string {
  return JSON.stringify(list);
}

/** Parse a JSON string (or null) into a list; tolerant of garbage/missing. */
export function parse(raw: string | null): SavedDetector[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? (value as SavedDetector[]) : [];
  } catch {
    return [];
  }
}

/** Read saved detectors from localStorage (empty list if unavailable). */
export function loadSaved(): SavedDetector[] {
  try {
    return parse(window.localStorage.getItem(KEY));
  } catch {
    return [];
  }
}

/** Save (or replace by name) a detector; returns the new list. */
export function saveDetector(name: string, config: DetectorConfig): SavedDetector[] {
  const next = [...loadSaved().filter((d) => d.name !== name), { name, config }];
  try {
    window.localStorage.setItem(KEY, serialize(next));
  } catch {
    // storage unavailable; ignore
  }
  return next;
}

/** Delete a saved detector by name; returns the new list. */
export function deleteSaved(name: string): SavedDetector[] {
  const next = loadSaved().filter((d) => d.name !== name);
  try {
    window.localStorage.setItem(KEY, serialize(next));
  } catch {
    // storage unavailable; ignore
  }
  return next;
}
```

- [ ] **Step 4 : lancer, vérifier le succès**

Run: `pnpm exec vitest run src/lib/saved-detectors.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5 : commit**

```bash
git add src/lib/saved-detectors.ts src/lib/saved-detectors.test.ts
git commit -m "feat(playground): localStorage store for saved detectors"
```

---

## Task 2 : modèle pipeline complet + export étendu

**Files:**
- Modifier : `src/lib/detector-config.ts`
- Modifier : `src/lib/pipeline-export.ts`
- Modifier : `src/lib/pipeline-export.test.ts`

- [ ] **Step 1 : étendre `detector-config.ts`**

Dans `src/lib/detector-config.ts`, **remplacer** la ligne existante
`export type Pipeline = { name: string; detectors: DetectorConfig[] };`
par :

```ts
export type PipelineDetector = { name: string; config: DetectorConfig; enabled: boolean };

export type Placeholder =
  | { type: "label_counter" }
  | { type: "label" }
  | { type: "redact_counter" }
  | { type: "redact" }
  | { type: "label_hash"; hashLength: number }
  | { type: "redact_hash"; hashLength: number }
  | { type: "mask"; maskChar: string }
  | { type: "faker_counter"; locale: string }
  | { type: "faker"; locale: string }
  | { type: "faker_hash"; locale: string; hashLength: number };

export type PlaceholderType = Placeholder["type"];

export const PLACEHOLDER_TYPES: PlaceholderType[] = [
  "label_counter",
  "label_hash",
  "label",
  "mask",
  "redact_counter",
  "redact_hash",
  "redact",
  "faker_counter",
  "faker_hash",
  "faker",
];

export type ConfigPipeline = {
  name: string;
  detectors: PipelineDetector[];
  spanResolver: boolean;
  entityLinker: boolean;
  entityResolver: boolean;
  placeholder: Placeholder;
};

/** A reasonable starting pipeline: no detectors, all stages on, counter tokens. */
export function defaultPipeline(): ConfigPipeline {
  return {
    name: "my-pipeline",
    detectors: [],
    spanResolver: true,
    entityLinker: true,
    entityResolver: true,
    placeholder: { type: "label_counter" },
  };
}

/** Build a placeholder of a given type with sensible default fields. */
export function defaultPlaceholder(type: PlaceholderType): Placeholder {
  switch (type) {
    case "label_hash":
    case "redact_hash":
      return { type, hashLength: 8 };
    case "mask":
      return { type: "mask", maskChar: "*" };
    case "faker_counter":
    case "faker":
      return { type, locale: "en_US" };
    case "faker_hash":
      return { type: "faker_hash", locale: "en_US", hashLength: 8 };
    default:
      return { type };
  }
}
```

- [ ] **Step 2 : mettre à jour le test d'export (échoue)**

Remplacer **tout** le contenu de `src/lib/pipeline-export.test.ts` par :

```ts
import { describe, it, expect } from "vitest";
import { toToml, toPython } from "./pipeline-export";
import type { ConfigPipeline } from "./detector-config";

const pipeline: ConfigPipeline = {
  name: "demo",
  detectors: [
    { name: "emails", enabled: true, config: { type: "regex", patterns: { EMAIL: "\\w+@\\w+", QUOTE: "it's" } } },
    {
      name: "pii",
      enabled: true,
      config: {
        type: "gliner2",
        model: "onnx-community/gliner_small-v2.1",
        labels: ["person", "location"],
        threshold: 0.5,
        flatNer: true,
      },
    },
    { name: "off", enabled: false, config: { type: "regex", patterns: { X: "x" } } },
  ],
  spanResolver: true,
  entityLinker: false,
  entityResolver: true,
  placeholder: { type: "mask", maskChar: "*" },
};

describe("toToml", () => {
  it("emits the pipeline header", () => {
    const toml = toToml(pipeline);
    expect(toml).toContain("[pipeline]");
    expect(toml).toContain('name = "demo"');
    expect(toml).toContain("schema_version = 1");
  });

  it("emits only enabled detectors", () => {
    const toml = toToml(pipeline);
    expect((toml.match(/\[\[detectors\]\]/g) ?? []).length).toBe(2);
  });

  it("writes regex patterns as literal strings with a basic-string fallback", () => {
    const toml = toToml(pipeline);
    expect(toml).toContain("EMAIL = '\\w+@\\w+'");
    expect(toml).toContain('QUOTE = "it\'s"');
  });

  it("emits stage sections with the right type for each toggle", () => {
    const toml = toToml(pipeline);
    expect(toml).toContain('[span_resolver]\ntype = "confidence"');
    expect(toml).toContain('[entity_linker]\ntype = "disabled"');
    expect(toml).toContain('[entity_resolver]\ntype = "merge"');
  });

  it("emits the anonymizer placeholder factory with its field", () => {
    const toml = toToml(pipeline);
    expect(toml).toContain("[anonymizer]");
    expect(toml).toContain('placeholder_factory.type = "mask"');
    expect(toml).toContain('placeholder_factory.mask_char = "*"');
  });
});

describe("toPython", () => {
  it("loads the exported TOML via load_pipeline", () => {
    const py = toPython(pipeline);
    expect(py).toContain("from piighost.config import load_pipeline");
    expect(py).toContain('load_pipeline("pipeline.toml")');
  });

  it("summarizes only enabled detectors", () => {
    const py = toPython(pipeline);
    expect(py).toContain('# Pipeline "demo"');
    expect(py).toContain("gliner2");
    expect(py).not.toContain("X");
  });
});
```

- [ ] **Step 3 : lancer, vérifier l'échec**

Run: `pnpm exec vitest run src/lib/pipeline-export.test.ts`
Expected: FAIL (signatures changées).

- [ ] **Step 4 : réécrire `src/lib/pipeline-export.ts`**

```ts
import type { ConfigPipeline, DetectorConfig, Placeholder } from "./detector-config";

function tomlString(value: string): string {
  if (!value.includes("'")) return `'${value}'`;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function basicString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function patternsInline(patterns: Record<string, string>): string {
  const entries = Object.entries(patterns).map(([label, pat]) => `${label} = ${tomlString(pat)}`);
  return `{ ${entries.join(", ")} }`;
}

function detectorToml(d: DetectorConfig): string {
  const lines = ["[[detectors]]", `type = "${d.type}"`];
  if (d.name) lines.push(`name = ${basicString(d.name)}`);
  switch (d.type) {
    case "regex":
      lines.push(`patterns = ${patternsInline(d.patterns)}`);
      break;
    case "transformers":
      lines.push(`model = ${basicString(d.model)}`, `threshold = ${d.threshold}`);
      break;
    case "gliner2":
      lines.push(
        `model = ${basicString(d.model)}`,
        `labels = [${d.labels.map(basicString).join(", ")}]`,
        `threshold = ${d.threshold}`,
        `flat_ner = ${d.flatNer}`,
      );
      break;
    case "llm":
      lines.push(
        `provider = ${basicString(d.provider)}`,
        `model = ${basicString(d.model)}`,
        `labels = [${d.labels.map(basicString).join(", ")}]`,
      );
      break;
  }
  return lines.join("\n");
}

function placeholderToml(p: Placeholder): string {
  const lines = [`placeholder_factory.type = "${p.type}"`];
  if (p.type === "label_hash" || p.type === "redact_hash" || p.type === "faker_hash") {
    lines.push(`placeholder_factory.hash_length = ${p.hashLength}`);
  }
  if (p.type === "mask") {
    lines.push(`placeholder_factory.mask_char = ${basicString(p.maskChar)}`);
  }
  if (p.type === "faker" || p.type === "faker_counter" || p.type === "faker_hash") {
    lines.push(`placeholder_factory.locale = ${basicString(p.locale)}`);
  }
  return lines.join("\n");
}

/** Serialize a full pipeline to a piighost TOML config. Disabled detectors are
 *  omitted; stage sections reflect the enable/disable toggles. */
export function toToml(pipeline: ConfigPipeline): string {
  const parts: string[] = [
    `[pipeline]\nname = ${basicString(pipeline.name)}\nschema_version = 1`,
  ];
  for (const d of pipeline.detectors) {
    if (d.enabled) parts.push(detectorToml(d.config));
  }
  parts.push(`[span_resolver]\ntype = "${pipeline.spanResolver ? "confidence" : "disabled"}"`);
  parts.push(`[entity_linker]\ntype = "${pipeline.entityLinker ? "exact" : "disabled"}"`);
  parts.push(`[entity_resolver]\ntype = "${pipeline.entityResolver ? "merge" : "disabled"}"`);
  parts.push(`[anonymizer]\n${placeholderToml(pipeline.placeholder)}`);
  return parts.join("\n\n") + "\n";
}

/** Faithful, runnable Python: save the TOML, then load it with the official
 *  loader (direct detector instantiation is fragile, e.g. transformers needs a
 *  prebuilt HuggingFace pipeline object). */
export function toPython(pipeline: ConfigPipeline): string {
  const summary = pipeline.detectors
    .filter((d) => d.enabled)
    .map((d) => (d.config.type === "regex" ? `regex(${Object.keys(d.config.patterns).join(", ")})` : d.config.type))
    .join(", ");
  return [
    `# Pipeline "${pipeline.name}": ${summary}`,
    `# 1. Save the exported configuration as pipeline.toml`,
    `# 2. uv add piighost   (or: pip install piighost)`,
    ``,
    `from piighost.config import load_pipeline`,
    ``,
    `pipeline, manifest = load_pipeline("pipeline.toml")`,
    ``,
    `# anonymized = pipeline.anonymize("your text here")`,
    ``,
  ].join("\n");
}
```

- [ ] **Step 5 : lancer + typecheck**

Run: `pnpm exec vitest run src/lib/pipeline-export.test.ts` (Expected: PASS, 7 tests)
Run: `pnpm exec tsc --noEmit` (Expected: aucune erreur)

- [ ] **Step 6 : commit**

```bash
git add src/lib/detector-config.ts src/lib/pipeline-export.ts src/lib/pipeline-export.test.ts
git commit -m "feat(playground): full pipeline model and extended TOML/Python export"
```

---

## Task 3 : clés i18n (nav + page de config)

**Files:**
- Modifier : `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/fr.ts`

- [ ] **Step 1 : types.ts — ajouter `nav.config` et les clés de page**

Dans `src/i18n/types.ts`, dans le bloc `nav: { ... }`, après `playground: string;`
ajouter `config: string;`.

Puis, dans le bloc `playground`, juste avant sa `};` fermante (après
`exportPython: string;` ajouté précédemment), ajouter :

```ts
    saveDetector: string;
    detectorName: string;
    savedDetectors: string;
    noSaved: string;
    loadLabel: string;
    deleteLabel: string;
    editInPlayground: string;
    detectorsTitle: string;
    addFromSaved: string;
    enabledLabel: string;
    stagesTitle: string;
    spanResolverLabel: string;
    entityLinkerLabel: string;
    entityResolverLabel: string;
    anonymizerLabel: string;
    placeholderStyle: string;
    phHashLength: string;
    phMaskChar: string;
    phLocale: string;
```

- [ ] **Step 2 : en.ts**

Dans `src/i18n/en.ts`, ajouter `config: "Config",` dans `nav` (après
`playground: "Playground",`). Puis dans `playground`, après
`exportPython: "Python",`, ajouter :

```ts
    saveDetector: "Save detector",
    detectorName: "Detector name",
    savedDetectors: "Saved detectors",
    noSaved: "No saved detectors yet.",
    loadLabel: "Load",
    deleteLabel: "Delete",
    editInPlayground: "Edit",
    detectorsTitle: "Detectors",
    addFromSaved: "Add from saved",
    enabledLabel: "Enabled",
    stagesTitle: "Pipeline stages",
    spanResolverLabel: "Span resolver",
    entityLinkerLabel: "Entity linker",
    entityResolverLabel: "Entity resolver",
    anonymizerLabel: "Anonymizer (token style)",
    placeholderStyle: "Token style",
    phHashLength: "Hash length",
    phMaskChar: "Mask character",
    phLocale: "Locale",
```

- [ ] **Step 3 : fr.ts**

Dans `src/i18n/fr.ts`, ajouter `config: "Config",` dans `nav` (après
`playground: "Playground",`). Puis dans `playground`, après
`exportPython: "Python",`, ajouter :

```ts
    saveDetector: "Sauvegarder le détecteur",
    detectorName: "Nom du détecteur",
    savedDetectors: "Détecteurs sauvegardés",
    noSaved: "Aucun détecteur sauvegardé.",
    loadLabel: "Charger",
    deleteLabel: "Supprimer",
    editInPlayground: "Éditer",
    detectorsTitle: "Détecteurs",
    addFromSaved: "Ajouter depuis les sauvegardés",
    enabledLabel: "Activé",
    stagesTitle: "Étapes du pipeline",
    spanResolverLabel: "Résolveur de spans",
    entityLinkerLabel: "Lieur d'entités",
    entityResolverLabel: "Résolveur d'entités",
    anonymizerLabel: "Anonymizer (style de jeton)",
    placeholderStyle: "Style de jeton",
    phHashLength: "Longueur du hash",
    phMaskChar: "Caractère de masque",
    phLocale: "Locale",
```

- [ ] **Step 4 : typecheck + commit**

Run: `pnpm exec tsc --noEmit` (Expected: aucune erreur)

```bash
git add src/i18n/types.ts src/i18n/en.ts src/i18n/fr.ts
git commit -m "i18n: nav Config and config-page keys"
```

---

## Task 4 : page `/playground` (banc + sauvegarde)

**Files:**
- Modifier : `src/components/playground/detector-bench.tsx`
- Créer : `src/components/playground/detector-playground.tsx`

- [ ] **Step 1 : retirer « Valider » du banc**

Dans `src/components/playground/detector-bench.tsx` :
- Supprimer `onValidate` des props (la signature devient
  `{ config, onChange }: { config: DetectorConfig; onChange: (next: DetectorConfig) => void }`).
- Supprimer le bouton « Valider », ne garder que le bouton « Tester ». Remplacer
  le bloc :

```tsx
        <div className="flex gap-2">
          <Button onClick={test} disabled={busy || !runnable || text.trim().length === 0}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            {pg.test}
          </Button>
          <Button variant="outline" onClick={onValidate}>
            {pg.validate}
          </Button>
        </div>
```

par :

```tsx
        <Button onClick={test} disabled={busy || !runnable || text.trim().length === 0}>
          {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
          {pg.test}
        </Button>
```

- [ ] **Step 2 : créer `detector-playground.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DetectorBench } from "@/components/playground/detector-bench";
import { defaultConfig, type DetectorConfig } from "@/lib/detector-config";
import {
  loadSaved,
  saveDetector,
  deleteSaved,
  type SavedDetector,
} from "@/lib/saved-detectors";
import { useT } from "@/i18n/use-t";

export function DetectorPlayground() {
  const { t } = useT();
  const pg = t.playground;
  const [config, setConfig] = useState<DetectorConfig>(defaultConfig("gliner2"));
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<SavedDetector[]>([]);

  useEffect(() => {
    const list = loadSaved();
    const edit =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("edit") : null;
    const found = edit ? list.find((d) => d.name === edit) : undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(list);
    if (found) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfig(found.config);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(found.name);
    }
  }, []);

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaved(saveDetector(trimmed, config));
  }

  return (
    <div className="flex w-full flex-col gap-4 p-4 lg:h-[calc(100dvh-4rem)]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card p-4 shadow-sm">
        <DetectorBench config={config} onChange={setConfig} />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-sm">
        <input
          className="min-w-48 flex-1 rounded-md border bg-background px-2.5 py-1.5 text-sm"
          placeholder={pg.detectorName}
          aria-label={pg.detectorName}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button onClick={save} disabled={name.trim().length === 0}>
          {pg.saveDetector}
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-3 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {pg.savedDetectors}
        </p>
        {saved.length === 0 ? (
          <p className="text-sm text-muted-foreground">{pg.noSaved}</p>
        ) : (
          <ul className="space-y-2">
            {saved.map((d) => (
              <li key={d.name} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2 text-sm">
                <span className="truncate font-mono">
                  {d.name} <span className="text-muted-foreground">({pg.detectorTypes[d.config.type]})</span>
                </span>
                <span className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground"
                    onClick={() => {
                      setConfig(d.config);
                      setName(d.name);
                    }}
                  >
                    {pg.loadLabel}
                  </button>
                  <button
                    type="button"
                    className="text-xs text-destructive"
                    onClick={() => setSaved(deleteSaved(d.name))}
                  >
                    {pg.deleteLabel}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3 : typecheck + commit**

Run: `pnpm exec tsc --noEmit` (Expected: aucune erreur)

```bash
git add src/components/playground/detector-bench.tsx src/components/playground/detector-playground.tsx
git commit -m "feat(playground): detector test bench page with save/load"
```

---

## Task 5 : page `/config` (pipeline complet)

**Files:**
- Créer : `src/components/playground/config-builder.tsx`

- [ ] **Step 1 : créer `config-builder.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import {
  defaultPipeline,
  defaultPlaceholder,
  PLACEHOLDER_TYPES,
  type ConfigPipeline,
  type PlaceholderType,
} from "@/lib/detector-config";
import { toToml, toPython } from "@/lib/pipeline-export";
import { loadSaved, type SavedDetector } from "@/lib/saved-detectors";
import { useT } from "@/i18n/use-t";

function ExportBox({ title, code }: { title: string; code: string }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="group relative overflow-hidden rounded-lg border bg-muted/30">
        <CopyButton value={code} />
        <pre className="overflow-x-auto p-4 font-mono text-xs">{code}</pre>
      </div>
    </div>
  );
}

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md bg-muted/40 p-2 text-sm">
      <span>{label}</span>
      <input type="checkbox" className="size-4 accent-primary" checked={on} onChange={onToggle} />
    </label>
  );
}

export function ConfigBuilder() {
  const { t } = useT();
  const pg = t.playground;
  const [pipeline, setPipeline] = useState<ConfigPipeline>(defaultPipeline());
  const [saved, setSaved] = useState<SavedDetector[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(loadSaved());
  }, []);

  const ph = pipeline.placeholder;

  function addDetector(name: string) {
    const found = saved.find((d) => d.name === name);
    if (!found) return;
    setPipeline((p) => ({
      ...p,
      detectors: [...p.detectors, { name: found.name, config: found.config, enabled: true }],
    }));
  }
  function toggleDetector(i: number) {
    setPipeline((p) => ({
      ...p,
      detectors: p.detectors.map((d, j) => (j === i ? { ...d, enabled: !d.enabled } : d)),
    }));
  }
  function removeDetector(i: number) {
    setPipeline((p) => ({ ...p, detectors: p.detectors.filter((_, j) => j !== i) }));
  }
  function moveDetector(i: number, delta: number) {
    setPipeline((p) => {
      const next = [...p.detectors];
      const j = i + delta;
      if (j < 0 || j >= next.length) return p;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...p, detectors: next };
    });
  }

  return (
    <div className="flex w-full flex-col gap-4 p-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Detectors */}
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {pg.detectorsTitle}
          </h2>
          <input
            className="mb-3 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm"
            value={pipeline.name}
            aria-label={pg.pipelineNameLabel}
            onChange={(e) => setPipeline((p) => ({ ...p, name: e.target.value }))}
          />
          <select
            className="mb-3 w-full rounded-md border bg-background px-2.5 py-1.5 text-xs"
            value=""
            onChange={(e) => {
              if (e.target.value) addDetector(e.target.value);
              e.currentTarget.selectedIndex = 0;
            }}
          >
            <option value="">{pg.addFromSaved}</option>
            {saved.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>

          {pipeline.detectors.length === 0 ? (
            <p className="text-sm text-muted-foreground">{pg.emptyPipeline}</p>
          ) : (
            <ol className="space-y-2">
              {pipeline.detectors.map((d, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2 text-sm">
                  <label className="flex min-w-0 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={d.enabled}
                      onChange={() => toggleDetector(i)}
                    />
                    <span className="truncate font-mono">{d.name}</span>
                  </label>
                  <span className="flex shrink-0 gap-2 text-muted-foreground">
                    <button type="button" className="text-xs" onClick={() => moveDetector(i, -1)} title={pg.moveUp}>↑</button>
                    <button type="button" className="text-xs" onClick={() => moveDetector(i, 1)} title={pg.moveDown}>↓</button>
                    <a className="text-xs" href={`/playground?edit=${encodeURIComponent(d.name)}`}>{pg.editInPlayground}</a>
                    <button type="button" className="text-xs text-destructive" onClick={() => removeDetector(i)} title={pg.remove}>✕</button>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Stages + anonymizer */}
        <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {pg.stagesTitle}
          </h2>
          <Toggle label={pg.spanResolverLabel} on={pipeline.spanResolver} onToggle={() => setPipeline((p) => ({ ...p, spanResolver: !p.spanResolver }))} />
          <Toggle label={pg.entityLinkerLabel} on={pipeline.entityLinker} onToggle={() => setPipeline((p) => ({ ...p, entityLinker: !p.entityLinker }))} />
          <Toggle label={pg.entityResolverLabel} on={pipeline.entityResolver} onToggle={() => setPipeline((p) => ({ ...p, entityResolver: !p.entityResolver }))} />

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{pg.anonymizerLabel}</label>
            <select
              className="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs"
              value={ph.type}
              onChange={(e) =>
                setPipeline((p) => ({ ...p, placeholder: defaultPlaceholder(e.target.value as PlaceholderType) }))
              }
            >
              {PLACEHOLDER_TYPES.map((ty) => (
                <option key={ty} value={ty}>{ty}</option>
              ))}
            </select>

            {(ph.type === "label_hash" || ph.type === "redact_hash" || ph.type === "faker_hash") && (
              <label className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{pg.phHashLength}</span>
                <input
                  type="number"
                  min={4}
                  max={64}
                  className="w-24 rounded-md border bg-background px-2 py-1 text-xs"
                  value={ph.hashLength}
                  onChange={(e) =>
                    setPipeline((p) => ({ ...p, placeholder: { ...ph, hashLength: Number(e.target.value) } }))
                  }
                />
              </label>
            )}
            {ph.type === "mask" && (
              <label className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{pg.phMaskChar}</span>
                <input
                  className="w-24 rounded-md border bg-background px-2 py-1 text-xs"
                  value={ph.maskChar}
                  onChange={(e) =>
                    setPipeline((p) => ({ ...p, placeholder: { type: "mask", maskChar: e.target.value } }))
                  }
                />
              </label>
            )}
            {(ph.type === "faker" || ph.type === "faker_counter" || ph.type === "faker_hash") && (
              <label className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{pg.phLocale}</span>
                <input
                  className="w-32 rounded-md border bg-background px-2 py-1 text-xs"
                  value={ph.locale}
                  onChange={(e) =>
                    setPipeline((p) => ({ ...p, placeholder: { ...ph, locale: e.target.value } }))
                  }
                />
              </label>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ExportBox title={pg.exportToml} code={toToml(pipeline)} />
        <ExportBox title={pg.exportPython} code={toPython(pipeline)} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur. Note : dans les handlers `{ ...ph, hashLength }` / `{ ...ph, locale }`, TypeScript sait que `ph` est restreint au bon variant grâce à la garde `ph.type === ...`, donc le spread conserve le bon type littéral.

- [ ] **Step 3 : commit**

```bash
git add src/components/playground/config-builder.tsx
git commit -m "feat(playground): pipeline config page with stage toggles and export"
```

---

## Task 6 : routes, navbar, suppression du builder rejeté

**Files:**
- Modifier : `src/app/playground/page.tsx`
- Créer : `src/app/config/page.tsx`
- Modifier : `src/components/site-navbar.tsx`
- Supprimer : `src/components/playground/pipeline-builder.tsx`

- [ ] **Step 1 : `/playground` rend le banc**

Remplacer le contenu de `src/app/playground/page.tsx` par :

```tsx
import { DetectorPlayground } from "@/components/playground/detector-playground";

export const metadata = { title: "Playground" };

export default function PlaygroundPage() {
  return <DetectorPlayground />;
}
```

- [ ] **Step 2 : créer la route `/config`**

Créer `src/app/config/page.tsx` :

```tsx
import { ConfigBuilder } from "@/components/playground/config-builder";

export const metadata = { title: "Config" };

export default function ConfigPage() {
  return <ConfigBuilder />;
}
```

- [ ] **Step 3 : lien navbar**

Dans `src/components/site-navbar.tsx`, après la ligne
`<NavLink href="/playground" label={t.nav.playground} />`, ajouter :

```tsx
          <NavLink href="/config" label={t.nav.config} />
```

- [ ] **Step 4 : supprimer le builder rejeté**

Run: `git rm src/components/playground/pipeline-builder.tsx`
Vérifier : `grep -rn "pipeline-builder\|PipelineBuilder" src` ne renvoie rien.

- [ ] **Step 5 : typecheck + tests + lint**

Run: `pnpm exec tsc --noEmit && pnpm test && pnpm lint`
Expected : tsc OK ; tous les tests passent ; pas de nouvelle erreur lint (l'erreur préexistante de `language-provider.tsx` reste).

- [ ] **Step 6 : commit**

```bash
git add src/app/playground/page.tsx src/app/config/page.tsx src/components/site-navbar.tsx
git commit -m "feat(playground): wire /playground and /config routes, drop master-detail builder"
```

---

## Task 7 : vérification navigateur + build + roadmap

**Files:** aucune (sauf ROADMAP).

- [ ] **Step 1 : démarrer le serveur** — Run: `pnpm dev`. Expected : « Ready ».

- [ ] **Step 2 : /playground — tester + sauvegarder**

Ouvrir `http://localhost:3000/playground/`. Type « Regex », saisir un texte avec
un email, « Tester » → email surligné. Donner un nom (« emails »), « Sauvegarder »
→ apparaît dans « Détecteurs sauvegardés ». Recharger la page → toujours présent
(localStorage).

- [ ] **Step 3 : /config — composer**

Ouvrir `http://localhost:3000/config/`. « Ajouter depuis les sauvegardés » →
choisir « emails » : il apparaît, activé. Décocher → désactivé. Basculer
`entity_linker` sur off. Choisir un style de jeton « mask » → le champ caractère
apparaît.

- [ ] **Step 4 : export**

Vérifier le TOML : `[pipeline]`, un `[[detectors]]` pour « emails », `[span_resolver] type = "confidence"`, `[entity_linker] type = "disabled"`, `[anonymizer]` + `placeholder_factory.type = "mask"` + `mask_char`. Le Python contient `load_pipeline("pipeline.toml")`.

- [ ] **Step 5 : lien « Éditer »**

Dans `/config`, cliquer « Éditer » sur « emails » → ouvre `/playground?edit=emails`
avec le détecteur chargé dans le banc.

- [ ] **Step 6 : build statique**

Run: `pnpm build`
Expected : build OK, `/playground` et `/config` générés.

- [ ] **Step 7 : roadmap**

Dans `docs/ROADMAP.md`, sous « État actuel », remplacer/mettre à jour l'entrée
Phase 2 pour décrire la version livrée : `/playground` (test + sauvegarde locale
d'un détecteur) et `/config` (pipeline complet : détecteurs sauvegardés
activables, bascules des étapes, style de jeton de l'anonymizer, export TOML +
Python), sans backend. Lien spec/plan v2.

- [ ] **Step 8 : commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: phase 2 (v2) config playground delivered"
```

---

## Notes d'implémentation

- **setState en effet** : `detector-playground` et `config-builder` lisent
  localStorage dans un `useEffect` (le store n'existe pas au prerender statique).
  C'est le même motif que `LanguageProvider` ; les `setState` y sont précédés
  d'un `// eslint-disable-next-line react-hooks/set-state-in-effect` pour ne pas
  ajouter d'erreur lint.
- **Détecteur désactivé** : conservé dans l'UI, exclu de l'export (le schéma
  `[[detectors]]` n'a pas de champ « enabled »).
- **`?edit=<nom>`** : `/config` lie chaque détecteur à `/playground?edit=<nom>` ;
  le banc charge ce détecteur sauvegardé au montage.
- **Réutilisation** : `runRegex`, `runDetector`, `detector-bench`,
  `EntityHighlight`, `assignLabelColors`, `sortEntities` sont inchangés.
