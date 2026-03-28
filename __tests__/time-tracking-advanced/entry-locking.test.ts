import { describe, it, expect } from 'vitest';

// lib/time-tracking.ts does not exist yet — RED tests fail with "Cannot find module"
// or undefined symbol. This is the expected TDD RED state for Plan 23-01.
import { isLocked, canOverrideLock, buildLockPayload, buildUnlockPayload } from '@/lib/time-tracking';
import type { TimeEntry } from '@/db/schema';

// Minimal TimeEntry factory
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

describe('isLocked() — entry lock state (TTADV-15)', () => {
  it('TTADV-15-1: locked=true entry is locked', () => {
    const entry = makeEntry({ locked: true });
    expect(isLocked(entry)).toBe(true);
  });

  it('TTADV-15-2: approved entry with locked=false is NOT locked (locking is explicit, not automatic)', () => {
    const entry = makeEntry({
      submitted_on: new Date('2026-03-02T10:00:00Z'),
      approved_on: new Date('2026-03-03T10:00:00Z'),
      approved_by: 'manager',
      locked: false,
    });
    expect(isLocked(entry)).toBe(false);
  });

  it('TTADV-15-3: entry with no fields set is not locked', () => {
    const entry = makeEntry();
    expect(isLocked(entry)).toBe(false);
  });
});

describe('canOverrideLock() — role-based lock override (TTADV-15)', () => {
  it('TTADV-15-4: admin can override lock', () => {
    expect(canOverrideLock('admin')).toBe(true);
  });

  it('TTADV-15-5: approver can override lock', () => {
    expect(canOverrideLock('approver')).toBe(true);
  });

  it('TTADV-15-6: regular user cannot override lock', () => {
    expect(canOverrideLock('user')).toBe(false);
  });
});

describe('buildLockPayload() — create lock update payload (TTADV-15)', () => {
  it('TTADV-15-7: returns { locked: true }', () => {
    const payload = buildLockPayload();
    expect(payload).toEqual({ locked: true });
  });

  it('TTADV-15-8: payload has exactly one key', () => {
    const payload = buildLockPayload();
    expect(Object.keys(payload)).toHaveLength(1);
  });
});

describe('buildUnlockPayload() — create unlock update payload (TTADV-15)', () => {
  it('TTADV-15-9: returns { locked: false }', () => {
    const payload = buildUnlockPayload();
    expect(payload).toEqual({ locked: false });
  });

  it('TTADV-15-10: payload has exactly one key', () => {
    const payload = buildUnlockPayload();
    expect(Object.keys(payload)).toHaveLength(1);
  });
});
