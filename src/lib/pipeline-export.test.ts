import { describe, it, expect } from "vitest";
import { toToml, toPython } from "./pipeline-export";
import type { Pipeline } from "./detector-config";

const pipeline: Pipeline = {
  name: "demo",
  detectors: [
    { type: "regex", patterns: { EMAIL: "\\w+@\\w+", QUOTE: "it's" } },
    {
      type: "gliner2",
      model: "onnx-community/gliner_small-v2.1",
      labels: ["person", "location"],
      threshold: 0.5,
      flatNer: true,
    },
  ],
};

describe("toToml", () => {
  it("emits the pipeline header with name and schema_version", () => {
    const toml = toToml(pipeline);
    expect(toml).toContain("[pipeline]");
    expect(toml).toContain('name = "demo"');
    expect(toml).toContain("schema_version = 1");
  });

  it("emits one [[detectors]] table per detector with its type", () => {
    const toml = toToml(pipeline);
    expect((toml.match(/\[\[detectors\]\]/g) ?? []).length).toBe(2);
    expect(toml).toContain('type = "regex"');
    expect(toml).toContain('type = "gliner2"');
  });

  it("writes regex patterns as a literal-string inline table", () => {
    const toml = toToml(pipeline);
    // literal strings keep backslashes verbatim
    expect(toml).toContain("EMAIL = '\\w+@\\w+'");
    // a pattern containing a single quote falls back to a basic string
    expect(toml).toContain('QUOTE = "it\'s"');
  });

  it("emits gliner2 fields including labels and flat_ner", () => {
    const toml = toToml(pipeline);
    expect(toml).toContain('model = "onnx-community/gliner_small-v2.1"');
    expect(toml).toContain('labels = ["person", "location"]');
    expect(toml).toContain("threshold = 0.5");
    expect(toml).toContain("flat_ner = true");
  });
});

describe("toPython", () => {
  it("loads the exported TOML via load_pipeline", () => {
    const py = toPython(pipeline);
    expect(py).toContain("from piighost.config import load_pipeline");
    expect(py).toContain('load_pipeline("pipeline.toml")');
  });

  it("summarizes the detectors as a comment", () => {
    const py = toPython(pipeline);
    expect(py).toContain('# Pipeline "demo"');
    expect(py).toContain("regex");
    expect(py).toContain("gliner2");
  });
});
