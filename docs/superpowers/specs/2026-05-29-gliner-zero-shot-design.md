# Playground GLiNER (zero-shot) — conception

Date : 2026-05-29
Projet : piighost-website

## Objectif

Ajouter au playground les modèles **GLiNER** (zero-shot, labels libres), aux
côtés du NER classique déjà en place. GLiNER est la cible « fidèle à piighost » :
l'utilisateur définit lui-même les types d'entités à détecter (ex. `email`,
`iban`, `nom`) au lieu d'un jeu de labels figé. L'inférence reste **entièrement
dans le navigateur**, sans backend ni hébergement de modèle (contrainte
directrice de la roadmap).

GLiNER n'est ajouté que comme **option** dans le sélecteur de modèle : piighost
reste agnostique au détecteur, on ne présente jamais GLiNER comme le détecteur
« par défaut » de la lib.

## Faisabilité (vérifiée)

- `@huggingface/transformers` v4.2.0 installé **n'a aucun support natif GLiNER**
  (vérifié dans `node_modules`). L'architecture GLiNER (appariement labels↔spans)
  exige un pré/post-traitement custom.
- Le package npm **`gliner` (v0.0.19, jan. 2025)** implémente ce traitement et
  tourne dans le navigateur (onnxruntime-web). Il dépend de l'**ancien**
  transformers.js (`@xenova/transformers 2.17.2`) + `onnxruntime-web 1.19.2`.
- Modèles ONNX prêts pour le web chez `onnx-community` (variante int8) :
  - `gliner_small-v2.1` ~183 Mo (généraliste).
  - `gliner_multi_pii-v1` ~349 Mo (PII, multilingue).

## Choix techniques

- **Runtime** : package `gliner`, **chargé dynamiquement** (`await import("gliner")`)
  uniquement quand un modèle GLiNER est sélectionné. Le NER classique reste 100 %
  sur transformers.js v4. Les deux runtimes sont **code-splittés** : le visiteur
  ne télécharge que celui qu'il utilise.
- **Zéro hébergement** : modèle chargé depuis l'URL CDN HuggingFace
  (`https://huggingface.co/onnx-community/<model>/resolve/main/onnx/model_quantized.onnx`),
  WASM d'onnxruntime-web servi depuis un CDN (jsdelivr) via `wasmPaths`.
- **Sortie** : GLiNER renvoie directement des offsets caractères, donc pas de
  reconstruction WordPiece (contrairement au classique). On mappe la sortie du
  package vers le type `Entity` existant (`{ text, label, score, start, end }`).
- **Device** : sonde WebGPU → repli WASM (même logique que `pickDevice()` dans
  `ner.ts`).

## Architecture

Deux backends derrière une interface commune produisant `Entity[]` :

- `src/lib/ner.ts` — NER classique (inchangé).
- `src/lib/gliner.ts` (nouveau) :
  - `loadGliner(model, onProgress)` : crée et met en cache une instance par id de
    modèle (singleton de module, comme la `Map` de pipelines de `ner.ts`).
  - `runGliner(model, labels, text): Promise<Entity[]>` : exécute et mappe la
    sortie vers `Entity[]`.
  - Configure `onnxSettings` (executionProvider sondé, `wasmPaths` CDN, `modelPath`
    = URL CDN du modèle quantifié) et `transformersSettings`
    (`allowLocalModels: false`, `useBrowserCache: true`).

Registre de modèles dans le composant : chaque entrée porte `id`, `family`
(`"classic" | "gliner"`), et pour GLiNER ses labels par défaut.

- *NER classique* : `Xenova/bert-base-multilingual-cased-ner-hrl`,
  `Xenova/bert-base-NER`.
- *GLiNER (zero-shot)* : `onnx-community/gliner_small-v2.1` (labels par défaut :
  `person, organization, location, date`), `onnx-community/gliner_multi_pii-v1`
  (labels par défaut : `person, email, phone number, address, organization`).

## Interface utilisateur

Colonne Config du playground. Le sélecteur de modèle est groupé par `<optgroup>`
(« NER classique » / « GLiNER (zero-shot) »). La section « labels » s'adapte à la
famille du modèle sélectionné :

- **Classique** → cases PER/ORG/LOC/MISC = **filtre live** a posteriori
  (comportement actuel, inchangé).
- **GLiNER** → **champ texte de labels libres**, séparés par virgules, pré-rempli
  avec les labels par défaut du modèle. Ces labels sont une **entrée du modèle** :
  les modifier nécessite de relancer l'analyse. Un indice court sous le champ le
  précise.

Le slider de seuil reste inchangé et filtre en direct dans les deux cas. Le
bouton « Analyser » est inchangé. La colonne Texte (surlignage en place) et la
colonne Entités sont inchangées.

**Couleurs d'entités** : les labels classiques gardent la palette fixe de
`entity-highlight.tsx`. Les labels GLiNER (arbitraires) reçoivent une couleur
**déterministe par hachage** du nom de label (palette stable de N teintes).
`labelStyle()` est étendue pour ce repli au lieu du gris unique actuel.

## Flux de données

1. Sélection d'un modèle → fixe la `family`.
2. `analyze()` aiguille : classique → `runNer(model, text)` ; GLiNER →
   `runGliner(model, parsedLabels, text)`. Les deux renvoient `Entity[]`.
3. Surlignage + liste d'entités inchangés. Le seuil filtre en direct ; pour le
   classique le filtre par cases reste actif, pour GLiNER les labels affichés sont
   ceux renvoyés par le modèle (la requête, c'est le champ texte).

## i18n

Nouvelles clés dans `types.ts` + `en.ts` + `fr.ts` : libellé / placeholder /
indice « relancer pour appliquer » du champ labels, noms des deux groupes du
sélecteur, descriptions + tailles des modèles GLiNER.

## Gestion des erreurs

Même chemin que le classique : échec de chargement/inférence → état `error` dans
la colonne Texte avec bouton « Réessayer ». L'instance GLiNER cachée est évincée
en cas d'échec (comme `ner.ts`) pour qu'un nouveau « Réessayer » retélécharge au
lieu de rejouer un rejet caché.

## Tests

Logique pure, en TDD (Vitest) :

- Parsing du champ labels : trim, suppression des vides, déduplication, casse.
- Hachage label → couleur : déterministe et stable pour un même label.
- Mapping sortie brute GLiNER → `Entity[]` (offsets, score, label).

L'inférence elle-même (réseau + modèle) n'est pas testée unitairement ; elle est
couverte par le spike de vérification et un essai navigateur manuel.

## Étape 0 — spike de vérification

Avant toute UI : un test jetable qui charge `gliner_small-v2.1` depuis l'URL CDN
et renvoie des entités sur un texte d'exemple, confirmant que package + WASM CDN +
`modelPath` URL fonctionnent **sans hébergement local**. Si le spike échoue, on
revoit le choix de runtime avant d'investir dans l'UI.

## Hors périmètre

- Le décalage labels DATE/MISC du NER classique (concern séparé, préexistant).
- Le détecteur LLM/Mistral (roadmap phase 4).
- La sauvegarde / le hub de configs (roadmap phase 3).
- Toute notion de config piighost (fichier TOML) — c'est la phase 2.

## Note — avertissements console onnxruntime (filtrés volontairement)

À chaque initialisation d'un modèle GLiNER, onnxruntime-web écrit des
avertissements bénins dans la console, du type
`[W:onnxruntime ... VerifyEachNodeIsAssignedToAnEp] Some nodes were not assigned
to the preferred execution providers ...`. C'est attendu : ORT exécute
délibérément certaines opérations de forme sur le CPU. Le package `gliner`
n'expose pas le `logLevel` d'onnxruntime, et en dev Next.js les remonte dans son
overlay d'erreurs. On les filtre donc explicitement, et **uniquement ces
lignes-là**, dans `src/lib/onnx-log-filter.ts` (`filterOnnxConsoleNoise`, appelé
depuis `gliner.ts` avant l'init). C'est du confort de dev ; en production
statique il n'y a pas d'overlay. À garder en tête : la console est patchée.

## Conventions

- Pas d'em-dash ni de tournures « LLM » dans le contenu visible ; français avec
  accents corrects.
- base-ui : boutons via `render`, pas `asChild`.
- GLiNER présenté comme une option parmi d'autres, jamais comme le détecteur par
  défaut de piighost.
