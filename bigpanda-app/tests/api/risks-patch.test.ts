// tests/api/risks-patch.test.ts
// Test scaffold for PATCH /api/risks/[id] — enum status validation
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
        where: vi.fn().mockResolvedValue([{ id: 1, risk_type: 'technical', status: 'open' }])
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
  eq: vi.fn()
}));

vi.mock('server-only', () => ({}));

describe('PATCH /api/risks/[id] — enum validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({
      session: { user: { id: '1' } },
      redirectResponse: null
    });
  });

  it('PATCH with status=open returns 200', async () => {
    const { PATCH } = await import('@/app/api/risks/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/risks/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'open' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('PATCH with status=mitigated returns 200', async () => {
    const { PATCH } = await import('@/app/api/risks/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/risks/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'mitigated' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('PATCH with status=resolved returns 200', async () => {
    const { PATCH } = await import('@/app/api/risks/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/risks/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'resolved' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('PATCH with status=accepted returns 200', async () => {
    const { PATCH } = await import('@/app/api/risks/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/risks/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'accepted' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('PATCH with status=closed (invalid) returns 400', async () => {
    const { PATCH } = await import('@/app/api/risks/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/risks/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'closed' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });

    expect(response.status).toBe(400);
  });

  it('PATCH with status=Resolved (wrong case) returns 400', async () => {
    const { PATCH } = await import('@/app/api/risks/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/risks/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Resolved' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });

    expect(response.status).toBe(400);
  });
});
