"use client";

import { Section } from "@/components/section";
import { ProjectCard } from "@/components/project-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { projects } from "@/lib/site";
import { useT } from "@/i18n/use-t";

const GRID_SLOTS = 9;
const PLACEHOLDER_HASHES = ["2b1f4a", "7c43e9", "9af0d2", "1e8c75", "f30b86"];

function PlaceholderCard({ hash, moreToCome }: { hash: string; moreToCome: string }) {
  return (
    <Card className="h-full border-dashed bg-transparent shadow-none opacity-60">
      <CardHeader>
        <CardTitle className="font-mono text-lg text-muted-foreground">
          {`<<PROJECT_NAME:${hash}>>`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{moreToCome}</p>
      </CardContent>
    </Card>
  );
}

export function Ecosystem() {
  const { t } = useT();
  const placeholders = Math.max(0, GRID_SLOTS - projects.length);

  return (
    <Section
      id="ecosystem"
      eyebrow={t.ecosystem.eyebrow}
      title={t.ecosystem.title}
      description={t.ecosystem.description}
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={p.slug} project={p} />
        ))}
        {Array.from({ length: placeholders }).map((_, i) => (
          <PlaceholderCard key={`ph-${i}`} hash={PLACEHOLDER_HASHES[i % PLACEHOLDER_HASHES.length]} moreToCome={t.ecosystem.moreToCome} />
        ))}
      </div>
    </Section>
  );
}
