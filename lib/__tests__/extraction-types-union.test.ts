/**
 * Test: lib/extraction-types.ts EntityType union sync (Task 1, Plan 52-02)
 */

import { describe, it, expect } from 'vitest';
import type { EntityType } from '../extraction-types';

describe('EntityType union (lib/extraction-types.ts)', () => {
  it('includes before_state', () => {
    const testType: EntityType = 'before_state';
    expect(testType).toBe('before_state');
  });

  it('includes weekly_focus', () => {
    const testType: EntityType = 'weekly_focus';
    expect(testType).toBe('weekly_focus');
  });

  it('does NOT include team_engagement (deprecated in Phase 51 Plan 02)', () => {
    // This test verifies team_engagement is removed from the union
    // TypeScript will fail to compile if team_engagement is still in the union
    const validTypes: EntityType[] = [
      'action', 'risk', 'decision', 'milestone', 'stakeholder', 'task',
      'architecture', 'history', 'businessOutcome', 'team', 'note',
      'team_pathway', 'workstream', 'onboarding_step', 'integration',
      'wbs_task', 'arch_node', 'focus_area', 'e2e_workflow',
      'before_state', 'weekly_focus'
    ];

    // team_engagement should NOT compile as EntityType
    // @ts-expect-error - team_engagement is deprecated and removed from union
    const deprecated: EntityType = 'team_engagement';

    expect(validTypes.length).toBe(21); // All valid types
  });
});
