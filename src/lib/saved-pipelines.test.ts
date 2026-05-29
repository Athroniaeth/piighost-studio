import { describe, it, expect, beforeEach } from "vitest";
import {
  serialize,
  parse,
  loadSavedPipelines,
  savePipeline,
  deleteSavedPipeline,
} from "./saved-pipelines";
import { defaultPipeline } from "./detector-config";

const pipe = defaultPipeline();

describe("serialize/parse", () => {
  it("round-trips a list", () => {
    const list = [{ name: "p1", pipeline: pipe }];
    expect(parse(serialize(list))).toEqual(list);
  });

  it("returns [] for null or invalid input, drops malformed entries", () => {
    expect(parse(null)).toEqual([]);
    expect(parse("nope")).toEqual([]);
    expect(parse(JSON.stringify([{ name: 1 }, { name: "ok", pipeline: pipe }]))).toEqual([
      { name: "ok", pipeline: pipe },
    ]);
  });
});

describe("localStorage store", () => {
  beforeEach(() => window.localStorage.clear());

  it("saves, replaces by name, and deletes", () => {
    savePipeline("a", pipe);
    expect(loadSavedPipelines()).toEqual([{ name: "a", pipeline: pipe }]);
    const renamed = { ...pipe, name: "a" };
    savePipeline("a", renamed);
    expect(loadSavedPipelines()).toEqual([{ name: "a", pipeline: renamed }]);
    expect(deleteSavedPipeline("a")).toEqual([]);
  });
});
