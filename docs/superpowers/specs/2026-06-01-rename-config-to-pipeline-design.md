# Renommer la vue « Config » en « Pipeline » — conception

Date : 2026-06-01
Projet : piighost-website

## Objectif

Le second onglet du playground, libellé **« Config »**, est ambigu : on ne
comprend pas « ce qu'on configure ». En réalité cette vue **assemble des
détecteurs et des étapes en une pipeline** (elle parle déjà de « pipeline » en
interne : « Save pipeline », blocs de pipeline, export de pipeline). Le libellé
« Config » est l'intrus. On le renomme en **« Pipeline »** pour aligner le nom
visible sur ce que fait la vue. La vue **« Détecteur »** (configurer/éprouver un
détecteur isolé) garde son nom.

## Périmètre

Dans le périmètre (uniquement le visible + l'URL) :
- Libellé d'onglet « Config » → « Pipeline » (EN + FR).
- Route `/playground/config` → `/playground/pipeline`.
- Titre de page (`metadata.title`) « Config » → « Pipeline ».
- Mise à jour de la barre d'onglets (href + détection d'onglet actif) et de son
  test.

Hors périmètre :
- Aucun changement fonctionnel des deux vues.
- Le nom interne du composant `ConfigBuilder` reste (on ne touche qu'à
  l'interface visible et à la route).
- Le panneau « Configuration » interne à la vue Détecteur (réglage du type/modèle
  du détecteur) garde son titre — il configure bien le détecteur, c'est cohérent.
- Le lien croisé « Edit » → `/playground?edit=<nom>` reste inchangé.

## Décisions

- L'ancienne URL `/playground/pipeline` remplace `/playground/config` sans
  redirection (route récente, pas de marque-page externe).
- La clé i18n `playground.tabConfig` est renommée `playground.tabPipeline` pour la
  clarté du code (valeur « Pipeline » dans les deux dictionnaires).

## Changements

- **Route** : déplacer `src/app/playground/config/page.tsx` →
  `src/app/playground/pipeline/page.tsx`. Mettre `metadata.title` à « Pipeline ».
- **`src/components/playground/playground-tabs.tsx`** :
  - href du second onglet : `/playground/config` → `/playground/pipeline`.
  - détection active : `pathname.startsWith("/playground/pipeline")`.
  - libellé : `t.playground.tabPipeline`.
- **i18n** (`types.ts`, `en.ts`, `fr.ts`) : renommer `tabConfig` → `tabPipeline` ;
  valeur « Pipeline » (EN et FR).
- **`playground-tabs.test.tsx`** : href attendu `/playground/pipeline`, libellé
  « Pipeline », chemins actifs mis à jour ; le mock `useT` expose `tabPipeline`.

## Critères de succès

- L'onglet affiche **« Pipeline »** ; il pointe vers `/playground/pipeline` et est
  actif sur cette route ; la navbar « Playground » reste surlignée.
- `/playground/config` renvoie 404 ; `/playground/pipeline` rend le builder.
- `pnpm test` vert ; `pnpm build` prérend `/playground` et `/playground/pipeline`.
