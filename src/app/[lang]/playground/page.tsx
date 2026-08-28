import type { Metadata } from "next";
import { ConfigBuilder } from "@/components/playground/config-builder";
import { dictionaries } from "@/i18n";
import { toLocale } from "@/i18n/locale-path";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = toLocale(raw);
  const t = dictionaries[lang];
  return {
    title: "Pipeline",
    description: t.seo.pages.playground,
    alternates: {
      canonical: `/${lang}/playground`,
      languages: { en: "/en/playground", fr: "/fr/playground", "x-default": "/en/playground" },
    },
    openGraph: { title: "Pipeline", url: `/${lang}/playground` },
  };
}

export default function PipelinePage() {
  return <ConfigBuilder />;
}
