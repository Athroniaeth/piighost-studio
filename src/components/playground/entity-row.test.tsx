// src/components/playground/entity-row.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EntityRow } from "./entity-row";

describe("EntityRow", () => {
  it("renders the label, the surface text, and a rounded percentage score", () => {
    render(
      <ul>
        <EntityRow label="PERSON" text="Marie Curie" score={0.873} colors={new Map()} />
      </ul>,
    );
    expect(screen.getByText("PERSON")).toBeInTheDocument();
    expect(screen.getByText("Marie Curie")).toBeInTheDocument();
    expect(screen.getByText("87%")).toBeInTheDocument();
  });

  it("uses a provided color class for the label when present", () => {
    render(
      <ul>
        <EntityRow
          label="LOC"
          text="Paris"
          score={0.5}
          colors={new Map([["LOC", "bg-rose-500"]])}
        />
      </ul>,
    );
    expect(screen.getByText("LOC")).toHaveClass("bg-rose-500");
  });
});
