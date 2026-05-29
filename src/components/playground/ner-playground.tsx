"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityHighlight } from "@/components/playground/entity-highlight";
import { loadNer, runNer, type Entity, type ModelId, type ProgressEvent } from "@/lib/ner";
import { useT } from "@/i18n/use-t";

type Status = "idle" | "loading" | "analyzing" | "done" | "error";

const MODELS: { id: ModelId; key: "multilingual" | "english" }[] = [
  { id: "Xenova/bert-base-multilingual-cased-ner-hrl", key: "multilingual" },
  { id: "Xenova/bert-base-NER", key: "english" },
];

export function NerPlayground() {
  const { t } = useT();
  const pg = t.playground;
  const [model, setModel] = useState<ModelId>(MODELS[0].id);
  const [text, setText] = useState(pg.example);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [analyzed, setAnalyzed] = useState("");

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
      setEntities(result);
      setAnalyzed(text);
      setStatus("done");
    } catch (err) {
      console.error("NER playground failed", err);
      setStatus("error");
    }
  }

  const busy = status === "loading" || status === "analyzing";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          {pg.eyebrow}
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{pg.title}</h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">{pg.description}</p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium" htmlFor="ner-model">
          {pg.modelLabel}
        </label>
        <select
          id="ner-model"
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
          value={model}
          disabled={busy}
          // value is constrained to the option elements rendered below
          onChange={(e) => setModel(e.target.value as ModelId)}
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {pg.models[m.key]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="ner-input">
          {pg.inputLabel}
        </label>
        <textarea
          id="ner-input"
          className="min-h-32 w-full rounded-lg border bg-background p-3 text-sm"
          value={text}
          disabled={busy}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{pg.firstLoadNote}</p>
      </div>

      <div className="flex items-center gap-3">
        <Button size="lg" onClick={analyze} disabled={busy || text.trim().length === 0}>
          {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
          {status === "loading"
            ? `${pg.loadingModel} ${progress > 0 ? `${progress}%` : ""}`
            : status === "analyzing"
              ? pg.analyzing
              : pg.analyze}
        </Button>
      </div>

      {status === "error" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{pg.errorTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={analyze}>
              {pg.retry}
            </Button>
          </CardContent>
        </Card>
      )}

      {status === "done" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{pg.resultsTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <EntityHighlight text={analyzed} entities={entities} />
            {entities.length === 0 ? (
              <p className="text-sm text-muted-foreground">{pg.noEntities}</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-1 pr-4 font-medium">{pg.columns.text}</th>
                    <th scope="col" className="py-1 pr-4 font-medium">{pg.columns.label}</th>
                    <th scope="col" className="py-1 font-medium">{pg.columns.score}</th>
                  </tr>
                </thead>
                <tbody>
                  {entities.map((e, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-1 pr-4 font-mono">{e.text}</td>
                      <td className="py-1 pr-4">{e.label}</td>
                      <td className="py-1">{(e.score * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
