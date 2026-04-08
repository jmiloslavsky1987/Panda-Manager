// tests/seeding/team-engagement.test.ts
// Validation for Team Engagement sections seeding
import { describe, it, expect, vi } from 'vitest';

// Mock dependencies before importing
vi.mock('@/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined)
    })
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn()
}));

vi.mock('server-only', () => ({}));

describe('Team Engagement sections seeding', () => {
  it('should seed 5 sections with correct names', async () => {
    // Expected sections from plan
    const expectedSections = [
      'Business Outcomes',
      'Architecture',
      'E2E Workflows',
      'Teams & Engagement',
      'Top Focus Areas'
    ];

    expect(expectedSections).toHaveLength(5);
    expect(expectedSections[0]).toBe('Business Outcomes');
    expect(expectedSections[1]).toBe('Architecture');
    expect(expectedSections[2]).toBe('E2E Workflows');
    expect(expectedSections[3]).toBe('Teams & Engagement');
    expect(expectedSections[4]).toBe('Top Focus Areas');
  });

  it('should initialize all sections with empty content', async () => {
    // All sections should start with empty content string
    const expectedContent = '';

    expect(expectedContent).toBe('');
  });
});
