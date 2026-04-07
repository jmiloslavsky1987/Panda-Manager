import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing
const mockRequireSession = vi.fn();
const mockQueueRemove = vi.fn();
const mockQueueClose = vi.fn();

vi.mock('@/lib/auth-server', () => ({
  requireSession: mockRequireSession
}));

const mockReturning = vi.fn().mockResolvedValue([{
  run_id: 'test-run-123',
  status: 'cancelled',
  completed_at: new Date()
}]);

vi.mock('@/db', () => ({
  default: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: mockReturning
        })
      })
    })
  }
}));

vi.mock('@/db/schema', () => ({
  skillRuns: {}
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn()
}));

vi.mock('bullmq', () => {
  return {
    Queue: class MockQueue {
      constructor() {}
      remove = mockQueueRemove;
      close = mockQueueClose;
    }
  };
});

vi.mock('@/worker/connection', () => ({
  createApiRedisConnection: vi.fn().mockReturnValue({})
}));

vi.mock('server-only', () => ({}));

describe('POST /api/skills/runs/[runId]/cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({
      session: { user: { id: '1' } },
      redirectResponse: null
    });
    mockQueueRemove.mockResolvedValue(undefined);
    mockQueueClose.mockResolvedValue(undefined);
    // Reset DB mock to return successful result
    mockReturning.mockResolvedValue([{
      run_id: 'test-run-123',
      status: 'cancelled',
      completed_at: new Date()
    }]);
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

    const { POST } = await import('@/app/api/skills/runs/[runId]/cancel/route');
    const req = new NextRequest('http://localhost/api/skills/runs/test/cancel', {
      method: 'POST',
    });

    const res = await POST(req, { params: Promise.resolve({ runId: 'test-run-123' }) });
    expect(res).toBe(mockRedirect);
  });

  it('returns 404 for non-existent run', async () => {
    // Mock DB to return empty array (no run found)
    mockReturning.mockResolvedValueOnce([]);

    const { POST } = await import('@/app/api/skills/runs/[runId]/cancel/route');
    const req = new NextRequest('http://localhost/api/skills/runs/nonexistent/cancel', {
      method: 'POST',
    });

    const res = await POST(req, { params: Promise.resolve({ runId: 'nonexistent' }) });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json).toEqual({ error: 'Run not found' });
  });

  it('cancels a pending skill run successfully', async () => {
    const { POST } = await import('@/app/api/skills/runs/[runId]/cancel/route');
    const req = new NextRequest('http://localhost/api/skills/runs/test-run-123/cancel', {
      method: 'POST',
    });

    const res = await POST(req, { params: Promise.resolve({ runId: 'test-run-123' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true, status: 'cancelled' });
  });

  it('updates DB status to cancelled and sets completed_at', async () => {
    const { default: db } = await import('@/db');
    const mockSet = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{
          run_id: 'test-run-123',
          status: 'cancelled',
          completed_at: new Date()
        }])
      })
    });

    db.update = vi.fn().mockReturnValue({
      set: mockSet
    });

    const { POST } = await import('@/app/api/skills/runs/[runId]/cancel/route');
    const req = new NextRequest('http://localhost/api/skills/runs/test-run-123/cancel', {
      method: 'POST',
    });

    await POST(req, { params: Promise.resolve({ runId: 'test-run-123' }) });

    expect(mockSet).toHaveBeenCalled();
    const setCall = mockSet.mock.calls[0][0];
    expect(setCall.status).toBe('cancelled');
    expect(setCall.completed_at).toBeInstanceOf(Date);
  });

  it('calls queue.remove with correct job ID', async () => {
    const { POST } = await import('@/app/api/skills/runs/[runId]/cancel/route');
    const req = new NextRequest('http://localhost/api/skills/runs/test-run-123/cancel', {
      method: 'POST',
    });

    await POST(req, { params: Promise.resolve({ runId: 'test-run-123' }) });

    expect(mockQueueRemove).toHaveBeenCalledWith('skill-run-test-run-123');
  });

  it('closes queue connection in finally block', async () => {
    const { POST } = await import('@/app/api/skills/runs/[runId]/cancel/route');
    const req = new NextRequest('http://localhost/api/skills/runs/test-run-123/cancel', {
      method: 'POST',
    });

    await POST(req, { params: Promise.resolve({ runId: 'test-run-123' }) });

    expect(mockQueueClose).toHaveBeenCalled();
  });
});
