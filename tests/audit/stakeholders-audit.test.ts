import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// AUDIT-02: stakeholders POST route must wrap entity write + audit_log
// insert in a db.transaction(). These tests are RED until Plan 25-04 implements
// the transaction wrapping.

// ─── Mock DB ──────────────────────────────────────────────────────────────────

const mockTx = {
  insert: vi.fn(),
};

const mockInsertChain = {
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: 77, project_id: 1, name: 'Alice', source: 'manual' }]),
};

vi.mock('@/db', () => {
  const dbMock = {
    transaction: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
  };
  return { db: dbMock };
});

vi.mock('@/db/schema', async () => {
  const table = (name: string) => ({ _tableName: name });
  return {
    stakeholders: table('stakeholders'),
    auditLog: table('audit_log'),
    tasks: table('tasks'),
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
    workstreams: table('workstreams'),
  };
});

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, op: 'eq' })),
  and: vi.fn((...args: unknown[]) => ({ args, op: 'and' })),
}));

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return actual;
});

import { db } from '@/db';

function buildStakeholderRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/stakeholders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validStakeholderBody = {
  project_id: 1,
  name: 'Alice',
  role: 'Champion',
  source: 'manual',
};

describe('stakeholders POST route — audit transaction (AUDIT-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // transaction mock — executes callback with mockTx
    vi.mocked(db.transaction).mockImplementation(async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
      return callback(mockTx);
    });

    // Direct db.insert (used if transaction is not in place)
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 77, project_id: 1, name: 'Alice', source: 'manual' }]),
    } as any);

    // tx.insert chain
    mockTx.insert.mockReturnValue(mockInsertChain);
    mockInsertChain.values.mockReturnThis();
    mockInsertChain.returning.mockResolvedValue([{ id: 77, project_id: 1, name: 'Alice', source: 'manual' }]);
  });

  it('AUDIT-02-STK-1: POST handler wraps stakeholder insert + auditLog insert in db.transaction', async () => {
    const { POST } = await import('@/app/api/stakeholders/route');

    const req = buildStakeholderRequest(validStakeholderBody);
    await POST(req);

    expect(db.transaction, 'stakeholders POST must use db.transaction for entity + audit write').toHaveBeenCalled();
  });

  it('AUDIT-02-STK-2: POST handler inserts auditLog row inside transaction with action=create', async () => {
    const { POST } = await import('@/app/api/stakeholders/route');

    const req = buildStakeholderRequest(validStakeholderBody);
    await POST(req);

    // tx.insert should be called twice: once for stakeholders, once for auditLog
    expect(mockTx.insert).toHaveBeenCalledTimes(2);
  });

  it('AUDIT-02-STK-3: POST handler still returns 201 with the created stakeholder', async () => {
    const { POST } = await import('@/app/api/stakeholders/route');

    const req = buildStakeholderRequest(validStakeholderBody);
    const response = await POST(req);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({ id: 77, name: 'Alice' });
  });
});
