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

import { getProjectWithHealth } from '@/lib/queries';

// ---------------------------------------------------------------------------
// Tests — Wave 0 stubs (RED before Task 2 wires production code)
// ---------------------------------------------------------------------------

describe('computeHealth() stalledWorkstreams signal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computeHealth() return object includes stalledWorkstreams as a number (not undefined)', async () => {
    expect(false, 'stub').toBe(true);
  });

  it('when DB returns 2 stalled workstreams, stalledWorkstreams === 2 in the return value', async () => {
    expect(false, 'stub').toBe(true);
  });

  it('when DB returns 0 stalled workstreams, stalledWorkstreams === 0 (not omitted)', async () => {
    expect(false, 'stub').toBe(true);
  });
});
