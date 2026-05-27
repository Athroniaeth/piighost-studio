import type { MDXComponents } from "mdx/types";

const components: MDXComponents = {
  h1: (p) => <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" {...p} />,
  h2: (p) => <h2 className="mt-12 text-2xl font-semibold tracking-tight" {...p} />,
  h3: (p) => <h3 className="mt-8 text-xl font-semibold" {...p} />,
  p: (p) => <p className="mt-4 leading-7 text-muted-foreground" {...p} />,
  ul: (p) => <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground" {...p} />,
  li: (p) => <li className="leading-7" {...p} />,
  a: (p) => <a className="text-primary underline-offset-4 hover:underline" {...p} />,
  code: (p) => <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm" {...p} />,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
