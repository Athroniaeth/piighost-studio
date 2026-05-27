import { Section } from "@/components/section";
import { CodeBlock } from "@/components/code-block";

const install = `uv add piighost`;

const usage = `from langchain.agents import create_agent
from piighost.middleware import PIIAnonymizationMiddleware

agent = create_agent(
    model="openai:gpt-4o",
    tools=[send_email],
    middleware=[PIIAnonymizationMiddleware()],
)

# The LLM sees "<<PERSON:1>>" and "<<EMAIL:1>>".
# Your send_email tool still receives the real address.
result = agent.invoke({"messages": [("user", "Email Patrick at patrick@acme.com")]})`;

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
