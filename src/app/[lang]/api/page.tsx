import type { Metadata } from "next";
import { ProjectHeader } from "@/components/project-header";
import { ProjectArticle } from "@/components/project-article";
import { CodeBlock } from "@/components/code-block";
import { getProject } from "@/lib/site";
import { dictionaries } from "@/i18n";
import { toLocale } from "@/i18n/locale-path";
import { pageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = toLocale(raw);
  const t = dictionaries[lang];
  return pageMetadata({ lang, path: "/api", title: "piighost-api", description: t.seo.pages.api });
}

const REQUEST = `POST /v1/anonymize
{ "text": "Email Patrick at patrick@acme.com" }

200 OK
{ "anonymized_text": "Email <<PERSON:1>> at <<EMAIL:1>>", "entities": [ ... ] }`;

export default function ApiPage() {
  const codeBlocks = {
    quickstart: (
      <CodeBlock
        code={`uv add piighost-api
piighost-api serve pipeline:pipeline --port 8000`}
        lang="bash"
      />
    ),
    request: <CodeBlock code={REQUEST} lang="json" />,
  };

  return (
    <>
      <ProjectHeader project={getProject("api")} />
      <ProjectArticle slug="api" codeBlocks={codeBlocks} />
    </>
  );
}
