# SEO & GEO Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the piighost site discoverable and citable by search engines and
AI assistants: URL-driven bilingual routing (`/en`, `/fr`) with hreflang, a full
technical-SEO metadata layer, structured data, a FAQ, `llms.txt`, and an
off-site recommendations doc.

**Architecture:** Refactor the client-only i18n to a `[lang]` dynamic segment
statically generated for `en` + `fr` (the Next 16 official i18n pattern: the
`[lang]/layout.tsx` becomes the root layout and renders `<html lang>`). Layer
build-time metadata files (`sitemap.ts`, `robots.ts`, `manifest.ts`,
`opengraph-image.tsx`), per-page localized metadata with canonical + hreflang,
JSON-LD, and a FAQ section on top. All static-export safe (no request-time
reads). Bare `/` is redirected to `/en/` by nginx.

**Tech Stack:** Next.js 16.2.6 (App Router, `output: "export"`, `trailingSlash`),
React 19, TypeScript, Tailwind v4, base-ui shadcn, Vitest + Testing Library,
hand-rolled i18n.

**Critical constraints (read before every task):**
- Next 16: `params` is a `Promise` — `await params` in layouts, pages, and
  `generateMetadata`. Use typed `LayoutProps<'/[lang]'>` / `PageProps` where
  available.
- Static export: no middleware, no server actions, no runtime redirects, no
  request-time reads in metadata files. `next/image` stays `unoptimized`.
- Content style (CLAUDE.md/ROADMAP): no em-dash, no "LLM"-flavored phrasing in
  user copy, correct French accents. piighost is detector-agnostic (regex / NER
  / LLM are peers; never call GLiNER/NER the default).
- No px font sizes; use the rem scale.
- Marketing pages must not import `src/lib/ner.ts` / `gliner.ts`.
- Package manager is **pnpm**.

**Canonical one-liner (reuse verbatim in JSON-LD, llms.txt, off-site doc):**
> piighost is an open-source Python library that anonymizes personally
> identifiable information before it reaches a large language model, using
> composable regex, NER and LLM detection pipelines with stable, reversible
> placeholders.

**Domain:** `https://piighost.dev`.

**Verification baseline (run before starting):**
```bash
pnpm install
pnpm lint && pnpm test && pnpm build
```
Expected: all green, `out/` produced. If `pnpm install` is needed it is a
one-time setup. Commit nothing here — this only confirms a clean baseline.

---

## Phase 1 — WS1: URL-driven i18n (`/en`, `/fr`)

This phase is the structural prerequisite. It ends with a green `pnpm build`
producing `out/en/` and `out/fr/` trees. Do not start Phase 2 until the build
gate passes.

### Task 1: Locale path helpers (pure, unit-tested)

**Files:**
- Create: `src/i18n/locale-path.ts`
- Test: `src/i18n/locale-path.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/i18n/locale-path.test.ts
import { describe, it, expect } from "vitest";
import { localePath, swapLocale, stripLocale } from "./locale-path";

describe("localePath", () => {
  it("prefixes a root path with the locale and trailing slash", () => {
    expect(localePath("en", "/")).toBe("/en/");
    expect(localePath("fr", "/")).toBe("/fr/");
  });
  it("prefixes a nested path", () => {
    expect(localePath("en", "/piighost")).toBe("/en/piighost/");
    expect(localePath("fr", "/playground/detector")).toBe("/fr/playground/detector/");
  });
  it("preserves an existing query string without a trailing slash on it", () => {
    expect(localePath("en", "/playground/detector?edit=x")).toBe("/en/playground/detector/?edit=x");
  });
});

describe("stripLocale", () => {
  it("removes a leading locale segment", () => {
    expect(stripLocale("/en/piighost/")).toBe("/piighost");
    expect(stripLocale("/fr/")).toBe("/");
    expect(stripLocale("/en")).toBe("/");
  });
  it("returns / for a non-localized path", () => {
    expect(stripLocale("/")).toBe("/");
  });
});

describe("swapLocale", () => {
  it("swaps the locale segment preserving the rest", () => {
    expect(swapLocale("/en/piighost/", "fr")).toBe("/fr/piighost/");
    expect(swapLocale("/fr/", "en")).toBe("/en/");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/i18n/locale-path.test.ts`
Expected: FAIL — module `./locale-path` not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/i18n/locale-path.ts
import type { Locale } from "./types";

const LOCALES = ["en", "fr"] as const;

/** Build a locale-prefixed, trailing-slashed href from a base app path. */
export function localePath(locale: Locale, path: string): string {
  const [rawPath, query] = path.split("?");
  const clean = rawPath.replace(/^\/+|\/+$/g, ""); // trim slashes
  const base = clean ? `/${locale}/${clean}/` : `/${locale}/`;
  return query ? `${base}?${query}` : base;
}

/** Remove a leading /en or /fr segment, returning a normalized app path. */
export function stripLocale(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length && (LOCALES as readonly string[]).includes(parts[0])) {
    parts.shift();
  }
  return parts.length ? `/${parts.join("/")}` : "/";
}

/** Replace the leading locale segment with `target`, preserving the path. */
export function swapLocale(pathname: string, target: Locale): string {
  return localePath(target, stripLocale(pathname));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/i18n/locale-path.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/i18n/locale-path.ts src/i18n/locale-path.test.ts
git commit -m "feat(i18n): locale path helpers for URL-driven locales"
```

### Task 2: LanguageProvider takes locale from the URL

**Files:**
- Modify: `src/i18n/language-provider.tsx`
- Check: `src/i18n/use-t.ts` (confirm it exposes `locale`)

- [ ] **Step 1: Read `src/i18n/use-t.ts`** to confirm the hook returns
  `{ t, locale, setLocale }` from context. If it only returns `t`, extend it to
  also return `locale` (needed by links/toggle).

- [ ] **Step 2: Rewrite the provider to accept an initial locale prop**

```tsx
// src/i18n/language-provider.tsx
"use client";

import { createContext, type ReactNode } from "react";
import { dictionaries, defaultLocale } from "./index";
import type { Locale, Dictionary } from "./types";

export type LanguageContextValue = {
  locale: Locale;
  t: Dictionary;
};

export const LanguageContext = createContext<LanguageContextValue>({
  locale: defaultLocale,
  t: dictionaries[defaultLocale],
});

/**
 * Locale is now derived from the URL (`/[lang]`) and passed by the layout.
 * There is no client-side locale switching state anymore; the language toggle
 * navigates between locale-prefixed URLs. We still write the chosen locale to
 * localStorage (in the toggle) purely as a hint for the bare-`/` redirect.
 */
export function LanguageProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <LanguageContext.Provider value={{ locale, t: dictionaries[locale] }}>
      {children}
    </LanguageContext.Provider>
  );
}
```

- [ ] **Step 3: Update `use-t.ts`** so consumers can read the active locale.
  Ensure it returns `{ t, locale }` (drop `setLocale`, which no longer exists):

```ts
// src/i18n/use-t.ts  (adjust to actual file shape)
import { useContext } from "react";
import { LanguageContext } from "./language-provider";

export function useT() {
  const { t, locale } = useContext(LanguageContext);
  return { t, locale };
}
```

- [ ] **Step 4: Typecheck** (build/lint happens after the layout exists; for now):

Run: `pnpm exec tsc --noEmit`
Expected: errors ONLY about `setLocale` usages in `language-toggle.tsx` and any
`STORAGE_KEY` references — those are fixed in Task 4. No other new errors.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/language-provider.tsx src/i18n/use-t.ts
git commit -m "refactor(i18n): derive locale from URL, provider takes locale prop"
```

### Task 3: Move all routes under `[lang]` and make `[lang]/layout.tsx` the root

**Files:**
- Move: every file under `src/app/*` that is a route (see list) into
  `src/app/[lang]/`
- Create: `src/app/[lang]/layout.tsx` (new root layout)
- Delete: `src/app/layout.tsx` (its contents move into `[lang]/layout.tsx`)
- Keep in place (do NOT move): `src/app/globals.css`, `src/app/favicon.ico`

Routes to move (git mv, preserving history):
```
src/app/page.tsx            -> src/app/[lang]/page.tsx
src/app/not-found.tsx       -> src/app/[lang]/not-found.tsx
src/app/piighost/           -> src/app/[lang]/piighost/
src/app/api/                -> src/app/[lang]/api/
src/app/chat/               -> src/app/[lang]/chat/
src/app/proofreader/        -> src/app/[lang]/proofreader/
src/app/philosophy/         -> src/app/[lang]/philosophy/
src/app/playground/         -> src/app/[lang]/playground/  (includes detector/)
```

- [ ] **Step 1: Perform the moves**

```bash
cd src/app
mkdir -p '[lang]'
git mv page.tsx '[lang]/page.tsx'
git mv not-found.tsx '[lang]/not-found.tsx'
git mv piighost api chat proofreader philosophy playground '[lang]/'
cd ../..
```

- [ ] **Step 2: Create the new root layout** at `src/app/[lang]/layout.tsx`
  (contents of the old `src/app/layout.tsx`, now locale-aware). Read the old
  `src/app/layout.tsx` first to carry over fonts/providers/nav/footer exactly.

```tsx
// src/app/[lang]/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/i18n/language-provider";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { SmoothSnap } from "@/components/smooth-snap";
import { BackToTop } from "@/components/back-to-top";
import { dictionaries } from "@/i18n";
import type { Locale } from "@/i18n/types";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export function generateStaticParams() {
  return [{ lang: "en" }, { lang: "fr" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const t = dictionaries[lang];
  return {
    metadataBase: new URL("https://piighost.dev"),
    title: {
      default: t.seo.defaultTitle,
      template: `%s - piighost`,
    },
    description: t.seo.defaultDescription,
    alternates: {
      canonical: `/${lang}`,
      languages: { en: "/en", fr: "/fr", "x-default": "/en" },
    },
    openGraph: {
      title: "piighost",
      description: t.seo.defaultDescription,
      type: "website",
      url: `/${lang}`,
      siteName: "piighost",
      locale: lang === "fr" ? "fr_FR" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: "piighost",
      description: t.seo.defaultDescription,
    },
    robots: { index: true, follow: true },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <LanguageProvider locale={lang}>
            <SmoothSnap />
            <div className="flex min-h-dvh flex-col">
              <SiteNavbar />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
            <BackToTop />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Delete the old root layout**

```bash
git rm src/app/layout.tsx
```

- [ ] **Step 4: Add the `seo` dictionary section** so `t.seo.defaultTitle` /
  `defaultDescription` exist (referenced above). In `src/i18n/types.ts` add to
  `Dictionary`:

```ts
  seo: {
    defaultTitle: string;
    defaultDescription: string;
  };
```
  In `src/i18n/en.ts`:
```ts
  seo: {
    defaultTitle: "piighost - anonymize PII before it reaches the LLM",
    defaultDescription:
      "piighost is a Python library to anonymize personally identifiable information before it reaches a large language model. Detect PII with regex, NER or an LLM, swap it for stable placeholders, and restore real values for your tools.",
  },
```
  In `src/i18n/fr.ts`:
```ts
  seo: {
    defaultTitle: "piighost - anonymiser les PII avant qu'elles n'atteignent le LLM",
    defaultDescription:
      "piighost est une librairie Python pour anonymiser les informations personnelles avant qu'elles n'atteignent un grand modèle de langage. Détectez les PII par regex, NER ou LLM, remplacez-les par des placeholders stables, puis restaurez les vraies valeurs pour vos outils.",
  },
```

- [ ] **Step 5: Build gate**

Run: `pnpm build`
Expected: FAIL initially with type errors from pages/components still using
non-localized links and the philosophy client page (fixed in Tasks 4–6). Read
the errors; they should be confined to: `language-toggle.tsx`, `nav-link.tsx`,
`site-navbar.tsx`, `site-footer.tsx`, `hero.tsx`, `project-card.tsx`,
`not-found.tsx`, `philosophy/page.tsx`, and `playground-tabs.tsx`. If errors
appear elsewhere, stop and investigate before proceeding.

- [ ] **Step 6: Commit (WIP, build not yet green)**

```bash
git add -A
git commit -m "refactor(app): move routes under [lang] segment, new root layout"
```

### Task 4: Locale-aware language toggle

**Files:**
- Modify: `src/components/language-toggle.tsx`

- [ ] **Step 1: Rewrite the toggle to navigate between locale URLs**

```tsx
// src/components/language-toggle.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/i18n/use-t";
import { swapLocale } from "@/i18n/locale-path";
import type { Locale } from "@/i18n/types";

const LANGUAGES: { value: Locale; flag: string; label: string }[] = [
  { value: "en", flag: "🇬🇧", label: "English" },
  { value: "fr", flag: "🇫🇷", label: "Français" },
];

export function LanguageToggle() {
  const { locale, t } = useT();
  const pathname = usePathname();
  const current = LANGUAGES.find((l) => l.value === locale) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" aria-label={t.nav.toggleLanguage}>
            <span aria-hidden="true">{current.flag}</span>
            <span>{current.label}</span>
            <ChevronDownIcon className="size-4 opacity-60" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.value}
            render={
              <Link
                href={swapLocale(pathname, lang.value)}
                onClick={() => {
                  try {
                    window.localStorage.setItem("piighost.locale", lang.value);
                  } catch {}
                }}
              />
            }
          >
            <span aria-hidden="true">{lang.flag}</span>
            <span>{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

Note: if `DropdownMenuItem` is not exported by
`src/components/ui/dropdown-menu.tsx`, keep the radio group but wrap each item's
content in a `<Link>` via the `render` prop instead of `onValueChange`. Check
the file's exports first.

- [ ] **Step 2: Typecheck the file**

Run: `pnpm exec tsc --noEmit`
Expected: no errors from `language-toggle.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/language-toggle.tsx
git commit -m "feat(i18n): language toggle navigates between /en and /fr"
```

### Task 5: Locale-aware internal links and active-state matching

**Files:**
- Modify: `src/components/site-navbar.tsx`, `src/components/site-footer.tsx`,
  `src/components/nav-link.tsx`, `src/components/landing/hero.tsx`,
  `src/components/project-card.tsx`, `src/components/landing/cta.tsx` (if it has
  internal links), `src/components/playground/config-builder.tsx`,
  `src/components/playground/playground-tabs.tsx`

The rule: every internal `href` that starts with `/` must go through
`localePath(locale, path)`; every `usePathname()` active-state comparison must
compare against `stripLocale(pathname)`.

- [ ] **Step 1: `nav-link.tsx`** — make active matching locale-agnostic. Read
  the file; it uses `usePathname()`. Change the comparison to strip the locale:

```tsx
// inside nav-link.tsx
import { useT } from "@/i18n/use-t";
import { localePath, stripLocale } from "@/i18n/locale-path";
// ...
const pathname = usePathname();
const { locale } = useT();
const here = stripLocale(pathname);
const active = matchSubpaths ? here.startsWith(href) : here === href;
// render <Link href={localePath(locale, href)} ...>
```

- [ ] **Step 2: `site-navbar.tsx`** — wrap every internal href with
  `localePath(locale, ...)`. Get `locale` from `useT()`. Lines to change:
  `/` (logo, line ~32), `NavLink href="/"` (line ~36, NavLink now prefixes
  internally so pass the bare path), `/${p.slug}` (line ~60),
  `/playground` (~74), `/philosophy` (~75). For `NavLink` pass bare paths
  (it prefixes); for raw `<Link>` (logo, project menu items) use
  `localePath(locale, ...)`.

- [ ] **Step 3: `site-footer.tsx`** — `href={localePath(locale, `/${p.slug}`)}`.
  Add `const { locale } = useT();` (it already uses `useT` for copy; confirm).

- [ ] **Step 4: `hero.tsx`** — `href={localePath(locale, "/piighost")}` with
  `const { t, locale } = useT();`.

- [ ] **Step 5: `project-card.tsx`** — `href={localePath(locale, `/${project.slug}`)}`.
  Add `useT()` for `locale` (this is a client component; confirm `"use client"`).

- [ ] **Step 6: `not-found.tsx`** — this file was moved to `[lang]/not-found.tsx`.
  It links to `/`. Since a 404 has no reliable locale param, link to a static
  `/en/`:  `href="/en/"`. Keep it simple.

- [ ] **Step 7: `config-builder.tsx` and `playground-tabs.tsx`** — prefix their
  internal hrefs with `localePath(locale, ...)` and strip locale in
  `usePathname()` comparisons. `playground-tabs.test.tsx` will need its expected
  paths updated to the locale-prefixed form (update the test to pass `/en/...`
  or to mock `useT` returning `locale: "en"`; read the test first).

- [ ] **Step 8: Full typecheck + tests**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: no type errors; tests pass (after updating `playground-tabs.test.tsx`).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(i18n): locale-aware internal links and active-state matching"
```

### Task 6: Convert Philosophy to a server page with metadata

**Files:**
- Modify: `src/app/[lang]/philosophy/page.tsx` (remove `"use client"`)
- Create: `src/components/philosophy-content.tsx` (`"use client"`, holds the
  current interactive/`useT` content)

- [ ] **Step 1:** Move the entire current body of `philosophy/page.tsx` into a
  new client component `src/components/philosophy-content.tsx` with
  `"use client"` at the top and a default or named export `PhilosophyContent`.

- [ ] **Step 2:** Rewrite `philosophy/page.tsx` as a server component:

```tsx
// src/app/[lang]/philosophy/page.tsx
import type { Metadata } from "next";
import { PhilosophyContent } from "@/components/philosophy-content";
import { dictionaries } from "@/i18n";
import type { Locale } from "@/i18n/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const t = dictionaries[lang];
  return {
    title: t.philosophy.title,
    description: t.seo.philosophyDescription,
    alternates: {
      canonical: `/${lang}/philosophy`,
      languages: { en: "/en/philosophy", fr: "/fr/philosophy", "x-default": "/en/philosophy" },
    },
    openGraph: { title: t.philosophy.title, url: `/${lang}/philosophy` },
  };
}

export default function PhilosophyPage() {
  return <PhilosophyContent />;
}
```

- [ ] **Step 3:** Add `philosophyDescription` to the `seo` dict section (types +
  en + fr), e.g. EN: "The principles behind piighost: minimize the personal data
  that reaches a model, keep the mapping local, and stay reversible for GDPR."

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: PASS. `out/en/philosophy/index.html` and `out/fr/philosophy/index.html`
exist.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(philosophy): server page with localized metadata"
```

### Task 7: Per-page metadata for project + playground pages

**Files:**
- Modify: `src/app/[lang]/piighost/page.tsx`, `api/page.tsx`, `chat/page.tsx`,
  `proofreader/page.tsx`, `playground/page.tsx`, `playground/detector/page.tsx`

- [ ] **Step 1:** Replace each `export const metadata = { title: "..." }` with a
  `generateMetadata` that awaits `params`, sets a unique localized `description`,
  `alternates.canonical` + `languages`, and per-page `openGraph.url`. Pattern for
  a project page (piighost shown; repeat per page with its own slug/description):

```tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const t = dictionaries[lang];
  return {
    title: "piighost",
    description: t.seo.pages.piighost,
    alternates: {
      canonical: `/${lang}/piighost`,
      languages: { en: "/en/piighost", fr: "/fr/piighost", "x-default": "/en/piighost" },
    },
    openGraph: { title: "piighost", url: `/${lang}/piighost` },
  };
}
```

- [ ] **Step 2:** Add a `seo.pages` record to the dict (types + en + fr) with a
  unique, keyword-aware description per page. Suggested EN copy (localize for FR,
  correct accents, no em-dash, detector-agnostic):
  - `piighost`: "The core Python library to build PII anonymization pipelines. Detect with regex, NER or an LLM, swap PII for stable placeholders, and restore real values on tool output."
  - `api`: "piighost-api hosts one anonymization pipeline behind an HTTP endpoint, so any service can redact PII before it reaches a model."
  - `chat`: "piighost-chat is a demo chatbot that anonymizes each message before the model sees it, then restores the real values in the reply."
  - `proofreader`: "piighost-proofreader is a CV proofreader that anonymizes documents before any model call, so personal data never leaves your control."
  - `playground`: "Compose a full PII anonymization pipeline in the browser: detect, resolve, link and anonymize, then export it as piighost config."
  - `detector`: "Test a single PII detector in your browser: regex, classic NER or GLiNER. No data leaves the page."

- [ ] **Step 3:** For `playground` and `detector`, keep them indexable but they
  will be lower priority in the sitemap (Task 9). No noindex.

- [ ] **Step 4: Build + verify a description lands in the HTML**

Run:
```bash
pnpm build
grep -o '<meta name="description"[^>]*>' out/en/piighost/index.html
grep -o '<link rel="canonical"[^>]*>' out/en/piighost/index.html
grep -o 'hreflang="fr"[^>]*' out/en/piighost/index.html
```
Expected: unique description, canonical `.../en/piighost/`, an hreflang alternate
for fr.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(seo): unique localized metadata + canonical/hreflang per page"
```

### Task 8: nginx redirect for bare `/` and legacy paths

**Files:**
- Modify: `nginx.conf`
- Create: `public/index.html` (self-contained fallback redirect)

- [ ] **Step 1: Read `nginx.conf`** to find the server block and existing
  `location` rules.

- [ ] **Step 2:** Add a redirect from `/` to `/en/` and legacy top-level paths
  to their `/en/*` equivalents. Example (adapt to the existing block):

```nginx
# Redirect bare root to the default locale
location = / { return 301 /en/; }

# Legacy (pre-i18n) paths -> English locale
location = /piighost/ { return 301 /en/piighost/; }
location = /api/ { return 301 /en/api/; }
location = /chat/ { return 301 /en/chat/; }
location = /proofreader/ { return 301 /en/proofreader/; }
location = /philosophy/ { return 301 /en/philosophy/; }
location ^~ /playground { return 301 /en/playground/; }
```

- [ ] **Step 3:** Create `public/index.html` as a JS-less fallback (used only if
  `out/` is served without the nginx rules). Prefers a stored locale hint:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <link rel="canonical" href="https://piighost.dev/en/" />
    <meta http-equiv="refresh" content="0; url=/en/" />
    <script>
      try {
        var l = localStorage.getItem("piighost.locale");
        if (l !== "en" && (l === "fr" || (navigator.language || "").slice(0, 2) === "fr")) {
          location.replace("/fr/");
        } else {
          location.replace("/en/");
        }
      } catch (e) { location.replace("/en/"); }
    </script>
    <title>piighost</title>
  </head>
  <body>Redirecting to <a href="/en/">/en/</a></body>
</html>
```

- [ ] **Step 4: Build and confirm no conflict**

Run: `pnpm build && ls out/index.html`
Expected: PASS; `out/index.html` is the fallback. If Next errors with a public
file conflict, delete `public/index.html` and rely on nginx only (note it in the
commit message).

- [ ] **Step 5: Commit**

```bash
git add nginx.conf public/index.html
git commit -m "feat(seo): redirect bare / and legacy paths to /en"
```

**Phase 1 exit gate:** `pnpm lint && pnpm test && pnpm build` all green;
`out/en/` and `out/fr/` trees exist; a content phrase appears in both
`out/en/index.html` (English) and `out/fr/index.html` (French):
```bash
grep -c "anonymize" out/en/index.html   # >0
# pick a French phrase actually in fr.ts hero and grep it in the FR file
```

---

## Phase 2 — WS2: Technical SEO foundations

### Task 9: `sitemap.ts` (bilingual, unit-tested route builder)

**Files:**
- Create: `src/lib/sitemap-routes.ts` (pure, testable)
- Test: `src/lib/sitemap-routes.test.ts`
- Create: `src/app/sitemap.ts`

- [ ] **Step 1: Write the failing test for the route builder**

```ts
// src/lib/sitemap-routes.test.ts
import { describe, it, expect } from "vitest";
import { sitemapEntries } from "./sitemap-routes";

describe("sitemapEntries", () => {
  const entries = sitemapEntries("https://piighost.dev");
  it("includes both locales for the home route", () => {
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://piighost.dev/en/");
    expect(urls).toContain("https://piighost.dev/fr/");
  });
  it("includes every project under both locales", () => {
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://piighost.dev/en/piighost/");
    expect(urls).toContain("https://piighost.dev/fr/proofreader/");
  });
  it("sets hreflang alternates on each entry", () => {
    const home = entries.find((e) => e.url === "https://piighost.dev/en/");
    expect(home?.alternates?.languages?.fr).toBe("https://piighost.dev/fr/");
  });
  it("gives the home route priority 1 and tools lower priority", () => {
    const home = entries.find((e) => e.url === "https://piighost.dev/en/");
    const tool = entries.find((e) => e.url === "https://piighost.dev/en/playground/");
    expect(home?.priority).toBe(1);
    expect(tool?.priority).toBeLessThan(home!.priority!);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (module missing).

Run: `pnpm exec vitest run src/lib/sitemap-routes.test.ts`

- [ ] **Step 3: Implement the builder**

```ts
// src/lib/sitemap-routes.ts
import type { MetadataRoute } from "next";
import { projects } from "./site";

const LOCALES = ["en", "fr"] as const;

// path (no locale, no trailing slash), priority, changeFrequency
const ROUTES: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1, freq: "weekly" },
  { path: "/philosophy", priority: 0.6, freq: "monthly" },
  ...projects.map((p) => ({ path: `/${p.slug}`, priority: 0.8, freq: "monthly" as const })),
  { path: "/playground", priority: 0.4, freq: "monthly" },
  { path: "/playground/detector", priority: 0.3, freq: "monthly" },
];

function url(base: string, locale: string, path: string) {
  const clean = path.replace(/^\/+|\/+$/g, "");
  return clean ? `${base}/${locale}/${clean}/` : `${base}/${locale}/`;
}

export function sitemapEntries(base: string): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const r of ROUTES) {
    for (const locale of LOCALES) {
      entries.push({
        url: url(base, locale, r.path),
        lastModified: new Date(),
        changeFrequency: r.freq,
        priority: r.priority,
        alternates: {
          languages: {
            en: url(base, "en", r.path),
            fr: url(base, "fr", r.path),
          },
        },
      });
    }
  }
  return entries;
}
```

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Create the sitemap route**

```ts
// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { sitemapEntries } from "@/lib/sitemap-routes";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries("https://piighost.dev");
}
```

- [ ] **Step 6: Build + verify**

Run: `pnpm build && head -20 out/sitemap.xml`
Expected: `out/sitemap.xml` lists `/en/` and `/fr/` URLs with `xhtml:link`
alternates.

- [ ] **Step 7: Commit**

```bash
git add src/lib/sitemap-routes.ts src/lib/sitemap-routes.test.ts src/app/sitemap.ts
git commit -m "feat(seo): bilingual sitemap with hreflang alternates"
```

### Task 10: `robots.ts` allowing AI crawlers

**Files:**
- Create: `src/app/robots.ts`

- [ ] **Step 1: Implement** (explicit AI bots + wildcard, sitemap reference):

```ts
// src/app/robots.ts
import type { MetadataRoute } from "next";

const AI_AND_SEARCH_BOTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "anthropic-ai", "Claude-SearchBot", "Claude-User",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Googlebot", "Bingbot", "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...AI_AND_SEARCH_BOTS.map((userAgent) => ({ userAgent, allow: "/" })),
      { userAgent: "*", allow: "/" },
    ],
    sitemap: "https://piighost.dev/sitemap.xml",
    host: "https://piighost.dev",
  };
}
```

- [ ] **Step 2: Build + verify**

Run: `pnpm build && cat out/robots.txt`
Expected: one block per bot, all `Allow: /`, plus `Sitemap:` line.

- [ ] **Step 3: Commit**

```bash
git add src/app/robots.ts
git commit -m "feat(seo): robots.txt allowing AI and search crawlers"
```

### Task 11: `manifest.ts` and icon metadata

**Files:**
- Create: `src/app/manifest.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/manifest.ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "piighost",
    short_name: "piighost",
    description:
      "Anonymize PII before it reaches the LLM. A Python library for reversible PII anonymization pipelines.",
    start_url: "/en/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b0b0f",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
```

- [ ] **Step 2: Build + verify**

Run: `pnpm build && cat out/manifest.webmanifest`
Expected: valid JSON manifest.

- [ ] **Step 3: Commit**

```bash
git add src/app/manifest.ts
git commit -m "feat(seo): web app manifest"
```

### Task 12: Open Graph image generated at build

**Files:**
- Create: `src/app/opengraph-image.tsx`

- [ ] **Step 1: Implement** (no request-time data; static PNG at build):

```tsx
// src/app/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const alt = "piighost - anonymize PII before it reaches the LLM";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background: "#0b0b0f",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: "-0.03em" }}>
          piighost
        </div>
        <div style={{ fontSize: 40, marginTop: 24, color: "#c7c7d1", maxWidth: 900 }}>
          Anonymize PII before it reaches the LLM.
        </div>
      </div>
    ),
    { ...size },
  );
}
```

- [ ] **Step 2: Build + verify**

Run: `pnpm build && ls -la out/opengraph-image* out/en/opengraph-image* 2>/dev/null`
Expected: a PNG is emitted (path may be hashed, e.g.
`out/opengraph-image.png` or under a route). Confirm the OG `<meta property="og:image">`
appears in `out/en/index.html`:
```bash
grep -o '<meta property="og:image"[^>]*>' out/en/index.html
```

- [ ] **Step 3: Commit**

```bash
git add src/app/opengraph-image.tsx
git commit -m "feat(seo): build-time Open Graph image"
```

### Task 13: JSON-LD structured data

**Files:**
- Create: `src/lib/jsonld.ts` (pure builders)
- Test: `src/lib/jsonld.test.ts`
- Create: `src/components/json-ld.tsx` (server component)
- Modify: `src/app/[lang]/layout.tsx` (inject Organization + WebSite)
- Modify: `src/app/[lang]/piighost/page.tsx` (SoftwareApplication + SoftwareSourceCode + Breadcrumb)

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/jsonld.test.ts
import { describe, it, expect } from "vitest";
import { organizationLd, softwareApplicationLd, breadcrumbLd } from "./jsonld";

describe("jsonld builders", () => {
  it("organization has sameAs GitHub + PyPI", () => {
    const o = organizationLd();
    expect(o["@type"]).toBe("Organization");
    expect(o.sameAs).toEqual(
      expect.arrayContaining(["https://github.com/Athroniaeth/piighost"]),
    );
  });
  it("software application is a free Python DeveloperApplication", () => {
    const s = softwareApplicationLd();
    expect(s["@type"]).toBe("SoftwareApplication");
    expect(s.applicationCategory).toBe("DeveloperApplication");
    expect(s.offers.price).toBe("0");
  });
  it("breadcrumb lists positions in order", () => {
    const b = breadcrumbLd([
      { name: "Home", item: "https://piighost.dev/en/" },
      { name: "piighost", item: "https://piighost.dev/en/piighost/" },
    ]);
    expect(b.itemListElement[1].position).toBe(2);
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

Run: `pnpm exec vitest run src/lib/jsonld.test.ts`

- [ ] **Step 3: Implement builders** (canonical one-liner reused):

```ts
// src/lib/jsonld.ts
const BASE = "https://piighost.dev";
const REPO = "https://github.com/Athroniaeth/piighost";
const PYPI = "https://pypi.org/project/piighost/";
const DESC =
  "piighost is an open-source Python library that anonymizes personally identifiable information before it reaches a large language model, using composable regex, NER and LLM detection pipelines with stable, reversible placeholders.";

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "piighost",
    url: `${BASE}/`,
    description: DESC,
    sameAs: [REPO, PYPI],
  } as const;
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "piighost",
    url: `${BASE}/`,
    description: DESC,
  } as const;
}

export function softwareApplicationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "piighost",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Cross-platform",
    programmingLanguage: "Python",
    description: DESC,
    url: `${BASE}/en/piighost/`,
    downloadUrl: PYPI,
    softwareHelp: "https://athroniaeth.github.io/piighost/",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  } as const;
}

export function softwareSourceCodeLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: "piighost",
    description: DESC,
    codeRepository: REPO,
    programmingLanguage: "Python",
    runtimePlatform: "Python 3",
  } as const;
}

export function breadcrumbLd(items: { name: string; item: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.item,
    })),
  } as const;
}

export function faqPageLd(qa: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map((x) => ({
      "@type": "Question",
      name: x.question,
      acceptedAnswer: { "@type": "Answer", text: x.answer },
    })),
  } as const;
}
```

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Create the server component**

```tsx
// src/components/json-ld.tsx
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Data is build-time constant; safe to inline.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

- [ ] **Step 6: Inject Organization + WebSite in `[lang]/layout.tsx`** inside
  `<body>` (top), and SoftwareApplication + SoftwareSourceCode + Breadcrumb in
  `piighost/page.tsx` body. Example for the layout:

```tsx
import { JsonLd } from "@/components/json-ld";
import { organizationLd, websiteLd } from "@/lib/jsonld";
// ...inside <body>, before the ThemeProvider tree or within it:
<JsonLd data={organizationLd()} />
<JsonLd data={websiteLd()} />
```

- [ ] **Step 7: Build + verify**

Run:
```bash
pnpm build
grep -c 'application/ld+json' out/en/index.html      # >=2
grep -c 'SoftwareApplication' out/en/piighost/index.html  # >=1
```
Expected: JSON-LD present in the HTML.

- [ ] **Step 8: Commit**

```bash
git add src/lib/jsonld.ts src/lib/jsonld.test.ts src/components/json-ld.tsx src/app/[lang]/layout.tsx src/app/[lang]/piighost/page.tsx
git commit -m "feat(seo): JSON-LD structured data (Organization, WebSite, SoftwareApplication)"
```

### Task 14: Semantic HTML / a11y pass

**Files:**
- Modify (as found): `src/components/site-navbar.tsx`, `src/components/site-footer.tsx`, landing sections in `src/components/landing/`

- [ ] **Step 1: Audit** heading structure: exactly one `<h1>` per page (the hero
  `h1` on home; each project page should have one `h1`). Verify no heading level
  is skipped. Check `<nav>` has `aria-label`, footer is a `<footer>`, icon-only
  links have `aria-label`, and images have `alt`. Fix issues inline; do not
  restructure beyond what's needed.

- [ ] **Step 2: Build + lint**

Run: `pnpm lint && pnpm build`
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "polish(a11y): heading hierarchy, landmarks, alt text for SEO"
```

---

## Phase 3 — WS4: FAQ section + FAQPage schema

### Task 15: FAQ dictionary content

**Files:**
- Modify: `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/fr.ts`

- [ ] **Step 1:** Add an `faq` section to `Dictionary`:

```ts
  faq: {
    heading: string;
    items: { question: string; answer: string }[];
  };
```

- [ ] **Step 2:** Add EN content (5 items; direct 40-60 word answers, no
  em-dash, no "LLM"-flavored phrasing, detector-agnostic). Questions:
  1. "How do I anonymize PII before sending a prompt to a model in Python?"
  2. "What is the difference between regex, NER and LLM detection?"
  3. "How do I use piighost with LangChain, Pydantic AI or LlamaIndex?"
  4. "Is piighost GDPR-compliant, and how do stable placeholders work?"
  5. "Does my data stay local? What is actually sent to the model?"

  Write real answers grounded in the product (reversible pseudonymization,
  placeholders like the token style, mapping kept locally, detectors as peers).

- [ ] **Step 3:** Add the FR translation (correct accents).

- [ ] **Step 4: Lint/typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: dictionaries satisfy the type (both locales updated).

- [ ] **Step 5: Commit**

```bash
git add src/i18n/types.ts src/i18n/en.ts src/i18n/fr.ts
git commit -m "content(faq): bilingual FAQ copy for developers"
```

### Task 16: FAQ landing section + FAQPage JSON-LD

**Files:**
- Create: `src/components/landing/faq.tsx`
- Modify: `src/app/[lang]/page.tsx` (render `<Faq />` before `<Cta />`, inject FAQPage LD)

- [ ] **Step 1:** Build the FAQ section as a client component using `useT()`,
  matching the existing landing section styling (scroll-snap `section`, same
  container widths as siblings like `problem.tsx`). Render each Q as a heading
  and A as body text (visible content, required for FAQ schema). Use an
  accordion only if the answers remain in the static HTML (base-ui Accordion
  renders content in the DOM; acceptable). Prefer plain visible `<dl>`/headings
  to guarantee crawlability.

```tsx
// src/components/landing/faq.tsx
"use client";
import { useT } from "@/i18n/use-t";

export function Faq() {
  const { t } = useT();
  return (
    <section className="snap-start scroll-mt-16 border-b">
      <div className="mx-auto w-full max-w-4xl px-4 py-16">
        <h2 className="text-3xl font-bold tracking-tight">{t.faq.heading}</h2>
        <dl className="mt-8 space-y-8">
          {t.faq.items.map((item) => (
            <div key={item.question}>
              <dt className="text-lg font-semibold">{item.question}</dt>
              <dd className="mt-2 text-muted-foreground">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
```

- [ ] **Step 2:** Render it in `src/app/[lang]/page.tsx`. The home page is a
  server component, so the FAQPage JSON-LD is injected there from the localized
  dictionary; the visible `<Faq />` renders the same copy:

```tsx
import { Faq } from "@/components/landing/faq";
import { JsonLd } from "@/components/json-ld";
import { faqPageLd } from "@/lib/jsonld";
import { dictionaries } from "@/i18n";
import type { Locale } from "@/i18n/types";

export default async function Home({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const faq = dictionaries[lang].faq;
  return (
    <>
      {/* ...existing sections... */}
      <Faq />
      <JsonLd data={faqPageLd(faq.items)} />
      <Cta />
    </>
  );
}
```
  Note: the home `page.tsx` currently defines `const INSTALL`/`USAGE_EXAMPLES`
  and is a sync server component. Make it `async`, await `params`, and keep the
  existing sections. Read the current file and preserve all of it.

- [ ] **Step 3:** Add a home-page `generateMetadata` if not already covered by
  the layout (the layout `generateMetadata` covers `/[lang]`; the home page can
  rely on it, but add a page-level one only if a distinct description is wanted).
  Skip if redundant.

- [ ] **Step 4: Build + verify**

Run:
```bash
pnpm build
grep -c 'FAQPage' out/en/index.html          # >=1
grep -o 'How do I anonymize' out/en/index.html # visible copy present
grep -o 'Comment anonymiser' out/fr/index.html # FR visible copy present
```
Expected: FAQ visible in HTML for both locales + FAQPage JSON-LD.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(faq): landing FAQ section with FAQPage structured data"
```

---

## Phase 4 — WS3: llms.txt

### Task 17: `public/llms.txt`

**Files:**
- Create: `public/llms.txt`

- [ ] **Step 1:** Write the file per llmstxt.org format (H1, blockquote summary =
  canonical one-liner, key facts, Documentation/Guides link sections). Use real
  URLs from `src/lib/site.ts` (docs/repo/pypi). Content:

```markdown
# piighost

> piighost is an open-source Python library that anonymizes personally
> identifiable information before it reaches a large language model, using
> composable regex, NER and LLM detection pipelines with stable, reversible
> placeholders.

Key facts:
- Language: Python
- Detectors: regex, NER, LLM (composable pipeline, detector-agnostic)
- Pipeline stages: detect, span resolve, entity link, entity resolve, anonymize
- Placeholders: stable and reversible; the mapping stays local
- Use case: anonymize PII before sending prompts to a model, then restore values
- Integrations: LangChain, Pydantic AI, LlamaIndex

## Documentation

- [piighost site](https://piighost.dev/en/): overview and interactive tools
- [Core library](https://piighost.dev/en/piighost/): build anonymization pipelines
- [piighost-api](https://piighost.dev/en/api/): host a pipeline behind HTTP
- [Package (PyPI)](https://pypi.org/project/piighost/): install with pip or uv
- [Source (GitHub)](https://github.com/Athroniaeth/piighost): repository and docs

## Tools

- [Playground](https://piighost.dev/en/playground/): compose a pipeline in the browser
- [Detector bench](https://piighost.dev/en/playground/detector/): test a single detector
```

- [ ] **Step 2: Build + verify it ships at root**

Run: `pnpm build && head -5 out/llms.txt`
Expected: file present in `out/`.

- [ ] **Step 3: Commit**

```bash
git add public/llms.txt
git commit -m "feat(seo): llms.txt for AI assistants"
```

---

## Phase 5 — WS5: Off-site recommendations doc

### Task 18: `docs/seo/off-site-recommendations.md`

**Files:**
- Create: `docs/seo/off-site-recommendations.md`

- [ ] **Step 1:** Write the doc (no code depends on it). Include:
  - The canonical one-liner (to reuse verbatim on GitHub About, PyPI summary).
  - A suggested GitHub README skeleton: badges (PyPI, license, CI, stars), a
    working quickstart, a detector comparison table (regex / NER / LLM as peers),
    integration snippets (LangChain, Pydantic AI, LlamaIndex), a short FAQ.
  - PyPI metadata: `summary`, long description = README, `classifiers`
    (Development Status, Intended Audience :: Developers, Topic :: Security,
    License, Programming Language :: Python 3.x), `keywords`:
    `pii, anonymization, redaction, gdpr, llm, ner, privacy, langchain`.
  - Target awesome-lists to submit PRs to: `awesome-llm`,
    `awesome-production-llm`, `awesome-privacy`, `awesome-python`, NLP/PII lists.
  - Community guidance (value-first, no spam): Reddit (r/LangChain,
    r/LocalLLaMA, r/Python), Stack Overflow ("anonymize PII before OpenAI",
    "Presidio alternative python"), Hacker News Show HN at a release milestone.
  - Deferred on-site follow-ups: comparison pages ("piighost vs Presidio",
    "piighost vs scrubadub") with a feature matrix; dated benchmark numbers per
    detector; optional `codemeta.json` in the piighost repo root.
  - A reminder to keep the one-liner identical across site, GitHub, and PyPI so
    the "piighost" entity stays coherent for knowledge graphs.

- [ ] **Step 2: Commit**

```bash
git add docs/seo/off-site-recommendations.md
git commit -m "docs(seo): off-site recommendations for GitHub, PyPI, communities"
```

---

## Final verification

- [ ] `pnpm lint` — green.
- [ ] `pnpm test` — green (locale-path, sitemap-routes, jsonld, and updated
  playground-tabs tests pass).
- [ ] `pnpm build` — green; inspect `out/`:
  - `out/en/` and `out/fr/` trees for every route.
  - `out/sitemap.xml`, `out/robots.txt`, `out/manifest.webmanifest`,
    `out/llms.txt`, an OG image PNG.
  - `grep 'hreflang="fr"' out/en/index.html` returns a match.
  - `grep 'rel="canonical"' out/en/piighost/index.html` shows the `/en/piighost/`
    canonical.
  - A localized content phrase is present in both `out/en/index.html` and
    `out/fr/index.html` (the AI-crawler test).
  - `grep 'application/ld+json' out/en/index.html` >= 2; `FAQPage` present.
  - No `transformers`/`gliner` chunk pulled by the marketing pages (spot-check
    the home page's JS chunks in `out/_next`).
- [ ] Manual (optional, `verify`/`run` skill): `pnpm dev`, toggle EN/FR keeps the
  path, bare `/` (via nginx or the fallback) lands on `/en/`.

## Task summary (spec coverage)

- WS1 (i18n `/en` `/fr` + hreflang): Tasks 1-8.
- WS2 (foundations: sitemap, robots, manifest, OG image, per-page metadata,
  JSON-LD, a11y): Tasks 7, 9-14.
- WS3 (llms.txt): Task 17.
- WS4 (FAQ + FAQPage): Tasks 15-16.
- WS5 (off-site doc): Task 18.
