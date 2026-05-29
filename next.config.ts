import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  turbopack: {
    // The `gliner` dependency (@xenova/transformers@2.17.2) probes Node built-ins
    // at import time; Turbopack maps them to `undefined`, which crashes the probe.
    // `fs` -> empty object so the probe concludes it is not running in Node;
    // `path` -> a real browser polyfill, since other client code calls path.parse.
    resolveAlias: {
      fs: "./src/lib/empty-node-module.ts",
      path: "path-browserify",
    },
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
