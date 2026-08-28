import { describe, it, expect } from "vitest";
import { sitemapEntries } from "./sitemap-routes";

describe("sitemapEntries", () => {
  const entries = sitemapEntries("https://piighost.dev");
  it("includes both locales for the home route", () => {
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://piighost.dev/en/");
    expect(urls).toContain("https://piighost.dev/fr/");
  });
  it("includes every project under both locales", () => {
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://piighost.dev/en/piighost/");
    expect(urls).toContain("https://piighost.dev/fr/proofreader/");
  });
  it("sets hreflang alternates on each entry", () => {
    const home = entries.find((e) => e.url === "https://piighost.dev/en/");
    expect(home?.alternates?.languages?.fr).toBe("https://piighost.dev/fr/");
  });
  it("gives the home route priority 1 and tools lower priority", () => {
    const home = entries.find((e) => e.url === "https://piighost.dev/en/");
    const tool = entries.find((e) => e.url === "https://piighost.dev/en/playground/");
    expect(home?.priority).toBe(1);
    expect(tool?.priority).toBeLessThan(home!.priority!);
  });
});
