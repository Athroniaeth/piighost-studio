import type { Entity } from "./ner";
import type { ConfigPipeline, Placeholder } from "./detector-config";
import { runDetector } from "./detector-config";

/** Short deterministic hex hash (FNV-1a based). Approximate: NOT the lib's
 *  canonical SHA-256, just enough to make hash tokens look real and stable. */
export function hashValue(value: string, length: number): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let out = "";
  while (out.length < length) {
    out += (h >>> 0).toString(16).padStart(8, "0");
    h = Math.imul(h ^ (h >>> 13), 16777619) >>> 0;
  }
  return out.slice(0, length);
}

/** A piece of the anonymized output: plain text when `label` is absent, or a
 *  replacement token carrying the label of the entity it stands in for (so the
 *  UI can color it with the same palette as the source highlight). */
export type AnonSegment = { value: string; label?: string };

/** Mutable counters for token assignment within one pipeline run. */
export type TokenContext = { labelCounters: Map<string, number>; global: { n: number } };

export function createTokenContext(): TokenContext {
  return { labelCounters: new Map(), global: { n: 0 } };
}

/** Produce the placeholder token for one entity, per the chosen style. */
export function assignToken(
  placeholder: Placeholder,
  label: string,
  value: string,
  ctx: TokenContext,
): string {
  switch (placeholder.type) {
    case "label_counter": {
      const n = (ctx.labelCounters.get(label) ?? 0) + 1;
      ctx.labelCounters.set(label, n);
      return `<<${label}:${n}>>`;
    }
    case "label_hash":
      return `<<${label}:${hashValue(value, placeholder.hashLength)}>>`;
    case "label":
      return `<<${label}>>`;
    case "mask":
      return value.slice(0, 1) + placeholder.maskChar.repeat(Math.max(0, value.length - 1));
    case "redact_counter":
      ctx.global.n += 1;
      return `<<REDACT:${ctx.global.n}>>`;
    case "redact_hash":
      return `<<REDACT:${hashValue(value, placeholder.hashLength)}>>`;
    case "redact":
      return "<<REDACT>>";
  }
}

/** Keep non-overlapping spans, preferring higher score; disabled keeps all. */
function resolveSpans(entities: Entity[], mode: ConfigPipeline["spanResolver"]): Entity[] {
  if (mode === "disabled") {
    return [...entities].sort((a, b) => a.start - b.start);
  }
  const byScore = [...entities].sort((a, b) => b.score - a.score);
  const kept: Entity[] = [];
  for (const cand of byScore) {
    const overlaps = kept.some((k) => cand.start < k.end && k.start < cand.end);
    if (!overlaps) kept.push(cand);
  }
  return kept.sort((a, b) => a.start - b.start);
}

/** Apply the non-detector pipeline stages (approximate) to a set of detections:
 *  resolve overlaps, group entities that should share a placeholder, then build
 *  the anonymized text. Returns the kept entities (for highlighting) and the
 *  anonymized text. */
export function assemblePipeline(
  detections: Entity[],
  pipeline: ConfigPipeline,
  text: string,
): { entities: Entity[]; anonymized: string; anonymizedSegments: AnonSegment[] } {
  const kept = resolveSpans(detections, pipeline.spanResolver);
  const grouping = !(pipeline.entityLinker === "disabled" && pipeline.entityResolver === "disabled");
  const norm = (v: string) => (pipeline.entityResolver === "fuzzy" ? v.toLowerCase().trim() : v);

  const ctx = createTokenContext();
  const groupToken = new Map<string, string>();
  const tokenFor = (entity: Entity, index: number): string => {
    // Null-byte separator: never present in labels or natural-language text.
    const key = grouping ? `${entity.label}\u0000${norm(entity.text)}` : `i:${index}`;
    let token = groupToken.get(key);
    if (token === undefined) {
      token = assignToken(pipeline.placeholder, entity.label, entity.text, ctx);
      groupToken.set(key, token);
    }
    return token;
  };

  let cursor = 0;
  let anonymized = "";
  const segments: AnonSegment[] = [];
  kept.forEach((entity, index) => {
    if (entity.start < cursor) return; // overlap leftover (only when resolver disabled)
    const before = text.slice(cursor, entity.start);
    const token = tokenFor(entity, index);
    if (before) segments.push({ value: before });
    segments.push({ value: token, label: entity.label });
    anonymized += before + token;
    cursor = entity.end;
  });
  const tail = text.slice(cursor);
  if (tail) segments.push({ value: tail });
  anonymized += tail;

  return { entities: kept, anonymized, anonymizedSegments: segments };
}

/** Run the whole pipeline in the browser: every ENABLED detector runs (filtered
 *  by its own threshold), then the stages are applied. The llm detector is
 *  skipped (it does not run in the browser). */
export async function runPipeline(
  pipeline: ConfigPipeline,
  text: string,
): Promise<{ entities: Entity[]; anonymized: string; anonymizedSegments: AnonSegment[] }> {
  const detections: Entity[] = [];
  for (const d of pipeline.detectors) {
    if (!d.enabled || d.config.type === "llm") continue;
    const result = await runDetector(d.config, text);
    const threshold =
      d.config.type === "transformers" || d.config.type === "gliner2" ? d.config.threshold : 0;
    for (const entity of result) {
      if (entity.score >= threshold) detections.push(entity);
    }
  }
  return assemblePipeline(detections, pipeline, text);
}
