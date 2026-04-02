import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies with captured functions
const selectMock = vi.fn();
const updateMock = vi.fn();

vi.mock('../../db', () => ({
  default: {
    select: selectMock,
    update: () => ({
      set: () => ({
        where: updateMock,
      }),
    }),
  },
}));

vi.mock('../../lib/auth-server', () => ({
  requireSession: vi.fn().mockResolvedValue({ session: { user: { id: 'user-1' } }, redirectResponse: null }),
}));

// Import the route handler (will fail RED — file doesn't exist yet)
import { GET } from '../../app/api/ingestion/jobs/[jobId]/route';

describe('app/api/ingestion/jobs/[jobId]/route.ts — GET polling handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: return a running job
    selectMock.mockReturnValue({
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
    });
  });

  it('should return { status, progress_pct, current_chunk, total_chunks } from DB row', async () => {
    // Arrange
    const request = new NextRequest('http://localhost/api/ingestion/jobs/1');
    const params = Promise.resolve({ jobId: '1' });

    // Act
    const response = await GET(request, { params });
    const json = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(json).toHaveProperty('status', 'running');
    expect(json).toHaveProperty('progress_pct', 45);
    expect(json).toHaveProperty('current_chunk', 3);
    expect(json).toHaveProperty('total_chunks', 7);
  });

  it('should return 404 if jobId not found', async () => {
    // Arrange: mock empty result
    selectMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const request = new NextRequest('http://localhost/api/ingestion/jobs/999');
    const params = Promise.resolve({ jobId: '999' });

    // Act
    const response = await GET(request, { params });
    const json = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(json).toHaveProperty('error');
  });

  it('should return status=failed with error_message if job row has status=failed', async () => {
    // Arrange: mock failed job
    selectMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 2,
            status: 'failed',
            progress_pct: 30,
            current_chunk: 2,
            total_chunks: 5,
            error_message: 'Claude API timeout',
            updated_at: new Date(),
          },
        ]),
      }),
    });

    const request = new NextRequest('http://localhost/api/ingestion/jobs/2');
    const params = Promise.resolve({ jobId: '2' });

    // Act
    const response = await GET(request, { params });
    const json = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(json).toHaveProperty('status', 'failed');
    expect(json).toHaveProperty('error_message', 'Claude API timeout');
  });

  it('should detect stale jobs (status=running, updated_at >10 min ago) and mark failed', async () => {
    // Arrange: mock stale job (updated_at 15 minutes ago)
    const staleDate = new Date(Date.now() - 15 * 60 * 1000);
    selectMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 3,
            status: 'running',
            progress_pct: 20,
            current_chunk: 1,
            total_chunks: 4,
            error_message: null,
            updated_at: staleDate,
          },
        ]),
      }),
    });
    updateMock.mockResolvedValue([{ id: 3 }]);

    const request = new NextRequest('http://localhost/api/ingestion/jobs/3');
    const params = Promise.resolve({ jobId: '3' });

    // Act
    const response = await GET(request, { params });
    const json = await response.json();

    // Assert: should mark as failed and return failed status
    expect(updateMock).toHaveBeenCalled();
    expect(json).toHaveProperty('status', 'failed');
    expect(json).toHaveProperty('error_message');
    expect(json.error_message).toContain('stale');
  });
});
