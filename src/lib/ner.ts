export type RawToken = {
  entity: string;
  score: number;
  index: number;
  word: string;
  start: number | null;
  end: number | null;
};

export type Entity = {
  text: string;
  label: string;
  score: number;
  start: number;
  end: number;
};

function baseLabel(entity: string): string {
  return entity.replace(/^[BI]-/, "");
}

/**
 * Merge per-token BIO predictions into whole entities, using the character
 * offsets to slice the original text (avoids subword "##" reconstruction).
 * A new entity starts on a "B-" tag, on a label change, or on a gap.
 */
export function groupEntities(tokens: RawToken[], text: string): Entity[] {
  const entities: Entity[] = [];
  let current: { label: string; start: number; end: number; scores: number[] } | null = null;

  const flush = () => {
    if (!current) return;
    const score = current.scores.reduce((a, b) => a + b, 0) / current.scores.length;
    entities.push({
      text: text.slice(current.start, current.end),
      label: current.label,
      score,
      start: current.start,
      end: current.end,
    });
    current = null;
  };

  for (const t of tokens) {
    if (t.entity === "O" || t.start == null || t.end == null) {
      flush();
      continue;
    }
    const label = baseLabel(t.entity);
    const isBegin = t.entity.startsWith("B-");
    const continues =
      current !== null && !isBegin && current.label === label && t.start <= current.end + 1;

    if (continues && current) {
      current.end = t.end;
      current.scores.push(t.score);
    } else {
      flush();
      current = { label, start: t.start, end: t.end, scores: [t.score] };
    }
  }
  flush();
  return entities;
}

export type Segment = { value: string; entity?: Entity };

/** Split text into plain and entity segments, ordered by character position. */
export function toSegments(text: string, entities: Entity[]): Segment[] {
  const sorted = [...entities].sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let cursor = 0;
  for (const entity of sorted) {
    if (entity.start > cursor) {
      segments.push({ value: text.slice(cursor, entity.start) });
    }
    segments.push({ value: text.slice(entity.start, entity.end), entity });
    cursor = entity.end;
  }
  if (cursor < text.length) {
    segments.push({ value: text.slice(cursor) });
  }
  return segments;
}
