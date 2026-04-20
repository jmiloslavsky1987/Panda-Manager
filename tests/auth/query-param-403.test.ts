// tests/auth/query-param-403.test.ts
// TENANT-02: Route handlers must call requireProjectRole(projectId) to enforce membership
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
    select: vi.fn(),
    insert: vi.fn(),
  },
  default: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

// Mock auth module
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock requireProjectRole before importing routes
const mockRequireProjectRole = vi.fn();
const mockRequireSession = vi.fn();
vi.mock('@/lib/auth-server', () => ({
  requireProjectRole: mockRequireProjectRole,
  requireSession: mockRequireSession,
}));

// Mock schema and other dependencies
vi.mock('@/db/schema', () => ({
  artifacts: { id: 'id', project_id: 'project_id', external_id: 'external_id' },
  tasks: { id: 'id', project_id: 'project_id' },
  auditLog: {},
  extractionJobs: { id: 'id' },
  projectMembers: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
}));

vi.mock('@/lib/queries', () => ({
  updateWorkstreamProgress: vi.fn(),
}));

vi.mock('@/lib/document-extractor', () => ({
  validateFile: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/settings', () => ({
  readSettings: vi.fn().mockResolvedValue({ workspace_path: '/tmp/test' }),
}));

vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({}),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@/worker/connection', () => ({
  createApiRedisConnection: vi.fn().mockReturnValue({}),
}));

beforeEach(() => {
  mockRequireProjectRole.mockReset();
});

describe('GET /api/artifacts?projectId=X calls requireProjectRole', () => {
  it('should call requireProjectRole with projectId from query param', async () => {
    mockRequireProjectRole.mockResolvedValue({
      session: { user: { id: 'user-1', email: 'test@example.com' } },
      redirectResponse: null,
      projectRole: 'user',
    });

    // Import after mocks are set up
    const { GET } = await import('@/app/api/artifacts/route');

    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams({ projectId: '123' }),
      },
    } as any;

    const mockDb = (await import('@/db')).db as any;
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    await GET(mockRequest);

    expect(mockRequireProjectRole).toHaveBeenCalledWith(123);
  });
});

describe('POST /api/artifacts calls requireProjectRole', () => {
  it('should call requireProjectRole with project_id from request body', async () => {
    mockRequireProjectRole.mockResolvedValue({
      session: { user: { id: 'user-1', email: 'test@example.com' } },
      redirectResponse: null,
      projectRole: 'user',
    });

    const { POST } = await import('@/app/api/artifacts/route');

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        project_id: 456,
        name: 'Test Artifact',
      }),
    } as any;

    const mockDb = (await import('@/db')).db as any;
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 1, external_id: 'X-001' }]),
      }),
    });

    await POST(mockRequest);

    expect(mockRequireProjectRole).toHaveBeenCalledWith(456);
  });
});

describe('GET /api/tasks?projectId=N calls requireProjectRole', () => {
  it('should call requireProjectRole with projectId from query param', async () => {
    mockRequireProjectRole.mockResolvedValue({
      session: { user: { id: 'user-1', email: 'test@example.com' } },
      redirectResponse: null,
      projectRole: 'user',
    });

    const { GET } = await import('@/app/api/tasks/route');

    const mockRequest = {
      url: 'http://localhost/api/tasks?projectId=789',
    } as any;

    const mockDb = (await import('@/db')).db as any;
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    await GET(mockRequest);

    expect(mockRequireProjectRole).toHaveBeenCalledWith(789);
  });
});

describe('POST /api/tasks calls requireProjectRole', () => {
  it('should call requireProjectRole with project_id from request body', async () => {
    mockRequireProjectRole.mockResolvedValue({
      session: { user: { id: 'user-1', email: 'test@example.com' } },
      redirectResponse: null,
      projectRole: 'user',
    });

    const { POST } = await import('@/app/api/tasks/route');

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        project_id: 999,
        title: 'Test Task',
      }),
    } as any;

    const mockDb = (await import('@/db')).db as any;
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 1 }]),
      }),
    });

    const mockTx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 1, project_id: 999 }]),
        }),
      }),
    };

    mockDb.transaction = vi.fn().mockImplementation(async (fn) => fn(mockTx));

    await POST(mockRequest);

    expect(mockRequireProjectRole).toHaveBeenCalledWith(999);
  });
});

describe('POST /api/ingestion/upload calls requireProjectRole', () => {
  it('should call requireProjectRole with project_id from formData', async () => {
    mockRequireProjectRole.mockResolvedValue({
      session: { user: { id: 'user-1', email: 'test@example.com' } },
      redirectResponse: null,
      projectRole: 'user',
    });

    const { POST } = await import('@/app/api/ingestion/upload/route');

    const mockFile = Object.create(Blob.prototype);
    Object.defineProperty(mockFile, 'name', { value: 'test.pdf', writable: false });
    Object.defineProperty(mockFile, 'size', { value: 1024, writable: false });
    Object.defineProperty(mockFile, 'type', { value: 'application/pdf', writable: false });

    const formData = new FormData();
    formData.append('project_id', '111');
    formData.append('files', mockFile);

    const mockRequest = {
      formData: vi.fn().mockResolvedValue(formData),
    } as any;

    const mockDb = (await import('@/db')).db as any;
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 1, name: 'test.pdf', ingestion_status: 'pending' }]),
      }),
    });

    await POST(mockRequest);

    expect(mockRequireProjectRole).toHaveBeenCalledWith(111);
  });
});

describe('POST /api/ingestion/extract calls requireProjectRole', () => {
  it('should call requireProjectRole with projectId from request body', async () => {
    mockRequireProjectRole.mockResolvedValue({
      session: { user: { id: 'user-1', email: 'test@example.com' } },
      redirectResponse: null,
      projectRole: 'user',
    });

    const { POST } = await import('@/app/api/ingestion/extract/route');

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        artifactIds: [1, 2, 3],
        projectId: 222,
      }),
    } as any;

    const mockDb = (await import('@/db')).default as any;
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 1 }]),
      }),
    });

    await POST(mockRequest);

    expect(mockRequireProjectRole).toHaveBeenCalledWith(222);
  });
});
