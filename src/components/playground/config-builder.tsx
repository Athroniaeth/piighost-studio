"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import {
  defaultPipeline,
  defaultPlaceholder,
  PLACEHOLDER_TYPES,
  SPAN_RESOLVER_TYPES,
  ENTITY_LINKER_TYPES,
  ENTITY_RESOLVER_TYPES,
  type ConfigPipeline,
  type Placeholder,
  type PlaceholderType,
  type SpanResolverType,
  type EntityLinkerType,
  type EntityResolverType,
} from "@/lib/detector-config";
import { toToml, toPython } from "@/lib/pipeline-export";
import { loadSaved, type SavedDetector } from "@/lib/saved-detectors";
import { savePipeline } from "@/lib/saved-pipelines";
import { useT } from "@/i18n/use-t";
import { EntityHighlight } from "@/components/playground/entity-highlight";
import { PlaygroundTabs } from "@/components/playground/playground-tabs";
import { assignLabelColors, labelStyle } from "@/lib/labels";
import { runPipeline } from "@/lib/run-pipeline";
import { loadPiighostRuntime, type RuntimeStage } from "@/lib/piighost-runtime";
import type { AnonSegment, AssembleResult } from "@/lib/piighost-bridge";
import { Loader2 } from "lucide-react";
import type { Entity } from "@/lib/ner";

/** Indicative example of what each token style produces for a PERSON entity. */
function tokenExample(ph: Placeholder): string {
  switch (ph.type) {
    case "label_counter":
      return "<<PERSON:1>>";
    case "label_hash":
      return "<<PERSON:a1b2c3d4>>";
    case "label":
      return "<<PERSON>>";
    case "mask":
      return "M" + (ph.maskChar || "*").repeat(7);
    case "redact_counter":
      return "<<REDACT:1>>";
    case "redact_hash":
      return "<<REDACT:a1b2c3d4>>";
    case "redact":
      return "<<REDACT>>";
  }
}

/** A config-column field label with a "?" help tooltip. */
function FieldLabel({ label, help }: { label: string; help: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <span
        title={help}
        className="inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full border text-[10px] text-muted-foreground"
      >
        ?
      </span>
    </div>
  );
}

const STAGE_SELECT = "w-full rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs";

/** Centered modal dialog. */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl border bg-card p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button type="button" aria-label="Close" className="text-muted-foreground" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ExportBox({ code }: { code: string }) {
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-muted/30">
      <CopyButton value={code} />
      <pre className="overflow-x-auto p-4 font-mono text-xs">{code}</pre>
    </div>
  );
}

export function ConfigBuilder() {
  const { t } = useT();
  const pg = t.playground;
  const [pipeline, setPipeline] = useState<ConfigPipeline>(defaultPipeline());
  const [saved, setSaved] = useState<SavedDetector[]>([]);
  const [showExport, setShowExport] = useState(false);
  const [exportTab, setExportTab] = useState<"toml" | "python">("toml");
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [testText, setTestText] = useState(pg.example);
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "running" | "done" | "error">("idle");
  const [runtimeStage, setRuntimeStage] = useState<"cold" | RuntimeStage>("cold");
  const [testHighlights, setTestHighlights] = useState<Entity[]>([]);
  const [testRows, setTestRows] = useState<AssembleResult["entities"]>([]);
  const [testAnonSegments, setTestAnonSegments] = useState<AnonSegment[]>([]);
  const [testAnalyzed, setTestAnalyzed] = useState("");
  const [testSnapshot, setTestSnapshot] = useState("");
  const [testDurationMs, setTestDurationMs] = useState<number | null>(null);
  const [resultView, setResultView] = useState<"input" | "anonymized">("input");
  const testColors = useMemo(
    () => assignLabelColors(testHighlights.map((e) => e.label)),
    [testHighlights],
  );
  const hasEnabledDetector = pipeline.detectors.some((d) => d.enabled && d.config.type !== "llm");
  const hasEnabledLlm = pipeline.detectors.some((d) => d.enabled && d.config.type === "llm");
  // The shown result is stale if the pipeline or text changed since the run.
  const testStale =
    testStatus === "done" && testSnapshot !== JSON.stringify({ pipeline, text: testText });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(loadSaved());
  }, []);

  useEffect(() => {
    loadPiighostRuntime((stage) => setRuntimeStage(stage)).catch(() => {
      // Background warm-up failed (offline/CDN); stay cold. A click on Test will
      // retry and surface the error there.
      setRuntimeStage("cold");
    });
  }, []);

  const ph = pipeline.placeholder;

  function addDetector(name: string) {
    const found = saved.find((d) => d.name === name);
    if (!found) return;
    setPipeline((p) =>
      p.detectors.some((d) => d.name === name)
        ? p
        : { ...p, detectors: [...p.detectors, { name: found.name, config: found.config, enabled: true }] },
    );
  }
  function toggleDetector(i: number) {
    setPipeline((p) => ({
      ...p,
      detectors: p.detectors.map((d, j) => (j === i ? { ...d, enabled: !d.enabled } : d)),
    }));
  }
  function removeDetector(i: number) {
    setPipeline((p) => ({ ...p, detectors: p.detectors.filter((_, j) => j !== i) }));
  }
  function moveDetector(i: number, delta: number) {
    setPipeline((p) => {
      const next = [...p.detectors];
      const j = i + delta;
      if (j < 0 || j >= next.length) return p;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...p, detectors: next };
    });
  }

  function downloadToml() {
    const blob = new Blob([toToml(pipeline)], { type: "application/toml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pipeline.name.trim() || "pipeline"}.toml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function runTest() {
    try {
      setTestStatus("loading");
      await loadPiighostRuntime();
      setTestStatus("running");
      const started = performance.now();
      const result = await runPipeline(pipeline, testText);
      setTestDurationMs(performance.now() - started);
      setTestHighlights(
        result.highlights.map((h) => ({
          text: h.text,
          label: h.label,
          score: h.score,
          start: h.start,
          end: h.end,
        })),
      );
      setTestRows(result.entities);
      setTestAnonSegments(result.segments);
      setTestAnalyzed(testText);
      setTestSnapshot(JSON.stringify({ pipeline, text: testText }));
      setResultView("anonymized");
      setTestStatus("done");
    } catch (err) {
      console.error("pipeline test failed", err);
      setTestHighlights([]);
      setTestRows([]);
      setTestAnonSegments([]);
      setTestDurationMs(null);
      setTestStatus("error");
    }
  }

  function openSave() {
    setSaveName(pipeline.name);
    setShowSave(true);
  }
  function confirmSave() {
    const name = saveName.trim();
    if (!name) return;
    setPipeline((p) => ({ ...p, name }));
    savePipeline(name, { ...pipeline, name });
    setShowSave(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-[79rem] flex-col p-4 lg:h-[calc(100dvh-4rem)]">
      <PlaygroundTabs />
      {/* Unified panel — like the detector view: Configuration | Texte | Anonymisé | Entités. */}
      <div className="grid min-h-0 flex-1 divide-y divide-border overflow-hidden rounded-xl border bg-card shadow-sm lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2.4fr)_minmax(0,0.7fr)] lg:divide-x lg:divide-y-0">
        {/* Configuration — scrollable so future parameters can stack below. */}
        <section className="flex min-h-0 flex-col gap-4 overflow-auto p-4">
          <h2 className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {pg.configTitle}
          </h2>

          {/* Détecteurs */}
          <div className="space-y-2">
            <FieldLabel label={pg.detectorsTitle} help={pg.detectorsHelp} />
            <select
              className="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs"
              value=""
              onChange={(e) => {
                if (e.target.value) addDetector(e.target.value);
                e.currentTarget.selectedIndex = 0;
              }}
            >
              <option value="">{pg.addFromSaved}</option>
              {saved.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
            {pipeline.detectors.length === 0 ? (
              <p className="text-sm text-muted-foreground">{pg.emptyPipeline}</p>
            ) : (
              <ol className="space-y-2">
                {pipeline.detectors.map((d, i) => (
                  <li
                    key={d.name}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2 text-sm"
                  >
                    <label className="flex min-w-0 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={d.enabled}
                        onChange={() => toggleDetector(i)}
                      />
                      <span className="truncate font-mono">{d.name}</span>
                    </label>
                    <span className="flex shrink-0 gap-2 text-muted-foreground">
                      <button type="button" className="text-xs" onClick={() => moveDetector(i, -1)} title={pg.moveUp}>↑</button>
                      <button type="button" className="text-xs" onClick={() => moveDetector(i, 1)} title={pg.moveDown}>↓</button>
                      <Link className="text-xs" href={`/playground/detector?edit=${encodeURIComponent(d.name)}`}>{pg.editInPlayground}</Link>
                      <button type="button" className="text-xs text-destructive" onClick={() => removeDetector(i)} title={pg.remove}>✕</button>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Résolveur de spans */}
          <div className="space-y-1.5">
            <FieldLabel label={pg.spanResolverLabel} help={pg.spanResolverHelp} />
            <select
              className={STAGE_SELECT}
              value={pipeline.spanResolver}
              onChange={(e) => setPipeline((p) => ({ ...p, spanResolver: e.target.value as SpanResolverType }))}
            >
              {SPAN_RESOLVER_TYPES.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Lieur d'entités */}
          <div className="space-y-1.5">
            <FieldLabel label={pg.entityLinkerLabel} help={pg.entityLinkerHelp} />
            <select
              className={STAGE_SELECT}
              value={pipeline.entityLinker}
              onChange={(e) => setPipeline((p) => ({ ...p, entityLinker: e.target.value as EntityLinkerType }))}
            >
              {ENTITY_LINKER_TYPES.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Résolveur d'entités */}
          <div className="space-y-1.5">
            <FieldLabel label={pg.entityResolverLabel} help={pg.entityResolverHelp} />
            <select
              className={STAGE_SELECT}
              value={pipeline.entityResolver}
              onChange={(e) => setPipeline((p) => ({ ...p, entityResolver: e.target.value as EntityResolverType }))}
            >
              {ENTITY_RESOLVER_TYPES.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            {pipeline.entityResolver === "fuzzy" && (
              <label className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{pg.thresholdLabel}</span>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  className="w-20 rounded-md border bg-background px-2 py-1 text-xs"
                  value={pipeline.entityResolverThreshold}
                  onChange={(e) =>
                    setPipeline((p) => ({ ...p, entityResolverThreshold: Number(e.target.value) }))
                  }
                />
              </label>
            )}
          </div>

          {/* Anonymiseur */}
          <div className="space-y-1.5">
            <FieldLabel label={pg.anonymizerLabel} help={pg.anonymizerHelp} />
            <select
              className={STAGE_SELECT}
              value={ph.type}
              onChange={(e) =>
                setPipeline((p) => ({ ...p, placeholder: defaultPlaceholder(e.target.value as PlaceholderType) }))
              }
            >
              {PLACEHOLDER_TYPES.map((ty) => (
                <option key={ty} value={ty}>{ty}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {pg.tokenExample} :{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">{tokenExample(ph)}</code>
            </p>
            {(ph.type === "label_hash" || ph.type === "redact_hash") && (
              <label className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{pg.phHashLength}</span>
                <input
                  type="number"
                  min={4}
                  max={64}
                  className="w-20 rounded-md border bg-background px-2 py-1 text-xs"
                  value={ph.hashLength}
                  onChange={(e) =>
                    setPipeline((p) => ({ ...p, placeholder: { ...ph, hashLength: Number(e.target.value) } }))
                  }
                />
              </label>
            )}
            {ph.type === "mask" && (
              <label className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{pg.phMaskChar}</span>
                <input
                  maxLength={1}
                  className="w-16 rounded-md border bg-background px-2 py-1 text-xs"
                  value={ph.maskChar}
                  onChange={(e) =>
                    setPipeline((p) => ({ ...p, placeholder: { type: "mask", maskChar: e.target.value } }))
                  }
                />
              </label>
            )}
          </div>

          {/* Test + status notes */}
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={runTest}
              disabled={
                testStatus === "running" ||
                testStatus === "loading" ||
                !hasEnabledDetector ||
                testText.trim().length === 0
              }
            >
              {(testStatus === "running" || testStatus === "loading") && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              {pg.test}
            </Button>
            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              {testStatus === "loading" && <span>{pg.loadingRuntime}</span>}
              {(runtimeStage === "downloading" || runtimeStage === "installing") && testStatus !== "loading" && (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3 animate-spin" />
                  {runtimeStage === "downloading" ? pg.runtimeDownloading : pg.runtimeInstalling}
                </span>
              )}
              {runtimeStage === "ready" && testStatus !== "done" && testStatus !== "loading" && (
                <span>{pg.runtimeReady}</span>
              )}
              {testStatus === "done" && testDurationMs !== null && (
                <span>
                  {pg.inferenceTime}: {Math.round(testDurationMs)} ms · ~
                  {(1000 / testDurationMs).toFixed(1)} {pg.reqPerSecond}
                </span>
              )}
              {testStatus === "error" && <span className="text-destructive">{pg.errorTitle}</span>}
              {!hasEnabledDetector && <span>{pg.noEnabledDetectors}</span>}
              {hasEnabledLlm && <span>{pg.llmDeploymentNote}</span>}
              {testStale && <span className="text-amber-600">{pg.staleNote}</span>}
              <span>{pg.approximationNote}</span>
            </div>
          </div>
        </section>

        {/* Shared box: Saisie (input) ⇄ Anonymisé (result), toggled by a control.
            A run auto-switches to Anonymisé; switching back to Saisie shows the
            colored highlight (click it, or Edit, to return to editing). */}
        <section className="flex min-h-0 flex-col p-4">
          <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
            <div className="flex gap-1">
              {(
                [
                  ["input", pg.inputLabel],
                  ["anonymized", pg.anonymizedLabel],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setResultView(v)}
                  className={`rounded-md px-3 py-1 text-xs font-medium ${
                    resultView === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {resultView === "input" && testStatus === "done" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setResultView("input");
                  setTestStatus("idle");
                }}
              >
                {pg.edit}
              </Button>
            )}
          </div>

          {resultView === "input" ? (
            testStatus === "done" ? (
              <div
                role="button"
                tabIndex={0}
                title={pg.edit}
                onClick={() => {
                  setResultView("input");
                  setTestStatus("idle");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setResultView("input");
                    setTestStatus("idle");
                  }
                }}
                className="min-h-32 flex-1 cursor-text overflow-auto rounded-lg border bg-background p-3 text-sm"
              >
                <EntityHighlight text={testAnalyzed} entities={testHighlights} colors={testColors} />
              </div>
            ) : (
              <textarea
                className="min-h-32 w-full flex-1 resize-none rounded-lg border bg-background p-3 text-sm"
                aria-label={pg.inputLabel}
                value={testText}
                disabled={testStatus === "running" || testStatus === "loading"}
                onChange={(e) => setTestText(e.target.value)}
              />
            )
          ) : testStatus !== "done" ? (
            <p className="text-sm text-muted-foreground">{pg.emptyHint}</p>
          ) : (
            <p className="min-h-32 flex-1 overflow-auto rounded-lg border bg-background p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
              {testAnonSegments.map((seg, i) =>
                seg.label ? (
                  <span
                    key={i}
                    className={`rounded px-1 ${testColors.get(seg.label) ?? labelStyle(seg.label)}`}
                  >
                    {seg.value}
                  </span>
                ) : (
                  <span key={i}>{seg.value}</span>
                ),
              )}
            </p>
          )}
        </section>

        {/* Entités — narrow column. */}
        <section className="flex min-h-0 flex-col overflow-auto p-4">
          <h2 className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {pg.resultsTitle}
          </h2>
          {testStatus !== "done" ? (
            <p className="text-sm text-muted-foreground">{pg.emptyHint}</p>
          ) : testRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{pg.noEntities}</p>
          ) : (
            <ul className="space-y-2">
              {testRows.map((e, i) => (
                <li
                  key={`${e.token}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${testColors.get(e.label) ?? labelStyle(e.label)}`}
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
          )}
        </section>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => setShowExport(true)}>
          {pg.exportTitle}
        </Button>
        <Button onClick={openSave}>{pg.savePipeline}</Button>
      </div>

      {showSave && (
        <Modal title={pg.savePipeline} onClose={() => setShowSave(false)}>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="pipeline-name">
                {pg.pipelineNameLabel}
              </label>
              <input
                id="pipeline-name"
                className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSave(false)}>
                {pg.cancel}
              </Button>
              <Button onClick={confirmSave} disabled={saveName.trim().length === 0}>
                {pg.save}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showExport && (
        <Modal title={pg.exportTitle} onClose={() => setShowExport(false)}>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1">
                {(["toml", "python"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setExportTab(tab)}
                    className={`rounded-md px-3 py-1 text-xs ${
                      exportTab === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tab === "toml" ? pg.exportToml : pg.exportPython}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={downloadToml}>
                {pg.downloadToml}
              </Button>
            </div>
            <ExportBox code={exportTab === "toml" ? toToml(pipeline) : toPython(pipeline)} />
          </div>
        </Modal>
      )}
    </div>
  );
}
