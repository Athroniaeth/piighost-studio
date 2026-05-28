import { ArrowDown } from "lucide-react";
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
    <div className="text-primary">
      <ArrowDown className="size-5 sm:size-6" />
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
            Hi, this is <Pii>Patrick Dupont</Pii> from <Pii>Acme Corp</Pii>.
            Could you cancel subscription <Pii>#ACME-9123</Pii>? I will no
            longer be at <Pii>12 rue de la Paix</Pii> in <Pii>Paris</Pii>{" "}
            after next month. You can reach me at{" "}
            <Pii>patrick.dupont@acme.com</Pii> or{" "}
            <Pii>+33 6 12 34 56 78</Pii>.
          </MessageBox>
          <p className="text-sm text-muted-foreground">
            piighost runs your detectors over the message and flags every PII
            span it finds: names, organizations, addresses, identifiers, phone
            numbers, anything the model does not need to see. Overlapping
            detections from multiple detectors are arbitrated by confidence
            before anything is replaced.
          </p>
        </TabsContent>

        <TabsContent value="anonymize" className="mt-6 space-y-4">
          <MessageBox label="From the user">
            Hi, this is <Pii>Patrick Dupont</Pii> from <Pii>Acme Corp</Pii>.
            Could you cancel subscription <Pii>#ACME-9123</Pii>? I will no
            longer be at <Pii>12 rue de la Paix</Pii> in <Pii>Paris</Pii>{" "}
            after next month. You can reach me at{" "}
            <Pii>patrick.dupont@acme.com</Pii> or{" "}
            <Pii>+33 6 12 34 56 78</Pii>.
          </MessageBox>
          <div className="flex justify-center">
            <FlowArrow />
          </div>
          <MessageBox label="What the LLM sees">
            Hi, this is <Token>{"<<PERSON:1>>"}</Token> from{" "}
            <Token>{"<<ORG:1>>"}</Token>. Could you cancel subscription{" "}
            <Token>{"<<ID:1>>"}</Token>? I will no longer be at{" "}
            <Token>{"<<ADDRESS:1>>"}</Token> in{" "}
            <Token>{"<<LOCATION:1>>"}</Token> after next month. You can reach
            me at <Token>{"<<EMAIL:1>>"}</Token> or{" "}
            <Token>{"<<PHONE:1>>"}</Token>.
          </MessageBox>
          <p className="text-sm text-muted-foreground">
            Each span is swapped for a stable placeholder. The same person
            keeps the same identifier across every later message, every tool
            call, and every retry, so the model never confuses two people for
            one or one person for two.
          </p>
        </TabsContent>

        <TabsContent value="deanonymize" className="mt-6 space-y-4">
          <MessageBox label="LLM response">
            I have cancelled subscription <Token>{"<<ID:1>>"}</Token> for{" "}
            <Token>{"<<PERSON:1>>"}</Token>. A confirmation email is on its
            way to <Token>{"<<EMAIL:1>>"}</Token>, and the address on file at{" "}
            <Token>{"<<ADDRESS:1>>"}</Token> will be marked inactive on the
            effective date.
          </MessageBox>
          <div className="flex justify-center">
            <FlowArrow />
          </div>
          <MessageBox label="What the user sees">
            I have cancelled subscription <Pii>#ACME-9123</Pii> for{" "}
            <Pii>Patrick Dupont</Pii>. A confirmation email is on its way to{" "}
            <Pii>patrick.dupont@acme.com</Pii>, and the address on file at{" "}
            <Pii>12 rue de la Paix</Pii> will be marked inactive on the
            effective date.
          </MessageBox>
          <p className="text-sm text-muted-foreground">
            Tool calls receive the real values, and the final response is
            restored before it reaches the user. The model only ever saw
            placeholders. Your agent code, your tools, and your end users keep
            working with real data.
          </p>
        </TabsContent>
      </Tabs>
    </Section>
  );
}
