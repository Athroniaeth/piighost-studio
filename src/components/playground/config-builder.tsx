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
import { assignLabelColors, labelStyle } from "@/lib/labels";
import { runPipeline } from "@/lib/run-pipeline";
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

/** Block heading with a "?" help tooltip describing the pipeline stage. */
function BlockTitle({ title, help }: { title: string; help: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <span
        title={help}
        className="inline-flex size-4 cursor-help items-center justify-center rounded-full border text-[10px] text-muted-foreground"
      >
        ?
      </span>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex shrink-0 items-center px-1 text-xl text-muted-foreground" aria-hidden>
      →
    </div>
  );
}

/** A pipeline-stage block with a variant select (including "disabled"). */
function StageBlock<T extends string>({
  title,
  help,
  value,
  options,
  onChange,
  children,
}: {
  title: string;
  help: string;
  value: T;
  options: readonly T[];
  onChange: (next: T) => void;
  children?: ReactNode;
}) {
  return (
    <section
      className={`flex w-44 shrink-0 flex-col rounded-xl border bg-card p-3 shadow-sm ${
        value === "disabled" ? "opacity-60" : ""
      }`}
    >
      <BlockTitle title={title} help={help} />
      <select
        className="w-full rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {children}
    </section>
  );
}

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
  const [testStatus, setTestStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [testEntities, setTestEntities] = useState<Entity[]>([]);
  const [testAnonymized, setTestAnonymized] = useState("");
  const [testAnalyzed, setTestAnalyzed] = useState("");
  const [testSnapshot, setTestSnapshot] = useState("");
  const testColors = useMemo(() => assignLabelColors(testEntities.map((e) => e.label)), [testEntities]);
  const hasEnabledDetector = pipeline.detectors.some((d) => d.enabled && d.config.type !== "llm");
  const hasEnabledLlm = pipeline.detectors.some((d) => d.enabled && d.config.type === "llm");
  // The shown result is stale if the pipeline or text changed since the run.
  const testStale =
    testStatus === "done" && testSnapshot !== JSON.stringify({ pipeline, text: testText });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(loadSaved());
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
      setTestStatus("running");
      const result = await runPipeline(pipeline, testText);
      setTestEntities(result.entities);
      setTestAnonymized(result.anonymized);
      setTestAnalyzed(testText);
      setTestSnapshot(JSON.stringify({ pipeline, text: testText }));
      setTestStatus("done");
    } catch (err) {
      console.error("pipeline test failed", err);
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
    <div className="flex w-full flex-col p-4 lg:h-[calc(100dvh-4rem)]">
      {/* Pipeline, left to right, centered: one block per stage joined by arrows. */}
      <div className="flex shrink-0 items-center justify-center overflow-x-auto pb-2">
        <div className="flex items-stretch gap-2">
          {/* Detect */}
          <section className="flex w-72 shrink-0 flex-col rounded-xl border bg-card p-3 shadow-sm">
            <BlockTitle title={pg.detectorsTitle} help={pg.detectorsHelp} />
            <select
              className="mb-3 w-full rounded-md border bg-background px-2.5 py-1.5 text-xs"
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
                  <li key={d.name} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2 text-sm">
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
                      <Link className="text-xs" href={`/playground?edit=${encodeURIComponent(d.name)}`}>{pg.editInPlayground}</Link>
                      <button type="button" className="text-xs text-destructive" onClick={() => removeDetector(i)} title={pg.remove}>✕</button>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <Arrow />
          <StageBlock<SpanResolverType>
            title={pg.spanResolverLabel}
            help={pg.spanResolverHelp}
            value={pipeline.spanResolver}
            options={SPAN_RESOLVER_TYPES}
            onChange={(v) => setPipeline((p) => ({ ...p, spanResolver: v }))}
          />
          <Arrow />
          <StageBlock<EntityLinkerType>
            title={pg.entityLinkerLabel}
            help={pg.entityLinkerHelp}
            value={pipeline.entityLinker}
            options={ENTITY_LINKER_TYPES}
            onChange={(v) => setPipeline((p) => ({ ...p, entityLinker: v }))}
          />
          <Arrow />
          <StageBlock<EntityResolverType>
            title={pg.entityResolverLabel}
            help={pg.entityResolverHelp}
            value={pipeline.entityResolver}
            options={ENTITY_RESOLVER_TYPES}
            onChange={(v) => setPipeline((p) => ({ ...p, entityResolver: v }))}
          >
            {pipeline.entityResolver === "fuzzy" && (
              <label className="mt-2 flex items-center justify-between gap-2 text-sm">
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
          </StageBlock>
          <Arrow />

          {/* Anonymize */}
          <section className="flex w-60 shrink-0 flex-col rounded-xl border bg-card p-3 shadow-sm">
            <BlockTitle title={pg.anonymizerLabel} help={pg.anonymizerHelp} />
            <select
              className="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs"
              value={ph.type}
              onChange={(e) =>
                setPipeline((p) => ({ ...p, placeholder: defaultPlaceholder(e.target.value as PlaceholderType) }))
              }
            >
              {PLACEHOLDER_TYPES.map((ty) => (
                <option key={ty} value={ty}>{ty}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {pg.tokenExample} :{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">{tokenExample(ph)}</code>
            </p>

            {(ph.type === "label_hash" || ph.type === "redact_hash") && (
              <label className="mt-2 flex items-center justify-between gap-2 text-sm">
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
              <label className="mt-2 flex items-center justify-between gap-2 text-sm">
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
          </section>
        </div>
      </div>

      {/* Live pipeline test (browser approximation) */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <section className="flex min-h-0 flex-col rounded-xl border bg-card p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {pg.liveTestTitle}
            </h2>
            <span className="text-xs text-muted-foreground">{pg.approximationNote}</span>
          </div>
          <textarea
            className="min-h-32 w-full flex-1 resize-none rounded-lg border bg-background p-3 text-sm"
            aria-label={pg.liveTestTitle}
            value={testText}
            disabled={testStatus === "running"}
            onChange={(e) => setTestText(e.target.value)}
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              onClick={runTest}
              disabled={testStatus === "running" || !hasEnabledDetector || testText.trim().length === 0}
            >
              {testStatus === "running" && <Loader2 className="mr-2 size-4 animate-spin" />}
              {pg.test}
            </Button>
            {!hasEnabledDetector && (
              <span className="text-xs text-muted-foreground">{pg.noEnabledDetectors}</span>
            )}
            {hasEnabledLlm && (
              <span className="text-xs text-muted-foreground">{pg.llmDeploymentNote}</span>
            )}
            {testStale && <span className="text-xs text-amber-600">{pg.staleNote}</span>}
          </div>
        </section>

        <section className="flex min-h-0 flex-col gap-3 overflow-auto rounded-xl border bg-card p-3 shadow-sm">
          {testStatus === "error" ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">{pg.errorTitle}</p>
              <Button variant="outline" size="sm" onClick={runTest}>{pg.retry}</Button>
            </div>
          ) : testStatus !== "done" ? (
            <p className="text-sm text-muted-foreground">{pg.emptyHint}</p>
          ) : (
            <>
              <div className="rounded-lg border bg-background p-3 text-sm">
                <EntityHighlight text={testAnalyzed} entities={testEntities} colors={testColors} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {pg.anonymizedLabel}
                </p>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 font-mono text-xs">
                  {testAnonymized}
                </pre>
              </div>
              {testEntities.length === 0 ? (
                <p className="text-sm text-muted-foreground">{pg.noEntities}</p>
              ) : (
                <ul className="space-y-2">
                  {testEntities.map((e, i) => (
                    <li
                      key={`${e.start}-${i}`}
                      className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-medium ${testColors.get(e.label) ?? labelStyle(e.label)}`}
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
