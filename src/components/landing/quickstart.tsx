"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Section } from "@/components/section";
import { useT } from "@/i18n/use-t";

type UsageExample = { id: string; label: string; block: ReactNode };

export function QuickStart({
  installBlock,
  usageExamples,
}: {
  installBlock: ReactNode;
  usageExamples: UsageExample[];
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
        <Tabs defaultValue={usageExamples[0]?.id} className="gap-3">
          <TabsList className="grid w-full grid-cols-3">
            {usageExamples.map((ex) => (
              <TabsTrigger key={ex.id} value={ex.id}>
                {ex.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {usageExamples.map((ex) => (
            <TabsContent key={ex.id} value={ex.id}>
              {ex.block}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Section>
  );
}
