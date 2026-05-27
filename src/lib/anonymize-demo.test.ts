import { describe, it, expect } from "vitest";
import { DEMO, renderStep } from "./anonymize-demo";

describe("renderStep", () => {
  it("returns the raw text at step 0", () => {
    expect(renderStep(DEMO, 0)).toBe("Email Patrick at patrick@acme.com");
  });
  it("replaces all entities at the final step", () => {
    expect(renderStep(DEMO, DEMO.entities.length)).toBe("Email <<PERSON:1>> at <<EMAIL:1>>");
  });
  it("replaces only the first entity at step 1", () => {
    expect(renderStep(DEMO, 1)).toBe("Email <<PERSON:1>> at patrick@acme.com");
  });
});
