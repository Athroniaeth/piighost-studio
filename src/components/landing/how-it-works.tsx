"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Section } from "@/components/section";
import { useT } from "@/i18n/use-t";

const ORDER = ["detect", "anonymize", "tools", "deanonymize"] as const;
const SLIDE_MS = 10000;
const STEP_MS = 650;
const HOLD_MS = 1500;

type Entity = { raw: string; placeholder: string };
type Segment = { kind: "text"; value: string } | { kind: "entity"; index: number };

const P1: Entity = { raw: "Patrick Dupont", placeholder: "<<PERSON:1>>" };
const P2: Entity = { raw: "Marie Lambert", placeholder: "<<PERSON:2>>" };
const P3: Entity = { raw: "Jean Moreau", placeholder: "<<PERSON:3>>" };
const E1: Entity = { raw: "patrick.dupont@acme.com", placeholder: "<<EMAIL:1>>" };
const E2: Entity = { raw: "marie.lambert@acme.com", placeholder: "<<EMAIL:2>>" };
const ID1: Entity = { raw: "#ACME-9123", placeholder: "<<ID:1>>" };

const t = (value: string): Segment => ({ kind: "text", value });
const e = (index: number): Segment => ({ kind: "entity", index });

const ANONYMIZE_ENTITIES = [P1, P2, P3, E1, E2, ID1];
const ANONYMIZE_SEGMENTS: Segment[] = [
  t("Hi, this is "),
  e(0),
  t(". Could you forward this to "),
  e(1),
  t(" and "),
  e(2),
  t("? My email is "),
  e(3),
  t(", and you can also cc "),
  e(4),
  t(". The case ID is "),
  e(5),
  t("."),
];

const TOOLS_ENTITIES = [E1, ID1, P2, P3];
const TOOLS_SEGMENTS: Segment[] = [
  t("send_email(\n  to="),
  e(0),
  t(',\n  subject="Case '),
  e(1),
  t('",\n  body="Forwarding to '),
  e(2),
  t(" and "),
  e(3),
  t('",\n)'),
];

const DEANONYMIZE_ENTITIES = [P2, P3, ID1, E1, E2];
const DEANONYMIZE_SEGMENTS: Segment[] = [
  t("I have forwarded your message to "),
  e(0),
  t(" and "),
  e(1),
  t(" with the case "),
  e(2),
  t(". A confirmation will be sent to "),
  e(3),
  t(" and copied to "),
  e(4),
  t("."),
];

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

function renderCaption(text: string): ReactNode {
  return text.split(/(<<[^>]+>>)/g).map((part, i) =>
    part.startsWith("<<") ? <Token key={i}>{part}</Token> : <span key={i}>{part}</span>,
  );
}

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

function BoxLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors duration-500">
      {children}
    </p>
  );
}

function StaticBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <BoxLabel>{label}</BoxLabel>
      <p className="break-words font-mono text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function SwapBox({
  entities,
  segments,
  rawLabel,
  tokenLabel,
  startAsToken,
}: {
  entities: Entity[];
  segments: Segment[];
  rawLabel: string;
  tokenLabel: string;
  startAsToken: boolean;
}) {
  const n = entities.length;
  const [count, setCount] = useState(startAsToken ? n : 0);
  const [pulseIndex, setPulseIndex] = useState<number | null>(null);
  const [showingToken, setShowingToken] = useState(startAsToken);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    let cancelled = false;
    let token = startAsToken;

    async function loop() {
      while (!cancelled) {
        await sleep(HOLD_MS);
        if (cancelled) return;

        if (token) {
          for (let i = n - 1; i >= 0; i--) {
            if (cancelled) return;
            setPulseIndex(i);
            setCount(i);
            await sleep(STEP_MS);
          }
        } else {
          for (let i = 0; i < n; i++) {
            if (cancelled) return;
            setPulseIndex(i);
            setCount(i + 1);
            await sleep(STEP_MS);
          }
        }
        if (cancelled) return;
        token = !token;
        setShowingToken(token);
        setPulseIndex(null);
      }
    }

    loop();
    return () => {
      cancelled = true;
    };
  }, [n, startAsToken]);

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <BoxLabel>{showingToken ? tokenLabel : rawLabel}</BoxLabel>
      <p className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">
        {segments.map((seg, i) => {
          if (seg.kind === "text") return <span key={i}>{seg.value}</span>;
          const entity = entities[seg.index];
          const anonymized = seg.index < count;
          const pulsing = pulseIndex === seg.index;
          const base =
            "inline-block rounded px-1 transition-all duration-500 ease-in-out";
          const colors = anonymized
            ? "bg-primary/10 text-primary"
            : "bg-amber-500/15 text-amber-700 dark:text-amber-300";
          const pulse = pulsing ? "scale-[1.04] ring-1 ring-primary/40" : "scale-100";
          return (
            <span key={i} className={`${base} ${colors} ${pulse}`}>
              {anonymized ? entity.placeholder : entity.raw}
            </span>
          );
        })}
      </p>
    </div>
  );
}

export function HowItWorks() {
  const { t: tr } = useT();
  const hw = tr.howItWorks;
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

        <div className="relative mt-6 flex min-h-[24rem] flex-col justify-center">
          <TabsContent value="detect" className="space-y-4">
            <StaticBox label={hw.labels.userMessage}>
              Hi, this is <Pii>Patrick Dupont</Pii>. Could you forward this to{" "}
              <Pii>Marie Lambert</Pii> and <Pii>Jean Moreau</Pii>? My email is{" "}
              <Pii>patrick.dupont@acme.com</Pii>, and you can also cc{" "}
              <Pii>marie.lambert@acme.com</Pii>. The case ID is{" "}
              <Pii>#ACME-9123</Pii>.
            </StaticBox>
            <p className="text-sm text-muted-foreground">{hw.detectCaption}</p>
          </TabsContent>

          <TabsContent value="anonymize" className="space-y-4">
            <SwapBox
              entities={ANONYMIZE_ENTITIES}
              segments={ANONYMIZE_SEGMENTS}
              rawLabel={hw.labels.fromUser}
              tokenLabel={hw.labels.llmSees}
              startAsToken={false}
            />
            <p className="text-sm text-muted-foreground">
              {renderCaption(hw.anonymizeCaption)}
            </p>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <SwapBox
              entities={TOOLS_ENTITIES}
              segments={TOOLS_SEGMENTS}
              rawLabel={hw.labels.toolRuns}
              tokenLabel={hw.labels.toolCall}
              startAsToken={true}
            />
            <p className="text-sm text-muted-foreground">
              {renderCaption(hw.toolsCaption)}
            </p>
          </TabsContent>

          <TabsContent value="deanonymize" className="space-y-4">
            <SwapBox
              entities={DEANONYMIZE_ENTITIES}
              segments={DEANONYMIZE_SEGMENTS}
              rawLabel={hw.labels.userSees}
              tokenLabel={hw.labels.llmResponse}
              startAsToken={true}
            />
            <p className="text-sm text-muted-foreground">
              {renderCaption(hw.deanonymizeCaption)}
            </p>
          </TabsContent>
        </div>
      </Tabs>
    </Section>
  );
}
