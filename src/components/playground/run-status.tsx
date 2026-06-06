// src/components/playground/run-status.tsx
import { Loader2 } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { RuntimeStage as RuntimeStageBase } from "@/lib/piighost-runtime";

type RuntimeStage = RuntimeStageBase | null;

/**
 * The single canonical status line both pages render at the end of their
 * CONFIGURE column. It owns every run note in a fixed order so the two pages
 * communicate progress, timing and caveats identically. Render it as a normal
 * shrink-0 flex child (never position:sticky: the column is min-h-0 overflow-auto
 * and a sticky footer clips there).
 */
export function RunStatus({
  pg,
  durationMs = null,
  loadingRuntime = false,
  runtimeStage = null,
  error = false,
  noEnabledDetectors = false,
  llm = false,
  stale = false,
  approximation = false,
}: {
  pg: Dictionary["playground"];
  durationMs?: number | null;
  loadingRuntime?: boolean;
  runtimeStage?: RuntimeStage;
  error?: boolean;
  noEnabledDetectors?: boolean;
  llm?: boolean;
  stale?: boolean;
  approximation?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
      {loadingRuntime && <span>{pg.loadingRuntime}</span>}
      {!loadingRuntime && (runtimeStage === "downloading" || runtimeStage === "installing") && (
        <span className="flex items-center gap-1.5">
          <Loader2 className="size-3 animate-spin" />
          {runtimeStage === "downloading" ? pg.runtimeDownloading : pg.runtimeInstalling}
        </span>
      )}
      {!loadingRuntime && runtimeStage === "ready" && durationMs === null && !error && (
        <span>{pg.runtimeReady}</span>
      )}
      {durationMs !== null && (
        <span>
          {pg.inferenceTime}: {Math.round(durationMs)} ms · ~
          {(1000 / durationMs).toFixed(1)} {pg.reqPerSecond}
        </span>
      )}
      {error && <span className="text-destructive">{pg.errorTitle}</span>}
      {noEnabledDetectors && <span>{pg.noEnabledDetectors}</span>}
      {llm && <span>{pg.llmDeploymentNote}</span>}
      {stale && <span className="text-amber-600">{pg.staleNote}</span>}
      {approximation && <span>{pg.approximationNote}</span>}
    </div>
  );
}
