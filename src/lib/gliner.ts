import type { Entity } from "./ner";
import { filterOnnxConsoleNoise } from "./onnx-log-filter";

export type GlinerModelId =
  | "onnx-community/gliner_small-v2.1"
  | "onnx-community/gliner_multi_pii-v1";

/** Raw span returned by the `gliner` package inference. */
export type RawSpan = {
  spanText: string;
  start: number;
  end: number;
  label: string;
  score: number;
};

/** Map the package's spans onto our shared Entity shape. GLiNER already gives
 *  character offsets, so there is no WordPiece reconstruction to do. */
export function mapSpans(spans: RawSpan[]): Entity[] {
  return spans.map((s) => ({
    text: s.spanText,
    label: s.label,
    score: s.score,
    start: s.start,
    end: s.end,
  }));
}

const MODEL_URL = (id: GlinerModelId) =>
  `https://huggingface.co/${id}/resolve/main/onnx/model_quantized.onnx`;

// onnxruntime-web build matching the `gliner` package dependency (1.19.2).
const WASM_CDN = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/";

// The subset of the `gliner` package instance we rely on.
type GlinerInstance = {
  inference(args: {
    texts: string[];
    entities: string[];
    threshold?: number;
    flatNer?: boolean;
    multiLabel?: boolean;
  }): Promise<RawSpan[][]>;
};

// One cached Gliner instance per model id.
const instances = new Map<GlinerModelId, Promise<GlinerInstance>>();

/** Use WebGPU only when an adapter is actually available; otherwise WASM. */
async function pickProvider(): Promise<"webgpu" | "wasm"> {
  const gpu =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
      : undefined;
  if (!gpu) return "wasm";
  try {
    const adapter = await gpu.requestAdapter();
    return adapter ? "webgpu" : "wasm";
  } catch {
    return "wasm";
  }
}

async function getGliner(model: GlinerModelId) {
  const existing = instances.get(model);
  if (existing) return existing;

  const created = (async () => {
    // onnxruntime prints benign node-assignment warnings on init; hide them.
    filterOnnxConsoleNoise();
    const { Gliner } = await import("gliner");
    const executionProvider = await pickProvider();
    const g = new Gliner({
      tokenizerPath: model,
      onnxSettings: {
        modelPath: MODEL_URL(model),
        executionProvider,
        wasmPaths: WASM_CDN,
        multiThread: false,
        fetchBinary: true,
      },
      transformersSettings: { allowLocalModels: false, useBrowserCache: true },
      maxWidth: 12, // max span width in tokens the model considers
      // The onnx-community gliner v2.1 / multi_pii models are span-level
      // architectures (they feed span_idx); the token decoder would crash.
      modelType: "span-level",
    });
    await g.initialize();
    return g;
  })();

  // Evict on failure so a later Retry re-downloads instead of replaying a
  // cached rejection forever (same policy as ner.ts).
  created.catch(() => instances.delete(model));
  instances.set(model, created);
  return created;
}

/** Pre-load a GLiNER model (download + init). Safe to call repeatedly. */
export async function loadGliner(model: GlinerModelId): Promise<void> {
  await getGliner(model);
}

/** Run zero-shot NER for the given labels and return grouped entities.
 *  A low query threshold is used so the playground's live threshold slider can
 *  filter results upward without re-running the model. */
export async function runGliner(
  model: GlinerModelId,
  labels: string[],
  text: string,
): Promise<Entity[]> {
  const g = await getGliner(model);
  const out = await g.inference({
    texts: [text],
    entities: labels,
    threshold: 0.1,
    flatNer: false,
    multiLabel: false,
  });
  return mapSpans(out[0] ?? []);
}
