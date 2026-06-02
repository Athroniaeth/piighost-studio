import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PresetList } from "./preset-list";

const items = [
  { name: "General PII", description: "Names and contact." },
  { name: "Healthcare (HIPAA)", description: "Patient data." },
];

describe("PresetList", () => {
  it("shows the title but keeps the list collapsed by default", () => {
    render(<PresetList title="Examples" items={items} loadLabel="Load" onLoad={() => {}} />);
    expect(screen.getByRole("button", { name: /Examples/ })).toBeInTheDocument();
    expect(screen.queryByText("General PII")).not.toBeInTheDocument();
  });

  it("expands to reveal names and descriptions when the header is clicked", async () => {
    render(<PresetList title="Examples" items={items} loadLabel="Load" onLoad={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /Examples/ }));
    expect(screen.getByText("General PII")).toBeInTheDocument();
    expect(screen.getByText("Patient data.")).toBeInTheDocument();
  });

  it("renders expanded when defaultOpen is set", () => {
    render(
      <PresetList title="Examples" items={items} loadLabel="Load" onLoad={() => {}} defaultOpen />,
    );
    expect(screen.getByText("General PII")).toBeInTheDocument();
  });

  it("calls onLoad with the clicked item", async () => {
    const onLoad = vi.fn();
    render(<PresetList title="Examples" items={items} loadLabel="Load" onLoad={onLoad} />);
    await userEvent.click(screen.getByRole("button", { name: /Examples/ }));
    await userEvent.click(screen.getAllByRole("button", { name: "Load" })[1]);
    expect(onLoad).toHaveBeenCalledWith(items[1]);
  });
});
