"use client";

import { toSegments, type Entity } from "@/lib/ner";
import { labelStyle } from "@/lib/labels";

export function EntityHighlight({
  text,
  entities,
  colors,
}: {
  text: string;
  entities: Entity[];
  colors: Map<string, string>;
}) {
  const segments = toSegments(text, entities);

  return (
    <p className="leading-relaxed whitespace-pre-wrap">
      {segments.map((seg, i) =>
        seg.entity ? (
          <span
            key={i}
            className={`rounded px-1 ${colors.get(seg.entity.label) ?? labelStyle(seg.entity.label)}`}
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
