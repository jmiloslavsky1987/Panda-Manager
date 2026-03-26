import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DB — vi.mock is hoisted, use inline vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock db/schema with minimal shape for all entity tables
vi.mock('@/db/schema', () => ({
  actions: { id: 'id', project_id: 'project_id', description: 'description', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  risks: { id: 'id', project_id: 'project_id', description: 'description', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  milestones: { id: 'id', project_id: 'project_id', name: 'name', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  keyDecisions: { id: 'id', project_id: 'project_id', decision: 'decision', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  engagementHistory: { id: 'id', project_id: 'project_id', content: 'content', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  stakeholders: { id: 'id', project_id: 'project_id', name: 'name', email: 'email', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  tasks: { id: 'id', project_id: 'project_id', title: 'title', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  businessOutcomes: { id: 'id', project_id: 'project_id', title: 'title', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  focusAreas: { id: 'id', project_id: 'project_id', title: 'title', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  architectureIntegrations: { id: 'id', project_id: 'project_id', tool_name: 'tool_name', track: 'track', source: 'source', source_artifact_id: 'source_artifact_id', ingested_at: 'ingested_at' },
  teamOnboardingStatus: { id: 'id', project_id: 'project_id', team_name: 'team_name' },
  artifacts: { id: 'id', project_id: 'project_id', ingestion_status: 'ingestion_status', ingestion_log_json: 'ingestion_log_json' },
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
    const mockValues = vi.fn().mockResolvedValue([{ id: 1 }]);
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

    const mockValues = vi.fn().mockResolvedValue([{ id: 1 }]);
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

    const mockValues = vi.fn().mockResolvedValue([{ id: 1 }]);
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

    const mockValues = vi.fn().mockResolvedValue([{ id: 1 }]);
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

    const mockValues = vi.fn().mockResolvedValue([{ id: 1 }]);
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
