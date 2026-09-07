"use client";

import { Fragment } from "react";
import Link from "next/link";
import { Section } from "@/components/section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useT } from "@/i18n/use-t";
import { localePath } from "@/i18n/locale-path";
import type { FaqSegment, Locale } from "@/i18n/types";

function renderSegment(seg: FaqSegment, i: number, locale: Locale) {
  if (typeof seg === "string") return <Fragment key={i}>{seg}</Fragment>;
  if ("code" in seg)
    return (
      <code
        key={i}
        className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]"
      >
        {seg.code}
      </code>
    );
  return (
    <Link
      key={i}
      href={localePath(locale, seg.link.href)}
      className="underline hover:text-foreground"
    >
      {seg.link.text}
    </Link>
  );
}

export function Faq() {
  const { t, locale } = useT();
  return (
    <Section title={t.faq.heading}>
      <Accordion className="mx-auto max-w-4xl">
        {t.faq.items.map((item) => (
          <AccordionItem key={item.question}>
            <AccordionTrigger className="text-lg font-semibold">
              <span aria-hidden className="w-4 shrink-0" />
              <span className="flex-1 text-center">{item.question}</span>
            </AccordionTrigger>
            <AccordionContent className="mx-auto max-w-3xl text-justify hyphens-auto text-muted-foreground">
              {item.answer.map((seg, i) => renderSegment(seg, i, locale))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  );
}
