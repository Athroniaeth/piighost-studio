# Mapping label → entité pour tous les détecteurs (config TOML + site) — conception

Date : 2026-06-02
Projets : piighost (lib) + piighost-website (site)

## Objectif

Permettre, pour chaque détecteur qui porte des labels, de **mapper le label émis
au label interrogé du modèle** : p. ex. interroger GLiNER avec `person` mais
émettre l'entité `PERSONNE`. Aujourd'hui :

- Le runtime piighost gère déjà ce mapping (`BaseNERDetector` accepte
  `labels: list[str] | dict[str, str]`, dict = `{externe: interne}` : les valeurs
  sont passées au modèle, les clés sont émises). **Sauf `LLMDetector`** qui
  n'hérite pas de `BaseNERDetector` et utilise les labels tels quels.
- Mais le **schéma de config (TOML/Python)** ne l'expose pas : `labels: list[str]`
  seulement, et `from_config` aplatit avec `list(cfg.labels)`.
- Le **site** n'expose qu'une liste de labels (`Types to detect`), et le champ
  re-parse à chaque frappe (la virgule est « avalée »).

But : exposer cette granularité de bout en bout (config TOML/Python + UI du site +
détection live), pour `gliner2`, `spacy`, `transformers`, `llm`. `regex` est
inchangé (la clé de son pattern est déjà le label émis).

## Périmètre & décisions

- **Détecteurs concernés** : tous ceux qui portent des labels — `gliner2`,
  `spacy`, `transformers`, `llm`. `regex` exclu (clé = label).
- **Modèle de données** : `labels` devient *liste* (identité) **ou** *dict*
  `{émis: modèle}`. Une entrée sans mapping = identité (`{x: x}`).
- **Syntaxe UI** (`Types to detect`) : textarea, **une entrée par ligne**,
  `ÉMIS: modèle` pour mapper, ligne simple `label` pour l'identité. État texte
  brut, **parse au blur** (corrige la virgule avalée).
- **Ordre d'exécution** : d'abord piighost (lib + publication PyPI), puis le site
  (qui épingle la nouvelle version, comme pour 0.12.1).

## Partie A — piighost (lib)

### A1. Schéma de config (`src/piighost/config/models/detector.py`)
- `Gliner2DetectorConfig.labels` : `list[str]` → `list[str] | dict[str, str]`.
- `SpacyDetectorConfig.labels` : idem.
- `LLMDetectorConfig.labels` : idem.
- `TransformersDetectorConfig` : **ajouter** `labels: list[str] | dict[str, str] | None = None`
  (aujourd'hui aucun champ labels ; `None` = comportement actuel, identité sur
  tous les labels du modèle).
- `RegexDetectorConfig` : inchangé.
- Conserver `min_length=1` côté liste ; pour le dict, exiger au moins une paire.

### A2. Builders / `from_config`
- `gliner2.py` : `labels=cfg.labels` (au lieu de `list(cfg.labels)`).
- `spacy.py` : `labels=cfg.labels` (au lieu de `list(cfg.labels)`).
- `transformers.py` : `labels=cfg.labels` (au lieu de `None`).
- Ces valeurs (list **ou** dict) sont transmises telles quelles à
  `BaseNERDetector`, qui les normalise déjà.

### A3. `LLMDetector` (ne dérive pas de `BaseNERDetector`)
- `__init__` accepte `labels: list[str] | dict[str, str]`. Normaliser en
  `{externe: interne}` (réutiliser la logique `_normalize` de `BaseNERDetector`,
  ou la dupliquer localement).
- Construire le **schéma enum** et le **prompt** à partir des labels **internes**
  (valeurs).
- Dans `detect`, **remapper** chaque label émis par le LLM (interne) vers
  l'externe avant de renvoyer les `Detection`.
- `from_config` : `labels=cfg.labels`.

### A4. JSON Schema / export de schéma
- L'export du JSON Schema de `PipelineConfig` (commande `piighost schema`) reflète
  automatiquement l'union `list | dict` via pydantic. Vérifier qu'il reste valide.

### A5. Tests
- Config : `labels` accepté en liste ET en dict (TOML inline table) ; round-trip.
- Chaque détecteur NER : un dict `{PERSONNE: person}` interroge le modèle avec
  `person` et émet `PERSONNE` (test runtime avec un modèle factice / mock).
- `LLMDetector` : prompt construit sur l'interne, sortie remappée vers l'externe.

### A6. Release
- Bump de version (mineure, nouvelle capacité de config) + publication PyPI via le
  workflow `release.yml` (tag), comme pour 0.12.1.

## Partie B — site (après la release)

### B1. Types (`src/lib/detector-config.ts`)
- `Gliner2DetectorConfig.labels` et `LlmDetectorConfig.labels` :
  `string[] | Record<string, string>`.
- `TransformersDetectorConfig` : ajouter `labels?: string[] | Record<string, string>`
  (optionnel ; absent = labels du modèle, identité).

### B2. Champ « Types to detect » (`detector-playground.tsx` + `labels.ts`)
- Remplacer le parsing actuel : **une entrée par ligne**, `ÉMIS: modèle` ou
  `label`. Produire une **liste** si toutes les entrées sont en identité, sinon un
  **dict** `{émis: modèle}`.
- **État texte brut** dans le composant ; parser au blur (ou à la frappe sans
  re-normaliser le texte affiché) pour ne plus avaler la virgule / les espaces.
- Affichage de la valeur existante : reconstruire le texte multi-lignes depuis la
  liste/dict.

### B3. Détection live (`gliner.ts`, `ner.ts`, `detector-config.ts:runDetector`)
- Pour `gliner2` (et `transformers`) : interroger le modèle avec les labels
  **internes** (valeurs du dict, ou la liste), puis **remapper** le label de
  chaque détection vers l'**externe** (clé). Identité si liste.
- Helper partagé `internalLabels(labels)` et `remap(label, labels)` (pur, testé).

### B4. Export (`pipeline-export.ts`)
- Liste → `labels = ["a", "b"]` (TOML) / `labels=["a", "b"]` (Python).
- Dict → table inline TOML `labels = { ÉMIS = "modèle", ... }` / dict Python
  `labels={"ÉMIS": "modèle", ...}`.

### B5. Pin de version
- Mettre `PIIGHOST_VERSION` (dans `piighost-runtime.ts`) à la nouvelle version
  publiée.

### B6. Tests
- `labels.ts` : parsing (lignes → liste/dict, identité, espaces) ; round-trip
  valeur ↔ texte.
- Helpers `internalLabels` / `remap`.
- Export liste vs dict (TOML + Python).

## Critères de succès

- Une config TOML/Python piighost peut déclarer `labels = { PERSONNE = "person" }`
  pour `gliner2`/`spacy`/`transformers`/`llm` et se charge correctement.
- Dans le site, saisir `PERSONNE: person` (une ligne) sur un détecteur GLiNER fait
  émettre `PERSONNE` dans le test live (interrogation `person`), sans virgule
  avalée.
- L'export reflète le mapping (table inline TOML / dict Python).
- `pnpm build` + `pnpm test` verts (site) ; tests piighost verts ; nouvelle
  version publiée et épinglée.
