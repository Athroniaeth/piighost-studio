import { describe, it, expect } from "vitest";
import { toToml, toPython, requiredExtras } from "./pipeline-export";
import type { ConfigPipeline } from "./detector-config";
import { defaultPipeline } from "./detector-config";

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
  spanResolver: "confidence",
  entityLinker: "disabled",
  entityResolver: "merge",
  entityResolverThreshold: 0.85,
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

  it("emits the pipeline detector name in its [[detectors]] block", () => {
    const toml = toToml(pipeline);
    expect(toml).toContain('name = "emails"');
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

  it("emits the entity_resolver threshold only for fuzzy", () => {
    expect(toToml(pipeline)).not.toContain("threshold = 0.85");
    const fuzzy = toToml({ ...pipeline, entityResolver: "fuzzy" });
    expect(fuzzy).toContain('[entity_resolver]\ntype = "fuzzy"\nthreshold = 0.85');
  });

  it("emits the anonymizer placeholder factory with its field", () => {
    const toml = toToml(pipeline);
    expect(toml).toContain("[anonymizer]");
    expect(toml).toContain('placeholder_factory.type = "mask"');
    expect(toml).toContain('placeholder_factory.mask_char = "*"');
  });
});

describe("requiredExtras", () => {
  it("always includes config and the extras of enabled detectors", () => {
    expect(requiredExtras(pipeline)).toEqual(["config", "gliner2"]);
  });

  it("ignores disabled detectors", () => {
    const offPipe: ConfigPipeline = {
      ...pipeline,
      detectors: [{ name: "off", enabled: false, config: { type: "gliner2", model: "onnx-community/gliner_small-v2.1", labels: ["x"], threshold: 0.5, flatNer: true } }],
    };
    expect(requiredExtras(offPipe)).toEqual(["config"]);
  });
});

describe("toPython", () => {
  it("loads the exported TOML via load_pipeline", () => {
    const py = toPython(pipeline);
    expect(py).toContain("from piighost.config import load_pipeline");
    expect(py).toContain('load_pipeline("pipeline.toml")');
  });

  it("lists the required extras in the install line", () => {
    expect(toPython(pipeline)).toContain("piighost[config,gliner2]");
  });

  it("summarizes only enabled detectors", () => {
    const py = toPython(pipeline);
    expect(py).toContain('# Pipeline "demo"');
    expect(py).toContain("gliner2");
    expect(py).not.toContain("X");
  });
});

describe("toToml detector labels (mapping)", () => {
  const withGliner = (labels: string[] | Record<string, string>) => ({
    ...defaultPipeline(),
    name: "p",
    detectors: [
      {
        name: "g",
        enabled: true,
        config: {
          type: "gliner2" as const,
          model: "onnx-community/gliner_small-v2.1" as const,
          labels,
          threshold: 0.5,
          flatNer: true,
        },
      },
    ],
  });

  it("emits a plain list for list labels", () => {
    expect(toToml(withGliner(["person", "org"]))).toContain('labels = ["person", "org"]');
  });

  it("emits an inline table for a mapping", () => {
    expect(toToml(withGliner({ PERSONNE: "person" }))).toContain('labels = { PERSONNE = "person" }');
  });

  it("quotes an emitted-label key that is not bare-key safe", () => {
    expect(toToml(withGliner({ "phone number": "phone" }))).toContain(
      'labels = { "phone number" = "phone" }',
    );
  });
});
