"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import {
  defaultPipeline,
  defaultPlaceholder,
  PLACEHOLDER_TYPES,
  type ConfigPipeline,
  type Placeholder,
  type PlaceholderType,
} from "@/lib/detector-config";
import { toToml, toPython } from "@/lib/pipeline-export";
import { loadSaved, type SavedDetector } from "@/lib/saved-detectors";
import { useT } from "@/i18n/use-t";

function ExportBox({ title, code }: { title: string; code: string }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="group relative overflow-hidden rounded-lg border bg-muted/30">
        <CopyButton value={code} />
        <pre className="overflow-x-auto p-4 font-mono text-xs">{code}</pre>
      </div>
    </div>
  );
}

/** Indicative example of what each token style produces for a PERSON entity.
 *  The exact format is decided by the piighost placeholder factories; these are
 *  illustrative, matching the documented strategies. */
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

/** Flow arrow between pipeline blocks. */
function Arrow() {
  return (
    <div className="flex shrink-0 items-center px-1 text-xl text-muted-foreground" aria-hidden>
      →
    </div>
  );
}

/** A togglable pipeline stage block (span resolver / entity linker / entity
 *  resolver). Shows the variant that will be exported, dims when disabled. */
function StageBlock({
  label,
  on,
  variant,
  onToggle,
}: {
  label: string;
  on: boolean;
  variant: string;
  onToggle: () => void;
}) {
  return (
    <section
      className={`flex w-44 shrink-0 flex-col rounded-xl border bg-card p-3 shadow-sm ${on ? "" : "opacity-60"}`}
    >
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h2>
      <label className="mt-auto flex cursor-pointer items-center justify-between gap-2 text-sm">
        <code className="font-mono text-xs">{on ? variant : "disabled"}</code>
        <input type="checkbox" className="size-4 accent-primary" checked={on} onChange={onToggle} />
      </label>
    </section>
  );
}

export function ConfigBuilder() {
  const { t } = useT();
  const pg = t.playground;
  const [pipeline, setPipeline] = useState<ConfigPipeline>(defaultPipeline());
  const [saved, setSaved] = useState<SavedDetector[]>([]);
  const [showExport, setShowExport] = useState(false);
  const [exportTab, setExportTab] = useState<"toml" | "python">("toml");

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

  return (
    <div className="flex w-full flex-col gap-4 p-4">
      {/* Pipeline name */}
      <div className="max-w-sm">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {pg.pipelineNameLabel}
        </label>
        <input
          className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm"
          value={pipeline.name}
          aria-label={pg.pipelineNameLabel}
          onChange={(e) => setPipeline((p) => ({ ...p, name: e.target.value }))}
        />
      </div>

      {/* The pipeline, left to right: one block per stage, joined by arrows. */}
      <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
        {/* Detect */}
        <section className="flex w-72 shrink-0 flex-col rounded-xl border bg-card p-3 shadow-sm">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {pg.detectorsTitle}
          </h2>
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
        <StageBlock
          label={pg.spanResolverLabel}
          on={pipeline.spanResolver}
          variant="confidence"
          onToggle={() => setPipeline((p) => ({ ...p, spanResolver: !p.spanResolver }))}
        />
        <Arrow />
        <StageBlock
          label={pg.entityLinkerLabel}
          on={pipeline.entityLinker}
          variant="exact"
          onToggle={() => setPipeline((p) => ({ ...p, entityLinker: !p.entityLinker }))}
        />
        <Arrow />
        <StageBlock
          label={pg.entityResolverLabel}
          on={pipeline.entityResolver}
          variant="merge"
          onToggle={() => setPipeline((p) => ({ ...p, entityResolver: !p.entityResolver }))}
        />
        <Arrow />

        {/* Anonymize */}
        <section className="flex w-60 shrink-0 flex-col rounded-xl border bg-card p-3 shadow-sm">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {pg.anonymizerLabel}
          </h2>
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

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowExport((s) => !s)}>
            {pg.exportTitle}
          </Button>
          {showExport && (
            <Button variant="outline" onClick={downloadToml}>
              {pg.downloadToml}
            </Button>
          )}
        </div>

        {showExport && (
          <div className="space-y-2">
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
            <ExportBox
              title={exportTab === "toml" ? pg.exportToml : pg.exportPython}
              code={exportTab === "toml" ? toToml(pipeline) : toPython(pipeline)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
