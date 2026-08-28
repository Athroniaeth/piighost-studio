import type { Metadata } from "next";
import { PhilosophyContent } from "@/components/philosophy-content";
import { dictionaries } from "@/i18n";
import { toLocale } from "@/i18n/locale-path";
import { pageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = toLocale(raw);
  const t = dictionaries[lang];
  return pageMetadata({ lang, path: "/philosophy", title: t.philosophy.title, description: t.seo.philosophyDescription });
}

export default function PhilosophyPage() {
  return <PhilosophyContent />;
}
