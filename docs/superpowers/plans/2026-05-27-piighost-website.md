# piighost Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a statically-exported Next.js presentation website for the piighost ecosystem (core lib + api + chat + proofreader), optimized for developer adoption.

**Architecture:** Next.js 15 App Router with `output: "export"` (fully static). shadcn/ui components on Tailwind v4. Project pages authored in MDX. Light theme by default with a dark toggle (`next-themes`). Visual language inspired by langchain.com: light base, single indigo accent, card grids, tabbed pipeline walkthrough, generous whitespace. A handful of logic-bearing components (theme toggle, copy-to-clipboard code block, scripted anonymize animation) are unit-tested with Vitest; layout is verified via `next build` and the dev server.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind v4, shadcn/ui, next-themes, Shiki (code highlighting), MDX (`@next/mdx`), Vitest + React Testing Library, pnpm.

**Spec:** `docs/superpowers/specs/2026-05-27-piighost-website-design.md`

**Hard content rules (from spec):**
- piighost is **detector-agnostic**. Never present GLiNER2 or any single NER as the "default". Always: "regex, NER, or LLM — you wire it".
- Site copy: **no em-dashes**, no LLM-typical wording ("seamless", "robust", "delve", "leverage", "unlock"). Plain, factual, dev-oriented.

**Working directory:** `/home/secondary/claude/piighost-website` (already a git repo containing only `docs/` + `.gitignore`).

---

## Phase 0 — Scaffold

### Task 1: Scaffold Next.js into the existing repo

The project root already has `.git`, `.gitignore`, and `docs/`. `create-next-app` refuses a non-empty dir, so scaffold into a temp dir and merge.

**Files:**
- Create: whole Next.js app tree under project root
- Preserve: existing `.git/`, `docs/`

- [ ] **Step 1: Scaffold into a temp directory**

Run from `/home/secondary/claude`:
```bash
pnpm create next-app@latest piighost-website-scaffold \
  --ts --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-pnpm --turbopack --no-git
```
Expected: scaffold completes, prints "Success!".

- [ ] **Step 2: Merge scaffold into the repo, then delete temp**

Run from `/home/secondary/claude`:
```bash
cp -r piighost-website-scaffold/. piighost-website/ \
  && rm -rf piighost-website/.git \
  && cd piighost-website && rm -rf ../piighost-website-scaffold \
  && git checkout -- .git 2>/dev/null; ls
```
Note: `cp -r .../. ` copies the scaffold's own `.gitignore` over ours (fine — Next's is more complete). It does NOT bring a `.git` (we used `--no-git`). The `rm -rf piighost-website/.git` line is defensive and should be a no-op; if it ever removes the real repo, re-run `git init` is NOT needed because `--no-git` means no nested repo was copied. **Verify the repo is intact next.**

- [ ] **Step 3: Verify repo intact and app present**

Run from `/home/secondary/claude/piighost-website`:
```bash
git status --short && git log --oneline -1 && test -f package.json && echo "PKG OK" && test -d docs && echo "DOCS OK"
```
Expected: shows the design-spec commit in log, `PKG OK`, `DOCS OK`, and untracked Next.js files.

- [ ] **Step 4: Install deps and confirm dev build boots**

```bash
pnpm install && pnpm build
```
Expected: `pnpm build` succeeds ("Compiled successfully").

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js 15 + Tailwind v4 app"
```

### Task 2: Configure static export and base config

**Files:**
- Modify: `next.config.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Enable static export in `next.config.ts`**

Replace the file contents with:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
```
Rationale: `output: "export"` produces a static `out/` dir. `images.unoptimized` is required because the Image Optimization server is unavailable in static export. `trailingSlash` makes per-page folders (`/piighost/index.html`) so it works on any static host.

- [ ] **Step 2: Build to verify export works**

```bash
pnpm build && test -f out/index.html && echo "EXPORT OK"
```
Expected: `out/index.html` exists, prints `EXPORT OK`.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts && git commit -m "chore: enable static export"
```

### Task 3: Initialize shadcn/ui

**Files:**
- Create: `components.json`, `src/lib/utils.ts`, `src/components/ui/*`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Run the shadcn init**

```bash
pnpm dlx shadcn@latest init -d -b neutral
```
`-d` accepts defaults, `-b neutral` sets the neutral base color. This writes `components.json`, adds CSS variables to `globals.css`, and creates `src/lib/utils.ts`.

- [ ] **Step 2: Add the components we need**

```bash
pnpm dlx shadcn@latest add button card badge tabs accordion navigation-menu separator
```
Expected: files created under `src/components/ui/`.

- [ ] **Step 3: Build to verify nothing broke**

```bash
pnpm build && echo "BUILD OK"
```
Expected: `BUILD OK`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: init shadcn/ui + base components"
```

### Task 4: Install runtime + test dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install libraries**

```bash
pnpm add next-themes shiki lucide-react
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react
```

- [ ] **Step 2: Create Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 3: Create Vitest setup file**

Create `vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add test script to `package.json`**

In the `"scripts"` block add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Write a smoke test to prove the harness works**

Create `src/lib/utils.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class names and dedupes tailwind conflicts", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe("text-sm font-bold");
  });
});
```

- [ ] **Step 6: Run the test**

```bash
pnpm test
```
Expected: 1 passing test file, 2 assertions pass.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: add next-themes, shiki, lucide + vitest harness"
```

---

## Phase 1 — Theming and design tokens

### Task 5: Theme provider with light default + dark toggle

**Files:**
- Create: `src/components/theme-provider.tsx`
- Create: `src/components/theme-toggle.tsx`
- Create: `src/components/theme-toggle.test.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write the failing test for the toggle**

Create `src/components/theme-toggle.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const setTheme = vi.fn();
vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme, resolvedTheme: "light" }),
}));

import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  it("switches to dark when currently light", async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button", { name: /toggle theme/i }));
    expect(setTheme).toHaveBeenCalledWith("dark");
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

```bash
pnpm test src/components/theme-toggle.test.tsx
```
Expected: FAIL — cannot find module `./theme-toggle`.

- [ ] **Step 3: Create the provider**

Create `src/components/theme-provider.tsx`:
```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 4: Create the toggle**

Create `src/components/theme-toggle.tsx`:
```tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-5 dark:hidden" />
      <Moon className="hidden size-5 dark:block" />
    </Button>
  );
}
```

- [ ] **Step 5: Run the test, confirm pass**

```bash
pnpm test src/components/theme-toggle.test.tsx
```
Expected: PASS.

- [ ] **Step 6: Wire provider into root layout**

Edit `src/app/layout.tsx`. Add the import, set `suppressHydrationWarning` on `<html>`, wrap children:
```tsx
import { ThemeProvider } from "@/components/theme-provider";
```
Change the `<html>` tag to:
```tsx
<html lang="en" suppressHydrationWarning>
```
Wrap `{children}` inside `<body>`:
```tsx
<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
  {children}
</ThemeProvider>
```
`defaultTheme="light"` + `enableSystem={false}` gives light-by-default per spec.

- [ ] **Step 7: Build to verify**

```bash
pnpm build && echo "BUILD OK"
```
Expected: `BUILD OK`.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: theme provider with light default + dark toggle"
```

### Task 6: Brand tokens (indigo accent) and base metadata

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Set the indigo accent in `globals.css`**

shadcn init created `:root` and `.dark` blocks with `--primary` etc. Override the primary tokens to indigo. In the `:root` block set:
```css
--primary: oklch(0.51 0.23 277);
--primary-foreground: oklch(0.98 0 0);
--ring: oklch(0.51 0.23 277);
```
In the `.dark` block set:
```css
--primary: oklch(0.62 0.19 277);
--primary-foreground: oklch(0.13 0 0);
--ring: oklch(0.62 0.19 277);
```
(These are approximately indigo-600 / indigo-400. Tune later.)

- [ ] **Step 2: Set site metadata in `layout.tsx`**

Replace the `metadata` export with:
```tsx
export const metadata: Metadata = {
  metadataBase: new URL("https://piighost.dev"),
  title: { default: "piighost — anonymize PII before it reaches the LLM", template: "%s — piighost" },
  description:
    "piighost is a Python library for building PII anonymization pipelines. Detect PII with regex, NER, or an LLM, swap it for stable placeholders, and restore real values for your tools.",
  openGraph: {
    title: "piighost",
    description: "Anonymize PII before it reaches the LLM.",
    type: "website",
  },
};
```
Note: `metadataBase` URL is a placeholder domain; harmless for a static build.

- [ ] **Step 3: Build to verify**

```bash
pnpm build && echo "BUILD OK"
```
Expected: `BUILD OK`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: indigo brand tokens + site metadata"
```

---

## Phase 2 — Shared layout and components

### Task 7: Site config (single source for nav + projects)

**Files:**
- Create: `src/lib/site.ts`

- [ ] **Step 1: Create the site config**

Create `src/lib/site.ts`:
```ts
export const GITHUB_ORG = "https://github.com/Athroniaeth";

export type Project = {
  slug: string;
  name: string;
  tagline: string;
  repo: string;
  pypi?: string;
  docs?: string;
};

export const projects: Project[] = [
  {
    slug: "piighost",
    name: "piighost",
    tagline: "The core library. Build PII anonymization pipelines for AI agents.",
    repo: `${GITHUB_ORG}/piighost`,
    pypi: "https://pypi.org/project/piighost/",
    docs: "https://athroniaeth.github.io/piighost/",
  },
  {
    slug: "api",
    name: "piighost-api",
    tagline: "A REST server that hosts one piighost pipeline behind HTTP.",
    repo: `${GITHUB_ORG}/piighost-api`,
    pypi: "https://pypi.org/project/piighost-api/",
    docs: "https://athroniaeth.github.io/piighost-api/",
  },
  {
    slug: "chat",
    name: "piighost-chat",
    tagline: "A demo chatbot that anonymizes messages before the LLM sees them.",
    repo: `${GITHUB_ORG}/piighost-chat`,
  },
  {
    slug: "proofreader",
    name: "piighost-proofreader",
    tagline: "An LLM CV proofreader that anonymizes documents before any LLM call.",
    repo: `${GITHUB_ORG}/piighost-proofreader`,
  },
];

export const navLinks = projects.map((p) => ({ href: `/${p.slug}`, label: p.name }));
```

- [ ] **Step 2: Build to verify it imports cleanly**

```bash
pnpm build && echo "BUILD OK"
```
Expected: `BUILD OK`.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: site config (projects + nav)"
```

### Task 8: Navbar

**Files:**
- Create: `src/components/site-navbar.tsx`

- [ ] **Step 1: Create the navbar**

Create `src/components/site-navbar.tsx`:
```tsx
import Link from "next/link";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { GITHUB_ORG, navLinks } from "@/lib/site";

export function SiteNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-mono text-lg font-bold tracking-tight">
          piighost
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <Button key={l.href} asChild variant="ghost" size="sm">
              <Link href={l.href}>{l.label}</Link>
            </Button>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="GitHub">
            <a href={`${GITHUB_ORG}/piighost`} target="_blank" rel="noreferrer">
              <Github className="size-5" />
            </a>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
```
Note: mobile nav is intentionally simplified (links hidden under `md`); a burger menu is out of scope for v1 since the GitHub + theme controls remain reachable.

- [ ] **Step 2: Build to verify**

```bash
pnpm build && echo "BUILD OK"
```
Expected: `BUILD OK`.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: site navbar"
```

### Task 9: Footer

**Files:**
- Create: `src/components/site-footer.tsx`

- [ ] **Step 1: Create the footer**

Create `src/components/site-footer.tsx`:
```tsx
import Link from "next/link";
import { GITHUB_ORG, projects } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <p className="font-mono text-lg font-bold">piighost</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Anonymize PII before it reaches the LLM.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Projects</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {projects.map((p) => (
              <li key={p.slug}>
                <Link href={`/${p.slug}`} className="hover:text-foreground">
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Links</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><a className="hover:text-foreground" href={`${GITHUB_ORG}/piighost`} target="_blank" rel="noreferrer">GitHub</a></li>
            <li><a className="hover:text-foreground" href="https://pypi.org/project/piighost/" target="_blank" rel="noreferrer">PyPI</a></li>
            <li><a className="hover:text-foreground" href="https://athroniaeth.github.io/piighost/" target="_blank" rel="noreferrer">Documentation</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-6 text-center text-xs text-muted-foreground">
        MIT licensed. Built with Next.js and shadcn/ui.
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Wire navbar + footer into root layout**

In `src/app/layout.tsx`, import both and place them around `{children}` inside the `ThemeProvider`:
```tsx
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
```
Structure inside the provider:
```tsx
<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
  <div className="flex min-h-dvh flex-col">
    <SiteNavbar />
    <main className="flex-1">{children}</main>
    <SiteFooter />
  </div>
</ThemeProvider>
```

- [ ] **Step 3: Build to verify**

```bash
pnpm build && echo "BUILD OK"
```
Expected: `BUILD OK`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: site footer + layout shell"
```

### Task 10: CodeBlock component (Shiki + copy button)

**Files:**
- Create: `src/components/code-block.tsx`
- Create: `src/components/copy-button.tsx`
- Create: `src/components/copy-button.test.tsx`

- [ ] **Step 1: Write the failing test for the copy button**

Create `src/components/copy-button.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyButton } from "./copy-button";

describe("CopyButton", () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it("writes the given text to the clipboard on click", async () => {
    render(<CopyButton value="pip install piighost" />);
    await userEvent.click(screen.getByRole("button", { name: /copy/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("pip install piighost");
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

```bash
pnpm test src/components/copy-button.test.tsx
```
Expected: FAIL — cannot find module `./copy-button`.

- [ ] **Step 3: Create the copy button**

Create `src/components/copy-button.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Copy"
      onClick={onCopy}
      className="absolute right-2 top-2 size-7"
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </Button>
  );
}
```

- [ ] **Step 4: Run the test, confirm pass**

```bash
pnpm test src/components/copy-button.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Create the CodeBlock (server component, highlights at build time)**

Create `src/components/code-block.tsx`:
```tsx
import { codeToHtml } from "shiki";
import { CopyButton } from "@/components/copy-button";

type Props = { code: string; lang?: string };

export async function CodeBlock({ code, lang = "python" }: Props) {
  const html = await codeToHtml(code.trim(), {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });

  return (
    <div className="group relative overflow-hidden rounded-lg border bg-muted/30">
      <CopyButton value={code.trim()} />
      <div
        className="overflow-x-auto p-4 text-sm [&_pre]:bg-transparent [&_.shiki]:!bg-transparent"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
```
Note: `defaultColor: false` + the dual `themes` makes Shiki emit CSS variables for both themes; add the supporting CSS next.

- [ ] **Step 6: Add Shiki dual-theme CSS to `globals.css`**

Append to `src/app/globals.css`:
```css
html.dark .shiki,
html.dark .shiki span {
  color: var(--shiki-dark) !important;
  background-color: transparent !important;
}
```

- [ ] **Step 7: Build to verify (async server component must render)**

```bash
pnpm build && echo "BUILD OK"
```
Expected: `BUILD OK`.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: CodeBlock (shiki) + copy button"
```

### Task 11: AnonymizeFlow animated component

A scripted, looping visual that morphs a raw sentence into its anonymized form. Pure presentational logic — testable by asserting the computed display string for a given step.

**Files:**
- Create: `src/lib/anonymize-demo.ts`
- Create: `src/lib/anonymize-demo.test.ts`
- Create: `src/components/anonymize-flow.tsx`

- [ ] **Step 1: Write the failing test for the step formatter**

Create `src/lib/anonymize-demo.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { DEMO, renderStep } from "./anonymize-demo";

describe("renderStep", () => {
  it("returns the raw text at step 0", () => {
    expect(renderStep(DEMO, 0)).toBe("Email Patrick at patrick@acme.com");
  });
  it("replaces all entities at the final step", () => {
    expect(renderStep(DEMO, DEMO.entities.length)).toBe("Email <<PERSON:1>> at <<EMAIL:1>>");
  });
  it("replaces only the first entity at step 1", () => {
    expect(renderStep(DEMO, 1)).toBe("Email <<PERSON:1>> at patrick@acme.com");
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

```bash
pnpm test src/lib/anonymize-demo.test.ts
```
Expected: FAIL — cannot find module `./anonymize-demo`.

- [ ] **Step 3: Implement the formatter**

Create `src/lib/anonymize-demo.ts`:
```ts
export type Entity = { raw: string; placeholder: string };
export type Demo = { text: string; entities: Entity[] };

export const DEMO: Demo = {
  text: "Email Patrick at patrick@acme.com",
  entities: [
    { raw: "Patrick", placeholder: "<<PERSON:1>>" },
    { raw: "patrick@acme.com", placeholder: "<<EMAIL:1>>" },
  ],
};

export function renderStep(demo: Demo, step: number): string {
  let out = demo.text;
  for (let i = 0; i < step && i < demo.entities.length; i++) {
    const e = demo.entities[i];
    out = out.replace(e.raw, e.placeholder);
  }
  return out;
}
```

- [ ] **Step 4: Run the test, confirm pass**

```bash
pnpm test src/lib/anonymize-demo.test.ts
```
Expected: PASS (3 assertions).

- [ ] **Step 5: Create the animated component**

Create `src/components/anonymize-flow.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { DEMO, renderStep } from "@/lib/anonymize-demo";

export function AnonymizeFlow() {
  const [step, setStep] = useState(0);
  const max = DEMO.entities.length;

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s >= max + 1 ? 0 : s + 1)), 1400);
    return () => clearInterval(id);
  }, [max]);

  const shown = renderStep(DEMO, step);
  const labels = ["User input", "Detecting…", "Anonymized", "Sent to LLM"];
  const label = labels[Math.min(step, labels.length - 1)];

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="font-mono text-base sm:text-lg">
        {shown.split(/(<<[^>]+>>)/g).map((part, i) =>
          part.startsWith("<<") ? (
            <span key={i} className="rounded bg-primary/10 px-1 text-primary">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </p>
    </div>
  );
}
```

- [ ] **Step 6: Build to verify**

```bash
pnpm build && echo "BUILD OK"
```
Expected: `BUILD OK`.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: AnonymizeFlow animated hero visual"
```

### Task 12: Reusable section + project-card primitives

**Files:**
- Create: `src/components/section.tsx`
- Create: `src/components/project-card.tsx`

- [ ] **Step 1: Create the Section wrapper**

Create `src/components/section.tsx`:
```tsx
import type { ReactNode } from "react";

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-4 py-20">
      {(eyebrow || title || description) && (
        <div className="mx-auto mb-12 max-w-2xl text-center">
          {eyebrow && (
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">
              {eyebrow}
            </p>
          )}
          {title && <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>}
          {description && <p className="mt-4 text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
```

- [ ] **Step 2: Create the ProjectCard**

Create `src/components/project-card.tsx`:
```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Project } from "@/lib/site";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/${project.slug}`} className="group">
      <Card className="h-full transition-colors hover:border-primary">
        <CardHeader>
          <CardTitle className="font-mono text-lg">{project.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-full flex-col justify-between gap-4">
          <p className="text-sm text-muted-foreground">{project.tagline}</p>
          <span className="inline-flex items-center text-sm font-medium text-primary">
            Learn more
            <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 3: Build to verify**

```bash
pnpm build && echo "BUILD OK"
```
Expected: `BUILD OK`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: Section + ProjectCard primitives"
```

---

## Phase 3 — Landing page

### Task 13: Hero + problem sections

**Files:**
- Create: `src/components/landing/hero.tsx`
- Create: `src/components/landing/problem.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create the Hero**

Create `src/components/landing/hero.tsx`:
```tsx
import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnonymizeFlow } from "@/components/anonymize-flow";
import { GITHUB_ORG } from "@/lib/site";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,var(--primary)/12%,transparent)]" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Anonymize PII before it reaches the LLM
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            piighost is a Python library for PII anonymization pipelines. It swaps personal
            data for stable placeholders the model can reason about, then restores the real
            values for your tools and your users. Your agent code does not change.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/piighost">
                Get started <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={`${GITHUB_ORG}/piighost`} target="_blank" rel="noreferrer">
                <Github className="mr-1 size-4" /> GitHub
              </a>
            </Button>
          </div>
        </div>
        <AnonymizeFlow />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create the Problem section**

Create `src/components/landing/problem.tsx`:
```tsx
import { Cloud, Cpu, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Section } from "@/components/section";

const items = [
  {
    icon: Cloud,
    title: "Hosted clouds leak raw data",
    body: "OpenAI, Anthropic, and Google give you the best models, but every byte of context, including raw user PII, leaves your jurisdiction.",
  },
  {
    icon: Cpu,
    title: "Local models trade quality",
    body: "Self-hosting keeps data in, but you give up capability and take on the cost of running and maintaining the infrastructure.",
  },
  {
    icon: Scale,
    title: "Compliance does not wait",
    body: "GDPR and data-residency rules apply whether or not your stack was designed for them. Sending PII to a third party is a liability.",
  },
];

export function Problem() {
  return (
    <Section
      eyebrow="The problem"
      title="You should not have to choose between good models and data privacy"
    >
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((it) => (
          <Card key={it.title}>
            <CardHeader>
              <it.icon className="size-6 text-primary" />
              <CardTitle className="mt-3 text-lg">{it.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{it.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}
```

- [ ] **Step 3: Replace `src/app/page.tsx` with the assembled landing (sections added incrementally)**

Replace `src/app/page.tsx`:
```tsx
import { Hero } from "@/components/landing/hero";
import { Problem } from "@/components/landing/problem";

export default function Home() {
  return (
    <>
      <Hero />
      <Problem />
    </>
  );
}
```

- [ ] **Step 4: Build to verify**

```bash
pnpm build && echo "BUILD OK"
```
Expected: `BUILD OK`.

- [ ] **Step 5: Visual check in the dev server**

```bash
pnpm dev
```
Open `http://localhost:3000`. Confirm: hero renders, AnonymizeFlow animates through the 4 steps and loops, theme toggle flips light/dark, three problem cards show. Stop the server (Ctrl-C) when done.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: landing hero + problem sections"
```

### Task 14: How-it-works (tabbed pipeline) + detector-agnostic sections

**Files:**
- Create: `src/components/landing/how-it-works.tsx`
- Create: `src/components/landing/detector.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create the tabbed How-it-works**

Create `src/components/landing/how-it-works.tsx`:
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Section } from "@/components/section";

const steps = [
  {
    value: "detect",
    label: "Detect",
    body: "piighost runs your detectors over the message and finds PII spans: names, emails, addresses, anything the model does not need to see.",
  },
  {
    value: "anonymize",
    label: "Anonymize",
    body: "Each span is replaced with a stable placeholder such as <<PERSON:1>> or <<EMAIL:1>>. The same value keeps the same placeholder across the whole conversation.",
  },
  {
    value: "deanonymize",
    label: "Deanonymize",
    body: "Tool calls receive the real values, and the final response shown to the user is restored. The LLM only ever saw placeholders.",
  },
];

export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      eyebrow="How it works"
      title="A layer between your agent and the model"
    >
      <Tabs defaultValue="detect" className="mx-auto max-w-3xl">
        <TabsList className="grid w-full grid-cols-3">
          {steps.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {steps.map((s) => (
          <TabsContent key={s.value} value={s.value} className="mt-6">
            <div className="rounded-lg border bg-card p-6">
              <p className="text-muted-foreground">{s.body}</p>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </Section>
  );
}
```

- [ ] **Step 2: Create the detector-agnostic section (enforces the hard content rule)**

Create `src/components/landing/detector.tsx`:
```tsx
import { Regex, Brain, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Section } from "@/components/section";

const detectors = [
  { icon: Regex, title: "Regex", body: "Fast, deterministic rules for structured PII like emails, phone numbers, and IDs." },
  { icon: Brain, title: "NER", body: "Plug in a NER model when you need to catch names and locations in free text. You pick the engine." },
  { icon: Bot, title: "LLM", body: "Use an LLM as a detector when the data is messy and context matters." },
];

export function Detector() {
  return (
    <Section
      eyebrow="Your detector, your choice"
      title="piighost does not impose a detector"
      description="It is the orchestration layer. You wire in regex, a NER model, an LLM, or several at once with confidence arbitration. piighost handles linking, placeholders, and restoration around whatever you choose."
    >
      <div className="grid gap-6 md:grid-cols-3">
        {detectors.map((d) => (
          <Card key={d.title}>
            <CardHeader>
              <d.icon className="size-6 text-primary" />
              <CardTitle className="mt-3 text-lg">{d.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{d.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}
```

- [ ] **Step 3: Add both to `src/app/page.tsx`**

Update `src/app/page.tsx`:
```tsx
import { Hero } from "@/components/landing/hero";
import { Problem } from "@/components/landing/problem";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Detector } from "@/components/landing/detector";

export default function Home() {
  return (
    <>
      <Hero />
      <Problem />
      <HowItWorks />
      <Detector />
    </>
  );
}
```

- [ ] **Step 4: Build to verify**

```bash
pnpm build && echo "BUILD OK"
```
Expected: `BUILD OK`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: how-it-works tabs + detector-agnostic section"
```

### Task 15: Ecosystem, quick start, and final CTA sections

**Files:**
- Create: `src/components/landing/ecosystem.tsx`
- Create: `src/components/landing/quickstart.tsx`
- Create: `src/components/landing/cta.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create the Ecosystem section**

Create `src/components/landing/ecosystem.tsx`:
```tsx
import { Section } from "@/components/section";
import { ProjectCard } from "@/components/project-card";
import { projects } from "@/lib/site";

export function Ecosystem() {
  return (
    <Section
      id="ecosystem"
      eyebrow="The ecosystem"
      title="Four projects, one privacy layer"
      description="Start with the library. Reach for the server, the chat demo, and the proofreader as you grow."
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {projects.map((p) => (
          <ProjectCard key={p.slug} project={p} />
        ))}
      </div>
    </Section>
  );
}
```

- [ ] **Step 2: Create the Quick start section**

Create `src/components/landing/quickstart.tsx`:
```tsx
import { Section } from "@/components/section";
import { CodeBlock } from "@/components/code-block";

const install = `uv add piighost`;

const usage = `from langchain.agents import create_agent
from piighost.middleware import PIIAnonymizationMiddleware

agent = create_agent(
    model="openai:gpt-4o",
    tools=[send_email],
    middleware=[PIIAnonymizationMiddleware()],
)

# The LLM sees "<<PERSON:1>>" and "<<EMAIL:1>>".
# Your send_email tool still receives the real address.
result = agent.invoke({"messages": [("user", "Email Patrick at patrick@acme.com")]})`;

export function QuickStart() {
  return (
    <Section
      eyebrow="Quick start"
      title="Drop it into a LangChain agent"
      description="Add the middleware and your agent code stays the same."
    >
      <div className="mx-auto grid max-w-3xl gap-4">
        <CodeBlock code={install} lang="bash" />
        <CodeBlock code={usage} lang="python" />
      </div>
    </Section>
  );
}
```
Note: verify the exact import path against the piighost README during implementation; if `piighost.middleware` differs, use the README's path. Do not invent a path.

- [ ] **Step 3: Create the final CTA**

Create `src/components/landing/cta.tsx`:
```tsx
import { ArrowRight, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GITHUB_ORG } from "@/lib/site";

export function Cta() {
  return (
    <section className="border-t bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ship AI features without shipping user data
        </h2>
        <p className="mt-4 text-muted-foreground">
          Install piighost, wire your detector, and keep PII out of the model.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg">
            <a href="https://athroniaeth.github.io/piighost/" target="_blank" rel="noreferrer">
              Read the docs <ArrowRight className="ml-1 size-4" />
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={`${GITHUB_ORG}/piighost`} target="_blank" rel="noreferrer">
              <Github className="mr-1 size-4" /> Star on GitHub
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Finalize `src/app/page.tsx`**

```tsx
import { Hero } from "@/components/landing/hero";
import { Problem } from "@/components/landing/problem";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Detector } from "@/components/landing/detector";
import { Ecosystem } from "@/components/landing/ecosystem";
import { QuickStart } from "@/components/landing/quickstart";
import { Cta } from "@/components/landing/cta";

export default function Home() {
  return (
    <>
      <Hero />
      <Problem />
      <HowItWorks />
      <Detector />
      <Ecosystem />
      <QuickStart />
      <Cta />
    </>
  );
}
```

- [ ] **Step 5: Build + visual check**

```bash
pnpm build && echo "BUILD OK"
```
Then `pnpm dev`, open `http://localhost:3000`, scroll the full page, confirm all 7 sections render in both themes, code blocks highlight and copy works, ecosystem cards link to `/piighost` etc. (those pages 404 until Phase 4 — expected). Stop the server.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: ecosystem, quick start, and CTA sections"
```

---

## Phase 4 — Project pages (MDX)

### Task 16: Wire up MDX

**Files:**
- Modify: `next.config.ts`
- Create: `mdx-components.tsx` (project root)
- Modify: `package.json`

- [ ] **Step 1: Install MDX packages**

```bash
pnpm add @next/mdx @mdx-js/loader @mdx-js/react @types/mdx
```

- [ ] **Step 2: Update `next.config.ts` to handle MDX**

Replace contents:
```ts
import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  pageExtensions: ["ts", "tsx", "md", "mdx"],
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
```

- [ ] **Step 3: Create the MDX components mapping**

Create `mdx-components.tsx` at the project root:
```tsx
import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (p) => <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" {...p} />,
    h2: (p) => <h2 className="mt-12 text-2xl font-semibold tracking-tight" {...p} />,
    h3: (p) => <h3 className="mt-8 text-xl font-semibold" {...p} />,
    p: (p) => <p className="mt-4 leading-7 text-muted-foreground" {...p} />,
    ul: (p) => <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground" {...p} />,
    li: (p) => <li className="leading-7" {...p} />,
    a: (p) => <a className="text-primary underline-offset-4 hover:underline" {...p} />,
    code: (p) => <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm" {...p} />,
    ...components,
  };
}
```

- [ ] **Step 4: Build to verify MDX pipeline loads**

```bash
pnpm build && echo "BUILD OK"
```
Expected: `BUILD OK`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: wire up @next/mdx"
```

### Task 17: Project page layout shell

A shared header used by all four project pages, rendered above the MDX body.

**Files:**
- Create: `src/components/project-header.tsx`

- [ ] **Step 1: Create the project header**

Create `src/components/project-header.tsx`:
```tsx
import { Github, BookOpen, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/site";

export function ProjectHeader({ project }: { project: Project }) {
  return (
    <div className="border-b">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-mono text-3xl font-bold sm:text-4xl">{project.name}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{project.tagline}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="outline" size="sm">
            <a href={project.repo} target="_blank" rel="noreferrer">
              <Github className="mr-1 size-4" /> Repository
            </a>
          </Button>
          {project.docs && (
            <Button asChild variant="outline" size="sm">
              <a href={project.docs} target="_blank" rel="noreferrer">
                <BookOpen className="mr-1 size-4" /> Docs
              </a>
            </Button>
          )}
          {project.pypi && (
            <Button asChild variant="outline" size="sm">
              <a href={project.pypi} target="_blank" rel="noreferrer">
                <Package className="mr-1 size-4" /> PyPI
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build to verify**

```bash
pnpm build && echo "BUILD OK"
```
Expected: `BUILD OK`.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: project page header"
```

### Task 18: `/piighost` page

Each project page is `src/app/<slug>/page.mdx`. It imports the shared header and the CodeBlock. Content is adapted (rewritten short) from the repo README; obey the content rules (no em-dashes, no banned words, detector-agnostic framing).

**Files:**
- Create: `src/app/piighost/page.mdx`

- [ ] **Step 1: Create the page**

Create `src/app/piighost/page.mdx`:
```mdx
import { ProjectHeader } from "@/components/project-header";
import { CodeBlock } from "@/components/code-block";
import { projects } from "@/lib/site";

export const metadata = { title: "piighost" };

<ProjectHeader project={projects.find((p) => p.slug === "piighost")} />

<div className="mx-auto max-w-3xl px-4 py-12">

## What it does

piighost is the core library. It sits between your agent and the model. It detects PII,
replaces it with stable placeholders the model can reason about, and restores the real
values for your tools and your end users. The same value keeps the same placeholder across
a whole conversation, even across multiple messages and tool calls.

It is detector-agnostic: you wire in regex, a NER model, an LLM, or several at once. piighost
handles detection arbitration, a tolerant linker for typos and case variants, and output
guardrails for when the model generates fresh PII in its reply.

## Install

<CodeBlock code={`uv add piighost`} lang="bash" />

## Use it as LangChain middleware

<CodeBlock code={`from langchain.agents import create_agent
from piighost.middleware import PIIAnonymizationMiddleware

agent = create_agent(
    model="openai:gpt-4o",
    tools=[send_email],
    middleware=[PIIAnonymizationMiddleware()],
)`} lang="python" />

## Where it fits

The library embeds in your Python process. When you need one shared inference endpoint
across several processes, reach for piighost-api. To see it end to end, look at the chat
demo and the proofreader.

</div>
```
Note: confirm the `PIIAnonymizationMiddleware` import path against the README before finalizing.

- [ ] **Step 2: Build + visual check**

```bash
pnpm build && echo "BUILD OK"
```
Then `pnpm dev`, open `http://localhost:3000/piighost`, confirm header + content render, code blocks highlight, badges link out. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: /piighost project page"
```

### Task 19: `/api` page

**Files:**
- Create: `src/app/api/page.mdx`

- [ ] **Step 1: Create the page**

Create `src/app/api/page.mdx`:
```mdx
import { ProjectHeader } from "@/components/project-header";
import { CodeBlock } from "@/components/code-block";
import { projects } from "@/lib/site";

export const metadata = { title: "piighost-api" };

<ProjectHeader project={projects.find((p) => p.slug === "api")} />

<div className="mx-auto max-w-3xl px-4 py-12">

## What it does

piighost-api is a REST server that hosts one configurable piighost pipeline behind HTTP.
The library embeds in your process; the API lets several processes (chat backends, batch
jobs, notebooks) hit one inference endpoint without re-loading models or duplicating cache
state.

## Features

- Anonymize and deanonymize endpoints over the full pipeline.
- Any piighost detector, loaded once and shared across requests.
- Thread-scoped memory so entities stay consistent across a conversation.
- API-key authentication with Argon2 hashing, scopes, and expiration.
- Redis cache for shared anonymization mappings.
- Pipeline configured at startup with a module:variable import path.

## Quick start

<CodeBlock code={`uv add piighost-api
piighost-api serve pipeline:pipeline --port 8000`} lang="bash" />

## Talk to it

<CodeBlock code={`POST /v1/anonymize
{ "text": "Email Patrick at patrick@acme.com" }

200 OK
{ "anonymized_text": "Email <<PERSON:1>> at <<EMAIL:1>>", "entities": [ ... ] }`} lang="json" />

</div>
```

- [ ] **Step 2: Build + visual check**

```bash
pnpm build && echo "BUILD OK"
```
Then `pnpm dev`, open `http://localhost:3000/api`, confirm render. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: /api project page"
```

### Task 20: `/chat` page

**Files:**
- Create: `src/app/chat/page.mdx`

- [ ] **Step 1: Create the page**

Create `src/app/chat/page.mdx`:
```mdx
import { ProjectHeader } from "@/components/project-header";
import { CodeBlock } from "@/components/code-block";
import { projects } from "@/lib/site";

export const metadata = { title: "piighost-chat" };

<ProjectHeader project={projects.find((p) => p.slug === "chat")} />

<div className="mx-auto max-w-3xl px-4 py-12">

## What it demonstrates

piighost-chat is a demo chatbot that shows a privacy-preserving conversation end to end.
User messages are anonymized before they reach the LLM, and responses are deanonymized
before they reach the user. Tools receive the real values.

## The stack

- A React frontend and a Litestar backend running a LangChain agent.
- PIIAnonymizationMiddleware wrapping the agent: anonymize before the LLM, deanonymize after.
- piighost-api for detection and highlighting, with thread-scoped memory for consistent
  placeholders.
- keyshield for API-key authentication.

## The user flow

1. The user types a message.
2. The backend calls piighost-api to detect PII; the frontend highlights the entities.
3. The user confirms, and the message goes to the agent.
4. The middleware anonymizes it before the model sees it, and deanonymizes the reply.

## Run it

<CodeBlock code={`git clone https://github.com/Athroniaeth/piighost-chat
cd piighost-chat
docker compose up`} lang="bash" />

</div>
```
Note: confirm the run command against the repo (it uses Docker Compose per the README); adjust if the compose file or steps differ.

- [ ] **Step 2: Build + visual check**

```bash
pnpm build && echo "BUILD OK"
```
Then `pnpm dev`, open `http://localhost:3000/chat`, confirm render. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: /chat project page"
```

### Task 21: `/proofreader` page

**Files:**
- Create: `src/app/proofreader/page.mdx`

- [ ] **Step 1: Create the page**

Create `src/app/proofreader/page.mdx`:
```mdx
import { ProjectHeader } from "@/components/project-header";
import { CodeBlock } from "@/components/code-block";
import { projects } from "@/lib/site";

export const metadata = { title: "piighost-proofreader" };

<ProjectHeader project={projects.find((p) => p.slug === "proofreader")} />

<div className="mx-auto max-w-3xl px-4 py-12">

## What it does

piighost-proofreader is an LLM-powered proofreader for CVs. You upload a PDF and get an
annotated list of mistakes with click-to-highlight on the rendered pages. The document is
anonymized with piighost-api before any LLM call.

## How it works

1. opendataloader-pdf converts the PDF to Markdown for the LLM.
2. PyMuPDF renders each page and emits per-word bounding boxes.
3. piighost-api anonymizes the Markdown before the LLM sees it.
4. A LangChain and LiteLLM chain runs structured-output proofreading.
5. A locator re-anchors each mistake to a page and bounding box.
6. Streamlit renders the pages with overlays; clicking a mistake highlights it.

## Run it

<CodeBlock code={`uv sync --group dev
cp .env.example .env  # fill in LITELLM_API_KEY etc.
uv run streamlit run app.py`} lang="bash" />

You also need a running piighost-api at the URL declared in your .env.

</div>
```

- [ ] **Step 2: Build + visual check**

```bash
pnpm build && echo "BUILD OK"
```
Then `pnpm dev`, open `http://localhost:3000/proofreader`, confirm render. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: /proofreader project page"
```

---

## Phase 5 — Polish and ship

### Task 22: Active-link highlighting in the navbar

**Files:**
- Create: `src/components/nav-link.tsx`
- Modify: `src/components/site-navbar.tsx`

- [ ] **Step 1: Create a client NavLink that knows the current path**

Create `src/components/nav-link.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname === `${href}/`;
  return (
    <Button asChild variant="ghost" size="sm">
      <Link href={href} className={cn(active && "text-primary")}>
        {label}
      </Link>
    </Button>
  );
}
```

- [ ] **Step 2: Use it in the navbar**

In `src/components/site-navbar.tsx`, replace the `navLinks.map(...)` block with:
```tsx
import { NavLink } from "@/components/nav-link";
```
and
```tsx
{navLinks.map((l) => (
  <NavLink key={l.href} href={l.href} label={l.label} />
))}
```

- [ ] **Step 3: Build to verify**

```bash
pnpm build && echo "BUILD OK"
```
Expected: `BUILD OK`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: active link highlighting in navbar"
```

### Task 23: 404 page + favicon/OG metadata

**Files:**
- Create: `src/app/not-found.tsx`

- [ ] **Step 1: Create a not-found page**

Create `src/app/not-found.tsx`:
```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-32 text-center">
      <p className="font-mono text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-semibold">This page slipped past the placeholder</h1>
      <p className="mt-2 text-muted-foreground">The page you are looking for does not exist.</p>
      <Button asChild className="mt-8">
        <Link href="/">Back home</Link>
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Build to verify**

```bash
pnpm build && echo "BUILD OK"
```
Expected: `BUILD OK`.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: custom 404 page"
```

### Task 24: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

```bash
pnpm test
```
Expected: all test files pass (utils, theme-toggle, copy-button, anonymize-demo).

- [ ] **Step 2: Lint**

```bash
pnpm lint
```
Expected: no errors. Fix any reported issues, then re-run.

- [ ] **Step 3: Production build + static export**

```bash
pnpm build && test -f out/index.html && test -f out/piighost/index.html && test -f out/api/index.html && test -f out/chat/index.html && test -f out/proofreader/index.html && echo "ALL PAGES EXPORTED"
```
Expected: `ALL PAGES EXPORTED`.

- [ ] **Step 4: Serve the static export and eyeball it**

```bash
pnpm dlx serve out
```
Open the served URL. Walk every page in both light and dark themes. Confirm: nav works, code copy works, animation loops, all external links resolve, no console errors. Stop the server.

- [ ] **Step 5: Content rule audit**

Grep the source for banned copy patterns:
```bash
grep -rnE "—|seamless|robust|delve|leverage|unlock" src/ || echo "CLEAN"
```
Expected: `CLEAN`. If anything matches, rewrite that copy.

- [ ] **Step 6: Final commit**

```bash
git add -A && git commit -m "chore: full verification pass" --allow-empty
```

---

## Self-Review notes

- **Spec coverage:** stack (Tasks 1-4), light+dark theme (Task 5), indigo accent (Task 6), multi-page structure (Tasks 13-21), LangChain-inspired patterns — hero+gradient (13), 3-col card grids (13/14), tabbed pipeline (14), card ecosystem (15) — MDX project pages (16-21), detector-agnostic hard rule (Task 14 + every project page), copy rules (Task 24 audit), static export (Task 2/24), illustrative demo not live backend (Task 11). All covered.
- **Deferred per spec:** FR version, live API demo, analytics, CMS — intentionally absent.
- **Verify-against-README flags:** the `PIIAnonymizationMiddleware` import path (Tasks 15/18) and the chat run command (Task 20) must be confirmed against the actual repos during implementation, not invented.
