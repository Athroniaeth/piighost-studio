# Playground de config piighost (phase 2) — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer `/playground` en constructeur de pipeline piighost : composer une liste de détecteurs, tester chacun en direct dans le navigateur, valider, et exporter TOML + Python.

**Architecture:** Un modèle `DetectorConfig` (union discriminée) calqué sur le schéma de la lib ; un dispatch `runDetector` qui réutilise les backends navigateur (regex JS, NER classique, GLiNER) ; deux sérialiseurs purs (TOML, Python) ; une UI maître-détail (liste de détecteurs à gauche, banc d'essai réutilisable à droite, export).

**Tech Stack:** Next.js 16 (export statique), React 19, TypeScript, Vitest. Réutilise `runNer`/`runGliner`/`EntityHighlight`/`CodeBlock`/`CopyButton` existants.

---

## Note sur l'export Python (écart assumé vs spec)

La spec évoquait un export Python « style README » (instanciation directe des
détecteurs). Vérification faite dans la lib : `TransformersDetector.__init__`
prend un **objet pipeline HuggingFace déjà construit** (pas une chaîne de
modèle), et les classes de détecteurs ne sont pas toutes exportées au niveau
racine. Une instanciation directe serait donc fragile et souvent non exécutable.
On exporte donc le Python **fidèle et robuste** : on s'appuie sur
`load_pipeline("pipeline.toml")` (la voie officielle, exactement ce que la lib
fournit), avec un résumé des détecteurs en commentaire. Le TOML reste l'artefact
primaire.

## Structure des fichiers

- **Créer** `src/lib/regex-detect.ts` — `runRegex(patterns, text): Entity[]` (pur).
- **Créer** `src/lib/regex-detect.test.ts`.
- **Créer** `src/lib/detector-config.ts` — types `DetectorConfig` (union), défauts par type, `runDetector(config, text): Promise<Entity[]>`.
- **Créer** `src/lib/detector-config.test.ts` — test du dispatch sur regex.
- **Créer** `src/lib/pipeline-export.ts` — `toToml(pipeline): string` et `toPython(pipeline): string` (purs).
- **Créer** `src/lib/pipeline-export.test.ts`.
- **Créer** `src/components/playground/detector-bench.tsx` — panneau configurer+tester pour un `DetectorConfig` (refactor du cœur de `ner-playground.tsx`).
- **Créer** `src/components/playground/pipeline-builder.tsx` — maître-détail (liste + bench + export).
- **Modifier** `src/app/playground/page.tsx` — rendre `PipelineBuilder`.
- **Supprimer** `src/components/playground/ner-playground.tsx` (son contenu est repris par le bench).
- **Modifier** `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/fr.ts` — clés du builder.

Type partagé utilisé partout :

```ts
// dans src/lib/detector-config.ts
import type { ModelId } from "./ner";
import type { GlinerModelId } from "./gliner";

export type RegexDetectorConfig = {
  type: "regex";
  name?: string;
  patterns: Record<string, string>;
};
export type TransformersDetectorConfig = {
  type: "transformers";
  name?: string;
  model: ModelId;
  threshold: number;
};
export type Gliner2DetectorConfig = {
  type: "gliner2";
  name?: string;
  model: GlinerModelId;
  labels: string[];
  threshold: number;
  flatNer: boolean;
};
export type LlmDetectorConfig = {
  type: "llm";
  name?: string;
  provider: string;
  model: string;
  labels: string[];
};
export type DetectorConfig =
  | RegexDetectorConfig
  | TransformersDetectorConfig
  | Gliner2DetectorConfig
  | LlmDetectorConfig;

export type Pipeline = { name: string; detectors: DetectorConfig[] };
```

---

## Task 1 : détecteur regex navigateur (`runRegex`)

**Files:**
- Créer : `src/lib/regex-detect.ts`
- Test : `src/lib/regex-detect.test.ts`

- [ ] **Step 1 : test (échoue)**

Créer `src/lib/regex-detect.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { runRegex } from "./regex-detect";

describe("runRegex", () => {
  it("matches one pattern and reports label + offsets", () => {
    const out = runRegex({ EMAIL: "\\w+@\\w+\\.\\w+" }, "write to a@b.io please");
    expect(out).toEqual([
      { text: "a@b.io", label: "EMAIL", score: 1, start: 9, end: 15 },
    ]);
  });

  it("finds all occurrences of a pattern", () => {
    const out = runRegex({ N: "\\d+" }, "1 and 22 and 333");
    expect(out.map((e) => e.text)).toEqual(["1", "22", "333"]);
  });

  it("returns matches from several patterns sorted by position", () => {
    const out = runRegex({ NUM: "\\d+", WORD: "[a-z]+" }, "ab 12");
    expect(out.map((e) => `${e.label}:${e.text}`)).toEqual(["WORD:ab", "NUM:12"]);
  });

  it("skips an invalid pattern instead of throwing", () => {
    const out = runRegex({ BAD: "(", OK: "\\d" }, "x 5");
    expect(out.map((e) => e.label)).toEqual(["OK"]);
  });

  it("does not loop forever on a zero-width pattern", () => {
    const out = runRegex({ Z: "a*" }, "baa");
    expect(Array.isArray(out)).toBe(true);
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `pnpm exec vitest run src/lib/regex-detect.test.ts`
Expected: FAIL (module manquant).

- [ ] **Step 3 : implémenter `src/lib/regex-detect.ts`**

```ts
import type { Entity } from "./ner";

/** Run each {label: pattern} regex over the text and return matches as entities.
 *  Patterns run with the global flag; invalid patterns are skipped (a single
 *  bad regex must not break the whole detector). Zero-width matches advance the
 *  cursor so matching always terminates. score is 1 (regex is exact). */
export function runRegex(patterns: Record<string, string>, text: string): Entity[] {
  const out: Entity[] = [];
  for (const [label, pattern] of Object.entries(patterns)) {
    let re: RegExp;
    try {
      re = new RegExp(pattern, "g");
    } catch {
      continue; // invalid regex: skip this pattern
    }
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m[0].length > 0) {
        out.push({
          text: m[0],
          label,
          score: 1,
          start: m.index,
          end: m.index + m[0].length,
        });
      }
      if (m.index === re.lastIndex) re.lastIndex++; // avoid infinite loop
    }
  }
  return out.sort((a, b) => a.start - b.start);
}
```

- [ ] **Step 4 : lancer, vérifier le succès**

Run: `pnpm exec vitest run src/lib/regex-detect.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5 : commit**

```bash
git add src/lib/regex-detect.ts src/lib/regex-detect.test.ts
git commit -m "feat(playground): browser regex detector (runRegex)"
```

---

## Task 2 : modèle `DetectorConfig` + dispatch `runDetector`

**Files:**
- Créer : `src/lib/detector-config.ts`
- Test : `src/lib/detector-config.test.ts`

- [ ] **Step 1 : test (échoue)**

Créer `src/lib/detector-config.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { runDetector, defaultConfig, type DetectorConfig } from "./detector-config";

describe("runDetector", () => {
  it("runs a regex detector in the browser", async () => {
    const cfg: DetectorConfig = { type: "regex", patterns: { D: "\\d+" } };
    const out = await runDetector(cfg, "a 7 b");
    expect(out.map((e) => e.text)).toEqual(["7"]);
  });

  it("rejects an llm detector (not runnable in the browser)", async () => {
    const cfg: DetectorConfig = {
      type: "llm",
      provider: "mistral",
      model: "x",
      labels: ["PER"],
    };
    await expect(runDetector(cfg, "hi")).rejects.toThrow();
  });
});

describe("defaultConfig", () => {
  it("gives a usable default per type", () => {
    expect(defaultConfig("regex").type).toBe("regex");
    expect(defaultConfig("gliner2").type).toBe("gliner2");
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `pnpm exec vitest run src/lib/detector-config.test.ts`
Expected: FAIL (module manquant).

- [ ] **Step 3 : implémenter `src/lib/detector-config.ts`**

```ts
import type { Entity, ModelId } from "./ner";
import { runNer } from "./ner";
import type { GlinerModelId } from "./gliner";
import { runGliner } from "./gliner";
import { runRegex } from "./regex-detect";

export type RegexDetectorConfig = {
  type: "regex";
  name?: string;
  patterns: Record<string, string>;
};
export type TransformersDetectorConfig = {
  type: "transformers";
  name?: string;
  model: ModelId;
  threshold: number;
};
export type Gliner2DetectorConfig = {
  type: "gliner2";
  name?: string;
  model: GlinerModelId;
  labels: string[];
  threshold: number;
  flatNer: boolean;
};
export type LlmDetectorConfig = {
  type: "llm";
  name?: string;
  provider: string;
  model: string;
  labels: string[];
};
export type DetectorConfig =
  | RegexDetectorConfig
  | TransformersDetectorConfig
  | Gliner2DetectorConfig
  | LlmDetectorConfig;

export type DetectorType = DetectorConfig["type"];
export type Pipeline = { name: string; detectors: DetectorConfig[] };

/** Which detector types can actually run in the browser. */
export const RUNNABLE: Record<DetectorType, boolean> = {
  regex: true,
  transformers: true,
  gliner2: true,
  llm: false,
};

/** A sensible starting config for each detector type. */
export function defaultConfig(type: DetectorType): DetectorConfig {
  switch (type) {
    case "regex":
      return { type: "regex", patterns: { EMAIL: "[\\w.+-]+@[\\w-]+\\.[\\w.-]+" } };
    case "transformers":
      return { type: "transformers", model: "Xenova/bert-base-NER", threshold: 0.5 };
    case "gliner2":
      return {
        type: "gliner2",
        model: "onnx-community/gliner_small-v2.1",
        labels: ["person", "organization", "location", "date"],
        threshold: 0.5,
        flatNer: true,
      };
    case "llm":
      return { type: "llm", provider: "mistral", model: "mistral-small", labels: ["PER", "LOC"] };
  }
}

/** Run a detector config against text in the browser. Throws for llm. */
export async function runDetector(config: DetectorConfig, text: string): Promise<Entity[]> {
  switch (config.type) {
    case "regex":
      return runRegex(config.patterns, text);
    case "transformers":
      return runNer(config.model, text);
    case "gliner2":
      return runGliner(config.model, config.labels, text);
    case "llm":
      throw new Error("The LLM detector runs at deployment, not in the browser.");
  }
}
```

- [ ] **Step 4 : lancer, vérifier le succès**

Run: `pnpm exec vitest run src/lib/detector-config.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5 : typecheck + commit**

Run: `pnpm exec tsc --noEmit` (Expected: aucune erreur)

```bash
git add src/lib/detector-config.ts src/lib/detector-config.test.ts
git commit -m "feat(playground): DetectorConfig model and runDetector dispatch"
```

---

## Task 3 : export TOML

**Files:**
- Créer : `src/lib/pipeline-export.ts`
- Test : `src/lib/pipeline-export.test.ts`

- [ ] **Step 1 : test (échoue)**

Créer `src/lib/pipeline-export.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { toToml } from "./pipeline-export";
import type { Pipeline } from "./detector-config";

const pipeline: Pipeline = {
  name: "demo",
  detectors: [
    { type: "regex", patterns: { EMAIL: "\\w+@\\w+", QUOTE: "it's" } },
    {
      type: "gliner2",
      model: "onnx-community/gliner_small-v2.1",
      labels: ["person", "location"],
      threshold: 0.5,
      flatNer: true,
    },
  ],
};

describe("toToml", () => {
  it("emits the pipeline header with name and schema_version", () => {
    const toml = toToml(pipeline);
    expect(toml).toContain("[pipeline]");
    expect(toml).toContain('name = "demo"');
    expect(toml).toContain("schema_version = 1");
  });

  it("emits one [[detectors]] table per detector with its type", () => {
    const toml = toToml(pipeline);
    expect((toml.match(/\[\[detectors\]\]/g) ?? []).length).toBe(2);
    expect(toml).toContain('type = "regex"');
    expect(toml).toContain('type = "gliner2"');
  });

  it("writes regex patterns as a literal-string inline table", () => {
    const toml = toToml(pipeline);
    // literal strings keep backslashes verbatim
    expect(toml).toContain("EMAIL = '\\w+@\\w+'");
    // a pattern containing a single quote falls back to a basic string
    expect(toml).toContain('QUOTE = "it\'s"');
  });

  it("emits gliner2 fields including labels and flat_ner", () => {
    const toml = toToml(pipeline);
    expect(toml).toContain('model = "onnx-community/gliner_small-v2.1"');
    expect(toml).toContain('labels = ["person", "location"]');
    expect(toml).toContain("threshold = 0.5");
    expect(toml).toContain("flat_ner = true");
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `pnpm exec vitest run src/lib/pipeline-export.test.ts`
Expected: FAIL.

- [ ] **Step 3 : implémenter la partie TOML de `src/lib/pipeline-export.ts`**

```ts
import type { DetectorConfig, Pipeline } from "./detector-config";

/** TOML string for a value: literal string for regex (keeps backslashes), with a
 *  basic-string fallback when the value contains a single quote. */
function tomlString(value: string): string {
  if (!value.includes("'")) return `'${value}'`;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Double-quoted basic string (for non-regex string fields). */
function basicString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function patternsInline(patterns: Record<string, string>): string {
  const entries = Object.entries(patterns).map(
    ([label, pat]) => `${label} = ${tomlString(pat)}`,
  );
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

/** Serialize a pipeline to a piighost TOML config. The four non-detector stages
 *  (span_resolver / entity_linker / entity_resolver / anonymizer) are omitted so
 *  the library applies its defaults. */
export function toToml(pipeline: Pipeline): string {
  const header = `[pipeline]\nname = ${basicString(pipeline.name)}\nschema_version = 1\n`;
  const detectors = pipeline.detectors.map(detectorToml).join("\n\n");
  return `${header}\n${detectors}\n`;
}
```

- [ ] **Step 4 : lancer, vérifier le succès**

Run: `pnpm exec vitest run src/lib/pipeline-export.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5 : commit**

```bash
git add src/lib/pipeline-export.ts src/lib/pipeline-export.test.ts
git commit -m "feat(playground): export pipeline config to piighost TOML"
```

---

## Task 4 : export Python

**Files:**
- Modifier : `src/lib/pipeline-export.ts`
- Modifier : `src/lib/pipeline-export.test.ts`

- [ ] **Step 1 : ajouter le test (échoue)**

Ajouter à `src/lib/pipeline-export.test.ts` :

```ts
import { toPython } from "./pipeline-export";

describe("toPython", () => {
  it("loads the exported TOML via load_pipeline", () => {
    const py = toPython(pipeline);
    expect(py).toContain("from piighost.config import load_pipeline");
    expect(py).toContain('load_pipeline("pipeline.toml")');
  });

  it("summarizes the detectors as a comment", () => {
    const py = toPython(pipeline);
    expect(py).toContain("# Pipeline \"demo\"");
    expect(py).toContain("regex");
    expect(py).toContain("gliner2");
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `pnpm exec vitest run src/lib/pipeline-export.test.ts`
Expected: FAIL (`toPython` manquant).

- [ ] **Step 3 : ajouter `toPython` à `src/lib/pipeline-export.ts`**

```ts
/** Faithful, runnable Python: save the TOML, then load it with the official
 *  loader. (Direct detector instantiation is intentionally avoided: some
 *  detectors, e.g. transformers, need a prebuilt HuggingFace pipeline object.) */
export function toPython(pipeline: Pipeline): string {
  const summary = pipeline.detectors
    .map((d) => (d.type === "regex" ? `regex(${Object.keys(d.patterns).join(", ")})` : d.type))
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

- [ ] **Step 4 : lancer, vérifier le succès**

Run: `pnpm exec vitest run src/lib/pipeline-export.test.ts`
Expected: PASS (6 tests dans le fichier).

- [ ] **Step 5 : commit**

```bash
git add src/lib/pipeline-export.ts src/lib/pipeline-export.test.ts
git commit -m "feat(playground): export pipeline as Python using load_pipeline"
```

---

## Task 5 : clés i18n du builder

**Files:**
- Modifier : `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/fr.ts`

- [ ] **Step 1 : étendre le type `playground` dans `types.ts`**

Dans `src/i18n/types.ts`, à la fin du bloc `playground` (juste avant sa `};` fermante, après `emptyHint: string;`), ajouter :

```ts
    pipelineTitle: string;
    addDetector: string;
    validate: string;
    test: string;
    remove: string;
    moveUp: string;
    moveDown: string;
    detectorType: string;
    detectorTypes: { regex: string; transformers: string; gliner2: string; llm: string };
    llmDeploymentNote: string;
    patternsLabel: string;
    patternsHint: string;
    providerLabel: string;
    pipelineNameLabel: string;
    emptyPipeline: string;
    exportTitle: string;
    exportToml: string;
    exportPython: string;
```

- [ ] **Step 2 : renseigner `en.ts`**

Dans `src/i18n/en.ts`, à la même position (après `emptyHint: "..."`), ajouter :

```ts
    pipelineTitle: "Pipeline",
    addDetector: "Add detector",
    validate: "Validate",
    test: "Test",
    remove: "Remove",
    moveUp: "Move up",
    moveDown: "Move down",
    detectorType: "Detector type",
    detectorTypes: {
      regex: "Regex",
      transformers: "Classic NER",
      gliner2: "GLiNER (zero-shot)",
      llm: "LLM",
    },
    llmDeploymentNote: "The LLM detector runs at deployment, not in the browser.",
    patternsLabel: "Patterns (one per line: LABEL = regex)",
    patternsHint: "Each line maps a label to a regular expression.",
    providerLabel: "Provider",
    pipelineNameLabel: "Pipeline name",
    emptyPipeline: "No detectors yet. Configure one and validate it.",
    exportTitle: "Export",
    exportToml: "TOML",
    exportPython: "Python",
```

- [ ] **Step 3 : renseigner `fr.ts`**

Dans `src/i18n/fr.ts`, à la même position, ajouter :

```ts
    pipelineTitle: "Pipeline",
    addDetector: "Ajouter un détecteur",
    validate: "Valider",
    test: "Tester",
    remove: "Retirer",
    moveUp: "Monter",
    moveDown: "Descendre",
    detectorType: "Type de détecteur",
    detectorTypes: {
      regex: "Regex",
      transformers: "NER classique",
      gliner2: "GLiNER (zero-shot)",
      llm: "LLM",
    },
    llmDeploymentNote: "Le détecteur LLM tourne au déploiement, pas dans le navigateur.",
    patternsLabel: "Motifs (un par ligne : LABEL = regex)",
    patternsHint: "Chaque ligne associe un label à une expression régulière.",
    providerLabel: "Fournisseur",
    pipelineNameLabel: "Nom de la pipeline",
    emptyPipeline: "Aucun détecteur. Configurez-en un et validez-le.",
    exportTitle: "Export",
    exportToml: "TOML",
    exportPython: "Python",
```

- [ ] **Step 4 : typecheck + commit**

Run: `pnpm exec tsc --noEmit` (Expected: aucune erreur — les deux dictionnaires satisfont `Dictionary`)

```bash
git add src/i18n/types.ts src/i18n/en.ts src/i18n/fr.ts
git commit -m "i18n(playground): keys for the pipeline builder"
```

---

## Task 6 : banc d'essai réutilisable (`detector-bench.tsx`)

Refactor : extraire de `ner-playground.tsx` le panneau « configurer + tester un détecteur », piloté par un `DetectorConfig`. Le bench gère la config du détecteur courant, le test, le surlignage, la liste d'entités, le tri, le seuil et le temps d'inférence (tout ce qui existe déjà). Il ne gère PAS la liste de pipeline (c'est le builder).

**Files:**
- Créer : `src/components/playground/detector-bench.tsx`

- [ ] **Step 1 : créer le composant**

Le bench prend en props le détecteur courant et un setter, et expose un bouton « Valider » via un callback. Il réutilise `runDetector`, `assignLabelColors`, `sortEntities`, `EntityHighlight`, `LABELS`/`labelStyle`, `parseLabels`.

```tsx
"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityHighlight } from "@/components/playground/entity-highlight";
import { type Entity, type ModelId, sortEntities, type EntitySort } from "@/lib/ner";
import { type GlinerModelId } from "@/lib/gliner";
import { assignLabelColors, labelStyle, parseLabels } from "@/lib/labels";
import {
  runDetector,
  RUNNABLE,
  defaultConfig,
  type DetectorConfig,
  type DetectorType,
} from "@/lib/detector-config";
import { useT } from "@/i18n/use-t";

type Status = "idle" | "running" | "done" | "error";

const CLASSIC_MODELS: ModelId[] = [
  "Xenova/bert-base-multilingual-cased-ner-hrl",
  "Xenova/bert-base-NER",
];
const GLINER_MODELS: GlinerModelId[] = [
  "onnx-community/gliner_small-v2.1",
  "onnx-community/gliner_multi_pii-v1",
];
const DETECTOR_TYPES: DetectorType[] = ["regex", "transformers", "gliner2", "llm"];

/** Serialize a regex config's patterns to the "LABEL = regex" textarea form. */
function patternsToText(patterns: Record<string, string>): string {
  return Object.entries(patterns)
    .map(([label, pat]) => `${label} = ${pat}`)
    .join("\n");
}
/** Parse the "LABEL = regex" textarea back into a patterns record. */
function textToPatterns(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const i = line.indexOf("=");
    if (i === -1) continue;
    const label = line.slice(0, i).trim();
    const pat = line.slice(i + 1).trim();
    if (label && pat) out[label] = pat;
  }
  return out;
}

export function DetectorBench({
  config,
  onChange,
  onValidate,
}: {
  config: DetectorConfig;
  onChange: (next: DetectorConfig) => void;
  onValidate: () => void;
}) {
  const { t } = useT();
  const pg = t.playground;
  const [text, setText] = useState(pg.example);
  const [status, setStatus] = useState<Status>("idle");
  const [allEntities, setAllEntities] = useState<Entity[]>([]);
  const [analyzed, setAnalyzed] = useState("");
  const [threshold, setThreshold] = useState(0.5);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [sort, setSort] = useState<EntitySort>("appearance");

  const entities = useMemo(
    () => allEntities.filter((e) => e.score >= threshold),
    [allEntities, threshold],
  );
  const colors = useMemo(() => assignLabelColors(allEntities.map((e) => e.label)), [allEntities]);
  const sortedEntities = useMemo(() => sortEntities(entities, sort), [entities, sort]);

  const runnable = RUNNABLE[config.type];
  const busy = status === "running";

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

  return (
    <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      {/* Left: detector configuration */}
      <section className="space-y-4 overflow-auto p-1">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{pg.detectorType}</label>
          <select
            className="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs"
            value={config.type}
            onChange={(e) => onChange(defaultConfig(e.target.value as DetectorType))}
          >
            {DETECTOR_TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {pg.detectorTypes[ty]}
              </option>
            ))}
          </select>
        </div>

        {config.type === "regex" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{pg.patternsLabel}</label>
            <textarea
              className="min-h-32 w-full resize-none rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs"
              value={patternsToText(config.patterns)}
              onChange={(e) => onChange({ ...config, patterns: textToPatterns(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">{pg.patternsHint}</p>
          </div>
        )}

        {config.type === "transformers" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{pg.modelLabel}</label>
            <select
              className="w-full rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs"
              value={config.model}
              onChange={(e) => onChange({ ...config, model: e.target.value as ModelId })}
            >
              {CLASSIC_MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {config.type === "gliner2" && (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{pg.modelLabel}</label>
              <select
                className="w-full rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs"
                value={config.model}
                onChange={(e) => onChange({ ...config, model: e.target.value as GlinerModelId })}
              >
                {GLINER_MODELS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{pg.glinerLabelsLabel}</label>
              <textarea
                className="min-h-20 w-full resize-none rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs"
                value={config.labels.join(", ")}
                placeholder={pg.glinerLabelsPlaceholder}
                onChange={(e) => onChange({ ...config, labels: parseLabels(e.target.value) })}
              />
            </div>
          </>
        )}

        {config.type === "llm" && (
          <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            {pg.llmDeploymentNote}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            onClick={test}
            disabled={busy || !runnable || text.trim().length === 0}
          >
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            {pg.test}
          </Button>
          <Button variant="outline" onClick={onValidate}>
            {pg.validate}
          </Button>
        </div>
      </section>

      {/* Right: text + results (reused from the phase-1 bench) */}
      <section className="flex min-h-0 flex-col gap-3 overflow-auto p-1">
        {status === "done" ? (
          <div className="rounded-lg border bg-background p-3 text-sm">
            <EntityHighlight text={analyzed} entities={entities} colors={colors} />
          </div>
        ) : (
          <textarea
            className="min-h-32 w-full resize-none rounded-lg border bg-background p-3 text-sm"
            value={text}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
          />
        )}

        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{pg.thresholdLabel}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-40 accent-primary"
            aria-label={pg.thresholdLabel}
          />
        </div>

        {status === "error" && <p className="text-sm text-destructive">{pg.errorTitle}</p>}

        {status === "done" && (
          <>
            {durationMs !== null && (
              <p className="text-xs text-muted-foreground">
                {pg.inferenceTime}: {Math.round(durationMs)} ms · ~
                {(1000 / durationMs).toFixed(1)} {pg.reqPerSecond}
              </p>
            )}
            {entities.length === 0 ? (
              <p className="text-sm text-muted-foreground">{pg.noEntities}</p>
            ) : (
              <ul className="space-y-2">
                {sortedEntities.map((e, i) => (
                  <li
                    key={`${e.start}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${colors.get(e.label) ?? labelStyle(e.label)}`}
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
          </>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2 : typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur. (Le composant n'est pas encore monté ; c'est attendu.)

- [ ] **Step 3 : commit**

```bash
git add src/components/playground/detector-bench.tsx
git commit -m "feat(playground): reusable detector configure-and-test bench"
```

---

## Task 7 : constructeur de pipeline + page + retrait de l'ancien playground

**Files:**
- Créer : `src/components/playground/pipeline-builder.tsx`
- Modifier : `src/app/playground/page.tsx`
- Supprimer : `src/components/playground/ner-playground.tsx`

- [ ] **Step 1 : créer `pipeline-builder.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/code-block";
import { DetectorBench } from "@/components/playground/detector-bench";
import { defaultConfig, type DetectorConfig, type Pipeline } from "@/lib/detector-config";
import { toToml, toPython } from "@/lib/pipeline-export";
import { useT } from "@/i18n/use-t";

export function PipelineBuilder() {
  const { t } = useT();
  const pg = t.playground;
  const [name, setName] = useState("my-pipeline");
  const [detectors, setDetectors] = useState<DetectorConfig[]>([]);
  const [draft, setDraft] = useState<DetectorConfig>(defaultConfig("regex"));
  const [showExport, setShowExport] = useState(false);

  const pipeline: Pipeline = { name, detectors };

  function validate() {
    setDetectors((prev) => [...prev, draft]);
  }
  function remove(index: number) {
    setDetectors((prev) => prev.filter((_, i) => i !== index));
  }
  function move(index: number, delta: number) {
    setDetectors((prev) => {
      const next = [...prev];
      const j = index + delta;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  return (
    <div className="flex w-full flex-col gap-4 p-4 lg:h-[calc(100dvh-4rem)]">
      <div className="grid flex-1 gap-4 overflow-hidden lg:min-h-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2.4fr)]">
        {/* Left: pipeline list + export */}
        <section className="flex min-h-0 flex-col gap-3 overflow-auto rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {pg.pipelineTitle}
          </h2>

          <input
            className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm"
            value={name}
            aria-label={pg.pipelineNameLabel}
            onChange={(e) => setName(e.target.value)}
          />

          {detectors.length === 0 ? (
            <p className="text-sm text-muted-foreground">{pg.emptyPipeline}</p>
          ) : (
            <ol className="space-y-2">
              {detectors.map((d, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2 text-sm">
                  <span className="truncate">
                    {i + 1}. {pg.detectorTypes[d.type]}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <button className="text-xs text-muted-foreground" onClick={() => move(i, -1)} title={pg.moveUp}>↑</button>
                    <button className="text-xs text-muted-foreground" onClick={() => move(i, 1)} title={pg.moveDown}>↓</button>
                    <button className="text-xs text-destructive" onClick={() => remove(i)} title={pg.remove}>✕</button>
                  </span>
                </li>
              ))}
            </ol>
          )}

          <Button
            variant="outline"
            className="mt-auto"
            disabled={detectors.length === 0}
            onClick={() => setShowExport((s) => !s)}
          >
            {pg.exportTitle}
          </Button>
        </section>

        {/* Right: detector bench */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card p-4 shadow-sm">
          <DetectorBench config={draft} onChange={setDraft} onValidate={validate} />
        </section>
      </div>

      {showExport && detectors.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {pg.exportToml}
            </p>
            <CodeBlock code={toToml(pipeline)} lang="toml" />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {pg.exportPython}
            </p>
            <CodeBlock code={toPython(pipeline)} lang="python" />
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : vérifier la signature de `CodeBlock`**

Run: `sed -n '1,30p' src/components/code-block.tsx`
Expected : un composant prenant `code` et `lang` (utilisé ainsi dans `src/app/piighost/page.tsx`). Si les props diffèrent, adapter l'appel `CodeBlock` ci-dessus en conséquence et le signaler.

- [ ] **Step 3 : pointer la page sur le builder**

Remplacer le contenu de `src/app/playground/page.tsx`. Lire d'abord le fichier ; il rend actuellement `NerPlayground`. Remplacer l'import et l'usage :

```tsx
import { PipelineBuilder } from "@/components/playground/pipeline-builder";
```
et dans le JSX, remplacer `<NerPlayground />` par `<PipelineBuilder />`. Conserver le reste du fichier (métadonnées, structure) tel quel.

- [ ] **Step 4 : supprimer l'ancien composant**

Run: `git rm src/components/playground/ner-playground.tsx`
(Plus aucune référence ne doit subsister : `grep -rn "ner-playground" src` ne renvoie rien.)

- [ ] **Step 5 : typecheck + lint + tests**

Run: `pnpm exec tsc --noEmit && pnpm test && pnpm lint`
Expected : tsc OK ; tous les tests passent ; pas de nouvelle erreur lint (l'erreur préexistante de `language-provider.tsx` est tolérée).

- [ ] **Step 6 : commit**

```bash
git add src/components/playground/pipeline-builder.tsx src/app/playground/page.tsx
git commit -m "feat(playground): pipeline builder replacing the single NER tester"
```

---

## Task 8 : vérification navigateur de bout en bout

**Files:** aucune (vérification).

- [ ] **Step 1 : démarrer le serveur**

Run: `pnpm dev` (arrière-plan). Expected : « Ready ».

- [ ] **Step 2 : détecteur regex**

Ouvrir `http://localhost:3000/playground/`. Type « Regex », garder le motif EMAIL par défaut, saisir un texte avec un email, « Tester ».
Expected : l'email surligné, listé en `EMAIL` à 100 %. « Valider » → apparaît dans la pipeline à gauche.

- [ ] **Step 3 : détecteur NER classique + GLiNER**

Ajouter un détecteur « NER classique » (modèle anglais), tester sur un texte → entités PER/ORG/LOC. Valider. Idem un « GLiNER (zero-shot) » avec labels libres. Valider.

- [ ] **Step 4 : LLM grisé**

Choisir le type « LLM » : le bouton « Tester » est désactivé et la note de déploiement s'affiche.

- [ ] **Step 5 : export**

Cliquer « Export ». Vérifier que le TOML contient `[pipeline]`, `schema_version = 1`, un `[[detectors]]` par détecteur validé, et que le Python contient `load_pipeline("pipeline.toml")`.

- [ ] **Step 6 : build statique**

Run: `pnpm build`
Expected : build OK, `/playground` généré.

- [ ] **Step 7 : mettre à jour la roadmap**

Dans `docs/ROADMAP.md`, sous « État actuel », ajouter que la Phase 2 (constructeur de pipeline : détecteurs regex/NER/GLiNER testables, LLM grisé, export TOML + Python, sans backend) est livrée, avec liens spec/plan.

- [ ] **Step 8 : commit final**

```bash
git add docs/ROADMAP.md
git commit -m "docs: phase 2 config playground delivered"
```

---

## Notes d'implémentation

- **Seuil pour regex** : `runRegex` renvoie `score = 1`, donc le filtre de seuil ne masque jamais les correspondances regex. Cohérent.
- **GLiNER `flat_ner` / `threshold`** : exposés dans la config et exportés ; le banc interroge le modèle via `runGliner` (seuil interne bas) et filtre en direct au seuil, comme en phase 1.
- **Pas de fusion inter-détecteurs** : le banc teste un détecteur isolé (décidé en brainstorming).
- **i18n** : le bench réutilise des clés existantes (`modelLabel`, `glinerLabelsLabel`, `glinerLabelsPlaceholder`, `thresholdLabel`, `inferenceTime`, `reqPerSecond`, `noEntities`, `errorTitle`, `example`) plus les nouvelles de la Task 5.
- **Composant retiré** : `ner-playground.tsx` est supprimé ; ses sous-parties (surlignage, liste, tri, temps) revivent dans `detector-bench.tsx`.
