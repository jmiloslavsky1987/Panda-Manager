// tests/wbs/generate-dedup.test.ts
// TDD RED phase for WBS-04 deduplication logic (Plan 47-03)
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

// Set ANTHROPIC_API_KEY for tests
process.env.ANTHROPIC_API_KEY = 'test-key';

// Mock database before importing
const mockDbSelect = vi.fn();
vi.mock('@/db', () => ({
  default: {
    select: mockDbSelect
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn()
}));

// Mock Anthropic SDK
const mockAnthropicCreate = vi.fn();
class MockAnthropic {
  messages = {
    create: mockAnthropicCreate
  };
}
vi.mock('@anthropic-ai/sdk', () => ({
  default: MockAnthropic
}));

describe('buildWbsProposals — deduplication logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters out items with names that already exist (case-insensitive)', async () => {
    const { buildWbsProposals } = await import('@/worker/jobs/wbs-generate-plan');

    const existingItems = [
      { id: 1, name: 'Architecture', level: 1, track: 'ADR', parent_id: null, project_id: 1, status: 'not_started' as const, display_order: 1, created_at: new Date(), source_trace: null },
      { id: 2, name: 'Existing Task', level: 2, track: 'ADR', parent_id: 1, project_id: 1, status: 'not_started' as const, display_order: 2, created_at: new Date(), source_trace: null }
    ];

    // Mock DB queries to return project and empty related entities
    mockDbSelect.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 1, name: 'Test Project', customer: 'Test Customer', overall_status: 'active', go_live_target: null, status_summary: null }
        ])
      })
    }));

    // Mock AI response to propose both existing and new items
    mockAnthropicCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify([
          { name: 'Existing Task', level: 2, parent_section_name: 'Architecture', track: 'ADR' },
          { name: 'New Task', level: 2, parent_section_name: 'Architecture', track: 'ADR' }
        ])
      }]
    });

    const result = await buildWbsProposals(1, existingItems);

    // Should only return 'New Task' (existing filtered out)
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('New Task');
  });

  it('skips Level 1 proposals even if AI returns them', async () => {
    const { buildWbsProposals } = await import('@/worker/jobs/wbs-generate-plan');

    const existingItems = [
      { id: 1, name: 'Architecture', level: 1, track: 'ADR', parent_id: null, project_id: 1, status: 'not_started' as const, display_order: 1, created_at: new Date(), source_trace: null }
    ];

    // Mock DB queries
    mockDbSelect.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 1, name: 'Test Project', customer: 'Test Customer', overall_status: 'active', go_live_target: null, status_summary: null }
        ])
      })
    }));

    // Mock AI response with L1 and L2 proposals
    mockAnthropicCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify([
          { name: 'Level 1 Header', level: 1, parent_section_name: null, track: 'ADR' },
          { name: 'Level 2 Task', level: 2, parent_section_name: 'Architecture', track: 'ADR' }
        ])
      }]
    });

    const result = await buildWbsProposals(1, existingItems);

    // Should filter out Level 1 — result only contains L2/L3
    expect(result.every(p => p.level === 2 || p.level === 3)).toBe(true);
  });

  it('returns empty array when all proposals are duplicates', async () => {
    const { buildWbsProposals } = await import('@/worker/jobs/wbs-generate-plan');

    const existingItems = [
      { id: 1, name: 'Architecture', level: 1, track: 'ADR', parent_id: null, project_id: 1, status: 'not_started' as const, display_order: 1, created_at: new Date(), source_trace: null },
      { id: 2, name: 'Task A', level: 2, track: 'ADR', parent_id: 1, project_id: 1, status: 'not_started' as const, display_order: 2, created_at: new Date(), source_trace: null },
      { id: 3, name: 'Task B', level: 2, track: 'ADR', parent_id: 1, project_id: 1, status: 'not_started' as const, display_order: 3, created_at: new Date(), source_trace: null }
    ];

    // Mock DB queries
    mockDbSelect.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 1, name: 'Test Project', customer: 'Test Customer', overall_status: 'active', go_live_target: null, status_summary: null }
        ])
      })
    }));

    // Mock AI response with only existing item names
    mockAnthropicCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify([
          { name: 'Task A', level: 2, parent_section_name: 'Architecture', track: 'ADR' },
          { name: 'Task B', level: 2, parent_section_name: 'Architecture', track: 'ADR' }
        ])
      }]
    });

    const result = await buildWbsProposals(1, existingItems);

    // Should return empty array (all duplicates)
    expect(result).toHaveLength(0);
  });
});
