import { describe, it, expect } from 'vitest';
import { getBannerData } from '../../app/api/projects/[projectId]/completeness/route';

describe('completeness-banner: getBannerData', () => {
  it('returns banner data including both empty tab names when given ["Risks", "Milestones"]', () => {
    const result = getBannerData(['Risks', 'Milestones']);
    expect(result).toBeDefined();
    expect(result.emptyTabs).toContain('Risks');
    expect(result.emptyTabs).toContain('Milestones');
    expect(result.show).toBe(true);
  });

  it('returns no banner (show: false) when empty array is provided', () => {
    const result = getBannerData([]);
    expect(result.show).toBe(false);
  });

  it('returns banner with single empty tab name', () => {
    const result = getBannerData(['Actions']);
    expect(result.emptyTabs).toContain('Actions');
    expect(result.show).toBe(true);
  });
});
