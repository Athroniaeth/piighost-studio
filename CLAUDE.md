# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

Package manager is **pnpm** (not npm/yarn, despite README).

```bash
pnpm dev              # dev server (http://localhost:3000)
pnpm build            # static export to ./out (output: "export")
pnpm lint             # eslint
pnpm test             # vitest run (one-shot)
pnpm test:watch       # vitest watch
pnpm exec vitest run src/lib/ner.test.ts   # single test file
```

## What this is

The web surface of the **piighost** ecosystem (a Python PII-anonymization
library). Two things in one statically-exported Next.js app:

1. A multi-page **marketing site** — a landing page plus one page per project
   (`piighost`, `api`, `chat`, `proofreader`) and a Philosophy page. EN/FR,
   light/dark, full-screen with scroll-snap.
2. **Interactive tools** that run inference in the visitor's browser to avoid
   hosting cost. Two linked, backend-free pages: **`/playground`** is a
   single-detector test bench (regex / classic NER / browser GLiNER; the `llm`
   detector is disabled here), with save-to-localStorage; **`/config`** composes
   saved detectors into a full pipeline (detect → span resolve → entity link →
   entity resolve → anonymize), runs a live in-browser test of it, and exports
   the result as piighost TOML / Python. Later phases are roadmapped in
   `docs/ROADMAP.md`.

The guiding constraint is **avoid hosting as long as possible**: regex and NER
run client-side and are free; paid/server work is deferred to the last roadmap
phase. Read `docs/ROADMAP.md` before any feature work — it holds the product
direction and decisions that aren't derivable from the code.

## Architecture

- **Static export.** `next.config.ts` sets `output: "export"`, `trailingSlash`,
  unoptimized images, and MDX page extensions. No server runtime — no API
  routes, no server actions, no `next/image` optimization. Everything ships as
  static HTML/JS.

- **i18n is hand-rolled**, not next-intl/next's i18n routing. A React context
  (`src/i18n/language-provider.tsx`) holds the locale (persisted to
  `localStorage`, default `en`) and exposes the active dictionary. Components
  call `useT()` (`src/i18n/use-t.ts`) to get the typed `Dictionary`. All copy
  lives in `src/i18n/en.ts` / `src/i18n/fr.ts`, shape-checked against
  `src/i18n/types.ts`. Adding any user-facing text means editing the
  `Dictionary` type and both dictionaries. Because locale lives in client state,
  pages that render copy are client components.

- **Browser-side ML** (`src/lib/ner.ts`, `src/lib/gliner.ts`). transformers.js
  runs classic token classification (`ner.ts`) on ONNX models fetched from the
  HF CDN; the `gliner` package runs zero-shot span-level NER (`gliner.ts`). Both
  cache instances per model id, evict on failure (so Retry re-downloads), and
  probe for a real WebGPU adapter before falling back to WASM (onnxruntime won't
  fall back on its own). transformers.js returns BIO tokens with no character
  offsets, so `groupEntities()` rebuilds entity surfaces from WordPiece tokens
  and locates them via a forward-moving cursor — entities with internal
  punctuation are a known dropped case. GLiNER already gives character offsets.

- **Detector + pipeline model** (`src/lib/detector-config.ts`,
  `run-pipeline.ts`, `pipeline-export.ts`). A pipeline is a list of detector
  configs (`regex` via `regex-detect.ts`, `transformers`, `gliner2`, `llm`) plus
  post-detection stages. `runPipeline()` runs every enabled detector then
  `assemblePipeline()` applies the stages and assigns placeholder tokens (the 7
  styles must match piighost's real formats). The **`llm` detector never runs in
  the browser** — it is filtered out of the live test and the UI says so;
  `pipeline-export.ts` emits it for server-side execution and computes the
  required piighost extras. Detectors/pipelines persist to localStorage
  (`saved-detectors.ts`, `saved-pipelines.ts`); entity colors come from
  `labels.ts`.

- **UI components.** shadcn/ui in the **base-ui** variant (`@base-ui/react`,
  `style: "base-nova"` in `components.json`), Tailwind v4 (config-less, CSS vars
  in `src/app/globals.css`), `lucide-react` icons. **base-ui buttons use the
  `render` prop, not `asChild`.** `src/components/ui/` is generated shadcn code;
  app components live in `src/components/`, landing sections in
  `src/components/landing/`, the playground in `src/components/playground/`.

- **Project metadata** is centralized in `src/lib/site.ts` (`projects` array →
  drives nav links and per-project pages via `getProject(slug)`).

- **Path alias** `@/*` → `src/*` (tsconfig + vitest config).

- **onnxruntime / gliner bundling gotchas** (`next.config.ts`). The `gliner`
  package and `@xenova/transformers@2.17.2` fight the bundler in two ways, both
  worked around in `next.config.ts`: (1) Turbopack `resolveAlias` maps `fs` → an
  empty module and `path` → `path-browserify`, so the transformers env-probe
  doesn't crash on Node built-ins. (2) `gliner` statically imports
  `onnxruntime-web/webgl` and `.../webgpu`, whose `node` export condition is
  `null` and so cannot resolve in the server (SSR / static-prerender) bundle —
  `serverExternalPackages: ["gliner"]` keeps it out of that bundle (its runtime
  is browser-only anyway). Benign onnxruntime console warnings are filtered in
  `src/lib/onnx-log-filter.ts` (the console is patched).

## Conventions

- **Content style** (`docs/ROADMAP.md`): no em-dash and no "LLM"-flavored
  phrasing in user-facing copy; French uses correct accents.
- **piighost is detector-agnostic.** Never present GLiNER or any NER as the
  library's default detector — the playground offers regex / NER / LLM as peer
  options.
- **Workflow:** brainstorm → spec (`docs/superpowers/specs/`) → plan
  (`docs/superpowers/plans/`) → subagent-driven execution.
- Tests use Vitest + Testing Library + jsdom; co-locate `*.test.ts(x)` next to
  the source.
- **Responsive root font.** `globals.css` bumps the `html` font-size to `18px`
  (≥1920px) and `21px` (≥2560px) — a deliberate zoom for large displays. Because
  Tailwind sizes are in rem they scale with it. So **never use px arbitrary font
  sizes** (`text-[13px]`): they ignore the zoom and look abruptly small on big
  screens. Use the default scale (`text-sm`, …) or rem (`text-[0.8125rem]`).
