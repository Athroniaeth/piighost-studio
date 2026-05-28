"use client";

import { useEffect, useState } from "react";

type Entity = { raw: string; placeholder: string };
type Segment = { kind: "text"; value: string } | { kind: "entity"; index: number };

const ENTITIES: Entity[] = [
  { raw: "Patrick Dupont", placeholder: "<<PERSON:1>>" },
  { raw: "Acme Corp", placeholder: "<<ORG:1>>" },
  { raw: "#ACME-9123", placeholder: "<<ID:1>>" },
  { raw: "12 rue de la Paix", placeholder: "<<ADDRESS:1>>" },
  { raw: "Paris", placeholder: "<<LOCATION:1>>" },
  { raw: "patrick.dupont@acme.com", placeholder: "<<EMAIL:1>>" },
  { raw: "+33 6 12 34 56 78", placeholder: "<<PHONE:1>>" },
];

const SEGMENTS: Segment[] = [
  { kind: "text", value: "Hi, this is " },
  { kind: "entity", index: 0 },
  { kind: "text", value: " from " },
  { kind: "entity", index: 1 },
  { kind: "text", value: ". My order " },
  { kind: "entity", index: 2 },
  { kind: "text", value: " should be delivered to " },
  { kind: "entity", index: 3 },
  { kind: "text", value: ", " },
  { kind: "entity", index: 4 },
  { kind: "text", value: ". You can reach me by email at " },
  { kind: "entity", index: 5 },
  { kind: "text", value: " or by phone at " },
  { kind: "entity", index: 6 },
  { kind: "text", value: "." },
];

const STEP_MS = 650;
const HOLD_MS = 1500;

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

export function AnonymizeFlow() {
  const [count, setCount] = useState(0);
  const [pulseIndex, setPulseIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loop() {
      while (!cancelled) {
        await sleep(HOLD_MS);
        if (cancelled) return;

        for (let i = 0; i < ENTITIES.length; i++) {
          if (cancelled) return;
          setPulseIndex(i);
          setCount(i + 1);
          await sleep(STEP_MS);
        }
        setPulseIndex(null);
        if (cancelled) return;
        await sleep(HOLD_MS);
        if (cancelled) return;

        for (let i = ENTITIES.length - 1; i >= 0; i--) {
          if (cancelled) return;
          setPulseIndex(i);
          setCount(i);
          await sleep(STEP_MS);
        }
        setPulseIndex(null);
      }
    }

    loop();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
      <p className="font-mono text-base leading-relaxed sm:text-lg">
        {SEGMENTS.map((seg, i) => {
          if (seg.kind === "text") return <span key={i}>{seg.value}</span>;
          const entity = ENTITIES[seg.index];
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
