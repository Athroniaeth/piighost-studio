"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { GithubIcon } from "@/components/github-icon";
import { NavLink } from "@/components/nav-link";
import { GITHUB_ORG, projects } from "@/lib/site";
import { useT } from "@/i18n/use-t";

export function SiteNavbar() {
  const { t } = useT();
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-mono text-lg font-bold tracking-tight">
          piighost
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {projects.map((p) => {
            const label = (t.nav[p.slug as keyof typeof t.nav] ?? p.name) as string;
            return (
              <NavLink key={`/${p.slug}`} href={`/${p.slug}`} label={label} />
            );
          })}
          <NavLink href="/philosophy" label={t.nav.philosophy} />
        </nav>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t.nav.github}
            render={<a href={`${GITHUB_ORG}/piighost`} target="_blank" rel="noreferrer" />}
          >
            <GithubIcon className="size-5" />
          </Button>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
