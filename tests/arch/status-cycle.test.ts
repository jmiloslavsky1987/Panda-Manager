// tests/arch/status-cycle.test.ts
// Test scaffold for ARCH-02 - status cycling API
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing
const mockRequireSession = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/auth-server', () => ({
  requireSession: mockRequireSession
}));

vi.mock('@/db', () => ({
  default: {
    update: mockUpdate,
    select: mockSelect
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn()
}));

vi.mock('server-only', () => ({}));

describe('PATCH /api/projects/[projectId]/arch-nodes/[nodeId] — status cycling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({
      session: { user: { id: '1' } },
      redirectResponse: null
    });

    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined)
      })
    });
  });

  it('PATCH with valid status returns 200 {ok:true}', async () => {
    // RED: Route doesn't exist yet
    try {
      const { PATCH } = await import('@/app/api/projects/[projectId]/arch-nodes/[nodeId]/route');

      const req = new NextRequest('http://localhost:3000/api/projects/1/arch-nodes/5', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'in_progress' })
      });

      const response = await PATCH(req, {
        params: Promise.resolve({ projectId: '1', nodeId: '5' })
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({ ok: true });
    } catch (error) {
      // Expected to fail (RED) until Task 2 creates the route
      expect(true).toBe(false);
    }
  });

  it('PATCH with invalid status returns 400', async () => {
    // RED: Route doesn't exist yet
    try {
      const { PATCH } = await import('@/app/api/projects/[projectId]/arch-nodes/[nodeId]/route');

      const req = new NextRequest('http://localhost:3000/api/projects/1/arch-nodes/5', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'unknown' })
      });

      const response = await PATCH(req, {
        params: Promise.resolve({ projectId: '1', nodeId: '5' })
      });

      expect(response.status).toBe(400);
    } catch (error) {
      // Expected to fail (RED) until Task 2 creates the route
      expect(true).toBe(false);
    }
  });

  it('Unauthenticated request returns redirect', async () => {
    const mockRedirect = new Response(null, {
      status: 302,
      headers: { Location: '/login' }
    });

    mockRequireSession.mockResolvedValue({
      session: null,
      redirectResponse: mockRedirect
    });

    // RED: Route doesn't exist yet
    try {
      const { PATCH } = await import('@/app/api/projects/[projectId]/arch-nodes/[nodeId]/route');

      const req = new NextRequest('http://localhost:3000/api/projects/1/arch-nodes/5', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'live' })
      });

      const response = await PATCH(req, {
        params: Promise.resolve({ projectId: '1', nodeId: '5' })
      });

      expect(response).toBe(mockRedirect);
    } catch (error) {
      // Expected to fail (RED) until Task 2 creates the route
      expect(true).toBe(false);
    }
  });
});
