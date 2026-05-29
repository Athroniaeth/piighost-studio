# Playground NER (phase 1) — conception

Date : 2026-05-29
Projet : piighost-website

## Objectif

Offrir un playground de reconnaissance d'entités nommées (NER) qui tourne
**entièrement dans le navigateur du visiteur**, sans backend ni hébergement
d'inférence. C'est la première brique d'un parcours plus large (phase 2 :
playground de config piighost ; phase 3 : sauvegarde et hub de configs ;
phase 4 : déploiement de l'API). Cette phase ne dépend d'aucune des suivantes.

## Périmètre

Dans le périmètre :
- Une page `/playground` sur le site statique actuel (`output: export`).
- Inférence NER côté client via transformers.js (ONNX en WASM, WebGPU si dispo).
- Saisie de texte, sélection du modèle, sortie surlignée + table des entités.
- i18n EN/FR de l'interface.

Hors périmètre (phases ultérieures) :
- Détecteurs regex, LLM/Mistral, GLiNER zero-shot.
- Toute notion de config piighost, de compte, de sauvegarde, de déploiement.
- Tout backend ou persistance.

## Choix techniques

- **Bibliothèque** : `@huggingface/transformers` (transformers.js v3), importée
  **dynamiquement dans un composant client** uniquement, pour ne rien casser au
  build statique et au rendu serveur.
- **Modèle par défaut** : `Xenova/bert-base-multilingual-cased-ner-hrl`
  (multilingue, couvre EN et FR, labels `PER` / `ORG` / `LOC`). Un second modèle
  anglais (`Xenova/bert-base-NER`) est proposé dans le sélecteur. Les fichiers du
  modèle sont récupérés depuis le CDN HuggingFace au premier usage.
- **Exécution** : pipeline `token-classification`. Chargement **paresseux** au
  premier « Analyser » ; l'instance du pipeline est mise en cache (singleton de
  module) pour les analyses suivantes. `progress_callback` alimente une barre de
  progression pendant le téléchargement. `device` en WASM par défaut, WebGPU si
  disponible.

## Composants

- `src/app/playground/page.tsx` — page (metadata) qui rend le composant client.
- `src/components/playground/ner-playground.tsx` — orchestrateur client : état
  (idle / téléchargement / warmup / prêt / analyse / erreur), zone de texte,
  sélecteur de modèle, bouton, barre de progression, affichage des résultats.
- `src/lib/ner.ts` — enrobage transformers.js : `loadNer(modelId, onProgress)`,
  `runNer(text)`, et surtout `groupEntities(tokens)` (fonction pure, testable).
- `src/components/playground/entity-highlight.tsx` — reconstruit le texte en
  segments à partir des offsets caractère des entités et surligne par label
  (réutilise le style ambre/indigo et les `Badge` existants).
- Ajout d'une section `playground` aux dictionnaires `en.ts` / `fr.ts` et du
  type correspondant dans `types.ts`.
- Lien « Playground » ajouté à la navbar.

## Regroupement des entités (point sensible)

transformers.js renvoie des entités **au niveau du token** (préfixes `B-`/`I-`,
sous-mots `##`). Il faut une fonction pure `groupEntities` qui :
- fusionne les tokens consécutifs d'un même type (`B-PER` puis `I-PER`),
- recolle les sous-mots `##`,
- produit des spans `{ text, label, score, start, end }` avec offsets caractère
  dans le texte d'origine (on s'appuie sur les `start`/`end` fournis par le
  pipeline quand ils existent, sinon on recalcule par recherche progressive),
- moyenne (ou prend le min) des scores des tokens d'un span.

C'est la seule logique non triviale ; elle est isolée et couverte par des tests.

## États et UX

- **idle** : exemple pré-rempli, bouton « Analyser » actif.
- **téléchargement** : barre de progression (% global des fichiers du modèle).
- **warmup / analyse** : indicateur d'activité, bouton désactivé.
- **prêt** : texte surligné + légende des labels + table (texte, label, score).
- **erreur** : message clair (modèle indisponible, WebGPU/WASM, réseau) avec
  possibilité de réessayer.
- Premier chargement = quelques dizaines à ~300 Mo selon le modèle ; on
  l'annonce dans l'UI. Ensuite c'est caché et instantané.

## Tests

- Tests unitaires de `groupEntities` (Vitest) sur des sorties de tokens
  fabriquées : fusion B/I, sous-mots `##`, entités adjacentes de types
  différents, offsets corrects. Le modèle lui-même n'est pas testé en jsdom.

## Risques

- Taille du premier téléchargement : atténuée par la barre de progression et le
  cache navigateur ; on choisit des modèles de taille raisonnable.
- Compatibilité navigateur (WebGPU non garanti) : repli WASM systématique.
- Le NER classique a des labels figés (moins « piighost ») : assumé pour la
  phase 1 ; un mode GLiNER zero-shot sera évalué ensuite et viendra s'enficher
  dans le même playground.
