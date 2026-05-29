"use client";

import { Cloud, Cpu, Scale, Ban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Section } from "@/components/section";
import { useT } from "@/i18n/use-t";

const icons = [Cloud, Cpu, Scale, Ban];

export function Problem() {
  const { t } = useT();
  return (
    <Section
      eyebrow={t.problem.eyebrow}
      title={t.problem.title}
    >
      <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
        {t.problem.items.map((it, i) => {
          const Icon = icons[i];
          return (
            <Card key={it.title}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <CardTitle className="text-lg">{it.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-justify text-sm hyphens-auto text-muted-foreground">{it.body}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}
