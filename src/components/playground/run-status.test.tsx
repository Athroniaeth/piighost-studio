// src/components/playground/run-status.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RunStatus } from "./run-status";
import type { Dictionary } from "@/i18n/types";

const pg = {
  loadingRuntime: "Loading runtime",
  runtimeDownloading: "Downloading runtime",
  runtimeInstalling: "Installing runtime",
  runtimeReady: "Runtime ready",
  inferenceTime: "Inference time",
  reqPerSecond: "req/s",
  errorTitle: "Something went wrong",
  noEnabledDetectors: "Enable a detector",
  llmDeploymentNote: "LLM runs server-side",
  staleNote: "Result is stale",
  approximationNote: "Approximate preview",
} as unknown as Dictionary["playground"];

describe("RunStatus", () => {
  it("shows the inference metric when a duration is given", () => {
    render(<RunStatus pg={pg} durationMs={200} />);
    expect(screen.getByText(/Inference time:/)).toBeInTheDocument();
  });

  it("shows the runtime download line for the downloading stage", () => {
    render(<RunStatus pg={pg} runtimeStage="downloading" />);
    expect(screen.getByText("Downloading runtime")).toBeInTheDocument();
  });

  it("shows the loading-runtime line and hides the stage line while loading", () => {
    render(<RunStatus pg={pg} loadingRuntime runtimeStage="downloading" />);
    expect(screen.getByText("Loading runtime")).toBeInTheDocument();
    expect(screen.queryByText("Downloading runtime")).not.toBeInTheDocument();
  });

  it("shows the error, stale, no-detectors and approximation notes when flagged", () => {
    render(
      <RunStatus
        pg={pg}
        error
        stale
        noEnabledDetectors
        llm
        approximation
      />,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Result is stale")).toBeInTheDocument();
    expect(screen.getByText("Enable a detector")).toBeInTheDocument();
    expect(screen.getByText("LLM runs server-side")).toBeInTheDocument();
    expect(screen.getByText("Approximate preview")).toBeInTheDocument();
  });
});
