import type { Entity } from "./ner";
import type { ConfigPipeline } from "./detector-config";
import { runDetector } from "./detector-config";
import { assembleWithPiighost } from "./piighost-runtime";
import type { AssembleResult } from "./piighost-bridge";

/** Run the whole pipeline in the browser: every ENABLED detector runs in JS
 *  (filtered by its own threshold), then the real piighost assembles the result
 *  via Pyodide. The llm detector is skipped (it does not run in the browser). */
export async function runPipeline(
  pipeline: ConfigPipeline,
  text: string,
): Promise<AssembleResult> {
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
  return assembleWithPiighost(text, detections, pipeline);
}
