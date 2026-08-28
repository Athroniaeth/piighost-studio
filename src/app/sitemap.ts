import type { MetadataRoute } from "next";
import { sitemapEntries } from "@/lib/sitemap-routes";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries("https://piighost.dev");
}
