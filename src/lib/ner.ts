export type RawToken = {
  entity: string;
  score: number;
  word: string;
  index?: number;
  start?: number | null;
  end?: number | null;
};

export type Entity = {
  text: string;
  label: string;
  score: number;
  start: number;
  end: number;
};

function baseLabel(entity: string): string {
  return entity.replace(/^[BI]-/, "");
}

/**
 * Rebuild an entity's surface form from its WordPiece tokens: "##" pieces glue
 * onto the previous word, everything else is separated by a single space.
 * "Cyber" + "##dyn" + "##e" + "Systems" -> "Cyberdyne Systems".
 */
function reconstruct(words: string[]): string {
  let surface = "";
  for (const word of words) {
    if (word.startsWith("##")) surface += word.slice(2);
    else surface += (surface ? " " : "") + word;
  }
  return surface;
}

type Group = { label: string; words: string[]; scores: number[] };

/**
 * Merge per-token BIO predictions into whole entities. transformers.js
 * token-classification returns no character offsets, so we rebuild each
 * entity's text from its WordPiece tokens and locate it in the original text
 * with a forward-moving cursor (so repeated values map to successive spans).
 * A new entity starts on a "B-" tag, on a label change, or after an "O" token.
 */
export function groupEntities(tokens: RawToken[], text: string): Entity[] {
  const groups: Group[] = [];
  let current: Group | null = null;

  for (const t of tokens) {
    if (t.entity === "O") {
      current = null;
      continue;
    }
    const label = baseLabel(t.entity);
    const isBegin = t.entity.startsWith("B-");
    const continues = current !== null && !isBegin && current.label === label;

    if (continues && current) {
      current.words.push(t.word);
      current.scores.push(t.score);
    } else {
      current = { label, words: [t.word], scores: [t.score] };
      groups.push(current);
    }
  }

  const entities: Entity[] = [];
  let cursor = 0;
  for (const group of groups) {
    const surface = reconstruct(group.words);
    // NOTE: reconstruct() separates non-"##" tokens with a single space, so
    // surfaces with internal punctuation ("O'Brien" -> "O ' Brien",
    // "Jean-Pierre" -> "Jean - Pierre") will not match the original text and
    // are dropped. Accepted MVP limitation; revisit if such names matter.
    const start = text.indexOf(surface, cursor);
    if (start === -1) continue;
    const end = start + surface.length;
    cursor = end;
    const score = group.scores.reduce((a, b) => a + b, 0) / group.scores.length;
    entities.push({ text: surface, label: group.label, score, start, end });
  }
  return entities;
}

export type Segment = { value: string; entity?: Entity };

/** Split text into plain and entity segments, ordered by character position. */
export function toSegments(text: string, entities: Entity[]): Segment[] {
  const sorted = [...entities].sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let cursor = 0;
  for (const entity of sorted) {
    // Skip entities that overlap one already emitted. Classic BIO grouping never
    // overlaps, but GLiNER can return overlapping spans across labels, which
    // would otherwise produce garbled, doubled-up highlights.
    if (entity.start < cursor) continue;
    if (entity.start > cursor) {
      segments.push({ value: text.slice(cursor, entity.start) });
    }
    segments.push({ value: text.slice(entity.start, entity.end), entity });
    cursor = entity.end;
  }
  if (cursor < text.length) {
    segments.push({ value: text.slice(cursor) });
  }
  return segments;
}

export type EntitySort = "appearance" | "scoreDesc" | "scoreAsc";

/** Return a new array of entities ordered for display: by position in the text
 *  ("appearance"), or by score descending / ascending. Does not mutate input. */
export function sortEntities(entities: Entity[], mode: EntitySort): Entity[] {
  const arr = [...entities];
  switch (mode) {
    case "scoreDesc":
      return arr.sort((a, b) => b.score - a.score);
    case "scoreAsc":
      return arr.sort((a, b) => a.score - b.score);
    default:
      return arr.sort((a, b) => a.start - b.start);
  }
}

export type ModelId =
  | "Xenova/bert-base-multilingual-cased-ner-hrl"
  | "Xenova/bert-base-NER";

export type ProgressEvent = {
  status: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
};

// One cached pipeline per model id.
const pipelines = new Map<ModelId, Promise<unknown>>();

/**
 * Use WebGPU only when an adapter is actually available. The presence of
 * `navigator.gpu` is not enough: the property can exist while `requestAdapter`
 * returns null (headless browsers, no GPU), and onnxruntime does not fall back
 * to WASM on its own when WebGPU is requested. Probe, then choose.
 */
async function pickDevice(): Promise<"webgpu" | "wasm"> {
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

async function getPipeline(model: ModelId, onProgress?: (e: ProgressEvent) => void) {
  const existing = pipelines.get(model);
  if (existing) return existing;

  const created = (async () => {
    const { pipeline, env } = await import("@huggingface/transformers");
    // Never look for local model files; always fetch from the HF CDN and use
    // the browser cache.
    env.allowLocalModels = false;
    const device = await pickDevice();
    return pipeline("token-classification", model, {
      progress_callback: onProgress,
      device,
      // Quantized int8 weights (model_quantized.onnx): ~178 MB / ~109 MB instead
      // of the 700+ MB fp32, and faster inference. Matches the stated sizes.
      dtype: "q8",
    });
  })();

  // Evict on failure so a later call (e.g. the Retry button) downloads again
  // instead of replaying a cached rejection forever.
  created.catch(() => pipelines.delete(model));
  pipelines.set(model, created);
  return created;
}

/** Pre-load a model (download + warmup). Safe to call repeatedly. */
export async function loadNer(model: ModelId, onProgress?: (e: ProgressEvent) => void) {
  await getPipeline(model, onProgress);
}

/** Run NER on the given text and return grouped entities. */
export async function runNer(model: ModelId, text: string): Promise<Entity[]> {
  const pipe = (await getPipeline(model)) as (
    input: string,
  ) => Promise<RawToken[]>;
  const tokens = await pipe(text);
  return groupEntities(tokens, text);
}
