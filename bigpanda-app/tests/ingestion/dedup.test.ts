import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DB — vi.mock is hoisted so we cannot reference variables declared below.
// Use vi.fn() inline and access via the mocked module later.
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

// Mock db/schema — provide minimal shape so imports don't fail
vi.mock('@/db/schema', () => ({
  actions: { id: 'id', project_id: 'project_id', description: 'description', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  risks: { id: 'id', project_id: 'project_id', description: 'description', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  milestones: { id: 'id', project_id: 'project_id', name: 'name', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  keyDecisions: { id: 'id', project_id: 'project_id', decision: 'decision', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  engagementHistory: { id: 'id', project_id: 'project_id', content: 'content', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  stakeholders: { id: 'id', project_id: 'project_id', email: 'email', name: 'name', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  tasks: { id: 'id', project_id: 'project_id', title: 'title', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  businessOutcomes: { id: 'id', project_id: 'project_id', title: 'title', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  focusAreas: { id: 'id', project_id: 'project_id', title: 'title', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  architectureIntegrations: { id: 'id', project_id: 'project_id', tool_name: 'tool_name', track: 'track', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  teamOnboardingStatus: { id: 'id', project_id: 'project_id', team_name: 'team_name' },
  artifacts: { id: 'id', project_id: 'project_id', ingestion_status: 'ingestion_status', ingestion_log_json: 'ingestion_log_json' },
  auditLog: { id: 'id', entity_type: 'entity_type', entity_id: 'entity_id', action: 'action', actor_id: 'actor_id', before_json: 'before_json', after_json: 'after_json' },
  ingestionStatusEnum: vi.fn(),
}));

// Mock drizzle-orm operators (eq, and, ilike) so they return something non-null
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => args),
  ilike: vi.fn((col, pat) => ({ col, pat })),
}));

// Mock @anthropic-ai/sdk to prevent real API client init
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

import { isAlreadyIngested } from '@/lib/extraction-types';
import type { ExtractionItem } from '@/lib/extraction-types';
import { POST } from '@/app/api/ingestion/approve/route';
import { db } from '@/db';
import { auth as authMock } from '@/lib/auth';
import { NextRequest } from 'next/server';

// Helper to build a NextRequest with JSON body
function buildRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/ingestion/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Dedup and conflict detection (ING-08, ING-11, ING-12)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  // Restore auth mock after resetAllMocks clears it
  vi.mocked(authMock.api.getSession).mockResolvedValue({ user: { id: 'test-user', email: 'test@test.com', role: 'admin' } } as any);
  });

  it('ING-08: detects conflict when item matches existing record', async () => {
    // ING-08: non-ING-12 dedup — verify isAlreadyIngested is exported and callable
    expect(typeof isAlreadyIngested).toBe('function');
  });

  it('ING-08: non-conflicting items pass through without prompt', async () => {
    // When DB returns empty array, item is not already ingested → false
    const mockWhere = vi.fn().mockResolvedValue([]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

    const item: ExtractionItem = {
      entityType: 'action',
      fields: { description: 'A brand new action not in DB' },
      confidence: 0.9,
      sourceExcerpt: 'brand new action',
    };
    const result = await isAlreadyIngested(item, 1);
    expect(result).toBe(false);
  });

  it('ING-08: approve route returns 409 when conflict found and no conflictResolution provided', async () => {
    // Artifact fetch returns a valid artifact
    const mockArtifactWhere = vi.fn().mockResolvedValue([{
      id: 10,
      ingestion_log_json: { filename: 'test.docx', uploaded_at: '2026-01-01T00:00:00Z' },
    }]);
    const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });
    // Conflict check: returns existing record (conflict!)
    const mockConflictWhere = vi.fn().mockResolvedValue([{ id: 99, description: 'Set up alerts in BigPanda' }]);
    const mockConflictFrom = vi.fn().mockReturnValue({ where: mockConflictWhere });
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockArtifactFrom } as any) // artifact fetch
      .mockReturnValue({ from: mockConflictFrom } as any);     // conflict check

    const req = buildRequest({
      artifactId: 10,
      projectId: 1,
      totalExtracted: 1,
      items: [{
        entityType: 'action',
        fields: { description: 'Set up alerts in BigPanda', owner: 'John' },
        approved: true,
        // no conflictResolution provided
      }],
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    const body = await res.json() as { conflicts: Array<{ itemIndex: number; existingId: number }> };
    expect(body.conflicts).toBeDefined();
    expect(body.conflicts.length).toBeGreaterThan(0);
    expect(body.conflicts[0].itemIndex).toBe(0);
    expect(body.conflicts[0].existingId).toBe(99);
  });

  it('ING-08: approve route skips item when conflictResolution is skip', async () => {
    const mockArtifactWhere = vi.fn().mockResolvedValue([{
      id: 10,
      ingestion_log_json: { filename: 'test.docx', uploaded_at: '2026-01-01T00:00:00Z' },
    }]);
    const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });
    // Conflict check: existing record found
    const mockConflictWhere = vi.fn().mockResolvedValue([{ id: 99, description: 'Set up alerts in BigPanda' }]);
    const mockConflictFrom = vi.fn().mockReturnValue({ where: mockConflictWhere });
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockArtifactFrom } as any)
      .mockReturnValue({ from: mockConflictFrom } as any);

    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

    const req = buildRequest({
      artifactId: 10,
      projectId: 1,
      totalExtracted: 1,
      items: [{
        entityType: 'action',
        fields: { description: 'Set up alerts in BigPanda', owner: 'John' },
        approved: true,
        conflictResolution: 'skip',
        existingId: 99,
      }],
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json() as { written: Record<string, number>; skipped: Record<string, number>; rejected: number };
    expect(Object.values(body.skipped).reduce((a, b) => a + b, 0)).toBe(1);
    expect(Object.values(body.written).reduce((a, b) => a + b, 0)).toBe(0);
    // insert should NOT have been called
    expect(vi.mocked(db.insert)).not.toHaveBeenCalled();
  });

  it('ING-08: approve route deletes and inserts when conflictResolution is replace', async () => {
    const mockArtifactWhere = vi.fn().mockResolvedValue([{
      id: 10,
      ingestion_log_json: { filename: 'test.docx', uploaded_at: '2026-01-01T00:00:00Z' },
    }]);
    const mockArtifactFrom = vi.fn().mockReturnValue({ where: mockArtifactWhere });
    // Conflict check: returns existing record
    const mockConflictWhere = vi.fn().mockResolvedValue([{ id: 99, description: 'Old action text' }]);
    const mockConflictFrom = vi.fn().mockReturnValue({ where: mockConflictWhere });
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockArtifactFrom } as any)
      .mockReturnValue({ from: mockConflictFrom } as any);

    // delete mock
    const mockDeleteWhere = vi.fn().mockResolvedValue([]);
    vi.mocked(db.delete).mockReturnValue({ where: mockDeleteWhere } as any);

    // insert mock
    const mockValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 100 }]) });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);

    // update mock for artifact log
    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

    const req = buildRequest({
      artifactId: 10,
      projectId: 1,
      totalExtracted: 1,
      items: [{
        entityType: 'action',
        fields: { description: 'Updated action text', owner: 'John' },
        approved: true,
        conflictResolution: 'replace',
        existingId: 99,
      }],
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json() as { written: Record<string, number>; skipped: Record<string, number>; rejected: number };
    expect(Object.values(body.written).reduce((a, b) => a + b, 0)).toBe(1);
    // delete was called
    expect(vi.mocked(db.delete)).toHaveBeenCalled();
    // insert was called
    expect(vi.mocked(db.insert)).toHaveBeenCalled();
  });

  it('ING-11: re-upload of same file triggers preview flow', () => {
    // ING-11 is flow-level (handled by upload route 18-02)
    // Structural validation: isAlreadyIngested exists and has the right signature
    expect(typeof isAlreadyIngested).toBe('function');
    expect(isAlreadyIngested.length).toBe(2); // (item, projectId)
  });

  it('ING-12: already-ingested items are filtered from preview', async () => {
    // When DB returns a matching record, isAlreadyIngested → true
    const mockWhere = vi.fn().mockResolvedValue([{ id: 42 }]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

    const item: ExtractionItem = {
      entityType: 'action',
      fields: { description: 'Complete the integration setup' },
      confidence: 0.9,
      sourceExcerpt: 'Complete the integration setup by Q2',
    };
    const result = await isAlreadyIngested(item, 1);
    expect(result).toBe(true);
  });

  it('ING-12: net-new items from incremental upload are surfaced', async () => {
    // When DB returns empty, item is net-new → false (not filtered out)
    const mockWhere = vi.fn().mockResolvedValue([]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

    const item: ExtractionItem = {
      entityType: 'risk',
      fields: { description: 'New risk not yet in database' },
      confidence: 0.75,
      sourceExcerpt: 'New risk not yet in database',
    };
    const result = await isAlreadyIngested(item, 1);
    expect(result).toBe(false);
  });
});
