import type { DetectorConfig, Pipeline } from "./detector-config";

/** TOML string for a value: literal string for regex (keeps backslashes), with a
 *  basic-string fallback when the value contains a single quote. */
function tomlString(value: string): string {
  if (!value.includes("'")) return `'${value}'`;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Double-quoted basic string (for non-regex string fields). */
function basicString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function patternsInline(patterns: Record<string, string>): string {
  const entries = Object.entries(patterns).map(
    ([label, pat]) => `${label} = ${tomlString(pat)}`,
  );
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

/** Serialize a pipeline to a piighost TOML config. The four non-detector stages
 *  (span_resolver / entity_linker / entity_resolver / anonymizer) are omitted so
 *  the library applies its defaults. */
export function toToml(pipeline: Pipeline): string {
  const header = `[pipeline]\nname = ${basicString(pipeline.name)}\nschema_version = 1\n`;
  const detectors = pipeline.detectors.map(detectorToml).join("\n\n");
  return `${header}\n${detectors}\n`;
}

/** Faithful, runnable Python: save the TOML, then load it with the official
 *  loader. (Direct detector instantiation is intentionally avoided: some
 *  detectors, e.g. transformers, need a prebuilt HuggingFace pipeline object.) */
export function toPython(pipeline: Pipeline): string {
  const summary = pipeline.detectors
    .map((d) => (d.type === "regex" ? `regex(${Object.keys(d.patterns).join(", ")})` : d.type))
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
