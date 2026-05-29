"use client";

import { toSegments, type Entity } from "@/lib/ner";

const LABEL_STYLES: Record<string, string> = {
  PER: "bg-primary/10 text-primary",
  ORG: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  LOC: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  MISC: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
};

/** Tailwind classes (background + text color) for an entity label. */
export function labelStyle(label: string): string {
  return LABEL_STYLES[label] ?? "bg-muted text-foreground";
}

export function EntityHighlight({ text, entities }: { text: string; entities: Entity[] }) {
  const segments = toSegments(text, entities);

  return (
    <p className="leading-relaxed whitespace-pre-wrap">
      {segments.map((seg, i) =>
        seg.entity ? (
          <span
            key={i}
            className={`rounded px-1 ${labelStyle(seg.entity.label)}`}
            title={`${seg.entity.label} (${(seg.entity.score * 100).toFixed(0)}%)`}
          >
            {seg.value}
          </span>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </p>
  );
}
