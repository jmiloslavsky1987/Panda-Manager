import { describe, it, expect } from 'vitest';
import { computeCompletenessScore } from '../../app/api/projects/[projectId]/completeness/route';

// The 9 entity tables scored: actions, risks, milestones, stakeholders, decisions (keyDecisions),
// architectureIntegrations, teamOnboardingStatus, engagementHistory, businessOutcomes

type TableCounts = {
  actions: number;
  risks: number;
  milestones: number;
  stakeholders: number;
  keyDecisions: number;
  architectureIntegrations: number;
  teamOnboardingStatus: number;
  engagementHistory: number;
  businessOutcomes: number;
};

describe('completeness: computeCompletenessScore', () => {
  it('returns 100 when all 9 tables have records', () => {
    const counts: TableCounts = {
      actions: 5,
      risks: 2,
      milestones: 3,
      stakeholders: 4,
      keyDecisions: 1,
      architectureIntegrations: 2,
      teamOnboardingStatus: 3,
      engagementHistory: 1,
      businessOutcomes: 1,
    };
    expect(computeCompletenessScore(counts)).toBe(100);
  });

  it('returns 0 when all 9 tables are empty', () => {
    const counts: TableCounts = {
      actions: 0,
      risks: 0,
      milestones: 0,
      stakeholders: 0,
      keyDecisions: 0,
      architectureIntegrations: 0,
      teamOnboardingStatus: 0,
      engagementHistory: 0,
      businessOutcomes: 0,
    };
    expect(computeCompletenessScore(counts)).toBe(0);
  });

  it('returns approximately 44 when 4 of 9 tables are populated', () => {
    const counts: TableCounts = {
      actions: 1,
      risks: 1,
      milestones: 1,
      stakeholders: 1,
      keyDecisions: 0,
      architectureIntegrations: 0,
      teamOnboardingStatus: 0,
      engagementHistory: 0,
      businessOutcomes: 0,
    };
    const score = computeCompletenessScore(counts);
    // 4/9 = 0.444... → floor to 44
    expect(score).toBeGreaterThanOrEqual(44);
    expect(score).toBeLessThan(45);
  });
});
