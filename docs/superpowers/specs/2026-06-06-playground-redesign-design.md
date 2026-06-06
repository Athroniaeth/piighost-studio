# Refonte des deux playgrounds — Design (« Two-Up »)

> Spec issue d'une exploration parallèle (30 agents : 4 d'analyse, 20 concepts, 5 juges, 1 synthèse). Concept retenu : **Two-Up — un seul atelier, deux faces**, fusionné avec le chip d'étape numéroté (« Three Tracks ») et une ligne de statut unique (consensus des juges).

## Objectif

Refondre les deux pages playground (`/playground/detector` et `/playground`) pour qu'elles forment **un seul système visuel et d'interaction cohérent**, avec une hiérarchie qui communique le flux **configurer → fournir le texte → lancer → lire les résultats**, et la relation entre les deux pages (le banc detector alimente la pipeline en détecteurs sauvegardés). Garder **toutes** les fonctionnalités existantes.

## Périmètre

Modifications confinées à :
- `src/components/playground/config-builder.tsx` (page pipeline `/playground`)
- `src/components/playground/detector-playground.tsx` (banc detector `/playground/detector`)
- composants partagés du playground (restylage/refactor autorisés)

Ne pas toucher : pages marketing, `site.ts`, `labels.ts`, `next.config.ts`, logique d'inférence/couleurs.

## Contraintes dures

- Export statique (`output: "export"`) : pas de serveur, pas d'API, pas de `next/image`. Inférence 100 % navigateur.
- shadcn/ui variante base-ui (`@base-ui/react`), Tailwind v4 (CSS vars dans `globals.css`), `lucide-react`. **Les Button base-ui utilisent `render`, jamais `asChild`.**
- Police racine responsive (zoom ≥1920 / ≥2560). **Jamais de taille de police en px arbitraire** (`text-[13px]`). Utiliser l'échelle (`text-sm`…) ou rem.
- Copie via i18n (`useT()`), clés dans `en.ts`/`fr.ts`, forme dans `types.ts`. **Zéro nouvelle clé requise** pour la refonte.
- Style de contenu : pas d'em-dash, pas de formulation « LLM », accents FR corrects. piighost reste détecteur-agnostique.
- Plein écran sous header 4rem : `lg:h-[calc(100dvh-4rem)]`. Doit dégrader proprement en étroit.

## Système partagé (grammaire commune aux deux pages)

Toutes les classes sont des utilitaires Tailwind v4 déjà présents. Aucune taille de police en px.

**Coque externe (inchangée, les deux pages)** :
`<div className="mx-auto flex w-full max-w-[88rem] flex-col p-4 lg:h-[calc(100dvh-4rem)]">` → `<PlaygroundTabs />` → grille corps `grid flex-1 gap-4 overflow-hidden lg:min-h-0 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,3.4fr)]`. Cellule gauche = **RAIL BIBLIOTHÈQUE** pointillé ; cellule droite = **CARTE ATELIER**. (Unifier le detector de 0.6/3.6 à **0.6/3.4**.)

**Rail bibliothèque** (la surface « stocké, pas live ») :
`aside` avec `flex min-h-0 flex-col gap-4 overflow-auto rounded-xl border border-dashed bg-muted/30 p-4`. Contient les presets + (detector seulement) le formulaire de sauvegarde + la liste sauvegardée.

**Carte atelier** (les deux pages) :
`grid divide-y divide-border overflow-hidden rounded-xl border bg-card shadow-sm lg:min-h-0 lg:divide-x lg:divide-y-0` avec **une seule grille 3 colonnes** : `lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.9fr)_minmax(0,1.05fr)]`. Colonnes = **CONFIGURER | TEXTE | RÉSULTATS**. En étroit, `divide-y` empile dans l'ordre du flux.

### Composants partagés à créer (`src/components/playground/`)

La factorisation **est** la garantie de cohérence — les deux fichiers importent les mêmes pièces.

1. **`region.tsx`** — promotion du `Region` privé du detector (`detector-playground.tsx:62-82`). Props additionnelles : `step?` (ordinal) et `bodyClassName?`. La pipeline remplace ses trois `<section>`+`<h2>` faits main (`config-builder.tsx:255-258, 463, 556`).
   ```
   function Region({ step, title, action, children, bodyClassName }) =>
     <section className="flex min-h-0 flex-col overflow-auto p-4">
       <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
         <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
           {step != null && <StepChip n={step} done={...} />}
           {title}
         </h2>
         {action}
       </div>
       <div className={cn("flex min-h-0 flex-1 flex-col", bodyClassName)}>{children}</div>
     </section>
   ```
2. **`step-chip.tsx`** — `<StepChip n done />` : `<span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-mono font-semibold text-primary tabular-nums">`. Affiche l'ordinal ; quand l'étape est complète, remplace le chiffre par `<Check className="size-3" />` (lucide). « Complète » dérivé de l'état existant : étape 1 toujours allumée ; étape 2 done quand `status/testStatus === "done"` ; étape 3 done quand des résultats existent. **Aucun nouvel état.**
3. **`run-status.tsx`** — `<RunStatus />`, ligne de statut canonique unique, placée à la **fin** de la colonne CONFIGURER (enfant flex `shrink-0`, **pas** `position:sticky` — le contexte `min-h-0 overflow-auto` clip un footer sticky). Conteneur `flex flex-col gap-1 text-xs text-muted-foreground`. Affiche, dans l'ordre : ligne runtime/chargement (pipeline : `Loader2 size-3 animate-spin` + `pg.loadingRuntime`/`pg.runtimeDownloading`/`pg.runtimeInstalling`/`pg.runtimeReady`), métrique d'inférence (`{pg.inferenceTime}: {ms} ms · ~{rate} {pg.reqPerSecond}`, deux pages), erreur (`text-destructive` `pg.errorTitle`), `pg.noEnabledDetectors`, `pg.llmDeploymentNote`, périmé (`text-amber-600` `pg.staleNote`), `pg.approximationNote` (pipeline). Absorbe `config-builder.tsx:434-456` ET `detector-playground.tsx:434-439`.
4. **`loading-pane.tsx`** — `<LoadingPane progress message />` extrait verbatim de `detector-playground.tsx:380-398` : `flex min-h-32 flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-background p-6 text-center` → `Loader2 size-8 animate-spin`, titre `text-sm font-medium`, piste `h-2 w-64 max-w-full overflow-hidden rounded-full bg-muted` avec remplissage déterminé (`h-full rounded-full bg-primary transition-[width]`, width%) OU pulse indéterminé (`h-full w-full animate-pulse rounded-full bg-primary/60`), `{progress}%` optionnel en `text-xs tabular-nums`, puis `pg.firstLoadNote`. Detector passe un % réel (0-99) ; **pipeline passe `progress={null}`** (pulse, car le warm-up runtime n'a pas de total d'octets — honnête).
5. **`entity-row.tsx`** — `<EntityRow label text score colors />` depuis le markup identique `detector-playground.tsx:462-479` ≡ `config-builder.tsx:566-583`. Réutilisé pour les listes de résultats des deux pages ET comme vocabulaire visuel de la ligne détecteur pipeline et des cartes sauvegardées.
   ```
   <li className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2">
     <div className="flex items-center gap-2">
       <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${colors.get(label) ?? labelStyle(label)}`}>{label}</span>
       <span className="whitespace-nowrap font-mono text-sm">{text}</span>
     </div>
     <span className="shrink-0 text-xs text-muted-foreground">{(score*100).toFixed(0)}%</span>
   </li>
   ```
6. **`field-label.tsx`** — promotion de `FieldLabel` (`config-builder.tsx:57-70`), `text-[10px]` → **`text-[0.625rem]`**, `help` optionnel (le detector peut l'utiliser en label-only). Promouvoir aussi le const `STAGE_SELECT` dans ce module partagé.

Tous présentationnels, clients (pages déjà `"use client"`). Aucun serveur/API/dépendance nouvelle.

### Tokens visuels unifiés

- Selects/inputs : `w-full rounded-md border bg-background px-2.5 py-1.5 text-xs` (variante mono `font-mono` pour ids de modèle / patterns / stage selects). L'input nom du detector passe de `text-sm` à ce token.
- Range : `w-full accent-primary`. Le **seuil reste actif pendant le calcul** (ne jamais ajouter `disabled={busy}` dessus).
- Échelle typo : titres de région `text-xs font-semibold uppercase tracking-wide text-muted-foreground` ; labels `text-sm font-medium` ; aides/notes/métriques `text-xs text-muted-foreground` (`tabular-nums` pour scores/ms) ; code/entités/ids modèle `font-mono` en `text-sm`/`text-xs` ; titres de modale `text-sm font-semibold`.
- Couleur/identité : violet primaire pour StepChip, bouton Test, pill active, accent seuil, focus `ring-3 ring-ring/50` ; `text-amber-600` périmé ; `text-destructive` erreurs/suppression ; couleurs d'entités via `assignLabelColors`/`labelStyle` **inchangées**. Rayons : `rounded-xl` cartes, `rounded-md` contrôles/lignes, `rounded-full` chips/progress.
- Toggles segmentés (pipeline Saisie/Anonymisé) : motif pill marketing identique à `PlaygroundTabs` — conteneur `flex gap-1 rounded-lg bg-muted/40 p-1`, actif `bg-background text-foreground shadow-sm`, inactif `text-muted-foreground hover:text-foreground` (remplace `bg-primary`/`bg-muted` à `config-builder.tsx:476-478`).
- Buttons : base-ui `<Button>` (`default` Test/Save, `outline` Export/Éditer/Retry/Télécharger, icône pour supprimer). Le lien « éditer dans le playground » reste un `<Link>` Next (`config-builder.tsx:302`) ou `<Button render={<Link/>}>`. **Jamais `asChild`.**

### États (markup identique sur les deux pages)

- **IDLE/EMPTY** : hint `text-sm text-muted-foreground` (`pg.emptyHint`, `pg.emptyPipeline`).
- **LOADING/RUNNING** : `LoadingPane` remplit le corps TEXTE ; StepChip-2 en spinner ; ligne RunStatus runtime.
- **DONE** : TEXTE remplace la textarea par `EntityHighlight` lecture seule (click/Enter/Espace → idle, + bouton Éditer outline) ; RÉSULTATS rend la liste `EntityRow` ; RunStatus montre le temps d'inférence.
- **ERROR** : `text-sm text-destructive` + bouton « Réessayer » outline appelant le handler ; RunStatus `pg.errorTitle`.

### Responsive

Desktop = atelier 3 colonnes plein-hauteur à côté du rail pointillé (chaque colonne `min-h-0 overflow-auto`). Étroit = la grille corps passe à 1 colonne, le rail s'empile au-dessus, l'atelier `divide-y` empile CONFIGURER→TEXTE→RÉSULTATS ; la page scrolle. RunStatus et la barre d'actions Export/Save sont `shrink-0` (jamais clippés).

## Page Detector (`/playground/detector`)

```
┌──────────────┬────────────────────────────────────────────────┐
│ RAIL (dashed)│  CARTE ATELIER                                   │
│ EXEMPLES     │ ①CONFIGURER │ ②TEXTE  [sample▾] │ ③RÉSULTATS[tri▾]│
│ SAUVEGARDE   │ type détec. │  textarea/coller   │  [PER] Marie 99│
│ [nom][Save]  │ (regex/mod/ │  (running→loader   │  [LOC] Paris 92│
│ SAUVEGARDÉS  │  LabelMap)  │   barre% + note)   │  ...            │
│ nom·type·mod │ seuil ===   │  (done→surlignage  │                 │
│ Load Delete  │ ╔[ Test ▶]╗ │   + Éditer)        │                 │
│              │ ╚RunStatus╝ │                    │                 │
└──────────────┴────────────────────────────────────────────────┘
```

**Rail** (structure inchangée `detector-playground.tsx:171-235`) : `PresetList` (PRESET_DETECTORS, Load → config+name+text+idle) ; formulaire de sauvegarde (input nom au token `text-xs` + bouton `pg.saveDetector` plein, désactivé si nom vide) ; liste sauvegardée (carte = nom mono, `pg.detectorTypes[type]` + `· model`, boutons Load/Delete, vocabulaire `EntityRow`) ; autoload `?edit=` au mount (`useEffect` `99-109`) inchangé.

**① CONFIGURER** (`step=1`, `pg.configTitle`, corps `space-y-4`) : select type (`pg.detectorType`, FieldLabel optionnel, `defaultConfig()` reset, disabled si busy) ; conditionnel par type — regex (textarea `pg.patternsLabel` mono + `patternsToText`/`textToPatterns` + `pg.patternsHint`), transformers (select CLASSIC_MODELS mono + `LabelMappingEditor` clé `transformers-${model}-${name}`), gliner2 (select GLINER_MODELS + `LabelMappingEditor` clé `gliner2-${model}-${name}`), llm (boîte pointillée `pg.llmDeploymentNote`, Test non-runnable) ; seuil (`pg.thresholdLabel`, `toFixed(2)`, `accent-primary`, **non désactivé si busy**) ; RunBar en fin de colonne (`pg.test` plein, Loader2 si busy, disabled si `busy || !runnable || text.trim()===""`) + `RunStatus` (ici : métrique + erreur seulement).

**② TEXTE** (`step=2`, `pg.inputLabel`, action `SampleTextPicker` `pg.loadSampleText` disabled si busy, onPick → idle) : error → `pg.errorTitle` + `pg.retry` ; running → `LoadingPane` (progress 0-99 agrégé via `downloadSizes`, pulse si null, `pg.loadingModel`, `pg.firstLoadNote`) ; done → `EntityHighlight` lecture seule (click/Enter/Espace → idle) + `pg.edit` ; idle → textarea `min-h-48` + `pg.firstLoadNote`.

**③ RÉSULTATS** (`step=3`, `pg.resultsTitle`, action = select tri, rendu seulement si `done && entities.length>0`) : métrique d'inférence déplacée dans `RunStatus` (plus de ligne séparée ici) ; tri (`pg.sortLabel` : appearance/scoreDesc/scoreAsc) ; liste `EntityRow` (filtrée par seuil, `sortedEntities`, clé `${e.start}-${i}`) ; vides → `pg.emptyHint` / `pg.noEntities` ; useMemos (`entities`/`colors`/`sortedEntities`) inchangés.

## Page Pipeline (`/playground`)

```
┌──────────────┬────────────────────────────────────────────────┐
│ RAIL (dashed)│ ①CONFIGURER │ ②TEXTE [Saisie|Anon][sample▾]│③RÉSULT│
│ EXEMPLES     │ détecteurs ?│  textarea / surlignage       │[PER]..│
│ (pipelines)  │ [+sauv.▾]   │     OU segments anonymisés   │[ORG]..│
│              │ ☑ det A ✎✕  │  <<PERSON:1>> ...            │       │
│              │ span/linker │  (bandeau « périmé » ambre)  │       │
│              │ resolver ?  │                              │       │
│              │ anonymizer ?│                              │       │
│              │ ╔[ Test ▶]╗ │                              │       │
│              │ ╚RunStatus╝ │                              │       │
├──────────────┴───────────────────────────[Export][Save]─────────┤
└──────────────────────────────────────────────────────────────────┘
  Export/Save → modales INCHANGÉES (TOML/Python tabs + Download ; nom + Save/Cancel)
```

**Rail** (`config-builder.tsx:239-251`) : `PresetList` (PRESET_PIPELINES, `collapsible={false}`, Load → pipeline+saveName+idle).

**① CONFIGURER** (`step=1`, `pg.configTitle`, corps `gap-4`) : bloc détecteurs (`FieldLabel pg.detectorsTitle`+`pg.detectorsHelp`) — select add-from-saved (`pg.addFromSaved`, dédup via `addDetector`, reset `selectedIndex=0`), lignes = checkbox enable (`accent-primary`), nom mono + sous-titre `model`/`"regex"` (vocabulaire `EntityRow`), lien `pg.editInPlayground` → `/playground/detector?edit=`, `✕` `text-destructive` (`pg.remove`), vide → `pg.emptyPipeline` ; span resolver (`pg.spanResolverLabel`+`pg.spanResolverHelp`, STAGE_SELECT) ; entity linker (`pg.entityLinkerLabel`+help) ; entity resolver (`pg.entityResolverLabel`+help) + seuil fuzzy conditionnel ; anonymizer (`pg.anonymizerLabel`+help) + chip `tokenExample(ph)` (`pg.tokenExample`, `rounded bg-primary/10 px-1 font-mono text-primary`) + `hashLength` conditionnel (4-64) + `maskChar` conditionnel ; RunBar en fin de colonne (`pg.test` plein, Loader2 si loading/running, disabled si `testStatus∈[running,loading] || !hasEnabledDetector || testText.trim()===""`) + `RunStatus` (ordre complet runtime → métrique → erreur → noEnabledDetectors → llm → stale → approximation).

**② TEXTE** (`step=2`, `pg.inputLabel`, action = toggle pill Saisie|Anonymisé + `SampleTextPicker`) : toggle (`pg.inputLabel`/`pg.anonymizedLabel`, motif pill, auto-bascule « anonymisé » sur run réussi ; revenir à « saisie » en done remet idle) ; sample picker (disabled si loading/running, onPick → testText + idle + vue saisie) ; bandeau périmé (si `testStale`, `text-amber-600 text-xs` en haut du corps — même `pg.staleNote`) ; loading/running → `LoadingPane` (`progress={null}`, message `pg.loadingRuntime`/`pg.loadingModel` selon stage) ; vue saisie + done → `EntityHighlight` lecture seule ; vue saisie + non done → textarea `min-h-32` ; vue anonymisée + done → paragraphe `testAnonSegments` colorés (`whitespace-pre-wrap leading-relaxed`) ; vue anonymisée + non done → `pg.emptyHint`.

**③ RÉSULTATS** (`step=3`, `pg.resultsTitle`) : liste `EntityRow` (`testRows`, clé `${e.token}-${i}`) ; vides → `pg.emptyHint` / `pg.noEntities`.

**Barre d'actions page** (`shrink-0`, sous la carte, `config-builder.tsx:591-596`) : `Export` (outline) + `Save pipeline` (default) → modales **inchangées** (Export TOML/Python + CopyButton + `downloadToml` ; Save nom prérempli + Save/Cancel désactivé si vide).

## Plan composants (réutilisation)

- **Réutilisés tels quels** : `EntityHighlight`, `PresetList`, `SampleTextPicker`, `LabelMappingEditor`, `Modal`/`ExportBox`/`CopyButton`/`tokenExample`, toute la logique d'inférence/couleurs.
- **Restylés** : `PlaygroundTabs` (aligner légèrement actif/inactif si besoin) ; le toggle Saisie/Anonymisé adopte les classes pill ; input nom detector → token `text-xs`.
- **Nouveaux partagés** : les 6 listés ci-dessus.

## Checklist fonctionnelle (chaque feature placée)

**Detector** : type · regex patterns · model transformers · model gliner · LabelMappingEditor (clé remount) · seuil (live) · Test+guards · loading/progress (LoadingPane) · sample picker · textarea⇄EntityHighlight+Éditer · bibliothèque sauvegardée (presets+form+Load/Delete) · autoload `?edit=` · liste entités (EntityRow) · tri · inférence (RunStatus) · états error/empty · grille 3 colonnes · note LLM · couleurs · memos · guards busy/runnable. **Tous placés.**

**Pipeline** : liste détecteurs (add dédup/enable/edit/remove/empty) · span/linker/resolver(+fuzzy) · anonymizer (token+hash+mask) · Test+runtime stages · machine 5 états + loading · note périmé (bandeau+RunStatus) · noEnabledDetectors · llm · vue saisie · vue anonymisée+segments · colonne entités (EntityRow) · modale Export (TOML/Python+Download) · modale Save · grille 3 colonnes · presets (rail) · sample picker · inférence+warm-up (RunStatus) · firstLoadNote · error · toggle vue (auto-switch) · testText · EntityHighlight · tooltips FieldLabel. **Tous placés.**

## Risques & notes

- **i18n** : zéro nouvelle clé requise (l'ordinal vit dans le glyphe StepChip). *Optionnel* : une clé pour une légende « Les détecteurs sauvegardés alimentent la pipeline » sous le formulaire detector (FR accentué, sans em-dash, agnostique). Sinon réutiliser la sémantique `pg.editInPlayground`.
- **Sous-tilités à préserver** : seuil actif pendant busy ; tri rendu seulement `done && entities>0` ; clé remount `${type}-${model}-${name}` du LabelMappingEditor ; dédup add-from-saved + reset `selectedIndex=0` ; autoload `?edit=` au mount seulement ; couleurs dérivées de `allEntities`/`testHighlights` (pré-seuil) ; auto-switch vue anonymisée sur run réussi (retour saisie → idle).
- **RunStatus** : `shrink-0` en fin de colonne, **pas sticky** (clip dans `min-h-0 overflow-auto`).
- **Hauteur colonne CONFIGURER pipeline** : haute (détecteurs + 4 stages + RunBar) ; garder `overflow-auto min-h-0`, le RunBar scrolle avec le contenu (ne pas le faire flotter).
- **LoadingPane pipeline** : `progress={null}` (pulse), warm-up sans total d'octets.
- **Grille 0.95/1.9/1.05** : milieu délibéré ; vérifier que le paragraphe anonymisé et le texte d'entité long wrappent correctement. Fallback acceptable `0.95/2.0/1.0`, mais **une seule grille** pour les deux pages.
- **Déplacer `Region`** vers un fichier partagé change l'import du detector (trivial) ; lancer `pnpm test` + `pnpm lint` après.
- **base-ui** : confirmer aucun `<Button asChild>` ; lien edit reste `<Link>` ou `<Button render={<Link/>}>`.
- **Étroit** : confirmer empilement CONFIGURER→TEXTE→RÉSULTATS, rail au-dessus, page scrolle, barre Export/Save atteignable.
