// tests/api/projects-patch.test.ts
// Tests for UI-04 — PATCH handler integration with seedProjectFromRegistry
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing
const mockSeedProjectFromRegistry = vi.fn().mockResolvedValue(undefined);

vi.mock('@/db', () => ({
  db: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 1 }])
        })
      })
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 1, name: 'Test Project', customer: 'Test Customer' }])
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

const mockRequireSession = vi.fn();

vi.mock('@/lib/auth-server', () => ({
  requireSession: mockRequireSession
}));

vi.mock('@/lib/seed-project', () => ({
  seedProjectFromRegistry: mockSeedProjectFromRegistry
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn()
}));

vi.mock('server-only', () => ({}));

describe('PATCH /api/projects/[id] — UI-04', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({
      session: { user: { id: '1' } },
      redirectResponse: null
    });
  });

  it('PATCH with status=active calls seedProjectFromRegistry', async () => {
    const { PATCH } = await import('@/app/api/projects/[projectId]/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' })
    });

    await PATCH(req, { params: Promise.resolve({ projectId: '1' }) });

    expect(mockSeedProjectFromRegistry).toHaveBeenCalledWith(1);
  });

  it('PATCH with status=active returns { ok: true }', async () => {
    const { PATCH } = await import('@/app/api/projects/[projectId]/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ projectId: '1' }) });
    const json = await response.json();

    expect(json).toEqual({ ok: true });
  });

  it('PATCH does not call seedProjectFromRegistry when status is not active', async () => {
    const { PATCH } = await import('@/app/api/projects/[projectId]/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'archived' })
    });

    await PATCH(req, { params: Promise.resolve({ projectId: '1' }) });

    expect(mockSeedProjectFromRegistry).not.toHaveBeenCalled();
  });

  it('PATCH returns redirect when no session', async () => {
    const { PATCH } = await import('@/app/api/projects/[projectId]/route');

    const mockRedirect = new Response(null, {
      status: 302,
      headers: { Location: '/login' }
    });

    mockRequireSession.mockResolvedValue({
      session: null,
      redirectResponse: mockRedirect
    });

    const req = new NextRequest('http://localhost:3000/api/projects/1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ projectId: '1' }) });

    expect(response).toBe(mockRedirect);
  });
});
