"use client";

import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Section } from "@/components/section";
import { useT } from "@/i18n/use-t";

const ORDER = ["detect", "anonymize", "tools", "deanonymize"] as const;
const SLIDE_MS = 10000;

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

function renderCaption(text: string): ReactNode {
  return text.split(/(<<[^>]+>>)/g).map((part, i) =>
    part.startsWith("<<") ? <Token key={i}>{part}</Token> : <span key={i}>{part}</span>,
  );
}

export function HowItWorks() {
  const { t } = useT();
  const hw = t.howItWorks;
  const [value, setValue] = useState<string>("detect");
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const playing = inView && !reduced;

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => {
      const i = ORDER.indexOf(value as (typeof ORDER)[number]);
      setValue(ORDER[(i + 1) % ORDER.length]);
    }, SLIDE_MS);
    return () => clearTimeout(id);
  }, [playing, value]);

  return (
    <Section id="how-it-works" eyebrow={hw.eyebrow} title={hw.title}>
      <Tabs
        value={value}
        onValueChange={(v) => setValue(v as string)}
        className="mx-auto max-w-3xl"
        ref={ref}
      >
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="detect">{hw.tabs.detect}</TabsTrigger>
          <TabsTrigger value="anonymize">{hw.tabs.anonymize}</TabsTrigger>
          <TabsTrigger value="tools">{hw.tabs.tools}</TabsTrigger>
          <TabsTrigger value="deanonymize">{hw.tabs.deanonymize}</TabsTrigger>
        </TabsList>

        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
          {playing && (
            <div
              key={`${value}-${inView}`}
              className="h-full origin-left bg-primary"
              style={{ animation: `hiw-progress ${SLIDE_MS}ms linear forwards` }}
            />
          )}
        </div>

        <div className="relative mt-6 flex min-h-[30rem] flex-col justify-center">
        <TabsContent value="detect" className="space-y-4">
          <MessageBox label={hw.labels.userMessage}>
            Hi, this is <Pii>Patrick Dupont</Pii>. Could you forward this to{" "}
            <Pii>Marie Lambert</Pii> and <Pii>Jean Moreau</Pii>? My email is{" "}
            <Pii>patrick.dupont@acme.com</Pii>, and you can also cc{" "}
            <Pii>marie.lambert@acme.com</Pii>. The case ID is{" "}
            <Pii>#ACME-9123</Pii>.
          </MessageBox>
          <p className="text-sm text-muted-foreground">{hw.detectCaption}</p>
        </TabsContent>

        <TabsContent value="anonymize" className="space-y-4">
          <MessageBox label={hw.labels.fromUser}>
            Hi, this is <Pii>Patrick Dupont</Pii>. Could you forward this to{" "}
            <Pii>Marie Lambert</Pii> and <Pii>Jean Moreau</Pii>? My email is{" "}
            <Pii>patrick.dupont@acme.com</Pii>, and you can also cc{" "}
            <Pii>marie.lambert@acme.com</Pii>. The case ID is{" "}
            <Pii>#ACME-9123</Pii>.
          </MessageBox>
          <div className="flex justify-center">
            <FlowArrow />
          </div>
          <MessageBox label={hw.labels.llmSees}>
            Hi, this is <Token>{"<<PERSON:1>>"}</Token>. Could you forward
            this to <Token>{"<<PERSON:2>>"}</Token> and{" "}
            <Token>{"<<PERSON:3>>"}</Token>? My email is{" "}
            <Token>{"<<EMAIL:1>>"}</Token>, and you can also cc{" "}
            <Token>{"<<EMAIL:2>>"}</Token>. The case ID is{" "}
            <Token>{"<<ID:1>>"}</Token>.
          </MessageBox>
          <p className="text-sm text-muted-foreground">{renderCaption(hw.anonymizeCaption)}</p>
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <MessageBox label={hw.labels.toolCall}>
            send_email(
            <br />
            {"  "}to=<Token>{"<<EMAIL:1>>"}</Token>,
            <br />
            {"  "}subject=&quot;Case <Token>{"<<ID:1>>"}</Token>&quot;,
            <br />
            {"  "}body=&quot;Forwarding to <Token>{"<<PERSON:2>>"}</Token> and{" "}
            <Token>{"<<PERSON:3>>"}</Token>&quot;,
            <br />)
          </MessageBox>
          <div className="flex justify-center">
            <FlowArrow />
          </div>
          <MessageBox label={hw.labels.toolRuns}>
            send_email(
            <br />
            {"  "}to=<Pii>patrick.dupont@acme.com</Pii>,
            <br />
            {"  "}subject=&quot;Case <Pii>#ACME-9123</Pii>&quot;,
            <br />
            {"  "}body=&quot;Forwarding to <Pii>Marie Lambert</Pii> and{" "}
            <Pii>Jean Moreau</Pii>&quot;,
            <br />)
          </MessageBox>
          <p className="text-sm text-muted-foreground">{renderCaption(hw.toolsCaption)}</p>
        </TabsContent>

        <TabsContent value="deanonymize" className="space-y-4">
          <MessageBox label={hw.labels.llmResponse}>
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
          <MessageBox label={hw.labels.userSees}>
            I have forwarded your message to <Pii>Marie Lambert</Pii> and{" "}
            <Pii>Jean Moreau</Pii> with the case <Pii>#ACME-9123</Pii>. A
            confirmation will be sent to{" "}
            <Pii>patrick.dupont@acme.com</Pii> and copied to{" "}
            <Pii>marie.lambert@acme.com</Pii>.
          </MessageBox>
          <p className="text-sm text-muted-foreground">{renderCaption(hw.deanonymizeCaption)}</p>
        </TabsContent>
        </div>
      </Tabs>
    </Section>
  );
}
