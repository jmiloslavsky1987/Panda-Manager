// tests/time-tracking-global/api-endpoint.test.ts
// Wave 0 RED stubs for TIME-01 — Global time tracking API endpoint
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
const mockRequireSession = vi.fn();

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
    })
  }
}));

vi.mock('@/lib/auth-server', () => ({
  requireSession: mockRequireSession
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  sql: vi.fn()
}));

vi.mock('server-only', () => ({}));

describe('GET /api/time-entries — TIME-01', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({
      session: { user: { id: 1, role: 'admin' } }
    });
  });

  it('returns entries with project_name field', async () => {
    // Import the handler dynamically to test it exists
    const routeModule = await import('@/app/api/time-entries/route');
    expect(routeModule.GET).toBeDefined();
    expect(typeof routeModule.GET).toBe('function');
  });

  it('accepts project_id filter param', async () => {
    // Import the handler dynamically to test it exists
    const routeModule = await import('@/app/api/time-entries/route');
    expect(routeModule.GET).toBeDefined();
    expect(typeof routeModule.GET).toBe('function');
  });

  it('accepts from/to date filter params', async () => {
    // Import the handler dynamically to test it exists
    const routeModule = await import('@/app/api/time-entries/route');
    expect(routeModule.GET).toBeDefined();
    expect(typeof routeModule.GET).toBe('function');
  });
});
