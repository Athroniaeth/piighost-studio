// src/components/playground/loading-pane.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LoadingPane } from "./loading-pane";

describe("LoadingPane", () => {
  it("shows the message and the percentage when progress is a number", () => {
    render(<LoadingPane progress={42} message="Loading model" />);
    expect(screen.getByText("Loading model")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("shows no percentage when progress is null (indeterminate)", () => {
    render(<LoadingPane progress={null} message="Loading runtime" />);
    expect(screen.getByText("Loading runtime")).toBeInTheDocument();
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  it("renders an optional note", () => {
    render(<LoadingPane progress={null} message="Loading" note="First load is slow" />);
    expect(screen.getByText("First load is slow")).toBeInTheDocument();
  });
});
