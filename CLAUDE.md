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
   hosting cost. Phase 1 (`/playground`) is a NER tool; later phases are
   roadmapped in `docs/ROADMAP.md`.

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

- **Browser-side ML** (`src/lib/ner.ts`). transformers.js runs token
  classification on ONNX models fetched from the HF CDN. Key details: pipelines
  are cached per model id and evicted on failure (so Retry re-downloads);
  `pickDevice()` probes for a real WebGPU adapter and falls back to WASM
  (onnxruntime won't fall back on its own). transformers.js returns BIO tokens
  with no character offsets, so `groupEntities()` rebuilds entity surfaces from
  WordPiece tokens and locates them via a forward-moving cursor — entities with
  internal punctuation are a known dropped case.

- **UI components.** shadcn/ui in the **base-ui** variant (`@base-ui/react`,
  `style: "base-nova"` in `components.json`), Tailwind v4 (config-less, CSS vars
  in `src/app/globals.css`), `lucide-react` icons. **base-ui buttons use the
  `render` prop, not `asChild`.** `src/components/ui/` is generated shadcn code;
  app components live in `src/components/`, landing sections in
  `src/components/landing/`, the playground in `src/components/playground/`.

- **Project metadata** is centralized in `src/lib/site.ts` (`projects` array →
  drives nav links and per-project pages via `getProject(slug)`).

- **Path alias** `@/*` → `src/*` (tsconfig + vitest config).

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
