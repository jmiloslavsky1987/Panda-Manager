// tests/wbs/reorder.test.ts
// Integration test for POST /api/projects/[projectId]/wbs/reorder
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing
const mockRequireSession = vi.fn();

const mockUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined)
  })
});

const mockSelect = vi.fn().mockReturnValue({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([{ id: 2, level: 2, parent_id: 1, display_order: 1 }])
    })
  })
});

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
  sql: vi.fn()
}));

vi.mock('server-only', () => ({}));

describe('POST /wbs/reorder — display_order recalculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({
      session: { user: { id: '1' } },
      redirectResponse: null
    });
  });

  it('moving node updates its parent_id and display_order', async () => {
    const { POST } = await import('@/app/api/projects/[projectId]/wbs/reorder/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1/wbs/reorder', {
      method: 'POST',
      body: JSON.stringify({
        itemId: 2,
        newParentId: 3,
        newDisplayOrder: 2
      })
    });

    await POST(req, { params: Promise.resolve({ projectId: '1' }) });

    // Should have called update twice:
    // 1. Shift siblings at target position
    // 2. Update the moved item
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it('shifts siblings at target level when inserting node', async () => {
    const { POST } = await import('@/app/api/projects/[projectId]/wbs/reorder/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1/wbs/reorder', {
      method: 'POST',
      body: JSON.stringify({
        itemId: 5,
        newParentId: 1,
        newDisplayOrder: 2
      })
    });

    await POST(req, { params: Promise.resolve({ projectId: '1' }) });

    // First update should shift siblings
    // Second update should set the moved item's new position
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it('rejects reordering Level 1 nodes with 403', async () => {
    // Mock item with level 1
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 1, level: 1, parent_id: null, display_order: 1 }])
        })
      })
    });

    const { POST } = await import('@/app/api/projects/[projectId]/wbs/reorder/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1/wbs/reorder', {
      method: 'POST',
      body: JSON.stringify({
        itemId: 1,
        newParentId: 2,
        newDisplayOrder: 1
      })
    });

    const response = await POST(req, { params: Promise.resolve({ projectId: '1' }) });

    expect(response.status).toBe(403);
  });
});
