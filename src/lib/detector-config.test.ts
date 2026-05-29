import { describe, it, expect } from "vitest";
import { runDetector, defaultConfig, type DetectorConfig } from "./detector-config";

describe("runDetector", () => {
  it("runs a regex detector in the browser", async () => {
    const cfg: DetectorConfig = { type: "regex", patterns: { D: "\\d+" } };
    const out = await runDetector(cfg, "a 7 b");
    expect(out.map((e) => e.text)).toEqual(["7"]);
  });

  it("rejects an llm detector (not runnable in the browser)", async () => {
    const cfg: DetectorConfig = {
      type: "llm",
      provider: "mistral",
      model: "x",
      labels: ["PER"],
    };
    await expect(runDetector(cfg, "hi")).rejects.toThrow();
  });
});

describe("defaultConfig", () => {
  it("gives a usable default per type", () => {
    expect(defaultConfig("regex").type).toBe("regex");
    expect(defaultConfig("gliner2").type).toBe("gliner2");
  });
});
