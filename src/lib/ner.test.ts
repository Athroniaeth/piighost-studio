import { describe, it, expect } from "vitest";
import { groupEntities, type RawToken } from "./ner";

const tok = (
  entity: string,
  score: number,
  start: number,
  end: number,
): RawToken => ({ entity, score, index: 0, word: "x", start, end });

describe("groupEntities", () => {
  const text = "Sarah Connor works at Cyberdyne in Los Angeles";

  it("merges B-/I- tokens of the same type into one entity", () => {
    const tokens = [tok("B-PER", 0.99, 0, 5), tok("I-PER", 0.97, 6, 12)];
    const entities = groupEntities(tokens, text);
    expect(entities).toHaveLength(1);
    expect(entities[0]).toMatchObject({ text: "Sarah Connor", label: "PER", start: 0, end: 12 });
    expect(entities[0].score).toBeCloseTo(0.98, 2);
  });

  it("splits adjacent tokens of different types", () => {
    const tokens = [tok("B-PER", 0.9, 0, 5), tok("B-LOC", 0.8, 35, 46)];
    const entities = groupEntities(tokens, text);
    expect(entities.map((e) => e.label)).toEqual(["PER", "LOC"]);
    expect(entities[1].text).toBe("Los Angeles");
  });

  it("starts a new entity on a B- tag even when the type repeats", () => {
    const tokens = [tok("B-PER", 0.9, 0, 5), tok("B-PER", 0.9, 6, 12)];
    expect(groupEntities(tokens, text)).toHaveLength(2);
  });

  it("ignores O (outside) tokens", () => {
    const tokens = [tok("O", 0.9, 0, 5)];
    expect(groupEntities(tokens, text)).toHaveLength(0);
  });

  it("returns an empty array for no tokens", () => {
    expect(groupEntities([], text)).toEqual([]);
  });
});
