import { describe, it, expect } from "vitest";
import { localePath, swapLocale, stripLocale } from "./locale-path";

describe("localePath", () => {
  it("prefixes a root path with the locale and trailing slash", () => {
    expect(localePath("en", "/")).toBe("/en/");
    expect(localePath("fr", "/")).toBe("/fr/");
  });
  it("prefixes a nested path", () => {
    expect(localePath("en", "/piighost")).toBe("/en/piighost/");
    expect(localePath("fr", "/playground/detector")).toBe("/fr/playground/detector/");
  });
  it("preserves an existing query string without a trailing slash on it", () => {
    expect(localePath("en", "/playground/detector?edit=x")).toBe("/en/playground/detector/?edit=x");
  });
});

describe("stripLocale", () => {
  it("removes a leading locale segment", () => {
    expect(stripLocale("/en/piighost/")).toBe("/piighost");
    expect(stripLocale("/fr/")).toBe("/");
    expect(stripLocale("/en")).toBe("/");
  });
  it("returns / for a non-localized path", () => {
    expect(stripLocale("/")).toBe("/");
  });
});

describe("swapLocale", () => {
  it("swaps the locale segment preserving the rest", () => {
    expect(swapLocale("/en/piighost/", "fr")).toBe("/fr/piighost/");
    expect(swapLocale("/fr/", "en")).toBe("/en/");
  });
});
