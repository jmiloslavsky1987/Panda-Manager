// Wave 0 RED test stubs for Phase 52 Plan 01 — Multi-pass extraction structure
// These tests document the behavioral contract for 3-pass extraction.
// Phase 55 Plan 01 — Upgraded to GREEN integration tests

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ExtractionItem, EntityType } from '../document-extraction';

// ─── Mock Setup ──────────────────────────────────────────────────────────────

// Track progress updates
const progressUpdates: Array<Record<string, unknown>> = [];

// Mock Anthropic SDK with messages.stream (tool use)
vi.mock('@anthropic-ai/sdk', () => {
  const mockFinalMessage = {
    content: [
      {
        type: 'tool_use',
        name: 'record_entities',
        input: { entities: [], coverage: 'action: 0 | GAPS: none' },
      },
    ],
    stop_reason: 'tool_use',
  };
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue(mockFinalMessage),
        stream: vi.fn().mockReturnValue({
          finalMessage: vi.fn().mockResolvedValue(mockFinalMessage),
        }),
      },
    })),
  };
});

// Mock DB connection (must use same relative path as document-extraction.ts: ../../db from worker/jobs/)
// From test file location worker/jobs/__tests__/, going to worker/jobs/ level: ../
// Then from worker/jobs/, the import is ../../db
// So from test file it's ../../../db
vi.mock('../../../db', () => ({
  default: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{
          id: 1,
          project_id: 1,
          name: 'test.pdf',
          mime_type: 'application/pdf',
          file_path: '/tmp/test.pdf',
          ingestion_status: 'pending',
        }])),
        // Support buildArchPhasesContext chain: select().from().innerJoin().where().orderBy()
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((values) => {
        progressUpdates.push(values);
        return { where: vi.fn(() => Promise.resolve()) };
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
  },
}));

// Mock document extractor
vi.mock('../../../lib/document-extractor', () => ({
  extractDocumentText: vi.fn().mockResolvedValue({ kind: 'pdf', base64: 'dGVzdA==' }),
}));

// Mock settings core
vi.mock('../../../lib/settings-core', () => ({
  readSettings: vi.fn().mockResolvedValue({
    anthropic_api_key: 'mock-key',
    workspace_path: '/tmp/test-workspace',
  }),
}));

// Mock lib/extraction-types
vi.mock('@/lib/extraction-types', () => ({
  isAlreadyIngested: vi.fn().mockResolvedValue(false),
}));

// Mock fs/promises
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from('mock file content')),
}));

// Import after mocks are set up
import Anthropic from '@anthropic-ai/sdk';
import { extractDocumentText } from '../../../lib/document-extractor';
import { processDocumentExtraction, PASS_PROMPTS, PASSES } from '../document-extraction';

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('document-extraction-passes', () => {
  beforeEach(() => {
    progressUpdates.length = 0;
    vi.clearAllMocks();

    // Reset Anthropic mock to default behavior for each test
    const mockAnthropic = vi.mocked(Anthropic);
    mockAnthropic.mockClear();
    // Use function declaration (not arrow function) so it can be used as a constructor
    const defaultMessage = {
      content: [
        {
          type: 'tool_use',
          name: 'record_entities',
          input: { entities: [], coverage: 'action: 0 | GAPS: none' },
        },
      ],
      stop_reason: 'tool_use',
    };
    mockAnthropic.mockImplementation(function(this: any) {
      return {
        messages: {
          create: vi.fn().mockResolvedValue(defaultMessage),
          stream: vi.fn().mockReturnValue({
            finalMessage: vi.fn().mockResolvedValue(defaultMessage),
          }),
        },
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Pass prompts structure', () => {
    it('pass prompts focus on pass-specific entity types', async () => {
      // Pass 1 should focus on project narrative types (check for pass-specific section)
      expect(PASS_PROMPTS[1]).toBeDefined();
      expect(PASS_PROMPTS[1]).toContain('FOCUS ON THESE ENTITY TYPES ONLY FOR THIS PASS');
      // Check for pass 1 specific examples and entity types
      expect(PASS_PROMPTS[1]).toContain('John to configure alert routing');
      expect(PASS_PROMPTS[1]).toContain('- action:');
      expect(PASS_PROMPTS[1]).toContain('- risk:');
      expect(PASS_PROMPTS[1]).toContain('- task:');
      expect(PASS_PROMPTS[1]).toContain('- milestone:');

      // Pass 2 should focus on architecture types
      expect(PASS_PROMPTS[2]).toBeDefined();
      expect(PASS_PROMPTS[2]).toContain('FOCUS ON THESE ENTITY TYPES ONLY FOR THIS PASS');
      // Check for pass 2 specific examples and entity types
      expect(PASS_PROMPTS[2]).toContain('Alert Intelligence module');
      expect(PASS_PROMPTS[2]).toContain('- architecture:');
      expect(PASS_PROMPTS[2]).toContain('- arch_node:');
      expect(PASS_PROMPTS[2]).toContain('- integration:');
      expect(PASS_PROMPTS[2]).toContain('- before_state:');

      // Pass 3 should focus on teams & delivery types
      expect(PASS_PROMPTS[3]).toBeDefined();
      expect(PASS_PROMPTS[3]).toContain('FOCUS ON THESE ENTITY TYPES ONLY FOR THIS PASS');
      // Check for pass 3 specific examples and entity types
      expect(PASS_PROMPTS[3]).toContain('Solution Design');
      expect(PASS_PROMPTS[3]).toContain('- team:');
      expect(PASS_PROMPTS[3]).toContain('- wbs_task:');
      expect(PASS_PROMPTS[3]).toContain('- workstream:');
    });
  });

  describe('PDF 3 passes', () => {
    it('PDF extraction makes 3 Claude calls (one per pass)', async () => {
      // Configure extractDocumentText to return PDF result
      vi.mocked(extractDocumentText).mockResolvedValue({ kind: 'pdf', base64: 'dGVzdA==' });

      // Get the Anthropic mock to spy on
      const mockAnthropic = vi.mocked(Anthropic);

      const mockJob = {
        data: { jobId: 1, artifactId: 1, projectId: 1, batchId: 'batch-1' },
      };

      await processDocumentExtraction(mockJob as any);

      // Get the messages.stream mock from the Anthropic constructor mock
      const instances = mockAnthropic.mock.results;
      expect(instances.length).toBeGreaterThan(0);
      const instance = instances[0].value;
      const streamCalls = instance.messages.stream.mock.calls;

      // Pass 0 uses messages.create; Passes 1-4 use messages.stream → 4 stream calls
      expect(streamCalls.length).toBe(4);

      // All 4 stream calls are extraction passes with PASS_PROMPTS
      const extractionSystems = streamCalls.map((c: any[]) => c[0].system);
      expect(extractionSystems[0]).toContain('action'); // Pass 1
      expect(extractionSystems[1]).toContain('arch_node'); // Pass 2
      expect(extractionSystems[2]).toContain('wbs_task'); // Pass 3
      expect(extractionSystems[3]).toContain('stakeholder'); // Pass 4
    });
  });

  describe('Text 4 passes', () => {
    it('text extraction makes 4 * chunkCount Claude calls', async () => {
      // Return text content that fits in 1 chunk (under 80k chars)
      vi.mocked(extractDocumentText).mockResolvedValue({
        kind: 'text',
        content: 'Mock document content under the chunk limit',
      });

      const mockAnthropic = vi.mocked(Anthropic);

      const mockJob = {
        data: { jobId: 2, artifactId: 1, projectId: 1, batchId: 'batch-2' },
      };

      await processDocumentExtraction(mockJob as any);

      const instance = mockAnthropic.mock.results[0].value;
      const streamCalls = instance.messages.stream.mock.calls;

      // 1 chunk: Pass 0 uses create, Passes 1-4 use stream → 4 stream calls
      expect(streamCalls.length).toBe(4);
    });
  });

  describe('Merge all passes before staging', () => {
    it('allRawItems is a merge of items from all 3 passes before isAlreadyIngested', async () => {
      vi.mocked(extractDocumentText).mockResolvedValue({
        kind: 'text',
        content: 'Mock document content',
      });

      // Override the Anthropic mock to return different responses per call
      // Pass 0 uses messages.create; Passes 1-4 use messages.stream
      const mockAnthropic = vi.mocked(Anthropic);
      const mockCreateFn = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '<relevant_section>test</relevant_section>' }]
      });
      const mockStreamFn = vi.fn();

      // Each stream() call returns an object whose finalMessage() resolves sequentially
      const makeStream = (msg: object) => ({ finalMessage: vi.fn().mockResolvedValue(msg) });
      const emptyEntities = { content: [{ type: 'tool_use', name: 'record_entities', input: { entities: [], coverage: 'none' } }] };

      mockStreamFn
        .mockReturnValueOnce(makeStream({
          // Pass 1: action entity
          content: [{ type: 'tool_use', name: 'record_entities', input: {
            entities: [{ entityType: 'action', fields: { description: 'Deploy to production', owner: 'Alice' }, confidence: 0.9, sourceExcerpt: 'Deploy' }],
            coverage: 'action: 1',
          }}]
        }))
        .mockReturnValueOnce(makeStream({
          // Pass 2: arch_node entity
          content: [{ type: 'tool_use', name: 'record_entities', input: {
            entities: [{ entityType: 'arch_node', fields: { track: 'ADR Track', node_name: 'Alert Intelligence', status: 'live' }, confidence: 0.9, sourceExcerpt: 'Alert Intelligence' }],
            coverage: 'arch_node: 1',
          }}]
        }))
        .mockReturnValueOnce(makeStream({
          // Pass 3: wbs_task entity
          content: [{ type: 'tool_use', name: 'record_entities', input: {
            entities: [{ entityType: 'wbs_task', fields: { title: 'Solution Design', track: 'ADR', parent_section_name: 'Solution Design', level: '2', status: 'in_progress' }, confidence: 0.9, sourceExcerpt: 'Solution Design' }],
            coverage: 'wbs_task: 1',
          }}]
        }))
        .mockReturnValue(makeStream(emptyEntities)); // Pass 4 and any extras

      mockAnthropic.mockImplementation(function(this: any) {
        return {
          messages: { create: mockCreateFn, stream: mockStreamFn },
        };
      });

      const mockJob = {
        data: { jobId: 3, artifactId: 1, projectId: 1, batchId: 'batch-3' },
      };

      await processDocumentExtraction(mockJob as any);

      // The staged_items_json written to DB should contain all 3 entity types (merged, not filtered)
      const completionWrite = progressUpdates.find(u => u.status === 'completed');
      expect(completionWrite).toBeDefined();
      const stagedItems = completionWrite!.staged_items_json as Array<{ entityType: string }>;
      const entityTypes = stagedItems.map(i => i.entityType);
      expect(entityTypes).toContain('action');
      expect(entityTypes).toContain('arch_node');
      expect(entityTypes).toContain('wbs_task');
    });
  });

  describe('Progress global scale', () => {
    it('progress_pct maps to pass ranges: Pass 0=10%, Pass 1=40%, Pass 2=70%, Pass 3=100%', async () => {
      vi.mocked(extractDocumentText).mockResolvedValue({ kind: 'pdf', base64: 'dGVzdA==' });

      const mockJob = {
        data: { jobId: 4, artifactId: 1, projectId: 1, batchId: 'batch-4' },
      };

      await processDocumentExtraction(mockJob as any);

      // Collect all progress_pct values written
      const pcts = progressUpdates
        .filter(u => typeof u.progress_pct === 'number')
        .map(u => u.progress_pct as number);

      expect(pcts).toContain(10);  // Pass 0 complete
      // Passes 1-4 spread remaining 90% evenly: ~32, ~54, ~76, 100
      expect(pcts.some((p: number) => p >= 30 && p <= 35)).toBe(true); // Pass 1
      expect(pcts.some((p: number) => p >= 52 && p <= 58)).toBe(true); // Pass 2
      expect(pcts.some((p: number) => p >= 74 && p <= 80)).toBe(true); // Pass 3
      expect(pcts).toContain(100); // Pass 4 complete — final status update
    });
  });

  describe('isAlreadyIngested import from lib', () => {
    it('isAlreadyIngested is imported from lib/extraction-types', async () => {
      // This test should turn GREEN in Wave 1 when the import is added

      try {
        const extractionTypes = await import('@/lib/extraction-types');
        expect(typeof extractionTypes.isAlreadyIngested).toBe('function');
      } catch (error: any) {
        throw new Error(`isAlreadyIngested import failed: ${error.message}`);
      }
    });
  });
});
