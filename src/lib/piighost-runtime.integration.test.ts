import { describe, it, expect, beforeAll } from "vitest";
import { assembleWithPiighost } from "./piighost-runtime";
import { defaultPipeline, type ConfigPipeline } from "./detector-config";
import type { Entity } from "./ner";

const det = (text: string, label: string, start: number, score = 0.9): Entity => ({
  text,
  label,
  score,
  start,
  end: start + text.length,
});

describe("assembleWithPiighost (real piighost via Pyodide)", () => {
  beforeAll(async () => {
    // Warm the runtime once (download + install) before the assertions.
    const base: ConfigPipeline = { ...defaultPipeline(), name: "warmup" };
    await assembleWithPiighost("warm up", [], base);
  }, 120_000);

  it("links case variants of the same occurrence to one id (label_counter)", async () => {
    const text = "London team. London is good. london too.";
    const cfg: ConfigPipeline = { ...defaultPipeline(), name: "t" };
    const r = await assembleWithPiighost(
      text,
      [det("London", "LOC", 0), det("London", "LOC", 13), det("london", "LOC", 29)],
      cfg,
    );
    expect(r.anonymized).toContain("<<LOC:1>>");
    expect(r.anonymized).not.toContain("<<LOC:2>>");
    expect(r.entities).toHaveLength(1);
    expect(r.entities[0].token).toBe("<<LOC:1>>");
  });

  it("produces a deterministic SHA-256 short hash (label_hash)", async () => {
    const cfg: ConfigPipeline = {
      ...defaultPipeline(),
      name: "h",
      placeholder: { type: "label_hash", hashLength: 8 },
    };
    const r1 = await assembleWithPiighost("Marie", [det("Marie", "PER", 0)], cfg);
    const r2 = await assembleWithPiighost("Marie", [det("Marie", "PER", 0)], cfg);
    expect(r1.entities[0].token).toMatch(/^<<PER:[0-9a-f]{8}>>$/);
    expect(r1.entities[0].token).toBe(r2.entities[0].token);
  });

  it("returns colored segments and source highlights", async () => {
    const cfg: ConfigPipeline = { ...defaultPipeline(), name: "s" };
    const r = await assembleWithPiighost("Hi Marie", [det("Marie", "PER", 3)], cfg);
    expect(r.segments).toEqual([
      { value: "Hi " },
      { value: "<<PER:1>>", label: "PER" },
    ]);
    expect(r.highlights).toEqual([
      { start: 3, end: 8, label: "PER", score: 0.9, text: "Marie" },
    ]);
  });
});
