import type { Metadata } from "next";
import { ProjectHeader } from "@/components/project-header";
import { ProjectArticle } from "@/components/project-article";
import { CodeBlock } from "@/components/code-block";
import { getProject } from "@/lib/site";
import { dictionaries } from "@/i18n";
import type { Locale } from "@/i18n/types";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Locale = raw === "fr" ? "fr" : "en";
  const t = dictionaries[lang];
  return {
    title: "piighost-chat",
    description: t.seo.pages.chat,
    alternates: {
      canonical: `/${lang}/chat`,
      languages: { en: "/en/chat", fr: "/fr/chat", "x-default": "/en/chat" },
    },
    openGraph: { title: "piighost-chat", url: `/${lang}/chat` },
  };
}

export default function ChatPage() {
  const codeBlocks = {
    run: (
      <CodeBlock
        code={`git clone https://github.com/Athroniaeth/piighost-chat
cd piighost-chat
docker compose up`}
        lang="bash"
      />
    ),
  };

  return (
    <>
      <ProjectHeader project={getProject("chat")} />
      <ProjectArticle slug="chat" codeBlocks={codeBlocks} />
    </>
  );
}
