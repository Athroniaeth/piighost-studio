import type { ConfigPipeline } from "./detector-config";

export type SavedPipeline = { name: string; pipeline: ConfigPipeline };

const KEY = "piighost.pipelines";

export function serialize(list: SavedPipeline[]): string {
  return JSON.stringify(list);
}

function isSavedPipeline(x: unknown): x is SavedPipeline {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as SavedPipeline).name === "string" &&
    typeof (x as SavedPipeline).pipeline === "object" &&
    (x as SavedPipeline).pipeline !== null
  );
}

/** Parse a JSON string (or null) into a list; drops malformed entries. */
export function parse(raw: string | null): SavedPipeline[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isSavedPipeline) : [];
  } catch {
    return [];
  }
}

/** Read saved pipelines from localStorage (empty list if unavailable). */
export function loadSavedPipelines(): SavedPipeline[] {
  try {
    return parse(window.localStorage.getItem(KEY));
  } catch {
    return [];
  }
}

/** Save (or replace by name) a pipeline; returns the new list. */
export function savePipeline(name: string, pipeline: ConfigPipeline): SavedPipeline[] {
  const next = [...loadSavedPipelines().filter((p) => p.name !== name), { name, pipeline }];
  try {
    window.localStorage.setItem(KEY, serialize(next));
  } catch {
    // storage unavailable; ignore
  }
  return next;
}

/** Delete a saved pipeline by name; returns the new list. */
export function deleteSavedPipeline(name: string): SavedPipeline[] {
  const next = loadSavedPipelines().filter((p) => p.name !== name);
  try {
    window.localStorage.setItem(KEY, serialize(next));
  } catch {
    // storage unavailable; ignore
  }
  return next;
}
