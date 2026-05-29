"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DetectorBench } from "@/components/playground/detector-bench";
import { defaultConfig, type DetectorConfig } from "@/lib/detector-config";
import {
  loadSaved,
  saveDetector,
  deleteSaved,
  type SavedDetector,
} from "@/lib/saved-detectors";
import { useT } from "@/i18n/use-t";

export function DetectorPlayground() {
  const { t } = useT();
  const pg = t.playground;
  const [config, setConfig] = useState<DetectorConfig>(defaultConfig("gliner2"));
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<SavedDetector[]>([]);

  useEffect(() => {
    const list = loadSaved();
    const edit =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("edit") : null;
    const found = edit ? list.find((d) => d.name === edit) : undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(list);
    if (found) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfig(found.config);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(found.name);
    }
  }, []);

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaved(saveDetector(trimmed, config));
  }

  return (
    <div className="flex w-full flex-col gap-4 p-4 lg:h-[calc(100dvh-4rem)]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card p-4 shadow-sm">
        <DetectorBench config={config} onChange={setConfig} />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-sm">
        <input
          className="min-w-48 flex-1 rounded-md border bg-background px-2.5 py-1.5 text-sm"
          placeholder={pg.detectorName}
          aria-label={pg.detectorName}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button onClick={save} disabled={name.trim().length === 0}>
          {pg.saveDetector}
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-3 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {pg.savedDetectors}
        </p>
        {saved.length === 0 ? (
          <p className="text-sm text-muted-foreground">{pg.noSaved}</p>
        ) : (
          <ul className="space-y-2">
            {saved.map((d) => (
              <li key={d.name} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2 text-sm">
                <span className="truncate font-mono">
                  {d.name} <span className="text-muted-foreground">({pg.detectorTypes[d.config.type]})</span>
                </span>
                <span className="flex shrink-0 gap-2">
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
    </div>
  );
}
