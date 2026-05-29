"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { GithubIcon } from "@/components/github-icon";
import { NavLink } from "@/components/nav-link";
import { GITHUB_ORG, projects } from "@/lib/site";
import { useT } from "@/i18n/use-t";
import { cn } from "@/lib/utils";

export function SiteNavbar() {
  const { t } = useT();
  const pathname = usePathname();
  const projectsActive = projects.some(
    (p) => pathname === `/${p.slug}` || pathname === `/${p.slug}/`,
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-mono text-lg font-bold tracking-tight">
          piighost
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className={cn(projectsActive && "text-primary")}>
                  {t.nav.projects}
                </NavigationMenuTrigger>
                <NavigationMenuContent className="min-w-[280px]">
                  <ul className="grid gap-1 p-1">
                    {projects.map((p) => {
                      const label = (t.nav[p.slug as keyof typeof t.nav] ?? p.name) as string;
                      const tagline =
                        t.projects[p.slug as keyof typeof t.projects]?.tagline ?? p.tagline;
                      return (
                        <li key={p.slug}>
                          <NavigationMenuLink render={<Link href={`/${p.slug}`} />}>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono text-sm font-medium">{label}</span>
                              <span className="text-xs text-muted-foreground">{tagline}</span>
                            </div>
                          </NavigationMenuLink>
                        </li>
                      );
                    })}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          <NavLink href="/playground" label={t.nav.playground} />
          <NavLink href="/philosophy" label={t.nav.philosophy} />
        </div>
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
