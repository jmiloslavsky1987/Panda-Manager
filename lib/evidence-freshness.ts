// Pure-function evidence freshness check.
// Per Phase 88.1 spec: Evidence dot is filled (●) if any Evidence Log entry
// has date within last 30 days; hollow (○) otherwise.
// Computed, never stored — same precedent as lib/risk-score.ts (Phase 9).

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function isEvidenceFresh(
  entries: { date: Date | string }[],
  now: Date | string = new Date(),
): boolean {
  if (!entries || entries.length === 0) return false;

  const nowDate = toDate(now);
  let maxMs = -Infinity;
  for (const entry of entries) {
    const ms = toDate(entry.date).getTime();
    if (!Number.isNaN(ms) && ms > maxMs) maxMs = ms;
  }

  if (maxMs === -Infinity) return false; // no valid date strings
  return nowDate.getTime() - maxMs <= THIRTY_DAYS_MS;
}
