import type { ConfigPipeline, Placeholder } from "./detector-config";
import type { Entity } from "./ner";

/** One detection as piighost's `Detection.from_dict` expects it. */
export type BridgeDetection = {
  text: string;
  label: string;
  start_pos: number;
  end_pos: number;
  confidence: number;
};

/** The pipeline config the Python glue understands (a projection of the
 *  website ConfigPipeline — the stage names and placeholder shape already
 *  match piighost's vocabulary). */
export type BridgeConfig = {
  spanResolver: ConfigPipeline["spanResolver"];
  entityLinker: ConfigPipeline["entityLinker"];
  entityResolver: ConfigPipeline["entityResolver"];
  entityResolverThreshold: number;
  placeholder: Placeholder;
};

/** A piece of the anonymized output: plain text, or a replacement token
 *  carrying the label of the entity it stands in for (for coloring). */
export type AnonSegment = { value: string; label?: string };

/** The parsed result of one assembly run. */
export type AssembleResult = {
  anonymized: string;
  entities: { label: string; text: string; score: number; token: string }[];
  segments: AnonSegment[];
  highlights: { start: number; end: number; label: string; score: number; text: string }[];
};

export function toBridgeConfig(pipeline: ConfigPipeline): BridgeConfig {
  return {
    spanResolver: pipeline.spanResolver,
    entityLinker: pipeline.entityLinker,
    entityResolver: pipeline.entityResolver,
    entityResolverThreshold: pipeline.entityResolverThreshold,
    placeholder: pipeline.placeholder,
  };
}

export function detectionsToBridge(entities: Entity[]): BridgeDetection[] {
  return entities.map((e) => ({
    text: e.text,
    label: e.label,
    start_pos: e.start,
    end_pos: e.end,
    confidence: e.score,
  }));
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

/** Validate the JSON the Python glue returns. Throws on a shape mismatch so a
 *  bridge bug surfaces loudly rather than rendering garbage. */
export function parseAssembleResult(raw: unknown): AssembleResult {
  if (
    !isObject(raw) ||
    typeof raw.anonymized !== "string" ||
    !Array.isArray(raw.entities) ||
    !Array.isArray(raw.segments) ||
    !Array.isArray(raw.highlights)
  ) {
    throw new Error("piighost bridge: malformed assemble result");
  }
  return raw as AssembleResult;
}
