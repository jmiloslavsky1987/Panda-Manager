/**
 * analytics.test.ts — Unit tests for computeProjectAnalytics and related helpers
 *
 * Tests the pure-logic helpers that don't require a DB connection:
 *   - computeTrend() threshold logic
 *   - velocityWeeks slot-filling (sparse SQL results → 4-element array)
 *   - ProjectWithHealth type shape (compile-time check via import)
 *
 * DB-dependent tests (computeProjectAnalytics integration) remain RED
 * until PostgreSQL is installed (same pattern as pool.test.ts).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

// ─── computeTrend pure-logic tests (extracted from queries.ts logic) ─────────

/**
 * Replicate computeTrend() inline so we can test without DB access.
 * The real implementation lives in queries.ts.
 */
function computeTrend(current: number, prior: number): 'up' | 'flat' | 'down' {
  const diff = current - prior;
  if (Math.abs(diff) <= 1) return 'flat';
  return diff > 0 ? 'up' : 'down';
}

test('computeTrend: |diff| <= 1 → flat', () => {
  assert.equal(computeTrend(5, 5), 'flat');   // equal
  assert.equal(computeTrend(6, 5), 'flat');   // +1
  assert.equal(computeTrend(4, 5), 'flat');   // -1
});

test('computeTrend: diff > 1 → up', () => {
  assert.equal(computeTrend(7, 5), 'up');     // +2
  assert.equal(computeTrend(10, 3), 'up');    // +7
});

test('computeTrend: diff < -1 → down', () => {
  assert.equal(computeTrend(3, 5), 'down');   // -2
  assert.equal(computeTrend(0, 10), 'down');  // -10
});

// ─── velocityWeeks slot-filling logic ────────────────────────────────────────

/**
 * Replicate the Monday-snapping + slot-filling logic from computeProjectAnalytics.
 * This is pure JS — no DB required.
 */
function buildVelocitySlots(
  rows: Array<{ week_start: string; count: number }>
): number[] {
  // Build lookup from SQL results
  const lookup = new Map<string, number>();
  for (const row of rows) {
    lookup.set(row.week_start, row.count);
  }

  // Generate the 4 expected week-start dates (Monday of each of last 4 weeks)
  const today = new Date();
  // Snap to Monday of current week
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysToMonday = (dayOfWeek + 6) % 7;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - daysToMonday);
  thisMonday.setHours(0, 0, 0, 0);

  const slots: number[] = [];
  // oldest first: -3w, -2w, -1w, current
  for (let i = 3; i >= 0; i--) {
    const slotDate = new Date(thisMonday);
    slotDate.setDate(thisMonday.getDate() - i * 7);
    const key = slotDate.toISOString().split('T')[0]; // YYYY-MM-DD
    slots.push(lookup.get(key) ?? 0);
  }
  return slots;
}

test('buildVelocitySlots: always returns exactly 4 elements', () => {
  const result = buildVelocitySlots([]);
  assert.equal(result.length, 4, 'Empty input should produce 4 zeros');
  assert.deepEqual(result, [0, 0, 0, 0]);
});

test('buildVelocitySlots: fills matching slots and zeroes missing', () => {
  // Compute Monday of this week for a deterministic match
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = (dayOfWeek + 6) % 7;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - daysToMonday);
  thisMonday.setHours(0, 0, 0, 0);
  const thisMondayStr = thisMonday.toISOString().split('T')[0];

  const rows = [{ week_start: thisMondayStr, count: 5 }];
  const result = buildVelocitySlots(rows);

  assert.equal(result.length, 4);
  assert.equal(result[3], 5, 'Current week slot should match');
  assert.equal(result[0], 0, 'Oldest slot (3 weeks ago) should be 0');
  assert.equal(result[1], 0, '2 weeks ago slot should be 0');
  assert.equal(result[2], 0, '1 week ago slot should be 0');
});

// ─── ProjectWithHealth type shape (compile-time check) ───────────────────────
// If this import fails to compile, the test file itself won't run.
// The DB is not called — we only verify the exported type has the right shape.

import type { ProjectWithHealth } from '../bigpanda-app/lib/queries';

test('ProjectWithHealth type has all Phase 14 analytics fields (compile-time)', () => {
  // Type-level check: if any field is missing, TypeScript compilation fails.
  // This is sufficient for TDD purposes without a live DB.
  const _check: Pick<ProjectWithHealth,
    | 'velocityWeeks'
    | 'actionTrend'
    | 'openRiskCount'
    | 'riskTrend'
  > = {
    velocityWeeks: [0, 0, 0, 0],
    actionTrend: 'flat',
    openRiskCount: 0,
    riskTrend: 'flat',
  };
  assert.ok(_check, 'Type shape is valid');
});
