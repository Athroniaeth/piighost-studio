"use client";

import { MessageSquare, FileText, Table } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Section } from "@/components/section";
import { useT } from "@/i18n/use-t";

const icons = [MessageSquare, FileText, Table];

export function Detector() {
  const { t } = useT();
  return (
    <Section
      eyebrow={t.detector.eyebrow}
      title={t.detector.title}
      description={t.detector.description}
    >
      <div className="grid gap-6 md:grid-cols-3">
        {t.detector.items.map((p, i) => {
          const Icon = icons[i];
          return (
            <Card key={p.title}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <CardTitle className="text-lg">{p.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-justify text-sm hyphens-auto text-muted-foreground">{p.body}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}
