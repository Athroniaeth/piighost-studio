import type { Metadata } from "next";
import { ProjectHeader } from "@/components/project-header";
import { ProjectArticle } from "@/components/project-article";
import { CodeBlock } from "@/components/code-block";
import { getProject } from "@/lib/site";
import { dictionaries } from "@/i18n";
import { toLocale } from "@/i18n/locale-path";
import { JsonLd } from "@/components/json-ld";
import { softwareApplicationLd, softwareSourceCodeLd, breadcrumbLd } from "@/lib/jsonld";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = toLocale(raw);
  const t = dictionaries[lang];
  return {
    title: "piighost",
    description: t.seo.pages.piighost,
    alternates: {
      canonical: `/${lang}/piighost`,
      languages: { en: "/en/piighost", fr: "/fr/piighost", "x-default": "/en/piighost" },
    },
    openGraph: { title: "piighost", url: `/${lang}/piighost` },
  };
}

const USAGE = `from langchain.agents import create_agent

from piighost import Anonymizer, ExactMatchDetector
from piighost.pipeline import ThreadAnonymizationPipeline
from piighost.middleware import PIIAnonymizationMiddleware

# Wire any detector you like: regex, a NER model, or an LLM.
detector = ExactMatchDetector([("Patrick", "PERSON")])
pipeline = ThreadAnonymizationPipeline(detector=detector, anonymizer=Anonymizer())
middleware = PIIAnonymizationMiddleware(pipeline=pipeline)

agent = create_agent(
    model="openai:gpt-5.5",
    tools=[send_email],
    middleware=[middleware],
)`;

export default function PiighostPage() {
  const codeBlocks = {
    install: <CodeBlock code={`uv add 'piighost[cache]'`} lang="bash" />,
    usage: <CodeBlock code={USAGE} lang="python" />,
  };

  return (
    <>
      <JsonLd data={softwareApplicationLd()} />
      <JsonLd data={softwareSourceCodeLd()} />
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", item: "https://piighost.dev/en/" },
          { name: "piighost", item: "https://piighost.dev/en/piighost/" },
        ])}
      />
      <ProjectHeader project={getProject("piighost")} />
      <ProjectArticle slug="piighost" codeBlocks={codeBlocks} />
    </>
  );
}
