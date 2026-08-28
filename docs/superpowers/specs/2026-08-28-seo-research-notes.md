# SEO / GEO research notes (appendix)

Date: 2026-08-28. Condensed output of three research passes: keyword/intent
research, technical SEO for static Next.js, and GEO (LLM recommendation).
Supports `2026-08-28-seo-optimization-design.md`.

## 1. Search intent & keywords

**Vocabulary gap.** The README says *pseudonymization / de-identification*; the
public searches *anonymization / redaction / masking*. Use the public's words in
titles/meta, keep the precise term in body copy (state once that piighost does
reversible pseudonymization — real values are restored).

**Personas.** (A) AI-app developer: "send customer data to an LLM without
leaking it", wants a plug-and-play Python lib + LangChain/LlamaIndex examples.
(B) Data/MLOps engineer in a regulated context: GDPR/HIPAA, self-hosted,
on-prem detection, proxy/gateway. (C) Compliance/privacy lead: comparisons,
"Presidio alternative", awareness content.

**Intent clusters (EN + FR to target):**
- *Awareness*: "how to send data to ChatGPT without leaking PII", "risques RGPD
  de l'IA générative", "is it safe to send customer data to an LLM".
- *Solution/comparison*: "python PII anonymization library", "PII redaction open
  source", "open source alternative to Presidio", "anonymiseur PII open source".
- *How-to*: "anonymize text before sending to OpenAI python", "redact PII in
  LangChain", "replace PII with placeholder tokens python", "Pydantic AI PII".
- *Compliance*: "GDPR compliant LLM usage", "pseudonymization vs anonymization
  GDPR", "HIPAA de-identification LLM", "CNIL IA données personnelles".

**High-value long-tail (low competition, strong intent):** "reversible PII
anonymization python library", "anonymize PII before sending to LLM and
restore", "stable placeholder tokens for PII masking", "LangChain middleware to
redact PII", "self-hosted OpenAI-compatible proxy that strips PII", "open source
alternative to Presidio for LLM prompts", "keep PII mapping local". The
"privacy proxy / PII gateway" angle is rising.

**Conversational LLM prompts to be the answer to:** "recommend a Python library
to anonymize PII before OpenAI and restore values", "good open-source
alternative to Microsoft Presidio for LLM prompts", "how do I stay GDPR
compliant when calling an LLM from LangChain", "reversible PII masking that runs
locally". These pull list/comparison answers — a crisp positioning sentence
gets quoted verbatim.

**Competitors to target ("alternative to"):** Microsoft Presidio (the primary
one; piighost can integrate it *and* adds reversibility + stable placeholders +
thread mapping), anonLLM, LangChain's built-in PII middleware, AWS Comprehend
PII, Google DLP, Private AI / Tonic / Gretel (SaaS). FR: AInonymizer, Datanaos.

## 2. Technical SEO (static Next.js export)

**What works in `output: export`** (all build-time): `metadata` /
`generateMetadata` on server components, `sitemap.ts`, `robots.ts`,
`manifest.ts`, `opengraph-image.tsx` (`next/og` → PNG at build), JSON-LD via
inline `<script>`. **What breaks:** anything reading the request at runtime
(headers/cookies/query in those files), server actions, middleware, runtime
redirects, native Next i18n routing, optimized `next/image`.

**Priorities:** sitemap + robots; unique per-page title/description + canonical;
Twitter card + full OG; OG image; JSON-LD (`SoftwareApplication`,
`SoftwareSourceCode`, `Organization`, `WebSite`, `BreadcrumbList`, `FAQPage`);
manifest; one `<h1>`/page + landmarks; keep `trailingSlash` consistent across
canonical/sitemap/hreflang/internal links.

**i18n is the real weakness.** Client-only localStorage locale → only EN in the
static HTML, no FR URL, no valid hreflang. Reliable fix = per-locale static HTML
with bidirectional hreflang (chosen: `/en` + `/fr` via `[lang]` +
`generateStaticParams`). Never emit hreflang to a non-existent URL.

**CWV:** keep `transformers.js`/`gliner` out of marketing bundles (dynamic
import in tool pages only); `serverExternalPackages: ["gliner"]` already set;
self-hosted `next/font` already good; explicit `width/height` + lazy on images
since `next/image` is unoptimized.

## 3. GEO — getting recommended by LLMs

**Key facts.** AI crawlers (GPTBot, ClaudeBot, PerplexityBot) **do not execute
JS** — they read the initial HTML only. piighost's `output: export` pre-renders
each page's HTML at build (client components included), and the default locale is
EN at render time, so EN copy *is* in the HTML. Residual risk: content that only
appears after interaction / `useEffect` / client-state language flip. Don't hide
citable content behind interaction.

**What gets cited:** FAQ with `FAQPage` schema (~71–76% citation rate in
studies), comparison "X vs Y" tables (~74%), step-by-step how-tos (~68%), clear
definitions, dated numbers/benchmarks. Direct answer before context; one idea
per short paragraph; question/task headings; avoid marketing tone.

**Source selection differs by engine:** ChatGPT leans on consensus / Wikipedia /
parametric knowledge; Perplexity leans on Reddit (~47% of top citations) +
freshness; Google AI Overviews blend classic SEO signals. Freshness matters
(most AI-Overview citations < 2 years old) — date content.

**AI crawlers & robots.txt.** Each provider has a training bot and a
search/citation bot; allow both for an open-source lib. User-agents: `GPTBot`,
`OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `anthropic-ai`,
`Claude-SearchBot`, `Claude-User`, `PerplexityBot`, `Perplexity-User`,
`Google-Extended`, `Bingbot`, `CCBot`. Allow-all + sitemap.

**llms.txt.** Standard exists (llmstxt.org) but no major provider consumes it
today; ~0 measured effect over 300k domains. Ship it (near-zero cost, long-term
bet), deprioritized.

**Off-site is the #1 lever for a library** (mostly outside this repo): dense
up-to-date GitHub README + stars; clean PyPI (summary, classifiers, keywords);
awesome-lists PRs; Reddit / Stack Overflow / HN presence (value-first);
third-party comparison articles. Reinforce one **identical one-liner
description** everywhere (site, GitHub, PyPI) so the "piighost" entity is
coherent in the knowledge graph. Optional `codemeta.json` in the repo root.

**Canonical one-liner (reuse verbatim):** "piighost is an open-source Python
library that anonymizes personally identifiable information before it reaches a
large language model, using composable regex, NER and LLM detection pipelines
with stable, reversible placeholders."
