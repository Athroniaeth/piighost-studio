// src/components/playground/step-chip.tsx
import { Check } from "lucide-react";

/** Numbered step glyph used in Region headers; swaps to a check when done. */
export function StepChip({ n, done = false }: { n: number; done?: boolean }) {
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-xs font-semibold tabular-nums text-primary">
      {done ? <Check className="size-3" aria-hidden /> : n}
    </span>
  );
}
