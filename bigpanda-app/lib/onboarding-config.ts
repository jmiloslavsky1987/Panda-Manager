/**
 * Canonical onboarding phase and step definitions.
 * Used by project creation, the seed endpoint, and the dashboard component.
 * Phase names must match exactly what is seeded in the DB.
 */

export interface PhaseConfig {
  name: string
  display_order: number
  steps: string[]
}

export const ADR_ONBOARDING_CONFIG: PhaseConfig[] = [
  {
    name: 'Discovery & Kickoff',
    display_order: 1,
    steps: ['Kickoff', 'Workflow Discovery', 'Solution Design', 'Single Sign-On'],
  },
  {
    name: 'Platform Configuration',
    display_order: 3,
    steps: ['Data Normalization', 'Environments', 'Incident Tags', 'Correlation'],
  },
  {
    name: 'UAT',
    display_order: 5,
    steps: ['Documentation', 'Go-Live Prep', 'UAT'],
  },
  {
    name: 'Go-Live',
    display_order: 6,
    steps: ['Go Live'],
  },
]

export const BIGGY_ONBOARDING_CONFIG: PhaseConfig[] = [
  {
    name: 'Discovery & Kickoff',
    display_order: 1,
    steps: ['Kickoff', 'Single Sign-On', 'Security & Approvals'],
  },
  {
    name: 'Platform Configuration',
    display_order: 3,
    steps: ['Action Plans', 'Workflows', 'Managed Incident Channels'],
  },
  {
    name: 'Validation',
    display_order: 5,
    steps: ['Testing', 'Validation', 'Team Launch Prep'],
  },
  {
    name: 'Go-Live',
    display_order: 6,
    steps: ['Go Live'],
  },
]

/** All step names across both tracks — used to sharpen extraction prompt matching. */
export const ALL_STANDARD_STEP_NAMES = [
  ...ADR_ONBOARDING_CONFIG.flatMap(p => p.steps),
  ...BIGGY_ONBOARDING_CONFIG.flatMap(p => p.steps),
].filter((v, i, a) => a.indexOf(v) === i)
