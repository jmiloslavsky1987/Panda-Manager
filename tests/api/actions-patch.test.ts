// tests/api/actions-patch.test.ts
// Test scaffold for PATCH /api/actions/[id] — inline editing of status, owner, due_date
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
        where: vi.fn().mockResolvedValue([{ id: 1, description: 'Test Action', status: 'open' }])
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

describe('PATCH /api/actions/[id] — inline editing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({
      session: { user: { id: '1' } },
      redirectResponse: null
    });
  });

  it('PATCH with status=open returns 200 { ok: true }', async () => {
    const { PATCH } = await import('@/app/api/actions/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/actions/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'open' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('PATCH with status=in_progress returns 200', async () => {
    const { PATCH } = await import('@/app/api/actions/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/actions/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'in_progress' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('PATCH with status=completed returns 200', async () => {
    const { PATCH } = await import('@/app/api/actions/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/actions/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('PATCH with status=cancelled returns 200', async () => {
    const { PATCH } = await import('@/app/api/actions/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/actions/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('PATCH with owner string returns 200', async () => {
    const { PATCH } = await import('@/app/api/actions/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/actions/1', {
      method: 'PATCH',
      body: JSON.stringify({ owner: 'John Doe' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('PATCH with due_date ISO string returns 200', async () => {
    const { PATCH } = await import('@/app/api/actions/[id]/route');

    const req = new NextRequest('http://localhost:3000/api/actions/1', {
      method: 'PATCH',
      body: JSON.stringify({ due: '2026-05-15' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('Unauthenticated PATCH returns redirect', async () => {
    const { PATCH } = await import('@/app/api/actions/[id]/route');

    const mockRedirect = new Response(null, {
      status: 302,
      headers: { Location: '/login' }
    });

    mockRequireSession.mockResolvedValue({
      session: null,
      redirectResponse: mockRedirect
    });

    const req = new NextRequest('http://localhost:3000/api/actions/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ id: '1' }) });

    expect(response).toBe(mockRedirect);
  });
});
