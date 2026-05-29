import { describe, it, expect } from "vitest";
import { toToml, toPython } from "./pipeline-export";
import type { ConfigPipeline } from "./detector-config";

const pipeline: ConfigPipeline = {
  name: "demo",
  detectors: [
    { name: "emails", enabled: true, config: { type: "regex", patterns: { EMAIL: "\\w+@\\w+", QUOTE: "it's" } } },
    {
      name: "pii",
      enabled: true,
      config: {
        type: "gliner2",
        model: "onnx-community/gliner_small-v2.1",
        labels: ["person", "location"],
        threshold: 0.5,
        flatNer: true,
      },
    },
    { name: "off", enabled: false, config: { type: "regex", patterns: { X: "x" } } },
  ],
  spanResolver: true,
  entityLinker: false,
  entityResolver: true,
  placeholder: { type: "mask", maskChar: "*" },
};

describe("toToml", () => {
  it("emits the pipeline header", () => {
    const toml = toToml(pipeline);
    expect(toml).toContain("[pipeline]");
    expect(toml).toContain('name = "demo"');
    expect(toml).toContain("schema_version = 1");
  });

  it("emits only enabled detectors", () => {
    const toml = toToml(pipeline);
    expect((toml.match(/\[\[detectors\]\]/g) ?? []).length).toBe(2);
  });

  it("writes regex patterns as literal strings with a basic-string fallback", () => {
    const toml = toToml(pipeline);
    expect(toml).toContain("EMAIL = '\\w+@\\w+'");
    expect(toml).toContain('QUOTE = "it\'s"');
  });

  it("emits stage sections with the right type for each toggle", () => {
    const toml = toToml(pipeline);
    expect(toml).toContain('[span_resolver]\ntype = "confidence"');
    expect(toml).toContain('[entity_linker]\ntype = "disabled"');
    expect(toml).toContain('[entity_resolver]\ntype = "merge"');
  });

  it("emits the anonymizer placeholder factory with its field", () => {
    const toml = toToml(pipeline);
    expect(toml).toContain("[anonymizer]");
    expect(toml).toContain('placeholder_factory.type = "mask"');
    expect(toml).toContain('placeholder_factory.mask_char = "*"');
  });
});

describe("toPython", () => {
  it("loads the exported TOML via load_pipeline", () => {
    const py = toPython(pipeline);
    expect(py).toContain("from piighost.config import load_pipeline");
    expect(py).toContain('load_pipeline("pipeline.toml")');
  });

  it("summarizes only enabled detectors", () => {
    const py = toPython(pipeline);
    expect(py).toContain('# Pipeline "demo"');
    expect(py).toContain("gliner2");
    expect(py).not.toContain("X");
  });
});
