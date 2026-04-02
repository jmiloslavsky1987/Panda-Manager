// tests/api/project-seeding.test.ts
// Wave 0 RED stubs for WORK-01 — Auto-seed ADR/Biggy phases on project creation
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 1 }])
      })
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([])
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
  eq: vi.fn()
}));

vi.mock('server-only', () => ({}));

describe('POST /api/projects — Auto-seed phases (WORK-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates project AND seeds ADR phases (5 phases)', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const seededAdrPhases: any = undefined;
    expect(seededAdrPhases).toBeDefined();
    expect(seededAdrPhases).toHaveLength(5);
    // TODO Plan 33-02: verify ADR phases created with correct names
  });

  it('creates project AND seeds Biggy phases (5 phases)', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const seededBiggyPhases: any = undefined;
    expect(seededBiggyPhases).toBeDefined();
    expect(seededBiggyPhases).toHaveLength(5);
    // TODO Plan 33-02: verify Biggy phases created with correct names
  });

  it('seeded ADR phases have display_order 1-5 and track="ADR"', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const adrPhases: any = undefined;
    expect(adrPhases).toBeDefined();
    expect(adrPhases[0].display_order).toBe(1);
    expect(adrPhases[0].track).toBe('ADR');
    expect(adrPhases[4].display_order).toBe(5);
    // TODO Plan 33-02: verify display_order sequence and track field
  });

  it('seeded Biggy phases have display_order 1-5 and track="Biggy"', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const biggyPhases: any = undefined;
    expect(biggyPhases).toBeDefined();
    expect(biggyPhases[0].display_order).toBe(1);
    expect(biggyPhases[0].track).toBe('Biggy');
    expect(biggyPhases[4].display_order).toBe(5);
    // TODO Plan 33-02: verify display_order sequence and track field
  });

  it('transaction rollback if phase seeding fails (no orphaned project)', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const transactionSuccess: any = undefined;
    expect(transactionSuccess).toBe(true);
    // TODO Plan 33-02: mock phase insert failure, verify project not created
  });

  it('seeding does NOT create steps (only phases)', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const stepsCreated: any = undefined;
    expect(stepsCreated).toHaveLength(0);
    // TODO Plan 33-02: verify no step records inserted during project creation
  });

  it('ADR phase names match specification', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const adrPhaseNames: any = undefined;
    expect(adrPhaseNames).toEqual([
      'Discovery & Kickoff',
      'Integrations',
      'Platform Configuration',
      'Teams',
      'UAT'
    ]);
    // TODO Plan 33-02: verify exact ADR phase names from 33-CONTEXT.md
  });

  it('Biggy phase names match specification', async () => {
    // Stub pattern: test will fail RED until implementation exists
    const biggyPhaseNames: any = undefined;
    expect(biggyPhaseNames).toEqual([
      'Discovery & Kickoff',
      'IT Knowledge Graph',
      'Platform Configuration',
      'Teams',
      'Validation'
    ]);
    // TODO Plan 33-02: verify exact Biggy phase names from 33-CONTEXT.md
  });
});
