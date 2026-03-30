import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// AUDIT-02: ingestion/approve route must wrap each entity write + audit_log
// insert in a db.transaction(). These tests are RED until Plan 25-02 implements
// the transaction wrapping.

// ─── Mock DB ──────────────────────────────────────────────────────────────────
// We need to mock db with a transaction function AND enough query chain support
// for the route's artifact SELECT, conflict-check SELECT, and insert calls.

const mockTx = {
  insert: vi.fn(),
  update: vi.fn(),
  select: vi.fn(),
  delete: vi.fn(),
};

const mockInsertChain = {
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: 999 }]),
};

const mockUpdateChain = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([]),
};

const mockSelectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([]),
};

vi.mock('@/db', () => {
  const dbMock = {
    // transaction is NOT called in the current code — this is what we're testing
    transaction: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
    delete: vi.fn(),
  };
  return { db: dbMock };
});

vi.mock('@/db/schema', async () => {
  // Return minimal table shape objects — the route imports these by name
  const table = (name: string) => ({ _tableName: name });
  return {
    actions: table('actions'),
    risks: table('risks'),
    milestones: table('milestones'),
    keyDecisions: table('key_decisions'),
    engagementHistory: table('engagement_history'),
    stakeholders: table('stakeholders'),
    tasks: table('tasks'),
    businessOutcomes: table('business_outcomes'),
    focusAreas: table('focus_areas'),
    architectureIntegrations: table('architecture_integrations'),
    artifacts: table('artifacts'),
    auditLog: table('audit_log'),
    discoveryItems: table('discovery_items'),
  };
});

// Mock drizzle operators used in the route
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, op: 'eq' })),
  and: vi.fn((...args: unknown[]) => ({ args, op: 'and' })),
  ilike: vi.fn((col: unknown, val: unknown) => ({ col, val, op: 'ilike' })),
}));

// next/server mock — NextRequest needs a valid URL
vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return actual;
});

import { db } from '@/db';

// Helper to build a NextRequest for the approve endpoint
function buildApproveRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/ingestion/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Minimal approved 'action' item with no conflict
const approvedActionItem = {
  entityType: 'action',
  fields: { description: 'Test action', owner: 'Alice' },
  approved: true,
};

describe('ingestion/approve route — audit transaction (AUDIT-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: artifact SELECT returns a valid artifact so route doesn't 404
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 1, ingestion_log_json: {} },
        ]),
      }),
    } as any);

    // Default: insert chain (used by route for entity insert + artifact update)
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 999 }]),
    } as any);

    // Default: update chain (used by route for artifact status update)
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    // transaction mock — NOT called by the route yet (it should be after the fix)
    vi.mocked(db.transaction).mockImplementation(async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
      return callback(mockTx);
    });

    // Mock tx insert chain
    mockTx.insert.mockReturnValue(mockInsertChain);
    mockInsertChain.values.mockReturnThis();
    mockInsertChain.returning.mockResolvedValue([{ id: 999 }]);
  });

  it('AUDIT-02-ING-1: insertItem() wraps entity write + auditLog insert in db.transaction (insert path)', async () => {
    // Lazy import POST so vi.mock hoisting applies
    const { POST } = await import('@/app/api/ingestion/approve/route');

    const req = buildApproveRequest({
      artifactId: 1,
      projectId: 10,
      totalExtracted: 1,
      items: [approvedActionItem],
    });

    await POST(req);

    // FAILS currently: the route calls db.insert directly, not db.transaction
    expect(db.transaction, 'insertItem must wrap entity write + audit insert in db.transaction').toHaveBeenCalled();
  });

  it('AUDIT-02-ING-2: mergeItem() wraps entity update + auditLog insert in db.transaction (merge path)', async () => {
    // Mock findConflict to return a conflict so mergeItem is called
    // The route calls db.select for conflict check — return a conflict for action
    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // First call: artifact SELECT — return valid artifact
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 1, ingestion_log_json: {} }]),
          }),
        } as any;
      }
      // Subsequent calls: conflict-check SELECT — return existing record
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 55 }]),
        }),
      } as any;
    });

    const { POST } = await import('@/app/api/ingestion/approve/route');

    const req = buildApproveRequest({
      artifactId: 1,
      projectId: 10,
      totalExtracted: 1,
      items: [
        {
          ...approvedActionItem,
          conflictResolution: 'merge',
          existingId: 55,
        },
      ],
    });

    await POST(req);

    // FAILS currently: the route calls db.update directly, not db.transaction
    expect(db.transaction, 'mergeItem must wrap entity update + audit insert in db.transaction').toHaveBeenCalled();
  });
});
