import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const trackMock = vi.fn();
vi.mock("@openpanel/nextjs", () => ({
  useOpenPanel: () => ({ track: trackMock }),
}));

import { useTrack } from "./analytics";

describe("useTrack", () => {
  beforeEach(() => {
    trackMock.mockReset();
  });

  it("délègue le nom et les props de l'événement au SDK", () => {
    const { result } = renderHook(() => useTrack());
    result.current({
      name: "detector_run",
      props: { detectorType: "regex", entityCount: 3, durationMs: 12 },
    });
    expect(trackMock).toHaveBeenCalledWith("detector_run", {
      detectorType: "regex",
      entityCount: 3,
      durationMs: 12,
    });
  });

  it("ne jette pas si le SDK track échoue (OpenPanel non initialisé)", () => {
    trackMock.mockImplementation(() => {
      throw new Error("not initialized");
    });
    const { result } = renderHook(() => useTrack());
    expect(() =>
      result.current({ name: "detector_saved", props: { detectorType: "gliner2" } }),
    ).not.toThrow();
  });

  it("rejette au compile-time une prop non prévue (garde-fou vie privée)", () => {
    const { result } = renderHook(() => useTrack());
    // @ts-expect-error - une clé libre (ex: texte utilisateur) ne doit pas compiler
    result.current({ name: "detector_run", props: { detectorType: "regex", entityCount: 0, durationMs: 0, userText: "jean@example.com" } });
    expect(true).toBe(true);
  });
});
