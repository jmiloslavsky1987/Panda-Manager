import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// AUDIT-02: workstreams PATCH and knowledge-base PATCH/DELETE/POST must wrap
// entity write + audit_log insert in a db.transaction(). These tests are RED
// until Plan 25-05 implements the transaction wrapping.

// ─── Mock DB ──────────────────────────────────────────────────────────────────

const mockTx = {
  insert: vi.fn(),
  update: vi.fn(),
  select: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/db', () => {
  const dbMock = {
    transaction: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
    delete: vi.fn(),
  };
  return { db: dbMock, default: dbMock };
});

vi.mock('@/db/schema', async () => {
  const table = (name: string) => ({ _tableName: name });
  return {
    workstreams: table('workstreams'),
    knowledgeBase: table('knowledge_base'),
    auditLog: table('audit_log'),
    projects: table('projects'),
    tasks: table('tasks'),
    stakeholders: table('stakeholders'),
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
    planTemplates: table('plan_templates'),
  };
});

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, op: 'eq' })),
  and: vi.fn((...args: unknown[]) => ({ args, op: 'and' })),
  desc: vi.fn((col: unknown) => ({ col, op: 'desc' })),
}));

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return actual;
});

vi.mock('@/lib/queries', () => ({
  searchAllRecords: vi.fn().mockResolvedValue([]),
  updateWorkstreamProgress: vi.fn().mockResolvedValue(undefined),
}));

import { db } from '@/db';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildNextRequest(method: string, url: string, body?: Record<string, unknown>): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─── Workstreams PATCH audit ───────────────────────────────────────────────────

describe('workstreams PATCH route — audit transaction (AUDIT-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // transaction mock — executes callback with mockTx
    vi.mocked(db.transaction).mockImplementation(async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
      return callback(mockTx);
    });

    // db.select — returns before-state workstream
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 10, state: 'active', lead: 'Alice', percent_complete: 50 }]),
      }),
    } as any);

    // tx.update chain
    mockTx.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    // tx.select for after-state
    mockTx.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 10, state: 'inactive', lead: 'Alice', percent_complete: 75 }]),
      }),
    } as any);

    // tx.insert chain
    mockTx.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    } as any);
  });

  it('AUDIT-02-WS-1: PATCH handler wraps workstream update + auditLog insert in db.transaction', async () => {
    const { PATCH } = await import('@/app/api/workstreams/[id]/route');

    const req = buildNextRequest('PATCH', 'http://localhost/api/workstreams/10', { state: 'inactive' });
    await PATCH(req, { params: Promise.resolve({ id: '10' }) });

    expect(db.transaction, 'workstreams PATCH must use db.transaction for entity + audit write').toHaveBeenCalled();
  });

  it('AUDIT-02-WS-2: PATCH handler inserts auditLog row inside transaction', async () => {
    const { PATCH } = await import('@/app/api/workstreams/[id]/route');

    const req = buildNextRequest('PATCH', 'http://localhost/api/workstreams/10', { percent_complete: 75 });
    await PATCH(req, { params: Promise.resolve({ id: '10' }) });

    expect(mockTx.insert, 'auditLog insert must happen inside transaction').toHaveBeenCalled();
  });
});

// ─── Knowledge-Base PATCH audit ───────────────────────────────────────────────

describe('knowledge-base PATCH route — audit transaction (AUDIT-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(db.transaction).mockImplementation(async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
      return callback(mockTx);
    });

    // db.select — returns before-state kb entry
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 5, title: 'Old title', content: 'Old content', source_trace: null }]),
      }),
    } as any);

    // tx.update chain with .returning()
    mockTx.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 5, title: 'New title', content: 'Old content', source_trace: null }]),
        }),
      }),
    } as any);

    // tx.insert chain
    mockTx.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    } as any);
  });

  it('AUDIT-02-KB-1: PATCH handler wraps kb update + auditLog insert in db.transaction', async () => {
    const { PATCH } = await import('@/app/api/knowledge-base/[id]/route');

    const req = buildNextRequest('PATCH', 'http://localhost/api/knowledge-base/5', { title: 'New title' });
    await PATCH(req, { params: Promise.resolve({ id: '5' }) });

    expect(db.transaction, 'kb PATCH must use db.transaction').toHaveBeenCalled();
  });

  it('AUDIT-02-KB-2: PATCH handler inserts auditLog row inside transaction', async () => {
    const { PATCH } = await import('@/app/api/knowledge-base/[id]/route');

    const req = buildNextRequest('PATCH', 'http://localhost/api/knowledge-base/5', { title: 'New title' });
    await PATCH(req, { params: Promise.resolve({ id: '5' }) });

    expect(mockTx.insert, 'auditLog insert must happen inside transaction').toHaveBeenCalled();
  });
});

// ─── Knowledge-Base DELETE audit ──────────────────────────────────────────────

describe('knowledge-base DELETE route — audit transaction (AUDIT-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(db.transaction).mockImplementation(async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
      return callback(mockTx);
    });

    // db.select — returns before-state kb entry
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 7, title: 'To delete', content: 'Content' }]),
      }),
    } as any);

    // tx.delete chain
    mockTx.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    } as any);

    // tx.insert chain
    mockTx.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    } as any);
  });

  it('AUDIT-02-KB-3: DELETE handler wraps kb delete + auditLog insert in db.transaction', async () => {
    const { DELETE } = await import('@/app/api/knowledge-base/[id]/route');

    const req = buildNextRequest('DELETE', 'http://localhost/api/knowledge-base/7');
    await DELETE(req, { params: Promise.resolve({ id: '7' }) });

    expect(db.transaction, 'kb DELETE must use db.transaction').toHaveBeenCalled();
  });

  it('AUDIT-02-KB-4: DELETE handler inserts auditLog row inside transaction', async () => {
    const { DELETE } = await import('@/app/api/knowledge-base/[id]/route');

    const req = buildNextRequest('DELETE', 'http://localhost/api/knowledge-base/7');
    await DELETE(req, { params: Promise.resolve({ id: '7' }) });

    expect(mockTx.insert, 'auditLog insert must happen inside transaction').toHaveBeenCalled();
  });
});

// ─── Knowledge-Base POST audit ────────────────────────────────────────────────

describe('knowledge-base POST route — audit transaction (AUDIT-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(db.transaction).mockImplementation(async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
      return callback(mockTx);
    });

    // tx.insert chain — returns new row on first call (knowledgeBase), second call for auditLog
    mockTx.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 20, title: 'New entry', content: 'Content', project_id: 1 }]),
      }),
    } as any);

    // db.select — for project source_trace lookup (called outside transaction)
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ customer: 'Acme Corp' }]),
      }),
    } as any);
  });

  it('AUDIT-02-KB-5: POST handler wraps kb insert + auditLog insert in db.transaction', async () => {
    const { POST } = await import('@/app/api/knowledge-base/route');

    const req = buildNextRequest('POST', 'http://localhost/api/knowledge-base', {
      title: 'New entry',
      content: 'Some content',
    });
    await POST(req);

    expect(db.transaction, 'kb POST must use db.transaction').toHaveBeenCalled();
  });

  it('AUDIT-02-KB-6: POST handler inserts auditLog row inside transaction with action=create', async () => {
    const { POST } = await import('@/app/api/knowledge-base/route');

    const req = buildNextRequest('POST', 'http://localhost/api/knowledge-base', {
      title: 'New entry',
      content: 'Some content',
    });
    await POST(req);

    // tx.insert should be called twice: once for knowledgeBase, once for auditLog
    expect(mockTx.insert, 'auditLog insert must happen inside transaction').toHaveBeenCalledTimes(2);
  });
});
