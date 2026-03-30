import { describe, it, expect } from 'vitest';
import { frequencyToCron } from '../../lib/scheduler-utils';

describe('frequencyToCron', () => {
  it("daily with {hour:9, minute:0} returns '0 0 9 * * *'", () => {
    expect(frequencyToCron('daily', { hour: 9, minute: 0 })).toBe('0 0 9 * * *');
  });

  it("weekly with {hour:9, minute:30, dayOfWeek:1} returns '0 30 9 * * 1'", () => {
    expect(frequencyToCron('weekly', { hour: 9, minute: 30, dayOfWeek: 1 })).toBe('0 30 9 * * 1');
  });

  it("monthly with {hour:8, minute:0, dayOfMonth:1} returns '0 0 8 1 * *'", () => {
    expect(frequencyToCron('monthly', { hour: 8, minute: 0, dayOfMonth: 1 })).toBe('0 0 8 1 * *');
  });

  it("custom with {cron:'0 9 * * MON'} returns '0 9 * * MON' unchanged", () => {
    expect(frequencyToCron('custom', { cron: '0 9 * * MON' })).toBe('0 9 * * MON');
  });

  it("once returns null", () => {
    expect(frequencyToCron('once', {})).toBeNull();
  });

  it("biweekly returns null (handled separately via BullMQ every:ms)", () => {
    expect(frequencyToCron('biweekly', {})).toBeNull();
  });
});
