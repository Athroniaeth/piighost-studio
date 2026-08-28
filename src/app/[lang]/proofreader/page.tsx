import type { Metadata } from "next";
import { ProjectHeader } from "@/components/project-header";
import { ProjectArticle } from "@/components/project-article";
import { CodeBlock } from "@/components/code-block";
import { getProject } from "@/lib/site";
import { dictionaries } from "@/i18n";
import { toLocale } from "@/i18n/locale-path";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = toLocale(raw);
  const t = dictionaries[lang];
  return {
    title: "piighost-proofreader",
    description: t.seo.pages.proofreader,
    alternates: {
      canonical: `/${lang}/proofreader`,
      languages: { en: "/en/proofreader", fr: "/fr/proofreader", "x-default": "/en/proofreader" },
    },
    openGraph: { title: "piighost-proofreader", url: `/${lang}/proofreader` },
  };
}

export default function ProofreaderPage() {
  const codeBlocks = {
    run: (
      <CodeBlock
        code={`uv sync --group dev
cp .env.example .env  # fill in LITELLM_API_KEY etc.
uv run streamlit run app.py`}
        lang="bash"
      />
    ),
  };

  return (
    <>
      <ProjectHeader project={getProject("proofreader")} />
      <ProjectArticle slug="proofreader" codeBlocks={codeBlocks} />
    </>
  );
}
