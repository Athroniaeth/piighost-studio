import type { Entity } from "./ner";

/** Run each {label: pattern} regex over the text and return matches as entities.
 *  Patterns run with the global flag; invalid patterns are skipped (a single
 *  bad regex must not break the whole detector). Zero-width matches advance the
 *  cursor so matching always terminates. score is 1 (regex is exact). */
export function runRegex(patterns: Record<string, string>, text: string): Entity[] {
  const out: Entity[] = [];
  for (const [label, pattern] of Object.entries(patterns)) {
    let re: RegExp;
    try {
      re = new RegExp(pattern, "g");
    } catch {
      continue; // invalid regex: skip this pattern
    }
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m[0].length > 0) {
        out.push({
          text: m[0],
          label,
          score: 1,
          start: m.index,
          end: m.index + m[0].length,
        });
      }
      if (m.index === re.lastIndex) re.lastIndex++; // avoid infinite loop
    }
  }
  return out.sort((a, b) => a.start - b.start);
}
