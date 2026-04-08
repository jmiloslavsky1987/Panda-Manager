import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DB — vi.mock is hoisted, use inline vi.fn()
// Create chainable query builder pattern for Drizzle ORM
vi.mock('@/db', () => {
  const createMockQueryBuilder = () => ({
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'test-id', project_id: 'test-proj' }]),
    where: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
  });

  // Create the db methods as vi.fn() so tests can mock them
  const selectFn = vi.fn(() => createMockQueryBuilder());
  const insertFn = vi.fn(() => createMockQueryBuilder());
  const updateFn = vi.fn(() => createMockQueryBuilder());
  const deleteFn = vi.fn(() => createMockQueryBuilder());

  return {
    db: {
      select: selectFn,
      insert: insertFn,
      update: updateFn,
      delete: deleteFn,
      transaction: vi.fn(async (cb: (tx: unknown) => unknown) => {
        // Transaction methods use the SAME vi.fn() instances so tests can mock them
        const txMethods = {
          select: selectFn,
          insert: insertFn,
          update: updateFn,
          delete: deleteFn,
        };
        return cb(txMethods);
      }),
    },
  };
});

// Mock db/schema with minimal shape for all entity tables
vi.mock('@/db/schema', () => ({
  actions: { id: 'id', project_id: 'project_id', description: 'description', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  risks: { id: 'id', project_id: 'project_id', description: 'description', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  milestones: { id: 'id', project_id: 'project_id', name: 'name', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  workstreams: { id: 'id', project_id: 'project_id', name: 'name' },
  keyDecisions: { id: 'id', project_id: 'project_id', decision: 'decision', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  engagementHistory: { id: 'id', project_id: 'project_id', content: 'content', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  stakeholders: { id: 'id', project_id: 'project_id', name: 'name', email: 'email', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  tasks: { id: 'id', project_id: 'project_id', title: 'title', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  businessOutcomes: { id: 'id', project_id: 'project_id', title: 'title', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  focusAreas: { id: 'id', project_id: 'project_id', title: 'title', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  architectureIntegrations: { id: 'id', project_id: 'project_id', tool_name: 'tool_name', track: 'track', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  teamOnboardingStatus: { id: 'id', project_id: 'project_id', team_name: 'team_name' },
  wbsItems: { id: 'id', project_id: 'project_id', name: 'name', track: 'track', parent_id: 'parent_id' },
  teamEngagementSections: { id: 'id', project_id: 'project_id', name: 'name', content: 'content' },
  archNodes: { id: 'id', project_id: 'project_id', track_id: 'track_id', name: 'name' },
  archTracks: { id: 'id', project_id: 'project_id', name: 'name' },
  artifacts: { id: 'id', project_id: 'project_id', ingestion_status: 'ingestion_status', ingestion_log_json: 'ingestion_log_json' },
  auditLog: { id: 'id', entity_type: 'entity_type', entity_id: 'entity_id', action: 'action', actor_id: 'actor_id', before_json: 'before_json', after_json: 'after_json' },
  ingestionStatusEnum: vi.fn(),
}));

// Mock drizzle-orm operators
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => args),
  ilike: vi.fn((col, pat) => ({ col, pat })),
}));

// Mock @anthropic-ai/sdk
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {},
}));

// Mock document-extractor
vi.mock('@/lib/document-extractor', () => ({
  extractDocumentText: vi.fn(),
}));
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({ user: { id: 'test-user', email: 'test@test.com', role: 'admin' } }),
    },
  },
}));
vi.mock('@/lib/auth-server', () => ({
  requireSession: vi.fn().mockResolvedValue({ session: { user: { id: 'test-user' } }, redirectResponse: null }),
}));

import { POST } from '@/app/api/ingestion/approve/route';
import { db } from '@/db';
import { NextRequest } from 'next/server';

// Helper to build a NextRequest with JSON body
function buildRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/ingestion/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Ingestion write and logging (ING-09, ING-10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ING-09: written items have source set to ingestion', async () => {
    // Stub: DB select returns no existing record (no conflict)
    const mockWhere = vi.fn().mockResolvedValue([]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

    // Stub: DB insert returns inserted row
    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);

    // Stub: DB update for artifact log
    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

    // Stub: select for artifact record
    const mockArtifactWhere = vi.fn().mockResolvedValue([{
      id: 10,
      ingestion_log_json: { filename: 'test.docx', uploaded_at: '2026-01-01T00:00:00Z' },
    }]);
    const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockArtifactFrom } as any) // artifact fetch
      .mockReturnValue({ from: mockFrom } as any);             // conflict checks

    const req = buildRequest({
      artifactId: 10,
      projectId: 1,
      totalExtracted: 1,
      items: [{
        entityType: 'action',
        fields: { description: 'Set up alerts in BigPanda', owner: 'John' },
        approved: true,
      }],
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify insert was called with source: 'ingestion'
    expect(vi.mocked(db.insert)).toHaveBeenCalled();
    const insertCallArgs = vi.mocked(db.insert).mock.calls[0];
    expect(insertCallArgs).toBeDefined();
    // values() was called
    expect(mockValues).toHaveBeenCalled();
    const insertedRecord = mockValues.mock.calls[0][0];
    expect(insertedRecord.source).toBe('ingestion');
  });

  it('ING-09: written items have source_artifact_id set', async () => {
    const mockWhere = vi.fn().mockResolvedValue([]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockArtifactWhere = vi.fn().mockResolvedValue([{
      id: 10,
      ingestion_log_json: { filename: 'test.docx', uploaded_at: '2026-01-01T00:00:00Z' },
    }]);
    const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockArtifactFrom } as any)
      .mockReturnValue({ from: mockFrom } as any);

    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);
    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

    const req = buildRequest({
      artifactId: 10,
      projectId: 1,
      totalExtracted: 1,
      items: [{
        entityType: 'action',
        fields: { description: 'Configure integration', owner: 'Alice' },
        approved: true,
      }],
    });

    await POST(req);

    expect(mockValues).toHaveBeenCalled();
    const insertedRecord = mockValues.mock.calls[0][0];
    expect(insertedRecord.source_artifact_id).toBe(10);
  });

  it('ING-09: written items have ingested_at timestamp set', async () => {
    const mockWhere = vi.fn().mockResolvedValue([]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockArtifactWhere = vi.fn().mockResolvedValue([{
      id: 10,
      ingestion_log_json: { filename: 'test.docx', uploaded_at: '2026-01-01T00:00:00Z' },
    }]);
    const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockArtifactFrom } as any)
      .mockReturnValue({ from: mockFrom } as any);

    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);
    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

    const req = buildRequest({
      artifactId: 10,
      projectId: 1,
      totalExtracted: 1,
      items: [{
        entityType: 'action',
        fields: { description: 'Monitor production dashboards', owner: 'Bob' },
        approved: true,
      }],
    });

    await POST(req);

    expect(mockValues).toHaveBeenCalled();
    const insertedRecord = mockValues.mock.calls[0][0];
    expect(insertedRecord.ingested_at).toBeInstanceOf(Date);
  });

  it('ING-10: artifact ingestion_log_json updated after write', async () => {
    const mockWhere = vi.fn().mockResolvedValue([]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockArtifactWhere = vi.fn().mockResolvedValue([{
      id: 10,
      ingestion_log_json: { filename: 'notes.docx', uploaded_at: '2026-01-01T00:00:00Z' },
    }]);
    const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockArtifactFrom } as any)
      .mockReturnValue({ from: mockFrom } as any);

    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);
    const mockWhereUpdate = vi.fn().mockResolvedValue([]);
    const mockSet = vi.fn().mockReturnValue({ where: mockWhereUpdate });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

    const req = buildRequest({
      artifactId: 10,
      projectId: 1,
      totalExtracted: 3,
      items: [
        { entityType: 'action', fields: { description: 'Action 1' }, approved: true },
        { entityType: 'risk', fields: { description: 'Risk 1' }, approved: false },
      ],
    });

    await POST(req);

    // db.update must have been called (artifact log update)
    expect(vi.mocked(db.update)).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalled();
    const updateArgs = mockSet.mock.calls[0][0];
    expect(updateArgs.ingestion_status).toBe('approved');
    expect(updateArgs.ingestion_log_json).toBeDefined();
  });

  it('ING-10: log contains filename, upload_time, items_extracted, items_approved, items_rejected', async () => {
    const mockWhere = vi.fn().mockResolvedValue([]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockArtifactWhere = vi.fn().mockResolvedValue([{
      id: 10,
      ingestion_log_json: { filename: 'meeting_notes.docx', uploaded_at: '2026-02-15T10:00:00Z' },
    }]);
    const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockArtifactFrom } as any)
      .mockReturnValue({ from: mockFrom } as any);

    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);
    const mockWhereUpdate = vi.fn().mockResolvedValue([]);
    const mockSet = vi.fn().mockReturnValue({ where: mockWhereUpdate });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

    const req = buildRequest({
      artifactId: 10,
      projectId: 1,
      totalExtracted: 5,
      items: [
        { entityType: 'action', fields: { description: 'Action A' }, approved: true },
        { entityType: 'action', fields: { description: 'Action B' }, approved: true },
        { entityType: 'risk', fields: { description: 'Risk A' }, approved: false },
      ],
    });

    await POST(req);

    const log = mockSet.mock.calls[0][0].ingestion_log_json as Record<string, unknown>;
    expect(log.filename).toBe('meeting_notes.docx');
    expect(log.uploaded_at).toBe('2026-02-15T10:00:00Z');
    expect(log.items_extracted).toBe(5);
    expect(log.items_approved).toBe(2);
    expect(log.items_rejected).toBe(1);
    expect(typeof log.completed_at).toBe('string');
  });
});

describe('Phase 42 — new field coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // coerceRiskSeverity tests (indirect via POST endpoint behavior)
  it('coerceRiskSeverity: critical → critical', async () => {
    const mockWhere = vi.fn().mockResolvedValue([]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockArtifactWhere = vi.fn().mockResolvedValue([{
      id: 10,
      ingestion_log_json: { filename: 'test.docx', uploaded_at: '2026-01-01T00:00:00Z' },
    }]);
    const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockArtifactFrom } as any)
      .mockReturnValue({ from: mockFrom } as any);

    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);
    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

    const req = buildRequest({
      artifactId: 10,
      projectId: 1,
      totalExtracted: 1,
      items: [{
        entityType: 'risk',
        fields: { description: 'High risk', severity: 'critical' },
        approved: true,
      }],
    });

    await POST(req);

    expect(mockValues).toHaveBeenCalled();
    const insertedRecord = mockValues.mock.calls[0][0];
    expect(insertedRecord.severity).toBe('critical');
  });

  it('coerceRiskSeverity: medium → medium, default fallback', async () => {
    const mockWhere = vi.fn().mockResolvedValue([]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockArtifactWhere = vi.fn().mockResolvedValue([{
      id: 10,
      ingestion_log_json: { filename: 'test.docx', uploaded_at: '2026-01-01T00:00:00Z' },
    }]);
    const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockArtifactFrom } as any)
      .mockReturnValue({ from: mockFrom } as any);

    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);
    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

    const req = buildRequest({
      artifactId: 10,
      projectId: 1,
      totalExtracted: 1,
      items: [{
        entityType: 'risk',
        fields: { description: 'Unknown risk', severity: 'nonsense' },
        approved: true,
      }],
    });

    await POST(req);

    expect(mockValues).toHaveBeenCalled();
    const insertedRecord = mockValues.mock.calls[0][0];
    expect(insertedRecord.severity).toBe('medium'); // default fallback
  });

  // insertItem tests
  it('insertItem(risk): severity field present in insert values', async () => {
    const mockWhere = vi.fn().mockResolvedValue([]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockArtifactWhere = vi.fn().mockResolvedValue([{
      id: 10,
      ingestion_log_json: { filename: 'test.docx', uploaded_at: '2026-01-01T00:00:00Z' },
    }]);
    const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockArtifactFrom } as any)
      .mockReturnValue({ from: mockFrom } as any);

    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);
    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

    const req = buildRequest({
      artifactId: 10,
      projectId: 1,
      totalExtracted: 1,
      items: [{
        entityType: 'risk',
        fields: { description: 'Data breach risk', severity: 'high' },
        approved: true,
      }],
    });

    await POST(req);

    expect(mockValues).toHaveBeenCalled();
    const insertedRecord = mockValues.mock.calls[0][0];
    expect(insertedRecord.severity).toBeDefined();
    expect(insertedRecord.severity).toBe('high');
  });

  it('insertItem(task): start_date, due, description, priority fields present', async () => {
    const mockWhere = vi.fn().mockResolvedValue([]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockArtifactWhere = vi.fn().mockResolvedValue([{
      id: 10,
      ingestion_log_json: { filename: 'test.docx', uploaded_at: '2026-01-01T00:00:00Z' },
    }]);
    const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockArtifactFrom } as any)
      .mockReturnValue({ from: mockFrom } as any);

    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);
    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

    const req = buildRequest({
      artifactId: 10,
      projectId: 1,
      totalExtracted: 1,
      items: [{
        entityType: 'task',
        fields: {
          title: 'Deploy API',
          start_date: '2026-05-01',
          due_date: '2026-05-15',
          description: 'Deploy to production',
          priority: 'high',
        },
        approved: true,
      }],
    });

    await POST(req);

    expect(mockValues).toHaveBeenCalled();
    const insertedRecord = mockValues.mock.calls[0][0];
    expect(insertedRecord.start_date).toBe('2026-05-01');
    expect(insertedRecord.due).toBe('2026-05-15');
    expect(insertedRecord.description).toBe('Deploy to production');
    expect(insertedRecord.priority).toBe('high');
  });

  it('insertItem(milestone): owner field present', async () => {
    const mockWhere = vi.fn().mockResolvedValue([]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockArtifactWhere = vi.fn().mockResolvedValue([{
      id: 10,
      ingestion_log_json: { filename: 'test.docx', uploaded_at: '2026-01-01T00:00:00Z' },
    }]);
    const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockArtifactFrom } as any)
      .mockReturnValue({ from: mockFrom } as any);

    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);
    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

    const req = buildRequest({
      artifactId: 10,
      projectId: 1,
      totalExtracted: 1,
      items: [{
        entityType: 'milestone',
        fields: { name: 'Beta Launch', owner: 'Alice Johnson' },
        approved: true,
      }],
    });

    await POST(req);

    expect(mockValues).toHaveBeenCalled();
    const insertedRecord = mockValues.mock.calls[0][0];
    expect(insertedRecord.owner).toBe('Alice Johnson');
  });

  // mergeItem fill-null-only tests
  it('mergeItem(risk) fill-null-only: non-null severity not overwritten', async () => {
    const mockArtifactWhere = vi.fn().mockResolvedValue([{
      id: 10,
      ingestion_log_json: { filename: 'test.docx', uploaded_at: '2026-01-01T00:00:00Z' },
    }]);
    const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });

    // Conflict check: returns existing record with id 99
    const mockConflictWhere = vi.fn().mockResolvedValue([{ id: 99 }]);
    const mockConflictFrom = vi.fn().mockReturnValue({ where: mockConflictWhere });

    // beforeRecord select: returns existing risk with non-null severity
    const mockBeforeWhere = vi.fn().mockResolvedValue([{ id: 99, severity: 'high' }]);
    const mockBeforeFrom = vi.fn().mockReturnValue({ where: mockBeforeWhere });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockArtifactFrom } as any)    // artifact fetch
      .mockReturnValueOnce({ from: mockConflictFrom } as any)     // conflict check
      .mockReturnValueOnce({ from: mockBeforeFrom } as any);      // beforeRecord fetch

    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ id: 99 }]) });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);
    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);

    const req = buildRequest({
      artifactId: 10,
      projectId: 1,
      totalExtracted: 1,
      items: [{
        entityType: 'risk',
        fields: { description: 'Existing risk', severity: 'critical' },
        approved: true,
        conflictResolution: 'merge',
      }],
    });

    await POST(req);

    expect(mockSet).toHaveBeenCalled();
    const patchObject = mockSet.mock.calls[0][0];
    expect(patchObject.severity).toBeUndefined(); // NOT overwritten
  });

  it('mergeItem(task) fill-null-only: null start_date gets filled', async () => {
    const mockArtifactWhere = vi.fn().mockResolvedValue([{
      id: 10,
      ingestion_log_json: { filename: 'test.docx', uploaded_at: '2026-01-01T00:00:00Z' },
    }]);
    const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });

    // Conflict check: returns existing task with id 88
    const mockConflictWhere = vi.fn().mockResolvedValue([{ id: 88 }]);
    const mockConflictFrom = vi.fn().mockReturnValue({ where: mockConflictWhere });

    // beforeRecord select: returns existing task with null start_date
    const mockBeforeWhere = vi.fn().mockResolvedValue([{ id: 88, start_date: null }]);
    const mockBeforeFrom = vi.fn().mockReturnValue({ where: mockBeforeWhere });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockArtifactFrom } as any)
      .mockReturnValueOnce({ from: mockConflictFrom } as any)
      .mockReturnValueOnce({ from: mockBeforeFrom } as any);

    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ id: 88 }]) });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);
    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);

    const req = buildRequest({
      artifactId: 10,
      projectId: 1,
      totalExtracted: 1,
      items: [{
        entityType: 'task',
        fields: { title: 'Existing task', start_date: '2026-06-01' },
        approved: true,
        conflictResolution: 'merge',
      }],
    });

    await POST(req);

    expect(mockSet).toHaveBeenCalled();
    const patchObject = mockSet.mock.calls[0][0];
    expect(patchObject.start_date).toBe('2026-06-01'); // Filled
  });

  // Cross-entity resolution tests
  it('resolveEntityRef: exactly 1 milestone match → milestone_id set', async () => {
    const mockArtifactWhere = vi.fn().mockResolvedValue([{
      id: 10,
      ingestion_log_json: { filename: 'test.docx', uploaded_at: '2026-01-01T00:00:00Z' },
    }]);
    const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });

    // Milestone lookup returns exactly 1 match
    const mockMilestoneWhere = vi.fn().mockResolvedValue([{ id: 123 }]);
    const mockMilestoneFrom = vi.fn().mockReturnValue({ where: mockMilestoneWhere });

    // No conflict
    const mockConflictWhere = vi.fn().mockResolvedValue([]);
    const mockConflictFrom = vi.fn().mockReturnValue({ where: mockConflictWhere });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockArtifactFrom } as any)
      .mockReturnValueOnce({ from: mockMilestoneFrom } as any)  // milestone lookup
      .mockReturnValue({ from: mockConflictFrom } as any);

    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);
    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

    const req = buildRequest({
      artifactId: 10,
      projectId: 1,
      totalExtracted: 1,
      items: [{
        entityType: 'task',
        fields: { title: 'Task with milestone', milestone_name: 'Go Live' },
        approved: true,
      }],
    });

    await POST(req);

    expect(mockValues).toHaveBeenCalled();
    const insertedRecord = mockValues.mock.calls[0][0];
    expect(insertedRecord.milestone_id).toBe(123);
  });

  it('resolveEntityRef: 0 matches → milestone_id null, description appended', async () => {
    const mockArtifactWhere = vi.fn().mockResolvedValue([{
      id: 10,
      ingestion_log_json: { filename: 'test.docx', uploaded_at: '2026-01-01T00:00:00Z' },
    }]);
    const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });

    // Milestone lookup returns 0 matches
    const mockMilestoneWhere = vi.fn().mockResolvedValue([]);
    const mockMilestoneFrom = vi.fn().mockReturnValue({ where: mockMilestoneWhere });

    // No conflict
    const mockConflictWhere = vi.fn().mockResolvedValue([]);
    const mockConflictFrom = vi.fn().mockReturnValue({ where: mockConflictWhere });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockArtifactFrom } as any)
      .mockReturnValueOnce({ from: mockMilestoneFrom } as any)
      .mockReturnValue({ from: mockConflictFrom } as any);

    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);
    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

    const req = buildRequest({
      artifactId: 10,
      projectId: 1,
      totalExtracted: 1,
      items: [{
        entityType: 'task',
        fields: { title: 'Task without match', milestone_name: 'Unknown Sprint' },
        approved: true,
      }],
    });

    await POST(req);

    expect(mockValues).toHaveBeenCalled();
    const insertedRecord = mockValues.mock.calls[0][0];
    expect(insertedRecord.milestone_id).toBeNull();
    expect(insertedRecord.description).toContain('Milestone ref: Unknown Sprint');
  });

  it('resolveEntityRef: both milestone and workstream unresolved → description includes both', async () => {
    const mockArtifactWhere = vi.fn().mockResolvedValue([{
      id: 10,
      ingestion_log_json: { filename: 'test.docx', uploaded_at: '2026-01-01T00:00:00Z' },
    }]);
    const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });

    // Both lookups return 0 matches
    const mockEmptyWhere = vi.fn().mockResolvedValue([]);
    const mockEmptyFrom = vi.fn().mockReturnValue({ where: mockEmptyWhere });

    // No conflict
    const mockConflictWhere = vi.fn().mockResolvedValue([]);
    const mockConflictFrom = vi.fn().mockReturnValue({ where: mockConflictWhere });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockArtifactFrom } as any)
      .mockReturnValueOnce({ from: mockEmptyFrom } as any)   // milestone lookup
      .mockReturnValueOnce({ from: mockEmptyFrom } as any)   // workstream lookup
      .mockReturnValue({ from: mockConflictFrom } as any);

    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);
    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

    const req = buildRequest({
      artifactId: 10,
      projectId: 1,
      totalExtracted: 1,
      items: [{
        entityType: 'task',
        fields: {
          title: 'Task with both unresolved',
          milestone_name: 'Alpha Sprint',
          workstream_name: 'Backend',
        },
        approved: true,
      }],
    });

    await POST(req);

    expect(mockValues).toHaveBeenCalled();
    const insertedRecord = mockValues.mock.calls[0][0];
    expect(insertedRecord.description).toContain('Milestone ref: Alpha Sprint');
    expect(insertedRecord.description).toContain('Workstream ref: Backend');
  });

  // unresolvedRefs in API response
  it('unresolvedRefs: at least one task with unresolved ref → response includes message', async () => {
    const mockArtifactWhere = vi.fn().mockResolvedValue([{
      id: 10,
      ingestion_log_json: { filename: 'test.docx', uploaded_at: '2026-01-01T00:00:00Z' },
    }]);
    const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });

    // Milestone lookup returns 0 matches
    const mockMilestoneWhere = vi.fn().mockResolvedValue([]);
    const mockMilestoneFrom = vi.fn().mockReturnValue({ where: mockMilestoneWhere });

    // No conflict
    const mockConflictWhere = vi.fn().mockResolvedValue([]);
    const mockConflictFrom = vi.fn().mockReturnValue({ where: mockConflictWhere });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockArtifactFrom } as any)
      .mockReturnValueOnce({ from: mockMilestoneFrom } as any)
      .mockReturnValue({ from: mockConflictFrom } as any);

    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);
    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

    const req = buildRequest({
      artifactId: 10,
      projectId: 1,
      totalExtracted: 1,
      items: [{
        entityType: 'task',
        fields: { title: 'Task with unresolved', milestone_name: 'Unknown' },
        approved: true,
      }],
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.unresolvedRefs).toBeDefined();
    expect(data.unresolvedRefs).not.toBeNull();
  });
});

describe('Phase 46 — insertItem routing for wbs_task, team_engagement, arch_node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('insertItem - wbs_task', () => {
    it('should create wbsItem with correct parent_id via fuzzy parent_section_name match', async () => {
      const mockArtifactWhere = vi.fn().mockResolvedValue([{
        id: 10,
        ingestion_log_json: { filename: 'test.docx', uploaded_at: '2026-01-01T00:00:00Z' },
      }]);
      const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });

      // Parent section lookup returns match (id: 5)
      const mockParentWhere = vi.fn().mockResolvedValue([{ id: 5, name: 'Solution Design' }]);
      const mockParentFrom = vi.fn().mockReturnValue({ where: mockParentWhere });

      // No conflict
      const mockConflictWhere = vi.fn().mockResolvedValue([]);
      const mockConflictFrom = vi.fn().mockReturnValue({ where: mockConflictWhere });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: mockArtifactFrom } as any)
        .mockReturnValueOnce({ from: mockParentFrom } as any)  // parent lookup
        .mockReturnValue({ from: mockConflictFrom } as any);

      const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);
      const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

      const req = buildRequest({
        artifactId: 10,
        projectId: 1,
        totalExtracted: 1,
        items: [{
          entityType: 'wbs_task',
          fields: {
            title: 'Define alert routing rules',
            track: 'ADR',
            parent_section_name: 'Solution',
            level: '2',
            status: 'in_progress',
            description: 'Document all routing rules'
          },
          approved: true,
        }],
      });

      await POST(req);

      expect(mockValues).toHaveBeenCalled();
      const insertedRecord = mockValues.mock.calls[0][0];
      expect(insertedRecord.parent_id).toBe(5);
      expect(insertedRecord.name).toBe('Define alert routing rules');
      expect(insertedRecord.track).toBe('ADR');
      expect(insertedRecord.level).toBe(2);
    });
  });

  describe('insertItem - team_engagement', () => {
    it('should append content to existing section (not overwrite)', async () => {
      const mockArtifactWhere = vi.fn().mockResolvedValue([{
        id: 10,
        ingestion_log_json: { filename: 'test.docx', uploaded_at: '2026-01-01T00:00:00Z' },
      }]);
      const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });

      // Section lookup returns existing section with content
      const mockSectionWhere = vi.fn().mockResolvedValue([{
        id: 3,
        content: 'Existing content here',
      }]);
      const mockSectionFrom = vi.fn().mockReturnValue({ where: mockSectionWhere });

      // No conflict
      const mockConflictWhere = vi.fn().mockResolvedValue([]);
      const mockConflictFrom = vi.fn().mockReturnValue({ where: mockConflictWhere });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: mockArtifactFrom } as any)
        .mockReturnValueOnce({ from: mockSectionFrom } as any)  // section lookup
        .mockReturnValue({ from: mockConflictFrom } as any);

      const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);
      const mockWhereUpdate = vi.fn().mockResolvedValue([]);
      const mockSet = vi.fn().mockReturnValue({ where: mockWhereUpdate });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

      const req = buildRequest({
        artifactId: 10,
        projectId: 1,
        totalExtracted: 1,
        items: [{
          entityType: 'team_engagement',
          fields: {
            section_name: 'Business Outcomes',
            content: 'New content to append',
          },
          approved: true,
        }],
      });

      await POST(req);

      expect(mockSet).toHaveBeenCalled();
      const updateArgs = mockSet.mock.calls[0][0];
      expect(updateArgs.content).toContain('Existing content here');
      expect(updateArgs.content).toContain('New content to append');
      expect(updateArgs.content).toContain('---'); // separator
    });
  });

  describe('insertItem - arch_node', () => {
    it('should upsert arch_node (insert or update status + notes)', async () => {
      const mockArtifactWhere = vi.fn().mockResolvedValue([{
        id: 10,
        ingestion_log_json: { filename: 'test.docx', uploaded_at: '2026-01-01T00:00:00Z' },
      }]);
      const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });

      // Track lookup returns match (id: 7)
      const mockTrackWhere = vi.fn().mockResolvedValue([{ id: 7 }]);
      const mockTrackFrom = vi.fn().mockReturnValue({ where: mockTrackWhere });

      // No conflict
      const mockConflictWhere = vi.fn().mockResolvedValue([]);
      const mockConflictFrom = vi.fn().mockReturnValue({ where: mockConflictWhere });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: mockArtifactFrom } as any)
        .mockReturnValueOnce({ from: mockTrackFrom } as any)  // track lookup
        .mockReturnValue({ from: mockConflictFrom } as any);

      const mockOnConflictDoUpdate = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 1 }]),
      });
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: mockOnConflictDoUpdate,
      });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);
      const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

      const req = buildRequest({
        artifactId: 10,
        projectId: 1,
        totalExtracted: 1,
        items: [{
          entityType: 'arch_node',
          fields: {
            track: 'ADR Track',
            node_name: 'Event Ingest',
            status: 'live',
            notes: 'Syslog configured',
          },
          approved: true,
        }],
      });

      await POST(req);

      expect(mockValues).toHaveBeenCalled();
      const insertedRecord = mockValues.mock.calls[0][0];
      expect(insertedRecord.track_id).toBe(7);
      expect(insertedRecord.name).toBe('Event Ingest');
      expect(insertedRecord.status).toBe('live');
      expect(mockOnConflictDoUpdate).toHaveBeenCalled();
    });
  });
});
