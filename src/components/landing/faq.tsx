"use client";

import { Section } from "@/components/section";
import { useT } from "@/i18n/use-t";

export function Faq() {
  const { t } = useT();
  return (
    <Section title={t.faq.heading}>
      <dl className="mx-auto grid max-w-4xl gap-8">
        {t.faq.items.map((item) => (
          <div key={item.question}>
            <dt className="text-lg font-semibold">{item.question}</dt>
            <dd className="mt-2 text-justify hyphens-auto text-muted-foreground">
              {item.answer}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
