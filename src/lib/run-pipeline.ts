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
