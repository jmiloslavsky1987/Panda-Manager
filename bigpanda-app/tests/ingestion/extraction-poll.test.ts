import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('../../db', () => ({
  default: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 1,
            status: 'running',
            progress_pct: 45,
            current_chunk: 3,
            total_chunks: 7,
            error_message: null,
            updated_at: new Date(),
          },
        ]),
      }),
    }),
    update: vi.fn(),
  },
}));

vi.mock('../../lib/auth-server', () => ({
  requireSession: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}));

// Import the route handler (will fail RED — file doesn't exist yet)
import { GET } from '../../app/api/ingestion/jobs/[jobId]/route';

describe('app/api/ingestion/jobs/[jobId]/route.ts — GET polling handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return { status, progress_pct, current_chunk, total_chunks } from DB row', async () => {
    // Arrange
    const request = new NextRequest('http://localhost/api/ingestion/jobs/1');
    const params = { jobId: '1' };

    // Act & Assert: will fail RED until Plan 03 creates route
    expect(GET).toBeDefined();
    // TODO Plan 03: call GET(request, { params }), verify response shape and values
  });

  it('should return 404 if jobId not found', async () => {
    // Arrange: mock empty result
    const request = new NextRequest('http://localhost/api/ingestion/jobs/999');
    const params = { jobId: '999' };

    // Assert: will fail RED until Plan 03 implementation
    expect(GET).toBeDefined();
    // TODO Plan 03: verify response status 404 with error message
  });

  it('should return status=failed with error_message if job row has status=failed', async () => {
    // Arrange: mock failed job
    const request = new NextRequest('http://localhost/api/ingestion/jobs/2');
    const params = { jobId: '2' };

    // Assert: will fail RED until Plan 03 implementation
    expect(GET).toBeDefined();
    // TODO Plan 03: verify response includes status='failed' and error_message
  });

  it('should detect stale jobs (status=running, updated_at >10 min ago) and mark failed', async () => {
    // Arrange: mock stale job (updated_at 15 minutes ago)
    const staleDate = new Date(Date.now() - 15 * 60 * 1000);
    const request = new NextRequest('http://localhost/api/ingestion/jobs/3');
    const params = { jobId: '3' };

    // Assert: will fail RED until Plan 03 implements stale detection
    expect(GET).toBeDefined();
    // TODO Plan 03: verify DB update called to set status='failed', response returns failed status
  });
});
