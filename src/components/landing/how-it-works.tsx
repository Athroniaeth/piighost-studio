import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Section } from "@/components/section";

function Pii({ children }: { children: ReactNode }) {
  return (
    <span className="rounded bg-amber-500/15 px-1 text-amber-700 dark:text-amber-300">
      {children}
    </span>
  );
}

function Token({ children }: { children: ReactNode }) {
  return (
    <span className="rounded bg-primary/10 px-1 font-mono text-primary">
      {children}
    </span>
  );
}

function MessageBox({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="break-words font-mono text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex justify-center text-primary sm:justify-self-center">
      <ArrowRight className="size-5 sm:size-6" />
    </div>
  );
}

export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      eyebrow="How it works"
      title="A layer between your agent and the model"
    >
      <Tabs defaultValue="detect" className="mx-auto max-w-3xl">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="detect">Detect</TabsTrigger>
          <TabsTrigger value="anonymize">Anonymize</TabsTrigger>
          <TabsTrigger value="deanonymize">Deanonymize</TabsTrigger>
        </TabsList>

        <TabsContent value="detect" className="mt-6 space-y-4">
          <MessageBox label="User message">
            Email <Pii>Patrick</Pii> at <Pii>patrick@acme.com</Pii> about the
            meeting in <Pii>Paris</Pii>.
          </MessageBox>
          <p className="text-sm text-muted-foreground">
            piighost runs your detectors over the message and flags every PII
            span: names, emails, addresses, anything the model does not need to
            see.
          </p>
        </TabsContent>

        <TabsContent value="anonymize" className="mt-6 space-y-4">
          <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
            <MessageBox label="From the user">
              Email <Pii>Patrick</Pii> at <Pii>patrick@acme.com</Pii>.
            </MessageBox>
            <FlowArrow />
            <MessageBox label="What the LLM sees">
              Email <Token>{"<<PERSON:1>>"}</Token> at{" "}
              <Token>{"<<EMAIL:1>>"}</Token>.
            </MessageBox>
          </div>
          <p className="text-sm text-muted-foreground">
            Each span is swapped for a stable placeholder. The same value keeps
            the same placeholder across the whole conversation.
          </p>
        </TabsContent>

        <TabsContent value="deanonymize" className="mt-6 space-y-4">
          <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
            <MessageBox label="LLM response">
              Email sent to <Token>{"<<PERSON:1>>"}</Token>.
            </MessageBox>
            <FlowArrow />
            <MessageBox label="What the user sees">
              Email sent to <Pii>Patrick</Pii>.
            </MessageBox>
          </div>
          <p className="text-sm text-muted-foreground">
            Tool calls receive the real values, and the final response is
            restored before it reaches the user. The LLM only ever saw
            placeholders.
          </p>
        </TabsContent>
      </Tabs>
    </Section>
  );
}
