// tests/time-tracking-global/global-view.test.ts
// Wave 0 tests for TIME-01/TIME-02 — Global time view component behavior
import { describe, it, expect } from 'vitest';
import { GlobalTimeView, getMondayOfWeek } from '@/components/GlobalTimeView';

describe('GlobalTimeView — TIME-01/TIME-02', () => {
  it('GlobalTimeView exports a component', () => {
    expect(GlobalTimeView).toBeDefined();
    expect(typeof GlobalTimeView).toBe('function');
  });

  it('getMondayOfWeek returns correct Monday for given date', () => {
    expect(getMondayOfWeek).toBeDefined();
    expect(typeof getMondayOfWeek).toBe('function');

    // Test cases covering different day-of-week scenarios
    expect(getMondayOfWeek('2026-04-01')).toBe('2026-03-30'); // Wednesday → Monday
    expect(getMondayOfWeek('2026-03-30')).toBe('2026-03-30'); // Monday → Monday
    expect(getMondayOfWeek('2026-04-05')).toBe('2026-03-30'); // Sunday → previous Monday
  });
});
