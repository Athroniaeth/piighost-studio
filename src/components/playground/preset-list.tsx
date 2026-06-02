"use client";

/** Read-only "Examples" list: one row per preset (name + description) with a
 *  Load button. Pure and generic — the page decides what loading does. */
export function PresetList<T extends { name: string; description: string }>({
  title,
  items,
  loadLabel,
  onLoad,
}: {
  title: string;
  items: T[];
  loadLabel: string;
  onLoad: (item: T) => void;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.name} className="rounded-md border bg-background p-2 text-sm">
            <p className="truncate font-mono">{item.name}</p>
            <p className="mb-1 text-xs text-muted-foreground">{item.description}</p>
            <button
              type="button"
              className="text-xs text-muted-foreground"
              onClick={() => onLoad(item)}
            >
              {loadLabel}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
