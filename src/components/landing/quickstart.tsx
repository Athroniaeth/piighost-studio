"use client";

import type { ReactNode } from "react";
import { Section } from "@/components/section";
import { useT } from "@/i18n/use-t";

export function QuickStart({
  installBlock,
  usageBlock,
}: {
  installBlock: ReactNode;
  usageBlock: ReactNode;
}) {
  const { t } = useT();
  return (
    <Section
      eyebrow={t.quickStart.eyebrow}
      title={t.quickStart.title}
      description={t.quickStart.description}
      centerDescription
    >
      <div className="mx-auto grid max-w-3xl gap-4">
        {installBlock}
        {usageBlock}
      </div>
    </Section>
  );
}
