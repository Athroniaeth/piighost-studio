// src/components/playground/region.tsx
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { StepChip } from "./step-chip";

/**
 * One column of the workbench card. Shared by both playground pages so every
 * region has the same header grammar: numbered step chip, uppercase title, an
 * optional action on the right, then a scrollable body.
 */
export function Region({
  step,
  stepDone = false,
  title,
  action,
  bodyClassName,
  children,
}: {
  step?: number;
  stepDone?: boolean;
  title: string;
  action?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-col overflow-auto p-4">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {step != null && <StepChip n={step} done={stepDone} />}
          {title}
        </h2>
        {action}
      </div>
      <div className={cn("flex min-h-0 flex-1 flex-col", bodyClassName)}>{children}</div>
    </section>
  );
}
