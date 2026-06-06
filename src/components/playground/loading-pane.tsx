// src/components/playground/loading-pane.tsx
import { Loader2 } from "lucide-react";

/**
 * Centered model/runtime download pane. Pass a 0-100 number for a determinate
 * bar (transformers download), or null for an indeterminate pulse (GLiNER, or
 * the pipeline runtime warm-up which has no byte total).
 */
export function LoadingPane({
  progress,
  message,
  note,
}: {
  progress: number | null;
  message: string;
  note?: string;
}) {
  return (
    <div className="flex min-h-32 flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-background p-6 text-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
      <p className="text-sm font-medium">{message}</p>
      <div className="h-2 w-64 max-w-full overflow-hidden rounded-full bg-muted">
        {progress === null ? (
          <div className="h-full w-full animate-pulse rounded-full bg-primary/60" />
        ) : (
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        )}
      </div>
      {progress !== null && (
        <p className="text-xs tabular-nums text-muted-foreground">{progress}%</p>
      )}
      {note && <p className="max-w-xs text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
