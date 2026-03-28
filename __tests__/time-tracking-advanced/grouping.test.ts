import { describe, it, expect } from 'vitest';

// lib/time-tracking.ts does not exist yet — RED tests fail with "Cannot find module"
// or undefined symbol. This is the expected TDD RED state for Plan 23-01.
import { groupEntries, computeSubtotals } from '@/lib/time-tracking';
import type { TimeEntry } from '@/db/schema';

// Note on scope (TTADV-17): This plan implements 4 grouping dimensions supported
// by the existing time_entries schema: project, team_member (submitted_by), status, date.
// Grouping by role/phase/task requires schema extension not in scope for Phase 23.

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 1,
    project_id: 10,
    date: '2026-03-01',
    hours: '2.0',
    description: 'Test entry',
    created_at: new Date('2026-03-01T09:00:00Z'),
    updated_at: new Date('2026-03-01T09:00:00Z'),
    submitted_on: null,
    submitted_by: null,
    approved_on: null,
    approved_by: null,
    rejected_on: null,
    rejected_by: null,
    locked: false,
    ...overrides,
  };
}

describe('groupEntries() — group by project (TTADV-17)', () => {
  it('TTADV-17-1: groups entries by project_id as string key', () => {
    const entries: TimeEntry[] = [
      makeEntry({ id: 1, project_id: 10 }),
      makeEntry({ id: 2, project_id: 20 }),
      makeEntry({ id: 3, project_id: 10 }),
    ];
    const result = groupEntries(entries, 'project');
    expect(result['10']).toHaveLength(2);
    expect(result['20']).toHaveLength(1);
  });

  it('TTADV-17-2: single-project entries produce one group key', () => {
    const entries: TimeEntry[] = [
      makeEntry({ id: 1, project_id: 5 }),
      makeEntry({ id: 2, project_id: 5 }),
    ];
    const result = groupEntries(entries, 'project');
    expect(Object.keys(result)).toHaveLength(1);
    expect(result['5']).toHaveLength(2);
  });

  it('TTADV-17-3: empty entries produces empty object', () => {
    const result = groupEntries([], 'project');
    expect(result).toEqual({});
  });
});

describe('groupEntries() — group by team_member (submitted_by) (TTADV-17)', () => {
  it('TTADV-17-4: groups entries by submitted_by name', () => {
    const entries: TimeEntry[] = [
      makeEntry({ id: 1, submitted_by: 'alice' }),
      makeEntry({ id: 2, submitted_by: 'bob' }),
      makeEntry({ id: 3, submitted_by: 'alice' }),
    ];
    const result = groupEntries(entries, 'team_member');
    expect(result['alice']).toHaveLength(2);
    expect(result['bob']).toHaveLength(1);
  });

  it('TTADV-17-5: null submitted_by entries grouped under "unassigned"', () => {
    const entries: TimeEntry[] = [
      makeEntry({ id: 1, submitted_by: null }),
      makeEntry({ id: 2, submitted_by: 'alice' }),
      makeEntry({ id: 3, submitted_by: null }),
    ];
    const result = groupEntries(entries, 'team_member');
    expect(result['unassigned']).toHaveLength(2);
    expect(result['alice']).toHaveLength(1);
  });
});

describe('groupEntries() — group by status (TTADV-17)', () => {
  it('TTADV-17-6: groups entries by approval status derived from getEntryStatus', () => {
    const entries: TimeEntry[] = [
      makeEntry({ id: 1 }), // draft
      makeEntry({ id: 2, submitted_on: new Date('2026-03-02T10:00:00Z') }), // submitted
      makeEntry({ id: 3, locked: true }), // locked
    ];
    const result = groupEntries(entries, 'status');
    expect(result['draft']).toHaveLength(1);
    expect(result['submitted']).toHaveLength(1);
    expect(result['locked']).toHaveLength(1);
  });

  it('TTADV-17-7: approved entries grouped under "approved"', () => {
    const entries: TimeEntry[] = [
      makeEntry({
        id: 1,
        submitted_on: new Date('2026-03-02T10:00:00Z'),
        approved_on: new Date('2026-03-03T10:00:00Z'),
      }),
    ];
    const result = groupEntries(entries, 'status');
    expect(result['approved']).toHaveLength(1);
  });
});

describe('groupEntries() — group by date (TTADV-17)', () => {
  it('TTADV-17-8: groups entries by entry.date string (YYYY-MM-DD)', () => {
    const entries: TimeEntry[] = [
      makeEntry({ id: 1, date: '2026-03-01' }),
      makeEntry({ id: 2, date: '2026-03-02' }),
      makeEntry({ id: 3, date: '2026-03-01' }),
    ];
    const result = groupEntries(entries, 'date');
    expect(result['2026-03-01']).toHaveLength(2);
    expect(result['2026-03-02']).toHaveLength(1);
  });
});

describe('computeSubtotals() — hours aggregation (TTADV-10)', () => {
  it('TTADV-10-1: sums hours across all entries in group', () => {
    const entries: TimeEntry[] = [
      makeEntry({ hours: '2.5' }),
      makeEntry({ hours: '1.5' }),
    ];
    const result = computeSubtotals(entries);
    expect(result.total_hours).toBeCloseTo(4.0);
  });

  it('TTADV-10-2: billable_hours excludes entries with [non-billable] in description', () => {
    const entries: TimeEntry[] = [
      makeEntry({ hours: '3.0', description: 'Integration work' }),
      makeEntry({ hours: '1.0', description: '[non-billable] team standup' }),
    ];
    const result = computeSubtotals(entries);
    expect(result.billable_hours).toBeCloseTo(3.0);
    expect(result.non_billable_hours).toBeCloseTo(1.0);
  });

  it('TTADV-10-3: [non-billable] tag is case-insensitive', () => {
    const entries: TimeEntry[] = [
      makeEntry({ hours: '2.0', description: 'Training [NON-BILLABLE]' }),
    ];
    const result = computeSubtotals(entries);
    expect(result.billable_hours).toBeCloseTo(0);
    expect(result.non_billable_hours).toBeCloseTo(2.0);
  });

  it('TTADV-10-4: non_billable_hours = total_hours - billable_hours', () => {
    const entries: TimeEntry[] = [
      makeEntry({ hours: '5.0', description: 'Billable work' }),
      makeEntry({ hours: '1.5', description: '[non-billable] admin' }),
    ];
    const result = computeSubtotals(entries);
    expect(result.non_billable_hours).toBeCloseTo(result.total_hours - result.billable_hours);
  });

  it('TTADV-10-5: empty group returns all zeros', () => {
    const result = computeSubtotals([]);
    expect(result).toEqual({ total_hours: 0, billable_hours: 0, non_billable_hours: 0 });
  });

  it('TTADV-10-6: single entry with 2.5 hours is totaled correctly', () => {
    const entries: TimeEntry[] = [makeEntry({ hours: '2.5' })];
    const result = computeSubtotals(entries);
    expect(result.total_hours).toBeCloseTo(2.5);
  });

  it('TTADV-10-7: all non-billable entries produce zero billable_hours', () => {
    const entries: TimeEntry[] = [
      makeEntry({ hours: '1.0', description: '[non-billable] planning' }),
      makeEntry({ hours: '2.0', description: '[non-billable] internal review' }),
    ];
    const result = computeSubtotals(entries);
    expect(result.billable_hours).toBeCloseTo(0);
    expect(result.total_hours).toBeCloseTo(3.0);
  });
});
