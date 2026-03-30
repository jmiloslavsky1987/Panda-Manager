import { describe, it, expect } from 'vitest';
import { getWizardSteps, SKILLS_WITH_PARAMS } from '../../lib/scheduler-skills';

describe('getWizardSteps', () => {
  it("returns ['skill','schedule','params'] for 'discovery-scan'", () => {
    expect(getWizardSteps('discovery-scan')).toEqual(['skill', 'schedule', 'params']);
  });

  it("returns ['skill','schedule'] for 'morning-briefing' (no params step)", () => {
    expect(getWizardSteps('morning-briefing')).toEqual(['skill', 'schedule']);
  });
});

describe('SKILLS_WITH_PARAMS', () => {
  it("contains 'discovery-scan'", () => {
    expect(SKILLS_WITH_PARAMS).toContain('discovery-scan');
  });

  it("contains 'customer-project-tracker'", () => {
    expect(SKILLS_WITH_PARAMS).toContain('customer-project-tracker');
  });

  it("contains 'weekly-customer-status'", () => {
    expect(SKILLS_WITH_PARAMS).toContain('weekly-customer-status');
  });

  it("contains 'context-updater'", () => {
    expect(SKILLS_WITH_PARAMS).toContain('context-updater');
  });

  it("does not contain 'morning-briefing'", () => {
    expect(SKILLS_WITH_PARAMS).not.toContain('morning-briefing');
  });

  it("does not contain 'meeting-summary'", () => {
    expect(SKILLS_WITH_PARAMS).not.toContain('meeting-summary');
  });
});
