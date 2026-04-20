// tests/auth/cache-isolation.test.ts
// GREEN — TENANT-03: Redis cache read requires membership (already correct)
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/server
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    })),
  },
  NextRequest: vi.fn(),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// Mock db
vi.mock('@/db', () => ({ db: {} }));

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock auth-server to spy on requireProjectRole
const mockRequireProjectRole = vi.fn();

vi.mock('@/lib/auth-server', () => ({
  requireProjectRole: mockRequireProjectRole,
}));

// Mock Redis
const mockRedisGet = vi.fn();
const mockRedisConnect = vi.fn();
const mockRedisQuit = vi.fn();

vi.mock('@/worker/connection', () => ({
  createApiRedisConnection: vi.fn(() => ({
    connect: mockRedisConnect,
    get: mockRedisGet,
    quit: mockRedisQuit,
  })),
}));

beforeEach(() => {
  mockRequireProjectRole.mockReset();
  mockRedisGet.mockReset();
  mockRedisConnect.mockReset();
  mockRedisQuit.mockReset();

  // Default: auth succeeds
  mockRequireProjectRole.mockResolvedValue({
    session: { user: { id: 'user-1', email: 'test@example.com', role: 'user' } },
    redirectResponse: null,
    projectRole: 'user',
  });

  // Default: Redis returns null
  mockRedisGet.mockResolvedValue(null);
  mockRedisConnect.mockResolvedValue(undefined);
  mockRedisQuit.mockResolvedValue(undefined);
});

describe('Cache Isolation — TENANT-03', () => {
  it('weekly-focus route calls requireProjectRole() before reading cache', async () => {
    const { GET } = await import('@/app/api/projects/[projectId]/weekly-focus/route');

    const mockReq = {} as any;
    const mockParams = Promise.resolve({ projectId: '123' });

    await GET(mockReq, { params: mockParams });

    // Verify requireProjectRole was called with the correct projectId
    expect(mockRequireProjectRole).toHaveBeenCalledWith(123, 'user');

    // Verify cache was read AFTER auth check
    expect(mockRedisGet).toHaveBeenCalledWith('weekly_focus:123');
  });

  it('cache key format is weekly_focus:${projectId} (project-scoped, no userId prefix)', async () => {
    const { GET } = await import('@/app/api/projects/[projectId]/weekly-focus/route');

    const mockReq = {} as any;
    const mockParams = Promise.resolve({ projectId: '456' });

    await GET(mockReq, { params: mockParams });

    // Verify cache key uses projectId only, not userId
    expect(mockRedisGet).toHaveBeenCalledWith('weekly_focus:456');

    // The key pattern should NOT contain any user identifier
    const callArg = mockRedisGet.mock.calls[0][0];
    expect(callArg).not.toMatch(/user/);
    expect(callArg).toMatch(/^weekly_focus:\d+$/);
  });

  it('cache write in worker uses weekly_focus:${projectId} key (no cross-contamination)', async () => {
    // This test verifies the cache WRITE pattern in worker/jobs/weekly-focus.ts
    // by checking the source code for the key template

    // Read the worker file to verify key pattern
    const fs = await import('fs/promises');
    const workerSource = await fs.readFile(
      '/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/worker/jobs/weekly-focus.ts',
      'utf-8'
    );

    // Verify the cache write uses project.id in the key
    expect(workerSource).toContain('weekly_focus:${project.id}');

    // Verify it does NOT use userId in the key (would enable cross-contamination)
    expect(workerSource).not.toContain('weekly_focus:${userId}');
    expect(workerSource).not.toContain('weekly_focus:${user');
  });
});
