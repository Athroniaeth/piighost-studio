import { describe, it, expect } from "vitest";
import { SAMPLE_TEXTS } from "./sample-texts";

describe("SAMPLE_TEXTS", () => {
  it("has six entries with unique names", () => {
    expect(SAMPLE_TEXTS).toHaveLength(6);
    const names = SAMPLE_TEXTS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("gives every entry a non-empty name and text", () => {
    for (const s of SAMPLE_TEXTS) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.text.length).toBeGreaterThan(0);
    }
  });
});
