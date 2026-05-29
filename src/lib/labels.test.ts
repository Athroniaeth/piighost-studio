import { describe, it, expect } from "vitest";
import { parseLabels } from "./labels";
import { hashLabelColor, LABEL_PALETTE } from "./labels";

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

describe("hashLabelColor", () => {
  it("is deterministic for the same label", () => {
    expect(hashLabelColor("email")).toBe(hashLabelColor("email"));
  });

  it("returns a class string from the palette", () => {
    expect(LABEL_PALETTE).toContain(hashLabelColor("phone number"));
  });

  it("maps different labels to (generally) different buckets", () => {
    const colors = new Set(["email", "person", "iban", "address"].map(hashLabelColor));
    expect(colors.size).toBeGreaterThan(1);
  });
});
