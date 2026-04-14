import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('../../db', () => {
  const selectMock = vi.fn();

  return {
    default: {
      select: selectMock,
      __selectMock: selectMock,
    },
  };
});

vi.mock('../../lib/auth-server', () => ({
  requireSession: vi.fn().mockResolvedValue({ session: { user: { id: 'user-1' } }, redirectResponse: null }),
}));

// Import the route handler
import { GET } from '../../app/api/projects/[projectId]/extraction-status/route';
import db from '../../db';

describe('app/api/projects/[projectId]/extraction-status/route.ts — batch status handler', () => {
  const selectMock = (db as any).__selectMock;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: return jobs with mixed status
    selectMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([
            { job: { id: 1, batch_id: 'batch-1', status: 'completed', progress_pct: 100, created_at: new Date() }, artifactStatus: null },
            { job: { id: 2, batch_id: 'batch-1', status: 'completed', progress_pct: 100, created_at: new Date() }, artifactStatus: null },
            { job: { id: 3, batch_id: 'batch-2', status: 'running', progress_pct: 60, created_at: new Date() }, artifactStatus: null },
            { job: { id: 4, batch_id: 'batch-2', status: 'pending', progress_pct: 0, created_at: new Date() }, artifactStatus: null },
          ]),
        }),
      }),
    });
  });

  it('should return jobs grouped by batch_id', async () => {
    // Arrange
    const request = new NextRequest('http://localhost/api/projects/5/extraction-status');
    const params = Promise.resolve({ projectId: '5' });

    // Act
    const response = await GET(request, { params });
    const json = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(json).toHaveProperty('jobs');
    expect(json).toHaveProperty('batches');
    expect(Array.isArray(json.jobs)).toBe(true);
    expect(json.batches).toHaveProperty('batch-1');
    expect(json.batches).toHaveProperty('batch-2');
  });

  it('should set batch_complete=true only when ALL jobs in batch are completed or failed (terminal)', async () => {
    // Arrange: batch-1 has all completed jobs
    const request = new NextRequest('http://localhost/api/projects/5/extraction-status');
    const params = Promise.resolve({ projectId: '5' });

    // Act
    const response = await GET(request, { params });
    const json = await response.json();

    // Assert
    expect(json.batches['batch-1'].batch_complete).toBe(true);
    expect(json.batches['batch-1'].all_terminal).toBe(true);
    expect(json.batches['batch-2'].batch_complete).toBe(false);
    expect(json.batches['batch-2'].all_terminal).toBe(false);
  });

  it('should set batch_complete=false if any job in batch is pending or running', async () => {
    // Arrange: batch-2 has mixed status (running + pending)
    const request = new NextRequest('http://localhost/api/projects/5/extraction-status');
    const params = Promise.resolve({ projectId: '5' });

    // Act
    const response = await GET(request, { params });
    const json = await response.json();

    // Assert
    expect(json.batches['batch-2'].batch_complete).toBe(false);
    expect(json.batches['batch-2'].jobs).toHaveLength(2);
    expect(json.batches['batch-2'].jobs.some((j: any) => j.status === 'pending')).toBe(true);
    expect(json.batches['batch-2'].jobs.some((j: any) => j.status === 'running')).toBe(true);
  });

  it('should return empty jobs array if no active jobs for project', async () => {
    // Arrange: mock empty result
    selectMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const request = new NextRequest('http://localhost/api/projects/999/extraction-status');
    const params = Promise.resolve({ projectId: '999' });

    // Act
    const response = await GET(request, { params });
    const json = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(json.jobs).toEqual([]);
    expect(json.batches).toEqual({});
  });
});
