# piighost web surface — état et feuille de route

Dernière mise à jour : 2026-05-29

## Ce qu'est ce dépôt

La surface web de l'écosystème piighost. Deux choses dans le même projet :

1. **Site de présentation** (landing + une page par projet : piighost, api, chat,
   proofreader + page Philosophie), multi-pages, EN/FR, thème clair/sombre,
   inspiré de langchain.com. Objectif : adoption développeur.
2. **Outils interactifs** qui tournent au maximum côté navigateur pour éviter
   l'hébergement (voir feuille de route).

Stack : Next.js 16 (App Router, export statique), React 19, Tailwind v4,
shadcn/ui variante base-ui, i18n maison (contexte React + dictionnaires
`src/i18n`), transformers.js pour l'inférence navigateur. Gestionnaire : pnpm.

## État actuel

- Site de présentation : terminé (hero animé, problème en 2x2, fonctionnement
  en diaporama auto avec onglet « appels d'outils », detector en 2x2, écosystème,
  quickstart, CTA, page Philosophie, navbar avec dropdown projets + bascule
  langue, plein écran avec scroll-snap).
- **Phase 1 — Playground NER : terminée.** Route `/playground`, inférence NER
  100 % navigateur via transformers.js (ONNX, WASM avec repli, sonde WebGPU).
  Panneau de config (modèle réel, labels autorisés, seuil), saisie, sortie
  surlignée, liste d'entités ; filtrage labels/seuil en direct. Disposition
  unifiée plein écran. Modèles classiques : `Xenova/bert-base-multilingual-cased-ner-hrl`
  et `Xenova/bert-base-NER` (labels figés PER/ORG/LOC/MISC).
  - Spec : `docs/superpowers/specs/2026-05-29-ner-playground-design.md`
  - Plan : `docs/superpowers/plans/2026-05-29-ner-playground.md`
- **GLiNER zero-shot : intégré au playground.** Deux modèles GLiNER ajoutés au
  sélecteur (groupé « NER classique » / « GLiNER (zero-shot) ») :
  `onnx-community/gliner_small-v2.1` (~183 Mo, généraliste) et
  `onnx-community/gliner_multi_pii-v1` (~349 Mo, spécialisé PII). En mode GLiNER,
  les cases de labels figés laissent place à un champ de labels libres saisis par
  l'utilisateur. Runtime via le package `gliner` chargé dynamiquement (code-split,
  téléchargé seulement à l'usage) ; modèle et WASM servis depuis des CDN, sans
  hébergement. Deux ajustements nécessaires côté bundler (voir commits) : alias
  Turbopack `fs`/`path` pour @xenova/transformers, et `modelType: "span-level"`.
  Les avertissements console bénins d'onnxruntime sont filtrés volontairement
  (`src/lib/onnx-log-filter.ts`) ; la console est donc patchée, voir la spec.
  - Spec : `docs/superpowers/specs/2026-05-29-gliner-zero-shot-design.md`
  - Plan : `docs/superpowers/plans/2026-05-29-gliner-zero-shot.md`

## Feuille de route (validée en brainstorming)

Chaque phase est livrable seule. Contrainte directrice : **éviter au maximum
l'hébergement**. L'inférence lourde tourne dans le navigateur du visiteur tant
que possible ; on ne paie de l'infra qu'à la dernière phase.

- **Phase 2 — Playground de config piighost.** L'unité produit est un fichier
  TOML (`load_pipeline(path)` côté lib). On compose une pipeline : détecteurs
  regex (tournent dans le navigateur) + NER (navigateur, comme phase 1). Le
  détecteur LLM/Mistral est montré comme option « disponible au déploiement »
  (grisée), pas exécuté ici. Export du TOML et du code Python. Toujours sans
  backend.
- **Phase 3 — Sauvegarde privé/public + hub de configs.** Sauvegarde de
  configs par compte (privé/public), et un hub façon HuggingFace classant les
  configs les plus utilisées, testables « à chaud ». Premier vrai besoin de
  persistance : compte + base (serverless léger type Supabase). Seed possible
  depuis les TOML existants (`examples/detectors/common|europe|us`,
  `piighost-api/pipeline.toml`, `piighost-chat/pipeline.toml`).
- **Phase 4 — Déploiement de l'API.** Depuis une config, déployer une vraie
  instance piighost-api avec clé. OAuth2, provisioning, facturation. C'est ici
  que vivent gliner CPU hébergé et Mistral (payant). Le coût est porté par le
  revenu.

## Décisions et contraintes à garder en tête

- **Modèle commercial visé : open-core.** Lib libre (acquisition), payant =
  API hébergée (volume de requêtes, nombre de pipelines), Mistral métré.
- **piighost est agnostique au détecteur.** Ne jamais présenter GLiNER (ou un
  NER) comme le détecteur « par défaut » de la lib. Le playground propose
  gliner2/regex/LLM comme options, sans en faire un défaut.
- **GLiNER zero-shot (labels libres)** est la cible fidèle à piighost mais le
  support ONNX navigateur de `fastino/gliner2-multi-v1` reste à vérifier ; la
  phase 1 démarre donc sur du NER classique, GLiNER s'enfichera ensuite.
- Détecteurs et coûts d'exécution : regex = navigateur, gratuit ; NER = ONNX
  navigateur, gratuit (premier téléchargement à la charge du visiteur) ; LLM
  Mistral = appel réseau + clé, payant, reporté en phase 4.

## Conventions du dépôt

- Pas d'em-dash (`—`) ni de tournures « LLM » dans le contenu ; français avec
  accents corrects.
- base-ui : les boutons utilisent `render`, pas `asChild`.
- Brainstorming -> spec (`docs/superpowers/specs`) -> plan
  (`docs/superpowers/plans`) -> exécution pilotée par sous-agents.
