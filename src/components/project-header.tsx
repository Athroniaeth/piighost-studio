import { BookOpen, Package } from "lucide-react";
import { GithubIcon } from "@/components/github-icon";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/site";

export function ProjectHeader({ project }: { project: Project }) {
  return (
    <div className="border-b">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-mono text-3xl font-bold sm:text-4xl">{project.name}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{project.tagline}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            render={<a href={project.repo} target="_blank" rel="noreferrer" />}
          >
            <GithubIcon className="mr-1 size-4" /> Repository
          </Button>
          {project.docs && (
            <Button
              variant="outline"
              size="sm"
              render={<a href={project.docs} target="_blank" rel="noreferrer" />}
            >
              <BookOpen className="mr-1 size-4" /> Docs
            </Button>
          )}
          {project.pypi && (
            <Button
              variant="outline"
              size="sm"
              render={<a href={project.pypi} target="_blank" rel="noreferrer" />}
            >
              <Package className="mr-1 size-4" /> PyPI
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
