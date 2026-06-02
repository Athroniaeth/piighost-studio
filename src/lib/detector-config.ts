import type { Entity, ModelId } from "./ner";
import { runNer } from "./ner";
import type { GlinerModelId } from "./gliner";
import { runGliner } from "./gliner";
import { runRegex } from "./regex-detect";
import { internalLabels, remapLabel, type LabelSpec } from "./labels";

export type RegexDetectorConfig = {
  type: "regex";
  name?: string;
  patterns: Record<string, string>;
};
export type TransformersDetectorConfig = {
  type: "transformers";
  name?: string;
  model: ModelId;
  threshold: number;
  labels?: LabelSpec;
};
export type Gliner2DetectorConfig = {
  type: "gliner2";
  name?: string;
  model: GlinerModelId;
  labels: LabelSpec;
  threshold: number;
  flatNer: boolean;
};
export type LlmDetectorConfig = {
  type: "llm";
  name?: string;
  provider: string;
  model: string;
  labels: LabelSpec;
};
export type DetectorConfig =
  | RegexDetectorConfig
  | TransformersDetectorConfig
  | Gliner2DetectorConfig
  | LlmDetectorConfig;

export type DetectorType = DetectorConfig["type"];
export type PipelineDetector = { name: string; config: DetectorConfig; enabled: boolean };

export type Placeholder =
  | { type: "label_counter" }
  | { type: "label" }
  | { type: "redact_counter" }
  | { type: "redact" }
  | { type: "label_hash"; hashLength: number }
  | { type: "redact_hash"; hashLength: number }
  | { type: "mask"; maskChar: string };

export type PlaceholderType = Placeholder["type"];

export const PLACEHOLDER_TYPES: PlaceholderType[] = [
  "label_counter",
  "label_hash",
  "label",
  "mask",
  "redact_counter",
  "redact_hash",
  "redact",
];

export type SpanResolverType = "confidence" | "disabled";
export type EntityLinkerType = "exact" | "disabled";
export type EntityResolverType = "merge" | "fuzzy" | "disabled";

export const SPAN_RESOLVER_TYPES: SpanResolverType[] = ["confidence", "disabled"];
export const ENTITY_LINKER_TYPES: EntityLinkerType[] = ["exact", "disabled"];
export const ENTITY_RESOLVER_TYPES: EntityResolverType[] = ["merge", "fuzzy", "disabled"];

export type ConfigPipeline = {
  name: string;
  detectors: PipelineDetector[];
  spanResolver: SpanResolverType;
  entityLinker: EntityLinkerType;
  entityResolver: EntityResolverType;
  entityResolverThreshold: number; // used when entityResolver === "fuzzy"
  placeholder: Placeholder;
};

/** A reasonable starting pipeline: no detectors, default stages, counter tokens. */
export function defaultPipeline(): ConfigPipeline {
  return {
    name: "my-pipeline",
    detectors: [],
    spanResolver: "confidence",
    entityLinker: "exact",
    entityResolver: "merge",
    entityResolverThreshold: 0.85,
    placeholder: { type: "label_counter" },
  };
}

/** Build a placeholder of a given type with sensible default fields. */
export function defaultPlaceholder(type: PlaceholderType): Placeholder {
  switch (type) {
    case "label_hash":
    case "redact_hash":
      return { type, hashLength: 8 };
    case "mask":
      return { type: "mask", maskChar: "*" };
    default:
      return { type };
  }
}

/** Which detector types can actually run in the browser. */
export const RUNNABLE: Record<DetectorType, boolean> = {
  regex: true,
  transformers: true,
  gliner2: true,
  llm: false,
};

/** A sensible starting config for each detector type. */
export function defaultConfig(type: DetectorType): DetectorConfig {
  switch (type) {
    case "regex":
      return { type: "regex", patterns: { EMAIL: "[\\w.+-]+@[\\w-]+\\.[\\w.-]+" } };
    case "transformers":
      return { type: "transformers", model: "Xenova/bert-base-NER", threshold: 0.5 };
    case "gliner2":
      return {
        type: "gliner2",
        model: "onnx-community/gliner_small-v2.1",
        labels: ["person", "organization", "location", "date"],
        threshold: 0.5,
        flatNer: true,
      };
    case "llm":
      return { type: "llm", provider: "mistral", model: "mistral-small", labels: ["PER", "LOC"] };
  }
}

/** Run a detector config against text in the browser. Throws for llm. */
export async function runDetector(config: DetectorConfig, text: string): Promise<Entity[]> {
  switch (config.type) {
    case "regex":
      return runRegex(config.patterns, text);
    case "transformers": {
      const ents = await runNer(config.model, text);
      const map = config.labels;
      return map ? ents.map((e) => ({ ...e, label: remapLabel(e.label, map) })) : ents;
    }
    case "gliner2": {
      const spec = config.labels;
      return (await runGliner(config.model, internalLabels(spec), text)).map((e) => ({
        ...e,
        label: remapLabel(e.label, spec),
      }));
    }
    case "llm":
      throw new Error("The LLM detector runs at deployment, not in the browser.");
  }
}
