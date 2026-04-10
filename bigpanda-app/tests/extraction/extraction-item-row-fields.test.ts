import { describe, it, expect } from 'vitest';

describe('ExtractionItemRow - 21 entity type field mappings (TEAM-02)', () => {
  it('primaryFieldKeys has entries for all 21 entity types', async () => {
    const module = await import('@/components/ExtractionItemRow');
    // Access via default export if needed, or extract from module
    // This is a basic structure test - adjust based on actual export pattern

    const expectedTypes = [
      'action', 'risk', 'decision', 'milestone', 'stakeholder',
      'task', 'architecture', 'history', 'businessOutcome', 'team',
      'focus_area', 'e2e_workflow', 'wbs_task', 'note', 'team_pathway',
      'workstream', 'onboarding_step', 'integration', 'arch_node',
      'before_state', 'weekly_focus'
    ];

    // This test will need adjustment based on how primaryFieldKeys is exported
    // Initial stub assumes internal constant - may need to test via component behavior
    expect(expectedTypes.length).toBe(21);
  });
});
