import { describe, it, expect } from "vitest";
import { parseLabels, assignLabelColors, LABEL_STYLES } from "./labels";
import { internalLabels, remapLabel, rowsToLabelSpec, labelSpecToRows } from "./labels";

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

describe("rowsToLabelSpec", () => {
  const rows = (...pairs: [string, string][]) =>
    pairs.map(([model, emitted]) => ({ model, emitted }));

  it("returns a plain list when no row remaps", () => {
    expect(rowsToLabelSpec(rows(["person", ""], ["location", ""]))).toEqual([
      "person",
      "location",
    ]);
  });
  it("treats emitted === model as identity (still a list)", () => {
    expect(rowsToLabelSpec(rows(["person", "person"]))).toEqual(["person"]);
  });
  it("returns an {emitted: model} dict when any row remaps", () => {
    expect(rowsToLabelSpec(rows(["person", "PERSONNE"], ["location", ""]))).toEqual({
      PERSONNE: "person",
      location: "location",
    });
  });
  it("trims fields and drops rows whose model is blank", () => {
    expect(rowsToLabelSpec(rows([" person ", " PERSONNE "], ["  ", "X"]))).toEqual({
      PERSONNE: "person",
    });
  });
  it("dedupes by model, case-insensitively, keeping the first row", () => {
    expect(rowsToLabelSpec(rows(["person", "A"], ["PERSON", "B"]))).toEqual({
      A: "person",
    });
  });
  it("returns an empty list for no usable rows", () => {
    expect(rowsToLabelSpec(rows(["", ""]))).toEqual([]);
  });
});

describe("labelSpecToRows", () => {
  it("maps a list to rows with an empty emitted field", () => {
    expect(labelSpecToRows(["person", "location"])).toEqual([
      { model: "person", emitted: "" },
      { model: "location", emitted: "" },
    ]);
  });
  it("maps a dict to {model, emitted} rows", () => {
    expect(labelSpecToRows({ PERSONNE: "person" })).toEqual([
      { model: "person", emitted: "PERSONNE" },
    ]);
  });
  it("collapses an identity dict entry to a blank emitted field", () => {
    expect(labelSpecToRows({ person: "person", LIEU: "location" })).toEqual([
      { model: "person", emitted: "" },
      { model: "location", emitted: "LIEU" },
    ]);
  });
});
