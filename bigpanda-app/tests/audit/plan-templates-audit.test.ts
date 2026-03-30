import { describe, it, expect, vi, beforeEach } from 'vitest';

// AUDIT-02: plan-templates DELETE and POST must wrap entity write + audit_log
// insert in a db.transaction(). These tests are RED until Plan 25-05 implements
// the transaction wrapping.

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
    planTemplates: table('plan_templates'),
    auditLog: table('audit_log'),
    workstreams: table('workstreams'),
    knowledgeBase: table('knowledge_base'),
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

import { db } from '@/db';

// ─── Plan-Templates DELETE audit ──────────────────────────────────────────────

describe('plan-templates DELETE route — audit transaction (AUDIT-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // transaction mock — executes callback with mockTx
    vi.mocked(db.transaction).mockImplementation(async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
      return callback(mockTx);
    });

    // db.select — returns before-state template
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 3, name: 'My Template', template_type: 'onboarding', data: null }]),
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

  it('AUDIT-02-PT-1: DELETE handler wraps planTemplates delete + auditLog insert in db.transaction', async () => {
    const { DELETE } = await import('@/app/api/plan-templates/[id]/route');

    const req = new Request('http://localhost/api/plan-templates/3', { method: 'DELETE' });
    await DELETE(req, { params: Promise.resolve({ id: '3' }) });

    expect(db.transaction, 'plan-templates DELETE must use db.transaction for entity + audit write').toHaveBeenCalled();
  });

  it('AUDIT-02-PT-2: DELETE handler inserts auditLog row inside transaction', async () => {
    const { DELETE } = await import('@/app/api/plan-templates/[id]/route');

    const req = new Request('http://localhost/api/plan-templates/3', { method: 'DELETE' });
    await DELETE(req, { params: Promise.resolve({ id: '3' }) });

    expect(mockTx.insert, 'auditLog insert must happen inside transaction').toHaveBeenCalled();
  });

  it('AUDIT-02-PT-3: DELETE returns 404 if template not found', async () => {
    // Override db.select to return empty
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    const { DELETE } = await import('@/app/api/plan-templates/[id]/route');

    const req = new Request('http://localhost/api/plan-templates/999', { method: 'DELETE' });
    const response = await DELETE(req, { params: Promise.resolve({ id: '999' }) });

    expect(response.status).toBe(404);
  });
});

// ─── Plan-Templates POST audit ────────────────────────────────────────────────

describe('plan-templates POST route — audit transaction (AUDIT-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(db.transaction).mockImplementation(async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
      return callback(mockTx);
    });

    // tx.insert chain — returns new template row
    mockTx.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 50, name: 'New Template', template_type: null, data: null }]),
      }),
    } as any);
  });

  it('AUDIT-02-PT-4: POST handler wraps planTemplates insert + auditLog insert in db.transaction', async () => {
    const { POST } = await import('@/app/api/plan-templates/route');

    const req = new Request('http://localhost/api/plan-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Template' }),
    });
    await POST(req);

    expect(db.transaction, 'plan-templates POST must use db.transaction for entity + audit write').toHaveBeenCalled();
  });

  it('AUDIT-02-PT-5: POST handler inserts auditLog row inside transaction with action=create', async () => {
    const { POST } = await import('@/app/api/plan-templates/route');

    const req = new Request('http://localhost/api/plan-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Template' }),
    });
    await POST(req);

    // tx.insert called twice: planTemplates + auditLog
    expect(mockTx.insert, 'auditLog insert must happen inside transaction').toHaveBeenCalledTimes(2);
  });
});
