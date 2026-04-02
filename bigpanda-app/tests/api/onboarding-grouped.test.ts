// tests/api/onboarding-grouped.test.ts
// Wave 0 RED stubs for WORK-01 — API grouping by track (ADR/Biggy)
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([])
          })
        })
      })
    }),
    transaction: vi.fn()
  }
}));

vi.mock('@/lib/auth-server', () => ({
  requireSession: vi.fn().mockResolvedValue({
    session: { user: { id: 1, role: 'admin' } }
  })
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  asc: vi.fn()
}));

vi.mock('server-only', () => ({}));

describe('GET /api/projects/[id]/onboarding — API grouping (WORK-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns { adr: [], biggy: [] } structure (not flat { phases: [] })', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const groupedResponse: any = undefined;
    expect(groupedResponse).toHaveProperty('adr');
    expect(groupedResponse).toHaveProperty('biggy');
    // TODO Plan 33-02: import route handler, call GET, verify response shape
  });

  it('phases with track="ADR" appear in adr array only', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const adrPhases: any = undefined;
    expect(adrPhases).toBeDefined();
    expect(Array.isArray(adrPhases)).toBe(true);
    // TODO Plan 33-02: verify ADR phases have track='ADR' and are in adr array
  });

  it('phases with track="Biggy" appear in biggy array only', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const biggyPhases: any = undefined;
    expect(biggyPhases).toBeDefined();
    expect(Array.isArray(biggyPhases)).toBe(true);
    // TODO Plan 33-02: verify Biggy phases have track='Biggy' and are in biggy array
  });

  it('empty track returns empty arrays (not null)', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const emptyAdr: any = undefined;
    const emptyBiggy: any = undefined;
    expect(Array.isArray(emptyAdr)).toBe(true);
    expect(Array.isArray(emptyBiggy)).toBe(true);
    expect(emptyAdr).toHaveLength(0);
    expect(emptyBiggy).toHaveLength(0);
    // TODO Plan 33-02: test with no phases, verify empty arrays
  });

  it('response includes steps nested under each phase', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const phaseWithSteps: any = undefined;
    expect(phaseWithSteps).toBeDefined();
    expect(phaseWithSteps).toHaveProperty('steps');
    expect(Array.isArray(phaseWithSteps.steps)).toBe(true);
    // TODO Plan 33-02: verify PhaseWithSteps shape includes nested steps array
  });
});
