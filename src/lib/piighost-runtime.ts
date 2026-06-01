import type { PyodideInterface } from "pyodide";
import {
  toBridgeConfig,
  detectionsToBridge,
  parseAssembleResult,
  type AssembleResult,
} from "./piighost-bridge";
import type { ConfigPipeline } from "./detector-config";
import type { Entity } from "./ner";

// Keep these in lockstep: the CDN assets must match the installed loader.
const PYODIDE_VERSION = "0.29.4";
const PIIGHOST_VERSION = "0.12.1";

// Python glue. NOTE: we import piighost SUBMODULES, never the top-level
// `piighost` package — the top-level __init__ imports ph_factory.faker_hash,
// which pulls `faker` (an extra we do not install).
const GLUE = `
import json
from piighost.models import Detection
from piighost.anonymizer import Anonymizer
from piighost.resolver.span import (
    ConfidenceSpanConflictResolver,
    DisabledSpanConflictResolver,
)
from piighost.linker.entity import ExactEntityLinker, DisabledEntityLinker
from piighost.resolver.entity import (
    MergeEntityConflictResolver,
    FuzzyEntityConflictResolver,
    DisabledEntityConflictResolver,
)
from piighost.placeholder import (
    LabelCounterPlaceholderFactory,
    LabelHashPlaceholderFactory,
    LabelPlaceholderFactory,
    MaskPlaceholderFactory,
    RedactCounterPlaceholderFactory,
    RedactHashPlaceholderFactory,
    RedactPlaceholderFactory,
)


def _span_resolver(name):
    if name == "disabled":
        return DisabledSpanConflictResolver()
    return ConfidenceSpanConflictResolver()


def _linker(name):
    if name == "disabled":
        return DisabledEntityLinker()
    return ExactEntityLinker()


def _entity_resolver(name, threshold):
    if name == "disabled":
        return DisabledEntityConflictResolver()
    if name == "fuzzy":
        return FuzzyEntityConflictResolver(threshold=threshold)
    return MergeEntityConflictResolver()


def _factory(ph):
    t = ph["type"]
    if t == "label_counter":
        return LabelCounterPlaceholderFactory()
    if t == "label_hash":
        return LabelHashPlaceholderFactory(hash_length=ph["hashLength"])
    if t == "label":
        return LabelPlaceholderFactory()
    if t == "mask":
        return MaskPlaceholderFactory(mask_char=ph["maskChar"])
    if t == "redact_counter":
        return RedactCounterPlaceholderFactory()
    if t == "redact_hash":
        return RedactHashPlaceholderFactory(hash_length=ph["hashLength"])
    return RedactPlaceholderFactory()


def assemble(payload_json):
    payload = json.loads(payload_json)
    text = payload["text"]
    cfg = payload["config"]
    detections = [Detection.from_dict(d) for d in payload["detections"]]

    detections = _span_resolver(cfg["spanResolver"]).resolve(detections)
    entities = _linker(cfg["entityLinker"]).link(text, detections)
    entities = _entity_resolver(
        cfg["entityResolver"], cfg["entityResolverThreshold"]
    ).resolve(entities)

    factory = _factory(cfg["placeholder"])
    anonymized = Anonymizer(ph_factory=factory).anonymize(text, entities)
    tokens = factory.create(entities)  # dict[Entity, str], in entity (appearance) order

    entity_rows = []
    spans = []  # (start, end, token, label, score, surface)
    for entity, token in tokens.items():
        first = entity.detections[0]
        entity_rows.append(
            {"label": entity.label, "text": first.text,
             "score": first.confidence, "token": token}
        )
        for det in entity.detections:
            spans.append((det.position.start_pos, det.position.end_pos,
                          token, entity.label, det.confidence, det.text))

    spans.sort(key=lambda s: s[0])

    segments = []
    highlights = []
    cursor = 0
    for start, end, token, label, score, surface in spans:
        if start < cursor:
            continue
        if start > cursor:
            segments.append({"value": text[cursor:start]})
        segments.append({"value": token, "label": label})
        highlights.append({"start": start, "end": end, "label": label,
                           "score": score, "text": surface})
        cursor = end
    if cursor < len(text):
        segments.append({"value": text[cursor:]})

    return json.dumps({
        "anonymized": anonymized,
        "entities": entity_rows,
        "segments": segments,
        "highlights": highlights,
    })
`;

/** Signature of Pyodide's `loadPyodide` entry point (the bits we use). */
type LoadPyodide = (config?: { indexURL?: string }) => Promise<PyodideInterface>;

const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let scriptPromise: Promise<void> | null = null;
/** Inject the CDN pyodide.js once; it defines globalThis.loadPyodide. */
function loadPyodideScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `${PYODIDE_CDN}pyodide.js`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Pyodide from the CDN"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/** Resolve a `loadPyodide` function for the current environment. The npm
 *  package's loader uses a dynamic require that Turbopack cannot resolve in the
 *  browser bundle ("Cannot find module as expression is too dynamic"), so in the
 *  browser we load the CDN build via a <script> tag instead. In Node (tests) we
 *  use the npm package. */
async function getLoadPyodide(): Promise<LoadPyodide> {
  if (typeof window === "undefined") {
    const mod = await import("pyodide");
    return mod.loadPyodide as unknown as LoadPyodide;
  }
  await loadPyodideScript();
  const fn = (globalThis as unknown as { loadPyodide?: LoadPyodide }).loadPyodide;
  if (!fn) throw new Error("Pyodide failed to initialize from the CDN");
  return fn;
}

let runtime: Promise<PyodideInterface> | null = null;

/** Lazily load Pyodide, install piighost, and define the glue. Cached; evicted
 *  on failure so a later Retry re-downloads instead of replaying a rejection. */
export function loadPiighostRuntime(): Promise<PyodideInterface> {
  if (runtime) return runtime;

  const created = (async () => {
    const inBrowser = typeof window !== "undefined";
    const loadPyodide = await getLoadPyodide();
    const py = await loadPyodide(inBrowser ? { indexURL: PYODIDE_CDN } : {});
    // pydantic ships with Pyodide; piighost's placeholder/anonymizer modules
    // import config models that require it, so load it before running the glue.
    await py.loadPackage(["micropip", "pydantic"]);
    const micropip = py.pyimport("micropip");
    await micropip.install(`piighost==${PIIGHOST_VERSION}`);
    micropip.destroy(); // release the PyProxy; Pyodide GC finalization is not guaranteed
    py.runPython(GLUE);
    return py;
  })();

  created.catch(() => {
    runtime = null;
  });
  runtime = created;
  return runtime;
}

/** Run the assembly pipeline of the real piighost over the given detections. */
export async function assembleWithPiighost(
  text: string,
  detections: Entity[],
  pipeline: ConfigPipeline,
): Promise<AssembleResult> {
  const py = await loadPiighostRuntime();
  const payload = JSON.stringify({
    text,
    detections: detectionsToBridge(detections),
    config: toBridgeConfig(pipeline),
  });
  py.globals.set("__piighost_payload", payload);
  const raw = py.runPython("assemble(__piighost_payload)") as string;
  return parseAssembleResult(JSON.parse(raw));
}
