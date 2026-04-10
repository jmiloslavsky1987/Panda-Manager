import { describe, it, expect } from 'vitest';

describe('ExtractionPreview - 21 entity type coverage (TEAM-02)', () => {
  it('TAB_LABELS has all 21 entity types', async () => {
    const { TAB_LABELS } = await import('@/components/ExtractionPreview');

    const expectedTypes = [
      'action', 'risk', 'decision', 'milestone', 'stakeholder',
      'task', 'architecture', 'history', 'businessOutcome', 'team',
      'focus_area', 'e2e_workflow', 'wbs_task', 'note', 'team_pathway',
      'workstream', 'onboarding_step', 'integration', 'arch_node',
      'before_state', 'weekly_focus'
    ];

    expectedTypes.forEach(type => {
      expect(TAB_LABELS).toHaveProperty(type);
    });
  });

  it('ENTITY_ORDER includes all 21 entity types', async () => {
    const { ENTITY_ORDER } = await import('@/components/ExtractionPreview');

    expect(ENTITY_ORDER).toHaveLength(21);
  });
});
