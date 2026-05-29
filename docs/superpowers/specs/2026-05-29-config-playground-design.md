# Playground de config piighost (phase 2) — conception

Date : 2026-05-29
Projet : piighost-website

## Objectif

Transformer le playground en **constructeur de pipeline piighost** : composer
une liste ordonnée de détecteurs, tester chaque détecteur en direct dans le
navigateur, le valider, puis exporter une configuration **TOML** (compatible
`load_pipeline`) et le **code Python** équivalent. Toujours **sans backend** :
l'inférence lourde tourne dans le navigateur du visiteur, comme en phase 1.

L'aller-retour central : on édite la config (liste de détecteurs), on ouvre un
détecteur dans le banc d'essai (le playground actuel), on teste, et « Valider »
ajoute le détecteur à la pipeline.

## Schéma piighost de référence (vérifié dans la lib)

`load_pipeline(path) -> (ThreadAnonymizationPipeline, PipelineManifest)` lit un
TOML validé par `PipelineConfig` :

```toml
[pipeline]
name = "..."
schema_version = 1

[[detectors]]
type = "regex"   # regex | transformers | gliner2 | spacy | llm | chunked
# champs selon le type

[span_resolver]
[entity_linker]
[entity_resolver]
[anonymizer]
placeholder_factory.type = "..."
```

Types de détecteurs et exécution navigateur :

| type           | champs                                          | navigateur            |
| -------------- | ----------------------------------------------- | --------------------- |
| `regex`        | `patterns` {LABEL: regex}                       | oui (RegExp JS)       |
| `transformers` | `model`, `threshold` (def. 0.5)                 | oui (NER classique)   |
| `gliner2`      | `model`, `labels`, `threshold`, `flat_ner`      | oui (GLiNER nav.)     |
| `llm`          | `provider`, `model`, `labels`                   | non (déploiement)     |
| `spacy`        | `model`, `labels`                               | hors périmètre        |
| `chunked`      | `chunk_size`, `inner`, `overlap`                | hors périmètre        |

## Périmètre

Dans le périmètre :
- Constructeur de pipeline **centré détecteurs** : liste ordonnée, ajout,
  réordonnancement, suppression.
- Banc d'essai par détecteur (réutilise config/texte/entités/tri/temps
  d'inférence de la phase 1), exécuté dans le navigateur.
- Détecteurs testables : `regex`, `transformers` (NER classique), `gliner2`
  (notre GLiNER navigateur).
- Détecteur `llm` : **configurable mais non exécuté**, montré « disponible au
  déploiement » (grisé).
- Export **TOML** (`[pipeline]` + `[[detectors]]`) et **code Python**.

Hors périmètre (phases / itérations ultérieures) :
- Les 4 étapes non-détecteur (span_resolver / entity_linker / entity_resolver /
  anonymizer) : omises de l'export → défauts de la lib.
- Fusion / arbitrage inter-détecteurs côté navigateur (vit dans la lib).
- `spacy`, `chunked`.
- Exécution réelle du détecteur `llm`.
- Sauvegarde / hub de configs (phase 3).

## Choix techniques

- **Disposition maître-détail** sur `/playground` : à gauche la pipeline (liste
  des détecteurs validés + « Ajouter un détecteur » + « Exporter »), à droite le
  banc d'essai pour configurer et tester le détecteur courant.
- **Modèle gliner2 WYSIWYG** : le modèle testé dans le navigateur est exactement
  celui écrit dans le TOML (`onnx-community/gliner_small-v2.1` ou
  `gliner_multi_pii-v1`). On ne substitue pas un modèle de déploiement.
- **regex en navigateur** : `RegExp` JS, drapeau global, on récupère les
  correspondances avec leurs offsets ; chaque entité prend `score = 1`.
- L'export omet les 4 étapes non-détecteur pour s'appuyer sur les défauts de la
  lib ; `schema_version` est émis. (À confirmer au plan que l'omission valide.)

## Architecture

Banc d'essai unifié derrière le type `Entity` (forme partagée), dispatch par
type de détecteur :
- `regex` → `runRegex(patterns, text)` (nouveau, pur).
- `transformers` → `runNer` (existant).
- `gliner2` → `runGliner` (existant).

Découpage fichiers :
- `src/lib/detector-config.ts` — type `DetectorConfig` (union discriminée),
  défauts par type, et `runDetector(config, text): Promise<Entity[]>` qui
  aiguille vers le bon backend.
- `src/lib/regex-detect.ts` — `runRegex(patterns, text): Entity[]` (pur).
- `src/lib/toml-export.ts` — `toToml(pipeline): string` (pur).
- `src/lib/python-export.ts` — `toPython(pipeline): string` (pur).
- UI : `src/components/playground/pipeline-builder.tsx` (maître-détail) ; le
  banc d'essai actuel (`ner-playground.tsx`) est refactorisé en panneau « bench »
  réutilisable prenant un `DetectorConfig` et un setter, et exposant Tester.
- Réutilise `EntityHighlight`, la liste d'entités, le tri, le temps d'inférence,
  les couleurs, et `CodeBlock` / `CopyButton` pour l'export.

État (React) : la pipeline est un `DetectorConfig[]` ordonné ; le détecteur en
cours d'édition est un `DetectorConfig` séparé jusqu'à « Valider ».

## Flux de données

1. L'utilisateur choisit un type de détecteur et le configure dans le banc.
2. « Tester » exécute `runDetector` sur le texte → `Entity[]` → surlignage +
   liste (comme en phase 1). `llm` n'est pas exécutable (bouton Tester désactivé,
   mention déploiement).
3. « Valider » ajoute le `DetectorConfig` courant à la liste de gauche.
4. « Exporter » sérialise la liste en TOML et en Python, affichés avec copie.

## Gestion des erreurs

Mêmes principes que la phase 1 : échec de chargement/inférence d'un détecteur →
état d'erreur dans le banc avec « Réessayer ». Une regex invalide (RegExp qui
jette) est signalée sous le champ du pattern concerné, sans planter le banc.

## Tests

Logique pure, en TDD (Vitest) :
- `runRegex` : correspondances, labels, offsets, multi-patterns, regex invalide
  gérée proprement.
- `toToml` : structure des sections, échappement, omission des étapes par défaut,
  plusieurs détecteurs.
- `toPython` : instanciation correcte des détecteurs, `CompositeDetector` quand
  il y en a plusieurs, pipeline.
- Le dispatch `runDetector` (mapping) testable sur regex ; transformers/gliner
  couverts par le navigateur.

L'UI et l'inférence des modèles sont vérifiées dans le navigateur.

## Conventions

- Pas d'em-dash ni de tournures « LLM » dans le contenu visible ; français avec
  accents corrects.
- base-ui : boutons via `render`, pas `asChild`.
- piighost reste **agnostique au détecteur** : regex / NER / GLiNER / LLM sont
  des options de même rang, aucune n'est présentée comme le défaut de la lib.
