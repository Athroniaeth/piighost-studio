import { describe, it, expect } from "vitest";
import { organizationLd, softwareApplicationLd, breadcrumbLd } from "./jsonld";

describe("jsonld builders", () => {
  it("organization has sameAs GitHub + PyPI", () => {
    const o = organizationLd();
    expect(o["@type"]).toBe("Organization");
    expect(o.sameAs).toEqual(
      expect.arrayContaining(["https://github.com/Athroniaeth/piighost"]),
    );
  });
  it("software application is a free Python DeveloperApplication", () => {
    const s = softwareApplicationLd();
    expect(s["@type"]).toBe("SoftwareApplication");
    expect(s.applicationCategory).toBe("DeveloperApplication");
    expect(s.offers.price).toBe("0");
  });
  it("breadcrumb lists positions in order", () => {
    const b = breadcrumbLd([
      { name: "Home", item: "https://piighost.dev/en/" },
      { name: "piighost", item: "https://piighost.dev/en/piighost/" },
    ]);
    expect(b.itemListElement[1].position).toBe(2);
  });
});
