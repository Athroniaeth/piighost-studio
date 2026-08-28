import type { Metadata } from "next";
import type { Locale } from "@/i18n/types";

const BASE = "https://piighost.dev";

/** The per-locale file-convention OG image, referenced with a stable URL. */
function ogImage(lang: Locale) {
  return `${BASE}/${lang}/opengraph-image`;
}

/**
 * Build consistent per-page metadata: canonical + bidirectional hreflang,
 * Open Graph (title, url, image) and Twitter card image. `path` is the app
 * path WITHOUT the locale prefix and without a trailing slash, e.g. "/piighost"
 * or "" for the home page.
 */
export function pageMetadata({
  lang,
  path,
  title,
  description,
}: {
  lang: Locale;
  path: string;
  title: string;
  description: string;
}): Metadata {
  const clean = path.replace(/^\/+|\/+$/g, "");
  const rel = clean ? `/${clean}` : "";
  const img = ogImage(lang);
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}${rel}`,
      languages: {
        en: `/en${rel}`,
        fr: `/fr${rel}`,
        "x-default": `/en${rel}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `/${lang}${rel}`,
      images: [{ url: img, width: 1200, height: 630, alt: "piighost" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [img],
    },
  };
}
