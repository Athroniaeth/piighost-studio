import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PresetList } from "./preset-list";

const items = [
  { name: "General PII", description: "Names and contact." },
  { name: "Healthcare (HIPAA)", description: "Patient data." },
];

describe("PresetList", () => {
  it("renders the title, names, and descriptions", () => {
    render(<PresetList title="Examples" items={items} loadLabel="Load" onLoad={() => {}} />);
    expect(screen.getByText("Examples")).toBeInTheDocument();
    expect(screen.getByText("General PII")).toBeInTheDocument();
    expect(screen.getByText("Patient data.")).toBeInTheDocument();
  });

  it("calls onLoad with the clicked item", async () => {
    const onLoad = vi.fn();
    render(<PresetList title="Examples" items={items} loadLabel="Load" onLoad={onLoad} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Load" })[1]);
    expect(onLoad).toHaveBeenCalledWith(items[1]);
  });
});
