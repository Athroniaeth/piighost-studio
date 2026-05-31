import { loadPyodide, type PyodideInterface } from "pyodide";
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
const PIIGHOST_VERSION = "0.12.0";

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

let runtime: Promise<PyodideInterface> | null = null;

/** Lazily load Pyodide, install piighost, and define the glue. Cached; evicted
 *  on failure so a later Retry re-downloads instead of replaying a rejection. */
export function loadPiighostRuntime(): Promise<PyodideInterface> {
  if (runtime) return runtime;

  const created = (async () => {
    const inBrowser = typeof window !== "undefined";
    const py = await loadPyodide(
      inBrowser
        ? { indexURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/` }
        : {},
    );
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
