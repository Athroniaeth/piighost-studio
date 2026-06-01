# Unifier playground + config sous « Playground » — conception

Date : 2026-06-01
Projet : piighost-website

## Objectif

Aujourd'hui le site expose deux entrées de navbar distinctes — **Playground**
(`/playground`, banc de test mono-détecteur) et **Config** (`/config`, builder de
pipeline). Les deux outils sont en réalité les deux faces d'un même parcours
(construire/éprouver un détecteur, puis le composer dans une pipeline), et leur
séparation dans la navigation brouille ce lien.

Objectif : **regrouper les deux interfaces sous une seule entrée « Playground »**,
avec une **barre d'onglets** qui bascule entre la vue **Détecteur** et la vue
**Config**, de sorte que les deux se complètent et se naviguent dans les deux
sens.

## Périmètre

Dans le périmètre :
- Navbar : une seule entrée « Playground » au lieu de deux.
- Déménagement de la route `/config` vers `/playground/config`.
- Une barre d'onglets partagée (Détecteur ⟷ Config) en haut des deux vues.
- Mise à jour des références internes et de l'i18n.

Hors périmètre :
- Aucun changement fonctionnel des deux outils eux-mêmes (le banc détecteur et le
  pipeline builder restent identiques, y compris le runtime Pyodide/piighost).
- Pas de fusion des deux vues en une seule (elles restent deux surfaces, juste
  reliées par les onglets).
- Pas de redirection de l'ancienne URL `/config` (projet jeune ; voir Décisions).

## Décisions

- **Structure** : sous-routes. `/playground` = Détecteur ; `/playground/config`
  = Config. Une seule entrée navbar « Playground » → `/playground`, active sur les
  deux routes. URLs propres, deep-link conservé, compatible export statique.
- **Vue par défaut** : l'entrée navbar ouvre `/playground` (Détecteur).
- **Onglets** : implémentés en `Link` (vraie navigation entre routes, pas un état
  client), stylés en segmented control. Deep-linkables et compatibles `output:
  export`.
- **Ancienne URL `/config`** : retirée, sans redirection. Le seul lien interne
  vers `/config` est la navbar (mis à jour). Les marque-pages externes éventuels
  tomberont sur la 404 — acceptable à ce stade.

## Architecture et changements

### Routes (`src/app`)
- **Inchangé** : `src/app/playground/page.tsx` (rend `DetectorPlayground`).
- **Déplacé** : `src/app/config/page.tsx` → `src/app/playground/config/page.tsx`
  (rend `ConfigBuilder`). Le dossier `src/app/config/` est supprimé.
- Les deux routes restent des pages statiques prérendues à l'export.

### Barre d'onglets (nouveau composant)
- `src/components/playground/playground-tabs.tsx` (client component) :
  - Deux onglets : **Détecteur** → `/playground`, **Config** → `/playground/config`.
  - Utilise `usePathname()` pour marquer l'onglet actif (la vue Config est active
    quand le chemin commence par `/playground/config`).
  - Rendu via `Link` (base-ui : pas de `asChild`, on suit les conventions du repo).
  - **Placement** : rendu comme **premier enfant du conteneur racine** de
    `DetectorPlayground` et de `ConfigBuilder` (les deux ont un conteneur
    `flex w-full flex-col p-4 lg:h-[calc(100dvh-4rem)]`). Ainsi la barre reste
    dans la mise en page pleine hauteur des deux vues, à un emplacement identique.
    On l'insère dans les composants, pas dans les `page.tsx` (qui restent de
    simples wrappers).

### Navbar (`src/components/site-navbar.tsx`)
- Remplacer les deux lignes :
  ```tsx
  <NavLink href="/playground" label={t.nav.playground} />
  <NavLink href="/config" label={t.nav.config} />
  ```
  par une seule entrée « Playground » → `/playground`, dont l'état actif couvre
  `/playground` et `/playground/config`. (Si `NavLink` ne gère l'actif que sur
  correspondance exacte, prévoir une variante « actif si le chemin commence par
  `/playground` ».)

### i18n
- Ajouter deux clés de libellés d'onglets dans le dictionnaire `playground`
  (`src/i18n/types.ts` + `en.ts` + `fr.ts`), p. ex. `tabDetector` / `tabConfig`
  ("Detector"/"Config", "Détecteur"/"Config").
- `nav.playground` reste pour l'entrée navbar. `nav.config` n'est plus utilisé par
  la navbar ; il peut être supprimé des trois fichiers i18n (type + 2 dicos) pour
  éviter une clé morte, ou réutilisé comme libellé d'onglet Config.

### Liens croisés (préservés)
- Le lien « Edit » par détecteur dans `ConfigBuilder` pointe vers
  `/playground?edit=<nom>` (charge ce détecteur dans la vue Détecteur). Inchangé —
  il reste valide puisque `/playground` ne bouge pas.
- Les détecteurs sauvegardés (localStorage) restent consommés par « Add from
  saved » de la vue Config. La barre d'onglets matérialise l'aller-retour.

## Tests

- **Navbar** (`src/components/site-navbar.test.tsx` si présent, sinon test ciblé) :
  une seule entrée « Playground », pas d'entrée « Config » ; l'entrée est active
  sur `/playground` et sur `/playground/config`.
- **Onglets** (`playground-tabs.test.tsx`) : rend deux onglets pointant vers
  `/playground` et `/playground/config` ; l'onglet actif suit `usePathname()`
  (mocké).
- **Non-régression** : `pnpm test` vert ; `pnpm build` prérend `/playground` et
  `/playground/config`.

## Critères de succès

- La navbar n'affiche qu'une entrée « Playground » (plus de « Config »).
- `/playground/config` rend le pipeline builder ; `/config` n'existe plus.
- Depuis l'une ou l'autre vue, la barre d'onglets bascule vers l'autre, avec
  l'onglet actif correct, et l'entrée navbar reste surlignée sur les deux.
- Aucune régression fonctionnelle des deux outils ; `pnpm build` et `pnpm test`
  verts.
