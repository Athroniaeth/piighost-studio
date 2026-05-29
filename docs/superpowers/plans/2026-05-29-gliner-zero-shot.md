# GLiNER zero-shot — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter des modèles GLiNER (zero-shot, labels libres) au playground, à côté du NER classique, en inférence 100 % navigateur sans hébergement.

**Architecture:** Deux backends derrière le type `Entity` commun : `src/lib/ner.ts` (classique, inchangé) et un nouveau `src/lib/gliner.ts` qui charge dynamiquement le package npm `gliner` (code-splitté, téléchargé seulement à l'usage). Le modèle ONNX et le WASM sont chargés depuis des CDN. Le composant playground choisit le backend selon la « famille » du modèle, et adapte la section labels (cases figées pour le classique, champ texte libre pour GLiNER).

**Tech Stack:** Next.js 16 (export statique), React 19, TypeScript, `gliner` (onnxruntime-web), `@huggingface/transformers` (existant), Vitest.

---

## Référence API du package `gliner` (vérifiée depuis les sources)

```ts
import { Gliner } from "gliner";
const g = new Gliner({
  tokenizerPath: "onnx-community/gliner_small-v2.1",
  onnxSettings: {
    modelPath: "https://huggingface.co/.../onnx/model_quantized.onnx", // passé à ort.InferenceSession.create -> accepte une URL
    executionProvider: "wasm",      // "webgpu" | "wasm" | "cpu" | "webgl"
    wasmPaths: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/",
    multiThread: false,             // false = pas de SharedArrayBuffer, pas besoin de COOP/COEP
    fetchBinary: true,
  },
  transformersSettings: { allowLocalModels: false, useBrowserCache: true },
  maxWidth: 12,
  modelType: "gliner",
});
await g.initialize();
const out = await g.inference({
  texts: ["..."], entities: ["person", "email"], threshold: 0.1, flatNer: false, multiLabel: false,
});
// out: [{ spanText, start, end, label, score }][]  (un tableau par texte)
```

## Structure des fichiers

- **Créer** `src/lib/gliner.ts` — backend GLiNER : `mapSpans`, `loadGliner`, `runGliner`. Mono-responsabilité, miroir de `ner.ts`.
- **Créer** `src/lib/gliner.test.ts` — test unitaire de `mapSpans`.
- **Créer** `src/lib/labels.ts` — fonctions pures : `parseLabels`, `hashLabelColor`.
- **Créer** `src/lib/labels.test.ts` — tests de `parseLabels` et `hashLabelColor`.
- **Modifier** `src/components/playground/entity-highlight.tsx` — `labelStyle()` retombe sur `hashLabelColor` pour les labels inconnus.
- **Modifier** `src/components/playground/ner-playground.tsx` — registre de modèles avec famille, sélecteur groupé, section labels adaptative, aiguillage `analyze()`.
- **Modifier** `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/fr.ts` — nouvelles clés.

---

## Task 1 : Backend GLiNER (`src/lib/gliner.ts`)

**Files:**
- Modifier (deps) : `package.json` (via pnpm)
- Créer : `src/lib/gliner.ts`
- Test : `src/lib/gliner.test.ts`

- [ ] **Step 1 : Installer le package**

Run: `pnpm add gliner`
Expected: `gliner` ajouté aux dependencies de `package.json`.

- [ ] **Step 2 : Écrire le test de `mapSpans` (échoue)**

Créer `src/lib/gliner.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { mapSpans, type RawSpan } from "./gliner";

describe("mapSpans", () => {
  it("maps gliner spans to Entity, renaming spanText -> text", () => {
    const spans: RawSpan[] = [
      { spanText: "Sarah Connor", start: 0, end: 12, label: "person", score: 0.97 },
      { spanText: "sarah@x.io", start: 20, end: 30, label: "email", score: 0.88 },
    ];
    expect(mapSpans(spans)).toEqual([
      { text: "Sarah Connor", label: "person", score: 0.97, start: 0, end: 12 },
      { text: "sarah@x.io", label: "email", score: 0.88, start: 20, end: 30 },
    ]);
  });

  it("returns an empty array for no spans", () => {
    expect(mapSpans([])).toEqual([]);
  });
});
```

- [ ] **Step 3 : Lancer le test, vérifier l'échec**

Run: `pnpm exec vitest run src/lib/gliner.test.ts`
Expected: FAIL (`./gliner` introuvable / `mapSpans` non exporté).

- [ ] **Step 4 : Implémenter `src/lib/gliner.ts`**

```ts
import type { Entity } from "./ner";

export type GlinerModelId =
  | "onnx-community/gliner_small-v2.1"
  | "onnx-community/gliner_multi_pii-v1";

/** Raw span returned by the `gliner` package inference. */
export type RawSpan = {
  spanText: string;
  start: number;
  end: number;
  label: string;
  score: number;
};

/** Map the package's spans onto our shared Entity shape. GLiNER already gives
 *  character offsets, so there is no WordPiece reconstruction to do. */
export function mapSpans(spans: RawSpan[]): Entity[] {
  return spans.map((s) => ({
    text: s.spanText,
    label: s.label,
    score: s.score,
    start: s.start,
    end: s.end,
  }));
}

const MODEL_URL = (id: GlinerModelId) =>
  `https://huggingface.co/${id}/resolve/main/onnx/model_quantized.onnx`;

// onnxruntime-web build matching the `gliner` package dependency (1.19.2).
const WASM_CDN = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/";

// One cached Gliner instance per model id.
const instances = new Map<GlinerModelId, Promise<unknown>>();

/** Use WebGPU only when an adapter is actually available; otherwise WASM. */
async function pickProvider(): Promise<"webgpu" | "wasm"> {
  const gpu =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
      : undefined;
  if (!gpu) return "wasm";
  try {
    const adapter = await gpu.requestAdapter();
    return adapter ? "webgpu" : "wasm";
  } catch {
    return "wasm";
  }
}

async function getGliner(model: GlinerModelId) {
  const existing = instances.get(model);
  if (existing) return existing;

  const created = (async () => {
    const { Gliner } = await import("gliner");
    const executionProvider = await pickProvider();
    const g = new Gliner({
      tokenizerPath: model,
      onnxSettings: {
        modelPath: MODEL_URL(model),
        executionProvider,
        wasmPaths: WASM_CDN,
        multiThread: false,
        fetchBinary: true,
      },
      transformersSettings: { allowLocalModels: false, useBrowserCache: true },
      maxWidth: 12,
      modelType: "gliner",
    });
    await g.initialize();
    return g;
  })();

  // Evict on failure so a later Retry re-downloads instead of replaying a
  // cached rejection forever (same policy as ner.ts).
  created.catch(() => instances.delete(model));
  instances.set(model, created);
  return created;
}

/** Pre-load a GLiNER model (download + init). Safe to call repeatedly. */
export async function loadGliner(model: GlinerModelId): Promise<void> {
  await getGliner(model);
}

type GlinerInstance = {
  inference(args: {
    texts: string[];
    entities: string[];
    threshold?: number;
    flatNer?: boolean;
    multiLabel?: boolean;
  }): Promise<RawSpan[][]>;
};

/** Run zero-shot NER for the given labels and return grouped entities.
 *  A low query threshold is used so the playground's live threshold slider can
 *  filter results upward without re-running the model. */
export async function runGliner(
  model: GlinerModelId,
  labels: string[],
  text: string,
): Promise<Entity[]> {
  const g = (await getGliner(model)) as GlinerInstance;
  const out = await g.inference({
    texts: [text],
    entities: labels,
    threshold: 0.1,
    flatNer: false,
    multiLabel: false,
  });
  return mapSpans(out[0] ?? []);
}
```

- [ ] **Step 5 : Lancer le test, vérifier le succès**

Run: `pnpm exec vitest run src/lib/gliner.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6 : Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 7 : Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/gliner.ts src/lib/gliner.test.ts
git commit -m "feat(playground): GLiNER browser backend (gliner.ts)"
```

---

## Task 2 : Spike de vérification navigateur

Objectif : confirmer **avant l'UI** que `gliner_small-v2.1` se charge depuis le CDN HF + WASM CDN et renvoie des entités dans un vrai navigateur, sans hébergement local. Si ça échoue, on revoit le runtime avant d'investir dans l'UI.

**Files:**
- Modifier temporairement : `src/components/playground/ner-playground.tsx` (un bouton de test jetable)

- [ ] **Step 1 : Ajouter un déclencheur temporaire**

Dans `NerPlayground`, juste après la `<Button>` « Analyser » existante, ajouter un bouton de spike :

```tsx
{/* SPIKE TEMPORAIRE - à retirer */}
<Button
  variant="outline"
  className="w-full"
  onClick={async () => {
    const { runGliner } = await import("@/lib/gliner");
    const r = await runGliner(
      "onnx-community/gliner_small-v2.1",
      ["person", "location", "organization"],
      "Sarah Connor works at Cyberdyne Systems in Los Angeles.",
    );
    console.log("SPIKE gliner result:", r);
  }}
>
  SPIKE
</Button>
```

- [ ] **Step 2 : Démarrer le serveur de dev**

Run: `pnpm dev` (en arrière-plan)
Expected: « Ready » sur http://localhost:3000

- [ ] **Step 3 : Vérifier dans le navigateur**

Ouvrir http://localhost:3000/playground/, ouvrir la console, cliquer « SPIKE ». Patienter le téléchargement (~183 Mo au premier coup).
Expected (console) : `SPIKE gliner result:` suivi d'un tableau d'entités, p.ex. `{ text: "Sarah Connor", label: "person", ... }`, `{ text: "Cyberdyne Systems", label: "organization", ... }`, `{ text: "Los Angeles", label: "location", ... }`. Aucune erreur réseau/WASM bloquante.

> Si échec : noter l'erreur (CORS sur le modelPath, WASM threadé, condition d'export du bundle). Pistes : garder `multiThread: false` ; vérifier que le bundler résout bien le build web de `gliner` ; au besoin essayer `executionProvider: "wasm"` en dur. Ne pas continuer tant que le spike ne passe pas.

- [ ] **Step 4 : Retirer le déclencheur temporaire**

Supprimer le bloc « SPIKE TEMPORAIRE » ajouté au Step 1.

- [ ] **Step 5 : Vérifier qu'il ne reste rien**

Run: `git diff src/components/playground/ner-playground.tsx`
Expected: aucune sortie (fichier revenu à l'état committé).

Pas de commit (spike jetable).

---

## Task 3 : `parseLabels` (`src/lib/labels.ts`)

**Files:**
- Créer : `src/lib/labels.ts`
- Test : `src/lib/labels.test.ts`

- [ ] **Step 1 : Écrire le test (échoue)**

Créer `src/lib/labels.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { parseLabels } from "./labels";

describe("parseLabels", () => {
  it("splits on commas and trims", () => {
    expect(parseLabels("person, email , phone")).toEqual(["person", "email", "phone"]);
  });

  it("drops empty segments", () => {
    expect(parseLabels("person,,  , email,")).toEqual(["person", "email"]);
  });

  it("deduplicates case-insensitively, keeping first spelling", () => {
    expect(parseLabels("Person, person, PERSON, email")).toEqual(["Person", "email"]);
  });

  it("returns an empty array for blank input", () => {
    expect(parseLabels("   ")).toEqual([]);
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `pnpm exec vitest run src/lib/labels.test.ts`
Expected: FAIL (`./labels` introuvable).

- [ ] **Step 3 : Implémenter `parseLabels`**

Créer `src/lib/labels.ts` :

```ts
/** Parse a comma-separated labels field into a clean list: trimmed, no empties,
 *  deduplicated case-insensitively (first spelling wins). */
export function parseLabels(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(",")) {
    const label = raw.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `pnpm exec vitest run src/lib/labels.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/lib/labels.ts src/lib/labels.test.ts
git commit -m "feat(playground): parseLabels helper for zero-shot labels"
```

---

## Task 4 : `hashLabelColor` + repli des couleurs

**Files:**
- Modifier : `src/lib/labels.ts`
- Modifier : `src/lib/labels.test.ts`
- Modifier : `src/components/playground/entity-highlight.tsx`

- [ ] **Step 1 : Ajouter le test de `hashLabelColor` (échoue)**

Ajouter à `src/lib/labels.test.ts` :

```ts
import { hashLabelColor, LABEL_PALETTE } from "./labels";

describe("hashLabelColor", () => {
  it("is deterministic for the same label", () => {
    expect(hashLabelColor("email")).toBe(hashLabelColor("email"));
  });

  it("returns a class string from the palette", () => {
    expect(LABEL_PALETTE).toContain(hashLabelColor("phone number"));
  });

  it("maps different labels to (generally) different buckets", () => {
    const colors = new Set(["email", "person", "iban", "address"].map(hashLabelColor));
    expect(colors.size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `pnpm exec vitest run src/lib/labels.test.ts`
Expected: FAIL (`hashLabelColor` / `LABEL_PALETTE` non exportés).

- [ ] **Step 3 : Implémenter dans `src/lib/labels.ts`**

Ajouter :

```ts
/** Stable Tailwind (bg + text) classes for arbitrary, user-defined labels. */
export const LABEL_PALETTE = [
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  "bg-lime-500/15 text-lime-700 dark:text-lime-300",
] as const;

/** Deterministic color for a label name (djb2-style hash into the palette). */
export function hashLabelColor(label: string): string {
  let h = 0;
  for (let i = 0; i < label.length; i++) {
    h = (h * 31 + label.charCodeAt(i)) | 0;
  }
  return LABEL_PALETTE[Math.abs(h) % LABEL_PALETTE.length];
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `pnpm exec vitest run src/lib/labels.test.ts`
Expected: PASS (7 tests au total).

- [ ] **Step 5 : Brancher le repli dans `entity-highlight.tsx`**

Dans `src/components/playground/entity-highlight.tsx`, remplacer l'implémentation de `labelStyle` pour retomber sur le hash au lieu du gris unique :

Remplacer :

```ts
import { toSegments, type Entity } from "@/lib/ner";
```

par :

```ts
import { toSegments, type Entity } from "@/lib/ner";
import { hashLabelColor } from "@/lib/labels";
```

Et remplacer :

```ts
export function labelStyle(label: string): string {
  return LABEL_STYLES[label] ?? "bg-muted text-foreground";
}
```

par :

```ts
export function labelStyle(label: string): string {
  return LABEL_STYLES[label] ?? hashLabelColor(label);
}
```

- [ ] **Step 6 : Typecheck + tests**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: tsc OK ; tous les tests passent.

- [ ] **Step 7 : Commit**

```bash
git add src/lib/labels.ts src/lib/labels.test.ts src/components/playground/entity-highlight.tsx
git commit -m "feat(playground): deterministic colors for arbitrary labels"
```

---

## Task 5 : Clés i18n

**Files:**
- Modifier : `src/i18n/types.ts:107-133` (bloc `playground`)
- Modifier : `src/i18n/en.ts` (bloc `playground`)
- Modifier : `src/i18n/fr.ts` (bloc `playground`)

- [ ] **Step 1 : Étendre le type `playground` dans `types.ts`**

Dans `src/i18n/types.ts`, dans `playground`, après `models: { multilingual: string; english: string };` remplacer par :

```ts
    models: {
      multilingual: string;
      english: string;
      glinerSmall: string;
      glinerPii: string;
    };
    modelGroups: { classic: string; gliner: string };
    glinerLabelsLabel: string;
    glinerLabelsPlaceholder: string;
    glinerLabelsHint: string;
```

(les autres champs du bloc `playground` restent inchangés.)

- [ ] **Step 2 : Renseigner `en.ts`**

Dans `src/i18n/en.ts`, remplacer le bloc `models: { multilingual, english }` du playground par :

```ts
    models: {
      multilingual: "Multilingual (EN, FR, ...)",
      english: "English only",
      glinerSmall: "Zero-shot, general purpose (~183 MB)",
      glinerPii: "Zero-shot, PII-tuned, multilingual (~349 MB)",
    },
    modelGroups: { classic: "Classic NER", gliner: "GLiNER (zero-shot)" },
    glinerLabelsLabel: "Types to detect",
    glinerLabelsPlaceholder: "person, email, phone number, address",
    glinerLabelsHint: "Comma-separated. Re-run the analysis to apply new types.",
```

- [ ] **Step 3 : Renseigner `fr.ts`**

Dans `src/i18n/fr.ts`, remplacer le bloc `models: { multilingual, english }` du playground par :

```ts
    models: {
      multilingual: "Multilingue (EN, FR, ...)",
      english: "Anglais uniquement",
      glinerSmall: "Zero-shot, généraliste (~183 Mo)",
      glinerPii: "Zero-shot, spécialisé PII, multilingue (~349 Mo)",
    },
    modelGroups: { classic: "NER classique", gliner: "GLiNER (zero-shot)" },
    glinerLabelsLabel: "Types à détecter",
    glinerLabelsPlaceholder: "person, email, phone number, address",
    glinerLabelsHint: "Séparés par des virgules. Relancez l'analyse pour appliquer.",
```

- [ ] **Step 4 : Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur (les deux dictionnaires satisfont `Dictionary`).

- [ ] **Step 5 : Commit**

```bash
git add src/i18n/types.ts src/i18n/en.ts src/i18n/fr.ts
git commit -m "i18n(playground): keys for GLiNER models and zero-shot labels"
```

---

## Task 6 : Registre de modèles + sélecteur groupé

**Files:**
- Modifier : `src/components/playground/ner-playground.tsx`

- [ ] **Step 1 : Remplacer le tableau `MODELS` par un registre avec famille**

En haut de `ner-playground.tsx`, remplacer :

```ts
import { loadNer, runNer, type Entity, type ModelId, type ProgressEvent } from "@/lib/ner";
```

par :

```ts
import { loadNer, runNer, type Entity, type ModelId, type ProgressEvent } from "@/lib/ner";
import { loadGliner, runGliner, type GlinerModelId } from "@/lib/gliner";
import { parseLabels } from "@/lib/labels";
```

Puis remplacer :

```ts
const MODELS: { id: ModelId; key: "multilingual" | "english" }[] = [
  { id: "Xenova/bert-base-multilingual-cased-ner-hrl", key: "multilingual" },
  { id: "Xenova/bert-base-NER", key: "english" },
];
```

par :

```ts
type ModelEntry = {
  id: ModelId | GlinerModelId;
  family: "classic" | "gliner";
  descKey: "multilingual" | "english" | "glinerSmall" | "glinerPii";
  defaultLabels?: string;
};

const MODELS: ModelEntry[] = [
  { id: "Xenova/bert-base-multilingual-cased-ner-hrl", family: "classic", descKey: "multilingual" },
  { id: "Xenova/bert-base-NER", family: "classic", descKey: "english" },
  {
    id: "onnx-community/gliner_small-v2.1",
    family: "gliner",
    descKey: "glinerSmall",
    defaultLabels: "person, organization, location, date",
  },
  {
    id: "onnx-community/gliner_multi_pii-v1",
    family: "gliner",
    descKey: "glinerPii",
    defaultLabels: "person, email, phone number, address, organization",
  },
];
```

- [ ] **Step 2 : Élargir le type du state `model`**

Remplacer :

```ts
  const [model, setModel] = useState<ModelId>(MODELS[0].id);
```

par :

```ts
  const [model, setModel] = useState<ModelId | GlinerModelId>(MODELS[0].id);
```

Et remplacer :

```ts
  const selectedModel = MODELS.find((m) => m.id === model) ?? MODELS[0];
```

par :

```ts
  const selectedModel = MODELS.find((m) => m.id === model) ?? MODELS[0];
  const isGliner = selectedModel.family === "gliner";
```

- [ ] **Step 3 : Grouper le `<select>` par `<optgroup>`**

Dans le rendu, remplacer le contenu du `<select>` :

```tsx
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id}
                  </option>
                ))}
```

par :

```tsx
                <optgroup label={pg.modelGroups.classic}>
                  {MODELS.filter((m) => m.family === "classic").map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={pg.modelGroups.gliner}>
                  {MODELS.filter((m) => m.family === "gliner").map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id}
                    </option>
                  ))}
                </optgroup>
```

Et remplacer le cast du `onChange` du select :

```tsx
                onChange={(e) => setModel(e.target.value as ModelId)}
```

par :

```tsx
                onChange={(e) => setModel(e.target.value as ModelId | GlinerModelId)}
```

Et la description sous le select :

```tsx
              <p className="text-xs text-muted-foreground">{pg.models[selectedModel.key]}</p>
```

par :

```tsx
              <p className="text-xs text-muted-foreground">{pg.models[selectedModel.descKey]}</p>
```

- [ ] **Step 4 : Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur. (Le sélecteur affiche désormais 2 groupes ; les 4 modèles apparaissent.)

- [ ] **Step 5 : Commit**

```bash
git add src/components/playground/ner-playground.tsx
git commit -m "feat(playground): grouped model selector with GLiNER family"
```

---

## Task 7 : Section labels adaptative + aiguillage `analyze()`

**Files:**
- Modifier : `src/components/playground/ner-playground.tsx`

- [ ] **Step 1 : Ajouter l'état des labels GLiNER, initialisé depuis le modèle**

Après la déclaration du state `allowed`, ajouter :

```ts
  const [glinerLabels, setGlinerLabels] = useState(
    MODELS.find((m) => m.id === model)?.defaultLabels ?? "",
  );
```

Et, pour repré-remplir le champ quand on change de modèle GLiNER, ajouter juste après `selectedModel`/`isGliner` une fonction de changement de modèle, puis l'utiliser dans le `onChange` du select.

Remplacer :

```tsx
                onChange={(e) => setModel(e.target.value as ModelId | GlinerModelId)}
```

par :

```tsx
                onChange={(e) => {
                  const next = e.target.value as ModelId | GlinerModelId;
                  setModel(next);
                  const entry = MODELS.find((m) => m.id === next);
                  if (entry?.defaultLabels) setGlinerLabels(entry.defaultLabels);
                }}
```

- [ ] **Step 2 : Rendre la section labels conditionnelle**

Remplacer tout le bloc actuel des cases à cocher :

```tsx
            <div className="space-y-2">
              <p className="text-sm font-medium">{pg.labelsLabel}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {LABELS.map((l) => (
                  <label key={l} className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={allowed[l] !== false}
                      onChange={(e) => setAllowed((prev) => ({ ...prev, [l]: e.target.checked }))}
                    />
                    <LabelTag label={l} />
                  </label>
                ))}
              </div>
            </div>
```

par :

```tsx
            {isGliner ? (
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="gliner-labels">
                  {pg.glinerLabelsLabel}
                </label>
                <textarea
                  id="gliner-labels"
                  className="min-h-20 w-full resize-none rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs"
                  value={glinerLabels}
                  disabled={busy}
                  placeholder={pg.glinerLabelsPlaceholder}
                  onChange={(e) => setGlinerLabels(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{pg.glinerLabelsHint}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium">{pg.labelsLabel}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {LABELS.map((l) => (
                    <label key={l} className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={allowed[l] !== false}
                        onChange={(e) => setAllowed((prev) => ({ ...prev, [l]: e.target.checked }))}
                      />
                      <LabelTag label={l} />
                    </label>
                  ))}
                </div>
              </div>
            )}
```

- [ ] **Step 3 : Aiguiller `analyze()` selon la famille**

Remplacer le corps de `analyze()` :

```ts
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
      setAllEntities(result);
      setAnalyzed(text);
      setStatus("done");
    } catch (err) {
      console.error("NER playground failed", err);
      setStatus("error");
    }
  }
```

par :

```ts
  async function analyze() {
    try {
      setStatus("loading");
      setProgress(0);
      let result: Entity[];
      if (selectedModel.family === "gliner") {
        const gid = model as GlinerModelId;
        await loadGliner(gid);
        setStatus("analyzing");
        result = await runGliner(gid, parseLabels(glinerLabels), text);
      } else {
        const cid = model as ModelId;
        await loadNer(cid, (e: ProgressEvent) => {
          if (e.status === "progress" && typeof e.progress === "number") {
            setProgress(Math.round(e.progress));
          }
        });
        setStatus("analyzing");
        result = await runNer(cid, text);
      }
      setAllEntities(result);
      setAnalyzed(text);
      setStatus("done");
    } catch (err) {
      console.error("NER playground failed", err);
      setStatus("error");
    }
  }
```

- [ ] **Step 4 : Désactiver « Analyser » si pas de labels en mode GLiNER**

Remplacer :

```tsx
              disabled={busy || text.trim().length === 0}
```

par :

```tsx
              disabled={
                busy ||
                text.trim().length === 0 ||
                (isGliner && parseLabels(glinerLabels).length === 0)
              }
```

- [ ] **Step 5 : Typecheck + tests**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: tsc OK ; tous les tests passent (aucune régression sur `ner.test.ts`).

- [ ] **Step 6 : Lint**

Run: `pnpm lint`
Expected: 0 erreur introduite par ces fichiers (l'avertissement préexistant `set-state-in-effect` dans `language-provider.tsx` peut rester).

- [ ] **Step 7 : Commit**

```bash
git add src/components/playground/ner-playground.tsx
git commit -m "feat(playground): zero-shot labels field and analyze dispatch"
```

---

## Task 8 : Vérification navigateur de bout en bout

**Files:** aucune modification de code (vérification).

- [ ] **Step 1 : Démarrer le serveur de dev**

Run: `pnpm dev` (arrière-plan)
Expected: « Ready ».

- [ ] **Step 2 : Vérifier le NER classique (non-régression)**

Ouvrir http://localhost:3000/playground/, modèle « English only », « Analyser ».
Expected: surlignage en place + liste d'entités, dont un `MISC` (American/German) ; les cases PER/ORG/LOC/MISC et le seuil filtrent en direct.

- [ ] **Step 3 : Vérifier GLiNER généraliste**

Choisir `onnx-community/gliner_small-v2.1`. Le champ « Types à détecter » se pré-remplit (`person, organization, location, date`). « Analyser », patienter le téléchargement.
Expected: entités surlignées avec couleurs par label ; modifier les labels (ex. ajouter `date`), relancer, la sortie change ; le seuil filtre en direct.

- [ ] **Step 4 : Vérifier GLiNER PII**

Choisir `onnx-community/gliner_multi_pii-v1`, labels par défaut PII, sur un texte contenant un email et un téléphone. « Analyser ».
Expected: `email`, `phone number`, `person`, etc. détectés et colorés.

- [ ] **Step 5 : Build statique**

Run: `pnpm build`
Expected: build OK, export statique généré (le code GLiNER est dans un chunk séparé, importé dynamiquement).

- [ ] **Step 6 : Mettre à jour la roadmap**

Dans `docs/ROADMAP.md`, ajouter sous « État actuel » une ligne indiquant que GLiNER (zero-shot, labels libres) est intégré au playground avec deux modèles (`gliner_small-v2.1`, `gliner_multi_pii-v1`), runtime via le package `gliner` code-splitté, sans hébergement.

- [ ] **Step 7 : Commit final**

```bash
git add docs/ROADMAP.md
git commit -m "docs: GLiNER zero-shot integrated into the playground"
```

---

## Notes d'implémentation

- **Pas de barre de progression pour GLiNER** : le package ne remonte pas la progression de téléchargement comme `progress_callback` de transformers.js. Le bouton affiche « Téléchargement du modèle… » sans pourcentage en mode GLiNER. C'est acceptable (YAGNI).
- **Seuil** : `runGliner` interroge le modèle avec un seuil bas (0.1) ; le slider du playground filtre les entités a posteriori, en direct, comme pour le classique.
- **Filtre par cases** : en mode GLiNER, `allowed` ne gate pas les labels libres (`allowed[label]` vaut `undefined` → `!== false` → conservé), donc aucune logique spéciale n'est nécessaire dans le `useMemo` `entities`.
- **`multiThread: false`** délibéré : évite SharedArrayBuffer et donc l'exigence d'en-têtes COOP/COEP, incompatibles avec un export statique servi simplement.
```
