# SEO & GEO optimization — design

Date: 2026-08-28
Branch: `feat/seo-optimization` (from `develop`)
Status: draft, awaiting review

## Goal

Make the piighost website discoverable and citable by both classic search
engines (Google, Bing) and generative engines / AI assistants (ChatGPT,
Claude, Perplexity, Gemini), so that people searching for a PII anonymization
solution find piighost and so that LLMs recommend the library.

Two audiences, established by keyword research (see
`docs/superpowers/specs/2026-08-28-seo-research-notes.md` for the full research
appendix): the AI-app developer ("send customer data to an LLM without leaking
it") and the compliance/data engineer ("stay GDPR-compliant when calling an
LLM"). The public searches for **anonymization / redaction / masking**, while
the library is technically **reversible pseudonymization** — we surface the
public's words in titles and meta, keep the precise term in body copy.

## Non-goals

- No paid SEO, no analytics/tracking install.
- No new marketing pages beyond a FAQ section (comparison pages like
  "piighost vs Presidio" are deferred; captured as a follow-up in the off-site
  doc).
- Off-site work (GitHub README, PyPI, awesome-lists, Reddit) ships as a
  **recommendations document**, not as changes in this repo.

## Decisions (from brainstorming)

1. **i18n for SEO: URL-driven `/en` + `/fr` with hreflang.** The current i18n
   is client-only (locale in `localStorage`, one URL), so French never appears
   in the static HTML and is invisible to every crawler. We refactor to
   URL-driven locales so both languages get real, indexable static pages.
2. **Content scope: technical foundations + a FAQ section** with `FAQPage`
   structured data (the format most cited by LLMs), added to the landing page.
3. **Off-site: a recommendations doc** under `docs/`.

## Hard constraints

- **Static export** (`output: "export"`, `trailingSlash: true`). No server
  runtime: no API routes, no server actions, no middleware, no runtime
  redirects, no `next/image` optimization. Everything renders at build time.
  Metadata files (`sitemap.ts`, `robots.ts`, `manifest.ts`,
  `opengraph-image.tsx`) work **only** if they never read the request.
- **AGENTS.md**: this Next.js has breaking changes; read
  `node_modules/next/dist/docs/` before touching routing/metadata conventions.
- **Content style** (CLAUDE.md / ROADMAP): no em-dash, no "LLM"-flavored
  phrasing in user-facing copy, correct French accents. piighost is
  **detector-agnostic** — never present GLiNER/NER as the default detector;
  regex / NER / LLM are peer options.
- **No px font sizes** (`text-[13px]`); use the rem scale.
- **Marketing pages must not pull in the ML bundle** (`ner.ts`/`gliner.ts`);
  those stay dynamically imported by the tool pages only.

## Current state (audit)

- `layout.tsx` has a decent base: `metadataBase: https://piighost.dev`,
  `title.template`, a description, a minimal `openGraph`. Missing: Twitter card,
  canonical/alternates, `robots`, JSON-LD.
- Per-page metadata is thin: `{ title: "..." }` only, no unique `description`,
  no canonical, no per-page OG.
- Missing entirely: `sitemap`, `robots`, `manifest`, OG image, `llms.txt`,
  structured data.
- `philosophy/page.tsx` is `"use client"` → cannot export `metadata`. All other
  pages are already server components that isolate interactivity in client
  children (good pattern to preserve).
- `LanguageProvider` initializes `useState` to `"en"` and reads `localStorage`
  only in `useEffect`, so **the static HTML already contains the English copy**
  — crawlers (including JS-less AI crawlers) see it. This is why EN indexing
  works today and FR does not.
- Routes today: `/`, `/piighost`, `/api`, `/chat`, `/proofreader`,
  `/philosophy`, `/playground`, `/playground/detector`.
- Self-hosted behind `nginx.conf` → real 301 redirects are available at the
  edge (used for the bare-`/` and legacy-path redirects below).

## Architecture

Five workstreams. WS1 (i18n) is the structural one and lands first because
every other workstream references locale-aware URLs.

### WS1 — URL-driven i18n (`/en`, `/fr`) + hreflang

**URL structure.** Introduce a `[lang]` dynamic segment. Every current route
moves under it and is statically generated for both locales:

```
src/app/
  layout.tsx                      # minimal root: <html>/<body>, providers-free shell
  [lang]/
    layout.tsx                    # generateStaticParams -> en, fr; sets <html lang>, providers, navbar/footer, generateMetadata (canonical + hreflang)
    page.tsx                      # home
    piighost/page.tsx  api/page.tsx  chat/page.tsx  proofreader/page.tsx
    philosophy/page.tsx           # now server; content moved to a client child
    playground/page.tsx  playground/detector/page.tsx
  page.tsx                        # bare "/" redirect stub (fallback; nginx does the real 301)
  sitemap.ts robots.ts manifest.ts opengraph-image.tsx   # build-time metadata files
```

Resulting URLs: `/en/`, `/fr/`, `/en/piighost/`, `/fr/piighost/`, etc.
(trailing slash preserved).

**Root layout vs `[lang]` layout.** Per the Next App Router i18n pattern, the
`<html lang={lang}>`/`<body>` and all providers live in
`src/app/[lang]/layout.tsx` (it has access to `params.lang`). The root
`src/app/layout.tsx` stays as thin as Next allows. Exact split to be confirmed
against the local Next docs during implementation (AGENTS.md) — the reference
i18n example is the source of truth for whether a root `layout.tsx` is still
required and where `<html>` must live.

**Locale source of truth becomes the URL.** `LanguageProvider` receives the
active locale as a prop (from `params.lang`) instead of defaulting to `"en"` +
`localStorage`. `useT()` returns the dictionary for that locale. `localStorage`
is demoted to a *preference hint* used only by the bare-`/` redirect, not the
source of truth (removes the FOUC where content flips language after
hydration).

**Language toggle becomes navigation.** `language-toggle.tsx` stops calling
`setLocale` (state) and instead links to the same path under the other locale
prefix (e.g. `/en/piighost/` ⇄ `/fr/piighost/`), writing the chosen locale to
`localStorage` as a hint. It derives the current path from `usePathname()` and
swaps the leading segment.

**Bare `/` handling.**
- Primary: `nginx.conf` 301 `/` → `/en/` (and legacy `/piighost/` → `/en/piighost/`, etc.).
- Fallback (if the `out/` is ever served without nginx): `src/app/page.tsx`
  renders a tiny stub that client-redirects to the `localStorage` hint or
  `navigator.language` (fr → `/fr/`, else `/en/`), plus a `<noscript>` meta
  refresh to `/en/`. This stub is marked `robots: noindex`.

**hreflang + canonical.** `[lang]/layout.tsx` `generateMetadata` (or each page's
`generateMetadata`) emits, per page:
```ts
alternates: {
  canonical: `/${lang}${path}`,
  languages: { en: `/en${path}`, fr: `/fr${path}`, "x-default": `/en${path}` },
}
```
`metadataBase` (already `https://piighost.dev`) resolves the relative URLs.

**Static export viability.** Dynamic segments export fine **iff**
`generateStaticParams` is provided (it is, returning en/fr). Every leaf page
under `[lang]` needs its params resolvable at build. No request-time reads
anywhere. This is the one workstream that must be validated early with an actual
`pnpm build` (see Testing).

### WS2 — Technical SEO foundations

All build-time, all static-export safe.

- **`src/app/robots.ts`** → `robots.txt`. Allow everything, **explicitly list
  the AI crawlers** so intent is unambiguous: `GPTBot`, `OAI-SearchBot`,
  `ChatGPT-User`, `ClaudeBot`, `anthropic-ai`, `Claude-SearchBot`,
  `Claude-User`, `PerplexityBot`, `Perplexity-User`, `Google-Extended`,
  `Bingbot`, `CCBot`, plus `*`. Point to the sitemap. (piighost is open source
  and *wants* to be in training + retrieval corpora, so allow-all is correct.)
- **`src/app/sitemap.ts`** → `sitemap.xml`. Enumerate both locales for every
  route, driven by `src/lib/site.ts` (projects) + a static route list. Include
  `alternates.languages` per entry. URLs carry the trailing slash to match
  `trailingSlash: true` (canonical/sitemap must agree).
- **Per-page metadata.** Every page gets a unique, keyword-aware `title` and
  `description` (public vocabulary: "anonymize PII before it reaches the LLM",
  "GDPR", "Python", "regex / NER / LLM", "Presidio alternative" where honest),
  `alternates.canonical`, and per-page `openGraph`. Copy lives in the i18n
  dictionaries so titles/descriptions are localized (new `seo` section in the
  `Dictionary` type + both dictionaries).
- **Twitter card + OG completion** in `[lang]/layout.tsx`:
  `twitter: { card: "summary_large_image", ... }`, `openGraph.siteName`,
  `openGraph.locale` per lang (`en_US` / `fr_FR`).
- **`src/app/opengraph-image.tsx`** (`next/og` `ImageResponse`, 1200×630,
  rendered to PNG at build). One global image; no request-time data. Optionally
  per-project later.
- **`src/app/manifest.ts`** → `manifest.webmanifest` (name, theme color,
  icons).
- **Structured data (JSON-LD).** A small `src/lib/jsonld.ts` returning typed
  objects + a server `<JsonLd data={...} />` component:
  - `Organization` + `WebSite` in `[lang]/layout.tsx`, with `sameAs`
    (GitHub, PyPI).
  - `SoftwareApplication` + `SoftwareSourceCode` on `/piighost`
    (`programmingLanguage: Python`, free `offers`, `codeRepository`, license).
  - `BreadcrumbList` on project pages.
  - `FAQPage` on the landing (WS4).
  - One **canonical one-liner description** reused verbatim across JSON-LD,
    meta, llms.txt, and the off-site doc, to reinforce the "piighost" entity.
- **Semantic HTML / a11y.** Verify one `<h1>` per page, ordered headings,
  `<nav aria-label>`, `<footer>`, `alt` on images. Fix as found (targeted, not
  a broad refactor).

### WS3 — `llms.txt`

`public/llms.txt` (served at root in static export) following the llmstxt.org
format: `# piighost` → blockquote summary (the canonical one-liner) → key facts
list → `## Documentation` / `## Guides` link sections. Low expected short-term
payoff (no major provider consumes it yet) but near-zero cost and good hygiene.
Kept in sync with `site.ts` links. Marked P3 — ships but last.

### WS4 — FAQ section + `FAQPage` schema

A FAQ section on the landing page (new landing component
`src/components/landing/faq.tsx`), copy in the i18n dictionaries (EN + FR),
questions phrased as developers ask assistants:

- How do I anonymize PII before sending a prompt to an LLM in Python?
- What is the difference between regex, NER and LLM detection?
- How do I use piighost with LangChain / Pydantic AI / LlamaIndex?
- Is piighost GDPR-compliant? How do stable placeholders work?
- Does the data stay local? What is sent to the model?

Each answer: a direct, self-contained 40–60 word lead sentence, then detail.
Rendered as visible content (Google requires FAQ schema to match visible copy)
and mirrored into `FAQPage` JSON-LD. Respects the style guide (no em-dash, no
"LLM"-flavored phrasing, detector-agnostic).

### WS5 — Off-site recommendations doc

`docs/seo/off-site-recommendations.md`: the canonical one-liner; a suggested
GitHub README skeleton (badges, working quickstart, detector table, integrations,
FAQ); PyPI summary + classifiers + keywords (`pii`, `anonymization`, `gdpr`,
`llm`, `ner`); target awesome-lists; Reddit/HN/Stack Overflow guidance
(value-first); deferred comparison-page ideas ("piighost vs Presidio").
Documentation only — no repo code depends on it.

## Data flow

Build time: `generateStaticParams` fans every route across `{en, fr}` →
each page renders its localized dictionary into static HTML + head metadata →
`sitemap.ts`/`robots.ts`/`manifest.ts`/`opengraph-image.tsx` emit their files →
`public/llms.txt` and `public/*` copy through. Result in `out/`: two fully
static localized trees, correct `<html lang>`, canonical + hreflang in every
head, JSON-LD inline, sitemap/robots/llms at root. Runtime: nginx 301s bare `/`
and legacy paths to `/en/*`.

## Testing / verification

- `pnpm build` must succeed with `output: export` — the WS1 gate. Do this
  first, before layering WS2+.
- `pnpm lint` and `pnpm test` green.
- Inspect `out/`: `curl`/grep a content phrase from `out/en/index.html` and
  `out/fr/index.html` to confirm **localized copy is in the static HTML** (the
  decisive AI-crawler test). Confirm `sitemap.xml`, `robots.txt`,
  `manifest.webmanifest`, `opengraph-image` PNG, `llms.txt` exist in `out/`.
- Validate JSON-LD shape (schema.org types well-formed) and that canonical +
  hreflang resolve to absolute `https://piighost.dev/...` URLs with trailing
  slashes.
- Confirm no ML bundle leaks into marketing page chunks (inspect the build
  output / chunk graph).
- Manual: language toggle navigates `/en` ⇄ `/fr` preserving the path; bare `/`
  redirect works.

## Risks / open questions

- **WS1 blast radius.** Moving every route under `[lang]` touches all pages,
  the navbar/footer links, `site.ts` `navLinks` (must become locale-aware or
  the components prefix at render), internal `<Link>`s, and the toggle. This is
  the main risk; it lands and is `pnpm build`-verified before anything else.
- **Legacy URLs change** (`/piighost/` → `/en/piighost/`). Mitigated by nginx
  301s; low real cost since the site is pre-launch.
- **Root layout / `<html>` placement** under `[lang]` must match this Next
  version's rules — resolve against local docs before coding, do not assume.
- **`playground`/`detector` localized twice**: acceptable; they carry canonical
  + hreflang like everything else. Keep them in the sitemap at lower priority.
- **hreflang correctness**: never emit an hreflang to a URL that will not exist;
  both locales are generated for every route, so pairs are always valid.

## Sequencing

WS1 (build-verified) → WS2 → WS4 → WS3 → WS5. Each is independently testable;
WS1 is the prerequisite for the locale-aware URLs the others emit.
