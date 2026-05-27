export const GITHUB_ORG = "https://github.com/Athroniaeth";

export type Project = {
  slug: string;
  name: string;
  tagline: string;
  repo: string;
  pypi?: string;
  docs?: string;
};

export const projects: Project[] = [
  {
    slug: "piighost",
    name: "piighost",
    tagline: "The core library. Build PII anonymization pipelines for AI agents.",
    repo: `${GITHUB_ORG}/piighost`,
    pypi: "https://pypi.org/project/piighost/",
    docs: "https://athroniaeth.github.io/piighost/",
  },
  {
    slug: "api",
    name: "piighost-api",
    tagline: "A REST server that hosts one piighost pipeline behind HTTP.",
    repo: `${GITHUB_ORG}/piighost-api`,
    pypi: "https://pypi.org/project/piighost-api/",
    docs: "https://athroniaeth.github.io/piighost-api/",
  },
  {
    slug: "chat",
    name: "piighost-chat",
    tagline: "A demo chatbot that anonymizes messages before the LLM sees them.",
    repo: `${GITHUB_ORG}/piighost-chat`,
  },
  {
    slug: "proofreader",
    name: "piighost-proofreader",
    tagline: "An LLM CV proofreader that anonymizes documents before any LLM call.",
    repo: `${GITHUB_ORG}/piighost-proofreader`,
  },
];

export const navLinks = projects.map((p) => ({ href: `/${p.slug}`, label: p.name }));

export function getProject(slug: string): Project {
  const p = projects.find((x) => x.slug === slug);
  if (!p) throw new Error(`unknown project: ${slug}`);
  return p;
}
