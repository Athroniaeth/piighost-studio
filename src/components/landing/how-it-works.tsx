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
            Hi, this is <Pii>Patrick Dupont</Pii>. Could you forward this to{" "}
            <Pii>Marie Lambert</Pii> and <Pii>Jean Moreau</Pii>? My email is{" "}
            <Pii>patrick.dupont@acme.com</Pii>, and you can also cc{" "}
            <Pii>marie.lambert@acme.com</Pii>. The case ID is{" "}
            <Pii>#ACME-9123</Pii>.
          </MessageBox>
          <p className="text-sm text-muted-foreground">
            piighost runs your detectors over the message and flags every PII
            span it finds: names, emails, identifiers, anything the model does
            not need to see. Overlapping detections from multiple detectors
            are arbitrated by confidence before anything is replaced.
          </p>
        </TabsContent>

        <TabsContent value="anonymize" className="mt-6 space-y-4">
          <MessageBox label="From the user">
            Hi, this is <Pii>Patrick Dupont</Pii>. Could you forward this to{" "}
            <Pii>Marie Lambert</Pii> and <Pii>Jean Moreau</Pii>? My email is{" "}
            <Pii>patrick.dupont@acme.com</Pii>, and you can also cc{" "}
            <Pii>marie.lambert@acme.com</Pii>. The case ID is{" "}
            <Pii>#ACME-9123</Pii>.
          </MessageBox>
          <div className="flex justify-center">
            <FlowArrow />
          </div>
          <MessageBox label="What the LLM sees">
            Hi, this is <Token>{"<<PERSON:1>>"}</Token>. Could you forward
            this to <Token>{"<<PERSON:2>>"}</Token> and{" "}
            <Token>{"<<PERSON:3>>"}</Token>? My email is{" "}
            <Token>{"<<EMAIL:1>>"}</Token>, and you can also cc{" "}
            <Token>{"<<EMAIL:2>>"}</Token>. The case ID is{" "}
            <Token>{"<<ID:1>>"}</Token>.
          </MessageBox>
          <p className="text-sm text-muted-foreground">
            Each PII value gets a stable counter scoped to its type. The three
            people in this message become{" "}
            <Token>{"<<PERSON:1>>"}</Token>, <Token>{"<<PERSON:2>>"}</Token>,
            and <Token>{"<<PERSON:3>>"}</Token>; the two distinct emails
            become <Token>{"<<EMAIL:1>>"}</Token> and{" "}
            <Token>{"<<EMAIL:2>>"}</Token>. The same value keeps the same
            identifier across every later message, every tool call, and every
            retry.
          </p>
        </TabsContent>

        <TabsContent value="deanonymize" className="mt-6 space-y-4">
          <MessageBox label="LLM response">
            I have forwarded your message to{" "}
            <Token>{"<<PERSON:2>>"}</Token> and{" "}
            <Token>{"<<PERSON:3>>"}</Token> with the case{" "}
            <Token>{"<<ID:1>>"}</Token>. A confirmation will be sent to{" "}
            <Token>{"<<EMAIL:1>>"}</Token> and copied to{" "}
            <Token>{"<<EMAIL:2>>"}</Token>.
          </MessageBox>
          <div className="flex justify-center">
            <FlowArrow />
          </div>
          <MessageBox label="What the user sees">
            I have forwarded your message to <Pii>Marie Lambert</Pii> and{" "}
            <Pii>Jean Moreau</Pii> with the case <Pii>#ACME-9123</Pii>. A
            confirmation will be sent to{" "}
            <Pii>patrick.dupont@acme.com</Pii> and copied to{" "}
            <Pii>marie.lambert@acme.com</Pii>.
          </MessageBox>
          <p className="text-sm text-muted-foreground">
            Tool calls receive the real values, and the final response is
            restored before it reaches the user. Notice the model wrote{" "}
            <Token>{"<<PERSON:2>>"}</Token> and{" "}
            <Token>{"<<PERSON:3>>"}</Token>, and piighost mapped each one back
            to the right name. Your agent code never has to manage that
            bookkeeping.
          </p>
        </TabsContent>
      </Tabs>
    </Section>
  );
}
