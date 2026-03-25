import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that load the modules
// ---------------------------------------------------------------------------

// Mock DB so no real Postgres connection is required
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

import { db } from '@/db';
import { getProjectWithHealth } from '@/lib/queries';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal project row returned by getProjectById */
const MOCK_PROJECT = {
  id: 1,
  customer: 'ACME',
  name: 'ACME Onboarding',
  status: 'active',
  health_rag: null,
  go_live_target: null,
  status_summary: null,
  created_at: new Date(),
};

/**
 * Build a select mock that cycles through `results` in order.
 * Each call to db.select() returns the next result in the array.
 * computeHealth makes 4 selects; getProjectById makes 1 (total 5).
 */
function buildSelectMock(results: Array<Record<string, unknown>[]>) {
  let callIndex = 0;
  return vi.fn().mockImplementation(() => {
    const rows = results[callIndex] ?? results[results.length - 1];
    callIndex++;
    return {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(rows),
      // For queries that are directly awaited (not chained with .limit)
      then: (resolve: (v: typeof rows) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve(rows).then(resolve, reject),
    };
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeHealth() stalledWorkstreams signal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computeHealth() return object includes stalledWorkstreams as a number (not undefined)', async () => {
    // Queries in order: getProjectById, overdue actions, stalled milestones,
    // high risks, stalled workstreams
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(
      buildSelectMock([
        [MOCK_PROJECT],   // getProjectById
        [{ count: 0 }],  // overdue actions
        [{ count: 0 }],  // stalled milestones
        [{ count: 0 }],  // high risks
        [{ count: 1 }],  // stalled workstreams
      ])
    );

    const result = await getProjectWithHealth(1);

    expect(typeof result.stalledWorkstreams).toBe('number');
    expect(result.stalledWorkstreams).not.toBeUndefined();
  });

  it('when DB returns 2 stalled workstreams, stalledWorkstreams === 2 in the return value', async () => {
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(
      buildSelectMock([
        [MOCK_PROJECT],   // getProjectById
        [{ count: 0 }],  // overdue actions
        [{ count: 0 }],  // stalled milestones
        [{ count: 0 }],  // high risks
        [{ count: 2 }],  // stalled workstreams — 2 stalled
      ])
    );

    const result = await getProjectWithHealth(1);

    expect(result.stalledWorkstreams).toBe(2);
  });

  it('when DB returns 0 stalled workstreams, stalledWorkstreams === 0 (not omitted)', async () => {
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(
      buildSelectMock([
        [MOCK_PROJECT],   // getProjectById
        [{ count: 0 }],  // overdue actions
        [{ count: 0 }],  // stalled milestones
        [{ count: 0 }],  // high risks
        [{ count: 0 }],  // stalled workstreams — 0
      ])
    );

    const result = await getProjectWithHealth(1);

    expect(result.stalledWorkstreams).toBe(0);
    expect('stalledWorkstreams' in result).toBe(true);
  });
});
