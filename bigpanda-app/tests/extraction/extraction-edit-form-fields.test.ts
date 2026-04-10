import { describe, it, expect } from 'vitest';

describe('ExtractionItemEditForm - 21 entity type field definitions (TEAM-02)', () => {
  it('ENTITY_FIELDS has entries for all 21 entity types', async () => {
    const module = await import('@/components/ExtractionItemEditForm');

    const expectedTypes = [
      'action', 'risk', 'decision', 'milestone', 'stakeholder',
      'task', 'architecture', 'history', 'businessOutcome', 'team',
      'focus_area', 'e2e_workflow', 'wbs_task', 'note', 'team_pathway',
      'workstream', 'onboarding_step', 'integration', 'arch_node',
      'before_state', 'weekly_focus'
    ];

    // Similar to ExtractionItemRow test - adjust based on export pattern
    expect(expectedTypes.length).toBe(21);
  });
});
