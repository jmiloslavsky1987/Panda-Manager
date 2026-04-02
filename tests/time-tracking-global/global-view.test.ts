// tests/time-tracking-global/global-view.test.ts
// Wave 0 RED tests for TIME-01/TIME-02 — Global time view component behavior
import { describe, it, expect, vi } from 'vitest';

// Mock modules to avoid import errors during RED phase
vi.mock('@/components/GlobalTimeView', () => ({
  GlobalTimeView: undefined,
  getMondayOfWeek: undefined,
}));

describe('GlobalTimeView — TIME-01/TIME-02', () => {
  it('GlobalTimeView exports a component', async () => {
    // RED test — will fail until GlobalTimeView is implemented
    const { GlobalTimeView } = await import('@/components/GlobalTimeView');
    expect(GlobalTimeView).toBeDefined();
    expect(typeof GlobalTimeView).toBe('function');
  });

  it('getMondayOfWeek returns correct Monday for given date', async () => {
    // RED test — will fail until getMondayOfWeek is implemented
    const { getMondayOfWeek } = await import('@/components/GlobalTimeView');
    expect(getMondayOfWeek).toBeDefined();
    expect(typeof getMondayOfWeek).toBe('function');

    // Test cases covering different day-of-week scenarios
    expect(getMondayOfWeek('2026-04-01')).toBe('2026-03-30'); // Wednesday → Monday
    expect(getMondayOfWeek('2026-03-30')).toBe('2026-03-30'); // Monday → Monday
    expect(getMondayOfWeek('2026-04-05')).toBe('2026-03-30'); // Sunday → previous Monday
  });
});
