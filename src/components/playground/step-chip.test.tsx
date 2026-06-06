// src/components/playground/step-chip.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StepChip } from "./step-chip";

describe("StepChip", () => {
  it("shows the ordinal number when not done", () => {
    render(<StepChip n={2} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("replaces the number with a check icon when done", () => {
    const { container } = render(<StepChip n={2} done />);
    expect(screen.queryByText("2")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
