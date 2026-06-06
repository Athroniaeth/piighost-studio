// src/components/playground/field-label.tsx

/** Shared class for the pipeline-stage <select> controls (monospace). */
export const STAGE_SELECT =
  "w-full rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs";

/** A config-column field label with an optional "?" help tooltip. */
export function FieldLabel({ label, help }: { label: string; help?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {help && (
        <span
          title={help}
          className="inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full border text-[0.625rem] text-muted-foreground"
        >
          ?
        </span>
      )}
    </div>
  );
}
