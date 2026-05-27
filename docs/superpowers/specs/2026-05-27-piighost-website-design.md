# piighost website — design

Date: 2026-05-27
Status: approved (pending user review of this spec)

## Goal

A presentation website for the **piighost** ecosystem. Primary objective: **developer
adoption** of the core library. Secondary: present the surrounding projects
(piighost-api, piighost-chat, piighost-proofreader) and make the whole thing feel like a
credible, coherent ecosystem.

This replaces an earlier site attempt that the user was not happy with (not present in
this repo).

## The ecosystem (source of truth: GitHub READMEs)

- **piighost** — core Python library for PII anonymization pipelines. **Detector-agnostic**:
  you plug in regex, NER, or an LLM. Swaps PII for stable placeholders (`<<PERSON:1>>`,
  `<<EMAIL:2>>`) the LLM can reason about, restores real values for tools and end users.
  Ships LangChain middleware. Published on PyPI.
- **piighost-api** — REST server hosting one configurable piighost pipeline behind HTTP, so
  multiple processes share one inference endpoint. API-key auth (keyshield, Argon2), Redis
  cache, thread-scoped memory, configurable pipeline via `module:variable`.
- **piighost-chat** — demo chat app (React + Litestar + LangChain) showing a
  privacy-preserving chatbot: messages anonymized before the LLM, deanonymized after, tools
  receive real values via `PIIAnonymizationMiddleware`.
- **piighost-proofreader** — LLM-powered CV proofreader (Streamlit): PDF to Markdown,
  per-word bounding boxes, anonymization via piighost-api, structured-output proofreading,
  click-to-highlight mistakes.

### Hard content rule

piighost is **detector-agnostic**. Never present GLiNER2 or any single NER engine as the
"default" detector. Always frame detection as a choice: "regex, NER, or LLM — you wire it".

## Stack

- **Next.js 15** (App Router, React 19) + **TypeScript**
- **shadcn/ui** + **Tailwind v4**
- **MDX** for project page content (code blocks highlighted via Shiki)
- **Static export** (`output: export`) so it can be hosted anywhere (GitHub Pages, Vercel,
  the user's own server)
- Theme: **light by default + dark toggle** (`next-themes`)

## Visual language

Inspired by the LangChain marketing site (langchain.com), adapted:

- Light base, deep navy/charcoal text, **single accent: indigo/violet**, subtle gradients
  in the hero. Dark mode is a full inverted palette, not an afterthought.
- Modern geometric **sans-serif** for text, **monospace** for code.
- **Card-based** sections, 3-column feature grids, generous whitespace, clear type
  hierarchy.
- **Tabbed interface** to walk through the pipeline steps: *Detect / Anonymize /
  Deanonymize* (mirrors LangChain's Build/Test/Deploy tabs).
- Minimalist **line-style icons**. Optional "integrates with" logo row (LangChain, OpenAI,
  Redis, spaCy).

### Copy tone

Short, factual, developer-oriented. No marketing fluff. **Do not** use em-dashes or
LLM-typical wording (e.g. "seamless", "robust", "delve") in any site copy.

## Site structure (multi-page)

```
/                  ecosystem landing
/piighost          the core library
/api               piighost-api
/chat              piighost-chat (demo)
/proofreader       piighost-proofreader
```

Shared **navbar** (logo + project links + GitHub + theme toggle) and **footer** (PyPI /
docs / GitHub links).

### Landing (`/`)

1. **Hero** — name, tagline ("Anonymize PII before it reaches the LLM"), two CTAs
   (Get started / GitHub), animated visual of the `Patrick -> <<PERSON:1>>` flow.
2. **The problem** — 3 cards: non-EU hosted clouds leak raw PII, local models are weaker,
   GDPR/compliance pressure.
3. **How it works** — the User -> piighost -> LLM -> Tool sequence, redrawn cleanly, with
   the Detect/Anonymize/Deanonymize tabs.
4. **Your detector, your choice** — explicit section stressing detector-agnosticism
   (regex / NER / LLM), no imposed default.
5. **The ecosystem** — 4 clickable cards to the project pages.
6. **Quick start** — `pip install piighost` + LangChain middleware snippet, copy button.
7. **Final CTA** — GitHub star / docs / PyPI.

### Project page template (`/piighost`, `/api`, `/chat`, `/proofreader`)

Header (name, PyPI/CI badges, one-line pitch) -> what it does -> quick start -> one diagram
(each repo's mermaid, redrawn cleanly) -> links (repo, docs, PyPI). Content adapted from the
READMEs but rewritten short. Authored in MDX.

## Components (shadcn/ui)

`button`, `card`, `badge`, `tabs`, `accordion` (FAQ), `navigation-menu`, plus a custom
`CodeBlock` (Shiki + copy button) and a small animated `AnonymizeFlow` component for the
hero.

## Demo (assumption)

No confirmed deployed `piighost-api`, so any "demo" is **illustrative** — a scripted
animation showing `Patrick -> <<PERSON:1>>`, no backend call. If the user later provides a
hosted API URL, a real live playground can be added (a Next.js route handler proxies the
request so the API key is never exposed client-side).

## Out of scope (YAGNI)

- No CMS, no blog, no i18n on day one (READMEs already have EN/FR; site ships EN first).
- No analytics, no auth, no live backend until an API URL exists.
- Full API reference lives in the existing docs sites; the website only links to them.

## Open items

- Exact accent hex (start: indigo `#6366f1`-ish, tune during design).
- Whether to ship a FR version of the site later (deferred).
