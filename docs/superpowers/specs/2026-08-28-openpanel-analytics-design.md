# Intégration OpenPanel (analytics) — design

Date : 2026-08-28
Branche : `feat/add-openpanel`

## Objectif

Ajouter un suivi analytics au site web piighost via une instance **OpenPanel
auto-hébergée**, en respectant deux contraintes du projet :

1. **Export statique** (`next.config.ts` : `output: "export"`, aucun runtime
   serveur) — le suivi doit être 100 % côté client.
2. **Vie privée** — le produit anonymise des PII ; aucune donnée saisie par
   l'utilisateur ne doit jamais atteindre l'analytics.

Instance auto-hébergée du client :

- Dashboard : `https://opdashboard.athroniaeth.cloud:3000`
- API : `https://opapi.athroniaeth.cloud`
- Worker, Postgres, Redis, ClickHouse : gérés par le déploiement (Coolify).

## Contrainte d'architecture

Comme le site est un export statique, il n'y a **pas** de route `/api/op`
possible (cela exigerait un serveur Next.js). Le SDK tape donc **directement**
l'API auto-hébergée :

- `apiUrl = https://opapi.athroniaeth.cloud` (destination des événements)
- `scriptUrl = https://openpanel.dev/op1.js` (loader générique servi par le CDN)

> **Découvert au test live :** l'API auto-hébergée ne sert **pas** `op1.js`
> (`opapi.athroniaeth.cloud/op1.js` → 404). `op1.js` est un loader générique qui
> lit `apiUrl` à l'exécution ; on le charge donc depuis le CDN OpenPanel
> (`https://openpanel.dev/op1.js`, 200) tandis que les événements partent bien
> vers l'instance auto-hébergée. C'est le schéma documenté du self-hosting.

Conséquence assumée : pas de proxy anti-bloqueur de pub (impossible sans
serveur). Acceptable pour ce projet.

Package : `@openpanel/nextjs` (`OpenPanelComponent` + hook `useOpenPanel`),
compatible App Router + export statique (100 % client).

## Configuration

`clientId` fourni par une variable d'environnement publique
`NEXT_PUBLIC_OPENPANEL_CLIENT_ID` (inlinée au build). L'`apiUrl` et le
`scriptUrl` sont des constantes (l'instance auto-hébergée est fixe), mais on les
expose aussi via variables d'env optionnelles pour rester flexible :

- `NEXT_PUBLIC_OPENPANEL_CLIENT_ID` (requis pour activer le suivi)
- `NEXT_PUBLIC_OPENPANEL_API_URL` (défaut : `https://opapi.athroniaeth.cloud`)
- `NEXT_PUBLIC_OPENPANEL_SCRIPT_URL` (défaut : `https://openpanel.dev/op1.js`)

Si `NEXT_PUBLIC_OPENPANEL_CLIENT_ID` est **absent**, le composant n'est pas
monté → **aucun suivi** (utile en dev/local ; pas de crash, pas d'events
parasites). Le `clientId` est public par nature (il finit dans le bundle client).

Le **Secret** OpenPanel (`sec_...`) n'est **jamais** utilisé ni committé : il ne
sert qu'aux événements serveur, hors périmètre (export statique).

Fichiers touchés pour la config :

- `.env.example` (nouveau) — documente les variables ; committé.
- `.gitignore` — ajouter `!.env.example` car `.env*` est ignoré globalement.
- `src/app/layout.tsx` — montage du composant.

## Vie privée (contrainte dure)

Règle non négociable : **aucun texte saisi, aucune entité détectée, aucun
contenu de span** n'est envoyé à l'analytics. Seules des **métadonnées non
identifiantes** (type de détecteur, compteurs, durée, format d'export).

Suivi **sans cookie, sans bannière** : OpenPanel fonctionne sans cookie par
défaut (empreinte anonymisée côté serveur), cohérent avec l'éthos du produit et
généralement conforme RGPD sans bannière de consentement.

## Composants

### 1. Montage du composant — `src/app/layout.tsx`

Un composant client léger `src/components/analytics/openpanel.tsx` encapsule
`OpenPanelComponent` et la lecture des variables d'env. Il retourne `null` si le
`clientId` est absent.

```tsx
"use client";
import { OpenPanelComponent } from "@openpanel/nextjs";

export function Analytics() {
  const clientId = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;
  if (!clientId) return null;
  const apiUrl = (
    process.env.NEXT_PUBLIC_OPENPANEL_API_URL ?? "https://opapi.athroniaeth.cloud"
  ).replace(/\/$/, "");
  const scriptUrl =
    process.env.NEXT_PUBLIC_OPENPANEL_SCRIPT_URL ?? "https://openpanel.dev/op1.js";
  return (
    <OpenPanelComponent
      apiUrl={apiUrl}
      scriptUrl={scriptUrl}
      clientId={clientId}
      trackScreenViews
      trackOutgoingLinks
    />
  );
}
```

Monté une fois dans `layout.tsx` (dans le `body`, à côté des providers). Les
pages vues (screen views) sur changement de route sont alors automatiques.

### 2. Wrapper d'événements — `src/lib/analytics.ts`

Centralise les noms d'événements et **garantit par le typage** qu'on ne passe
que des métadonnées (primitifs), jamais de texte utilisateur. Type d'union
fermé des événements autorisés :

```ts
type AnalyticsEvent =
  | { name: "detector_run"; props: { detectorType: string; entityCount: number; durationMs: number; modelId?: string } }
  | { name: "detector_saved"; props: { detectorType: string } }
  | { name: "pipeline_run"; props: { detectorCount: number; entityCount: number } }
  | { name: "pipeline_exported"; props: { format: "toml" | "python"; detectorCount: number } };
```

Un hook `useTrack()` retourne une fonction `track(event)` typée qui délègue à
`useOpenPanel().track(name, props)`. Si OpenPanel n'est pas initialisé (pas de
`clientId`), l'appel est un no-op silencieux.

### 3. Points d'instrumentation

| Événement | Propriétés | Déclencheur (composant / lib) |
|---|---|---|
| `detector_run` | `detectorType`, `entityCount`, `durationMs`, `modelId?` | banc de test détecteur (`detector-playground.tsx`) |
| `detector_saved` | `detectorType` | sauvegarde d'un détecteur |
| `pipeline_run` | `detectorCount`, `entityCount` | test live du pipeline (`config-builder.tsx`) |
| `pipeline_exported` | `format`, `detectorCount` | export TOML / Python |

Les points exacts sont identifiés à l'implémentation ; l'instrumentation reste
minimale et ne touche pas la logique métier (appels `track(...)` en marge).

## Flux de données

1. Chargement de page → `Analytics` monte `OpenPanelComponent` → le script
   `op1.js` est chargé depuis le **CDN** `openpanel.dev` → `init` avec le
   `clientId` et l'`apiUrl` auto-hébergée.
2. Navigation → screen view automatique envoyée à `opapi.athroniaeth.cloud/track`.
3. Action outil (run/save/export) → `track(event)` → event métadonnées envoyé.

Aucune donnée ne transite par un serveur du site (il n'y en a pas) ; tout part
du navigateur vers l'API OpenPanel.

## Gestion des erreurs

- `clientId` absent → composant non monté, `track` no-op. Pas de crash.
- API injoignable / CORS non configuré → le SDK échoue silencieusement côté
  réseau ; l'app n'est pas impactée (pas de dépendance bloquante).
- Le `track` typé empêche à la compilation l'envoi de clés non prévues.

## Tests

1. **Unitaire** `src/lib/analytics.test.ts` : vérifie que `track` appelle bien la
   fonction sous-jacente avec le bon nom et les bonnes props, et — garde-fou
   principal — que la surface d'API n'accepte que les événements/props typés
   (aucune clé de texte libre). Mock du hook `useOpenPanel`.
2. **Build statique** : `pnpm build` doit réussir avec l'export (`output:
   "export"`) — le composant ne doit pas casser la prérendu statique.
3. **Lint** : `pnpm lint`.
4. **Manuel** (avec vrai `clientId`) : lancer le dev/preview, ouvrir le
   playground, exécuter un détecteur, vérifier dans le dashboard OpenPanel que
   la page vue et l'event `detector_run` arrivent.

## À faire côté OpenPanel (validé au test live)

1. Le projet/client est créé. `clientId` :
   `66c9779d-9dfb-433c-acda-13ec88907038` (temporaire, fourni par l'utilisateur).
2. **Action critique — autoriser l'origine (CORS) du site dans le client.**
   Sans cela, l'API répond `401 « Invalid cors or secret »` sur `/track` (vérifié
   au test). Dans le dashboard → le client → « Cross-origin (CORS) » / domaines
   autorisés, ajouter le domaine de production du site **et**
   `http://localhost:3000` + `http://localhost:3001` pour les tests locaux.
3. Renseigner `NEXT_PUBLIC_OPENPANEL_CLIENT_ID` dans l'environnement de build
   (Coolify / `.env` local).
4. Ne PAS attendre que l'API serve `op1.js` : elle renvoie 404. Le loader est
   chargé depuis le CDN `openpanel.dev` (défaut du composant).

## Hors périmètre (YAGNI)

- Événements serveur (pas de serveur).
- Bannière de consentement / gestion opt-in (mode sans cookie retenu).
- Proxy anti-bloqueur de pub (impossible en export statique).
- Suivi d'identité utilisateur / `identify` (pas d'auth sur le site).
