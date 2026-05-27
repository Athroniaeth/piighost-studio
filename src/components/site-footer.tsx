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
