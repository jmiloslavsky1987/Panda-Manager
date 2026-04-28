import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// AVAIL-01 (stakeholder availability): new /api/calendar/freebusy route fetches
//   Google Calendar free/busy data; OAuth scope extended to include
//   calendar.freebusy; CalendarEventItem exposes start_datetime and end_datetime
//   for overlap detection; DailyPrepCard shows availability field in EventCardState.
// ---------------------------------------------------------------------------

const freebusyRoutePath = path.resolve(__dirname, '../../app/api/calendar/freebusy/route.ts');
const oauthCalendarPath = path.resolve(__dirname, '../../app/api/oauth/calendar/route.ts');
const calendarImportPath = path.resolve(__dirname, '../../app/api/time-entries/calendar-import/route.ts');
const cardPath = path.resolve(__dirname, '../../components/DailyPrepCard.tsx');

describe('AVAIL-01: /api/calendar/freebusy route', () => {
  it('AVAIL-01 Test 1: freebusy route file exists at app/api/calendar/freebusy/route.ts', () => {
    expect(existsSync(freebusyRoutePath)).toBe(true);
  });

  it('AVAIL-01 Test 2: freebusy route uses requireSession for auth guard', () => {
    const source = readFileSync(freebusyRoutePath, 'utf-8');
    expect(source).toContain('requireSession');
  });

  it('AVAIL-01 Test 3: freebusy route exports POST function', () => {
    const source = readFileSync(freebusyRoutePath, 'utf-8');
    expect(source).toContain('export async function POST');
  });
});

describe('AVAIL-01: OAuth calendar scope includes freebusy', () => {
  it('AVAIL-01 Test 4: app/api/oauth/calendar/route.ts contains calendar.freebusy scope string', () => {
    const source = readFileSync(oauthCalendarPath, 'utf-8');
    expect(source).toContain('calendar.freebusy');
  });
});

describe('AVAIL-01: CalendarEventItem datetime fields', () => {
  it('AVAIL-01 Test 5: CalendarEventItem contains start_datetime field', () => {
    const source = readFileSync(calendarImportPath, 'utf-8');
    expect(source).toContain('start_datetime');
  });

  it('AVAIL-01 Test 6: CalendarEventItem contains end_datetime field', () => {
    const source = readFileSync(calendarImportPath, 'utf-8');
    expect(source).toContain('end_datetime');
  });
});

describe('AVAIL-01: DailyPrepCard availability field', () => {
  it('AVAIL-01 Test 7: DailyPrepCard.tsx contains "availability" EventCardState field', () => {
    const source = readFileSync(cardPath, 'utf-8');
    expect(source).toContain('availability');
  });
});
