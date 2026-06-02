"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { labelSpecToRows, rowsToLabelSpec, type LabelRow, type LabelSpec } from "@/lib/labels";
import { useT } from "@/i18n/use-t";

function seed(value: LabelSpec): LabelRow[] {
  const rows = labelSpecToRows(value);
  return rows.length ? rows : [{ model: "", emitted: "" }];
}

/** Structured editor for a detector's labels. Each row is one entity:
 *  `searched -> emitted`. Commits live: every edit converts the rows to a
 *  LabelSpec and calls onChange. The parent re-seeds it by changing the
 *  component `key` (detector identity), so there is no resync effect here. */
export function LabelMappingEditor({
  value,
  onChange,
  disabled,
}: {
  value: LabelSpec;
  onChange: (spec: LabelSpec) => void;
  disabled?: boolean;
}) {
  const { t } = useT();
  const pg = t.playground;
  const [rows, setRows] = useState<LabelRow[]>(() => seed(value));

  function commit(next: LabelRow[]) {
    setRows(next);
    onChange(rowsToLabelSpec(next));
  }

  const inputClass =
    "min-w-0 flex-1 rounded-md border bg-background px-2.5 py-1.5 font-mono text-xs";

  return (
    <div className="space-y-1.5">
      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              className={inputClass}
              value={row.model}
              placeholder={pg.labelSearchedPlaceholder}
              disabled={disabled}
              onChange={(e) =>
                commit(rows.map((r, j) => (j === i ? { ...r, model: e.target.value } : r)))
              }
            />
            <span aria-hidden className="shrink-0 text-muted-foreground">
              →
            </span>
            <input
              className={inputClass}
              value={row.emitted}
              placeholder={pg.labelEmittedPlaceholder}
              disabled={disabled}
              onChange={(e) =>
                commit(rows.map((r, j) => (j === i ? { ...r, emitted: e.target.value } : r)))
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-label={pg.remove}
              disabled={disabled}
              onClick={() => {
                const next = rows.filter((_, j) => j !== i);
                commit(next.length ? next : [{ model: "", emitted: "" }]);
              }}
            >
              <X />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => commit([...rows, { model: "", emitted: "" }])}
      >
        <Plus /> {pg.labelAdd}
      </Button>
      <p className="text-xs text-muted-foreground">{pg.labelEmittedHint}</p>
    </div>
  );
}
