import { Section } from "@/components/section";
import { ProjectCard } from "@/components/project-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { projects } from "@/lib/site";

const GRID_SLOTS = 9;

function PlaceholderCard() {
  return (
    <Card className="h-full border-dashed bg-transparent shadow-none opacity-60">
      <CardHeader>
        <CardTitle className="font-mono text-lg text-muted-foreground">
          piighost-???
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">More to come.</p>
      </CardContent>
    </Card>
  );
}

export function Ecosystem() {
  const placeholders = Math.max(0, GRID_SLOTS - projects.length);

  return (
    <Section
      id="ecosystem"
      eyebrow="The ecosystem"
      title="One privacy layer, many projects"
      description="Start with the library. Reach for the server, the chat demo, and the proofreader as you grow."
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={p.slug} project={p} />
        ))}
        {Array.from({ length: placeholders }).map((_, i) => (
          <PlaceholderCard key={`ph-${i}`} />
        ))}
      </div>
    </Section>
  );
}
