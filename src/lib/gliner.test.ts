import { describe, it, expect } from "vitest";
import { mapSpans, type RawSpan } from "./gliner";

describe("mapSpans", () => {
  it("maps gliner spans to Entity, renaming spanText -> text", () => {
    const spans: RawSpan[] = [
      { spanText: "Sarah Connor", start: 0, end: 12, label: "person", score: 0.97 },
      { spanText: "sarah@x.io", start: 20, end: 30, label: "email", score: 0.88 },
    ];
    expect(mapSpans(spans)).toEqual([
      { text: "Sarah Connor", label: "person", score: 0.97, start: 0, end: 12 },
      { text: "sarah@x.io", label: "email", score: 0.88, start: 20, end: 30 },
    ]);
  });

  it("returns an empty array for no spans", () => {
    expect(mapSpans([])).toEqual([]);
  });
});
