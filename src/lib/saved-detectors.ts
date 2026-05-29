import type { DetectorConfig } from "./detector-config";

export type SavedDetector = { name: string; config: DetectorConfig };

const KEY = "piighost.detectors";

/** Serialize a list of saved detectors to a JSON string. */
export function serialize(list: SavedDetector[]): string {
  return JSON.stringify(list);
}

/** Parse a JSON string (or null) into a list; tolerant of garbage/missing. */
export function parse(raw: string | null): SavedDetector[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? (value as SavedDetector[]) : [];
  } catch {
    return [];
  }
}

/** Read saved detectors from localStorage (empty list if unavailable). */
export function loadSaved(): SavedDetector[] {
  try {
    return parse(window.localStorage.getItem(KEY));
  } catch {
    return [];
  }
}

/** Save (or replace by name) a detector; returns the new list. */
export function saveDetector(name: string, config: DetectorConfig): SavedDetector[] {
  const next = [...loadSaved().filter((d) => d.name !== name), { name, config }];
  try {
    window.localStorage.setItem(KEY, serialize(next));
  } catch {
    // storage unavailable; ignore
  }
  return next;
}

/** Delete a saved detector by name; returns the new list. */
export function deleteSaved(name: string): SavedDetector[] {
  const next = loadSaved().filter((d) => d.name !== name);
  try {
    window.localStorage.setItem(KEY, serialize(next));
  } catch {
    // storage unavailable; ignore
  }
  return next;
}
