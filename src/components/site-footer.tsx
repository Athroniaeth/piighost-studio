"use client";

import Link from "next/link";
import { GITHUB_ORG, projects } from "@/lib/site";
import { useT } from "@/i18n/use-t";
import { localePath } from "@/i18n/locale-path";

export function SiteFooter() {
  const { t, locale } = useT();
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <p className="font-mono text-lg font-bold">piighost</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            {t.footer.tagline}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">{t.footer.projects}</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {projects.map((p) => (
              <li key={p.slug}>
                <Link href={localePath(locale, `/${p.slug}`)} className="hover:text-foreground">
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">{t.footer.links}</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><a className="hover:text-foreground" href={`${GITHUB_ORG}/piighost`} target="_blank" rel="noreferrer">GitHub</a></li>
            <li><a className="hover:text-foreground" href="https://pypi.org/project/piighost/" target="_blank" rel="noreferrer">PyPI</a></li>
            <li><a className="hover:text-foreground" href="https://athroniaeth.github.io/piighost/" target="_blank" rel="noreferrer">Documentation</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-6 text-center text-xs text-muted-foreground">
        {t.footer.mit}
      </div>
    </footer>
  );
}
