import type { Entity, ModelId } from "./ner";
import { runNer } from "./ner";
import type { GlinerModelId } from "./gliner";
import { runGliner } from "./gliner";
import { runRegex } from "./regex-detect";

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
};
export type Gliner2DetectorConfig = {
  type: "gliner2";
  name?: string;
  model: GlinerModelId;
  labels: string[];
  threshold: number;
  flatNer: boolean;
};
export type LlmDetectorConfig = {
  type: "llm";
  name?: string;
  provider: string;
  model: string;
  labels: string[];
};
export type DetectorConfig =
  | RegexDetectorConfig
  | TransformersDetectorConfig
  | Gliner2DetectorConfig
  | LlmDetectorConfig;

export type DetectorType = DetectorConfig["type"];
export type Pipeline = { name: string; detectors: DetectorConfig[] };

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
    case "transformers":
      return runNer(config.model, text);
    case "gliner2":
      return runGliner(config.model, config.labels, text);
    case "llm":
      throw new Error("The LLM detector runs at deployment, not in the browser.");
  }
}
