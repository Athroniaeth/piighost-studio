import { describe, it, expect } from "vitest";
import { runRegex } from "./regex-detect";

describe("runRegex", () => {
  it("matches one pattern and reports label + offsets", () => {
    const out = runRegex({ EMAIL: "\\w+@\\w+\\.\\w+" }, "write to a@b.io please");
    expect(out).toEqual([
      { text: "a@b.io", label: "EMAIL", score: 1, start: 9, end: 15 },
    ]);
  });

  it("finds all occurrences of a pattern", () => {
    const out = runRegex({ N: "\\d+" }, "1 and 22 and 333");
    expect(out.map((e) => e.text)).toEqual(["1", "22", "333"]);
  });

  it("returns matches from several patterns sorted by position", () => {
    const out = runRegex({ NUM: "\\d+", WORD: "[a-z]+" }, "ab 12");
    expect(out.map((e) => `${e.label}:${e.text}`)).toEqual(["WORD:ab", "NUM:12"]);
  });

  it("skips an invalid pattern instead of throwing", () => {
    const out = runRegex({ BAD: "(", OK: "\\d" }, "x 5");
    expect(out.map((e) => e.label)).toEqual(["OK"]);
  });

  it("does not loop forever on a zero-width pattern", () => {
    const out = runRegex({ Z: "a*" }, "baa");
    expect(Array.isArray(out)).toBe(true);
  });
});
