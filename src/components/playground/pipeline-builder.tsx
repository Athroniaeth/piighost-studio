"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { DetectorBench } from "@/components/playground/detector-bench";
import { defaultConfig, defaultPipeline, type DetectorConfig, type ConfigPipeline } from "@/lib/detector-config";
import { toToml, toPython } from "@/lib/pipeline-export";
import { useT } from "@/i18n/use-t";

/** Read-only code box with a copy button (CodeBlock is an async server
 *  component and cannot render inside this client component). */
function ExportBox({ title, code }: { title: string; code: string }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="group relative overflow-hidden rounded-lg border bg-muted/30">
        <CopyButton value={code} />
        <pre className="overflow-x-auto p-4 font-mono text-xs">{code}</pre>
      </div>
    </div>
  );
}

export function PipelineBuilder() {
  const { t } = useT();
  const pg = t.playground;
  const [name, setName] = useState("my-pipeline");
  const [detectors, setDetectors] = useState<DetectorConfig[]>([]);
  const [draft, setDraft] = useState<DetectorConfig>(defaultConfig("regex"));
  const [showExport, setShowExport] = useState(false);

  const base = defaultPipeline();
  const pipeline: ConfigPipeline = {
    ...base,
    name,
    detectors: detectors.map((config) => ({ name: config.type, config, enabled: true })),
  };

  function validate() {
    setDetectors((prev) => [...prev, draft]);
  }
  function remove(index: number) {
    setDetectors((prev) => prev.filter((_, i) => i !== index));
  }
  function move(index: number, delta: number) {
    setDetectors((prev) => {
      const next = [...prev];
      const j = index + delta;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  return (
    <div className="flex w-full flex-col gap-4 p-4 lg:h-[calc(100dvh-4rem)]">
      <div className="grid flex-1 gap-4 overflow-hidden lg:min-h-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2.4fr)]">
        {/* Left: pipeline list + export */}
        <section className="flex min-h-0 flex-col gap-3 overflow-auto rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {pg.pipelineTitle}
          </h2>

          <input
            className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm"
            value={name}
            aria-label={pg.pipelineNameLabel}
            onChange={(e) => setName(e.target.value)}
          />

          {detectors.length === 0 ? (
            <p className="text-sm text-muted-foreground">{pg.emptyPipeline}</p>
          ) : (
            <ol className="space-y-2">
              {detectors.map((d, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2 text-sm"
                >
                  <span className="truncate">
                    {i + 1}. {pg.detectorTypes[d.type]}
                  </span>
                  <span className="flex shrink-0 gap-2 text-muted-foreground">
                    <button type="button" className="text-xs" onClick={() => move(i, -1)} title={pg.moveUp}>
                      ↑
                    </button>
                    <button type="button" className="text-xs" onClick={() => move(i, 1)} title={pg.moveDown}>
                      ↓
                    </button>
                    <button type="button" className="text-xs text-destructive" onClick={() => remove(i)} title={pg.remove}>
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          )}

          <Button
            variant="outline"
            className="mt-auto"
            disabled={detectors.length === 0}
            onClick={() => setShowExport((s) => !s)}
          >
            {pg.exportTitle}
          </Button>
        </section>

        {/* Right: detector bench */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card p-4 shadow-sm">
          <DetectorBench config={draft} onChange={setDraft} onValidate={validate} />
        </section>
      </div>

      {showExport && detectors.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ExportBox title={pg.exportToml} code={toToml(pipeline)} />
          <ExportBox title={pg.exportPython} code={toPython(pipeline)} />
        </div>
      )}
    </div>
  );
}
