import { describe, it, expect } from "vitest";
import { isOnnxNoise } from "./onnx-log-filter";

describe("isOnnxNoise", () => {
  it("matches the node-assignment warning (with ANSI codes and timestamp)", () => {
    const line =
      "\x1b[0;93m2026-05-29 12:08:43.924199 [W:onnxruntime:, session_state.cc:1166 VerifyEachNodeIsAssignedToAnEp] Some nodes were not assigned to the preferred execution providers\x1b[m";
    expect(isOnnxNoise([line])).toBe(true);
  });

  it("matches the verbose-output follow-up line", () => {
    expect(isOnnxNoise(["[W:onnxruntime] Rerunning with verbose output on a non-minimal build"])).toBe(true);
  });

  it("leaves unrelated messages alone", () => {
    expect(isOnnxNoise(["NER playground failed", new Error("boom")])).toBe(false);
    expect(isOnnxNoise(["onnxruntime: real failure loading model"])).toBe(false);
  });
});
