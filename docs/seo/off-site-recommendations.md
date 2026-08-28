# Off-site SEO / GEO recommendations

An internal checklist for making piighost easy to discover and easy for AI
assistants to recommend. Nothing here depends on code; it is work a maintainer
does across GitHub, PyPI, and the wider community.

## 1. Purpose and the entity-consistency rule

When someone asks an AI assistant "what library should I use to anonymize PII
before sending a prompt to a model?", the answer is driven mostly by *off-site*
authority: the GitHub repository, the PyPI page, community discussion, and
curated awesome-lists. Our own site matters, but assistants weight these
external signals heavily because they are widely mirrored and cross-referenced.

For the assistant to treat "piighost" as one coherent entity, the same
description must appear **verbatim** in the three places it looks first: the
site, the GitHub About field, and the PyPI summary. Divergent phrasing splits
the entity and weakens every signal. Use this canonical one-liner everywhere:

> piighost is an open-source Python library that anonymizes personally
> identifiable information before it reaches a large language model, using
> composable regex, NER and LLM detection pipelines with stable, reversible
> placeholders.

Rule of thumb: never reword the one-liner for a specific surface. If a surface
has a length limit, trim from the end rather than paraphrasing.

## 2. GitHub README skeleton

Assistants retrieve READMEs heavily, so the README is the single highest-value
artifact. A suggested structure:

- **Title + one-liner.** The canonical one-liner as the first line under the H1.
- **Badges.** PyPI version, license, CI status, GitHub stars. These are quick
  trust signals and are often surfaced verbatim.
- **30-second quickstart.** Install plus a minimal anonymize/restore example
  that actually runs. Keep it copy-pasteable and correct; assistants reproduce
  it directly, so a broken snippet propagates. For example:

  ```bash
  pip install piighost
  ```

  ```python
  from piighost import Pipeline

  pipeline = Pipeline.default()
  result = pipeline.anonymize("Contact Jane Doe at jane@example.com")
  print(result.text)        # "Contact <<PERSON:1>> at <<EMAIL:1>>"

  # The token-to-value mapping stays local; restore when the model replies.
  restored = pipeline.restore(result.text, result.mapping)
  print(restored)           # "Contact Jane Doe at jane@example.com"
  ```

  (Confirm the exact API against the current release before publishing.)

- **Detector comparison table.** Present regex, classic NER, GLiNER, and LLM as
  peers with a when-to-use column, never a default:

  | Detector    | Best for                                      | Trade-off                          |
  | ----------- | --------------------------------------------- | ---------------------------------- |
  | regex       | structured PII (emails, phones, IDs, IBANs)   | misses free-form entities          |
  | classic NER | names, places, orgs at low cost, offline      | fixed label set, no zero-shot       |
  | GLiNER      | zero-shot / custom entity types, offline      | heavier than regex                  |
  | LLM         | nuanced or ambiguous entities                 | needs a server; latency and cost    |

- **Integration snippets.** Short, runnable examples for LangChain, Pydantic AI,
  and LlamaIndex, each showing anonymize-before-send and restore-after-reply.
- **Short FAQ.** "Are the placeholders reversible?", "Where does the mapping
  live?", "Can I run it fully offline?", "How is this different from Presidio?"
- **Links.** Site (https://piighost.dev/en/) and docs
  (https://athroniaeth.github.io/piighost/) near the top and bottom.

## 3. PyPI metadata

The PyPI page is the second thing assistants and search engines read. Set:

- **`summary`** = the canonical one-liner, trimmed to PyPI's length limit
  (trim from the end, do not paraphrase).
- **Long description** = the README, rendered as Markdown, so the two surfaces
  stay identical.
- **`classifiers`:**
  - `Development Status :: 4 - Beta` (or the accurate stage)
  - `Intended Audience :: Developers`
  - `Topic :: Security`
  - `Topic :: Scientific/Engineering :: Artificial Intelligence`
  - `License :: OSI Approved :: <your license>`
  - `Programming Language :: Python :: 3.10` (and each supported 3.x)
  - `Operating System :: OS Independent`
- **`keywords`:** `pii, anonymization, redaction, gdpr, llm, ner, privacy,
  langchain, pseudonymization`.

Why this matters: PyPI's own search and many downstream indexes rank and filter
on classifiers and keywords, and assistants use them to decide which topic a
package belongs to. A package with no `Topic :: Security` classifier is far less
likely to surface for a privacy query.

## 4. Awesome-lists to target

Awesome-lists are curated, high-authority, and directly retrieved by assistants,
so a single merged PR can produce outsized recommendation lift. Submit a concise
entry (name, one-liner, link) to:

- [ ] awesome-llm
- [ ] awesome-production-llm
- [ ] awesome-privacy
- [ ] awesome-python
- [ ] NLP-focused lists (awesome-nlp and similar)
- [ ] PII / data-anonymization focused lists

Follow each list's contribution format exactly; drive-by entries get rejected.

## 5. Community presence (value-first, no spam)

Genuine help first. Mention piighost only when it is the right answer to the
question being asked, and disclose that you maintain it.

- **Reddit** is where the questions live, and Perplexity cites Reddit heavily.
  Watch r/LangChain, r/LocalLLaMA, r/Python, and r/MachineLearning for people
  asking how to anonymize PII before sending prompts to a model, or looking for a
  Presidio alternative. Answer the whole question; link piighost when relevant.
- **Stack Overflow.** Write durable answers to evergreen questions such as
  "anonymize PII before OpenAI" and "Presidio alternative python". These get
  retrieved for years.
- **Hacker News.** A "Show HN" at a real release milestone (a notable version or
  a new capability). One good post beats repeated low-value ones.

## 6. Third-party comparisons

When a user asks for "alternatives to X", assistants read comparison content.
Work to get piighost included in:

- "Presidio alternatives" articles and roundup blog posts.
- Directory-style sites (G2, StackShare, and similar) with an accurate profile.
- Comparison posts covering PII redaction and anonymization tooling.

Provide accurate, peer-framed positioning to authors rather than marketing spin.

## 7. Deferred on-site follow-ups

Not built in this pass; recorded so we do not lose them:

- Dedicated comparison pages ("piighost vs Presidio", "piighost vs scrubadub")
  with a feature matrix. These rank and get cited well for "vs" queries.
- Dated benchmark numbers per detector (accuracy and latency), so claims are
  verifiable and quotable.
- An optional `codemeta.json` in the piighost repo root, mapping project
  metadata to schema.org so machine readers get structured facts.
