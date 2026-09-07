import { describe, it, expect } from "vitest";
import {
  organizationLd,
  softwareApplicationLd,
  breadcrumbLd,
  faqPageLd,
  flattenFaqAnswer,
} from "./jsonld";

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
  it("flattens FAQ answer segments to plain text (code + link keep their text)", () => {
    expect(
      flattenFaqAnswer([
        "Install it with ",
        { code: "pip install 'piighost[config]'" },
        " then see ",
        { link: { href: "/philosophy", text: "the Philosophy page" } },
        ".",
      ]),
    ).toBe(
      "Install it with pip install 'piighost[config]' then see the Philosophy page.",
    );
  });
  it("faqPage structured data uses flattened answer text", () => {
    const f = faqPageLd([
      {
        question: "Q?",
        answer: ["Tokens like ", { code: "<<PERSON:1>>" }, " stay local."],
      },
    ]);
    expect(f["@type"]).toBe("FAQPage");
    expect(f.mainEntity[0].acceptedAnswer.text).toBe(
      "Tokens like <<PERSON:1>> stay local.",
    );
  });
  it("breadcrumb lists positions in order", () => {
    const b = breadcrumbLd([
      { name: "Home", item: "https://piighost.dev/en/" },
      { name: "piighost", item: "https://piighost.dev/en/piighost/" },
    ]);
    expect(b.itemListElement[1].position).toBe(2);
  });
});
