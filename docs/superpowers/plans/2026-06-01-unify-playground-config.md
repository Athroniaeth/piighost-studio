# Unify Playground + Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the separate `/playground` and `/config` navbar entries into a single "Playground" entry, moving config to `/playground/config`, with a shared tab bar that switches between the Detector and Config views.

**Architecture:** A single navbar "Playground" link active across `/playground/*`. The config route moves under `/playground/config`. A new client `PlaygroundTabs` component (real `Link`s, active state from `usePathname`) is rendered at the top of both view components so each view can navigate to the other.

**Tech Stack:** Next.js 16 App Router (static export), React 19, TypeScript, Vitest + Testing Library + jsdom, Tailwind v4, base-ui.

**Spec:** `docs/superpowers/specs/2026-06-01-unify-playground-config-design.md`

---

## File Structure

- **Create** `src/components/playground/playground-tabs.tsx` — the Detector⟷Config tab bar (one responsibility: cross-view navigation with active state).
- **Create** `src/components/playground/playground-tabs.test.tsx` — unit tests for it.
- **Create** `src/app/playground/config/page.tsx` — the Config route, moved under playground (wraps `ConfigBuilder`).
- **Delete** `src/app/config/page.tsx` (and the now-empty `src/app/config/` dir).
- **Modify** `src/components/nav-link.tsx` — add opt-in subpath active matching.
- **Modify** `src/components/site-navbar.tsx` — one "Playground" entry (subpath-active); drop the "Config" entry.
- **Modify** `src/components/playground/detector-playground.tsx` — render `<PlaygroundTabs />` at the top.
- **Modify** `src/components/playground/config-builder.tsx` — render `<PlaygroundTabs />` at the top.
- **Modify** `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/fr.ts` — add `playground.tabDetector` / `playground.tabConfig`; remove the now-unused `nav.config`.

---

## Task 1: `PlaygroundTabs` component (TDD)

**Files:**
- Create: `src/components/playground/playground-tabs.tsx`
- Test: `src/components/playground/playground-tabs.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/playground/playground-tabs.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
vi.mock("@/i18n/use-t", () => ({
  useT: () => ({ t: { playground: { tabDetector: "Detector", tabConfig: "Config" } } }),
}));

import { usePathname } from "next/navigation";
import { PlaygroundTabs } from "./playground-tabs";

const setPath = (p: string) =>
  (usePathname as unknown as ReturnType<typeof vi.fn>).mockReturnValue(p);

describe("PlaygroundTabs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("links to both playground surfaces", () => {
    setPath("/playground");
    render(<PlaygroundTabs />);
    expect(screen.getByRole("link", { name: "Detector" })).toHaveAttribute("href", "/playground");
    expect(screen.getByRole("link", { name: "Config" })).toHaveAttribute(
      "href",
      "/playground/config",
    );
  });

  it("marks Detector active on /playground", () => {
    setPath("/playground");
    render(<PlaygroundTabs />);
    expect(screen.getByRole("link", { name: "Detector" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Config" })).not.toHaveAttribute("aria-current");
  });

  it("marks Config active on /playground/config", () => {
    setPath("/playground/config");
    render(<PlaygroundTabs />);
    expect(screen.getByRole("link", { name: "Config" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Detector" })).not.toHaveAttribute("aria-current");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/components/playground/playground-tabs.test.tsx`
Expected: FAIL — module `./playground-tabs` not found.

- [ ] **Step 3: Implement the component**

Create `src/components/playground/playground-tabs.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/use-t";
import { cn } from "@/lib/utils";

/** Tab bar that switches between the two playground surfaces:
 *  Detector (/playground) and Config (/playground/config). Rendered at the top
 *  of both views so each can navigate to the other. */
export function PlaygroundTabs() {
  const { t } = useT();
  const pathname = usePathname();
  const onConfig = pathname.startsWith("/playground/config");
  const tabs = [
    { href: "/playground", label: t.playground.tabDetector, active: !onConfig },
    { href: "/playground/config", label: t.playground.tabConfig, active: onConfig },
  ];

  return (
    <nav className="mb-3 flex shrink-0 gap-1 self-start rounded-lg border bg-muted/40 p-1 text-sm">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium transition-colors",
            tab.active
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/components/playground/playground-tabs.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/playground/playground-tabs.tsx src/components/playground/playground-tabs.test.tsx
git commit -m "feat(playground): add Detector/Config tab bar component"
```

---

## Task 2: i18n — tab labels + drop unused nav.config

**Files:**
- Modify: `src/i18n/types.ts`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/fr.ts`

- [ ] **Step 1: Add tab keys to the type, remove nav.config**

In `src/i18n/types.ts`:
- In the `nav` object type, remove the line `config: string;`.
- In the `playground` object type, add (next to existing keys like `loadingRuntime`):
```ts
    tabDetector: string;
    tabConfig: string;
```

- [ ] **Step 2: Update English dictionary**

In `src/i18n/en.ts`:
- In the `nav` block, remove the line `config: "Config",`.
- In the `playground` block, add:
```ts
    tabDetector: "Detector",
    tabConfig: "Config",
```

- [ ] **Step 3: Update French dictionary**

In `src/i18n/fr.ts`:
- In the `nav` block, remove the line `config: "Config",` (whatever its French value is — it is the `nav.config` entry).
- In the `playground` block, add:
```ts
    tabDetector: "Détecteur",
    tabConfig: "Config",
```

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: it MAY report an error in `src/components/site-navbar.tsx` (it still references `t.nav.config`) — that is EXPECTED and fixed in Task 3. There must be NO other errors (both dictionaries must still satisfy the `Dictionary` type). Report the exact errors; they must be confined to `site-navbar.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/types.ts src/i18n/en.ts src/i18n/fr.ts
git commit -m "i18n(playground): add tab labels, drop unused nav.config"
```

---

## Task 3: NavLink subpath matching + single navbar entry

**Files:**
- Modify: `src/components/nav-link.tsx`
- Modify: `src/components/site-navbar.tsx`

- [ ] **Step 1: Add opt-in subpath active matching to NavLink**

Replace the contents of `src/components/nav-link.tsx` with:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  label,
  matchSubpaths = false,
}: {
  href: string;
  label: string;
  matchSubpaths?: boolean;
}) {
  const pathname = usePathname();
  const active =
    pathname === href ||
    pathname === `${href}/` ||
    (matchSubpaths && pathname.startsWith(`${href}/`));
  return (
    <Button
      variant="ghost"
      size="sm"
      render={<Link href={href} className={cn(active && "text-primary")} />}
    >
      {label}
    </Button>
  );
}
```

- [ ] **Step 2: Update the navbar to a single Playground entry**

In `src/components/site-navbar.tsx`, replace these two lines:
```tsx
          <NavLink href="/playground" label={t.nav.playground} />
          <NavLink href="/config" label={t.nav.config} />
```
with:
```tsx
          <NavLink href="/playground" label={t.nav.playground} matchSubpaths />
```

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (no errors — the `t.nav.config` reference is gone; the dictionaries no longer declare it).

- [ ] **Step 4: Commit**

```bash
git add src/components/nav-link.tsx src/components/site-navbar.tsx
git commit -m "feat(nav): single Playground entry, active across /playground subpaths"
```

---

## Task 4: Move the Config route + mount the tabs

**Files:**
- Create: `src/app/playground/config/page.tsx`
- Delete: `src/app/config/page.tsx`
- Modify: `src/components/playground/detector-playground.tsx`
- Modify: `src/components/playground/config-builder.tsx`

- [ ] **Step 1: Move the config route under playground**

Run:
```bash
mkdir -p src/app/playground/config
git mv src/app/config/page.tsx src/app/playground/config/page.tsx
rmdir src/app/config 2>/dev/null || true
```

- [ ] **Step 2: Verify the moved page content (no path changes needed)**

The moved `src/app/playground/config/page.tsx` imports `ConfigBuilder` via the `@/` alias, so the move needs no edit. Confirm it reads exactly:
```tsx
import { ConfigBuilder } from "@/components/playground/config-builder";

export const metadata = { title: "Config" };

export default function ConfigPage() {
  return <ConfigBuilder />;
}
```
If it differs, leave its logic intact — only the file location changed.

- [ ] **Step 3: Mount the tab bar in the Detector view**

In `src/components/playground/detector-playground.tsx`:
- Add the import (with the other `@/components/playground/...` imports near the top):
```tsx
import { PlaygroundTabs } from "@/components/playground/playground-tabs";
```
- The component's root container opens with:
```tsx
    <div className="flex w-full flex-col p-4 lg:h-[calc(100dvh-4rem)]">
```
Insert `<PlaygroundTabs />` as its first child, so it becomes:
```tsx
    <div className="flex w-full flex-col p-4 lg:h-[calc(100dvh-4rem)]">
      <PlaygroundTabs />
```
(Leave the rest of the children unchanged.)

- [ ] **Step 4: Mount the tab bar in the Config view**

In `src/components/playground/config-builder.tsx`:
- Add the import near the other `@/components/playground/...` imports:
```tsx
import { PlaygroundTabs } from "@/components/playground/playground-tabs";
```
- The component's root container opens with:
```tsx
    <div className="flex w-full flex-col p-4 lg:h-[calc(100dvh-4rem)]">
```
Insert `<PlaygroundTabs />` as its first child:
```tsx
    <div className="flex w-full flex-col p-4 lg:h-[calc(100dvh-4rem)]">
      <PlaygroundTabs />
```

- [ ] **Step 5: Type-check and build**

Run: `pnpm exec tsc --noEmit && pnpm build`
Expected: green. The static export must list BOTH `/playground` and `/playground/config` (and NO `/config`).

- [ ] **Step 6: Commit**

```bash
git add src/app/playground/config/page.tsx src/components/playground/detector-playground.tsx src/components/playground/config-builder.tsx
git commit -m "feat(playground): move config to /playground/config and mount the tab bar"
```

---

## Task 5: Verify

**Files:** none (verification only)

- [ ] **Step 1: No stale `/config` route references**

Run:
```bash
grep -rn '"/config"\|href="/config"\|href={`/config' src
```
Expected: no matches. (Internal lib names like `detector-config`, `config-builder`, `/playground?edit=` are unrelated and fine.)

- [ ] **Step 2: Confirm the old route is gone and the new one exists**

Run:
```bash
test ! -e src/app/config/page.tsx && echo "old route removed"
test -e src/app/playground/config/page.tsx && echo "new route present"
```
Expected: both lines print.

- [ ] **Step 3: Full fast suite + build**

Run: `pnpm test && pnpm build`
Expected: tests pass (including the new `playground-tabs` tests); build prerenders `/playground` and `/playground/config`.

- [ ] **Step 4: Manual browser check**

Start `pnpm dev`, open `http://localhost:3000/playground`. Expected:
- Navbar shows a single "Playground" entry (no "Config"), highlighted.
- A tab bar "Detector | Config" sits at the top; "Detector" is active.
- Click "Config" → navigates to `/playground/config`, the pipeline builder shows, "Config" tab active, navbar "Playground" still highlighted.
- Click "Detector" → back to `/playground`.
- Visiting `http://localhost:3000/config` directly returns the 404 page (route removed).

- [ ] **Step 5: Final commit (only if a fix was needed)**

If steps required changes, commit them; otherwise nothing to do.

---

## Self-Review notes (for the implementer)

- **Spec coverage:** single navbar entry (Task 3), `/config`→`/playground/config` move (Task 4), shared tab bar with active state (Tasks 1+4), i18n tab labels + nav.config removal (Task 2), preserved `/playground?edit=` cross-link (untouched — `/playground` does not move), tests for tabs + build prerender of both routes (Tasks 1, 5). All covered.
- **Type consistency:** the component uses `t.playground.tabDetector` / `t.playground.tabConfig`, defined in Task 2; `NavLink`'s new `matchSubpaths` prop (Task 3) is used by the navbar in the same task.
- **No redirect for old `/config`** is an intentional spec decision (young project); Task 5 Step 4 asserts the 404.
