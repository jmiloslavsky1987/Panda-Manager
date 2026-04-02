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

    // Act
    const response = await POST(request);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(json).toHaveProperty('jobIds');
    expect(json).toHaveProperty('batchId');
    expect(Array.isArray(json.jobIds)).toBe(true);
    expect(json.jobIds).toHaveLength(2);
    expect(typeof json.batchId).toBe('string');
  });

  it('should create one extraction_jobs row per artifactId', async () => {
    // Arrange
    const body = { artifactIds: [30, 40, 50], projectId: 6 };
    const request = new NextRequest('http://localhost/api/ingestion/extract', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Import db mock to verify calls
    const dbMock = (await import('../../db')).default;

    // Act
    await POST(request);

    // Assert: DB insert should be called once with values() returning 3 rows
    expect(dbMock.insert).toHaveBeenCalled();
    const insertMock = dbMock.insert as any;
    expect(insertMock().values).toHaveBeenCalled();
  });

  it('should call queue.add() once per artifact with job name "document-extraction"', async () => {
    // Arrange
    const body = { artifactIds: [60], projectId: 7 };
    const request = new NextRequest('http://localhost/api/ingestion/extract', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Import Queue mock
    const { Queue } = await import('bullmq');
    const QueueMock = Queue as any;
    const addMock = vi.fn().mockResolvedValue({ id: 'job-1' });
    QueueMock.mockImplementationOnce(() => ({
      add: addMock,
      close: vi.fn().mockResolvedValue(undefined),
    }));

    // Act
    await POST(request);

    // Assert
    expect(addMock).toHaveBeenCalledWith(
      'document-extraction',
      expect.objectContaining({ artifactId: 60, projectId: 7 }),
      expect.any(Object)
    );
  });

  it('should call queue.close() after all enqueues', async () => {
    // Arrange
    const body = { artifactIds: [70, 80], projectId: 8 };
    const request = new NextRequest('http://localhost/api/ingestion/extract', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Import Queue mock
    const { Queue } = await import('bullmq');
    const QueueMock = Queue as any;
    const closeMock = vi.fn().mockResolvedValue(undefined);
    QueueMock.mockImplementationOnce(() => ({
      add: vi.fn().mockResolvedValue({ id: 'job-1' }),
      close: closeMock,
    }));

    // Act
    await POST(request);

    // Assert
    expect(closeMock).toHaveBeenCalled();
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
