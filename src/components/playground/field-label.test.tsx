// src/components/playground/field-label.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FieldLabel, STAGE_SELECT } from "./field-label";

describe("FieldLabel", () => {
  it("renders the label text", () => {
    render(<FieldLabel label="Span resolver" />);
    expect(screen.getByText("Span resolver")).toBeInTheDocument();
  });

  it("renders no help affordance when help is omitted", () => {
    render(<FieldLabel label="Span resolver" />);
    expect(screen.queryByText("?")).not.toBeInTheDocument();
  });

  it("renders a help affordance carrying the help text as a title when help is given", () => {
    render(<FieldLabel label="Span resolver" help="How spans are merged" />);
    const help = screen.getByText("?");
    expect(help).toHaveAttribute("title", "How spans are merged");
  });

  it("exports a stage-select class string", () => {
    expect(STAGE_SELECT).toContain("font-mono");
  });
});
