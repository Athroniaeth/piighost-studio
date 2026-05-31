# Test live de /config via le vrai piighost (Pyodide) — conception

Date : 2026-05-31
Projet : piighost-website

## Objectif

Le panneau de test live de `/config` exécute aujourd'hui une **approximation
JavaScript** de la logique d'assemblage de piighost (résolution de spans,
linking, résolution d'entités, assignation des tokens de remplacement). Cette
approximation diverge du vrai piighost sur plusieurs points sémantiques (casse,
re-scan des occurrences manquées, algorithme de hash).

Objectif : **remplacer cette approximation par le vrai piighost exécuté dans le
navigateur via Pyodide** (CPython compilé en WebAssembly), pour que la sortie
anonymisée — et surtout la sémantique des identifiants (`<<LABEL:1>>`, hash,
masque…) — soit fidèle à la bibliothèque Python, sans dérive ni double
implémentation à maintenir.

La détection reste en JavaScript (transformers.js / gliner / regex) ; seul
l'**assemblage** passe en Python.

## Contexte : pourquoi c'est faisable

- piighost se sépare nettement en deux moitiés. Les **détecteurs** lourds
  (`transformers`, `gliner2`, `spacy`) tirent `torch`/code natif, impossibles
  dans le navigateur — mais ils sont déjà remplacés par leurs équivalents JS.
- Le **cœur d'assemblage** (`anonymizer`, `placeholder`, `linker.entity`,
  `resolver.span`, `resolver.entity`, `models`, `similarity`) est ~1 850 lignes
  de **Python pur** (stdlib uniquement : `re`, `hashlib`, `defaultdict`,
  `sorted`). Zéro dépendance native.
- Les dépendances de base du package sont `typing-extensions` seulement (pur).
  Les dépendances natives sont toutes derrière des extras non installés.
- `models.py` fournit déjà `Detection.from_dict({text,label,start_pos,end_pos,
  confidence})` et `Entity.to_dict()` — la sérialisation du pont est native.
- Piège connu : `import piighost` (top-level) importe `ph_factory.faker_hash`,
  qui tire `faker`. Le pont importe donc **les sous-modules directement**,
  jamais le package top-level.

## Périmètre

Dans le périmètre :
- Un runtime Pyodide chargé **paresseusement sur `/config` uniquement**, au
  premier « Test ».
- Installation de piighost via `micropip.install("piighost==<version épinglée>")`
  depuis PyPI.
- Un pont JS ↔ Python : sérialisation des détections + de la config, exécution
  du pipeline d'assemblage piighost, renvoi de la sortie anonymisée, de la liste
  d'entités (avec leur token/id) et des segments colorés.
- Remplacement total de l'assemblage JS dans le test live ; suppression du label
  « approximation ».

Hors périmètre :
- `/playground` (banc de test mono-détecteur) : pas d'anonymisation, aucun
  changement.
- Le détecteur `llm` : toujours non exécuté dans le navigateur.
- Exécution de Pyodide dans un Web Worker (amélioration future si le gel du main
  thread devient gênant).
- Tout backend, persistance ou hébergement d'inférence.

## Choix techniques

- **Packaging** : `micropip` depuis PyPI, version piighost **épinglée**. Cohérent
  avec le site qui récupère déjà ses modèles depuis le CDN HuggingFace.
- **Runtime** : paquet npm `pyodide` pour le loader ; assets WASM/stdlib servis
  depuis le CDN jsDelivr via `loadPyodide({ indexURL })`. Pas d'auto-hébergement
  des binaires.
- **Threading** : **main thread**, cohérent avec transformers.js/gliner qui y
  tournent déjà (avec gel pendant l'inférence). Le gel d'init Pyodide est couvert
  par un état de chargement explicite.
- **Imports** : sous-modules piighost uniquement (jamais le top-level) pour
  rester en stdlib pur et éviter `faker`.

## Architecture et flux de données

```
"Test" cliqué (config-builder.tsx)
  └─ JS  : runDetector(chaque détecteur activé, non-llm) → détections
  └─ JS  : loadPiighostRuntime()   (idempotent ; 1er appel = état "loading")
  └─ JS  : assembleWithPiighost(text, détections, config)
        └─ Python : Detection.from_dict → pipeline piighost → JSON
  └─ JS  : parse → { anonymized, entities[], segments[] } → rendu 3 colonnes
```

### Pièces

**`src/lib/piighost-runtime.ts`** (nouveau) — singleton de module :
- `loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/<v>/full/" })`
- `loadPackage("micropip")` puis `micropip.install("piighost==<version>")`
- exécute une glue Python (chaîne embarquée) définissant `assemble(...)`
- met en cache l'interpréteur prêt ; les appels suivants n'invoquent que
  `assemble`
- expose `loadPiighostRuntime(): Promise<void>` (idempotent) et
  `assembleWithPiighost(text, detections, config): Promise<AssembleResult>`
- évince le cache en cas d'échec de chargement, pour qu'un Retry re-télécharge
  (même politique que `ner.ts`/`gliner.ts`).

**Glue Python** (embarquée) — importe les sous-modules, mappe la config web vers
les instances piighost, puis :
```python
detections = [Detection.from_dict(d) for d in payload["detections"]]
resolved   = span_resolver.resolve(detections)
entities   = linker.link(text, resolved)
entities   = entity_resolver.resolve(entities)
anonymizer = Anonymizer(ph_factory=factory)
anonymized = anonymizer.anonymize(text, entities)
tokens     = factory.create(entities)   # Entity -> "<<LABEL:1>>"
# segments colorés : reconstruits depuis les spans des détections + tokens,
# triés par position, trous comblés par le texte brut.
return json({ "anonymized": ..., "entities": [...], "segments": [...] })
```

**Sérialiseur JS** — `ConfigPipeline` → dict simple compris par la glue.

### Mapping config web → piighost (1:1)

| Web | piighost |
|---|---|
| `spanResolver` confidence / disabled | `ConfidenceSpanConflictResolver` / `DisabledSpanConflictResolver` |
| `entityLinker` exact / disabled | `ExactEntityLinker` / `DisabledEntityLinker` |
| `entityResolver` merge / fuzzy / disabled | `MergeEntityConflictResolver` / `FuzzyEntityConflictResolver(threshold)` / `DisabledEntityConflictResolver` |
| `placeholder` label_counter | `LabelCounterPlaceholderFactory` |
| label_hash | `LabelHashPlaceholderFactory(hash_length)` |
| label | `LabelPlaceholderFactory` |
| mask | `MaskPlaceholderFactory(maskChar)` |
| redact_counter | `RedactCounterPlaceholderFactory` |
| redact_hash | `RedactHashPlaceholderFactory(hash_length)` |
| redact | `RedactPlaceholderFactory` |

Les signatures exactes des constructeurs (notamment `mask` et les variantes
hash : `salt`/`pepper`/`hash_length`) sont à confirmer à l'implémentation contre
`placeholder.py`.

### Forme du résultat (`AssembleResult`)

```ts
{
  anonymized: string;                                  // texte anonymisé
  entities: { label, text, score, token }[];           // liste affichée (col 3)
  segments: { value: string; label?: string }[];       // sortie colorée (col 2)
}
```

## Changements UI (`config-builder.tsx`)

- `testStatus` gagne un état `"loading"` (runtime) entre `idle` et `running` →
  message « Chargement du moteur piighost… » (nouvelle clé i18n).
- `runTest` : `await loadPiighostRuntime()` puis `assembleWithPiighost`. Le layout
  3 colonnes (entrée éditable, sortie colorée, liste d'entités) reste inchangé.
- Suppression du label « approximation » (`approximationNote`), remplacé par une
  mention discrète « piighost v\<version\> (navigateur) » ou rien.
- Erreur (offline / CDN / PyPI indisponible) → état `error` + Retry (relance =
  re-tente le chargement). **Pas de repli JS** (l'assemblage JS est supprimé).
- Détecteur `llm` : toujours ignoré, on garde `llmDeploymentNote`.

## Code supprimé / modifié

- **Supprimé de `run-pipeline.ts`** : `assemblePipeline`, `assignToken`,
  `createTokenContext`, `resolveSpans`, `hashValue` (toute la logique
  d'assemblage). `runPipeline` garde l'exécution des détecteurs puis délègue au
  pont. Le type `AnonSegment` est conservé (les segments viennent désormais de
  Python) — éventuellement déplacé vers le module runtime.
- **`run-pipeline.test.ts`** : les tests d'assemblage (`assignToken`,
  `hashValue`, `assemblePipeline`) sont retirés — cette logique vit dans piighost
  (testée chez lui). Remplacés par les tests du pont (voir Tests).
- **i18n** : `types.ts` + `en.ts` + `fr.ts` (clé de chargement runtime ; ajuster
  `approximationNote`).
- **package.json** : `pyodide` en dépendance ; script `test:integration` ;
  version piighost épinglée documentée.

## Tests

- **`pnpm test` (vitest/jsdom, rapide, par défaut)** : unitaires sur la partie
  pure JS du pont — sérialisation `ConfigPipeline` → dict, parsing du JSON de
  résultat → state. Pyodide **mocké**.
- **`pnpm test:integration` (séparé, réseau requis, hors suite par défaut)** :
  charge le vrai Pyodide (paquet npm) + installe piighost, exécute ~4 cas
  révélateurs et compare les sorties :
  1. linking insensible à la casse (« London » / « london » → même id) ;
  2. re-scan d'une occurrence non détectée par le détecteur ;
  3. hash SHA-256 déterministe (`label_hash`) ;
  4. fuzzy au-dessus du seuil (variantes proches → même id).

## Risques et mitigations

- **Taille/init de Pyodide** (~6-10 Mo au premier test) — accepté, couvert par
  l'état de chargement. Téléchargement unique par session, mis en cache navigateur.
- **micropip / CORS** : l'API JSON de PyPI et `files.pythonhosted.org` autorisent
  CORS ; l'épinglage de version protège contre une régression future des
  dépendances de base de piighost.
- **Import top-level** tirant `faker` : contourné en important les sous-modules.
- **Gel du main thread** pendant l'init : acceptable pour une page outil, signalé
  par l'état de chargement ; Web Worker en repli futur.

## Critères de succès

- Sur `/config`, un texte avec occurrences répétées et casse variable produit
  exactement les mêmes ids/tokens que le vrai piighost natif (vérifié par les
  tests d'intégration et une vérification navigateur).
- Le label « approximation » a disparu ; aucun code d'assemblage JS ne subsiste.
- `pnpm build` et `pnpm test` (rapide) passent ; `pnpm test:integration` passe
  avec réseau.
