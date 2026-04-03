// tests/api/actions-bulk.test.ts
// Test scaffold for POST /api/actions/bulk-update — bulk status changes
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing
const mockRequireSession = vi.fn();

vi.mock('@/lib/auth-server', () => ({
  requireSession: mockRequireSession
}));

vi.mock('@/db', () => ({
  db: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined)
      })
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 1, status: 'open' },
          { id: 2, status: 'open' }
        ])
      })
    }),
    transaction: vi.fn().mockImplementation(async (callback) => {
      return callback({
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined)
          })
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined)
        })
      });
    })
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  inArray: vi.fn()
}));

vi.mock('server-only', () => ({}));

describe('POST /api/actions/bulk-update — bulk operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({
      session: { user: { id: '1' } },
      redirectResponse: null
    });
  });

  it('POST with action_ids and patch returns 200 { ok: true, count: 2 }', async () => {
    const { POST } = await import('@/app/api/actions/bulk-update/route');

    const req = new NextRequest('http://localhost:3000/api/actions/bulk-update', {
      method: 'POST',
      body: JSON.stringify({
        action_ids: [1, 2],
        patch: { status: 'completed' }
      })
    });

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true, count: 2 });
  });

  it('POST with empty action_ids array returns 400', async () => {
    const { POST } = await import('@/app/api/actions/bulk-update/route');

    const req = new NextRequest('http://localhost:3000/api/actions/bulk-update', {
      method: 'POST',
      body: JSON.stringify({
        action_ids: [],
        patch: { status: 'completed' }
      })
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
  });

  it('Unauthenticated POST returns redirect', async () => {
    const { POST } = await import('@/app/api/actions/bulk-update/route');

    const mockRedirect = new Response(null, {
      status: 302,
      headers: { Location: '/login' }
    });

    mockRequireSession.mockResolvedValue({
      session: null,
      redirectResponse: mockRedirect
    });

    const req = new NextRequest('http://localhost:3000/api/actions/bulk-update', {
      method: 'POST',
      body: JSON.stringify({
        action_ids: [1, 2],
        patch: { status: 'completed' }
      })
    });

    const response = await POST(req);

    expect(response).toBe(mockRedirect);
  });
});
