import type { Metadata } from "next";
import { DetectorPlayground } from "@/components/playground/detector-playground";
import { dictionaries } from "@/i18n";
import type { Locale } from "@/i18n/types";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Locale = raw === "fr" ? "fr" : "en";
  const t = dictionaries[lang];
  return {
    title: "Detector",
    description: t.seo.pages.detector,
    alternates: {
      canonical: `/${lang}/playground/detector`,
      languages: { en: "/en/playground/detector", fr: "/fr/playground/detector", "x-default": "/en/playground/detector" },
    },
    openGraph: { title: "Detector", url: `/${lang}/playground/detector` },
  };
}

export default function DetectorPage() {
  return <DetectorPlayground />;
}
