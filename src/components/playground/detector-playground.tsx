"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityHighlight } from "@/components/playground/entity-highlight";
import { PlaygroundTabs } from "@/components/playground/playground-tabs";
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
import {
  loadSaved,
  saveDetector,
  deleteSaved,
  type SavedDetector,
} from "@/lib/saved-detectors";
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

function Region({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex min-h-0 flex-col overflow-auto p-4">
      <h2 className="mb-3 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

export function DetectorPlayground() {
  const { t } = useT();
  const pg = t.playground;
  const [config, setConfig] = useState<DetectorConfig>(defaultConfig("gliner2"));
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<SavedDetector[]>([]);

  const [text, setText] = useState(pg.example);
  const [status, setStatus] = useState<Status>("idle");
  const [allEntities, setAllEntities] = useState<Entity[]>([]);
  const [analyzed, setAnalyzed] = useState("");
  const [threshold, setThreshold] = useState(0.5);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [sort, setSort] = useState<EntitySort>("appearance");

  useEffect(() => {
    const list = loadSaved();
    const edit = new URLSearchParams(window.location.search).get("edit");
    const found = edit ? list.find((d) => d.name === edit) : undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(list);
    if (found) {
      setConfig(found.config);
      setName(found.name);
    }
  }, []);

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

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaved(saveDetector(trimmed, config));
  }

  return (
    <div className="mx-auto flex w-full max-w-[79rem] flex-col p-4 pb-8 lg:h-[calc(100dvh-4rem)]">
      <PlaygroundTabs />
      <div className="grid flex-1 gap-4 overflow-hidden lg:min-h-0 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,3.6fr)]">
        {/* Saved-detectors library — deliberately set apart (dashed, muted) from
            the playground itself: it is browser-stored persistence, not the test
            surface. Holds the save form and the saved list. */}
        <aside className="flex min-h-0 flex-col gap-4 overflow-auto rounded-xl border border-dashed bg-muted/30 p-4">
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {pg.savedDetectors}
            </h2>
            <input
              className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm"
              placeholder={pg.detectorName}
              aria-label={pg.detectorName}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button className="w-full" onClick={save} disabled={name.trim().length === 0}>
              {pg.saveDetector}
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            {saved.length === 0 ? (
              <p className="text-sm text-muted-foreground">{pg.noSaved}</p>
            ) : (
              <ul className="space-y-2">
                {saved.map((d) => (
                  <li key={d.name} className="rounded-md border bg-background p-2 text-sm">
                    <p className="truncate font-mono">{d.name}</p>
                    <p className="mb-1 text-xs text-muted-foreground">{pg.detectorTypes[d.config.type]}</p>
                    <span className="flex gap-3">
                      <button
                        type="button"
                        className="text-xs text-muted-foreground"
                        onClick={() => {
                          setConfig(d.config);
                          setName(d.name);
                        }}
                      >
                        {pg.loadLabel}
                      </button>
                      <button
                        type="button"
                        className="text-xs text-destructive"
                        onClick={() => setSaved(deleteSaved(d.name))}
                      >
                        {pg.deleteLabel}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* The playground itself: one unified panel, Config | Text | Detections. */}
        <div className="grid divide-y divide-border overflow-hidden rounded-xl border bg-card shadow-sm lg:min-h-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2fr)_minmax(0,0.9fr)] lg:divide-x lg:divide-y-0">
        {/* 3. Configuration */}
        <Region title={pg.configTitle}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{pg.detectorType}</label>
              <select
                className="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs"
                value={config.type}
                disabled={busy}
                onChange={(e) => setConfig(defaultConfig(e.target.value as DetectorType))}
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
                  className="min-h-28 w-full resize-none rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs"
                  value={patternsToText(config.patterns)}
                  disabled={busy}
                  onChange={(e) => setConfig({ ...config, patterns: textToPatterns(e.target.value) })}
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
                  disabled={busy}
                  onChange={(e) => setConfig({ ...config, model: e.target.value as ModelId })}
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
                    disabled={busy}
                    onChange={(e) => setConfig({ ...config, model: e.target.value as GlinerModelId })}
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
                    disabled={busy}
                    onChange={(e) => setConfig({ ...config, labels: parseLabels(e.target.value) })}
                  />
                </div>
              </>
            )}

            {config.type === "llm" && (
              <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                {pg.llmDeploymentNote}
              </p>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{pg.thresholdLabel}</span>
                <span className="text-muted-foreground">{threshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-primary"
                aria-label={pg.thresholdLabel}
              />
            </div>

            <Button
              className="w-full"
              onClick={test}
              disabled={busy || !runnable || text.trim().length === 0}
            >
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              {pg.test}
            </Button>
          </div>
        </Region>

        {/* 4. Text */}
        <Region title={pg.inputLabel}>
          {status === "error" ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{pg.errorTitle}</p>
              <Button variant="outline" size="sm" onClick={test}>
                {pg.retry}
              </Button>
            </div>
          ) : status === "done" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div
                role="button"
                tabIndex={0}
                title={pg.edit}
                onClick={() => setStatus("idle")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setStatus("idle");
                }}
                className="min-h-48 flex-1 cursor-text overflow-auto rounded-lg border bg-background p-3 text-sm"
              >
                <EntityHighlight text={analyzed} entities={entities} colors={colors} />
              </div>
              <div className="mt-2 flex shrink-0 justify-end">
                <Button variant="outline" size="sm" onClick={() => setStatus("idle")}>
                  {pg.edit}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <textarea
                className="min-h-48 w-full flex-1 resize-none rounded-lg border bg-background p-3 text-sm"
                value={text}
                disabled={busy}
                onChange={(e) => setText(e.target.value)}
              />
              <p className="mt-2 shrink-0 text-xs text-muted-foreground">{pg.firstLoadNote}</p>
            </>
          )}
        </Region>

        {/* 5. Detections */}
        <Region title={pg.resultsTitle}>
          {status === "done" && durationMs !== null && (
            <p className="mb-3 shrink-0 text-xs text-muted-foreground">
              {pg.inferenceTime}: {Math.round(durationMs)} ms · ~
              {(1000 / durationMs).toFixed(1)} {pg.reqPerSecond}
            </p>
          )}
          {status !== "done" ? (
            <p className="text-sm text-muted-foreground">{pg.emptyHint}</p>
          ) : entities.length === 0 ? (
            <p className="text-sm text-muted-foreground">{pg.noEntities}</p>
          ) : (
            <>
              <div className="mb-3 flex shrink-0 items-center gap-2">
                <label className="text-xs text-muted-foreground" htmlFor="bench-sort">
                  {pg.sortLabel}
                </label>
                <select
                  id="bench-sort"
                  className="rounded-md border bg-background px-2 py-1 text-xs"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as EntitySort)}
                >
                  <option value="appearance">{pg.sortByAppearance}</option>
                  <option value="scoreDesc">{pg.sortByScoreDesc}</option>
                  <option value="scoreAsc">{pg.sortByScoreAsc}</option>
                </select>
              </div>
              <ul className="space-y-2">
                {sortedEntities.map((e, i) => (
                  <li
                    key={`${e.start}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${colors.get(e.label) ?? labelStyle(e.label)}`}
                      >
                        {e.label}
                      </span>
                      <span className="truncate font-mono text-[0.8125rem]">{e.text}</span>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {(e.score * 100).toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Region>
        </div>
      </div>
    </div>
  );
}
