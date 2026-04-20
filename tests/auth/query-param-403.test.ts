// tests/auth/query-param-403.test.ts
// RED — TENANT-02: Query-param routes enforce project membership via requireProjectRole()
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/server before importing route handlers
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

// Mock db to avoid real connection
vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 1 }]),
  },
  default: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 1 }]),
  }
}));

// Mock auth module
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock auth-server to spy on requireSession and requireProjectRole
const mockRequireSession = vi.fn();
const mockRequireProjectRole = vi.fn();

vi.mock('@/lib/auth-server', () => ({
  requireSession: mockRequireSession,
  requireProjectRole: mockRequireProjectRole,
}));

beforeEach(() => {
  mockRequireSession.mockReset();
  mockRequireProjectRole.mockReset();

  // Default: both auth checks succeed
  mockRequireSession.mockResolvedValue({
    session: { user: { id: 'user-1', email: 'test@example.com', role: 'user' } },
    redirectResponse: null,
  });
  mockRequireProjectRole.mockResolvedValue({
    session: { user: { id: 'user-1', email: 'test@example.com', role: 'user' } },
    redirectResponse: null,
    projectRole: 'user',
  });
});

describe('Query-Param Route 403 Enforcement — TENANT-02', () => {
  describe('GET /api/artifacts?projectId=X', () => {
    it('calls requireProjectRole(projectId), not requireSession()', async () => {
      // Import after mocks are set up
      const { GET } = await import('@/app/api/artifacts/route');

      const mockReq = {
        nextUrl: {
          searchParams: new URLSearchParams('projectId=123'),
        },
      } as any;

      await GET(mockReq);

      // This WILL FAIL because current implementation calls requireSession()
      expect(mockRequireProjectRole).toHaveBeenCalledWith(123);
      expect(mockRequireSession).not.toHaveBeenCalled();
    });

    it('returns 403 when user is not a member of the project', async () => {
      // Mock requireProjectRole to return 403 redirectResponse
      mockRequireProjectRole.mockResolvedValue({
        session: null,
        redirectResponse: {
          status: 403,
          body: { error: 'Forbidden: not a member of this project' },
        },
        projectRole: null,
      });

      const { GET } = await import('@/app/api/artifacts/route');

      const mockReq = {
        nextUrl: {
          searchParams: new URLSearchParams('projectId=456'),
        },
      } as any;

      const response = await GET(mockReq);

      // This WILL FAIL because current implementation doesn't call requireProjectRole
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/artifacts', () => {
    it('calls requireProjectRole(project_id from body)', async () => {
      const { POST } = await import('@/app/api/artifacts/route');

      const mockReq = {
        json: vi.fn().mockResolvedValue({
          project_id: 789,
          name: 'Test Artifact',
        }),
      } as any;

      await POST(mockReq);

      // This WILL FAIL because current implementation calls requireSession()
      expect(mockRequireProjectRole).toHaveBeenCalledWith(789);
      expect(mockRequireSession).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/tasks?projectId=N', () => {
    it('calls requireProjectRole(projectId)', async () => {
      const { GET } = await import('@/app/api/tasks/route');

      const mockReq = {
        url: 'http://localhost:3000/api/tasks?projectId=321',
      } as any;

      await GET(mockReq);

      // This WILL FAIL because current implementation calls requireSession()
      expect(mockRequireProjectRole).toHaveBeenCalledWith(321);
      expect(mockRequireSession).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/ingestion/upload', () => {
    it('calls requireProjectRole(projectId from formData)', async () => {
      // Mock file-related imports
      vi.mock('fs/promises', () => ({
        default: {
          mkdir: vi.fn().mockResolvedValue(undefined),
          writeFile: vi.fn().mockResolvedValue(undefined),
        },
      }));
      vi.mock('@/lib/document-extractor', () => ({
        validateFile: vi.fn().mockReturnValue({ valid: true }),
      }));
      vi.mock('@/lib/settings', () => ({
        readSettings: vi.fn().mockResolvedValue({ workspace_path: '/tmp' }),
      }));

      const { POST } = await import('@/app/api/ingestion/upload/route');

      const mockFile = new Blob(['test'], { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('project_id', '555');
      formData.append('files', mockFile, 'test.pdf');

      const mockReq = {
        formData: vi.fn().mockResolvedValue(formData),
      } as any;

      await POST(mockReq);

      // This WILL FAIL because current implementation calls requireSession()
      expect(mockRequireProjectRole).toHaveBeenCalledWith(555);
      expect(mockRequireSession).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/ingestion/extract', () => {
    it('calls requireProjectRole(projectId from body)', async () => {
      // Mock BullMQ
      vi.mock('bullmq', () => ({
        Queue: vi.fn().mockImplementation(() => ({
          add: vi.fn().mockResolvedValue({ id: 'job-1' }),
          close: vi.fn().mockResolvedValue(undefined),
        })),
      }));
      vi.mock('@/worker/connection', () => ({
        createApiRedisConnection: vi.fn().mockReturnValue({}),
      }));

      const { POST } = await import('@/app/api/ingestion/extract/route');

      const mockReq = {
        json: vi.fn().mockResolvedValue({
          artifactIds: [1, 2, 3],
          projectId: 999,
        }),
      } as any;

      await POST(mockReq);

      // This WILL FAIL because current implementation calls requireSession()
      expect(mockRequireProjectRole).toHaveBeenCalledWith(999);
      expect(mockRequireSession).not.toHaveBeenCalled();
    });
  });
});
