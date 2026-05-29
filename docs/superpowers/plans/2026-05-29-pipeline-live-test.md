# Test live de la pipeline (approximation) — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sous les blocs de `/config`, exécuter toute la pipeline sur un texte en direct (approximation JS) et afficher le surlignage des détections + le texte anonymisé.

**Architecture:** Un module pur `src/lib/run-pipeline.ts` (résolution des chevauchements, regroupement, attribution des jetons, texte anonymisé) + un wrapper async qui lance les détecteurs navigateur. Un panneau de test ajouté à `config-builder.tsx`. C'est une approximation assumée (le vrai moteur vit dans la lib Python).

**Tech Stack:** TypeScript, React 19, Vitest. Réutilise `runDetector`, le type `Entity`, `EntityHighlight`, `assignLabelColors`.

---

## Structure des fichiers

- **Créer** `src/lib/run-pipeline.ts` — `hashValue`, `assignToken`, `createTokenContext`, `resolveSpans`, `assemblePipeline`, `runPipeline`.
- **Créer** `src/lib/run-pipeline.test.ts`.
- **Modifier** `src/i18n/{types,en,fr}.ts` — clés du panneau de test.
- **Modifier** `src/components/playground/config-builder.tsx` — panneau de test sous les blocs.

Types réutilisés : `Entity` (`{ text, label, score, start, end }`) de `@/lib/ner`, `ConfigPipeline` / `Placeholder` de `@/lib/detector-config`.

---

## Task 1 : jetons (hashValue + assignToken)

**Files:**
- Créer : `src/lib/run-pipeline.ts`
- Test : `src/lib/run-pipeline.test.ts`

- [ ] **Step 1 : test (échoue)**

Créer `src/lib/run-pipeline.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { hashValue, assignToken, createTokenContext } from "./run-pipeline";

describe("hashValue", () => {
  it("is deterministic and respects the length", () => {
    expect(hashValue("Marie", 8)).toBe(hashValue("Marie", 8));
    expect(hashValue("Marie", 8)).toHaveLength(8);
    expect(hashValue("Marie", 16)).toHaveLength(16);
  });
});

describe("assignToken", () => {
  it("label_counter increments per label", () => {
    const ctx = createTokenContext();
    expect(assignToken({ type: "label_counter" }, "PER", "Marie", ctx)).toBe("<<PER:1>>");
    expect(assignToken({ type: "label_counter" }, "PER", "Jean", ctx)).toBe("<<PER:2>>");
    expect(assignToken({ type: "label_counter" }, "LOC", "Lyon", ctx)).toBe("<<LOC:1>>");
  });

  it("redact_counter increments globally and hides the label", () => {
    const ctx = createTokenContext();
    expect(assignToken({ type: "redact_counter" }, "PER", "Marie", ctx)).toBe("<<REDACT:1>>");
    expect(assignToken({ type: "redact_counter" }, "LOC", "Lyon", ctx)).toBe("<<REDACT:2>>");
  });

  it("label and redact are constant", () => {
    const ctx = createTokenContext();
    expect(assignToken({ type: "label" }, "PER", "Marie", ctx)).toBe("<<PER>>");
    expect(assignToken({ type: "redact" }, "PER", "Marie", ctx)).toBe("<<REDACT>>");
  });

  it("mask keeps the first char and masks the rest", () => {
    const ctx = createTokenContext();
    expect(assignToken({ type: "mask", maskChar: "*" }, "PER", "Marie", ctx)).toBe("M****");
  });

  it("hash styles use a hash of the value", () => {
    const ctx = createTokenContext();
    const tok = assignToken({ type: "label_hash", hashLength: 8 }, "PER", "Marie", ctx);
    expect(tok).toBe(`<<PER:${hashValue("Marie", 8)}>>`);
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `pnpm exec vitest run src/lib/run-pipeline.test.ts`
Expected: FAIL (module manquant).

- [ ] **Step 3 : implémenter le début de `src/lib/run-pipeline.ts`**

```ts
import type { Entity } from "./ner";
import type { ConfigPipeline, Placeholder } from "./detector-config";
import { runDetector } from "./detector-config";

/** Short deterministic hex hash (FNV-1a based). Approximate: NOT the lib's
 *  canonical SHA-256, just enough to make hash tokens look real and stable. */
export function hashValue(value: string, length: number): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let out = "";
  while (out.length < length) {
    out += (h >>> 0).toString(16).padStart(8, "0");
    h = Math.imul(h ^ (h >>> 13), 16777619) >>> 0;
  }
  return out.slice(0, length);
}

/** Mutable counters for token assignment within one pipeline run. */
export type TokenContext = { labelCounters: Map<string, number>; global: { n: number } };

export function createTokenContext(): TokenContext {
  return { labelCounters: new Map(), global: { n: 0 } };
}

/** Produce the placeholder token for one entity, per the chosen style. */
export function assignToken(
  placeholder: Placeholder,
  label: string,
  value: string,
  ctx: TokenContext,
): string {
  switch (placeholder.type) {
    case "label_counter": {
      const n = (ctx.labelCounters.get(label) ?? 0) + 1;
      ctx.labelCounters.set(label, n);
      return `<<${label}:${n}>>`;
    }
    case "label_hash":
      return `<<${label}:${hashValue(value, placeholder.hashLength)}>>`;
    case "label":
      return `<<${label}>>`;
    case "mask":
      return value.slice(0, 1) + placeholder.maskChar.repeat(Math.max(0, value.length - 1));
    case "redact_counter":
      ctx.global.n += 1;
      return `<<REDACT:${ctx.global.n}>>`;
    case "redact_hash":
      return `<<REDACT:${hashValue(value, placeholder.hashLength)}>>`;
    case "redact":
      return "<<REDACT>>";
  }
}
```

- [ ] **Step 4 : lancer, vérifier le succès**

Run: `pnpm exec vitest run src/lib/run-pipeline.test.ts`
Expected: PASS (les tests hashValue + assignToken).

- [ ] **Step 5 : commit**

```bash
git add src/lib/run-pipeline.ts src/lib/run-pipeline.test.ts
git commit -m "feat(config): token assignment for the live pipeline preview"
```

---

## Task 2 : résolution des spans + assemblage

**Files:**
- Modifier : `src/lib/run-pipeline.ts`
- Modifier : `src/lib/run-pipeline.test.ts`

- [ ] **Step 1 : ajouter les tests (échouent)**

D'abord, au TOP de `src/lib/run-pipeline.test.ts`, étendre l'import existant et
ajouter deux imports (les imports doivent rester en tête de fichier) :

```ts
import { hashValue, assignToken, createTokenContext, assemblePipeline } from "./run-pipeline";
import { defaultPipeline, type ConfigPipeline } from "./detector-config";
import type { Entity } from "./ner";
```
(remplace la ligne d'import existante `import { hashValue, assignToken, createTokenContext } from "./run-pipeline";` par la première ligne ci-dessus, et ajoute les deux autres juste après le `import ... from "vitest";`.)

Puis ajouter à la FIN du fichier :

```ts
const e = (text: string, label: string, start: number, score = 1): Entity => ({
  text,
  label,
  score,
  start,
  end: start + text.length,
});

describe("assemblePipeline", () => {
  const base: ConfigPipeline = { ...defaultPipeline(), name: "t" };
  const text = "Marie called Marie and Lyon";

  it("links repeats of the same value to the same token (label_counter)", () => {
    const out = assemblePipeline([e("Marie", "PER", 0), e("Marie", "PER", 13), e("Lyon", "LOC", 23)], base, text);
    expect(out.anonymized).toBe("<<PER:1>> called <<PER:1>> and <<LOC:1>>");
  });

  it("gives each occurrence its own token when linking and resolving are disabled", () => {
    const cfg = { ...base, entityLinker: "disabled" as const, entityResolver: "disabled" as const };
    const out = assemblePipeline([e("Marie", "PER", 0), e("Marie", "PER", 13)], cfg, text);
    expect(out.anonymized).toBe("<<PER:1>> called <<PER:2>> and Lyon");
  });

  it("groups case variants when the resolver is fuzzy", () => {
    const cfg = { ...base, entityResolver: "fuzzy" as const };
    const out = assemblePipeline([e("Marie", "PER", 0), e("marie", "PER", 13)], cfg, text);
    expect(out.anonymized).toBe("<<PER:1>> called <<PER:1>> and Lyon");
  });

  it("drops the lower-scoring span when two overlap", () => {
    const overlap = "Cyberdyne Systems";
    const dets = [e("Cyberdyne", "ORG", 0, 0.6), e("Cyberdyne Systems", "ORG", 0, 0.9)];
    const out = assemblePipeline(dets, { ...base, name: "o" }, overlap);
    expect(out.entities).toHaveLength(1);
    expect(out.entities[0].text).toBe("Cyberdyne Systems");
  });

  it("keeps overlaps when the span resolver is disabled", () => {
    const dets = [e("ab", "X", 0, 0.6), e("abc", "X", 0, 0.9)];
    const out = assemblePipeline(dets, { ...base, spanResolver: "disabled" as const }, "abc");
    expect(out.entities).toHaveLength(2);
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `pnpm exec vitest run src/lib/run-pipeline.test.ts`
Expected: FAIL (`assemblePipeline` manquant).

- [ ] **Step 3 : ajouter à `src/lib/run-pipeline.ts`**

```ts
/** Keep non-overlapping spans, preferring higher score; disabled keeps all. */
function resolveSpans(entities: Entity[], mode: ConfigPipeline["spanResolver"]): Entity[] {
  if (mode === "disabled") {
    return [...entities].sort((a, b) => a.start - b.start);
  }
  const byScore = [...entities].sort((a, b) => b.score - a.score);
  const kept: Entity[] = [];
  for (const cand of byScore) {
    const overlaps = kept.some((k) => cand.start < k.end && k.start < cand.end);
    if (!overlaps) kept.push(cand);
  }
  return kept.sort((a, b) => a.start - b.start);
}

/** Apply the non-detector pipeline stages (approximate) to a set of detections:
 *  resolve overlaps, group entities that should share a placeholder, then build
 *  the anonymized text. Returns the kept entities (for highlighting) and the
 *  anonymized text. */
export function assemblePipeline(
  detections: Entity[],
  pipeline: ConfigPipeline,
  text: string,
): { entities: Entity[]; anonymized: string } {
  const kept = resolveSpans(detections, pipeline.spanResolver);
  const grouping = !(pipeline.entityLinker === "disabled" && pipeline.entityResolver === "disabled");
  const norm = (v: string) => (pipeline.entityResolver === "fuzzy" ? v.toLowerCase().trim() : v);

  const ctx = createTokenContext();
  const groupToken = new Map<string, string>();
  const tokenFor = (entity: Entity, index: number): string => {
    const key = grouping ? `${entity.label} ${norm(entity.text)}` : `i:${index}`;
    let token = groupToken.get(key);
    if (token === undefined) {
      token = assignToken(pipeline.placeholder, entity.label, entity.text, ctx);
      groupToken.set(key, token);
    }
    return token;
  };

  let cursor = 0;
  let anonymized = "";
  kept.forEach((entity, index) => {
    if (entity.start < cursor) return; // overlap leftover (only when resolver disabled)
    anonymized += text.slice(cursor, entity.start) + tokenFor(entity, index);
    cursor = entity.end;
  });
  anonymized += text.slice(cursor);

  return { entities: kept, anonymized };
}
```

- [ ] **Step 4 : lancer, vérifier le succès**

Run: `pnpm exec vitest run src/lib/run-pipeline.test.ts`
Expected: PASS (tous).

- [ ] **Step 5 : commit**

```bash
git add src/lib/run-pipeline.ts src/lib/run-pipeline.test.ts
git commit -m "feat(config): span resolution and anonymized-text assembly"
```

---

## Task 3 : wrapper async `runPipeline`

**Files:**
- Modifier : `src/lib/run-pipeline.ts`

- [ ] **Step 1 : ajouter `runPipeline`**

Ajouter à la fin de `src/lib/run-pipeline.ts` :

```ts
/** Run the whole pipeline in the browser: every ENABLED detector runs (filtered
 *  by its own threshold), then the stages are applied. The llm detector is
 *  skipped (it does not run in the browser). */
export async function runPipeline(
  pipeline: ConfigPipeline,
  text: string,
): Promise<{ entities: Entity[]; anonymized: string }> {
  const detections: Entity[] = [];
  for (const d of pipeline.detectors) {
    if (!d.enabled || d.config.type === "llm") continue;
    const result = await runDetector(d.config, text);
    const threshold =
      d.config.type === "transformers" || d.config.type === "gliner2" ? d.config.threshold : 0;
    for (const entity of result) {
      if (entity.score >= threshold) detections.push(entity);
    }
  }
  return assemblePipeline(detections, pipeline, text);
}
```

- [ ] **Step 2 : typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3 : commit**

```bash
git add src/lib/run-pipeline.ts
git commit -m "feat(config): runPipeline browser wrapper (detect then assemble)"
```

---

## Task 4 : clés i18n du panneau de test

**Files:**
- Modifier : `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/fr.ts`

- [ ] **Step 1 : types.ts**

Dans le bloc `playground` de `src/i18n/types.ts`, après `anonymizerHelp: string;`, ajouter :

```ts
    liveTestTitle: string;
    anonymizedLabel: string;
    approximationNote: string;
    noEnabledDetectors: string;
```

- [ ] **Step 2 : en.ts**

Dans `playground` de `src/i18n/en.ts`, après `anonymizerHelp: "...",`, ajouter :

```ts
    liveTestTitle: "Live test (preview)",
    anonymizedLabel: "Anonymized text",
    approximationNote: "Browser approximation. The real piighost engine may differ on edge cases.",
    noEnabledDetectors: "Enable at least one detector to test the pipeline.",
```

- [ ] **Step 3 : fr.ts**

Dans `playground` de `src/i18n/fr.ts`, après `anonymizerHelp: "...",`, ajouter :

```ts
    liveTestTitle: "Test live (prévisualisation)",
    anonymizedLabel: "Texte anonymisé",
    approximationNote: "Approximation navigateur. Le vrai moteur piighost peut différer sur les cas limites.",
    noEnabledDetectors: "Activez au moins un détecteur pour tester la pipeline.",
```

- [ ] **Step 4 : typecheck + commit**

Run: `pnpm exec tsc --noEmit` (Expected: aucune erreur)

```bash
git add src/i18n/types.ts src/i18n/en.ts src/i18n/fr.ts
git commit -m "i18n(config): keys for the live pipeline test panel"
```

---

## Task 5 : panneau de test sous les blocs

**Files:**
- Modifier : `src/components/playground/config-builder.tsx`

- [ ] **Step 1 : imports + état**

En tête de `config-builder.tsx`, ajouter aux imports existants :

```tsx
import { EntityHighlight } from "@/components/playground/entity-highlight";
import { assignLabelColors, labelStyle } from "@/lib/labels";
import { runPipeline } from "@/lib/run-pipeline";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import type { Entity } from "@/lib/ner";
```
(Si `useState`/`useEffect` sont déjà importés depuis `react`, ajoute `useMemo` à cet import existant plutôt qu'une seconde ligne.)

Dans le composant `ConfigBuilder`, après les états existants, ajouter :

```tsx
  const [testText, setTestText] = useState(pg.example);
  const [testStatus, setTestStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [testEntities, setTestEntities] = useState<Entity[]>([]);
  const [testAnonymized, setTestAnonymized] = useState("");
  const [testAnalyzed, setTestAnalyzed] = useState("");
  const testColors = useMemo(() => assignLabelColors(testEntities.map((e) => e.label)), [testEntities]);
  const hasEnabledDetector = pipeline.detectors.some((d) => d.enabled && d.config.type !== "llm");
```

- [ ] **Step 2 : handler de test**

Dans `ConfigBuilder`, ajouter la fonction (près de `downloadToml`) :

```tsx
  async function runTest() {
    try {
      setTestStatus("running");
      const result = await runPipeline(pipeline, testText);
      setTestEntities(result.entities);
      setTestAnonymized(result.anonymized);
      setTestAnalyzed(testText);
      setTestStatus("done");
    } catch (err) {
      console.error("pipeline test failed", err);
      setTestStatus("error");
    }
  }
```

- [ ] **Step 3 : restructurer le layout pour faire de la place au panneau**

Dans le rendu, la rangée de blocs est actuellement `<div className="flex flex-1 items-center justify-center overflow-x-auto">`. La remplacer par (les blocs ne prennent plus tout l'espace ; le panneau de test occupe le bas) :

```tsx
      <div className="flex shrink-0 items-center justify-center overflow-x-auto pb-2">
```
(le contenu interne `<div className="flex items-stretch gap-2">...</div>` reste identique.)

- [ ] **Step 4 : ajouter le panneau de test**

Juste APRÈS la `</div>` qui ferme la rangée de blocs (et AVANT le bloc `{/* Actions */}`), insérer :

```tsx
      {/* Live pipeline test (browser approximation) */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <section className="flex min-h-0 flex-col rounded-xl border bg-card p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {pg.liveTestTitle}
            </h2>
            <span className="text-xs text-muted-foreground">{pg.approximationNote}</span>
          </div>
          <textarea
            className="min-h-32 w-full flex-1 resize-none rounded-lg border bg-background p-3 text-sm"
            value={testText}
            disabled={testStatus === "running"}
            onChange={(e) => setTestText(e.target.value)}
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              onClick={runTest}
              disabled={testStatus === "running" || !hasEnabledDetector || testText.trim().length === 0}
            >
              {testStatus === "running" && <Loader2 className="mr-2 size-4 animate-spin" />}
              {pg.test}
            </Button>
            {!hasEnabledDetector && (
              <span className="text-xs text-muted-foreground">{pg.noEnabledDetectors}</span>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col gap-3 overflow-auto rounded-xl border bg-card p-3 shadow-sm">
          {testStatus === "error" ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">{pg.errorTitle}</p>
              <Button variant="outline" size="sm" onClick={runTest}>{pg.retry}</Button>
            </div>
          ) : testStatus !== "done" ? (
            <p className="text-sm text-muted-foreground">{pg.emptyHint}</p>
          ) : (
            <>
              <div className="rounded-lg border bg-background p-3 text-sm">
                <EntityHighlight text={testAnalyzed} entities={testEntities} colors={testColors} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {pg.anonymizedLabel}
                </p>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 font-mono text-xs">
                  {testAnonymized}
                </pre>
              </div>
              {testEntities.length === 0 ? (
                <p className="text-sm text-muted-foreground">{pg.noEntities}</p>
              ) : (
                <ul className="space-y-2">
                  {testEntities.map((e, i) => (
                    <li
                      key={`${e.start}-${i}`}
                      className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-medium ${testColors.get(e.label) ?? labelStyle(e.label)}`}
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

- [ ] **Step 5 : typecheck + lint + tests**

Run: `pnpm exec tsc --noEmit && pnpm test && pnpm lint`
Expected : tsc OK ; tous les tests passent ; lint montre seulement l'erreur préexistante `react-hooks/set-state-in-effect` de `language-provider.tsx` (aucune nouvelle).

- [ ] **Step 6 : commit**

```bash
git add src/components/playground/config-builder.tsx
git commit -m "feat(config): live pipeline test panel under the blocks"
```

---

## Task 6 : vérification navigateur + build + roadmap

**Files:** aucune (sauf ROADMAP).

- [ ] **Step 1 : démarrer le serveur** — Run: `pnpm dev` (arrière-plan). Expected : « Ready ».

- [ ] **Step 2 : préparer un détecteur**

Ouvrir `http://localhost:3000/playground/`, type « Regex » (motif EMAIL par défaut), nommer « emails », « Sauvegarder ».

- [ ] **Step 3 : tester la pipeline**

Ouvrir `http://localhost:3000/config/`, « Ajouter depuis les sauvegardés » → « emails ». Dans le panneau de test en bas, saisir un texte avec deux fois le même email, « Tester ».
Expected : les emails surlignés dans la sortie ; la liste d'entités ; le **texte anonymisé** où les deux occurrences identiques portent le même jeton (ex. `<<EMAIL:1>>`). La mention « approximation » est visible.

- [ ] **Step 4 : styles de jeton**

Changer le style d'anonymizer (ex. `mask`, `redact`) puis re-tester : le texte anonymisé reflète le style. Mettre Entity linker + Entity resolver sur `disabled` → deux occurrences identiques obtiennent des jetons distincts (`:1`, `:2`).

- [ ] **Step 5 : sans détecteur**

Retirer tous les détecteurs → le bouton « Tester » est désactivé et le message « Activez au moins un détecteur » s'affiche.

- [ ] **Step 6 : build statique**

Run: `pnpm build`
Expected : build OK, `/config` généré.

- [ ] **Step 7 : roadmap**

Dans `docs/ROADMAP.md`, compléter l'entrée Phase 2 : `/config` propose un test live de la pipeline en approximation navigateur (détection réelle + résolution/regroupement/anonymisation réimplémentés en JS), sans backend ; le test fidèle (avec ML) reste pour la phase 4. Lien spec/plan.

- [ ] **Step 8 : commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: live pipeline test (browser approximation) delivered"
```

---

## Notes d'implémentation

- **Approximation assumée** : `resolveSpans`/regroupement/`assignToken` ne sont pas le moteur Python ; l'UI l'affiche (`approximationNote`). Le `hashValue` n'est pas le SHA canonique de la lib.
- **Seuils** : chaque détecteur filtre par le seuil de sa propre config (transformers/gliner2) ; regex = score 1.
- **Chevauchements** : `spanResolver` activé retire les chevauchements (meilleur score) ; désactivé les garde, et la reconstruction du texte saute les spans résiduels qui chevauchent (pas de jeton dupliqué).
- **Réutilisation** : `runDetector`, `EntityHighlight`, `assignLabelColors`, `labelStyle`, le type `Entity`.
