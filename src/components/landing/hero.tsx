"use client";

import Link from "next/link";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/github-icon";
import { AnonymizeFlow } from "@/components/anonymize-flow";
import { GITHUB_ORG } from "@/lib/site";
import { useT } from "@/i18n/use-t";
import { localePath } from "@/i18n/locale-path";

export function Hero() {
  const { t, locale } = useT();
  return (
    <section className="relative flex min-h-[calc(100dvh-4rem)] snap-start scroll-mt-16 items-center overflow-hidden border-b">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,var(--primary)/12%,transparent)]" />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t.hero.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            {t.hero.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="xl" render={<Link href={localePath(locale, "/piighost")} />}>
              <Rocket className="mr-2 size-5" /> {t.hero.getStarted}
            </Button>
            <Button size="xl" variant="outline" render={<a href={`${GITHUB_ORG}/piighost`} target="_blank" rel="noreferrer" />}>
              <GithubIcon className="mr-2 size-5" /> {t.hero.github}
            </Button>
          </div>
        </div>
        <AnonymizeFlow />
      </div>
    </section>
  );
}
