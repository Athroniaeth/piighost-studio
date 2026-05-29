/** Parse a comma-separated labels field into a clean list: trimmed, no empties,
 *  deduplicated case-insensitively (first spelling wins). */
export function parseLabels(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(",")) {
    const label = raw.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

/** Stable Tailwind (bg + text) classes for arbitrary, user-defined labels. */
export const LABEL_PALETTE = [
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  "bg-lime-500/15 text-lime-700 dark:text-lime-300",
] as const;

/** Deterministic color for a label name (hash into the palette). */
export function hashLabelColor(label: string): string {
  let h = 0;
  for (let i = 0; i < label.length; i++) {
    h = (h * 31 + label.charCodeAt(i)) | 0;
  }
  return LABEL_PALETTE[Math.abs(h) % LABEL_PALETTE.length];
}
