// tests/api/wbs-crud.test.ts
// Test scaffold for WBS CRUD API routes
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing
const mockRequireSession = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/auth-server', () => ({
  requireSession: mockRequireSession
}));

vi.mock('@/db', () => ({
  default: {
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    select: mockSelect
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  inArray: vi.fn(),
  gte: vi.fn(),
  sql: vi.fn()
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/queries', () => ({
  deleteWbsSubtree: vi.fn().mockResolvedValue(undefined)
}));

describe('POST /api/projects/[projectId]/wbs — add WBS node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({
      session: { user: { id: '1' } },
      redirectResponse: null
    });

    // Setup mocks for POST route
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ max: 0 }])
      })
    });

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 1, name: 'Test Item', level: 2, track: 'ADR', display_order: 1 }])
      })
    });
  });

  it('POST with valid body returns 201 with created item', async () => {
    const { POST } = await import('@/app/api/projects/[projectId]/wbs/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1/wbs', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Item',
        parent_id: 1,
        level: 2,
        track: 'ADR'
      })
    });

    const response = await POST(req, { params: Promise.resolve({ projectId: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json).toHaveProperty('id');
    expect(json.name).toBe('Test Item');
  });

  it('POST without name returns 400', async () => {
    const { POST } = await import('@/app/api/projects/[projectId]/wbs/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1/wbs', {
      method: 'POST',
      body: JSON.stringify({
        parent_id: 1,
        level: 2,
        track: 'ADR'
      })
    });

    const response = await POST(req, { params: Promise.resolve({ projectId: '1' }) });

    expect(response.status).toBe(400);
  });

  it('Unauthenticated POST returns redirect', async () => {
    const { POST } = await import('@/app/api/projects/[projectId]/wbs/route');

    const mockRedirect = new Response(null, {
      status: 302,
      headers: { Location: '/login' }
    });

    mockRequireSession.mockResolvedValue({
      session: null,
      redirectResponse: mockRedirect
    });

    const req = new NextRequest('http://localhost:3000/api/projects/1/wbs', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test',
        parent_id: 1,
        level: 2,
        track: 'ADR'
      })
    });

    const response = await POST(req, { params: Promise.resolve({ projectId: '1' }) });

    expect(response).toBe(mockRedirect);
  });
});

describe('PATCH /api/projects/[projectId]/wbs/[itemId] — edit WBS node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({
      session: { user: { id: '1' } },
      redirectResponse: null
    });

    // Setup mocks for PATCH route - default to level 2
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 2, level: 2 }])
        })
      })
    });

    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 2, name: 'Updated Item', status: 'in_progress' }])
        })
      })
    });
  });

  it('PATCH with valid body returns 200 with updated item', async () => {
    const { PATCH } = await import('@/app/api/projects/[projectId]/wbs/[itemId]/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1/wbs/2', {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'Updated Item',
        status: 'in_progress'
      })
    });

    const response = await PATCH(req, { params: Promise.resolve({ projectId: '1', itemId: '2' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.name).toBe('Updated Item');
  });

  it('PATCH Level 1 name change returns 403', async () => {
    // Override mock to return level 1 for this test
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 1, level: 1 }])
        })
      })
    });

    const { PATCH } = await import('@/app/api/projects/[projectId]/wbs/[itemId]/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1/wbs/1', {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'New Name'
      })
    });

    const response = await PATCH(req, { params: Promise.resolve({ projectId: '1', itemId: '1' }) });

    expect(response.status).toBe(403);
  });

  it('Unauthenticated PATCH returns redirect', async () => {
    const { PATCH } = await import('@/app/api/projects/[projectId]/wbs/[itemId]/route');

    const mockRedirect = new Response(null, {
      status: 302,
      headers: { Location: '/login' }
    });

    mockRequireSession.mockResolvedValue({
      session: null,
      redirectResponse: mockRedirect
    });

    const req = new NextRequest('http://localhost:3000/api/projects/1/wbs/2', {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'complete'
      })
    });

    const response = await PATCH(req, { params: Promise.resolve({ projectId: '1', itemId: '2' }) });

    expect(response).toBe(mockRedirect);
  });
});

describe('DELETE /api/projects/[projectId]/wbs/[itemId] — delete WBS node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({
      session: { user: { id: '1' } },
      redirectResponse: null
    });

    // Setup mocks for DELETE route - default to level 2
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 2, level: 2 }])
        })
      })
    });
  });

  it('DELETE Level 2/3 node returns 204', async () => {
    const { DELETE } = await import('@/app/api/projects/[projectId]/wbs/[itemId]/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1/wbs/2', {
      method: 'DELETE'
    });

    const response = await DELETE(req, { params: Promise.resolve({ projectId: '1', itemId: '2' }) });

    expect(response.status).toBe(204);
  });

  it('DELETE Level 1 node returns 403', async () => {
    // Override mock to return level 1 for this test
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 1, level: 1 }])
        })
      })
    });

    const { DELETE } = await import('@/app/api/projects/[projectId]/wbs/[itemId]/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1/wbs/1', {
      method: 'DELETE'
    });

    const response = await DELETE(req, { params: Promise.resolve({ projectId: '1', itemId: '1' }) });

    expect(response.status).toBe(403);
  });

  it('Unauthenticated DELETE returns redirect', async () => {
    const { DELETE } = await import('@/app/api/projects/[projectId]/wbs/[itemId]/route');

    const mockRedirect = new Response(null, {
      status: 302,
      headers: { Location: '/login' }
    });

    mockRequireSession.mockResolvedValue({
      session: null,
      redirectResponse: mockRedirect
    });

    const req = new NextRequest('http://localhost:3000/api/projects/1/wbs/2', {
      method: 'DELETE'
    });

    const response = await DELETE(req, { params: Promise.resolve({ projectId: '1', itemId: '2' }) });

    expect(response).toBe(mockRedirect);
  });
});

describe('POST /api/projects/[projectId]/wbs/reorder — reorder WBS node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({
      session: { user: { id: '1' } },
      redirectResponse: null
    });

    // Setup mocks for reorder route - default to level 2
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 2, level: 2 }])
        })
      })
    });

    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined)
      })
    });
  });

  it('POST with valid body returns 200', async () => {
    const { POST } = await import('@/app/api/projects/[projectId]/wbs/reorder/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1/wbs/reorder', {
      method: 'POST',
      body: JSON.stringify({
        itemId: 2,
        newParentId: 1,
        newDisplayOrder: 3
      })
    });

    const response = await POST(req, { params: Promise.resolve({ projectId: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('POST without itemId returns 400', async () => {
    const { POST } = await import('@/app/api/projects/[projectId]/wbs/reorder/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1/wbs/reorder', {
      method: 'POST',
      body: JSON.stringify({
        newParentId: 1,
        newDisplayOrder: 3
      })
    });

    const response = await POST(req, { params: Promise.resolve({ projectId: '1' }) });

    expect(response.status).toBe(400);
  });

  it('Unauthenticated POST returns redirect', async () => {
    const { POST } = await import('@/app/api/projects/[projectId]/wbs/reorder/route');

    const mockRedirect = new Response(null, {
      status: 302,
      headers: { Location: '/login' }
    });

    mockRequireSession.mockResolvedValue({
      session: null,
      redirectResponse: mockRedirect
    });

    const req = new NextRequest('http://localhost:3000/api/projects/1/wbs/reorder', {
      method: 'POST',
      body: JSON.stringify({
        itemId: 2,
        newParentId: 1,
        newDisplayOrder: 3
      })
    });

    const response = await POST(req, { params: Promise.resolve({ projectId: '1' }) });

    expect(response).toBe(mockRedirect);
  });
});
