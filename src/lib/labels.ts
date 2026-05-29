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
