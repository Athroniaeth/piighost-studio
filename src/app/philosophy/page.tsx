"use client";

import { useT } from "@/i18n/use-t";
import type { PhilosophyDict } from "@/i18n/types";

function PhilosophyTable({ table }: { table: NonNullable<PhilosophyDict["sections"][number]["table"]> }) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full border-separate border border-border text-sm text-left">
        <thead>
          <tr>
            {table.headers.map((h) => (
              <th
                key={h}
                className="border border-border bg-muted px-3 py-2 font-semibold"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className="even:bg-muted/40">
              {row.map((cell, ci) => (
                <td key={ci} className="border border-border px-3 py-2 text-muted-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PhilosophyPage() {
  const { t } = useT();
  const p = t.philosophy;

  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <header className="mb-12 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">
          {p.eyebrow}
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl 2xl:text-4xl">{p.title}</h1>
      </header>
      {p.intro && (
        <p className="mb-12 text-justify text-lg leading-relaxed hyphens-auto text-muted-foreground 2xl:text-base">{p.intro}</p>
      )}

      {p.sections.map((section, si) => (
        <section key={section.id ?? si} id={section.id}>
          <h2 className="mt-12 text-2xl font-semibold tracking-tight 2xl:text-xl">{section.heading}</h2>

          {section.paragraphs.map((para, pi) => (
            <p key={pi} className="mt-4 text-justify hyphens-auto leading-7 text-muted-foreground">{para}</p>
          ))}

          {section.list && section.list.length > 0 && (
            <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
              {section.list.map((item, li) => (
                <li key={li} className="leading-7">{item}</li>
              ))}
            </ul>
          )}

          {section.table && <PhilosophyTable table={section.table} />}

          {section.subsections && section.subsections.map((sub, subi) => (
            <div key={subi}>
              {sub.heading && (
                <h3 className="mt-8 text-xl font-semibold tracking-tight 2xl:text-lg">{sub.heading}</h3>
              )}
              {sub.paragraphs.map((para, pi) => (
                <p key={pi} className="mt-4 text-justify hyphens-auto leading-7 text-muted-foreground">{para}</p>
              ))}
              {sub.list && sub.list.length > 0 && (
                <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
                  {sub.list.map((item, li) => (
                    <li key={li} className="leading-7">{item}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      ))}
    </article>
  );
}
