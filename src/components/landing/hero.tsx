import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/github-icon";
import { AnonymizeFlow } from "@/components/anonymize-flow";
import { GITHUB_ORG } from "@/lib/site";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,var(--primary)/12%,transparent)]" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Anonymize PII before it reaches the LLM
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            piighost is a Python library for PII anonymization pipelines. It swaps personal
            data for stable placeholders the model can reason about, then restores the real
            values for your tools and your users. Your agent code does not change.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" render={<Link href="/piighost" />}>
              Get started <ArrowRight className="ml-1 size-4" />
            </Button>
            <Button size="lg" variant="outline" render={<a href={`${GITHUB_ORG}/piighost`} target="_blank" rel="noreferrer" />}>
              <GithubIcon className="mr-1 size-4" /> GitHub
            </Button>
          </div>
        </div>
        <AnonymizeFlow />
      </div>
    </section>
  );
}
