// tests/api/stakeholders-get.test.ts
// Test scaffold for GET /api/stakeholders?project_id=X — stakeholder list for dropdowns
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing
const mockRequireSession = vi.fn();

vi.mock('@/lib/auth-server', () => ({
  requireSession: mockRequireSession
}));

vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 1, name: 'John Doe', role: 'Developer' },
          { id: 2, name: 'Jane Smith', role: 'Manager' }
        ])
      })
    })
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn()
}));

vi.mock('server-only', () => ({}));

describe('GET /api/stakeholders — dropdown data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({
      session: { user: { id: '1' } },
      redirectResponse: null
    });
  });

  it('GET with project_id returns 200 with array of stakeholders', async () => {
    const { GET } = await import('@/app/api/stakeholders/route');

    const req = new NextRequest('http://localhost:3000/api/stakeholders?project_id=1', {
      method: 'GET'
    });

    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual([
      { id: 1, name: 'John Doe', role: 'Developer' },
      { id: 2, name: 'Jane Smith', role: 'Manager' }
    ]);
  });

  it('GET without project_id returns 400', async () => {
    const { GET } = await import('@/app/api/stakeholders/route');

    const req = new NextRequest('http://localhost:3000/api/stakeholders', {
      method: 'GET'
    });

    const response = await GET(req);

    expect(response.status).toBe(400);
  });

  it('Unauthenticated GET returns redirect', async () => {
    const { GET } = await import('@/app/api/stakeholders/route');

    const mockRedirect = new Response(null, {
      status: 302,
      headers: { Location: '/login' }
    });

    mockRequireSession.mockResolvedValue({
      session: null,
      redirectResponse: mockRedirect
    });

    const req = new NextRequest('http://localhost:3000/api/stakeholders?project_id=1', {
      method: 'GET'
    });

    const response = await GET(req);

    expect(response).toBe(mockRedirect);
  });
});
