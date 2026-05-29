"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityHighlight } from "@/components/playground/entity-highlight";
import { loadNer, runNer, type Entity, type ModelId, type ProgressEvent } from "@/lib/ner";
import { loadGliner, runGliner, type GlinerModelId } from "@/lib/gliner";
import { parseLabels, assignLabelColors, labelStyle } from "@/lib/labels";
import { useT } from "@/i18n/use-t";

type Status = "idle" | "loading" | "analyzing" | "done" | "error";

type ModelEntry = {
  id: ModelId | GlinerModelId;
  family: "classic" | "gliner";
  descKey: "multilingual" | "english" | "glinerSmall" | "glinerPii";
  defaultLabels?: string;
};

const MODELS: ModelEntry[] = [
  { id: "Xenova/bert-base-multilingual-cased-ner-hrl", family: "classic", descKey: "multilingual" },
  { id: "Xenova/bert-base-NER", family: "classic", descKey: "english" },
  {
    id: "onnx-community/gliner_small-v2.1",
    family: "gliner",
    descKey: "glinerSmall",
    defaultLabels: "person, organization, location, date",
  },
  {
    id: "onnx-community/gliner_multi_pii-v1",
    family: "gliner",
    descKey: "glinerPii",
    defaultLabels: "person, email, phone number, address, organization",
  },
];

const LABELS = ["PER", "ORG", "LOC", "MISC"] as const;

function LabelTag({ label, className }: { label: string; className: string }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function Region({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex min-h-0 flex-col overflow-auto p-5">
      <h2 className="mb-4 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

export function NerPlayground() {
  const { t } = useT();
  const pg = t.playground;
  const [model, setModel] = useState<ModelId | GlinerModelId>(MODELS[0].id);
  const [text, setText] = useState(pg.example);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [allEntities, setAllEntities] = useState<Entity[]>([]);
  const [analyzed, setAnalyzed] = useState("");
  const [threshold, setThreshold] = useState(0.5);
  const [allowed, setAllowed] = useState<Record<string, boolean>>(
    Object.fromEntries(LABELS.map((l) => [l, true])),
  );
  const [glinerLabels, setGlinerLabels] = useState(
    MODELS.find((m) => m.id === model)?.defaultLabels ?? "",
  );
  // Wall-clock of the last inference (the run, not the model download), in ms.
  const [durationMs, setDurationMs] = useState<number | null>(null);

  // Threshold and label filters apply live, without re-running the model.
  const entities = useMemo(
    () => allEntities.filter((e) => allowed[e.label] !== false && e.score >= threshold),
    [allEntities, allowed, threshold],
  );

  // Colors are assigned per distinct label from the full result, so they stay
  // stable while the threshold filters entities in and out.
  const colors = useMemo(
    () => assignLabelColors(allEntities.map((e) => e.label)),
    [allEntities],
  );

  const selectedModel = MODELS.find((m) => m.id === model) ?? MODELS[0];
  const isGliner = selectedModel.family === "gliner";
  const busy = status === "loading" || status === "analyzing";

  async function analyze() {
    try {
      setStatus("loading");
      setProgress(0);
      setDurationMs(null);
      let result: Entity[];
      let started: number;
      if (selectedModel.family === "gliner") {
        const gid = model as GlinerModelId;
        await loadGliner(gid);
        setStatus("analyzing");
        started = performance.now();
        result = await runGliner(gid, parseLabels(glinerLabels), text);
      } else {
        const cid = model as ModelId;
        await loadNer(cid, (e: ProgressEvent) => {
          if (e.status === "progress" && typeof e.progress === "number") {
            setProgress(Math.round(e.progress));
          }
        });
        setStatus("analyzing");
        started = performance.now();
        result = await runNer(cid, text);
      }
      // Time only the inference, not the one-time model download.
      setDurationMs(performance.now() - started);
      setAllEntities(result);
      setAnalyzed(text);
      setStatus("done");
    } catch (err) {
      console.error("NER playground failed", err);
      setStatus("error");
    }
  }

  const buttonLabel =
    status === "loading"
      ? `${pg.loadingModel} ${progress > 0 ? `${progress}%` : ""}`.trim()
      : status === "analyzing"
        ? pg.analyzing
        : pg.analyze;

  return (
    <div className="flex w-full flex-col p-4 lg:h-[calc(100dvh-4rem)]">
      {/* One unified surface filling the window; the three stages are separated
          by internal dividers. The text column is the widest — it holds both
          the editable input and, once analyzed, the highlighted result. */}
      <div className="grid flex-1 divide-y divide-border overflow-hidden rounded-xl border bg-card shadow-sm lg:min-h-0 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)_minmax(0,0.9fr)] lg:divide-x lg:divide-y-0">
        {/* 1. Configuration */}
        <Region title={pg.configTitle}>
          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="ner-model">
                {pg.modelLabel}
              </label>
              <select
                id="ner-model"
                className="w-full rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs"
                value={model}
                disabled={busy}
                // value is constrained to the option elements rendered below
                onChange={(e) => {
                  const next = e.target.value as ModelId | GlinerModelId;
                  setModel(next);
                  const entry = MODELS.find((m) => m.id === next);
                  setGlinerLabels(entry?.defaultLabels ?? "");
                  // A different model can't have produced the showing results.
                  setAllEntities([]);
                  setAnalyzed("");
                  setDurationMs(null);
                  setStatus("idle");
                }}
              >
                <optgroup label={pg.modelGroups.classic}>
                  {MODELS.filter((m) => m.family === "classic").map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={pg.modelGroups.gliner}>
                  {MODELS.filter((m) => m.family === "gliner").map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id}
                    </option>
                  ))}
                </optgroup>
              </select>
              <p className="text-xs text-muted-foreground">{pg.models[selectedModel.descKey]}</p>
            </div>

            {isGliner ? (
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="gliner-labels">
                  {pg.glinerLabelsLabel}
                </label>
                <textarea
                  id="gliner-labels"
                  className="min-h-20 w-full resize-none rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs"
                  value={glinerLabels}
                  disabled={busy}
                  placeholder={pg.glinerLabelsPlaceholder}
                  onChange={(e) => setGlinerLabels(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{pg.glinerLabelsHint}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium">{pg.labelsLabel}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {LABELS.map((l) => (
                    <label key={l} className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={allowed[l] !== false}
                        onChange={(e) => setAllowed((prev) => ({ ...prev, [l]: e.target.checked }))}
                      />
                      <LabelTag label={l} className={labelStyle(l)} />
                    </label>
                  ))}
                </div>
              </div>
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
              onClick={analyze}
              disabled={
                busy ||
                text.trim().length === 0 ||
                (isGliner && parseLabels(glinerLabels).length === 0)
              }
            >
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              {buttonLabel}
            </Button>
          </div>
        </Region>

        {/* 2. Text — editable input, or the highlighted result once analyzed.
            Clicking the highlighted text (or the Edit button) returns to the
            editable textarea and clears the highlights until the next run. */}
        <Region title={pg.inputLabel}>
          {status === "error" ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{pg.errorTitle}</p>
              <Button variant="outline" size="sm" onClick={analyze}>
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

        {/* 3. Entities */}
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
            <ul className="space-y-2">
              {entities.map((e, i) => (
                <li
                  key={`${e.start}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <LabelTag label={e.label} className={colors.get(e.label) ?? labelStyle(e.label)} />
                    <span className="truncate font-mono text-sm">{e.text}</span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {(e.score * 100).toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Region>
      </div>
    </div>
  );
}
