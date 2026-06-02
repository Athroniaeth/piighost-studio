import { describe, it, expect } from "vitest";
import { parseLabels, assignLabelColors, LABEL_STYLES } from "./labels";
import {
  parseLabelSpec,
  labelSpecToText,
  internalLabels,
  remapLabel,
} from "./labels";

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

describe("parseLabelSpec", () => {
  it("returns a plain list when every line is identity", () => {
    expect(parseLabelSpec("person\norganization")).toEqual(["person", "organization"]);
  });
  it("returns an {emitted: model} dict when any line maps", () => {
    expect(parseLabelSpec("PERSONNE: person\norganization")).toEqual({
      PERSONNE: "person",
      organization: "organization",
    });
  });
  it("trims, skips blank lines, and dedupes by emitted (case-insensitive)", () => {
    expect(parseLabelSpec("  person \n\nPERSON\n")).toEqual(["person"]);
  });
  it("ignores a line whose emitted or model side is empty", () => {
    expect(parseLabelSpec("person\n: x\nLIEU:")).toEqual(["person"]);
  });
});

describe("labelSpecToText", () => {
  it("round-trips a list (one per line)", () => {
    expect(labelSpecToText(["a", "b"])).toBe("a\nb");
  });
  it("renders a dict, identity entries as a bare label", () => {
    expect(labelSpecToText({ PERSONNE: "person", organization: "organization" })).toBe(
      "PERSONNE: person\norganization",
    );
  });
});

describe("internalLabels", () => {
  it("returns the list itself, or the dict values", () => {
    expect(internalLabels(["a", "b"])).toEqual(["a", "b"]);
    expect(internalLabels({ PERSONNE: "person" })).toEqual(["person"]);
  });
});

describe("remapLabel", () => {
  it("is identity for a list", () => {
    expect(remapLabel("person", ["person"])).toBe("person");
  });
  it("maps a model label back to the emitted label for a dict", () => {
    expect(remapLabel("person", { PERSONNE: "person" })).toBe("PERSONNE");
  });
  it("falls back to the input when unmapped", () => {
    expect(remapLabel("date", { PERSONNE: "person" })).toBe("date");
  });
});
