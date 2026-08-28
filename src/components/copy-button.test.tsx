import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyButton } from "./copy-button";

describe("CopyButton", () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it("writes the given text to the clipboard on click", async () => {
    render(<CopyButton value="pip install piighost" />);
    await userEvent.click(screen.getByRole("button", { name: /copy/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("pip install piighost");
  });

  it("appelle onCopy après une copie réussie", async () => {
    const onCopy = vi.fn();
    const user = userEvent.setup();
    render(<CopyButton value="hello" onCopy={onCopy} />);
    await user.click(screen.getByRole("button", { name: /copy/i }));
    expect(onCopy).toHaveBeenCalledTimes(1);
  });
});
