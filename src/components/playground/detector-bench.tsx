"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityHighlight } from "@/components/playground/entity-highlight";
import { type Entity, type ModelId, sortEntities, type EntitySort } from "@/lib/ner";
import { type GlinerModelId } from "@/lib/gliner";
import { assignLabelColors, labelStyle, parseLabels } from "@/lib/labels";
import {
  runDetector,
  RUNNABLE,
  defaultConfig,
  type DetectorConfig,
  type DetectorType,
} from "@/lib/detector-config";
import { useT } from "@/i18n/use-t";

type Status = "idle" | "running" | "done" | "error";

const CLASSIC_MODELS: ModelId[] = [
  "Xenova/bert-base-multilingual-cased-ner-hrl",
  "Xenova/bert-base-NER",
];
const GLINER_MODELS: GlinerModelId[] = [
  "onnx-community/gliner_small-v2.1",
  "onnx-community/gliner_multi_pii-v1",
];
const DETECTOR_TYPES: DetectorType[] = ["regex", "transformers", "gliner2", "llm"];

/** Serialize a regex config's patterns to the "LABEL = regex" textarea form. */
function patternsToText(patterns: Record<string, string>): string {
  return Object.entries(patterns)
    .map(([label, pat]) => `${label} = ${pat}`)
    .join("\n");
}
/** Parse the "LABEL = regex" textarea back into a patterns record. */
function textToPatterns(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const i = line.indexOf("=");
    if (i === -1) continue;
    const label = line.slice(0, i).trim();
    const pat = line.slice(i + 1).trim();
    if (label && pat) out[label] = pat;
  }
  return out;
}

export function DetectorBench({
  config,
  onChange,
  onValidate,
}: {
  config: DetectorConfig;
  onChange: (next: DetectorConfig) => void;
  onValidate: () => void;
}) {
  const { t } = useT();
  const pg = t.playground;
  const [text, setText] = useState(pg.example);
  const [status, setStatus] = useState<Status>("idle");
  const [allEntities, setAllEntities] = useState<Entity[]>([]);
  const [analyzed, setAnalyzed] = useState("");
  const [threshold, setThreshold] = useState(0.5);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [sort, setSort] = useState<EntitySort>("appearance");

  const entities = useMemo(
    () => allEntities.filter((e) => e.score >= threshold),
    [allEntities, threshold],
  );
  const colors = useMemo(() => assignLabelColors(allEntities.map((e) => e.label)), [allEntities]);
  const sortedEntities = useMemo(() => sortEntities(entities, sort), [entities, sort]);

  const runnable = RUNNABLE[config.type];
  const busy = status === "running";

  async function test() {
    try {
      setStatus("running");
      setDurationMs(null);
      const started = performance.now();
      const result = await runDetector(config, text);
      setDurationMs(performance.now() - started);
      setAllEntities(result);
      setAnalyzed(text);
      setStatus("done");
    } catch (err) {
      console.error("detector test failed", err);
      setStatus("error");
    }
  }

  return (
    <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      {/* Left: detector configuration */}
      <section className="space-y-4 overflow-auto p-1">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{pg.detectorType}</label>
          <select
            className="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs"
            value={config.type}
            onChange={(e) => onChange(defaultConfig(e.target.value as DetectorType))}
          >
            {DETECTOR_TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {pg.detectorTypes[ty]}
              </option>
            ))}
          </select>
        </div>

        {config.type === "regex" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{pg.patternsLabel}</label>
            <textarea
              className="min-h-32 w-full resize-none rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs"
              value={patternsToText(config.patterns)}
              onChange={(e) => onChange({ ...config, patterns: textToPatterns(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">{pg.patternsHint}</p>
          </div>
        )}

        {config.type === "transformers" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{pg.modelLabel}</label>
            <select
              className="w-full rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs"
              value={config.model}
              onChange={(e) => onChange({ ...config, model: e.target.value as ModelId })}
            >
              {CLASSIC_MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {config.type === "gliner2" && (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{pg.modelLabel}</label>
              <select
                className="w-full rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs"
                value={config.model}
                onChange={(e) => onChange({ ...config, model: e.target.value as GlinerModelId })}
              >
                {GLINER_MODELS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{pg.glinerLabelsLabel}</label>
              <textarea
                className="min-h-20 w-full resize-none rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs"
                value={config.labels.join(", ")}
                placeholder={pg.glinerLabelsPlaceholder}
                onChange={(e) => onChange({ ...config, labels: parseLabels(e.target.value) })}
              />
            </div>
          </>
        )}

        {config.type === "llm" && (
          <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            {pg.llmDeploymentNote}
          </p>
        )}

        <div className="flex gap-2">
          <Button onClick={test} disabled={busy || !runnable || text.trim().length === 0}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            {pg.test}
          </Button>
          <Button variant="outline" onClick={onValidate}>
            {pg.validate}
          </Button>
        </div>
      </section>

      {/* Right: text + results (reused from the phase-1 bench) */}
      <section className="flex min-h-0 flex-col gap-3 overflow-auto p-1">
        {status === "done" ? (
          <div className="rounded-lg border bg-background p-3 text-sm">
            <EntityHighlight text={analyzed} entities={entities} colors={colors} />
          </div>
        ) : (
          <textarea
            className="min-h-32 w-full resize-none rounded-lg border bg-background p-3 text-sm"
            value={text}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
          />
        )}

        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{pg.thresholdLabel}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-40 accent-primary"
            aria-label={pg.thresholdLabel}
          />
        </div>

        {status === "error" && <p className="text-sm text-destructive">{pg.errorTitle}</p>}

        {status === "done" && (
          <>
            {durationMs !== null && (
              <p className="text-xs text-muted-foreground">
                {pg.inferenceTime}: {Math.round(durationMs)} ms · ~
                {(1000 / durationMs).toFixed(1)} {pg.reqPerSecond}
              </p>
            )}
            {entities.length === 0 ? (
              <p className="text-sm text-muted-foreground">{pg.noEntities}</p>
            ) : (
              <ul className="space-y-2">
                {sortedEntities.map((e, i) => (
                  <li
                    key={`${e.start}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${colors.get(e.label) ?? labelStyle(e.label)}`}
                      >
                        {e.label}
                      </span>
                      <span className="truncate font-mono text-sm">{e.text}</span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {(e.score * 100).toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
