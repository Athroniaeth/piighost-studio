import { Hero } from "@/components/landing/hero";
import { Problem } from "@/components/landing/problem";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Detector } from "@/components/landing/detector";
import { Ecosystem } from "@/components/landing/ecosystem";
import { QuickStart } from "@/components/landing/quickstart";
import { Faq } from "@/components/landing/faq";
import { Cta } from "@/components/landing/cta";
import { CodeBlock } from "@/components/code-block";
import { JsonLd } from "@/components/json-ld";
import { faqPageLd } from "@/lib/jsonld";
import { dictionaries } from "@/i18n";
import { toLocale } from "@/i18n/locale-path";

const INSTALL = `uv add 'piighost[cache]'`;

const LANGCHAIN = `from langchain.agents import create_agent

from piighost.components.detector.ner import Gliner2Detector
from piighost.pipeline import ThreadAnonymizationPipeline
from piighost.integrations.langchain import (
    PIIAnonymizationMiddleware,
    ToolCallStrategy,
)

# Any detector works: regex, NER, or an LLM. Here a GLiNER2 NER model.
detector = Gliner2Detector("fastino/gliner2-multi-v1", labels=["PERSON", "LOCATION"])
pipeline = ThreadAnonymizationPipeline(detector)

agent = create_agent(
    model="openai:gpt-5.6-terra",
    tools=[lookup_city],
    middleware=[
        PIIAnonymizationMiddleware(pipeline=pipeline, tool_strategy=ToolCallStrategy.FULL)
    ],
)

# The model only sees "<<PERSON:1>>"; lookup_city still receives "Patrick".`;

const PYDANTIC = `from pydantic_ai import Agent

from piighost.components.detector.ner import Gliner2Detector
from piighost.pipeline import ThreadAnonymizationPipeline
from piighost.integrations.pydantic_ai import pii_hooks

detector = Gliner2Detector("fastino/gliner2-multi-v1", labels=["PERSON", "LOCATION"])
pipeline = ThreadAnonymizationPipeline(detector)

# pii_hooks scopes every token to the thread id.
hooks = pii_hooks(pipeline, "thread-42")
agent = Agent("openai:gpt-5.6-terra", capabilities=[hooks])

# The model reasons over "<<PERSON:1>>"; you read "Patrick" in the reply.
result = await agent.run("Where does Patrick live?")`;

const LLAMAINDEX = `from llama_index.core import Document, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter

from piighost.components.detector.ner import Gliner2Detector
from piighost.pipeline import ThreadAnonymizationPipeline
from piighost.integrations.llama_index import PIINodeAnonymizer, PIIQueryEngine

detector = Gliner2Detector("fastino/gliner2-multi-v1", labels=["PERSON", "LOCATION"])
pipeline = ThreadAnonymizationPipeline(detector)

# Anonymize each node before it is embedded, so the index is built on tokens.
index = VectorStoreIndex.from_documents(
    [Document(text="Patrick lives in Paris.")],
    transformations=[
        SentenceSplitter(),
        PIINodeAnonymizer(pipeline=pipeline, thread_id="docs"),
    ],
)

# The query engine anonymizes the question and restores the answer.
engine = PIIQueryEngine(inner=index.as_query_engine(), pipeline=pipeline, thread_id="docs")
answer = engine.query("Where does Patrick live?")`;

const USAGE_EXAMPLES = [
  { id: "langchain", label: "LangChain", code: LANGCHAIN },
  { id: "pydantic", label: "Pydantic AI", code: PYDANTIC },
  { id: "llamaindex", label: "LlamaIndex", code: LLAMAINDEX },
];

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang = toLocale(raw);
  const faq = dictionaries[lang].faq;
  return (
    <>
      <Hero />
      <Problem />
      <Detector />
      <HowItWorks />
      <Ecosystem />
      <QuickStart
        installBlock={<CodeBlock code={INSTALL} lang="bash" />}
        usageExamples={USAGE_EXAMPLES.map((ex) => ({
          id: ex.id,
          label: ex.label,
          block: <CodeBlock code={ex.code} lang="python" />,
        }))}
      />
      <Faq />
      <JsonLd data={faqPageLd(faq.items)} />
      <Cta />
    </>
  );
}
