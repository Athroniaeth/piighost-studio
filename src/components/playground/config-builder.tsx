"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import {
  defaultPipeline,
  defaultPlaceholder,
  PLACEHOLDER_TYPES,
  type ConfigPipeline,
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

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md bg-muted/40 p-2 text-sm">
      <span>{label}</span>
      <input type="checkbox" className="size-4 accent-primary" checked={on} onChange={onToggle} />
    </label>
  );
}

export function ConfigBuilder() {
  const { t } = useT();
  const pg = t.playground;
  const [pipeline, setPipeline] = useState<ConfigPipeline>(defaultPipeline());
  const [saved, setSaved] = useState<SavedDetector[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(loadSaved());
  }, []);

  const ph = pipeline.placeholder;

  function addDetector(name: string) {
    const found = saved.find((d) => d.name === name);
    if (!found) return;
    setPipeline((p) => ({
      ...p,
      detectors: [...p.detectors, { name: found.name, config: found.config, enabled: true }],
    }));
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

  return (
    <div className="flex w-full flex-col gap-4 p-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {pg.detectorsTitle}
          </h2>
          <input
            className="mb-3 w-full rounded-md border bg-background px-2.5 py-1.5 text-sm"
            value={pipeline.name}
            aria-label={pg.pipelineNameLabel}
            onChange={(e) => setPipeline((p) => ({ ...p, name: e.target.value }))}
          />
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
                <li key={i} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2 text-sm">
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
                    <a className="text-xs" href={`/playground?edit=${encodeURIComponent(d.name)}`}>{pg.editInPlayground}</a>
                    <button type="button" className="text-xs text-destructive" onClick={() => removeDetector(i)} title={pg.remove}>✕</button>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {pg.stagesTitle}
          </h2>
          <Toggle label={pg.spanResolverLabel} on={pipeline.spanResolver} onToggle={() => setPipeline((p) => ({ ...p, spanResolver: !p.spanResolver }))} />
          <Toggle label={pg.entityLinkerLabel} on={pipeline.entityLinker} onToggle={() => setPipeline((p) => ({ ...p, entityLinker: !p.entityLinker }))} />
          <Toggle label={pg.entityResolverLabel} on={pipeline.entityResolver} onToggle={() => setPipeline((p) => ({ ...p, entityResolver: !p.entityResolver }))} />

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{pg.anonymizerLabel}</label>
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

            {(ph.type === "label_hash" || ph.type === "redact_hash" || ph.type === "faker_hash") && (
              <label className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{pg.phHashLength}</span>
                <input
                  type="number"
                  min={4}
                  max={64}
                  className="w-24 rounded-md border bg-background px-2 py-1 text-xs"
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
                  className="w-24 rounded-md border bg-background px-2 py-1 text-xs"
                  value={ph.maskChar}
                  onChange={(e) =>
                    setPipeline((p) => ({ ...p, placeholder: { type: "mask", maskChar: e.target.value } }))
                  }
                />
              </label>
            )}
            {(ph.type === "faker" || ph.type === "faker_counter" || ph.type === "faker_hash") && (
              <label className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{pg.phLocale}</span>
                <input
                  className="w-32 rounded-md border bg-background px-2 py-1 text-xs"
                  value={ph.locale}
                  onChange={(e) =>
                    setPipeline((p) => ({ ...p, placeholder: { ...ph, locale: e.target.value } }))
                  }
                />
              </label>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ExportBox title={pg.exportToml} code={toToml(pipeline)} />
        <ExportBox title={pg.exportPython} code={toPython(pipeline)} />
      </div>
    </div>
  );
}
