import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
vi.mock("@/i18n/use-t", () => ({
  useT: () => ({ t: { playground: { tabDetector: "Detector", tabConfig: "Config" } } }),
}));

import { usePathname } from "next/navigation";
import { PlaygroundTabs } from "./playground-tabs";

const setPath = (p: string) =>
  (usePathname as unknown as ReturnType<typeof vi.fn>).mockReturnValue(p);

describe("PlaygroundTabs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("links to both playground surfaces", () => {
    setPath("/playground");
    render(<PlaygroundTabs />);
    expect(screen.getByRole("link", { name: "Detector" })).toHaveAttribute("href", "/playground");
    expect(screen.getByRole("link", { name: "Config" })).toHaveAttribute(
      "href",
      "/playground/config",
    );
  });

  it("marks Detector active on /playground", () => {
    setPath("/playground");
    render(<PlaygroundTabs />);
    expect(screen.getByRole("link", { name: "Detector" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Config" })).not.toHaveAttribute("aria-current");
  });

  it("marks Config active on /playground/config", () => {
    setPath("/playground/config");
    render(<PlaygroundTabs />);
    expect(screen.getByRole("link", { name: "Config" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Detector" })).not.toHaveAttribute("aria-current");
  });
});
