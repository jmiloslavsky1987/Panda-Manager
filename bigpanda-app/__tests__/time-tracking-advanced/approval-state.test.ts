import { describe, it, expect } from 'vitest';

// lib/time-tracking.ts does not exist yet — RED tests fail with "Cannot find module"
// or undefined symbol. This is the expected TDD RED state for Plan 23-01.
import { getEntryStatus, canEdit, canSubmit } from '@/lib/time-tracking';
import type { TimeEntry } from '@/db/schema';

// Minimal TimeEntry factory — only sets fields relevant to approval state
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

describe('getEntryStatus() — approval state machine (TTADV-07, TTADV-08)', () => {
  it('TTADV-07-1: returns "draft" when no submitted_on', () => {
    const entry = makeEntry({ submitted_on: null });
    expect(getEntryStatus(entry)).toBe('draft');
  });

  it('TTADV-07-2: returns "submitted" when submitted_on is set and no approved/rejected', () => {
    const entry = makeEntry({
      submitted_on: new Date('2026-03-02T10:00:00Z'),
      submitted_by: 'alice',
    });
    expect(getEntryStatus(entry)).toBe('submitted');
  });

  it('TTADV-07-3: returns "approved" when approved_on is set', () => {
    const entry = makeEntry({
      submitted_on: new Date('2026-03-02T10:00:00Z'),
      submitted_by: 'alice',
      approved_on: new Date('2026-03-03T10:00:00Z'),
      approved_by: 'manager',
    });
    expect(getEntryStatus(entry)).toBe('approved');
  });

  it('TTADV-07-4: returns "rejected" when rejected_on is set', () => {
    const entry = makeEntry({
      submitted_on: new Date('2026-03-02T10:00:00Z'),
      submitted_by: 'alice',
      rejected_on: new Date('2026-03-03T11:00:00Z'),
      rejected_by: 'manager',
    });
    expect(getEntryStatus(entry)).toBe('rejected');
  });

  it('TTADV-07-5: returns "locked" when locked=true (highest priority, overrides approved)', () => {
    const entry = makeEntry({
      submitted_on: new Date('2026-03-02T10:00:00Z'),
      approved_on: new Date('2026-03-03T10:00:00Z'),
      locked: true,
    });
    expect(getEntryStatus(entry)).toBe('locked');
  });

  it('TTADV-07-6: returns "locked" when locked=true on a draft entry', () => {
    const entry = makeEntry({ locked: true });
    expect(getEntryStatus(entry)).toBe('locked');
  });
});

describe('canEdit() — edit permission based on status (TTADV-08)', () => {
  it('TTADV-08-1: draft entry can be edited', () => {
    const entry = makeEntry();
    expect(canEdit(entry)).toBe(true);
  });

  it('TTADV-08-2: submitted entry cannot be edited (pending approval)', () => {
    const entry = makeEntry({
      submitted_on: new Date('2026-03-02T10:00:00Z'),
    });
    expect(canEdit(entry)).toBe(false);
  });

  it('TTADV-08-3: approved entry cannot be edited', () => {
    const entry = makeEntry({
      submitted_on: new Date('2026-03-02T10:00:00Z'),
      approved_on: new Date('2026-03-03T10:00:00Z'),
    });
    expect(canEdit(entry)).toBe(false);
  });

  it('TTADV-08-4: locked entry cannot be edited', () => {
    const entry = makeEntry({ locked: true });
    expect(canEdit(entry)).toBe(false);
  });

  it('TTADV-08-5: rejected entry can be edited (for correction and resubmission)', () => {
    const entry = makeEntry({
      submitted_on: new Date('2026-03-02T10:00:00Z'),
      rejected_on: new Date('2026-03-03T11:00:00Z'),
    });
    expect(canEdit(entry)).toBe(true);
  });
});

describe('canSubmit() — submit permission based on status (TTADV-08)', () => {
  it('TTADV-08-6: draft entry can be submitted', () => {
    const entry = makeEntry();
    expect(canSubmit(entry)).toBe(true);
  });

  it('TTADV-08-7: rejected entry can be resubmitted after correction', () => {
    const entry = makeEntry({
      submitted_on: new Date('2026-03-02T10:00:00Z'),
      rejected_on: new Date('2026-03-03T11:00:00Z'),
    });
    expect(canSubmit(entry)).toBe(true);
  });

  it('TTADV-08-8: submitted entry cannot be submitted again', () => {
    const entry = makeEntry({
      submitted_on: new Date('2026-03-02T10:00:00Z'),
    });
    expect(canSubmit(entry)).toBe(false);
  });

  it('TTADV-08-9: approved entry cannot be submitted', () => {
    const entry = makeEntry({
      submitted_on: new Date('2026-03-02T10:00:00Z'),
      approved_on: new Date('2026-03-03T10:00:00Z'),
    });
    expect(canSubmit(entry)).toBe(false);
  });

  it('TTADV-08-10: locked entry cannot be submitted', () => {
    const entry = makeEntry({ locked: true });
    expect(canSubmit(entry)).toBe(false);
  });
});
