// tests/api/onboarding-grouped.test.ts
// Wave 3 GREEN tests for WORK-01 — API grouping by track (ADR/Biggy)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/projects/[projectId]/onboarding/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/db', () => ({
  db: {
    transaction: vi.fn()
  }
}));

vi.mock('@/lib/auth-server', () => ({
  requireSession: vi.fn().mockResolvedValue({
    session: { user: { id: 1, role: 'admin' } },
    redirectResponse: null
  })
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val, type: 'eq' })),
  asc: vi.fn((col) => ({ col, type: 'asc' })),
  sql: {
    raw: vi.fn((query) => ({ query, type: 'raw' }))
  }
}));

vi.mock('server-only', () => ({}));

// Import mocked db after mocking
import { db } from '@/db';

describe('GET /api/projects/[id]/onboarding — API grouping (WORK-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns { adr: [], biggy: [] } structure (not flat { phases: [] })', async () => {
    // Mock transaction to return grouped data
    vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
      return callback({
        execute: vi.fn(),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([
                { id: 1, track: 'ADR', name: 'Phase 1', display_order: 1, project_id: 123, created_at: new Date() }
              ])
            })
          })
        })
      });
    });

    const req = new NextRequest('http://localhost:3000/api/projects/123/onboarding');
    const params = Promise.resolve({ projectId: '123' });
    const response = await GET(req, { params });
    const data = await response.json();

    expect(data).toHaveProperty('adr');
    expect(data).toHaveProperty('biggy');
    expect(data).not.toHaveProperty('phases');
  });

  it('phases with track="ADR" appear in adr array only', async () => {
    vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
      return callback({
        execute: vi.fn(),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([
                { id: 1, track: 'ADR', name: 'ADR Phase 1', display_order: 1, project_id: 123, created_at: new Date() },
                { id: 2, track: 'ADR', name: 'ADR Phase 2', display_order: 2, project_id: 123, created_at: new Date() },
                { id: 3, track: 'Biggy', name: 'Biggy Phase 1', display_order: 3, project_id: 123, created_at: new Date() }
              ])
            })
          })
        })
      });
    });

    const req = new NextRequest('http://localhost:3000/api/projects/123/onboarding');
    const params = Promise.resolve({ projectId: '123' });
    const response = await GET(req, { params });
    const data = await response.json();

    expect(Array.isArray(data.adr)).toBe(true);
    expect(data.adr).toHaveLength(2);
    expect(data.adr.every((p: any) => p.track === 'ADR')).toBe(true);
  });

  it('phases with track="Biggy" appear in biggy array only', async () => {
    vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
      return callback({
        execute: vi.fn(),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([
                { id: 1, track: 'ADR', name: 'ADR Phase 1', display_order: 1, project_id: 123, created_at: new Date() },
                { id: 2, track: 'Biggy', name: 'Biggy Phase 1', display_order: 2, project_id: 123, created_at: new Date() },
                { id: 3, track: 'Biggy', name: 'Biggy Phase 2', display_order: 3, project_id: 123, created_at: new Date() }
              ])
            })
          })
        })
      });
    });

    const req = new NextRequest('http://localhost:3000/api/projects/123/onboarding');
    const params = Promise.resolve({ projectId: '123' });
    const response = await GET(req, { params });
    const data = await response.json();

    expect(Array.isArray(data.biggy)).toBe(true);
    expect(data.biggy).toHaveLength(2);
    expect(data.biggy.every((p: any) => p.track === 'Biggy')).toBe(true);
  });

  it('empty track returns empty arrays (not null)', async () => {
    vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
      return callback({
        execute: vi.fn(),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([])
            })
          })
        })
      });
    });

    const req = new NextRequest('http://localhost:3000/api/projects/123/onboarding');
    const params = Promise.resolve({ projectId: '123' });
    const response = await GET(req, { params });
    const data = await response.json();

    expect(Array.isArray(data.adr)).toBe(true);
    expect(Array.isArray(data.biggy)).toBe(true);
    expect(data.adr).toHaveLength(0);
    expect(data.biggy).toHaveLength(0);
  });

  it('response includes steps nested under each phase', async () => {
    vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
      return callback({
        execute: vi.fn(),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([
                { id: 1, track: 'ADR', name: 'Phase 1', display_order: 1, project_id: 123, created_at: new Date() }
              ])
            })
          })
        })
      });
    });

    const req = new NextRequest('http://localhost:3000/api/projects/123/onboarding');
    const params = Promise.resolve({ projectId: '123' });
    const response = await GET(req, { params });
    const data = await response.json();

    const phaseWithSteps = data.adr[0];
    expect(phaseWithSteps).toBeDefined();
    expect(phaseWithSteps).toHaveProperty('steps');
    expect(Array.isArray(phaseWithSteps.steps)).toBe(true);
  });
});
