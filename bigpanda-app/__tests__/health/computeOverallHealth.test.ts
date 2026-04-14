import { describe, it, expect } from 'vitest';
import { computeOverallHealth } from '@/components/HealthDashboard';

describe('computeOverallHealth', () => {
  it('returns red when critical risks are open (trumps all)', () => {
    const result = computeOverallHealth({
      openCriticalRisks: 1,
      openHighRisks: 0,
      overdueMilestones: 0,
    });
    expect(result).toBe('red');
  });

  it('returns yellow when high risks are open', () => {
    const result = computeOverallHealth({
      openCriticalRisks: 0,
      openHighRisks: 1,
      overdueMilestones: 0,
    });
    expect(result).toBe('yellow');
  });

  it('returns yellow when milestones are overdue', () => {
    const result = computeOverallHealth({
      openCriticalRisks: 0,
      openHighRisks: 0,
      overdueMilestones: 2,
    });
    expect(result).toBe('yellow');
  });

  it('returns green when no risks and no overdue milestones', () => {
    const result = computeOverallHealth({
      openCriticalRisks: 0,
      openHighRisks: 0,
      overdueMilestones: 0,
    });
    expect(result).toBe('green');
  });

  it('returns red when critical risks exist even with other signals', () => {
    const result = computeOverallHealth({
      openCriticalRisks: 1,
      openHighRisks: 1,
      overdueMilestones: 3,
    });
    expect(result).toBe('red');
  });

  it('returns yellow when both high risks and overdue milestones exist', () => {
    const result = computeOverallHealth({
      openCriticalRisks: 0,
      openHighRisks: 1,
      overdueMilestones: 2,
    });
    expect(result).toBe('yellow');
  });
});
