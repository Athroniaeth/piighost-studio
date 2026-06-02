import type { ConfigPipeline, DetectorConfig, Placeholder } from "./detector-config";
import type { LabelSpec } from "./labels";

function tomlString(value: string): string {
  if (!value.includes("'")) return `'${value}'`;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function basicString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

// TOML bare keys allow only [A-Za-z0-9_-]; anything else (spaces, accents,
// punctuation) must be a quoted key. Labels can be arbitrary words, so guard.
function tomlKey(key: string): string {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : basicString(key);
}

function patternsInline(patterns: Record<string, string>): string {
  const entries = Object.entries(patterns).map(
    ([label, pat]) => `${tomlKey(label)} = ${tomlString(pat)}`,
  );
  return `{ ${entries.join(", ")} }`;
}

function labelsToml(labels: LabelSpec): string {
  if (Array.isArray(labels)) return `[${labels.map(basicString).join(", ")}]`;
  const entries = Object.entries(labels).map(
    ([emitted, model]) => `${tomlKey(emitted)} = ${basicString(model)}`,
  );
  return `{ ${entries.join(", ")} }`;
}

function detectorToml(d: DetectorConfig, name?: string): string {
  const lines = ["[[detectors]]", `type = "${d.type}"`];
  const label = name ?? d.name;
  if (label) lines.push(`name = ${basicString(label)}`);
  switch (d.type) {
    case "regex":
      lines.push(`patterns = ${patternsInline(d.patterns)}`);
      break;
    case "transformers":
      lines.push(`model = ${basicString(d.model)}`, `threshold = ${d.threshold}`);
      if (d.labels) lines.push(`labels = ${labelsToml(d.labels)}`);
      break;
    case "gliner2":
      lines.push(
        `model = ${basicString(d.model)}`,
        `labels = ${labelsToml(d.labels)}`,
        `threshold = ${d.threshold}`,
        `flat_ner = ${d.flatNer}`,
      );
      break;
    case "llm":
      lines.push(
        `provider = ${basicString(d.provider)}`,
        `model = ${basicString(d.model)}`,
        `labels = ${labelsToml(d.labels)}`,
      );
      break;
  }
  return lines.join("\n");
}

function placeholderToml(p: Placeholder): string {
  const lines = [`placeholder_factory.type = ${basicString(p.type)}`];
  if (p.type === "label_hash" || p.type === "redact_hash") {
    lines.push(`placeholder_factory.hash_length = ${p.hashLength}`);
  }
  if (p.type === "mask") {
    lines.push(`placeholder_factory.mask_char = ${basicString(p.maskChar)}`);
  }
  return lines.join("\n");
}

/** Serialize a full pipeline to a piighost TOML config. Disabled detectors are
 *  omitted; stage sections reflect the enable/disable toggles. */
export function toToml(pipeline: ConfigPipeline): string {
  const parts: string[] = [
    `[pipeline]\nname = ${basicString(pipeline.name)}\nschema_version = 1`,
  ];
  for (const d of pipeline.detectors) {
    if (d.enabled) parts.push(detectorToml(d.config, d.name));
  }
  parts.push(`[span_resolver]\ntype = "${pipeline.spanResolver}"`);
  parts.push(`[entity_linker]\ntype = "${pipeline.entityLinker}"`);
  const entityResolver = [`[entity_resolver]`, `type = "${pipeline.entityResolver}"`];
  if (pipeline.entityResolver === "fuzzy") {
    entityResolver.push(`threshold = ${pipeline.entityResolverThreshold}`);
  }
  parts.push(entityResolver.join("\n"));
  parts.push(`[anonymizer]\n${placeholderToml(pipeline.placeholder)}`);
  return parts.join("\n\n") + "\n";
}

/** Optional piighost extra required by each detector type (regex needs none). */
const DETECTOR_EXTRA: Partial<Record<DetectorConfig["type"], string>> = {
  transformers: "transformers",
  gliner2: "gliner2",
  llm: "llm",
};

/** The piighost extras needed to actually load and run this pipeline. `config`
 *  is always required (that is where load_pipeline lives); enabled detectors each
 *  pull their own optional dependency. */
export function requiredExtras(pipeline: ConfigPipeline): string[] {
  const extras = new Set<string>(["config"]);
  for (const d of pipeline.detectors) {
    if (!d.enabled) continue;
    const extra = DETECTOR_EXTRA[d.config.type];
    if (extra) extras.add(extra);
  }
  return [...extras].sort();
}

/** Faithful, runnable Python: save the TOML, then load it with the official
 *  loader (direct detector instantiation is fragile, e.g. transformers needs a
 *  prebuilt HuggingFace pipeline object). The install line lists the extras the
 *  chosen detectors and token style actually require. */
export function toPython(pipeline: ConfigPipeline): string {
  const summary = pipeline.detectors
    .filter((d) => d.enabled)
    .map((d) => (d.config.type === "regex" ? `regex(${Object.keys(d.config.patterns).join(", ")})` : d.config.type))
    .join(", ");
  const extras = requiredExtras(pipeline).join(",");
  return [
    `# Pipeline "${pipeline.name}": ${summary}`,
    `# 1. Save the exported configuration as pipeline.toml`,
    `# 2. uv add 'piighost[${extras}]'   (or: pip install 'piighost[${extras}]')`,
    ``,
    `from piighost.config import load_pipeline`,
    ``,
    `pipeline, manifest = load_pipeline("pipeline.toml")`,
    ``,
    `# anonymized = pipeline.anonymize("your text here")`,
    ``,
  ].join("\n");
}
