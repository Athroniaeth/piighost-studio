import { Section } from "@/components/section";
import { ProjectCard } from "@/components/project-card";
import { projects } from "@/lib/site";

export function Ecosystem() {
  return (
    <Section
      id="ecosystem"
      eyebrow="The ecosystem"
      title="Four projects, one privacy layer"
      description="Start with the library. Reach for the server, the chat demo, and the proofreader as you grow."
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {projects.map((p) => (
          <ProjectCard key={p.slug} project={p} />
        ))}
      </div>
    </Section>
  );
}
