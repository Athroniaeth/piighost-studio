import type { Dictionary } from "./types";

export const en: Dictionary = {
  nav: {
    piighost: "piighost",
    api: "piighost-api",
    chat: "piighost-chat",
    proofreader: "piighost-proofreader",
    projects: "Projects",
    philosophy: "Philosophy",
    playground: "Playground",
    github: "GitHub",
    toggleTheme: "Toggle theme",
    toggleLanguage: "Switch to French",
    backToTop: "Scroll to top",
  },
  projectHeader: {
    repository: "Repository",
    docs: "Docs",
    pypi: "PyPI",
  },
  projects: {
    piighost: {
      tagline: "The core library. Build PII anonymization pipelines for AI agents.",
      sections: [
        {
          heading: "What it does",
          paragraphs: [
            "piighost is the core library. It sits between your agent and the model. It detects PII, replaces it with stable placeholders the model can reason about, and restores the real values for your tools and your end users. The same value keeps the same placeholder across a whole conversation, even across multiple messages and tool calls.",
            "It is detector-agnostic: you wire in regex, a NER model, an LLM, or several at once. piighost handles detection arbitration, a tolerant linker for typos and case variants, and output guardrails for when the model generates fresh PII in its reply.",
          ],
        },
        {
          heading: "Install",
          code: "install",
        },
        {
          heading: "Use it as LangChain middleware",
          code: "usage",
        },
        {
          heading: "Where it fits",
          paragraphs: [
            "The library embeds in your Python process. When you need one shared inference endpoint across several processes, reach for piighost-api. To see it end to end, look at the chat demo and the proofreader.",
          ],
        },
      ],
    },
    api: {
      tagline: "A REST server that hosts one piighost pipeline behind HTTP.",
      sections: [
        {
          heading: "What it does",
          paragraphs: [
            "piighost-api is a REST server that hosts one configurable piighost pipeline behind HTTP. The library embeds in your process; the API lets several processes (chat backends, batch jobs, notebooks) hit one inference endpoint without re-loading models or duplicating cache state.",
          ],
        },
        {
          heading: "Features",
          list: [
            "Anonymize and deanonymize endpoints over the full pipeline.",
            "Any piighost detector, loaded once and shared across requests.",
            "Thread-scoped memory so entities stay consistent across a conversation.",
            "API-key authentication with Argon2 hashing, scopes, and expiration.",
            "Redis cache for shared anonymization mappings.",
            "Pipeline configured at startup with a module:variable import path.",
          ],
        },
        {
          heading: "Quick start",
          code: "quickstart",
        },
        {
          heading: "Talk to it",
          code: "request",
        },
      ],
    },
    chat: {
      tagline: "A demo chatbot that anonymizes messages before the LLM sees them.",
      sections: [
        {
          heading: "What it demonstrates",
          paragraphs: [
            "piighost-chat is a demo chatbot that shows a privacy-preserving conversation end to end. User messages are anonymized before they reach the LLM, and responses are deanonymized before they reach the user. Tools receive the real values.",
          ],
        },
        {
          heading: "The stack",
          list: [
            "A React frontend and a Litestar backend running a LangChain agent.",
            "PIIAnonymizationMiddleware wrapping the agent: anonymize before the LLM, deanonymize after.",
            "piighost-api for detection and highlighting, with thread-scoped memory for consistent placeholders.",
            "keyshield for API-key authentication.",
          ],
        },
        {
          heading: "The user flow",
          ordered: true,
          list: [
            "The user types a message.",
            "The backend calls piighost-api to detect PII; the frontend highlights the entities.",
            "The user confirms, and the message goes to the agent.",
            "The middleware anonymizes it before the model sees it, and deanonymizes the reply.",
          ],
        },
        {
          heading: "Run it",
          code: "run",
        },
      ],
    },
    proofreader: {
      tagline: "An LLM CV proofreader that anonymizes documents before any LLM call.",
      sections: [
        {
          heading: "What it does",
          paragraphs: [
            "piighost-proofreader is an LLM-powered proofreader for CVs. You upload a PDF and get an annotated list of mistakes with click-to-highlight on the rendered pages. The document is anonymized with piighost-api before any LLM call.",
          ],
        },
        {
          heading: "How it works",
          ordered: true,
          list: [
            "opendataloader-pdf converts the PDF to Markdown for the LLM.",
            "PyMuPDF renders each page and emits per-word bounding boxes.",
            "piighost-api anonymizes the Markdown before the LLM sees it.",
            "A LangChain and LiteLLM chain runs structured-output proofreading.",
            "A locator re-anchors each mistake to a page and bounding box.",
            "Streamlit renders the pages with overlays; clicking a mistake highlights it.",
          ],
        },
        {
          heading: "Run it",
          code: "run",
          afterCode:
            "You also need a running piighost-api at the URL declared in your .env.",
        },
      ],
    },
  },
  footer: {
    tagline: "Anonymize PII before it reaches the LLM.",
    projects: "Projects",
    links: "Links",
    mit: "MIT licensed. Built with Next.js and shadcn/ui.",
  },
  hero: {
    title: "Anonymize PII before it reaches the LLM",
    description:
      "piighost is a Python library for PII anonymization pipelines. It swaps personal data for stable placeholders the model can reason about, then restores the real values for your tools and your users. Your agent code does not change.",
    getStarted: "Get started",
    github: "GitHub",
  },
  problem: {
    eyebrow: "The problem",
    title: "You should not have to choose between good models and data privacy",
    items: [
      {
        title: "Hosted clouds leak raw data",
        body: "OpenAI, Anthropic, and Google ship the best models on the market. But every byte of context you send them, including raw user PII, leaves your jurisdiction the moment the request hits the wire. A single prompt becomes a data export, and 'we will redact it later' is not a story that survives a real audit.",
      },
      {
        title: "Local models trade quality",
        body: "Self-hosting keeps the data inside your network, but you give up part of the state of the art and you take on the GPU bill, the patching, and the eval pipeline. The privacy gain comes with a permanent operational cost, and the model you can run is rarely the model you wish you were running.",
      },
      {
        title: "Compliance does not wait",
        body: "GDPR, HIPAA, and data-residency rules apply whether or not your stack was built with them in mind. Sending raw PII to a third party is a liability you cannot undo once a request has left, and it forces every later product decision through a legal review.",
      },
      {
        title: "Bans throw away the upside",
        body: "Some teams respond by banning hosted LLMs outright. That protects the data, but it also forfeits the productivity gains everyone else is capturing, and people route around the ban anyway by pasting work into personal accounts the company cannot see.",
      },
    ],
  },
  howItWorks: {
    eyebrow: "How it works",
    title: "A layer between your agent and the model",
    tabs: {
      detect: "Detect",
      anonymize: "Anonymize",
      tools: "Tool calls",
      deanonymize: "Deanonymize",
    },
    detectCaption:
      "piighost runs your detectors over the message and flags every PII span it finds: names, emails, identifiers, anything the model does not need to see. Overlapping detections from multiple detectors are arbitrated by confidence before anything is replaced.",
    anonymizeCaption:
      "Each PII value gets a stable counter scoped to its type. The three people in this message become <<PERSON:1>>, <<PERSON:2>>, and <<PERSON:3>>; the two distinct emails become <<EMAIL:1>> and <<EMAIL:2>>. The same value keeps the same identifier across every later message, every tool call, and every retry.",
    toolsCaption:
      "The model never sees real data, so its tool calls come back written with placeholders too. piighost restores the real values inside the arguments before your function runs, so the email actually goes to <<EMAIL:1>>'s real address with the real case <<ID:1>>. Anything the tool returns is anonymized again before the model reads it.",
    deanonymizeCaption:
      "The final response is restored before it reaches the user. Notice the model wrote <<PERSON:2>> and <<PERSON:3>>, and piighost mapped each one back to the right name. Your agent code never has to manage that bookkeeping.",
    labels: {
      userMessage: "User message",
      fromUser: "From the user",
      llmSees: "What the LLM sees",
      toolCall: "Tool call from the model",
      toolRuns: "What your tool actually runs",
      llmResponse: "LLM response",
      userSees: "What the user sees",
    },
  },
  detector: {
    eyebrow: "Use case driven",
    title: "Each use case calls for its own pipeline",
    description:
      "There is no universal detector for PII. piighost gives you composable building blocks (detection, linking, output guardrails) so you can build a pipeline tuned to your data, your latency budget, and your compliance rules.",
    items: [
      {
        title: "Conversational",
        body: "Customer support, in-app chat, voice transcripts. Fast NER for names and locations, regex for emails and phone numbers, thread-scoped memory so the same person keeps the same placeholder across the whole conversation.",
      },
      {
        title: "Document processing",
        body: "Long PDFs, contracts, support tickets. Latency budget is wider, accuracy matters more. An LLM as a detector on the tricky paragraphs, regex on the structured fields, and re-anchoring so findings line up with the source document.",
      },
      {
        title: "Structured forms",
        body: "API payloads, CSVs, exports. Sub-millisecond, deterministic, auditable. A pure regex pipeline with an exhaustive ruleset, no model in the loop, and a placeholder format your downstream systems can parse.",
      },
      {
        title: "Code and logs",
        body: "Debugging assistants, log triage, incident bots. Stack traces and log lines carry secrets, tokens, internal hostnames, and user records. A regex-first pipeline strips credentials and identifiers, with custom detectors for your own ID formats, before anything reaches the model.",
      },
    ],
  },
  ecosystem: {
    eyebrow: "The ecosystem",
    title: "One privacy layer, many projects",
    description:
      "Start with the library. Reach for the server, the chat demo, and the proofreader as you grow.",
    moreToCome: "More to come.",
  },
  quickStart: {
    eyebrow: "Quick start",
    title: "Drop it into a LangChain agent",
    description: "Add the middleware and your agent code stays the same.",
  },
  cta: {
    title: "Ship AI features without shipping user data",
    description: "Install piighost, wire your detector, and keep PII out of the model.",
    readTheDocs: "Read the docs",
    starOnGitHub: "Star on GitHub",
  },
  playground: {
    configTitle: "Configuration",
    modelLabel: "Model",
    models: {
      multilingual: "Multilingual (EN, FR, ...)",
      english: "English only",
      glinerSmall: "Zero-shot, general purpose (~183 MB)",
      glinerPii: "Zero-shot, PII-tuned, multilingual (~349 MB)",
    },
    modelGroups: { classic: "Classic NER", gliner: "GLiNER (zero-shot)" },
    glinerLabelsLabel: "Types to detect",
    glinerLabelsPlaceholder: "person, email, phone number, address",
    glinerLabelsHint: "Comma-separated. Re-run the analysis to apply new types.",
    labelsLabel: "Allowed labels",
    thresholdLabel: "Threshold",
    inputLabel: "Your text",
    example:
      "Sarah Connor, an American engineer, joined Cyberdyne Systems in Los Angeles last spring. Her German colleague Klaus Vogel had transferred from the Berlin office, while James Reese coordinated the London team. The project drew on research first presented at the United Nations.",
    analyze: "Analyze",
    analyzing: "Analyzing...",
    loadingModel: "Downloading the model...",
    firstLoadNote:
      "The first run downloads the model to your browser (tens to a few hundred MB). It is cached afterwards, so later runs are instant.",
    edit: "Edit",
    resultsTitle: "Detected entities",
    inferenceTime: "Inference",
    reqPerSecond: "req/s",
    noEntities: "No entities detected.",
    columns: { text: "Text", label: "Label", score: "Score" },
    errorTitle: "Something went wrong",
    retry: "Try again",
    emptyHint: "Run an analysis to see results.",
  },
  philosophy: {
    eyebrow: "Philosophy",
    title: "Why Anonymize?",
    intro:
      "A factual account of how cloud LLMs handle your data, what legal and technical protections are (and are not) in place, and why anonymizing before sending is the only control you hold in your own hands.",
    sections: [
      {
        id: "how-cloud-llm-works",
        heading: "How a cloud LLM works",
        paragraphs: [
          "An LLM such as ChatGPT, Claude or Mistral Le Chat is not a piece of software running on your computer. It is a remote service. Your question leaves your machine, travels across the Internet, reaches the provider's servers, is processed there, and a response comes back.",
          "The interface can be local, the model is not. Even if you use a desktop app, a browser extension, or an IDE plugin, the model is not executed on your machine. Only the interface is. The computation happens in the provider's cloud. The term \"local LLM\" refers exclusively to inference on your own hardware, via tools like Ollama or llama.cpp.",
          "This path has several often underestimated consequences:",
        ],
        list: [
          "The message is received in cleartext by the provider's infrastructure. TLS encryption protects the transit; it does not protect reading on the server side.",
          "It is generally logged for billing, abuse detection, debugging, and model improvement.",
          "It may be retained for weeks, months or years, depending on the provider's policy and any legal obligations that bind it.",
        ],
        subsections: [],
      },
      {
        id: "limits-of-contractual-promise",
        heading: "The limits of a contractual promise",
        paragraphs: [
          "Let us start from the most favourable assumption: the major providers (OpenAI, Anthropic, Google, Mistral and others) sincerely want to protect their users' data. Their privacy policies formalise commitments (\"we do not train on your API data\", \"we delete after 30 days\", \"we reject abusive requests\"), and these commitments are generally honoured.",
          "That is not enough, because a contractual commitment can fall for three different reasons, none of which stems from bad faith on the provider's part.",
        ],
        subsections: [
          {
            heading: "A technical incident, a bug, or an attack",
            paragraphs: [
              "No policy protects against an engineering mistake or a successful intrusion. Two cases are enough to illustrate the point.",
              "On March 20, 2023, a bug in the Redis library used by OpenAI exposed ChatGPT conversation titles to other users for roughly nine hours. For about 1.2% of ChatGPT Plus subscribers active during that window, partial payment information (name, email, last four digits of the card, expiration date) was also visible to third-party accounts. OpenAI published a public post-mortem acknowledging the incident.",
              "In January 2025, researchers at Wiz Research discovered that a DeepSeek ClickHouse database was reachable on the Internet without authentication. More than a million log lines were exposed, including conversation histories, API keys and internal infrastructure metadata.",
              "In both cases, the data leaked without a lawsuit, without an order, and without any malicious intent from the company. A bug, a missing configuration, and the contractual perimeter loses its meaning.",
            ],
          },
          {
            heading: "Your data being used for training",
            paragraphs: [
              "\"If it's free, you're the product.\" The old adage of commercial web applies to LLMs too. Running inference on a large model is expensive: each response ties up GPUs in real time and the provider pays that bill on every request. Yet OpenAI, Google and others offer very generous free tiers. Standard commercial reasons (user acquisition, de-facto standard effects) only account for part of this business model. These free tiers also fuel training data collection.",
              "On consumer-grade free tiers, your conversations may be used to improve the model in several ways: explicit feedback (thumbs up or down, rewording, regeneration) serves as a reinforcement learning signal, exchanges can be reviewed by human annotators to identify failure modes, and the full conversation corpus can serve as raw material to build the datasets for subsequent iterations.",
              "Paid offerings (API, ChatGPT Enterprise, Claude Team, etc.) generally exclude your data from training by default. On free tiers, by contrast, opt-out is often buried in the settings, sometimes disabled by default, and the policy can shift over time.",
            ],
          },
          {
            heading: "A judicial order",
            paragraphs: [
              "Even when the provider wants to delete your data, a court can prevent it.",
              "On May 13, 2025, as part of its lawsuit against OpenAI, the New York Times obtained from Magistrate Judge Ona T. Wang a preservation order: OpenAI was required to retain every ChatGPT conversation and API call from its customers, including those the company would normally have deleted under its own policy. OpenAI opposed the order publicly by filing a motion for reconsideration, rejected initially, then by appealing to District Judge Sidney Stein, who denied the appeal in June 2025. The order was ultimately lifted on September 26, 2025 (formal termination on October 9), with users from the EEA, Switzerland and the United Kingdom having been exempted from the measure.",
              "The matter did not end there. On November 7, 2025, the same Magistrate Judge ordered OpenAI to hand over 20 million de-identified ChatGPT logs to the New York Times as evidence. OpenAI filed for reconsideration, which was denied, and then appealed. On January 5, 2026, District Judge Stein affirmed the ruling, sealing the delivery obligation.",
              "This episode has two practical consequences. First, a provider's privacy policy is never final: a court decision to which you are not a party can rewrite it, force retention, or compel the massive delivery of conversations to a third party. Second, the exposure window of your data to a future leak or attack grows mechanically, and with it the probability that a public authority (American or, via international rogatory commission, foreign) will gain access to it.",
            ],
          },
        ],
      },
      {
        id: "legal-not-enough",
        heading: "Legal: the law is not enough either",
        paragraphs: [
          "The instinctive response to this technical picture is to turn to the law: pick a \"GDPR-compliant\" provider, check the certifications, demand contractual clauses. This approach is useful but incomplete, for two reasons: US law provides legal access paths to the data, and European law has not yet produced a tested safeguard applied to LLMs.",
        ],
        subsections: [
          {
            heading: "The US framework: CLOUD Act, FISA 702, Executive Order 12333",
            paragraphs: [
              "Three texts structure US access to provider data, and none of them is the Patriot Act. The Patriot Act (2001) often comes up in this debate, but it is no longer the right text to cite. Its best-known surveillance provision, Section 215, was restricted by the USA FREEDOM Act in 2015, then allowed to expire by Congress in March 2020.",
            ],
            list: [
              "The CLOUD Act (2018) obliges any provider under US jurisdiction to hand over data it controls, regardless of where that data is physically stored. A datacenter in Ireland or France does not put the data out of reach as soon as the company is American.",
              "FISA Section 702 is the legal basis for mass-surveillance programs like PRISM, revealed in 2013 by Edward Snowden. It allows the collection of communications via major US providers.",
              "Executive Order 12333 is the broader framework for surveillance by the US executive branch, without direct judicial supervision.",
            ],
          },
          {
            heading: "Schrems II: the CJEU rules",
            paragraphs: [
              "In July 2020, the Court of Justice of the European Union invalidated the Privacy Shield, the agreement that framed data transfers between the EU and the United States. Its reasoning, in short: FISA 702 and Executive Order 12333 are too permissive to comply with the GDPR and offer no effective judicial remedy to European citizens. More than 5,300 companies relied on the Privacy Shield for their transatlantic transfers. A second agreement, the Data Privacy Framework (2023), replaced it, but it rests on the same US legal foundations and its durability is contested.",
            ],
          },
          {
            heading: "Microsoft Ireland: jurisdiction beats geography",
            paragraphs: [
              "Between 2013 and 2018, US authorities demanded that Microsoft, via a warrant issued under the Stored Communications Act, hand over a customer's data stored on its servers in Ireland. Microsoft resisted all the way to the Supreme Court. The proceeding was never decided on the merits, because Congress passed the CLOUD Act in March 2018 to clarify the answer: yes, US companies must produce data wherever it is stored.",
              "Direct consequence: European hosting by a US provider offers no legal watertightness against the United States. The \"your data stays in Europe\" marketing masks this asymmetry.",
            ],
          },
          {
            heading: "The European framework: a GDPR that has not yet held up on LLMs",
            paragraphs: [
              "The GDPR remains a solid tool on paper, but its application to LLMs is in its infancy. The Garante, Italy's data-protection authority, opened an investigation against OpenAI as early as March 2023. In December 2024, it imposed a 15 million euro fine on OpenAI for processing without a legal basis, transparency failings, and the absence of an age-verification mechanism. But in March 2026, the Rome tribunal annulled that decision in its entirety. To date, no European authority has secured a final-instance sanction against a major LLM for a GDPR violation relating to the training-collection phase.",
            ],
          },
        ],
      },
      {
        id: "secondary-uses",
        heading: "Secondary uses: what collected data enables",
        paragraphs: [
          "The preceding sections explain how the data leaves your perimeter. What remains is to specify what it enables once collected. Three uses, unevenly documented, deserve to be distinguished so as not to conflate a structural risk with a proven practice.",
        ],
        subsections: [
          {
            heading: "Mass surveillance",
            paragraphs: [
              "An LLM conversation technically resembles an email or chat: timestamped text, attached to an identifiable account. It falls within the same collection perimeter as other electronic communications covered by FISA 702, renewed for two years in April 2024 by RISAA, and whose renewal is again under debate in Congress in April 2026. Declassified PCLOB reports document several hundred thousand selectors (target identifiers) active each year, and the \"about\" collection (suspended in 2017, later re-authorized) mechanically broadens the perimeter to communications that are neither sent to nor by the target, but that mention it.",
            ],
          },
          {
            heading: "Profiling and political targeting",
            paragraphs: [
              "The concern is not speculative; it rests on documented cases of targeted surveillance in other layers of the Internet.",
            ],
            list: [
              "Angela Merkel, October 2013: the Snowden revelations document NSA surveillance of the German chancellor's mobile phone, listed as a target since 2002.",
              "Associated Press, 2012-2013: the Department of Justice secretly seized in April-May 2012 the records of more than twenty AP telephone lines, as part of a leak investigation.",
              "Pegasus / NSO, 2021: the Forbidden Stories coalition documents the use of the Pegasus spyware against about 180 targeted journalists, as well as activists, lawyers, diplomats and heads of state in more than 20 countries.",
            ],
          },
          {
            heading: "Commercial targeting and data brokers",
            paragraphs: [
              "The risk is different from the previous two: it requires neither a judge nor a warrant. It rests on the commercial ecosystem surrounding the providers, and unfolds in three steps.",
              "First, an incentive structure. Several major LLM players have adjacent interests in targeted advertising: Google makes it its core business, Microsoft (a major OpenAI shareholder) operates Bing Ads, Meta pushes its own generative AI ecosystem inside a group whose near-total revenue comes from advertising targeting.",
              "Next, the current state of evidence. There is no proof today that any provider has resold LLM conversations to data brokers. The argument therefore rests not on a proven practice but on a structural risk: data that enters a system, held by an actor who has an economic interest in exploiting it, can later leave through channels that are not those initially advertised.",
              "Finally, the documented porosity between the advertising ecosystem and surveillance. A report from the Office of the Director of National Intelligence dated January 2022 and declassified in June 2023 acknowledges that US intelligence agencies regularly buy commercial data from data brokers, notably location and browsing data. What is collected to sell advertising can therefore be bought back to surveil, without a warrant or notification.",
            ],
          },
          {
            heading: "Why anonymization breaks this graph",
            paragraphs: [
              "A PII sent in cleartext becomes a node in a potential graph: it can be crossed with social networks, prior breaches, public registries or commercial databases, to re-identify, enrich or target. A placeholder has no aggregation value. Anonymizing before sending cuts the common root of every secondary-use chain described above.",
            ],
          },
        ],
      },
      {
        id: "provider-spectrum",
        heading: "Where to place yourself on the provider spectrum?",
        paragraphs: [
          "The choice is not binary between \"US cloud\" and \"nothing\". There is a continuum, from the most exposed to the most isolated, and each step changes both the legal risk and the responsibility that falls on you.",
        ],
        table: {
          headers: ["Option", "CLOUD Act / FISA 702", "GDPR", "Provider technical access", "Training on your data"],
          rows: [
            ["US provider, US servers", "Yes, directly", "Indirect, via DPF, fragile", "Yes", "Variable"],
            ["US provider, EU servers", "Yes (cf. Microsoft Ireland)", "Applies, but preempted", "Yes", "Excluded by default on enterprise tiers"],
            ["EU provider", "No (unless US-controlled)", "Applies fully", "Yes", "Excluded by default on paid tiers"],
            ["Local model (self-hosted)", "No", "You are responsible", "No: you are the provider", "No: you control it"],
          ],
        },
        subsections: [
          {
            heading: "",
            paragraphs: [
              "At one end of the spectrum, a US provider hosted in the United States piles up the three risks above: CLOUD Act, FISA 702 and Executive Order 12333 apply unfiltered, transfers from the EU rely on the contested Data Privacy Framework, and a US judge's order can force indefinite retention of conversations.",
              "Moving the servers physically to Europe changes almost nothing legally. As soon as the operating entity is under US jurisdiction, the CLOUD Act applies regardless of where the hard drives sit.",
              "Switching jurisdiction by moving to a European provider (Mistral, OVHcloud AI, Scaleway, Aleph Alpha) drops the CLOUD Act risk by default, unless the provider has a controlled US subsidiary. The GDPR applies fully and European authorities can sanction. This does not make the provider blind to the content: it retains full technical access, protection remains contractual and state-based.",
              "Finally, running the model locally on your own infrastructure (Ollama, vLLM, llama.cpp or equivalent) removes the third party entirely: no provider has technical access to the content, by construction. It is the maximum protection on the confidentiality front. The trade-off is that all responsibility shifts onto you: physical and logical security, encryption at rest, access management, updates, logging.",
              "The choice of provider still matters for many things: latency, cost, model quality, overall GDPR compliance, integration ecosystem. But for the specific risk of PII leakage, anonymization neutralizes that choice. If only placeholders leave your infrastructure, a US provider receives nothing exploitable about your sensitive data.",
            ],
          },
        ],
      },
      {
        id: "sectoral-obligations",
        heading: "Sectoral obligations and choices already made",
        paragraphs: [],
        subsections: [
          {
            heading: "When it is a legal obligation",
            paragraphs: [
              "In several professions, sending personal data to a non-sovereign LLM is not a matter of convenience; it is a regulatory impossibility.",
            ],
            list: [
              "Finance: MiFID II, banking secrecy, client-confidentiality obligations.",
              "Lawyers: absolute professional secrecy (article 66-5 of the French law of 31 December 1971). A client consultation sent raw and identifiable to a US LLM can amount to a deontological fault.",
              "Medicine: medical secrecy (article L.1110-4 of the French Public Health Code), HIPAA in the United States. A patient record cannot transit through a third-party service without heavy technical guarantees.",
              "Defense and strategic sectors: specific regimes (classification, CUI in the US, Diffusion Restreinte in France).",
            ],
          },
          {
            heading: "What large companies have already decided",
            paragraphs: [
              "In the absence of available technical protection in 2023, several large groups simply banned their employees from using cloud LLMs.",
            ],
            list: [
              "Samsung, April 2023: several internal incidents where engineers pasted source code and meeting notes into ChatGPT. In May 2023, the company banned the use of generative LLMs on professional devices.",
              "US banking sector, spring 2023: JPMorgan Chase, Bank of America, Citigroup, Goldman Sachs, Deutsche Bank and Wells Fargo blocked or restricted ChatGPT use for their employees.",
            ],
          },
        ],
      },
      {
        id: "legal-vs-technical",
        heading: "Legal protection vs technical protection",
        paragraphs: [
          "All the protections mobilized so far rest on legal instruments: privacy policies, standard contractual clauses, international agreements, administrative fines. They share a common flaw: they are revocable, by a political or judicial decision over which you have no control.",
        ],
        table: {
          headers: ["Type of protection", "Example", "Why it is fragile"],
          rows: [
            ["Contractual promise", "\"We do not read your data\"", "Overridable by an order (NYT vs OpenAI)"],
            ["Standard contractual clauses", "EU-to-US transfers", "Already weakened by Schrems II"],
            ["International agreement", "Privacy Shield, DPF", "The first was invalidated, the second is contested"],
            ["Regional regulation", "GDPR", "Slow to produce sanctions actually applied to LLMs"],
            ["Regional hosting", "\"Datacenters in Europe\"", "Neutralized by the CLOUD Act if the provider is American"],
          ],
        },
        subsections: [
          {
            heading: "",
            paragraphs: [
              "Technical protection works differently. If the personal data never leaves your infrastructure, and only a placeholder is sent to the LLM:",
            ],
            list: [
              "no order can compel a third party to disclose what it does not hold,",
              "no change to an international agreement affects you,",
              "no provider retention policy is in play,",
              "the provider can be hacked, acquired, or disappear: your data was not there.",
            ],
          },
          {
            heading: "",
            paragraphs: [
              "It is the difference between \"we promise not to look\" and \"we are technically unable to look\". The second is always stronger than the first.",
            ],
          },
        ],
      },
      {
        id: "what-anonymization-does-not-solve",
        heading: "What anonymization does not solve",
        paragraphs: [
          "Anonymization is a layer in a defense-in-depth posture, not a silver bullet.",
        ],
        list: [
          "It does not make an LLM compliant with every regulatory regime. Some data (identifiably linkable health data, defense-classified material) must not leave the infrastructure, even in anonymized form.",
          "It depends on detector quality. A PII that is not detected passes through in cleartext. This is an engineering concern, not a conceptual flaw.",
          "It does not replace other good practices: encryption at rest, audited logging, access management, team training.",
        ],
      },
    ],
  },
};
