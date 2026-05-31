import { describe, it, expect } from "vitest";
import { toBridgeConfig, detectionsToBridge, parseAssembleResult } from "./piighost-bridge";
import { defaultPipeline } from "./detector-config";
import type { Entity } from "./ner";

describe("toBridgeConfig", () => {
  it("projects the pipeline stages and placeholder verbatim", () => {
    const p = { ...defaultPipeline(), name: "x", entityResolverThreshold: 0.9 };
    const b = toBridgeConfig(p);
    expect(b.spanResolver).toBe(p.spanResolver);
    expect(b.entityLinker).toBe(p.entityLinker);
    expect(b.entityResolver).toBe(p.entityResolver);
    expect(b.entityResolverThreshold).toBe(0.9);
    expect(b.placeholder).toEqual(p.placeholder);
  });
});

describe("detectionsToBridge", () => {
  it("maps Entity fields to piighost's Detection.from_dict shape", () => {
    const e: Entity = { text: "Marie", label: "PER", score: 0.8, start: 0, end: 5 };
    expect(detectionsToBridge([e])).toEqual([
      { text: "Marie", label: "PER", start_pos: 0, end_pos: 5, confidence: 0.8 },
    ]);
  });
});

describe("parseAssembleResult", () => {
  it("returns the validated shape", () => {
    const raw = {
      anonymized: "<<PER:1>>",
      entities: [{ label: "PER", text: "Marie", score: 1, token: "<<PER:1>>" }],
      segments: [{ value: "<<PER:1>>", label: "PER" }],
      highlights: [{ start: 0, end: 5, label: "PER", score: 1, text: "Marie" }],
    };
    expect(parseAssembleResult(raw)).toEqual(raw);
  });

  it("throws on a malformed payload", () => {
    expect(() => parseAssembleResult({ anonymized: "x" })).toThrow();
  });
});
