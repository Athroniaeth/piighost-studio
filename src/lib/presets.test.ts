import { describe, it, expect } from "vitest";
import { PRESET_DETECTORS, PRESET_PIPELINES } from "./presets";

function regexPatterns(cfg: { type: string; patterns?: Record<string, string> }) {
  return cfg.type === "regex" ? Object.entries(cfg.patterns ?? {}) : [];
}

describe("PRESET_DETECTORS", () => {
  it("has the six expected bricks with unique names", () => {
    const names = PRESET_DETECTORS.map((d) => d.name);
    expect(names).toEqual([
      "Contact & web",
      "Financial identifiers",
      "API keys & secrets",
      "Dates",
      "People, orgs & places",
      "Medical condition",
    ]);
    expect(new Set(names).size).toBe(names.length);
  });

  it("gives every preset a non-empty description", () => {
    for (const d of PRESET_DETECTORS) expect(d.description.length).toBeGreaterThan(0);
  });

  it("only every regex pattern compiles", () => {
    for (const d of PRESET_DETECTORS) {
      for (const [label, pattern] of regexPatterns(d.config)) {
        expect(() => new RegExp(pattern), `${d.name}/${label}`).not.toThrow();
      }
    }
  });
});

describe("PRESET_PIPELINES", () => {
  it("has the six domain pipelines with unique names", () => {
    const names = PRESET_PIPELINES.map((p) => p.name);
    expect(names).toEqual([
      "General PII",
      "Healthcare (HIPAA)",
      "Banking & finance",
      "HR & recruiting",
      "Customer support / CRM",
      "Legal & contracts",
    ]);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every pipeline has detectors, default stages, and counter tokens", () => {
    for (const { pipeline } of PRESET_PIPELINES) {
      expect(pipeline.detectors.length).toBeGreaterThan(0);
      expect(pipeline.spanResolver).toBe("confidence");
      expect(pipeline.entityLinker).toBe("exact");
      expect(pipeline.entityResolver).toBe("merge");
      expect(pipeline.placeholder.type).toBe("label_counter");
      const dn = pipeline.detectors.map((d) => d.name);
      expect(new Set(dn).size).toBe(dn.length);
      for (const d of pipeline.detectors) expect(d.enabled).toBe(true);
    }
  });

  it("every regex pattern inside a pipeline compiles", () => {
    for (const { pipeline } of PRESET_PIPELINES) {
      for (const d of pipeline.detectors) {
        for (const [label, pattern] of regexPatterns(d.config)) {
          expect(() => new RegExp(pattern), `${pipeline.name}/${d.name}/${label}`).not.toThrow();
        }
      }
    }
  });
});
