import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { GithubIcon } from "@/components/github-icon";
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
            <Button key={l.href} variant="ghost" size="sm" render={<Link href={l.href} />}>
              {l.label}
            </Button>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="GitHub"
            render={<a href={`${GITHUB_ORG}/piighost`} target="_blank" rel="noreferrer" />}
          >
            <GithubIcon className="size-5" />
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
