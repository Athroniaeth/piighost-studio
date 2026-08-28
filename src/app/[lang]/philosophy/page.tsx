import type { Metadata } from "next";
import { PhilosophyContent } from "@/components/philosophy-content";
import { dictionaries } from "@/i18n";
import type { Locale } from "@/i18n/types";

function toLocale(raw: string): Locale {
  return raw === "fr" ? "fr" : "en";
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = toLocale(raw);
  const t = dictionaries[lang];
  return {
    title: t.philosophy.title,
    description: t.seo.philosophyDescription,
    alternates: {
      canonical: `/${lang}/philosophy`,
      languages: { en: "/en/philosophy", fr: "/fr/philosophy", "x-default": "/en/philosophy" },
    },
    openGraph: { title: t.philosophy.title, url: `/${lang}/philosophy` },
  };
}

export default function PhilosophyPage() {
  return <PhilosophyContent />;
}
