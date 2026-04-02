import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('../../db', () => ({
  default: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { batch_id: 'batch-1', status: 'completed', progress_pct: 100 },
          { batch_id: 'batch-1', status: 'completed', progress_pct: 100 },
          { batch_id: 'batch-2', status: 'running', progress_pct: 60 },
          { batch_id: 'batch-2', status: 'pending', progress_pct: 0 },
        ]),
      }),
    }),
  },
}));

vi.mock('../../lib/auth-server', () => ({
  requireSession: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}));

// Import the route handler (will fail RED — file doesn't exist yet)
import { GET } from '../../app/api/projects/[projectId]/extraction-status/route';

describe('app/api/projects/[projectId]/extraction-status/route.ts — batch status handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return jobs grouped by batch_id', async () => {
    // Arrange
    const request = new NextRequest('http://localhost/api/projects/5/extraction-status');
    const params = { projectId: '5' };

    // Act & Assert: will fail RED until Plan 03 creates route
    expect(GET).toBeDefined();
    // TODO Plan 03: call GET(request, { params }), verify response groups jobs by batch_id
  });

  it('should set batch_complete=true only when ALL jobs in batch are completed or failed (terminal)', async () => {
    // Arrange: batch-1 has all completed jobs
    const request = new NextRequest('http://localhost/api/projects/5/extraction-status');
    const params = { projectId: '5' };

    // Assert: will fail RED until Plan 03 implementation
    expect(GET).toBeDefined();
    // TODO Plan 03: verify batch-1 has batch_complete=true, batch-2 has batch_complete=false
  });

  it('should set batch_complete=false if any job in batch is pending or running', async () => {
    // Arrange: batch-2 has mixed status (running + pending)
    const request = new NextRequest('http://localhost/api/projects/5/extraction-status');
    const params = { projectId: '5' };

    // Assert: will fail RED until Plan 03 implementation
    expect(GET).toBeDefined();
    // TODO Plan 03: verify batch-2 has batch_complete=false
  });

  it('should return empty array if no active jobs for project', async () => {
    // Arrange: mock empty result
    const request = new NextRequest('http://localhost/api/projects/999/extraction-status');
    const params = { projectId: '999' };

    // Assert: will fail RED until Plan 03 implementation
    expect(GET).toBeDefined();
    // TODO Plan 03: verify response is empty array []
  });
});
