import { describe, it, expect } from 'vitest';
import { JOB_SCHEDULE_MAP } from '../worker/scheduler';

describe('JOB_SCHEDULE_MAP', () => {
  it("includes 'morning-briefing' as a key", () => {
    expect(Object.keys(JOB_SCHEDULE_MAP)).toContain('morning-briefing');
  });

  it("includes 'weekly-customer-status' as a key", () => {
    expect(Object.keys(JOB_SCHEDULE_MAP)).toContain('weekly-customer-status');
  });

  it("does NOT include 'action-sync' as a key", () => {
    expect(Object.keys(JOB_SCHEDULE_MAP)).not.toContain('action-sync');
  });

  it("does NOT include 'weekly-briefing' as a key", () => {
    expect(Object.keys(JOB_SCHEDULE_MAP)).not.toContain('weekly-briefing');
  });

  it("maps 'morning-briefing' to 'morning_briefing'", () => {
    expect(JOB_SCHEDULE_MAP['morning-briefing']).toBe('morning_briefing');
  });

  it("maps 'weekly-customer-status' to 'weekly_status'", () => {
    expect(JOB_SCHEDULE_MAP['weekly-customer-status']).toBe('weekly_status');
  });
});
