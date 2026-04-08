// tests/arch/column-reorder.test.ts
// Test scaffold for column drag reorder API
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
  eq: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
  gt: vi.fn(),
  ne: vi.fn(),
  sql: vi.fn()
}));

vi.mock('server-only', () => ({}));

describe('PATCH /api/projects/[projectId]/arch-nodes/reorder — column drag reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({
      session: { user: { id: '1' } },
      redirectResponse: null
    });

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ display_order: 2 }])
        })
      })
    });

    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined)
      })
    });
  });

  it('PATCH with valid reorder payload returns 200 {ok:true}', async () => {
    const { PATCH } = await import('@/app/api/projects/[projectId]/arch-nodes/reorder/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1/arch-nodes/reorder', {
      method: 'PATCH',
      body: JSON.stringify({
        nodeId: 5,
        trackId: 1,
        newDisplayOrder: 3
      })
    });

    const response = await PATCH(req, {
      params: Promise.resolve({ projectId: '1' })
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('PATCH with missing nodeId returns 400', async () => {
    const { PATCH } = await import('@/app/api/projects/[projectId]/arch-nodes/reorder/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1/arch-nodes/reorder', {
      method: 'PATCH',
      body: JSON.stringify({
        trackId: 1,
        newDisplayOrder: 3
      })
    });

    const response = await PATCH(req, {
      params: Promise.resolve({ projectId: '1' })
    });

    expect(response.status).toBe(400);
  });

  it('PATCH with non-existent node returns 404', async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([])
        })
      })
    });

    const { PATCH } = await import('@/app/api/projects/[projectId]/arch-nodes/reorder/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1/arch-nodes/reorder', {
      method: 'PATCH',
      body: JSON.stringify({
        nodeId: 999,
        trackId: 1,
        newDisplayOrder: 3
      })
    });

    const response = await PATCH(req, {
      params: Promise.resolve({ projectId: '1' })
    });

    expect(response.status).toBe(404);
  });
});
