// src/components/playground/region.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Region } from "./region";

describe("Region", () => {
  it("renders the title and the children", () => {
    render(<Region title="Configure">body content</Region>);
    expect(screen.getByText("Configure")).toBeInTheDocument();
    expect(screen.getByText("body content")).toBeInTheDocument();
  });

  it("renders a step chip when step is provided", () => {
    render(<Region step={1} title="Configure">x</Region>);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders no step chip when step is omitted", () => {
    render(<Region title="Configure">x</Region>);
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("renders the action node", () => {
    render(<Region title="Configure" action={<button>act</button>}>x</Region>);
    expect(screen.getByRole("button", { name: "act" })).toBeInTheDocument();
  });
});
