import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { SampleTextPicker } from "./sample-text-picker";
import { SAMPLE_TEXTS } from "@/lib/sample-texts";

describe("SampleTextPicker", () => {
  it("renders the label and one option per sample", () => {
    render(<SampleTextPicker label="Load sample text" onPick={() => {}} />);
    const select = screen.getByRole("combobox", { name: "Load sample text" });
    expect(select.querySelectorAll("option")).toHaveLength(SAMPLE_TEXTS.length + 1);
  });

  it("calls onPick with the chosen sample's text", async () => {
    const onPick = vi.fn();
    render(<SampleTextPicker label="Load sample text" onPick={onPick} />);
    const first = SAMPLE_TEXTS[0];
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Load sample text" }),
      first.name,
    );
    expect(onPick).toHaveBeenCalledWith(first.text);
  });
});
