# Refonte des playgrounds (« Two-Up ») — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner aux deux pages playground (`/playground/detector` et `/playground`) une grammaire visuelle/interaction unique en extrayant 6 composants partagés, puis en réécrivant les deux pages dessus, sans perdre aucune fonctionnalité.

**Architecture:** D'abord créer 6 petits composants présentationnels partagés sous `src/components/playground/` (TDD, Vitest + Testing Library). Ensuite refactorer `detector-playground.tsx` puis `config-builder.tsx` pour consommer ces composants, unifier la grille (`0.95/1.9/1.05`), consolider toutes les notes de statut dans `RunStatus`, et donner à la pipeline le `LoadingPane` qu'elle n'avait pas. Aucune logique d'inférence, de couleurs ou d'i18n n'est modifiée.

**Tech Stack:** Next.js 16 (export statique), React client components, shadcn/ui base-ui (`<Button render>`), Tailwind v4, lucide-react, Vitest + Testing Library + jsdom.

**Spec:** `docs/superpowers/specs/2026-06-06-playground-redesign-design.md` (à lire pour le contexte produit).

**Contraintes invariantes (rappel) :** export statique, `<Button>` base-ui jamais `asChild`, jamais de taille de police px arbitraire (utiliser rem/échelle), copie via i18n (zéro nouvelle clé), pas d'em-dash/accents FR corrects, périmètre = uniquement ces fichiers + composants partagés du playground.

**Baseline lint connue (hors périmètre) :** `src/i18n/language-provider.tsx:28` a une erreur `react-hooks/set-state-in-effect` préexistante ; ne pas la corriger, ne pas s'en alarmer.

---

## Structure de fichiers

À créer :
- `src/components/playground/step-chip.tsx` — chip d'étape numéroté (ordinal ou coche)
- `src/components/playground/entity-row.tsx` — ligne d'entité (label coloré + texte + score)
- `src/components/playground/field-label.tsx` — label de champ + aide `?` optionnelle ; exporte aussi `STAGE_SELECT`
- `src/components/playground/region.tsx` — primitive de colonne (titre + chip + action + corps)
- `src/components/playground/loading-pane.tsx` — panneau de chargement centré (barre déterminée ou pulse)
- `src/components/playground/run-status.tsx` — ligne de statut canonique unique
- Tests co-localisés `*.test.tsx` pour chacun.

À modifier :
- `src/components/playground/detector-playground.tsx` — consomme les composants partagés ; supprime son `Region` local
- `src/components/playground/config-builder.tsx` — consomme les composants partagés ; supprime ses `FieldLabel`/`STAGE_SELECT` locaux

Inchangés : `entity-highlight.tsx`, `preset-list.tsx`, `sample-text-picker.tsx`, `label-mapping-editor.tsx`, `playground-tabs.tsx`, toute la couche `src/lib/*`, l'i18n.

---

### Task 1 : StepChip

**Files:**
- Create: `src/components/playground/step-chip.tsx`
- Test: `src/components/playground/step-chip.test.tsx`

- [ ] **Step 1 : Écrire le test qui échoue**

```tsx
// src/components/playground/step-chip.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StepChip } from "./step-chip";

describe("StepChip", () => {
  it("shows the ordinal number when not done", () => {
    render(<StepChip n={2} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("replaces the number with a check icon when done", () => {
    const { container } = render(<StepChip n={2} done />);
    expect(screen.queryByText("2")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier l'échec**

Run: `pnpm exec vitest run src/components/playground/step-chip.test.tsx`
Expected: FAIL (`Failed to resolve import "./step-chip"`).

- [ ] **Step 3 : Implémenter le composant**

```tsx
// src/components/playground/step-chip.tsx
import { Check } from "lucide-react";

/** Numbered step glyph used in Region headers; swaps to a check when done. */
export function StepChip({ n, done = false }: { n: number; done?: boolean }) {
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-xs font-semibold tabular-nums text-primary">
      {done ? <Check className="size-3" /> : n}
    </span>
  );
}
```

- [ ] **Step 4 : Lancer le test pour vérifier le succès**

Run: `pnpm exec vitest run src/components/playground/step-chip.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/components/playground/step-chip.tsx src/components/playground/step-chip.test.tsx
git commit -m "feat(playground): shared StepChip component

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2 : EntityRow

**Files:**
- Create: `src/components/playground/entity-row.tsx`
- Test: `src/components/playground/entity-row.test.tsx`

- [ ] **Step 1 : Écrire le test qui échoue**

```tsx
// src/components/playground/entity-row.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EntityRow } from "./entity-row";

describe("EntityRow", () => {
  it("renders the label, the surface text, and a rounded percentage score", () => {
    render(
      <ul>
        <EntityRow label="PERSON" text="Marie Curie" score={0.873} colors={new Map()} />
      </ul>,
    );
    expect(screen.getByText("PERSON")).toBeInTheDocument();
    expect(screen.getByText("Marie Curie")).toBeInTheDocument();
    expect(screen.getByText("87%")).toBeInTheDocument();
  });

  it("uses a provided color class for the label when present", () => {
    render(
      <ul>
        <EntityRow
          label="LOC"
          text="Paris"
          score={0.5}
          colors={new Map([["LOC", "bg-rose-500"]])}
        />
      </ul>,
    );
    expect(screen.getByText("LOC")).toHaveClass("bg-rose-500");
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier l'échec**

Run: `pnpm exec vitest run src/components/playground/entity-row.test.tsx`
Expected: FAIL (import non résolu).

- [ ] **Step 3 : Implémenter le composant**

```tsx
// src/components/playground/entity-row.tsx
import { labelStyle } from "@/lib/labels";

/** One detected entity: colored label + monospace surface text + score. */
export function EntityRow({
  label,
  text,
  score,
  colors,
}: {
  label: string;
  text: string;
  score: number;
  colors: Map<string, string>;
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2">
      <div className="flex items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-medium ${colors.get(label) ?? labelStyle(label)}`}
        >
          {label}
        </span>
        <span className="whitespace-nowrap font-mono text-sm">{text}</span>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {(score * 100).toFixed(0)}%
      </span>
    </li>
  );
}
```

- [ ] **Step 4 : Lancer le test pour vérifier le succès**

Run: `pnpm exec vitest run src/components/playground/entity-row.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/components/playground/entity-row.tsx src/components/playground/entity-row.test.tsx
git commit -m "feat(playground): shared EntityRow component

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3 : FieldLabel (+ STAGE_SELECT)

**Files:**
- Create: `src/components/playground/field-label.tsx`
- Test: `src/components/playground/field-label.test.tsx`

- [ ] **Step 1 : Écrire le test qui échoue**

```tsx
// src/components/playground/field-label.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FieldLabel, STAGE_SELECT } from "./field-label";

describe("FieldLabel", () => {
  it("renders the label text", () => {
    render(<FieldLabel label="Span resolver" />);
    expect(screen.getByText("Span resolver")).toBeInTheDocument();
  });

  it("renders no help affordance when help is omitted", () => {
    render(<FieldLabel label="Span resolver" />);
    expect(screen.queryByText("?")).not.toBeInTheDocument();
  });

  it("renders a help affordance carrying the help text as a title when help is given", () => {
    render(<FieldLabel label="Span resolver" help="How spans are merged" />);
    const help = screen.getByText("?");
    expect(help).toHaveAttribute("title", "How spans are merged");
  });

  it("exports a stage-select class string", () => {
    expect(STAGE_SELECT).toContain("font-mono");
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier l'échec**

Run: `pnpm exec vitest run src/components/playground/field-label.test.tsx`
Expected: FAIL (import non résolu).

- [ ] **Step 3 : Implémenter le composant**

Note : le `text-[10px]` de l'ancien `FieldLabel` (dans `config-builder.tsx`) devient `text-[0.625rem]` pour respecter le zoom de police racine.

```tsx
// src/components/playground/field-label.tsx

/** Shared class for the pipeline-stage <select> controls (monospace). */
export const STAGE_SELECT =
  "w-full rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs";

/** A config-column field label with an optional "?" help tooltip. */
export function FieldLabel({ label, help }: { label: string; help?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {help && (
        <span
          title={help}
          className="inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full border text-[0.625rem] text-muted-foreground"
        >
          ?
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4 : Lancer le test pour vérifier le succès**

Run: `pnpm exec vitest run src/components/playground/field-label.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/components/playground/field-label.tsx src/components/playground/field-label.test.tsx
git commit -m "feat(playground): shared FieldLabel + STAGE_SELECT

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4 : Region

**Files:**
- Create: `src/components/playground/region.tsx`
- Test: `src/components/playground/region.test.tsx`

- [ ] **Step 1 : Écrire le test qui échoue**

```tsx
// src/components/playground/region.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Region } from "./region";

describe("Region", () => {
  it("renders the title and the children", () => {
    render(<Region title="Configure">body content</Region>);
    expect(screen.getByText("Configure")).toBeInTheDocument();
    expect(screen.getByText("body content")).toBeInTheDocument();
  });

  it("renders a step chip when step is provided", () => {
    render(<Region step={1} title="Configure">x</Region>);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders no step chip when step is omitted", () => {
    render(<Region title="Configure">x</Region>);
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("renders the action node", () => {
    render(<Region title="Configure" action={<button>act</button>}>x</Region>);
    expect(screen.getByRole("button", { name: "act" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier l'échec**

Run: `pnpm exec vitest run src/components/playground/region.test.tsx`
Expected: FAIL (import non résolu).

- [ ] **Step 3 : Implémenter le composant**

```tsx
// src/components/playground/region.tsx
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { StepChip } from "./step-chip";

/**
 * One column of the workbench card. Shared by both playground pages so every
 * region has the same header grammar: numbered step chip, uppercase title, an
 * optional action on the right, then a scrollable body.
 */
export function Region({
  step,
  stepDone = false,
  title,
  action,
  bodyClassName,
  children,
}: {
  step?: number;
  stepDone?: boolean;
  title: string;
  action?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-col overflow-auto p-4">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {step != null && <StepChip n={step} done={stepDone} />}
          {title}
        </h2>
        {action}
      </div>
      <div className={cn("flex min-h-0 flex-1 flex-col", bodyClassName)}>{children}</div>
    </section>
  );
}
```

- [ ] **Step 4 : Lancer le test pour vérifier le succès**

Run: `pnpm exec vitest run src/components/playground/region.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/components/playground/region.tsx src/components/playground/region.test.tsx
git commit -m "feat(playground): shared Region primitive

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5 : LoadingPane

**Files:**
- Create: `src/components/playground/loading-pane.tsx`
- Test: `src/components/playground/loading-pane.test.tsx`

- [ ] **Step 1 : Écrire le test qui échoue**

```tsx
// src/components/playground/loading-pane.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LoadingPane } from "./loading-pane";

describe("LoadingPane", () => {
  it("shows the message and the percentage when progress is a number", () => {
    render(<LoadingPane progress={42} message="Loading model" />);
    expect(screen.getByText("Loading model")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("shows no percentage when progress is null (indeterminate)", () => {
    render(<LoadingPane progress={null} message="Loading runtime" />);
    expect(screen.getByText("Loading runtime")).toBeInTheDocument();
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  it("renders an optional note", () => {
    render(<LoadingPane progress={null} message="Loading" note="First load is slow" />);
    expect(screen.getByText("First load is slow")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier l'échec**

Run: `pnpm exec vitest run src/components/playground/loading-pane.test.tsx`
Expected: FAIL (import non résolu).

- [ ] **Step 3 : Implémenter le composant**

```tsx
// src/components/playground/loading-pane.tsx
import { Loader2 } from "lucide-react";

/**
 * Centered model/runtime download pane. Pass a 0-100 number for a determinate
 * bar (transformers download), or null for an indeterminate pulse (GLiNER, or
 * the pipeline runtime warm-up which has no byte total).
 */
export function LoadingPane({
  progress,
  message,
  note,
}: {
  progress: number | null;
  message: string;
  note?: string;
}) {
  return (
    <div className="flex min-h-32 flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-background p-6 text-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
      <p className="text-sm font-medium">{message}</p>
      <div className="h-2 w-64 max-w-full overflow-hidden rounded-full bg-muted">
        {progress === null ? (
          <div className="h-full w-full animate-pulse rounded-full bg-primary/60" />
        ) : (
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        )}
      </div>
      {progress !== null && (
        <p className="text-xs tabular-nums text-muted-foreground">{progress}%</p>
      )}
      {note && <p className="max-w-xs text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
```

- [ ] **Step 4 : Lancer le test pour vérifier le succès**

Run: `pnpm exec vitest run src/components/playground/loading-pane.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/components/playground/loading-pane.tsx src/components/playground/loading-pane.test.tsx
git commit -m "feat(playground): shared LoadingPane component

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6 : RunStatus

**Files:**
- Create: `src/components/playground/run-status.tsx`
- Test: `src/components/playground/run-status.test.tsx`

Le composant lit le dictionnaire `playground` (type `Dictionary["playground"]`). Pour le test, on fabrique un stub partiel typé `as Dictionary["playground"]`.

- [ ] **Step 1 : Écrire le test qui échoue**

```tsx
// src/components/playground/run-status.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RunStatus } from "./run-status";
import type { Dictionary } from "@/i18n/types";

const pg = {
  loadingRuntime: "Loading runtime",
  runtimeDownloading: "Downloading runtime",
  runtimeInstalling: "Installing runtime",
  runtimeReady: "Runtime ready",
  inferenceTime: "Inference time",
  reqPerSecond: "req/s",
  errorTitle: "Something went wrong",
  noEnabledDetectors: "Enable a detector",
  llmDeploymentNote: "LLM runs server-side",
  staleNote: "Result is stale",
  approximationNote: "Approximate preview",
} as unknown as Dictionary["playground"];

describe("RunStatus", () => {
  it("shows the inference metric when a duration is given", () => {
    render(<RunStatus pg={pg} durationMs={200} />);
    expect(screen.getByText(/Inference time:/)).toBeInTheDocument();
  });

  it("shows the runtime download line for the downloading stage", () => {
    render(<RunStatus pg={pg} runtimeStage="downloading" />);
    expect(screen.getByText("Downloading runtime")).toBeInTheDocument();
  });

  it("shows the loading-runtime line and hides the stage line while loading", () => {
    render(<RunStatus pg={pg} loadingRuntime runtimeStage="downloading" />);
    expect(screen.getByText("Loading runtime")).toBeInTheDocument();
    expect(screen.queryByText("Downloading runtime")).not.toBeInTheDocument();
  });

  it("shows the error, stale, no-detectors and approximation notes when flagged", () => {
    render(
      <RunStatus
        pg={pg}
        error
        stale
        noEnabledDetectors
        llm
        approximation
      />,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Result is stale")).toBeInTheDocument();
    expect(screen.getByText("Enable a detector")).toBeInTheDocument();
    expect(screen.getByText("LLM runs server-side")).toBeInTheDocument();
    expect(screen.getByText("Approximate preview")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier l'échec**

Run: `pnpm exec vitest run src/components/playground/run-status.test.tsx`
Expected: FAIL (import non résolu).

- [ ] **Step 3 : Implémenter le composant**

```tsx
// src/components/playground/run-status.tsx
import { Loader2 } from "lucide-react";
import type { Dictionary } from "@/i18n/types";

type RuntimeStage = "downloading" | "installing" | "ready" | null;

/**
 * The single canonical status line both pages render at the end of their
 * CONFIGURE column. It owns every run note in a fixed order so the two pages
 * communicate progress, timing and caveats identically. Render it as a normal
 * shrink-0 flex child (never position:sticky: the column is min-h-0 overflow-auto
 * and a sticky footer clips there).
 */
export function RunStatus({
  pg,
  durationMs = null,
  loadingRuntime = false,
  runtimeStage = null,
  error = false,
  noEnabledDetectors = false,
  llm = false,
  stale = false,
  approximation = false,
}: {
  pg: Dictionary["playground"];
  durationMs?: number | null;
  loadingRuntime?: boolean;
  runtimeStage?: RuntimeStage;
  error?: boolean;
  noEnabledDetectors?: boolean;
  llm?: boolean;
  stale?: boolean;
  approximation?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
      {loadingRuntime && <span>{pg.loadingRuntime}</span>}
      {!loadingRuntime && (runtimeStage === "downloading" || runtimeStage === "installing") && (
        <span className="flex items-center gap-1.5">
          <Loader2 className="size-3 animate-spin" />
          {runtimeStage === "downloading" ? pg.runtimeDownloading : pg.runtimeInstalling}
        </span>
      )}
      {!loadingRuntime && runtimeStage === "ready" && durationMs === null && !error && (
        <span>{pg.runtimeReady}</span>
      )}
      {durationMs !== null && (
        <span>
          {pg.inferenceTime}: {Math.round(durationMs)} ms · ~
          {(1000 / durationMs).toFixed(1)} {pg.reqPerSecond}
        </span>
      )}
      {error && <span className="text-destructive">{pg.errorTitle}</span>}
      {noEnabledDetectors && <span>{pg.noEnabledDetectors}</span>}
      {llm && <span>{pg.llmDeploymentNote}</span>}
      {stale && <span className="text-amber-600">{pg.staleNote}</span>}
      {approximation && <span>{pg.approximationNote}</span>}
    </div>
  );
}
```

- [ ] **Step 4 : Lancer le test pour vérifier le succès**

Run: `pnpm exec vitest run src/components/playground/run-status.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/components/playground/run-status.tsx src/components/playground/run-status.test.tsx
git commit -m "feat(playground): shared RunStatus line

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7 : Refactor detector-playground.tsx

**Files:**
- Modify: `src/components/playground/detector-playground.tsx`

Pas de nouveau test (composant intégrant de l'inférence ML non exécutable en jsdom — comme aujourd'hui). Vérification par `tsc`/`build` à la Task 9. **Lire le fichier en entier avant d'éditer** (les numéros de ligne ci-dessous sont relatifs au HEAD courant et bougeront au fil des edits).

- [ ] **Step 1 : Remplacer les imports et supprimer le `Region` local**

Dans le bloc d'imports en tête, ajouter :

```tsx
import { Region } from "@/components/playground/region";
import { RunStatus } from "@/components/playground/run-status";
import { LoadingPane } from "@/components/playground/loading-pane";
import { EntityRow } from "@/components/playground/entity-row";
import { FieldLabel } from "@/components/playground/field-label";
```

Supprimer la fonction `Region` locale (actuellement lignes ~62-82, du `function Region({` jusqu'à sa `}` de fermeture). Retirer l'import `type ReactNode` de la ligne 3 s'il n'est plus utilisé ailleurs (il ne l'est plus une fois `Region` retiré) : passer `import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";` à `import { useEffect, useMemo, useRef, useState } from "react";`.

- [ ] **Step 2 : Unifier les deux grilles**

Conteneur externe (ligne ~167) : remplacer
`lg:grid-cols-[minmax(0,0.6fr)_minmax(0,3.6fr)]`
par
`lg:grid-cols-[minmax(0,0.6fr)_minmax(0,3.4fr)]`.

Grille de la carte atelier (ligne ~238) : remplacer
`lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.85fr)_minmax(0,1.05fr)]`
par
`lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.9fr)_minmax(0,1.05fr)]`.

- [ ] **Step 3 : Colonne CONFIGURE — numérotation, FieldLabel, RunStatus**

Remplacer `<Region title={pg.configTitle}>` par `<Region step={1} title={pg.configTitle}>`.

Remplacer chacun des `<label className="text-sm font-medium">{...}</label>` des champs (type de détecteur, patterns, modèle ×2, labels ×2) par `<FieldLabel label={...} />`. Concrètement :
- `<label className="text-sm font-medium">{pg.detectorType}</label>` → `<FieldLabel label={pg.detectorType} />`
- `<label className="text-sm font-medium">{pg.patternsLabel}</label>` → `<FieldLabel label={pg.patternsLabel} />`
- les deux `<label className="text-sm font-medium">{pg.modelLabel}</label>` → `<FieldLabel label={pg.modelLabel} />`
- les deux `<label className="text-sm font-medium">{pg.glinerLabelsLabel}</label>` → `<FieldLabel label={pg.glinerLabelsLabel} />`

NE PAS toucher au bloc seuil (`pg.thresholdLabel`) : il garde son `<div className="flex items-center justify-between text-sm">` et son `<input type="range">` reste **sans** `disabled` (actif pendant le calcul).

Envelopper le bouton Test + une nouvelle `RunStatus` dans un conteneur `space-y-2`, en remplaçant le `<Button ...>{pg.test}</Button>` final de la colonne par :

```tsx
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={test}
                disabled={busy || !runnable || text.trim().length === 0}
              >
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                {pg.test}
              </Button>
              <RunStatus
                pg={pg}
                durationMs={status === "done" ? durationMs : null}
                error={status === "error"}
              />
            </div>
```

- [ ] **Step 4 : Colonne TEXT — step + LoadingPane**

Sur la `<Region title={pg.inputLabel} action={...}>` de la colonne texte, ajouter `step={2} stepDone={status === "done"}` :
`<Region step={2} stepDone={status === "done"} title={pg.inputLabel} action={...}>`.

Dans cette région, remplacer toute la branche `status === "running" ? (...)` (le `<div className="flex min-h-48 ...">` avec le `Loader2`, la barre de progression, le `%` et la note — actuellement lignes ~380-398) par :

```tsx
          ) : status === "running" ? (
            <LoadingPane progress={progress} message={pg.loadingModel} note={pg.firstLoadNote} />
```

(Les branches `error`, `done`, et idle/textarea restent inchangées.)

- [ ] **Step 5 : Colonne RESULTS — step, retrait de la métrique, EntityRow**

Sur la `<Region title={pg.resultsTitle}>` des détections, ajouter `step={3} stepDone={status === "done" && entities.length > 0}` :
`<Region step={3} stepDone={status === "done" && entities.length > 0} title={pg.resultsTitle}>`.

Supprimer le bloc de métrique d'inférence en tête de cette région (actuellement lignes ~434-439 : le `{status === "done" && durationMs !== null && (<p ...>{pg.inferenceTime}...</p>)}`) — il vit désormais dans `RunStatus`.

Remplacer le `<li>` du `.map` de la liste d'entités (le `<li key={...} className="flex items-center justify-between ...">...</li>` complet) par :

```tsx
                {sortedEntities.map((e, i) => (
                  <EntityRow
                    key={`${e.start}-${i}`}
                    label={e.label}
                    text={e.text}
                    score={e.score}
                    colors={colors}
                  />
                ))}
```

Vérifier que `labelStyle` n'est plus référencé directement dans ce fichier ; si l'import `labelStyle` de `@/lib/labels` devient inutilisé, le retirer (garder `assignLabelColors`).

- [ ] **Step 6 : Vérifier la compilation du fichier**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur dans `detector-playground.tsx`.

Run: `pnpm exec vitest run src/components/playground/`
Expected: tous les tests des composants partagés + existants PASS.

- [ ] **Step 7 : Commit**

```bash
git add src/components/playground/detector-playground.tsx
git commit -m "refactor(playground): detector bench on shared components

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8 : Refactor config-builder.tsx

**Files:**
- Modify: `src/components/playground/config-builder.tsx`

**Lire le fichier en entier avant d'éditer.** Numéros de ligne relatifs au HEAD courant.

- [ ] **Step 1 : Imports — ajouter les partagés, retirer les locaux**

Ajouter aux imports :

```tsx
import { Region } from "@/components/playground/region";
import { RunStatus } from "@/components/playground/run-status";
import { LoadingPane } from "@/components/playground/loading-pane";
import { EntityRow } from "@/components/playground/entity-row";
import { FieldLabel, STAGE_SELECT } from "@/components/playground/field-label";
```

Supprimer la fonction `FieldLabel` locale (lignes ~57-70) et la constante `const STAGE_SELECT = ...` (ligne ~72). Le `Modal`, `ExportBox`, `tokenExample` restent dans le fichier.

- [ ] **Step 2 : Unifier la grille de la carte atelier**

Grille (ligne ~253) : remplacer
`lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2.2fr)_minmax(0,0.95fr)]`
par
`lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.9fr)_minmax(0,1.05fr)]`.

(La grille externe ligne ~237 est déjà `0.6/3.4` ; ne pas la changer.)

- [ ] **Step 3 : Colonne CONFIGURE — Region + RunStatus consolidée**

Remplacer l'ouverture de la colonne config (le `<section className="flex min-h-0 flex-col gap-4 overflow-auto p-4">` + le `<h2 ...>{pg.configTitle}</h2>` qui suit, lignes ~255-258) par :

```tsx
        <Region step={1} title={pg.configTitle} bodyClassName="gap-4">
```

et remplacer la balise fermante `</section>` correspondante (celle qui ferme la colonne config, ligne ~458) par `</Region>`.

Dans le bloc « Test + status notes » (lignes ~418-457), garder le `<Button>` Test à l'identique, mais remplacer toute la `<div className="flex flex-col gap-1 text-xs text-muted-foreground">...</div>` de notes (lignes ~434-456) par :

```tsx
            <RunStatus
              pg={pg}
              durationMs={testStatus === "done" ? testDurationMs : null}
              loadingRuntime={testStatus === "loading"}
              runtimeStage={runtimeStage === "cold" ? null : runtimeStage}
              error={testStatus === "error"}
              noEnabledDetectors={!hasEnabledDetector}
              llm={hasEnabledLlm}
              stale={testStale}
              approximation
            />
```

- [ ] **Step 4 : Restyler le chip d'exemple de token (continuité marketing)**

Dans le bloc Anonymiseur, le `<code className="rounded bg-muted px-1 py-0.5 font-mono">{tokenExample(ph)}</code>` devient :

```tsx
              <code className="rounded bg-primary/10 px-1 py-0.5 font-mono text-primary">{tokenExample(ph)}</code>
```

- [ ] **Step 5 : Colonne TEXT — Region + pill toggle + LoadingPane + bandeau périmé**

Remplacer l'ouverture de la section texte (le `<section className="flex min-h-0 flex-col p-4">` à la ligne ~463) et son en-tête (`<div className="mb-2 flex shrink-0 items-center justify-between gap-2">...</div>`, lignes ~464-493) par une `Region` dont l'action porte le toggle + le picker :

```tsx
        <Region
          step={2}
          stepDone={testStatus === "done"}
          title={pg.inputLabel}
          action={
            <div className="flex items-center gap-2">
              <div className="flex gap-1 rounded-lg bg-muted/40 p-1">
                {(
                  [
                    ["input", pg.inputLabel],
                    ["anonymized", pg.anonymizedLabel],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setResultView(v)}
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      resultView === v
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <SampleTextPicker
                label={pg.loadSampleText}
                disabled={testStatus === "running" || testStatus === "loading"}
                onPick={(t) => {
                  setTestText(t);
                  setTestStatus("idle");
                  setResultView("input");
                }}
              />
            </div>
          }
        >
          {testStale && (
            <p className="mb-2 shrink-0 text-xs text-amber-600">{pg.staleNote}</p>
          )}
```

Fermer cette `Region` (remplacer le `</section>` qui terminait la section texte, ligne ~553, par `</Region>`).

Dans cette région, remplacer la branche de chargement (le `testStatus === "loading" || testStatus === "running" ? (<div className="flex min-h-32 ...">...</div>)`, lignes ~495-506) par :

```tsx
          {testStatus === "loading" || testStatus === "running" ? (
            <LoadingPane
              progress={null}
              message={
                testStatus === "loading" ||
                runtimeStage === "downloading" ||
                runtimeStage === "installing"
                  ? pg.loadingRuntime
                  : pg.loadingModel
              }
              note={pg.firstLoadNote}
            />
          ) : resultView === "input" ? (
```

(Les branches input/anonymized/textarea/segments en dessous restent inchangées.)

- [ ] **Step 6 : Colonne RESULTS — Region + EntityRow**

Remplacer l'ouverture de la section entités (le `<section className="flex min-h-0 flex-col overflow-auto p-4">` ligne ~556 + son `<h2 className="mb-2 ...">{pg.resultsTitle}</h2>`, lignes ~556-559) par :

```tsx
        <Region step={3} stepDone={testStatus === "done" && testRows.length > 0} title={pg.resultsTitle}>
```

et la `</section>` fermante correspondante (ligne ~586) par `</Region>`.

Remplacer le `<li>` du `.map` de `testRows` (le `<li key={...} className="flex items-center justify-between ...">...</li>`) par :

```tsx
              {testRows.map((e, i) => (
                <EntityRow
                  key={`${e.token}-${i}`}
                  label={e.label}
                  text={e.text}
                  score={e.score}
                  colors={testColors}
                />
              ))}
```

Vérifier si `labelStyle` reste utilisé (oui : le rendu des segments anonymisés `testAnonSegments` l'utilise encore) — garder l'import.

- [ ] **Step 7 : Vérifier la compilation du fichier**

Run: `pnpm exec tsc --noEmit`
Expected: aucune erreur. Note : `runtimeStage` est typé `"cold" | RuntimeStage` (de `piighost-runtime`) ; après le mapping `runtimeStage === "cold" ? null : runtimeStage`, le type résiduel doit correspondre à `"downloading" | "installing" | "ready" | null` attendu par `RunStatus`. Si `tsc` se plaint d'un type incompatible, c'est que `RuntimeStage` contient une variante supplémentaire : aligner le type `RuntimeStage` de `run-status.tsx` ou ajuster le mapping en conséquence (ne PAS modifier `piighost-runtime.ts`).

Run: `pnpm exec vitest run src/components/playground/`
Expected: PASS.

- [ ] **Step 8 : Commit**

```bash
git add src/components/playground/config-builder.tsx
git commit -m "refactor(playground): pipeline builder on shared components

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9 : Vérification complète

**Files:** aucun (vérification).

- [ ] **Step 1 : Suite de tests complète**

Run: `pnpm test`
Expected: PASS, total = 106 (existants) + nouveaux tests des Tasks 1-6 (2+2+4+4+3+4 = 19) = **125 tests**, 0 échec.

- [ ] **Step 2 : Lint**

Run: `pnpm lint`
Expected: pas de NOUVELLE erreur. La seule erreur tolérée est la baseline préexistante `src/i18n/language-provider.tsx:28` (`react-hooks/set-state-in-effect`). Si une autre apparaît, la corriger.

- [ ] **Step 3 : Build statique**

Run: `pnpm build`
Expected: build réussi, export vers `./out` sans erreur de prérendu sur `/playground` et `/playground/detector`.

- [ ] **Step 4 : Vérification visuelle (manuelle, Playwright MCP)**

Lancer le dev server (`pnpm dev`, http://localhost:3000), puis via l'outil Playwright MCP :
1. Naviguer sur `/playground/detector` et `/playground`, en clair et en sombre, FR et EN.
2. Confirmer pour CHAQUE page : les 3 colonnes CONFIGURER | TEXTE | RÉSULTATS, les chips ①②③ dans les en-têtes, le rail bibliothèque pointillé à gauche, la même largeur de rail et la même grille sur les deux pages.
3. Sur le detector : charger un preset, cliquer Test, confirmer le `LoadingPane` (barre %), puis le surlignage + la liste d'entités + la métrique d'inférence dans `RunStatus` (colonne config).
4. Sur la pipeline : charger un preset, cliquer Test, confirmer le `LoadingPane` (pulse), le toggle pill Saisie/Anonymisé, le bandeau périmé après modification, les modales Export (TOML/Python) et Save intactes.
5. Réduire la fenêtre (largeur < `lg`) : confirmer l'empilement rail → CONFIGURER → TEXTE → RÉSULTATS et que la barre Export/Save reste atteignable.

- [ ] **Step 5 : Revue de code finale**

Dispatcher une revue (superpowers:requesting-code-review) sur le diff complet de la branche, puis traiter les retours.

---

## Auto-revue (writing-plans)

**1. Couverture du spec :**
- Coque/rail/carte unifiés → Tasks 7-8 (grilles). ✓
- 6 composants partagés → Tasks 1-6. ✓
- Chip d'étape ①②③ → Task 1 + Tasks 7-8 (`step`/`stepDone`). ✓
- RunStatus consolidée (8 notes pipeline + métrique detector) → Task 6 + Tasks 7-8. ✓
- LoadingPane partagé, pipeline gagne la barre → Task 5 + Tasks 7-8 (`progress={null}`). ✓
- EntityRow partagé → Task 2 + Tasks 7-8. ✓
- FieldLabel promu + `text-[10px]`→`text-[0.625rem]` + STAGE_SELECT → Task 3. ✓
- Toggle pill marketing → Task 8 Step 5. ✓
- Chip token `bg-primary/10` → Task 8 Step 4. ✓
- Grille unique `0.95/1.9/1.05` → Tasks 7-8. ✓
- Modales Export/Save inchangées → non touchées (Task 8 le précise). ✓
- Zéro nouvelle clé i18n → aucun ajout de clé dans le plan. ✓
- Sous-tilités (seuil actif busy, clés remount LabelMappingEditor, `?edit=`, dédup add-from-saved, auto-switch vue) → préservées (Tasks 7-8 ne les touchent pas). ✓

**2. Placeholders :** aucun TBD/TODO ; tout code de step est complet.

**3. Cohérence des types :** `StepChip{n,done}`, `Region{step,stepDone,title,action,bodyClassName,children}`, `EntityRow{label,text,score,colors}`, `FieldLabel{label,help?}` + `STAGE_SELECT`, `LoadingPane{progress,message,note?}`, `RunStatus{pg,durationMs?,loadingRuntime?,runtimeStage?,error?,noEnabledDetectors?,llm?,stale?,approximation?}` — utilisés de façon identique dans les Tasks 7-8. ✓
