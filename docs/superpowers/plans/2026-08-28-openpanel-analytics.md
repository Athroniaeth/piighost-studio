# OpenPanel Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un suivi analytics client-only via une instance OpenPanel auto-hébergée, avec pages vues automatiques et 4 événements outils métadonnées-seulement, sans jamais envoyer de texte utilisateur.

**Architecture:** Export statique Next.js → suivi 100 % navigateur avec `@openpanel/nextjs`. Un composant `Analytics` monté dans `layout.tsx` charge le SDK et suit les pages vues ; un wrapper typé `src/lib/analytics.ts` (`useTrack`) centralise les événements outils et garantit par le typage qu'aucune donnée libre ne fuit. Le suivi est désactivé si `NEXT_PUBLIC_OPENPANEL_CLIENT_ID` est absent.

**Tech Stack:** Next.js 16 (App Router, `output: "export"`), React 19, `@openpanel/nextjs`, Vitest + Testing Library, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-28-openpanel-analytics-design.md`

---

## Fichiers créés / modifiés

- Créer : `src/components/analytics/openpanel.tsx` — monte `OpenPanelComponent` (client), no-op sans clientId.
- Créer : `src/lib/analytics.ts` — types d'événements fermés + hook `useTrack`.
- Créer : `src/lib/analytics.test.ts` — test du wrapper.
- Créer : `.env.example` — documente les variables d'env (committé).
- Modifier : `.gitignore` — exception `!.env.example`.
- Modifier : `src/app/layout.tsx` — monter `<Analytics />`.
- Modifier : `src/components/copy-button.tsx` — prop optionnelle `onCopy`.
- Modifier : `src/components/copy-button.test.tsx` — test de `onCopy`.
- Modifier : `src/components/playground/detector-playground.tsx` — events `detector_run`, `detector_saved`.
- Modifier : `src/components/playground/config-builder.tsx` — events `pipeline_run`, `pipeline_exported`.

---

## Task 1: Installer le SDK et l'échafaudage d'environnement

**Files:**
- Modify: `package.json` (via pnpm add)
- Create: `.env.example`
- Modify: `.gitignore`
- Create: `.env` (local, non committé — pour test manuel)

- [ ] **Step 1: Installer le package**

Run:
```bash
pnpm add @openpanel/nextjs
```
Expected: `@openpanel/nextjs` ajouté aux `dependencies` de `package.json`, lockfile mis à jour.

- [ ] **Step 2: Ajouter l'exception `.gitignore`**

Le `.gitignore` ignore `.env*` (ligne existante `.env*`). Ajouter juste après cette ligne :

```gitignore
!.env.example
```

- [ ] **Step 3: Créer `.env.example`**

Créer `.env.example` :

```bash
# OpenPanel analytics (auto-hébergé).
# Sans NEXT_PUBLIC_OPENPANEL_CLIENT_ID, aucun suivi n'est activé (dev/local par défaut).
# clientId public (inliné dans le bundle client) — récupéré dans le dashboard OpenPanel.
NEXT_PUBLIC_OPENPANEL_CLIENT_ID=
# URL de l'API OpenPanel auto-hébergée (sans slash final). Défaut si absent : https://opapi.athroniaeth.cloud
NEXT_PUBLIC_OPENPANEL_API_URL=https://opapi.athroniaeth.cloud
```

- [ ] **Step 4: Créer `.env` local pour le test manuel (non committé)**

Créer `.env` (ignoré par git) :

```bash
NEXT_PUBLIC_OPENPANEL_CLIENT_ID=66c9779d-9dfb-433c-acda-13ec88907038
NEXT_PUBLIC_OPENPANEL_API_URL=https://opapi.athroniaeth.cloud
```

- [ ] **Step 5: Vérifier que `.env` est bien ignoré et `.env.example` bien suivi**

Run:
```bash
git status --porcelain | grep -E "\.env"
```
Expected: `.env.example` et `.gitignore` apparaissent (modifiés/ajoutés), mais **pas** `.env`.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml .gitignore .env.example
git commit -m "chore(analytics): add @openpanel/nextjs and env scaffolding"
```

---

## Task 2: Wrapper d'événements typé `src/lib/analytics.ts` (TDD)

**Files:**
- Create: `src/lib/analytics.ts`
- Test: `src/lib/analytics.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/lib/analytics.test.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const trackMock = vi.fn();
vi.mock("@openpanel/nextjs", () => ({
  useOpenPanel: () => ({ track: trackMock }),
}));

import { useTrack } from "./analytics";

describe("useTrack", () => {
  beforeEach(() => {
    trackMock.mockReset();
  });

  it("délègue le nom et les props de l'événement au SDK", () => {
    const { result } = renderHook(() => useTrack());
    result.current({
      name: "detector_run",
      props: { detectorType: "regex", entityCount: 3, durationMs: 12 },
    });
    expect(trackMock).toHaveBeenCalledWith("detector_run", {
      detectorType: "regex",
      entityCount: 3,
      durationMs: 12,
    });
  });

  it("ne jette pas si le SDK track échoue (OpenPanel non initialisé)", () => {
    trackMock.mockImplementation(() => {
      throw new Error("not initialized");
    });
    const { result } = renderHook(() => useTrack());
    expect(() =>
      result.current({ name: "detector_saved", props: { detectorType: "gliner2" } }),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run:
```bash
pnpm exec vitest run src/lib/analytics.test.ts
```
Expected: FAIL — `Cannot find module './analytics'` (le fichier n'existe pas encore).

- [ ] **Step 3: Écrire l'implémentation minimale**

Créer `src/lib/analytics.ts` :

```ts
"use client";

import { useCallback } from "react";
import { useOpenPanel } from "@openpanel/nextjs";

/**
 * Ensemble FERMÉ des événements analytics autorisés. Ne contient que des
 * métadonnées non identifiantes — jamais de texte saisi, d'entité détectée ni
 * de contenu de span. C'est le garde-fou vie privée : impossible d'envoyer une
 * clé non prévue sans modifier ce type.
 */
export type AnalyticsEvent =
  | {
      name: "detector_run";
      props: { detectorType: string; entityCount: number; durationMs: number; modelId?: string };
    }
  | { name: "detector_saved"; props: { detectorType: string } }
  | { name: "pipeline_run"; props: { detectorCount: number; entityCount: number } }
  | { name: "pipeline_exported"; props: { format: "toml" | "python"; detectorCount: number } };

/**
 * Hook renvoyant une fonction de suivi typée. Si OpenPanel n'est pas initialisé
 * (pas de clientId → composant non monté), l'appel est un no-op silencieux.
 */
export function useTrack() {
  const op = useOpenPanel();
  return useCallback(
    (event: AnalyticsEvent) => {
      try {
        op.track(event.name, event.props);
      } catch {
        // OpenPanel non initialisé : ne pas casser l'app.
      }
    },
    [op],
  );
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run:
```bash
pnpm exec vitest run src/lib/analytics.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics.ts src/lib/analytics.test.ts
git commit -m "feat(analytics): typed useTrack wrapper for OpenPanel events"
```

---

## Task 3: Composant de montage `Analytics` + intégration au layout

**Files:**
- Create: `src/components/analytics/openpanel.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Créer le composant `Analytics`**

Créer `src/components/analytics/openpanel.tsx` :

```tsx
"use client";

import { OpenPanelComponent } from "@openpanel/nextjs";

const DEFAULT_API_URL = "https://opapi.athroniaeth.cloud";

/**
 * Monte le SDK OpenPanel côté navigateur. Retourne null si le clientId est
 * absent (dev/local par défaut) : aucun script chargé, aucun suivi.
 */
export function Analytics() {
  const clientId = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;
  if (!clientId) return null;

  const apiUrl = process.env.NEXT_PUBLIC_OPENPANEL_API_URL ?? DEFAULT_API_URL;

  return (
    <OpenPanelComponent
      apiUrl={apiUrl}
      scriptUrl={`${apiUrl}/op1.js`}
      clientId={clientId}
      trackScreenViews
      trackOutgoingLinks
    />
  );
}
```

- [ ] **Step 2: Monter `<Analytics />` dans `layout.tsx`**

Dans `src/app/layout.tsx`, ajouter l'import en haut avec les autres imports de composants :

```tsx
import { Analytics } from "@/components/analytics/openpanel";
```

Puis, dans le `<body>`, placer `<Analytics />` juste après l'ouverture du `<body>` et avant `<ThemeProvider>` :

```tsx
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Analytics />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
```

- [ ] **Step 3: Vérifier le lint et le typage**

Run:
```bash
pnpm lint
```
Expected: aucune erreur liée aux fichiers modifiés.

- [ ] **Step 4: Vérifier que le build statique réussit**

Run:
```bash
pnpm build
```
Expected: build OK, export dans `./out`, aucune erreur de prérendu (le composant est client et no-op sans env au build par défaut).

- [ ] **Step 5: Commit**

```bash
git add src/components/analytics/openpanel.tsx src/app/layout.tsx
git commit -m "feat(analytics): mount OpenPanel component in root layout"
```

---

## Task 4: Instrumenter le banc de test détecteur

**Files:**
- Modify: `src/components/playground/detector-playground.tsx`

Contexte : la fonction `test()` (autour de la ligne 110) exécute un détecteur ; après `runDetector`, `result` est la liste d'entités et `durationMs` est mesuré. La fonction `save()` (autour de la ligne 141) sauvegarde le détecteur courant. `config` est le `DetectorConfig` courant (`config.type` ∈ regex/transformers/gliner2/llm ; `config.model` existe sauf pour regex).

- [ ] **Step 1: Importer le hook**

En haut de `src/components/playground/detector-playground.tsx`, ajouter avec les autres imports `@/lib` :

```tsx
import { useTrack } from "@/lib/analytics";
```

- [ ] **Step 2: Instancier le hook dans le composant**

Juste après la ligne qui récupère le dictionnaire i18n (au début du composant, à côté des autres hooks `useState`), ajouter :

```tsx
  const track = useTrack();
```

- [ ] **Step 3: Émettre `detector_run` après une exécution réussie**

Dans `test()`, juste après `setStatus("done");` (la ligne qui clôt le bloc `try` de succès), ajouter :

```tsx
      track({
        name: "detector_run",
        props: {
          detectorType: config.type,
          entityCount: result.length,
          durationMs: Math.round(performance.now() - started),
          modelId: "model" in config ? config.model : undefined,
        },
      });
```

Note : `started` et `result` sont déjà en portée dans `test()` (déclarés avant l'appel `runDetector`). `config.model` est un identifiant de modèle public (ex. `Xenova/bert-base-NER`), pas une PII.

- [ ] **Step 4: Émettre `detector_saved` après sauvegarde**

Dans `save()`, juste après `setSaved(saveDetector(trimmed, config));`, ajouter :

```tsx
    track({ name: "detector_saved", props: { detectorType: config.type } });
```

- [ ] **Step 5: Vérifier lint + typage**

Run:
```bash
pnpm lint
```
Expected: aucune erreur. (Le typage force `detectorType`/`entityCount`/`durationMs` corrects.)

- [ ] **Step 6: Vérifier que les tests existants passent**

Run:
```bash
pnpm test
```
Expected: PASS (aucune régression).

- [ ] **Step 7: Commit**

```bash
git add src/components/playground/detector-playground.tsx
git commit -m "feat(analytics): track detector_run and detector_saved events"
```

---

## Task 5: Instrumenter le pipeline builder + `CopyButton` (TDD pour onCopy)

**Files:**
- Modify: `src/components/copy-button.tsx`
- Modify: `src/components/copy-button.test.tsx`
- Modify: `src/components/playground/config-builder.tsx`

### 5a — Ajouter une prop optionnelle `onCopy` à `CopyButton`

Contexte : `CopyButton({ value })` copie `value` dans le presse-papier. On ajoute un rappel optionnel appelé après une copie réussie, pour permettre le suivi de l'export « python » (copie) sans casser les usages existants (`code-block.tsx` ne le passe pas).

- [ ] **Step 1: Écrire le test qui échoue**

Dans `src/components/copy-button.test.tsx`, ajouter un test (adapter les imports déjà présents en haut du fichier : `render`, `screen`, `userEvent`) :

```tsx
it("appelle onCopy après une copie réussie", async () => {
  const onCopy = vi.fn();
  const user = userEvent.setup();
  render(<CopyButton value="hello" onCopy={onCopy} />);
  await user.click(screen.getByRole("button", { name: /copy/i }));
  expect(onCopy).toHaveBeenCalledTimes(1);
});
```

Si `vi`, `userEvent` ou `screen` ne sont pas déjà importés dans le fichier, ajouter en haut :

```tsx
import { vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run:
```bash
pnpm exec vitest run src/components/copy-button.test.tsx
```
Expected: FAIL — `onCopy` n'est pas appelé (prop inexistante).

- [ ] **Step 3: Implémenter `onCopy`**

Dans `src/components/copy-button.tsx`, modifier la signature et le handler :

```tsx
export function CopyButton({ value, onCopy }: { value: string; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Copy"
      onClick={handleCopy}
      className="absolute right-2 top-2 size-7"
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </Button>
  );
}
```

(La fonction interne `onCopy` d'origine est renommée `handleCopy` pour éviter la collision avec la prop.)

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run:
```bash
pnpm exec vitest run src/components/copy-button.test.tsx
```
Expected: PASS (test existant + nouveau).

### 5b — Émettre `pipeline_run` et `pipeline_exported`

Contexte : dans `config-builder.tsx`, `runTest()` (~ligne 177) exécute le pipeline (`result.entities` = entités, `pipeline.detectors.length` = nb détecteurs). `downloadToml()` (~ligne 167) télécharge le TOML. `ExportBox({ code })` (~ligne 85) affiche le code avec un `CopyButton`. La modale d'export (~ligne 594) a un onglet `exportTab` (`"toml" | "python"`).

- [ ] **Step 5: Importer et instancier le hook**

En haut de `src/components/playground/config-builder.tsx`, ajouter avec les autres imports `@/lib` :

```tsx
import { useTrack } from "@/lib/analytics";
```

Au début du composant `ConfigBuilder`, à côté des autres hooks, ajouter :

```tsx
  const track = useTrack();
```

- [ ] **Step 6: Émettre `pipeline_run` après une exécution réussie**

Dans `runTest()`, juste après `setTestStatus("done");`, ajouter :

```tsx
      track({
        name: "pipeline_run",
        props: { detectorCount: pipeline.detectors.length, entityCount: result.entities.length },
      });
```

- [ ] **Step 7: Émettre `pipeline_exported` au téléchargement TOML**

Dans `downloadToml()`, juste après `URL.revokeObjectURL(url);`, ajouter :

```tsx
    track({
      name: "pipeline_exported",
      props: { format: "toml", detectorCount: pipeline.detectors.length },
    });
```

- [ ] **Step 8: Émettre `pipeline_exported` à la copie (couvre python et toml)**

`ExportBox` doit propager un rappel de copie. Modifier la signature de `ExportBox` (~ligne 85) :

```tsx
function ExportBox({ code, onCopy }: { code: string; onCopy?: () => void }) {
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-muted/30">
      <CopyButton value={code} onCopy={onCopy} />
      <pre className="overflow-x-auto p-4 font-mono text-xs">{code}</pre>
    </div>
  );
}
```

Puis, dans la modale d'export (~ligne 616), passer le rappel qui suit le format actif :

```tsx
            <ExportBox
              code={exportTab === "toml" ? toToml(pipeline) : toPython(pipeline)}
              onCopy={() =>
                track({
                  name: "pipeline_exported",
                  props: { format: exportTab, detectorCount: pipeline.detectors.length },
                })
              }
            />
```

- [ ] **Step 9: Vérifier lint + tous les tests**

Run:
```bash
pnpm lint && pnpm test
```
Expected: PASS, aucune régression.

- [ ] **Step 10: Commit**

```bash
git add src/components/copy-button.tsx src/components/copy-button.test.tsx src/components/playground/config-builder.tsx
git commit -m "feat(analytics): track pipeline_run and pipeline_exported events"
```

---

## Task 6: Vérification finale (build + suite complète)

**Files:** aucun (vérification).

- [ ] **Step 1: Suite de tests complète**

Run:
```bash
pnpm test
```
Expected: tous les tests PASS.

- [ ] **Step 2: Lint**

Run:
```bash
pnpm lint
```
Expected: aucune erreur.

- [ ] **Step 3: Build statique**

Run:
```bash
pnpm build
```
Expected: build OK, export `./out` généré sans erreur.

- [ ] **Step 4: Test manuel (avec clientId)**

1. Vérifier que `.env` contient `NEXT_PUBLIC_OPENPANEL_CLIENT_ID`.
2. `pnpm dev`, ouvrir `http://localhost:3000`.
3. Ouvrir les DevTools → onglet Network, filtrer `opapi.athroniaeth.cloud`.
4. Vérifier que `op1.js` se charge (200) et qu'une requête d'event part au chargement (page vue).
5. Aller sur `/playground`, exécuter un détecteur → vérifier une requête d'event `detector_run`.
6. Dans le dashboard OpenPanel (`https://opdashboard.athroniaeth.cloud:3000`), confirmer que les events apparaissent en temps réel.

Note : si les requêtes échouent en CORS, c'est que l'origine `http://localhost:3000` n'est pas encore autorisée côté client OpenPanel (voir les instructions de livraison).

- [ ] **Step 5: Commit final éventuel**

Rien à committer si les étapes 1-3 ne modifient aucun fichier. Sinon, committer les corrections.

---

## Self-review (fait à l'écriture)

- **Couverture spec :** montage composant (Task 3), wrapper typé + garde-fou vie privée (Task 2), config env + `.env.example` + exception gitignore (Task 1), 4 événements (Tasks 4-5), tests unitaires + build + manuel (Tasks 2, 5, 6). Mode sans cookie/bannière = comportement par défaut d'OpenPanel, rien à coder. ✓
- **Placeholders :** aucun — chaque étape contient le code réel. ✓
- **Cohérence des types :** `useTrack` renvoie `(event: AnalyticsEvent) => void` ; tous les appels `track({ name, props })` correspondent aux variantes de l'union. `CopyButton` prop `onCopy?: () => void` cohérente entre implémentation, test et `ExportBox`. ✓
