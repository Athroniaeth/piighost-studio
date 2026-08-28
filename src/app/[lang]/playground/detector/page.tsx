import type { Metadata } from "next";
import { DetectorPlayground } from "@/components/playground/detector-playground";
import { dictionaries } from "@/i18n";
import { toLocale } from "@/i18n/locale-path";
import { pageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = toLocale(raw);
  const t = dictionaries[lang];
  return pageMetadata({ lang, path: "/playground/detector", title: "Detector", description: t.seo.pages.detector });
}

export default function DetectorPage() {
  return <DetectorPlayground />;
}
