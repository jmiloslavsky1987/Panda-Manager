import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DB — vi.mock is hoisted; use inline vi.fn()
vi.mock('@/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn() }),
  },
}));

// Mock db/schema — provide minimal auditLog table shape
vi.mock('@/db/schema', () => ({
  auditLog: {
    entity_type: 'entity_type',
    entity_id: 'entity_id',
    action: 'action',
    actor_id: 'actor_id',
    before_json: 'before_json',
    after_json: 'after_json',
  },
}));

// lib/audit.ts does not exist yet — lazy-import inside tests so each test
// reports its own failure rather than the whole suite failing at import time.
// When the module is missing, writeAuditLog will be undefined and tests will
// throw TypeError("writeAuditLog is not a function") — valid RED state.
async function getWriteAuditLog() {
  try {
    const mod = await import('@/lib/audit');
    return mod.writeAuditLog;
  } catch {
    return undefined as unknown as typeof import('@/lib/audit')['writeAuditLog'];
  }
}

import { db } from '@/db';

describe('writeAuditLog() helper (AUDIT-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-wire mock chain so insert().values() is trackable per test
    const mockValues = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);
  });

  it('AUDIT-02-1: inserts a row with correct field mapping for action=update', async () => {
    const writeAuditLog = await getWriteAuditLog();
    expect(writeAuditLog, 'writeAuditLog must be a function — lib/audit.ts not yet implemented').toBeTypeOf('function');

    const beforeState = { id: 1, description: 'Old description', owner: 'Alice' };
    const afterState  = { id: 1, description: 'New description', owner: 'Alice' };

    await writeAuditLog({
      entityType: 'action',
      entityId: 1,
      action: 'update',
      actorId: 'default',
      beforeJson: beforeState,
      afterJson: afterState,
    });

    expect(db.insert).toHaveBeenCalledOnce();

    const insertTarget = vi.mocked(db.insert).mock.calls[0][0];
    expect(insertTarget).toBeDefined(); // auditLog table passed to insert()

    const valuesCall = vi.mocked(db.insert).mock.results[0].value.values;
    expect(valuesCall).toHaveBeenCalledOnce();

    const row = valuesCall.mock.calls[0][0];
    expect(row.entity_type).toBe('action');
    expect(row.entity_id).toBe(1);
    expect(row.action).toBe('update');
    expect(row.actor_id).toBe('default');
    expect(row.before_json).toEqual(beforeState);
    expect(row.after_json).toEqual(afterState);
  });

  it('AUDIT-02-2: inserts a row for action=create with null before_json and valid after_json', async () => {
    const writeAuditLog = await getWriteAuditLog();
    expect(writeAuditLog, 'writeAuditLog must be a function — lib/audit.ts not yet implemented').toBeTypeOf('function');

    const afterState = { id: 5, description: 'New risk item', owner: 'Bob' };

    await writeAuditLog({
      entityType: 'risk',
      entityId: 5,
      action: 'create',
      actorId: 'default',
      beforeJson: null,
      afterJson: afterState,
    });

    expect(db.insert).toHaveBeenCalledOnce();

    const valuesCall = vi.mocked(db.insert).mock.results[0].value.values;
    const row = valuesCall.mock.calls[0][0];
    expect(row.action).toBe('create');
    expect(row.before_json).toBeNull();
    expect(row.after_json).toEqual(afterState);
  });

  it('AUDIT-02-3: inserts a row for action=delete with valid before_json and null after_json', async () => {
    const writeAuditLog = await getWriteAuditLog();
    expect(writeAuditLog, 'writeAuditLog must be a function — lib/audit.ts not yet implemented').toBeTypeOf('function');

    const beforeState = { id: 3, title: 'Milestone: Go-live', status: 'pending' };

    await writeAuditLog({
      entityType: 'milestone',
      entityId: 3,
      action: 'delete',
      actorId: 'default',
      beforeJson: beforeState,
      afterJson: null,
    });

    expect(db.insert).toHaveBeenCalledOnce();

    const valuesCall = vi.mocked(db.insert).mock.results[0].value.values;
    const row = valuesCall.mock.calls[0][0];
    expect(row.action).toBe('delete');
    expect(row.before_json).toEqual(beforeState);
    expect(row.after_json).toBeNull();
  });

  it('AUDIT-02-4: is callable with a numeric entity_id', async () => {
    const writeAuditLog = await getWriteAuditLog();
    expect(writeAuditLog, 'writeAuditLog must be a function — lib/audit.ts not yet implemented').toBeTypeOf('function');

    await writeAuditLog({
      entityType: 'stakeholder',
      entityId: 42,
      action: 'update',
      actorId: 'default',
      beforeJson: { name: 'Old Name' },
      afterJson: { name: 'New Name' },
    });

    const valuesCall = vi.mocked(db.insert).mock.results[0].value.values;
    const row = valuesCall.mock.calls[0][0];
    expect(typeof row.entity_id).toBe('number');
    expect(row.entity_id).toBe(42);
  });

  it('AUDIT-02-5: is callable with a null entity_id (create-before-insert case)', async () => {
    const writeAuditLog = await getWriteAuditLog();
    expect(writeAuditLog, 'writeAuditLog must be a function — lib/audit.ts not yet implemented').toBeTypeOf('function');

    await writeAuditLog({
      entityType: 'action',
      entityId: null,
      action: 'create',
      actorId: 'default',
      beforeJson: null,
      afterJson: { description: 'Pending action', owner: 'Charlie' },
    });

    const valuesCall = vi.mocked(db.insert).mock.results[0].value.values;
    const row = valuesCall.mock.calls[0][0];
    expect(row.entity_id).toBeNull();
  });
});
