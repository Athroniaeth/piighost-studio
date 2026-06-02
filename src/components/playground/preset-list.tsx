"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Read-only, collapsible "Examples" list: one row per preset (name +
 *  description) with a Load button. Collapsed by default so it does not crowd
 *  the configuration below. Pure and generic — the page decides what loading
 *  does. */
export function PresetList<T extends { name: string; description: string }>({
  title,
  items,
  loadLabel,
  onLoad,
  defaultOpen = false,
}: {
  title: string;
  items: T[];
  loadLabel: string;
  onLoad: (item: T) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        <ChevronRight className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
        {title}
      </button>
      {open && (
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
