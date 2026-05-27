import { Section } from "@/components/section";
import { CodeBlock } from "@/components/code-block";

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
    model="openai:gpt-4o",
    tools=[send_email],
    middleware=[middleware],
)

# The LLM only sees "<<PERSON:1>>".
# Your send_email tool still receives the real value.`;

export function QuickStart() {
  return (
    <Section
      eyebrow="Quick start"
      title="Drop it into a LangChain agent"
      description="Add the middleware and your agent code stays the same."
    >
      <div className="mx-auto grid max-w-3xl gap-4">
        <CodeBlock code={install} lang="bash" />
        <CodeBlock code={usage} lang="python" />
      </div>
    </Section>
  );
}
