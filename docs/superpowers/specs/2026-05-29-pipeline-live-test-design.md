# Test live de la pipeline (approximation navigateur) — conception

Date : 2026-05-29
Projet : piighost-website

## Objectif

Sous les blocs du `/config`, offrir un banc de test qui exécute **toute la
pipeline** sur un texte saisi, en direct dans le navigateur, et affiche les
entités détectées surlignées **et** le texte anonymisé final.

C'est une **approximation assumée** : la détection (regex / NER classique /
GLiNER) tourne réellement dans le navigateur, mais les étapes
span_resolver / entity_linker / entity_resolver / anonymizer sont
**réimplémentées en JS** (le vrai moteur vit dans la lib Python). Le résultat
peut diverger du vrai piighost sur les bords ; l'UI le signale clairement.

## Périmètre

Dans le périmètre :
- Un panneau de test sous les blocs : saisie de texte, bouton, sortie.
- Exécution de la pipeline en JS : détection (détecteurs activés) → résolution
  des chevauchements → regroupement (liaison/résolution) → anonymisation.
- Deux sorties : surlignage des détections + liste, et le texte anonymisé.
- Étiquette « prévisualisation (approximation) » visible.

Hors périmètre :
- Fidélité exacte au moteur Python (hash SHA réel, arbitrage exact, fuzzy avancé).
- Détecteur `llm` (non exécutable navigateur), spaCy, chunked.
- Tout backend ou exécution Python (Pyodide / API) : reporté (phase 4).

## Architecture

Nouveau module pur `src/lib/run-pipeline.ts` :

- `placeholderToken(placeholder, label, value, ctx)` — produit le jeton selon le
  style, où `ctx` porte les compteurs (par label et global) et un cache
  valeur→jeton pour la cohérence. Formats (approximatifs, alignés sur la lib) :
  - `label_counter` → `<<LABEL:n>>` (compteur par label)
  - `label_hash` → `<<LABEL:hash>>`
  - `label` → `<<LABEL>>`
  - `mask` → première lettre + `maskChar` répété
  - `redact_counter` → `<<REDACT:n>>` (compteur global)
  - `redact_hash` → `<<REDACT:hash>>`
  - `redact` → `<<REDACT>>`
- `assemblePipeline(detections, pipeline, text): { entities, anonymized }` (pur) :
  1. **Résolution des chevauchements** : si `spanResolver === "disabled"`, garder
     tout ; sinon trier par score décroissant et retenir les spans non
     chevauchants (les autres sont écartés).
  2. **Regroupement** : clé de groupe par entité = `label` + valeur normalisée.
     Normalisation : `fuzzy` → minuscule + trim ; sinon valeur exacte. Si
     `entityLinker === "disabled"` ET `entityResolver === "disabled"`, pas de
     regroupement (chaque occurrence est indépendante).
  3. **Anonymisation** : attribuer un jeton par groupe via `placeholderToken`,
     puis reconstruire le texte (segments ordonnés par position, entités
     remplacées par leur jeton).
  - Renvoie les entités retenues (pour le surlignage) et le texte anonymisé.
- `runPipeline(pipeline, text): Promise<{ entities, anonymized }>` (async) :
  lance chaque détecteur **activé** via `runDetector`, filtre chaque résultat par
  le seuil de sa config (`transformers`/`gliner2` ; regex = score 1), réunit les
  détections, puis appelle `assemblePipeline`.

`hashValue(value, length)` : hash JS déterministe court (hex tronqué) — explicite
ment approximatif, pas le SHA-256 canonique de la lib.

## Interface

Dans `config-builder.tsx`, sous la rangée de blocs : un panneau de test qui
remplit le bas de la page.
- Gauche : zone de texte (pré-remplie avec l'exemple), bouton « Tester ».
- Droite : surlignage des détections (réutilise `EntityHighlight` + couleurs) +
  liste d'entités, puis le **texte anonymisé** dans un encart.
- Une mention « prévisualisation (approximation) » près du panneau.
- États : repos / en cours (spinner) / résultat / erreur (réessayer), comme le
  banc du playground.
- Les boutons Export / Sauvegarder restent en bas à droite.

## Flux de données

1. L'utilisateur compose la pipeline (blocs) et saisit un texte.
2. « Tester » → `runPipeline(pipeline, text)` → surlignage + texte anonymisé.
3. Re-tester après toute modification de la pipeline ou du texte.

## Gestion des erreurs

- Aucun détecteur activé → message invitant à en ajouter (pas d'exécution).
- Échec de chargement/inférence d'un détecteur → état d'erreur + « Réessayer ».
- Détecteur `llm` présent et activé → ignoré pour l'exécution (mention).

## Tests (TDD, Vitest)

Module pur `run-pipeline` :
- `placeholderToken` : chaque style produit le bon format ; compteurs par
  label / global ; même valeur → même jeton via le cache.
- `assemblePipeline` :
  - résolution des chevauchements (gardé vs écarté selon le score) ;
  - regroupement exact vs fuzzy vs désactivé ;
  - texte anonymisé reconstruit correctement (positions, multiplicité).
- `hashValue` : déterministe, longueur respectée.

La détection (modèles) et l'UI sont vérifiées dans le navigateur.

## Conventions

- Pas d'em-dash ni de tournures « LLM » dans le contenu visible ; français avec
  accents corrects.
- base-ui : boutons via `render`, pas `asChild`.
- Le caractère approximatif est affiché ; on ne présente jamais ce test comme le
  moteur réel.
