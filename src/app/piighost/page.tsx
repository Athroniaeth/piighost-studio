import { ProjectHeader } from "@/components/project-header";
import { ProjectArticle } from "@/components/project-article";
import { CodeBlock } from "@/components/code-block";
import { getProject } from "@/lib/site";

export const metadata = { title: "piighost" };

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
)`;

export default function PiighostPage() {
  const codeBlocks = {
    install: <CodeBlock code={`uv add 'piighost[cache]'`} lang="bash" />,
    usage: <CodeBlock code={USAGE} lang="python" />,
  };

  return (
    <>
      <ProjectHeader project={getProject("piighost")} />
      <ProjectArticle slug="piighost" codeBlocks={codeBlocks} />
    </>
  );
}
