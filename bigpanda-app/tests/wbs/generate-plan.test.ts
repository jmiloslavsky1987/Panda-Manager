// tests/wbs/generate-plan.test.ts
// TDD RED phase for WBS-04 Generate Plan feature (Plan 47-03)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing
const mockRequireSession = vi.fn();
const mockBuildWbsProposals = vi.fn();

vi.mock('@/lib/auth-server', () => ({
  requireSession: mockRequireSession
}));

vi.mock('@/worker/jobs/wbs-generate-plan', () => ({
  buildWbsProposals: mockBuildWbsProposals
}));

vi.mock('@/db', () => ({
  default: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([])
      })
    })
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn()
}));

vi.mock('server-only', () => ({}));

describe('POST /wbs/generate — Generate Plan endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({
      session: { user: { id: '1' } },
      redirectResponse: null
    });
  });

  it('returns 200 with proposals array when authenticated', async () => {
    // Mock buildWbsProposals to return proposals
    mockBuildWbsProposals.mockResolvedValue([
      { name: 'Task 1', level: 2, parent_id: 1, track: 'ADR', parent_section_name: 'Architecture' }
    ]);

    // This route does not exist yet — test will fail with module not found
    const { POST } = await import('@/app/api/projects/[projectId]/wbs/generate/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1/wbs/generate', {
      method: 'POST'
    });

    const response = await POST(req, { params: Promise.resolve({ projectId: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toHaveProperty('proposals');
    expect(Array.isArray(json.proposals)).toBe(true);
  });

  it('returns 401 when not authenticated', async () => {
    const mockRedirect = new Response(null, {
      status: 302,
      headers: { Location: '/login' }
    });

    mockRequireSession.mockResolvedValue({
      session: null,
      redirectResponse: mockRedirect
    });

    const { POST } = await import('@/app/api/projects/[projectId]/wbs/generate/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1/wbs/generate', {
      method: 'POST'
    });

    const response = await POST(req, { params: Promise.resolve({ projectId: '1' }) });

    expect(response).toBe(mockRedirect);
  });

  it('returns empty proposals array when all items are duplicates', async () => {
    // Mock buildWbsProposals to return empty array (all filtered as dupes)
    mockBuildWbsProposals.mockResolvedValue([]);

    const { POST } = await import('@/app/api/projects/[projectId]/wbs/generate/route');

    const req = new NextRequest('http://localhost:3000/api/projects/1/wbs/generate', {
      method: 'POST'
    });

    const response = await POST(req, { params: Promise.resolve({ projectId: '1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.proposals).toEqual([]);
  });
});
