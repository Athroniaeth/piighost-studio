"use client";

import { SAMPLE_TEXTS } from "@/lib/sample-texts";

/** A "Load sample text" dropdown. Picking an entry calls onPick with its raw
 *  text, then resets to the placeholder so the same entry can be re-picked.
 *  Pure — the page decides what to do with the text. */
export function SampleTextPicker({
  label,
  onPick,
  disabled,
}: {
  label: string;
  onPick: (text: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      aria-label={label}
      disabled={disabled}
      value=""
      onChange={(e) => {
        const sample = SAMPLE_TEXTS.find((s) => s.name === e.target.value);
        if (sample) onPick(sample.text);
        e.currentTarget.selectedIndex = 0;
      }}
      className="rounded-md border bg-background px-2 py-1 text-xs"
    >
      <option value="">{label}</option>
      {SAMPLE_TEXTS.map((s) => (
        <option key={s.name} value={s.name}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
