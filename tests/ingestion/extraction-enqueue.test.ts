import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies with captured functions
const addMock = vi.fn().mockResolvedValue({ id: 'bullmq-job-123' });
const closeMock = vi.fn().mockResolvedValue(undefined);
const insertMock = vi.fn();

vi.mock('../../db', () => ({
  default: {
    select: vi.fn(),
    insert: () => ({
      values: () => ({
        returning: insertMock,
      }),
    }),
  },
}));

vi.mock('bullmq', () => {
  return {
    Queue: class MockQueue {
      add = addMock;
      close = closeMock;
    },
  };
});

vi.mock('../../lib/auth-server', () => ({
  requireSession: vi.fn().mockResolvedValue({ session: { user: { id: 'user-1' } }, redirectResponse: null }),
  requireProjectRole: vi.fn().mockResolvedValue({ session: { user: { id: 'user-1' } }, redirectResponse: null, projectRole: 'admin' }),
}));

vi.mock('../../worker/connection', () => ({
  createApiRedisConnection: vi.fn().mockReturnValue({}),
}));

// Import the route handler
import { POST } from '../../app/api/ingestion/extract/route';

describe('app/api/ingestion/extract/route.ts — POST enqueue handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default behavior
    insertMock.mockResolvedValue([{ id: 1 }]);
  });

  it('should return { jobIds: number[], batchId: string } on success', async () => {
    // Arrange
    insertMock
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([{ id: 2 }]);

    const body = { artifactIds: [10, 20], projectId: 5 };
    const request = new NextRequest('http://localhost/api/ingestion/extract', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Act
    const response = await POST(request);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(json).toHaveProperty('jobIds');
    expect(json).toHaveProperty('batchId');
    expect(Array.isArray(json.jobIds)).toBe(true);
    expect(json.jobIds).toEqual([1, 2]);
    expect(typeof json.batchId).toBe('string');
  });

  it('should create one extraction_jobs row per artifactId', async () => {
    // Arrange
    insertMock
      .mockResolvedValueOnce([{ id: 3 }])
      .mockResolvedValueOnce([{ id: 4 }])
      .mockResolvedValueOnce([{ id: 5 }]);

    const body = { artifactIds: [30, 40, 50], projectId: 6 };
    const request = new NextRequest('http://localhost/api/ingestion/extract', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Act
    await POST(request);

    // Assert: DB insert returning should be called 3 times (once per artifactId)
    expect(insertMock).toHaveBeenCalledTimes(3);
  });

  it('should call queue.add() once per artifact with job name "document-extraction"', async () => {
    // Arrange
    insertMock.mockResolvedValueOnce([{ id: 6 }]);

    const body = { artifactIds: [60], projectId: 7 };
    const request = new NextRequest('http://localhost/api/ingestion/extract', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Act
    await POST(request);

    // Assert
    expect(addMock).toHaveBeenCalledWith(
      'document-extraction',
      expect.objectContaining({ jobId: 6, artifactId: 60, projectId: 7 }),
      expect.objectContaining({ jobId: 'extraction-6' })
    );
  });

  it('should call queue.close() after all enqueues', async () => {
    // Arrange
    insertMock
      .mockResolvedValueOnce([{ id: 7 }])
      .mockResolvedValueOnce([{ id: 8 }]);

    const body = { artifactIds: [70, 80], projectId: 8 };
    const request = new NextRequest('http://localhost/api/ingestion/extract', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Act
    await POST(request);

    // Assert
    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(addMock).toHaveBeenCalledTimes(2);
  });

  it('should return 400 if body is invalid (missing artifactIds or projectId)', async () => {
    // Arrange: invalid body (missing artifactIds)
    const body = { projectId: 9 };
    const request = new NextRequest('http://localhost/api/ingestion/extract', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Act
    const response = await POST(request);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(json).toHaveProperty('error');
  });
});
