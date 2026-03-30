import { describe, it, expect } from 'vitest';
import { SKILL_LIST } from '../../lib/scheduler-skills';

const EXPECTED_SKILLS = [
  'morning-briefing',
  'customer-project-tracker',
  'weekly-customer-status',
  'elt-external',
  'elt-internal',
  'biggy-weekly-briefing',
  'context-updater',
  'meeting-summary',
  'workflow-diagram',
  'team-engagement-map',
  'discovery-scan',
  'timesheet-reminder',
];

describe('SKILL_LIST', () => {
  it('has exactly 12 entries', () => {
    expect(SKILL_LIST).toHaveLength(12);
  });

  it.each(EXPECTED_SKILLS)("contains skill '%s'", (skillId) => {
    const ids = SKILL_LIST.map((s: { id: string }) => s.id);
    expect(ids).toContain(skillId);
  });

  it('each entry has id field', () => {
    for (const skill of SKILL_LIST) {
      expect(skill).toHaveProperty('id');
    }
  });

  it('each entry has label field', () => {
    for (const skill of SKILL_LIST) {
      expect(skill).toHaveProperty('label');
    }
  });

  it('each entry has description field', () => {
    for (const skill of SKILL_LIST) {
      expect(skill).toHaveProperty('description');
    }
  });

  it('each entry has hasParams field', () => {
    for (const skill of SKILL_LIST) {
      expect(skill).toHaveProperty('hasParams');
    }
  });
});
