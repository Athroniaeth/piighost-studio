import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "piighost",
    short_name: "piighost",
    description:
      "Anonymize PII before it reaches the LLM. A Python library for reversible PII anonymization pipelines.",
    start_url: "/en/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b0b0f",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
