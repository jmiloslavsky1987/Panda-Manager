/**
 * scheduler-skills.ts
 *
 * Static registry of all schedulable skills for Phase 24 Scheduler Enhanced.
 * Exported constants are consumed by the Scheduler UI wizard and the API routes.
 */

export interface SkillDef {
  id: string;
  label: string;
  description: string;
  hasParams: boolean;
}

/**
 * All 12 schedulable skills.
 * Skills with hasParams=true require an additional "params" wizard step.
 */
export const SKILL_LIST: SkillDef[] = [
  {
    id: 'morning-briefing',
    label: 'Morning Briefing',
    description: 'Daily AI-generated briefing with project highlights and upcoming deadlines.',
    hasParams: false,
  },
  {
    id: 'customer-project-tracker',
    label: 'Customer Project Tracker',
    description: 'Tracks progress across all active customer implementation projects.',
    hasParams: true,
  },
  {
    id: 'weekly-customer-status',
    label: 'Weekly Customer Status',
    description: 'Generates a weekly status report for a specific customer project.',
    hasParams: true,
  },
  {
    id: 'elt-external',
    label: 'ELT External',
    description: 'Runs the external ELT pipeline for syncing customer data from external sources.',
    hasParams: false,
  },
  {
    id: 'elt-internal',
    label: 'ELT Internal',
    description: 'Runs the internal ELT pipeline for syncing data between BigPanda systems.',
    hasParams: false,
  },
  {
    id: 'biggy-weekly-briefing',
    label: 'Biggy Weekly Briefing',
    description: "AI-powered weekly briefing synthesizing BigPanda's product and customer intelligence.",
    hasParams: false,
  },
  {
    id: 'context-updater',
    label: 'Context Updater',
    description: 'Sweeps Slack and other sources to refresh project context for AI skill runs.',
    hasParams: true,
  },
  {
    id: 'meeting-summary',
    label: 'Meeting Summary',
    description: 'Summarises recent meeting notes and action items into a structured report.',
    hasParams: false,
  },
  {
    id: 'workflow-diagram',
    label: 'Workflow Diagram',
    description: 'Generates E2E workflow diagrams for customer integration architectures.',
    hasParams: false,
  },
  {
    id: 'team-engagement-map',
    label: 'Team Engagement Map',
    description: 'Maps team engagement levels and onboarding status across customer projects.',
    hasParams: false,
  },
  {
    id: 'discovery-scan',
    label: 'Discovery Scan',
    description: 'Scans external sources to surface new actions, risks, and project updates.',
    hasParams: true,
  },
  {
    id: 'timesheet-reminder',
    label: 'Timesheet Reminder',
    description: 'Sends scheduled reminders to PS team members to submit timesheets.',
    hasParams: true,
  },
];

/**
 * IDs of skills that have configurable parameters (extra wizard step).
 */
export const SKILLS_WITH_PARAMS: string[] = [
  'discovery-scan',
  'customer-project-tracker',
  'weekly-customer-status',
  'context-updater',
  'timesheet-reminder',
];

/**
 * Returns wizard steps for a given skill.
 * Skills with params get an extra 'params' step after 'schedule'.
 */
export function getWizardSteps(skillId: string): string[] {
  if (SKILLS_WITH_PARAMS.includes(skillId)) {
    return ['skill', 'schedule', 'params'];
  }
  return ['skill', 'schedule'];
}

/**
 * Sidebar navigation items for the scheduler section.
 * Used by the scheduler sidebar component and sidebar.test.ts.
 */
export const SIDEBAR_NAV_ITEMS = [
  {
    href: '/scheduler',
    label: 'Scheduler',
    testId: 'sidebar-scheduler-link',
  },
];
