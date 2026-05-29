import { describe, it, expect } from "vitest";
import { hashValue, assignToken, createTokenContext, assemblePipeline } from "./run-pipeline";
import { defaultPipeline, type ConfigPipeline } from "./detector-config";
import type { Entity } from "./ner";

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
    const red = assignToken({ type: "redact_hash", hashLength: 6 }, "PER", "Marie", ctx);
    expect(red).toBe(`<<REDACT:${hashValue("Marie", 6)}>>`);
  });
});

const e = (text: string, label: string, start: number, score = 1): Entity => ({
  text,
  label,
  score,
  start,
  end: start + text.length,
});

describe("assemblePipeline", () => {
  const base: ConfigPipeline = { ...defaultPipeline(), name: "t" };
  const text = "Marie called Marie and Lyon";

  it("links repeats of the same value to the same token (label_counter)", () => {
    const out = assemblePipeline([e("Marie", "PER", 0), e("Marie", "PER", 13), e("Lyon", "LOC", 23)], base, text);
    expect(out.anonymized).toBe("<<PER:1>> called <<PER:1>> and <<LOC:1>>");
  });

  it("gives each occurrence its own token when linking and resolving are disabled", () => {
    const cfg = { ...base, entityLinker: "disabled" as const, entityResolver: "disabled" as const };
    const out = assemblePipeline([e("Marie", "PER", 0), e("Marie", "PER", 13)], cfg, text);
    expect(out.anonymized).toBe("<<PER:1>> called <<PER:2>> and Lyon");
  });

  it("groups case variants when the resolver is fuzzy", () => {
    const cfg = { ...base, entityResolver: "fuzzy" as const };
    const out = assemblePipeline([e("Marie", "PER", 0), e("marie", "PER", 13)], cfg, text);
    expect(out.anonymized).toBe("<<PER:1>> called <<PER:1>> and Lyon");
  });

  it("drops the lower-scoring span when two overlap", () => {
    const overlap = "Cyberdyne Systems";
    const dets = [e("Cyberdyne", "ORG", 0, 0.6), e("Cyberdyne Systems", "ORG", 0, 0.9)];
    const out = assemblePipeline(dets, { ...base, name: "o" }, overlap);
    expect(out.entities).toHaveLength(1);
    expect(out.entities[0].text).toBe("Cyberdyne Systems");
  });

  it("keeps overlaps when the span resolver is disabled", () => {
    const dets = [e("ab", "X", 0, 0.6), e("abc", "X", 0, 0.9)];
    const out = assemblePipeline(dets, { ...base, spanResolver: "disabled" as const }, "abc");
    expect(out.entities).toHaveLength(2);
  });
});
