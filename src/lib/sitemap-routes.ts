import type { MetadataRoute } from "next";
import { projects } from "./site";

const LOCALES = ["en", "fr"] as const;

const ROUTES: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1, freq: "weekly" },
  { path: "/philosophy", priority: 0.6, freq: "monthly" },
  ...projects.map((p) => ({ path: `/${p.slug}`, priority: 0.8, freq: "monthly" as const })),
  { path: "/playground", priority: 0.4, freq: "monthly" },
  { path: "/playground/detector", priority: 0.3, freq: "monthly" },
];

function url(base: string, locale: string, path: string) {
  const clean = path.replace(/^\/+|\/+$/g, "");
  return clean ? `${base}/${locale}/${clean}/` : `${base}/${locale}/`;
}

export function sitemapEntries(base: string): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const r of ROUTES) {
    for (const locale of LOCALES) {
      entries.push({
        url: url(base, locale, r.path),
        lastModified: new Date(),
        changeFrequency: r.freq,
        priority: r.priority,
        alternates: {
          languages: {
            en: url(base, "en", r.path),
            fr: url(base, "fr", r.path),
          },
        },
      });
    }
  }
  return entries;
}
