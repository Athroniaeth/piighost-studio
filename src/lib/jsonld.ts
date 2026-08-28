const BASE = "https://piighost.dev";
const REPO = "https://github.com/Athroniaeth/piighost";
const PYPI = "https://pypi.org/project/piighost/";
const DESC =
  "piighost is an open-source Python library that anonymizes personally identifiable information before it reaches a large language model, using composable regex, NER and LLM detection pipelines with stable, reversible placeholders.";

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "piighost",
    url: `${BASE}/`,
    description: DESC,
    sameAs: [REPO, PYPI],
  } as const;
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "piighost",
    url: `${BASE}/`,
    description: DESC,
  } as const;
}

export function softwareApplicationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "piighost",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Cross-platform",
    programmingLanguage: "Python",
    description: DESC,
    url: `${BASE}/en/piighost/`,
    downloadUrl: PYPI,
    softwareHelp: "https://athroniaeth.github.io/piighost/",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  } as const;
}

export function softwareSourceCodeLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: "piighost",
    description: DESC,
    codeRepository: REPO,
    programmingLanguage: "Python",
    runtimePlatform: "Python 3",
  } as const;
}

export function breadcrumbLd(items: { name: string; item: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.item,
    })),
  } as const;
}

export function faqPageLd(qa: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map((x) => ({
      "@type": "Question",
      name: x.question,
      acceptedAnswer: { "@type": "Answer", text: x.answer },
    })),
  } as const;
}
