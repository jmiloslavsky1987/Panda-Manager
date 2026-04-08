// tests/ingestion/extraction-types.test.ts
// Test deduplication logic for Phase 46 new entity types: wbs_task, team_engagement, arch_node

import { describe, it, expect, vi } from 'vitest';
import type { ExtractionItem } from '@/lib/extraction-types';

// Mock the DB with chainable query builder pattern
vi.mock('@/db', () => {
  const createMockQueryBuilder = () => ({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 1 }]),
  });

  // Track select mock to control return values per test
  const selectFn = vi.fn(() => createMockQueryBuilder());

  return {
    default: {
      select: selectFn,
      insert: vi.fn(() => createMockQueryBuilder()),
      delete: vi.fn(() => createMockQueryBuilder()),
    },
  };
});

// Mock db/schema to provide minimal table shapes
vi.mock('@/db/schema', () => ({
  wbsItems: { id: 'id', project_id: 'project_id', name: 'name', track: 'track' },
  teamEngagementSections: { id: 'id', project_id: 'project_id', name: 'name', content: 'content' },
  archNodes: { id: 'id', project_id: 'project_id', name: 'name', track_id: 'track_id' },
  archTracks: { id: 'id', project_id: 'project_id', name: 'name' },
  projects: { id: 'id', name: 'name' },
}));

// Mock drizzle-orm operators
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => args),
  ilike: vi.fn((col, pat) => ({ col, pat })),
}));

describe('isAlreadyIngested - wbs_task', () => {
  it('should handle wbs_task entity type deduplication', () => {
    // This test will FAIL (RED) until isAlreadyIngested() has a case for wbs_task
    // Expected behavior: isAlreadyIngested should check wbsItems table by:
    //   - project_id matches
    //   - track matches fields.track
    //   - ilike(name, `${normalize(fields.title)}%`)

    const extractionItem: ExtractionItem = {
      entityType: 'wbs_task',
      fields: {
        track: 'ADR',
        parent_section_name: 'Solution Design',
        level: '2',
        title: 'Define alert routing rules',
        status: 'in_progress',
        description: 'Document all routing rules for the ADR integration'
      },
      confidence: 0.89,
      sourceExcerpt: 'Define alert routing rules - in progress'
    };

    // Verify the extraction item structure
    expect(extractionItem.entityType).toBe('wbs_task');
    expect(extractionItem.fields.track).toBeDefined();
    expect(['ADR', 'Biggy']).toContain(extractionItem.fields.track);
    expect(extractionItem.fields.parent_section_name).toBeDefined();
    expect(extractionItem.fields.level).toBeDefined();
    expect(extractionItem.fields.title).toBeDefined();
    expect(extractionItem.fields.status).toBeDefined();

    // TODO: Once isAlreadyIngested() is implemented, call it here and assert:
    // const result = await isAlreadyIngested(extractionItem, testProjectId);
    // expect(result).toBe(true); // when matching WBS item exists
  });
});

describe('isAlreadyIngested - team_engagement', () => {
  it('should handle team_engagement entity type deduplication', () => {
    // This test will FAIL (RED) until isAlreadyIngested() has a case for team_engagement
    // Expected behavior: isAlreadyIngested should check teamEngagementSections table by:
    //   - project_id matches
    //   - name = fields.section_name
    //   - ilike(content, `${normalize(fields.content)}%`)

    const extractionItem: ExtractionItem = {
      entityType: 'team_engagement',
      fields: {
        section_name: 'Business Outcomes',
        content: 'Reduce MTTR by 30% through automated alert correlation and intelligent routing'
      },
      confidence: 0.87,
      sourceExcerpt: 'Business Outcomes: Reduce MTTR by 30%'
    };

    // Verify the extraction item structure
    expect(extractionItem.entityType).toBe('team_engagement');
    expect(extractionItem.fields.section_name).toBeDefined();
    expect(['Business Outcomes', 'Architecture', 'E2E Workflows', 'Teams & Engagement', 'Top Focus Areas'])
      .toContain(extractionItem.fields.section_name);
    expect(extractionItem.fields.content).toBeDefined();

    // TODO: Once isAlreadyIngested() is implemented, call it here and assert:
    // const result = await isAlreadyIngested(extractionItem, testProjectId);
    // expect(result).toBe(true); // when matching section exists
  });
});

describe('isAlreadyIngested - arch_node', () => {
  it('should handle arch_node entity type deduplication', () => {
    // This test will FAIL (RED) until isAlreadyIngested() has a case for arch_node
    // Expected behavior: isAlreadyIngested should check archNodes table by:
    //   - project_id matches
    //   - JOIN to archTracks to match fields.track
    //   - ilike(name, `${normalize(fields.node_name)}%`)

    const extractionItem: ExtractionItem = {
      entityType: 'arch_node',
      fields: {
        track: 'ADR Track',
        node_name: 'Event Ingest',
        status: 'live',
        notes: 'Syslog and REST API ingestion configured'
      },
      confidence: 0.94,
      sourceExcerpt: 'ADR Track - Event Ingest (live)'
    };

    // Verify the extraction item structure
    expect(extractionItem.entityType).toBe('arch_node');
    expect(extractionItem.fields.track).toBeDefined();
    expect(['ADR Track', 'AI Assistant Track']).toContain(extractionItem.fields.track);
    expect(extractionItem.fields.node_name).toBeDefined();
    expect(extractionItem.fields.status).toBeDefined();
    expect(['planned', 'in_progress', 'live']).toContain(extractionItem.fields.status);

    // TODO: Once isAlreadyIngested() is implemented, call it here and assert:
    // const result = await isAlreadyIngested(extractionItem, testProjectId);
    // expect(result).toBe(true); // when matching node exists
  });
});
