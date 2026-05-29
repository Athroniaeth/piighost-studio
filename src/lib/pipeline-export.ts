import type { ConfigPipeline, DetectorConfig, Placeholder } from "./detector-config";

function tomlString(value: string): string {
  if (!value.includes("'")) return `'${value}'`;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function basicString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function patternsInline(patterns: Record<string, string>): string {
  const entries = Object.entries(patterns).map(([label, pat]) => `${label} = ${tomlString(pat)}`);
  return `{ ${entries.join(", ")} }`;
}

function detectorToml(d: DetectorConfig): string {
  const lines = ["[[detectors]]", `type = "${d.type}"`];
  if (d.name) lines.push(`name = ${basicString(d.name)}`);
  switch (d.type) {
    case "regex":
      lines.push(`patterns = ${patternsInline(d.patterns)}`);
      break;
    case "transformers":
      lines.push(`model = ${basicString(d.model)}`, `threshold = ${d.threshold}`);
      break;
    case "gliner2":
      lines.push(
        `model = ${basicString(d.model)}`,
        `labels = [${d.labels.map(basicString).join(", ")}]`,
        `threshold = ${d.threshold}`,
        `flat_ner = ${d.flatNer}`,
      );
      break;
    case "llm":
      lines.push(
        `provider = ${basicString(d.provider)}`,
        `model = ${basicString(d.model)}`,
        `labels = [${d.labels.map(basicString).join(", ")}]`,
      );
      break;
  }
  return lines.join("\n");
}

function placeholderToml(p: Placeholder): string {
  const lines = [`placeholder_factory.type = "${p.type}"`];
  if (p.type === "label_hash" || p.type === "redact_hash" || p.type === "faker_hash") {
    lines.push(`placeholder_factory.hash_length = ${p.hashLength}`);
  }
  if (p.type === "mask") {
    lines.push(`placeholder_factory.mask_char = ${basicString(p.maskChar)}`);
  }
  if (p.type === "faker" || p.type === "faker_counter" || p.type === "faker_hash") {
    lines.push(`placeholder_factory.locale = ${basicString(p.locale)}`);
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
    if (d.enabled) parts.push(detectorToml(d.config));
  }
  parts.push(`[span_resolver]\ntype = "${pipeline.spanResolver ? "confidence" : "disabled"}"`);
  parts.push(`[entity_linker]\ntype = "${pipeline.entityLinker ? "exact" : "disabled"}"`);
  parts.push(`[entity_resolver]\ntype = "${pipeline.entityResolver ? "merge" : "disabled"}"`);
  parts.push(`[anonymizer]\n${placeholderToml(pipeline.placeholder)}`);
  return parts.join("\n\n") + "\n";
}

/** Faithful, runnable Python: save the TOML, then load it with the official
 *  loader (direct detector instantiation is fragile, e.g. transformers needs a
 *  prebuilt HuggingFace pipeline object). */
export function toPython(pipeline: ConfigPipeline): string {
  const summary = pipeline.detectors
    .filter((d) => d.enabled)
    .map((d) => (d.config.type === "regex" ? `regex(${Object.keys(d.config.patterns).join(", ")})` : d.config.type))
    .join(", ");
  return [
    `# Pipeline "${pipeline.name}": ${summary}`,
    `# 1. Save the exported configuration as pipeline.toml`,
    `# 2. uv add piighost   (or: pip install piighost)`,
    ``,
    `from piighost.config import load_pipeline`,
    ``,
    `pipeline, manifest = load_pipeline("pipeline.toml")`,
    ``,
    `# anonymized = pipeline.anonymize("your text here")`,
    ``,
  ].join("\n");
}
