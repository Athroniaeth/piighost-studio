"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityHighlight, labelStyle } from "@/components/playground/entity-highlight";
import { loadNer, runNer, type Entity, type ModelId, type ProgressEvent } from "@/lib/ner";
import { useT } from "@/i18n/use-t";

type Status = "idle" | "loading" | "analyzing" | "done" | "error";

const MODELS: { id: ModelId; key: "multilingual" | "english" }[] = [
  { id: "Xenova/bert-base-multilingual-cased-ner-hrl", key: "multilingual" },
  { id: "Xenova/bert-base-NER", key: "english" },
];

const LABELS = ["PER", "ORG", "LOC", "MISC"] as const;

function LabelTag({ label }: { label: string }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${labelStyle(label)}`}>
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
  const [model, setModel] = useState<ModelId>(MODELS[0].id);
  const [text, setText] = useState(pg.example);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [allEntities, setAllEntities] = useState<Entity[]>([]);
  const [analyzed, setAnalyzed] = useState("");
  const [threshold, setThreshold] = useState(0.5);
  const [allowed, setAllowed] = useState<Record<string, boolean>>(
    Object.fromEntries(LABELS.map((l) => [l, true])),
  );

  // Threshold and label filters apply live, without re-running the model.
  const entities = useMemo(
    () => allEntities.filter((e) => allowed[e.label] !== false && e.score >= threshold),
    [allEntities, allowed, threshold],
  );

  const selectedModel = MODELS.find((m) => m.id === model) ?? MODELS[0];
  const busy = status === "loading" || status === "analyzing";

  async function analyze() {
    try {
      setStatus("loading");
      setProgress(0);
      await loadNer(model, (e: ProgressEvent) => {
        if (e.status === "progress" && typeof e.progress === "number") {
          setProgress(Math.round(e.progress));
        }
      });
      setStatus("analyzing");
      const result = await runNer(model, text);
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
      {/* One unified surface filling the window; the four stages are separated
          by internal dividers. The two text columns are wider than the
          configuration and entities columns. */}
      <div className="grid flex-1 divide-y divide-border overflow-hidden rounded-xl border bg-card shadow-sm lg:min-h-0 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,0.9fr)] lg:divide-x lg:divide-y-0">
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
                onChange={(e) => setModel(e.target.value as ModelId)}
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">{pg.models[selectedModel.key]}</p>
            </div>

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
                    <LabelTag label={l} />
                  </label>
                ))}
              </div>
            </div>

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
              disabled={busy || text.trim().length === 0}
            >
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              {buttonLabel}
            </Button>
          </div>
        </Region>

        {/* 2. Input */}
        <Region title={pg.inputLabel}>
          <textarea
            className="min-h-48 w-full flex-1 resize-none rounded-lg border bg-background p-3 text-sm"
            value={text}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="mt-2 shrink-0 text-xs text-muted-foreground">{pg.firstLoadNote}</p>
        </Region>

        {/* 3. Output */}
        <Region title={pg.outputTitle}>
          {status === "error" ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{pg.errorTitle}</p>
              <Button variant="outline" size="sm" onClick={analyze}>
                {pg.retry}
              </Button>
            </div>
          ) : status === "done" ? (
            <EntityHighlight text={analyzed} entities={entities} />
          ) : (
            <p className="text-sm text-muted-foreground">{pg.emptyHint}</p>
          )}
        </Region>

        {/* 4. Entities */}
        <Region title={pg.resultsTitle}>
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
                    <LabelTag label={e.label} />
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
