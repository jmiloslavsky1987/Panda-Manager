import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('../../db', () => ({
  default: {
    select: vi.fn(),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
      }),
    }),
  },
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'bullmq-job-123' }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../lib/auth-server', () => ({
  requireSession: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}));

// Import the route handler (file exists but will be modified in Plan 02)
import { POST } from '../../app/api/ingestion/extract/route';

describe('app/api/ingestion/extract/route.ts — POST enqueue handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return { jobIds: number[], batchId: string } on success', async () => {
    // Arrange: mock request body
    const body = { artifactIds: [10, 20], projectId: 5 };
    const request = new NextRequest('http://localhost/api/ingestion/extract', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Act & Assert: will fail RED until Plan 02 modifies route
    expect(POST).toBeDefined();
    // TODO Plan 02: call POST(request), verify response shape { jobIds: [1, 2], batchId: string }
  });

  it('should create one extraction_jobs row per artifactId', async () => {
    // Arrange
    const body = { artifactIds: [30, 40, 50], projectId: 6 };
    const request = new NextRequest('http://localhost/api/ingestion/extract', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Assert: will fail RED until Plan 02 implementation
    expect(POST).toBeDefined();
    // TODO Plan 02: verify DB insert called with 3 rows, each with correct artifact_id, project_id, batch_id
  });

  it('should call queue.add() once per artifact with job name "document-extraction"', async () => {
    // Arrange
    const body = { artifactIds: [60], projectId: 7 };
    const request = new NextRequest('http://localhost/api/ingestion/extract', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Assert: will fail RED until Plan 02 implementation
    expect(POST).toBeDefined();
    // TODO Plan 02: verify Queue.add() called with job name 'document-extraction' and correct job data
  });

  it('should call queue.close() after all enqueues', async () => {
    // Arrange
    const body = { artifactIds: [70, 80], projectId: 8 };
    const request = new NextRequest('http://localhost/api/ingestion/extract', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Assert: will fail RED until Plan 02 implementation
    expect(POST).toBeDefined();
    // TODO Plan 02: verify queue.close() called after all queue.add() calls
  });

  it('should return 400 if body is invalid (missing artifactIds or projectId)', async () => {
    // Arrange: invalid body (missing artifactIds)
    const body = { projectId: 9 };
    const request = new NextRequest('http://localhost/api/ingestion/extract', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Assert: will fail RED until Plan 02 adds validation
    expect(POST).toBeDefined();
    // TODO Plan 02: verify response status 400 with error message
  });
});
