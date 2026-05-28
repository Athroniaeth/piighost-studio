"use client";

import { Section } from "@/components/section";
import { CodeBlock } from "@/components/code-block";
import { useT } from "@/i18n/use-t";

const install = `uv add 'piighost[cache]'`;

const usage = `from langchain.agents import create_agent

from piighost import Anonymizer, ExactMatchDetector
from piighost.pipeline import ThreadAnonymizationPipeline
from piighost.middleware import PIIAnonymizationMiddleware

# Wire any detector you like: regex, a NER model, or an LLM.
detector = ExactMatchDetector([("Patrick", "PERSON")])
pipeline = ThreadAnonymizationPipeline(detector=detector, anonymizer=Anonymizer())
middleware = PIIAnonymizationMiddleware(pipeline=pipeline)

agent = create_agent(
    model="openai:gpt-5.5",
    tools=[send_email],
    middleware=[middleware],
)

# The LLM only sees "<<PERSON:1>>".
# Your send_email tool still receives the real value.`;

export function QuickStart() {
  const { t } = useT();
  return (
    <Section
      eyebrow={t.quickStart.eyebrow}
      title={t.quickStart.title}
      description={t.quickStart.description}
    >
      <div className="mx-auto grid max-w-3xl gap-4">
        <CodeBlock code={install} lang="bash" />
        <CodeBlock code={usage} lang="python" />
      </div>
    </Section>
  );
}
