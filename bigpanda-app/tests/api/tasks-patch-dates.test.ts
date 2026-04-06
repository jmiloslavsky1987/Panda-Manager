// tests/api/tasks-patch-dates.test.ts
// Test scaffold for PATCH /api/tasks/:id — date field updates (start_date, due)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing
const mockRequireSession = vi.fn();

vi.mock('@/lib/auth-server', () => ({
  requireSession: mockRequireSession
}));

vi.mock('@/lib/queries', () => ({
  updateWorkstreamProgress: vi.fn().mockResolvedValue(undefined)
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
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            id: 1,
            title: 'Test Task',
            status: 'todo',
            workstream_id: null,
            start_date: null,
            due: null
          }])
        })
      })
    }),
    transaction: vi.fn().mockImplementation(async (callback) => {
      return callback({
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined)
          })
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{
                id: 1,
                title: 'Test Task',
                status: 'todo',
                workstream_id: null,
                start_date: '2026-06-01',
                due: '2026-07-15'
              }])
            })
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

describe('PATCH /api/tasks/:id — date field updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRequireSession.mockResolvedValue({
      session: { user: { id: '1' } },
      redirectResponse: null
    });
  });

  it('PATCH with start_date ISO string returns 200 { ok: true }', async () => {
    const { PATCH } = await import('@/app/api/tasks/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ start_date: '2026-06-01' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('PATCH with due ISO string returns 200 { ok: true }', async () => {
    const { PATCH } = await import('@/app/api/tasks/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ due: '2026-07-15' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('PATCH with both start_date and due returns 200 { ok: true }', async () => {
    const { PATCH } = await import('@/app/api/tasks/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ start_date: '2026-06-01', due: '2026-07-15' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('PATCH with start_date=null (clear) returns 200 { ok: true }', async () => {
    const { PATCH } = await import('@/app/api/tasks/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ start_date: null })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('PATCH with invalid task ID returns 400 { error: "Invalid task ID" }', async () => {
    const { PATCH } = await import('@/app/api/tasks/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/tasks/abc', {
      method: 'PATCH',
      body: JSON.stringify({ start_date: '2026-06-01' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: 'abc' }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: 'Invalid task ID' });
  });

  it('Unauthenticated PATCH returns redirect', async () => {
    const { PATCH } = await import('@/app/api/tasks/[id]/route');

    const mockRedirect = new Response(null, {
      status: 302,
      headers: { Location: '/login' }
    });

    mockRequireSession.mockResolvedValue({
      session: null,
      redirectResponse: mockRedirect
    });

    const req = new NextRequest('http://localhost:3000/api/tasks/1', {
      method: 'PATCH',
      body: JSON.stringify({ start_date: '2026-06-01' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });

    expect(response).toBe(mockRedirect);
  });
});
