// src/components/playground/entity-row.tsx
import { labelStyle } from "@/lib/labels";

/** One detected entity: colored label + monospace surface text + score. */
export function EntityRow({
  label,
  text,
  score,
  colors,
}: {
  label: string;
  text: string;
  score: number;
  colors: Map<string, string>;
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2">
      <div className="flex items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-medium ${colors.get(label) ?? labelStyle(label)}`}
        >
          {label}
        </span>
        <span className="whitespace-nowrap font-mono text-sm">{text}</span>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {(score * 100).toFixed(0)}%
      </span>
    </li>
  );
}
