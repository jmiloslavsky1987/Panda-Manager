import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';

// Mock dependencies before importing the job handler
vi.mock('../../db', () => ({
  default: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(),
}));

vi.mock('../../lib/document-extractor', () => ({
  extractDocumentText: vi.fn(),
}));

vi.mock('../../lib/settings', () => ({
  readSettings: vi.fn(),
}));

// Import the job handler (will fail RED — file doesn't exist yet)
import { processDocumentExtraction } from '../../worker/jobs/document-extraction';

describe('worker/jobs/document-extraction.ts — processDocumentExtraction()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should transition job from pending to running on start', async () => {
    // Arrange: mock job data
    const mockJob = {
      id: 'job-123',
      data: {
        extractionJobId: 1,
        artifactId: 10,
        projectId: 5,
        batchId: 'batch-abc',
      },
      updateProgress: vi.fn(),
    } as unknown as Job;

    // Act & Assert: will fail RED until implementation exists
    expect(processDocumentExtraction).toBeDefined();
    // TODO Plan 02: implement handler, verify status transition to 'running'
  });

  it('should increment progress_pct and current_chunk after each chunk', async () => {
    // Arrange
    const mockJob = {
      id: 'job-456',
      data: {
        extractionJobId: 2,
        artifactId: 20,
        projectId: 6,
        batchId: 'batch-xyz',
      },
      updateProgress: vi.fn(),
    } as unknown as Job;

    // Assert: will fail RED until implementation exists
    expect(processDocumentExtraction).toBeDefined();
    // TODO Plan 02: mock Claude streaming, verify progress updates after each chunk
  });

  it('should set status=completed and staged_items_json on success', async () => {
    // Arrange
    const mockJob = {
      id: 'job-789',
      data: {
        extractionJobId: 3,
        artifactId: 30,
        projectId: 7,
        batchId: 'batch-def',
      },
      updateProgress: vi.fn(),
    } as unknown as Job;

    // Assert: will fail RED until implementation exists
    expect(processDocumentExtraction).toBeDefined();
    // TODO Plan 02: verify final DB update sets status='completed', progress_pct=100, staged_items_json populated
  });

  it('should set status=failed with error_message on Claude API error', async () => {
    // Arrange
    const mockJob = {
      id: 'job-error',
      data: {
        extractionJobId: 4,
        artifactId: 40,
        projectId: 8,
        batchId: 'batch-err',
      },
      updateProgress: vi.fn(),
    } as unknown as Job;

    // Assert: will fail RED until implementation exists
    expect(processDocumentExtraction).toBeDefined();
    // TODO Plan 02: mock Claude SDK error, verify status='failed', error_message set
  });

  it('should NOT write to workspace tables (atomicity requirement)', async () => {
    // Arrange
    const mockJob = {
      id: 'job-atomicity',
      data: {
        extractionJobId: 5,
        artifactId: 50,
        projectId: 9,
        batchId: 'batch-atom',
      },
      updateProgress: vi.fn(),
    } as unknown as Job;

    // Assert: will fail RED until implementation exists
    expect(processDocumentExtraction).toBeDefined();
    // TODO Plan 02: verify no INSERT calls to actions, risks, milestones, etc. — only extraction_jobs table updated
  });
});

// Import EXTRACTION_BASE for field coverage tests (Phase 52: EXTRACTION_SYSTEM renamed to EXTRACTION_BASE)
import { EXTRACTION_BASE } from '../../worker/jobs/document-extraction';

describe('Phase 42 — extraction prompt field coverage', () => {

  it('task guidance includes milestone_name', () => {
    expect(EXTRACTION_BASE).toContain('milestone_name');
  });

  it('task guidance includes workstream_name', () => {
    expect(EXTRACTION_BASE).toContain('workstream_name');
  });

  it('task guidance includes start_date', () => {
    expect(EXTRACTION_BASE).toContain('start_date');
  });

  it('task guidance includes due_date', () => {
    expect(EXTRACTION_BASE).toContain('due_date');
  });

  it('task guidance includes priority', () => {
    expect(EXTRACTION_BASE).toContain('priority');
  });

  it('task guidance includes description', () => {
    expect(EXTRACTION_BASE).toContain('description');
  });

  it('milestone guidance includes owner', () => {
    expect(EXTRACTION_BASE).toContain('owner');
  });

  it('prompt includes verbatim extraction instruction', () => {
    expect(EXTRACTION_BASE).toContain('verbatim');
  });
});

// ─── Phase 53 Wave 0 RED stubs (EXTR-08 through EXTR-11) ────────────────────

describe('EXTR-08: tool use migration — record_entities tool defined', () => {
  it('RECORD_ENTITIES_TOOL is exported from document-extraction.ts', async () => {
    // RED: fails until Plan 03 adds RECORD_ENTITIES_TOOL export
    const mod = await import('../../worker/jobs/document-extraction').catch(() => null);
    expect(mod?.RECORD_ENTITIES_TOOL).toBeDefined();
    expect(mod?.RECORD_ENTITIES_TOOL?.name).toBe('record_entities');
  });
});

describe('EXTR-09: chunk overlap — 2000-char boundary buffer', () => {
  it('splitIntoChunks returns overlapping chunks (overlap > 0)', async () => {
    // RED: fails until Plan 03 adds CHUNK_OVERLAP constant
    const { splitIntoChunks } = await import('../../worker/jobs/document-extraction');
    const text = 'A'.repeat(3000) + 'B'.repeat(3000);
    const chunks = splitIntoChunks(text, 4000);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    // Overlap: second chunk should start before position 4000 (overlaps with end of first chunk)
    const firstChunk = chunks[0];
    const secondChunk = chunks[1];
    // The last 100 chars of chunk 1 should appear in chunk 2 if overlap is working
    const overlapSample = firstChunk.slice(-100);
    expect(secondChunk).toContain(overlapSample);
  });
});

describe('EXTR-10: coverage field in record_entities tool schema', () => {
  it('RECORD_ENTITIES_TOOL input_schema has coverage property', async () => {
    // RED: fails until Plan 03 adds coverage field to tool schema
    const mod = await import('../../worker/jobs/document-extraction').catch(() => null);
    const props = mod?.RECORD_ENTITIES_TOOL?.input_schema?.properties;
    expect(props?.coverage).toBeDefined();
    expect(props?.coverage?.type).toBe('string');
  });
});

describe('EXTR-11: Pass 0 pre-analysis exists in PASSES array', () => {
  it('PASSES[0] has passNumber 0 and label Pre-analysis', async () => {
    // RED: fails until Plan 04 adds Pass 0 pre-analysis
    const { PASSES } = await import('../../worker/jobs/document-extraction');
    const pass0 = PASSES.find(p => p.passNumber === 0);
    expect(pass0).toBeDefined();
    expect(pass0?.label).toMatch(/pre.analy/i);
  });
});
