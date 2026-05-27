"use client";

import { useEffect, useState } from "react";
import { DEMO, renderStep } from "@/lib/anonymize-demo";

export function AnonymizeFlow() {
  const [step, setStep] = useState(0);
  const max = DEMO.entities.length;

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s >= max + 1 ? 0 : s + 1)), 1400);
    return () => clearInterval(id);
  }, [max]);

  const shown = renderStep(DEMO, step);
  const labels = ["User input", "Detecting...", "Anonymized", "Sent to LLM"];
  const label = labels[Math.min(step, labels.length - 1)];

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="font-mono text-base sm:text-lg">
        {shown.split(/(<<[^>]+>>)/g).map((part, i) =>
          part.startsWith("<<") ? (
            <span key={i} className="rounded bg-primary/10 px-1 text-primary">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </p>
    </div>
  );
}
