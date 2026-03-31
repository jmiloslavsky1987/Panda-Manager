import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// AUDIT-02: tasks route POST/PATCH/DELETE must wrap entity write + audit_log
// insert in a db.transaction(). These tests are RED until Plan 25-04 implements
// the transaction wrapping.

// ─── Mock DB ──────────────────────────────────────────────────────────────────

const mockTx = {
  insert: vi.fn(),
  update: vi.fn(),
  select: vi.fn(),
  delete: vi.fn(),
};

const mockInsertChain = {
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: 101, workstream_id: 5 }]),
};

const mockUpdateChain = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([]),
};

vi.mock('@/db', () => {
  const dbMock = {
    transaction: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
    delete: vi.fn(),
  };
  return { db: dbMock };
});

vi.mock('@/db/schema', async () => {
  const table = (name: string) => ({ _tableName: name });
  return {
    tasks: table('tasks'),
    auditLog: table('audit_log'),
    stakeholders: table('stakeholders'),
    workstreams: table('workstreams'),
    actions: table('actions'),
    risks: table('risks'),
    milestones: table('milestones'),
    keyDecisions: table('key_decisions'),
    engagementHistory: table('engagement_history'),
    businessOutcomes: table('business_outcomes'),
    focusAreas: table('focus_areas'),
    architectureIntegrations: table('architecture_integrations'),
    artifacts: table('artifacts'),
    discoveryItems: table('discovery_items'),
  };
});

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, op: 'eq' })),
  and: vi.fn((...args: unknown[]) => ({ args, op: 'and' })),
}));

// Mock the workstream progress rollup utility
vi.mock('@/lib/queries', () => ({
  updateWorkstreamProgress: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return actual;
});
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({ user: { id: 'test-user', email: 'test@test.com', role: 'admin' } }),
    },
  },
}));

import { db } from '@/db';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildTaskRequest(method: string, url: string, body?: Record<string, unknown>): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const validTaskBody = {
  project_id: 1,
  title: 'Test task',
  description: 'A test task',
  status: 'todo',
  source: 'manual',
};

// ─── Tasks POST audit ─────────────────────────────────────────────────────────

describe('tasks POST route — audit transaction (AUDIT-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // transaction mock — executes callback with mockTx
    vi.mocked(db.transaction).mockImplementation(async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
      return callback(mockTx);
    });

    // Direct db.insert chain (for non-transactional paths)
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 101, workstream_id: null }]),
    } as any);

    // tx.insert chain
    mockTx.insert.mockReturnValue(mockInsertChain);
    mockInsertChain.values.mockReturnThis();
    mockInsertChain.returning.mockResolvedValue([{ id: 101, workstream_id: null }]);
  });

  it('AUDIT-02-TASK-1: POST handler wraps task insert + auditLog insert in db.transaction', async () => {
    const { POST } = await import('@/app/api/tasks/route');

    const req = buildTaskRequest('POST', 'http://localhost/api/tasks', validTaskBody);
    await POST(req);

    expect(db.transaction, 'tasks POST must use db.transaction for entity + audit write').toHaveBeenCalled();
  });

  it('AUDIT-02-TASK-2: POST handler inserts auditLog row inside transaction with action=create', async () => {
    const { POST } = await import('@/app/api/tasks/route');

    const req = buildTaskRequest('POST', 'http://localhost/api/tasks', validTaskBody);
    await POST(req);

    // tx.insert should be called at least twice: once for tasks, once for auditLog
    expect(mockTx.insert).toHaveBeenCalledTimes(2);
  });
});

// ─── Tasks PATCH audit ────────────────────────────────────────────────────────

describe('tasks PATCH route — audit transaction (AUDIT-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // transaction mock
    vi.mocked(db.transaction).mockImplementation(async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
      return callback(mockTx);
    });

    // db.select — returns existing task for before-state fetch
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 42, workstream_id: 5, title: 'Old title', status: 'todo' }]),
        }),
      }),
    } as any);

    // tx.update chain
    mockTx.update.mockReturnValue(mockUpdateChain);
    mockUpdateChain.set.mockReturnThis();
    mockUpdateChain.where.mockResolvedValue([]);

    // tx.select for after-state (re-read after update)
    mockTx.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 42, workstream_id: 5, title: 'New title', status: 'todo' }]),
        }),
      }),
    } as any);

    // tx.insert chain
    mockTx.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    } as any);
  });

  it('AUDIT-02-TASK-3: PATCH handler wraps task update + auditLog insert in db.transaction', async () => {
    const { PATCH } = await import('@/app/api/tasks/[id]/route');

    const req = buildTaskRequest('PATCH', 'http://localhost/api/tasks/42', { title: 'New title' });
    await PATCH(req, { params: Promise.resolve({ id: '42' }) });

    expect(db.transaction, 'tasks PATCH must use db.transaction for entity + audit write').toHaveBeenCalled();
  });

  it('AUDIT-02-TASK-4: PATCH handler inserts auditLog row inside transaction', async () => {
    const { PATCH } = await import('@/app/api/tasks/[id]/route');

    const req = buildTaskRequest('PATCH', 'http://localhost/api/tasks/42', { status: 'done' });
    await PATCH(req, { params: Promise.resolve({ id: '42' }) });

    expect(mockTx.insert).toHaveBeenCalled();
  });
});

// ─── Tasks DELETE audit ───────────────────────────────────────────────────────

describe('tasks DELETE route — audit transaction (AUDIT-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // transaction mock
    vi.mocked(db.transaction).mockImplementation(async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
      return callback(mockTx);
    });

    // db.select — returns existing task for before-state
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 99, workstream_id: 3, title: 'Task to delete', status: 'todo' }]),
        }),
      }),
    } as any);

    // tx.delete chain
    mockTx.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });

    // tx.insert chain
    mockTx.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    } as any);
  });

  it('AUDIT-02-TASK-5: DELETE handler wraps task delete + auditLog insert in db.transaction', async () => {
    const { DELETE } = await import('@/app/api/tasks/[id]/route');

    const req = buildTaskRequest('DELETE', 'http://localhost/api/tasks/99');
    await DELETE(req, { params: Promise.resolve({ id: '99' }) });

    expect(db.transaction, 'tasks DELETE must use db.transaction for entity + audit write').toHaveBeenCalled();
  });

  it('AUDIT-02-TASK-6: DELETE handler inserts auditLog row inside transaction', async () => {
    const { DELETE } = await import('@/app/api/tasks/[id]/route');

    const req = buildTaskRequest('DELETE', 'http://localhost/api/tasks/99');
    await DELETE(req, { params: Promise.resolve({ id: '99' }) });

    expect(mockTx.insert).toHaveBeenCalled();
  });
});
