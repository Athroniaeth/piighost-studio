import { describe, it, expect, beforeEach } from "vitest";
import {
  serialize,
  parse,
  loadSaved,
  saveDetector,
  deleteSaved,
  type SavedDetector,
} from "./saved-detectors";
import type { DetectorConfig } from "./detector-config";

const cfg: DetectorConfig = { type: "regex", patterns: { EMAIL: "\\w+@\\w+" } };

describe("serialize/parse", () => {
  it("round-trips a list", () => {
    const list: SavedDetector[] = [{ name: "a", config: cfg }];
    expect(parse(serialize(list))).toEqual(list);
  });

  it("returns [] for null or invalid input", () => {
    expect(parse(null)).toEqual([]);
    expect(parse("not json")).toEqual([]);
  });

  it("drops malformed entries", () => {
    const raw = JSON.stringify([{ name: "ok", config: cfg }, { name: 5 }, { config: cfg }, 42]);
    expect(parse(raw)).toEqual([{ name: "ok", config: cfg }]);
  });
});

describe("localStorage store", () => {
  beforeEach(() => window.localStorage.clear());

  it("saves and loads a detector", () => {
    saveDetector("emails", cfg);
    expect(loadSaved()).toEqual([{ name: "emails", config: cfg }]);
  });

  it("replaces an entry with the same name", () => {
    saveDetector("x", cfg);
    const cfg2: DetectorConfig = { type: "regex", patterns: { N: "\\d+" } };
    const after = saveDetector("x", cfg2);
    expect(after).toEqual([{ name: "x", config: cfg2 }]);
  });

  it("deletes by name", () => {
    saveDetector("x", cfg);
    expect(deleteSaved("x")).toEqual([]);
  });
});
