import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/i18n/use-t", () => ({
  useT: () => ({
    t: {
      playground: {
        labelSearchedPlaceholder: "person",
        labelEmittedPlaceholder: "emitted as (optional)",
        labelAdd: "Add an entity",
        labelEmittedHint: "hint",
        remove: "Remove",
      },
    },
  }),
}));

import { LabelMappingEditor } from "./label-mapping-editor";

const searched = () => screen.getAllByPlaceholderText("person");
const emitted = () => screen.getAllByPlaceholderText("emitted as (optional)");

describe("LabelMappingEditor", () => {
  it("seeds one row per list label, with empty emitted fields", () => {
    render(<LabelMappingEditor value={["person", "location"]} onChange={() => {}} />);
    expect(searched().map((i) => (i as HTMLInputElement).value)).toEqual(["person", "location"]);
    expect(emitted().every((i) => (i as HTMLInputElement).value === "")).toBe(true);
  });

  it("seeds rows from a dict mapping", () => {
    render(<LabelMappingEditor value={{ PERSONNE: "person" }} onChange={() => {}} />);
    expect((searched()[0] as HTMLInputElement).value).toBe("person");
    expect((emitted()[0] as HTMLInputElement).value).toBe("PERSONNE");
  });

  it("shows a single blank row when value is empty", () => {
    render(<LabelMappingEditor value={[]} onChange={() => {}} />);
    expect(searched()).toHaveLength(1);
    expect((searched()[0] as HTMLInputElement).value).toBe("");
  });

  it("emits a dict when an emitted field is filled in", async () => {
    const onChange = vi.fn();
    render(<LabelMappingEditor value={["person"]} onChange={onChange} />);
    await userEvent.type(emitted()[0], "PERSONNE");
    expect(onChange).toHaveBeenLastCalledWith({ PERSONNE: "person" });
  });

  it("adds a row and emits the updated list", async () => {
    const onChange = vi.fn();
    render(<LabelMappingEditor value={["person"]} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Add an entity" }));
    expect(searched()).toHaveLength(2);
    await userEvent.type(searched()[1], "location");
    expect(onChange).toHaveBeenLastCalledWith(["person", "location"]);
  });

  it("removes a row and emits the remaining list", async () => {
    const onChange = vi.fn();
    render(<LabelMappingEditor value={["person", "location"]} onChange={onChange} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    expect(onChange).toHaveBeenLastCalledWith(["location"]);
  });
});
