import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  // `gliner` statically imports `onnxruntime-web/webgl` and `.../webgpu`, whose
  // `node` export condition is `null`. That makes them unresolvable in the
  // server (SSR / static-prerender) bundle, even though the gliner runtime is
  // only ever invoked in the browser. Keep gliner external to the server bundle
  // so Turbopack never resolves those subpaths there; the browser bundle still
  // resolves the real webgpu/wasm backends.
  serverExternalPackages: ["gliner"],
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
