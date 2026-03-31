// tests/api/projects-patch.test.ts
// RED stubs for UI-04 — PATCH handler integration with seedProjectFromRegistry
import { describe, it, expect, vi } from 'vitest';

// Mock dependencies before importing
vi.mock('@/db', () => ({
  db: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 1 }])
        })
      })
    }),
    query: {
      projects: {
        findFirst: vi.fn().mockResolvedValue({ id: 1, seeded: false })
      }
    }
  }
}));

vi.mock('@/lib/auth-server', () => ({
  requireSession: vi.fn().mockResolvedValue({
    session: { user: { id: '1' } },
    redirectResponse: null
  })
}));

vi.mock('@/lib/seed-project', () => ({
  seedProjectFromRegistry: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('server-only', () => ({}));

describe('PATCH /api/projects/[id] — UI-04', () => {
  it('PATCH with status=active calls seedProjectFromRegistry', () => {
    // RED stub — expect this to fail until PATCH handler calls seeding
    const seedCall: any = undefined;
    expect(seedCall).toBeDefined();
  });

  it('PATCH with status=active returns { ok: true }', () => {
    // RED stub — expect this to fail until response handling is implemented
    const response: any = undefined;
    expect(response).toBeDefined();
  });

  it('PATCH does not call seedProjectFromRegistry when status is not active', () => {
    // RED stub — expect this to fail until conditional seeding logic is implemented
    const noSeedCall: any = undefined;
    expect(noSeedCall).toBeDefined();
  });

  it('PATCH returns 401 when no session', () => {
    // RED stub — expect this to fail until auth guard is implemented
    const authError: any = undefined;
    expect(authError).toBeDefined();
  });
});
