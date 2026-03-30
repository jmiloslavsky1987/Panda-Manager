import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// AUDIT-02: discovery/approve route must wrap each entity write + audit_log
// insert in a db.transaction(). These tests are RED until Plan 25-02 implements
// the transaction wrapping in insertDiscoveredItem().

// ─── Mock DB ──────────────────────────────────────────────────────────────────

const mockTx = {
  insert: vi.fn(),
  update: vi.fn(),
  select: vi.fn(),
};

vi.mock('@/db', () => {
  const dbMock = {
    // transaction is NOT called in the current code — this is what we're testing
    transaction: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
  };
  return { db: dbMock };
});

vi.mock('@/db/schema', async () => {
  const table = (name: string) => ({ _tableName: name });
  return {
    actions: table('actions'),
    risks: table('risks'),
    milestones: table('milestones'),
    keyDecisions: table('key_decisions'),
    engagementHistory: table('engagement_history'),
    stakeholders: table('stakeholders'),
    tasks: table('tasks'),
    discoveryItems: table('discovery_items'),
    auditLog: table('audit_log'),
    artifacts: table('artifacts'),
    businessOutcomes: table('business_outcomes'),
    focusAreas: table('focus_areas'),
    architectureIntegrations: table('architecture_integrations'),
  };
});

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, op: 'eq' })),
  and: vi.fn((...args: unknown[]) => ({ args, op: 'and' })),
}));

import { db } from '@/db';

function buildDiscoveryApproveRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/discovery/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Fake discovery item for 'action' suggested_field
const fakeDiscoveryItem = {
  id: 42,
  project_id: 10,
  source: 'slack',
  content: 'Follow up with Alice on deployment timeline',
  suggested_field: 'action',
  status: 'pending',
  scan_timestamp: null,
  source_url: null,
  source_excerpt: null,
  scan_id: 'scan-001',
  created_at: new Date('2026-03-01T00:00:00Z'),
};

describe('discovery/approve route — audit transaction (AUDIT-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // discovery SELECT: first call returns the discovery item
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([fakeDiscoveryItem]),
      }),
    } as any);

    // insert chain (used by route for entity insert before the fix)
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 99 }]),
    } as any);

    // update chain (used by route to mark discovery_item status='approved')
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    // transaction mock — the implementation calls the callback with mockTx
    vi.mocked(db.transaction).mockImplementation(async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
      const mockTxInsertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 99 }]),
      };
      mockTx.insert.mockReturnValue(mockTxInsertChain);
      mockTx.update.mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      });
      return callback(mockTx);
    });
  });

  it('AUDIT-02-DISC-1: insertDiscoveredItem() wraps entity write + auditLog insert in db.transaction', async () => {
    const { POST } = await import('@/app/api/discovery/approve/route');

    const req = buildDiscoveryApproveRequest({
      projectId: 10,
      itemIds: [42],
    });

    await POST(req);

    // FAILS currently: the route calls db.insert directly, not db.transaction
    expect(
      db.transaction,
      'insertDiscoveredItem must wrap entity write + audit insert in db.transaction',
    ).toHaveBeenCalled();
  });

  it('AUDIT-02-DISC-2: audit entry for discovered action has before_json: null and after_json with description', async () => {
    // This test documents the expected audit entry shape after the fix.
    // Currently RED because db.transaction is never called.
    const { POST } = await import('@/app/api/discovery/approve/route');

    let capturedAuditInsert: Record<string, unknown> | null = null;

    vi.mocked(db.transaction).mockImplementation(async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
      const mockTxInsertChain = {
        values: vi.fn().mockImplementation((row: Record<string, unknown>) => {
          // Capture the audit_log insert values when the auditLog table is targeted
          if (row.entity_type || row.before_json !== undefined) {
            capturedAuditInsert = row;
          }
          return mockTxInsertChain;
        }),
        returning: vi.fn().mockResolvedValue([{ id: 99 }]),
      };
      mockTx.insert.mockReturnValue(mockTxInsertChain);
      mockTx.update.mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      });
      return callback(mockTx);
    });

    const req = buildDiscoveryApproveRequest({
      projectId: 10,
      itemIds: [42],
    });

    await POST(req);

    // FAILS currently: db.transaction is never called, so capturedAuditInsert stays null
    expect(
      db.transaction,
      'insertDiscoveredItem must use db.transaction for audit insert',
    ).toHaveBeenCalled();

    // After the fix passes, the audit entry should have:
    // before_json: null (this is an insert, not an update)
    // after_json: contains the entity description from fakeDiscoveryItem.content
    expect(capturedAuditInsert?.before_json).toBeNull();
    expect(capturedAuditInsert?.after_json).toBeDefined();
  });
});
