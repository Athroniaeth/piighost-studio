import { Hero } from "@/components/landing/hero";
import { Problem } from "@/components/landing/problem";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Detector } from "@/components/landing/detector";
import { Ecosystem } from "@/components/landing/ecosystem";
import { QuickStart } from "@/components/landing/quickstart";
import { Cta } from "@/components/landing/cta";
import { CodeBlock } from "@/components/code-block";

const INSTALL = `uv add 'piighost[cache]'`;

const USAGE = `from langchain.agents import create_agent

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

export default function Home() {
  return (
    <>
      <Hero />
      <Problem />
      <HowItWorks />
      <Detector />
      <Ecosystem />
      <QuickStart
        installBlock={<CodeBlock code={INSTALL} lang="bash" />}
        usageBlock={<CodeBlock code={USAGE} lang="python" />}
      />
      <Cta />
    </>
  );
}
