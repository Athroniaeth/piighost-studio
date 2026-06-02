"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Read-only "Examples" list: one row per preset (name + description) with a
 *  Load button. Collapsible (with a toggle header) by default; pass
 *  `collapsible={false}` to always show the list with a plain heading. Pure and
 *  generic — the page decides what loading does. */
export function PresetList<T extends { name: string; description: string }>({
  title,
  items,
  loadLabel,
  onLoad,
  defaultOpen = false,
  collapsible = true,
}: {
  title: string;
  items: T[];
  loadLabel: string;
  onLoad: (item: T) => void;
  defaultOpen?: boolean;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const expanded = collapsible ? open : true;
  return (
    <div className="space-y-2">
      {collapsible ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          <ChevronRight className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
          {title}
        </button>
      ) : (
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      )}
      {expanded && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.name} className="rounded-md border bg-background p-2 text-sm">
              <p className="truncate font-mono">{item.name}</p>
              <p className="mb-2 text-xs text-muted-foreground">{item.description}</p>
              <Button variant="outline" size="sm" className="w-full" onClick={() => onLoad(item)}>
                {loadLabel}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
