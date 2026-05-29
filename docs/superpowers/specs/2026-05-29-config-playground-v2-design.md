# Playground de config piighost (phase 2, v2) — conception

Date : 2026-05-29
Projet : piighost-website

> Remplace `2026-05-29-config-playground-design.md` (approche maître-détail
> rejetée). Le socle pur de la première tentative (détecteur regex, modèle
> `DetectorConfig`, export TOML/Python, banc de test) est réutilisé ; la couche
> UI est repensée en **deux pages reliées** + **sauvegarde locale** des
> détecteurs.

## Objectif

Donner deux surfaces complémentaires, sans backend :

1. **`/playground`** — banc de test d'**un** détecteur (comme la phase 1,
   généralisé à tout type navigateur) : configurer, tester sur du texte
   (surlignage, entités, tri, temps d'inférence), puis **sauvegarder** le
   détecteur nommé dans le navigateur.
2. **`/config`** — éditeur de **pipeline complet** : composer une liste de
   détecteurs (ajoutés depuis les détecteurs sauvegardés), **activer/désactiver**
   chaque composant quand la lib le permet, configurer l'anonymizer, et exporter
   **TOML** + **Python**.

## Schéma piighost de référence (vérifié dans la lib)

`load_pipeline(path)` lit un TOML validé par `PipelineConfig` :

```toml
[pipeline]
name = "..."
schema_version = 1

[[detectors]]
type = "regex" | "transformers" | "gliner2" | "llm" | "spacy" | "chunked"

[span_resolver]      # type = "confidence" (def.) | "disabled"
[entity_linker]      # type = "exact" (def.) | "disabled"
[entity_resolver]    # type = "merge" (def.) | "fuzzy" | "disabled"
[anonymizer]
placeholder_factory.type = "label_counter" | "label_hash" | "label" | "mask"
                         | "redact_counter" | "redact_hash" | "redact"
                         | "faker_counter" | "faker_hash" | "faker"
```

Détecteurs et exécution navigateur (inchangé) : `regex` (RegExp JS),
`transformers` (NER classique), `gliner2` (GLiNER navigateur) testables ; `llm`
configurable mais grisé. `spacy` / `chunked` hors périmètre.

Champs placeholder utiles : `label_hash`/`redact_hash`/`faker_hash` →
`hash_length` (def. 8) ; `mask` → `mask_char` (def. "*") ;
`faker*` → `locale` (def. "en_US").

## Page `/playground` (banc + sauvegarde)

- Réutilise le composant `DetectorBench` : sélecteur de type, config par type,
  bouton **Tester** (`runDetector` → surlignage + entités + tri + temps).
- Ajouts :
  - Champ **Nom** + bouton **Sauvegarder** → enregistre `{ name, config }` dans
    `localStorage`.
  - Liste **Détecteurs sauvegardés** : **charger** (réinjecte le config dans le
    banc) et **supprimer**.
  - Au chargement, si l'URL contient `?edit=<nom>`, charger ce détecteur.

## Page `/config` (pipeline complet)

- **Détecteurs** : menu « Ajouter » listant les détecteurs sauvegardés ; chaque
  entrée du pipeline a un interrupteur **activé/désactivé**, des boutons
  **monter/descendre/retirer**, et un lien **Éditer** vers `/playground?edit=<nom>`.
  Un détecteur désactivé reste affiché mais est **exclu de l'export**.
- **Étapes** (interrupteur activé/désactivé, variante par défaut quand activé,
  `disabled` sinon) :
  - `span_resolver` : confidence ↔ disabled
  - `entity_linker` : exact ↔ disabled
  - `entity_resolver` : merge ↔ disabled
- **Anonymizer** : toujours présent ; sélecteur de **style de jeton**
  (placeholder factory) + le champ associé (`hash_length` / `mask_char` /
  `locale`) selon le style.
- **Export** : TOML + Python, affichés avec bouton copier.

## Architecture & fichiers

Réutilisés de la branche `feat/config-playground` :
- `src/lib/regex-detect.ts`, `src/lib/detector-config.ts`,
  `src/components/playground/detector-bench.tsx` (le banc).
- `src/lib/pipeline-export.ts` — **étendu** (voir plus bas).

Nouveaux :
- `src/lib/saved-detectors.ts` — `loadSaved(): SavedDetector[]`,
  `saveDetector(name, config)`, `deleteSaved(name)` sur `localStorage`
  (`piighost.detectors`), avec une sérialisation pure testable
  (`serialize`/`parse`).
- `src/components/playground/detector-playground.tsx` — la page `/playground` :
  `DetectorBench` + barre de sauvegarde + liste des sauvegardés.
- `src/components/playground/config-builder.tsx` — la page `/config`.
- `src/app/config/page.tsx` — route `/config`.

Modifiés :
- `src/app/playground/page.tsx` — rend `DetectorPlayground` (au lieu du
  builder maître-détail).
- `src/lib/site.ts` + navbar + i18n — entrée de nav « Config ».
- i18n `types/en/fr` — clés ajoutées.

Supprimé :
- `src/components/playground/pipeline-builder.tsx` (approche rejetée).

Modèle d'état :
```ts
type SavedDetector = { name: string; config: DetectorConfig };

type PipelineDetector = { config: DetectorConfig; name: string; enabled: boolean };

type Placeholder =
  | { type: "label_counter" | "label" | "redact_counter" | "redact" }
  | { type: "label_hash" | "redact_hash"; hashLength: number }
  | { type: "mask"; maskChar: string }
  | { type: "faker_counter" | "faker"; locale: string }
  | { type: "faker_hash"; locale: string; hashLength: number };

type ConfigPipeline = {
  name: string;
  detectors: PipelineDetector[];
  spanResolver: boolean;   // true => confidence, false => disabled
  entityLinker: boolean;   // true => exact,      false => disabled
  entityResolver: boolean; // true => merge,      false => disabled
  placeholder: Placeholder;
};
```

## Export (extension de `pipeline-export.ts`)

`toToml(pipeline: ConfigPipeline)` :
- `[pipeline]` name + schema_version.
- un `[[detectors]]` par détecteur **activé** (les désactivés sont ignorés).
- `[span_resolver]` / `[entity_linker]` / `[entity_resolver]` avec leur `type`
  selon les bascules (`disabled` si éteint).
- `[anonymizer]` + `placeholder_factory.type` (+ `hash_length`/`mask_char`/
  `locale` selon le style).

`toPython(pipeline)` : inchangé dans l'esprit — `load_pipeline("pipeline.toml")`
avec un résumé en commentaire (raison : instanciation directe fragile pour
`transformers`).

## Flux de données

1. `/playground` : on configure et teste un détecteur, on le sauvegarde (nom →
   localStorage).
2. `/config` : on ajoute des détecteurs depuis les sauvegardés, on active/
   désactive composants et étapes, on configure l'anonymizer.
3. « Exporter » sérialise en TOML + Python.
4. « Éditer » d'un détecteur ouvre `/playground?edit=<nom>`.

## Gestion des erreurs

- `localStorage` indisponible (SSR / navigation privée) : les fonctions du store
  échouent silencieusement et renvoient une liste vide (mêmes garde-fous que le
  `LanguageProvider` existant).
- Sauvegarder avec un nom déjà pris : écrase l'entrée homonyme (remplacement).
- Test d'un détecteur : mêmes états que la phase 1 (erreur + réessayer).

## Tests (TDD, Vitest)

Logique pure :
- `saved-detectors` : aller-retour `serialize`/`parse`, remplacement par nom,
  suppression.
- `pipeline-export` étendu : sections d'étapes selon bascules, `disabled` quand
  éteint, anonymizer + champ placeholder, exclusion des détecteurs désactivés.

UI et inférence des modèles vérifiées dans le navigateur.

## Conventions

- Pas d'em-dash ni de tournures « LLM » dans le contenu visible ; français avec
  accents corrects.
- base-ui : boutons via `render`, pas `asChild`.
- piighost reste **agnostique au détecteur** : aucun type n'est présenté comme
  le défaut de la lib.

## Hors périmètre

- Comptes / synchro multi-appareils / hub de configs (phase 3).
- Variante `fuzzy` de l'entity_resolver, `spacy`, `chunked`, exécution `llm`.
- Configuration fine des étapes resolver/linker (elles n'ont pas de champs).
