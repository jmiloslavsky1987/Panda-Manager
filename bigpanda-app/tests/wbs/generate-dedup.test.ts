// tests/wbs/generate-dedup.test.ts
// RED test stub for WBS-04 deduplication logic (Wave 0 for Plan 03)
import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

describe('buildWbsProposals — deduplication logic', () => {
  it('filters out items with names that already exist in wbs_items', async () => {
    // This function does not exist yet — test will fail with module not found
    const { buildWbsProposals } = await import('@/lib/wbs-generate');

    const existingItems = [
      { id: 1, name: 'Existing Task', level: 2, track: 'ADR' }
    ];

    const aiProposals = [
      { name: 'Existing Task', level: 2, parent_section: 'Architecture' },
      { name: 'New Task', level: 2, parent_section: 'Architecture' }
    ];

    const result = buildWbsProposals(aiProposals, existingItems, 'ADR');

    // Should only return 'New Task' (existing filtered out)
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('New Task');
  });

  it('skips Level 1 proposals even if AI returns them', async () => {
    const { buildWbsProposals } = await import('@/lib/wbs-generate');

    const existingItems: any[] = [];

    const aiProposals = [
      { name: 'Level 1 Header', level: 1, parent_section: null },
      { name: 'Level 2 Task', level: 2, parent_section: 'Architecture' }
    ];

    const result = buildWbsProposals(aiProposals, existingItems, 'ADR');

    // Should only return Level 2 task (Level 1 filtered out)
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Level 2 Task');
  });

  it('returns empty array when all proposals are duplicates', async () => {
    const { buildWbsProposals } = await import('@/lib/wbs-generate');

    const existingItems = [
      { id: 1, name: 'Task A', level: 2, track: 'ADR' },
      { id: 2, name: 'Task B', level: 2, track: 'ADR' }
    ];

    const aiProposals = [
      { name: 'Task A', level: 2, parent_section: 'Architecture' },
      { name: 'Task B', level: 2, parent_section: 'Architecture' }
    ];

    const result = buildWbsProposals(aiProposals, existingItems, 'ADR');

    // Should return empty array (all duplicates)
    expect(result).toHaveLength(0);
  });
});
