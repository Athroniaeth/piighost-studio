import { describe, it, expect } from "vitest";
import { parseLabels } from "./labels";

describe("parseLabels", () => {
  it("splits on commas and trims", () => {
    expect(parseLabels("person, email , phone")).toEqual(["person", "email", "phone"]);
  });

  it("drops empty segments", () => {
    expect(parseLabels("person,,  , email,")).toEqual(["person", "email"]);
  });

  it("deduplicates case-insensitively, keeping first spelling", () => {
    expect(parseLabels("Person, person, PERSON, email")).toEqual(["Person", "email"]);
  });

  it("returns an empty array for blank input", () => {
    expect(parseLabels("   ")).toEqual([]);
  });
});
