"use client";

import type { ReactNode } from "react";
import { useT } from "@/i18n/use-t";

type ProjectSlug = "piighost" | "api" | "chat" | "proofreader";

export function ProjectArticle({
  slug,
  codeBlocks,
}: {
  slug: ProjectSlug;
  codeBlocks: Record<string, ReactNode>;
}) {
  const { t } = useT();
  const page = t.projects[slug];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {page.sections.map((section, i) => (
        <section key={i} className="mt-10 first:mt-0">
          <h2 className="text-2xl font-semibold tracking-tight">{section.heading}</h2>

          {section.paragraphs?.map((p, j) => (
            <p
              key={j}
              className="mt-4 leading-7 text-justify hyphens-auto text-muted-foreground"
            >
              {p}
            </p>
          ))}

          {section.list &&
            (section.ordered ? (
              <ol className="mt-4 list-decimal space-y-2 pl-6 leading-7 text-muted-foreground">
                {section.list.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ol>
            ) : (
              <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-muted-foreground">
                {section.list.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            ))}

          {section.code && codeBlocks[section.code] && (
            <div className="mt-4">{codeBlocks[section.code]}</div>
          )}

          {section.afterCode && (
            <p className="mt-4 leading-7 text-justify hyphens-auto text-muted-foreground">
              {section.afterCode}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
