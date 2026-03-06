'use strict';
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

// RED phase: this require will fail until calendarService.js is created in Task 2
let findAvailableSlots;
before(() => {
  try {
    ({ findAvailableSlots } = require('./calendarService'));
  } catch {
    /* will fail until calendarService exists */
  }
});

// Fixed test dates (2026-03-09 = Monday, EST = UTC-5 in early March)
const TZ = 'America/New_York'; // UTC-5 in early March (EST)

// A single-weekday window for Monday 2026-03-09
const monMin = new Date('2026-03-09T00:00:00Z');
const monMax = new Date('2026-03-10T00:00:00Z');

// Saturday and Sunday for weekend skip tests
const satMin = new Date('2026-03-07T00:00:00Z');
const satMax = new Date('2026-03-08T00:00:00Z');
const sunMin = new Date('2026-03-08T00:00:00Z');
const sunMax = new Date('2026-03-09T00:00:00Z');

// Empty busy (no busy periods at all)
const emptyFreeBusy = { 'user@example.com': { busy: [], errors: [] } };

// Fully busy Monday: 8am-6pm EST = 13:00-23:00 UTC
const fullyBusyFreeBusy = {
  'user@example.com': {
    busy: [{ start: '2026-03-09T13:00:00Z', end: '2026-03-09T23:00:00Z' }],
    errors: [],
  },
};

// Busy 9am-11am EST = 14:00-16:00 UTC on Monday
const busyMorningFreeBusy = {
  'user@example.com': {
    busy: [{ start: '2026-03-09T14:00:00Z', end: '2026-03-09T16:00:00Z' }],
    errors: [],
  },
};

// Two overlapping busy periods: 8am-10am and 9am-11am EST = 13:00-15:00Z and 14:00-16:00Z
const overlappingBusyFreeBusy = {
  'user@example.com': {
    busy: [
      { start: '2026-03-09T13:00:00Z', end: '2026-03-09T15:00:00Z' },
      { start: '2026-03-09T14:00:00Z', end: '2026-03-09T16:00:00Z' },
    ],
    errors: [],
  },
};

// Calendar with errors
const errorFreeBusy = {
  'bad@example.com': {
    busy: [],
    errors: [{ domain: 'calendar', reason: 'notFound', message: 'Not found' }],
  },
};

describe('findAvailableSlots', () => {
  it('skips Saturday — returns zero slots', () => {
    assert.ok(findAvailableSlots, 'findAvailableSlots must be exported from calendarService');
    const result = findAvailableSlots({
      freeBusyByCalendar: emptyFreeBusy,
      durationMinutes: 60,
      timeMin: satMin,
      timeMax: satMax,
      timezone: TZ,
    });
    assert.equal(result.slots.length, 0, 'Saturday must produce zero slots');
  });

  it('skips Sunday — returns zero slots', () => {
    assert.ok(findAvailableSlots, 'findAvailableSlots must be exported from calendarService');
    const result = findAvailableSlots({
      freeBusyByCalendar: emptyFreeBusy,
      durationMinutes: 60,
      timeMin: sunMin,
      timeMax: sunMax,
      timezone: TZ,
    });
    assert.equal(result.slots.length, 0, 'Sunday must produce zero slots');
  });

  it('fully busy weekday produces zero slots', () => {
    assert.ok(findAvailableSlots, 'findAvailableSlots must be exported from calendarService');
    const result = findAvailableSlots({
      freeBusyByCalendar: fullyBusyFreeBusy,
      durationMinutes: 60,
      timeMin: monMin,
      timeMax: monMax,
      timezone: TZ,
    });
    assert.equal(result.slots.length, 0, 'Fully busy weekday must produce zero slots');
  });

  it('busy 9am-11am EST leaves slots before 9am and after 11am', () => {
    assert.ok(findAvailableSlots, 'findAvailableSlots must be exported from calendarService');
    const result = findAvailableSlots({
      freeBusyByCalendar: busyMorningFreeBusy,
      durationMinutes: 60,
      timeMin: monMin,
      timeMax: monMax,
      timezone: TZ,
    });
    // 8am-9am EST free (1 hour window = 1 slot), 11am-6pm EST free (7 hour window = 7 slots)
    // total = 8 slots
    assert.ok(result.slots.length > 0, 'Must have slots before 9am and after 11am');
    // Verify there are slots before 9am EST (= before 14:00 UTC)
    const beforeBusy = result.slots.filter(s => new Date(s.start) < new Date('2026-03-09T14:00:00Z'));
    const afterBusy = result.slots.filter(s => new Date(s.start) >= new Date('2026-03-09T16:00:00Z'));
    assert.ok(beforeBusy.length > 0, 'Must have at least one slot before busy period (8am-9am EST)');
    assert.ok(afterBusy.length > 0, 'Must have at least one slot after busy period (after 11am EST)');
  });

  it('overlapping busy periods merged into one — gap only after 11am EST', () => {
    assert.ok(findAvailableSlots, 'findAvailableSlots must be exported from calendarService');
    const result = findAvailableSlots({
      freeBusyByCalendar: overlappingBusyFreeBusy,
      durationMinutes: 60,
      timeMin: monMin,
      timeMax: monMax,
      timezone: TZ,
    });
    // Merged busy: 8am-11am EST (13:00-16:00Z)
    // Free before: nothing (busy starts at 8am which is window start)
    // Free after: 11am-6pm EST (16:00-23:00Z) = 7 hours = 7 slots
    assert.ok(result.slots.length > 0, 'Must have slots after merged busy block');
    // No slots should start at or before 16:00Z (during merged busy)
    const duringBusy = result.slots.filter(s => new Date(s.start) < new Date('2026-03-09T16:00:00Z'));
    assert.equal(duringBusy.length, 0, 'Merged overlapping periods must block all busy time');
  });

  it('60-min slot cannot start at 17:30 EST when window ends at 18:00 EST', () => {
    // 17:30 EST = 22:30 UTC, 18:00 EST = 23:00 UTC — a 60-min slot starting at 22:30 ends at 23:30 which exceeds 23:00
    // So the last valid slot start would be 17:00 EST = 22:00 UTC
    assert.ok(findAvailableSlots, 'findAvailableSlots must be exported from calendarService');
    const result = findAvailableSlots({
      freeBusyByCalendar: emptyFreeBusy,
      durationMinutes: 60,
      timeMin: monMin,
      timeMax: monMax,
      timezone: TZ,
    });
    // Window: 8am-6pm EST = 13:00-23:00 UTC, 10 hours = 10 x 60-min slots
    assert.ok(result.slots.length > 0, 'Must have slots');
    const lastSlot = result.slots[result.slots.length - 1];
    const lastSlotEnd = new Date(lastSlot.end);
    const windowEnd = new Date('2026-03-09T23:00:00Z'); // 6pm EST
    assert.ok(
      lastSlotEnd <= windowEnd,
      `Last slot end ${lastSlot.end} must be at or before 6pm EST (${windowEnd.toISOString()})`
    );
    // Verify no slot starts at 17:30 EST (22:30 UTC) since a 60-min slot would overflow
    const halfHourStart = result.slots.find(s => s.start === '2026-03-09T22:30:00.000Z');
    assert.equal(halfHourStart, undefined, 'No slot should start at 17:30 EST (would overflow 6pm window)');
  });

  it('errors dict populated when calendar has errors in freebusy response', () => {
    assert.ok(findAvailableSlots, 'findAvailableSlots must be exported from calendarService');
    const result = findAvailableSlots({
      freeBusyByCalendar: errorFreeBusy,
      durationMinutes: 60,
      timeMin: monMin,
      timeMax: monMax,
      timezone: TZ,
    });
    assert.ok(
      Object.keys(result.errors).length > 0,
      'errors dict must be populated when calendar has errors'
    );
    assert.ok(result.errors['bad@example.com'], 'errors dict must have key for errored calendar');
  });

  it('slot shape has all 5 required keys: start, end, start_local, end_local, date', () => {
    assert.ok(findAvailableSlots, 'findAvailableSlots must be exported from calendarService');
    const result = findAvailableSlots({
      freeBusyByCalendar: emptyFreeBusy,
      durationMinutes: 60,
      timeMin: monMin,
      timeMax: monMax,
      timezone: TZ,
    });
    assert.ok(result.slots.length > 0, 'Must have at least one slot to verify shape');
    const slot = result.slots[0];
    assert.ok('start' in slot, 'slot must have start');
    assert.ok('end' in slot, 'slot must have end');
    assert.ok('start_local' in slot, 'slot must have start_local');
    assert.ok('end_local' in slot, 'slot must have end_local');
    assert.ok('date' in slot, 'slot must have date');
    // Verify date is YYYY-MM-DD format
    assert.match(slot.date, /^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');
  });
});
