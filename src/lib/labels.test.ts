import { describe, it, expect } from "vitest";
import { parseLabels, assignLabelColors, LABEL_STYLES } from "./labels";

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

describe("assignLabelColors", () => {
  it("gives distinct labels distinct colors (person != organization)", () => {
    const colors = assignLabelColors(["person", "organization"]);
    expect(colors.get("person")).not.toBe(colors.get("organization"));
  });

  it("assigns a distinct color to each of many labels (up to the palette size)", () => {
    const labels = ["person", "email", "phone", "address", "iban", "company", "city", "date"];
    const colors = assignLabelColors(labels);
    expect(new Set(colors.values()).size).toBe(labels.length);
  });

  it("keeps fixed NER labels on their dedicated styles", () => {
    const colors = assignLabelColors(["PER", "ORG", "LOC", "MISC"]);
    expect(colors.get("PER")).toBe(LABEL_STYLES.PER);
    expect(colors.get("ORG")).toBe(LABEL_STYLES.ORG);
  });

  it("gives a repeated label the same color and ignores duplicates", () => {
    const colors = assignLabelColors(["email", "person", "email"]);
    expect(colors.size).toBe(2);
  });
});
