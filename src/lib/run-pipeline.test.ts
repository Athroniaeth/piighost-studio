import { describe, it, expect } from "vitest";
import { hashValue, assignToken, createTokenContext } from "./run-pipeline";

describe("hashValue", () => {
  it("is deterministic and respects the length", () => {
    expect(hashValue("Marie", 8)).toBe(hashValue("Marie", 8));
    expect(hashValue("Marie", 8)).toHaveLength(8);
    expect(hashValue("Marie", 16)).toHaveLength(16);
  });
});

describe("assignToken", () => {
  it("label_counter increments per label", () => {
    const ctx = createTokenContext();
    expect(assignToken({ type: "label_counter" }, "PER", "Marie", ctx)).toBe("<<PER:1>>");
    expect(assignToken({ type: "label_counter" }, "PER", "Jean", ctx)).toBe("<<PER:2>>");
    expect(assignToken({ type: "label_counter" }, "LOC", "Lyon", ctx)).toBe("<<LOC:1>>");
  });

  it("redact_counter increments globally and hides the label", () => {
    const ctx = createTokenContext();
    expect(assignToken({ type: "redact_counter" }, "PER", "Marie", ctx)).toBe("<<REDACT:1>>");
    expect(assignToken({ type: "redact_counter" }, "LOC", "Lyon", ctx)).toBe("<<REDACT:2>>");
  });

  it("label and redact are constant", () => {
    const ctx = createTokenContext();
    expect(assignToken({ type: "label" }, "PER", "Marie", ctx)).toBe("<<PER>>");
    expect(assignToken({ type: "redact" }, "PER", "Marie", ctx)).toBe("<<REDACT>>");
  });

  it("mask keeps the first char and masks the rest", () => {
    const ctx = createTokenContext();
    expect(assignToken({ type: "mask", maskChar: "*" }, "PER", "Marie", ctx)).toBe("M****");
  });

  it("hash styles use a hash of the value", () => {
    const ctx = createTokenContext();
    const tok = assignToken({ type: "label_hash", hashLength: 8 }, "PER", "Marie", ctx);
    expect(tok).toBe(`<<PER:${hashValue("Marie", 8)}>>`);
  });
});
