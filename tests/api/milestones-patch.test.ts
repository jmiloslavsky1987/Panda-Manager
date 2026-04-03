// tests/api/milestones-patch.test.ts
// Test scaffold for PATCH /api/milestones/[id] — enum status validation
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
        where: vi.fn().mockResolvedValue([{ id: 1, name: 'Test Milestone', status: 'not_started' }])
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

describe('PATCH /api/milestones/[id] — enum validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({
      session: { user: { id: '1' } },
      redirectResponse: null
    });
  });

  it('PATCH with status=not_started returns 200', async () => {
    const { PATCH } = await import('@/app/api/milestones/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/milestones/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'not_started' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('PATCH with status=in_progress returns 200', async () => {
    const { PATCH } = await import('@/app/api/milestones/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/milestones/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'in_progress' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('PATCH with status=completed returns 200', async () => {
    const { PATCH } = await import('@/app/api/milestones/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/milestones/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('PATCH with status=blocked returns 200', async () => {
    const { PATCH } = await import('@/app/api/milestones/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/milestones/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'blocked' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('PATCH with status=done (invalid) returns 400', async () => {
    const { PATCH } = await import('@/app/api/milestones/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/milestones/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'done' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });

    expect(response.status).toBe(400);
  });
});
