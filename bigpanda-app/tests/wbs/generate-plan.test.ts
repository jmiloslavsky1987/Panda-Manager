// tests/wbs/generate-plan.test.ts
// RED test stub for WBS-04 Generate Plan feature (Wave 0 for Plan 03)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing
const mockRequireSession = vi.fn();

vi.mock('@/lib/auth-server', () => ({
  requireSession: mockRequireSession
}));

vi.mock('@/db', () => ({
  default: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined)
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([])
      })
    })
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn()
}));

vi.mock('server-only', () => ({}));

describe('POST /wbs/wbs-generate — Generate Plan endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({
      session: { user: { id: '1' } },
      redirectResponse: null
    });
  });

  it('POST /wbs/wbs-generate returns 200 with jobId when authenticated', async () => {
    // This route does not exist yet — test will fail with module not found
    const { POST } = await import('@/app/api/projects/[projectId]/wbs/wbs-generate/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1/wbs/wbs-generate', {
      method: 'POST',
      body: JSON.stringify({
        track: 'ADR',
        parentSectionName: 'Architecture'
      })
    });

    const response = await POST(req, { params: { projectId: '1' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toHaveProperty('jobId');
  });

  it('POST /wbs/wbs-generate returns 401 when not authenticated', async () => {
    const mockRedirect = new Response(null, {
      status: 302,
      headers: { Location: '/login' }
    });

    mockRequireSession.mockResolvedValue({
      session: null,
      redirectResponse: mockRedirect
    });

    const { POST } = await import('@/app/api/projects/[projectId]/wbs/wbs-generate/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1/wbs/wbs-generate', {
      method: 'POST',
      body: JSON.stringify({
        track: 'ADR',
        parentSectionName: 'Architecture'
      })
    });

    const response = await POST(req, { params: { projectId: '1' } });

    expect(response).toBe(mockRedirect);
  });

  it('confirmed proposals are written to wbs_items table', async () => {
    // This endpoint does not exist yet — test will fail
    const { POST } = await import('@/app/api/projects/[projectId]/wbs/wbs-confirm/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1/wbs/wbs-confirm', {
      method: 'POST',
      body: JSON.stringify({
        proposals: [
          { name: 'Test Task 1', level: 2, parent_id: 1, track: 'ADR' },
          { name: 'Test Task 2', level: 3, parent_id: 2, track: 'ADR' }
        ]
      })
    });

    const response = await POST(req, { params: { projectId: '1' } });

    expect(response.status).toBe(200);
  });
});
