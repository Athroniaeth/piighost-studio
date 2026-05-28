import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/github-icon";
import { GITHUB_ORG } from "@/lib/site";

export function Cta() {
  return (
    <section className="snap-start scroll-mt-16 border-t bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ship AI features without shipping user data
        </h2>
        <p className="mt-4 text-muted-foreground">
          Install piighost, wire your detector, and keep PII out of the model.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="xl" render={<a href="https://athroniaeth.github.io/piighost/" target="_blank" rel="noreferrer" />}>
            <BookOpen className="mr-2 size-5" /> Read the docs
          </Button>
          <Button size="xl" variant="outline" render={<a href={`${GITHUB_ORG}/piighost`} target="_blank" rel="noreferrer" />}>
            <GithubIcon className="mr-2 size-5" /> Star on GitHub
          </Button>
        </div>
      </div>
    </section>
  );
}
