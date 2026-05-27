import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Project } from "@/lib/site";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/${project.slug}`} className="group">
      <Card className="h-full transition-colors hover:border-primary">
        <CardHeader>
          <CardTitle className="font-mono text-lg">{project.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-full flex-col justify-between gap-4">
          <p className="text-sm text-muted-foreground">{project.tagline}</p>
          <span className="inline-flex items-center text-sm font-medium text-primary">
            Learn more
            <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
