import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// RECUR-01 (recurring event templates): CalendarEventItem exposes
//   recurring_event_id so recurring events can be grouped; templates API
//   route at /api/daily-prep/templates/ supports GET/POST/DELETE; DB schema
//   has meeting_prep_templates table; DailyPrepCard has "Save as template"
//   and "Load template" UI actions.
// ---------------------------------------------------------------------------

const calendarImportPath = path.resolve(__dirname, '../../app/api/time-entries/calendar-import/route.ts');
const templatesRoutePath = path.resolve(__dirname, '../../app/api/daily-prep/templates/route.ts');
const schemaPath = path.resolve(__dirname, '../../db/schema.ts');
const cardPath = path.resolve(__dirname, '../../components/DailyPrepCard.tsx');

describe('RECUR-01: CalendarEventItem recurring_event_id field', () => {
  it('RECUR-01 Test 1: CalendarEventItem interface exposes recurring_event_id: string | null', () => {
    const source = readFileSync(calendarImportPath, 'utf-8');
    expect(source).toContain('recurring_event_id');
  });
});

describe('RECUR-01: /api/daily-prep/templates route', () => {
  it('RECUR-01 Test 2: templates route file exists at app/api/daily-prep/templates/route.ts', () => {
    expect(existsSync(templatesRoutePath)).toBe(true);
  });

  it('RECUR-01 Test 3: templates route exports GET function', () => {
    const source = readFileSync(templatesRoutePath, 'utf-8');
    expect(source).toContain('export async function GET');
  });

  it('RECUR-01 Test 4: templates route exports POST function', () => {
    const source = readFileSync(templatesRoutePath, 'utf-8');
    expect(source).toContain('export async function POST');
  });

  it('RECUR-01 Test 5: templates route exports DELETE function', () => {
    const source = readFileSync(templatesRoutePath, 'utf-8');
    expect(source).toContain('export async function DELETE');
  });

  it('RECUR-01 Test 6: templates route uses requireSession for auth guard', () => {
    const source = readFileSync(templatesRoutePath, 'utf-8');
    expect(source).toContain('requireSession');
  });
});

describe('RECUR-01: DB schema has meeting_prep_templates', () => {
  it('RECUR-01 Test 7: db/schema.ts contains meeting_prep_templates table', () => {
    const source = readFileSync(schemaPath, 'utf-8');
    expect(source).toContain('meeting_prep_templates');
  });
});

describe('RECUR-01: DailyPrepCard template UI', () => {
  it('RECUR-01 Test 8: DailyPrepCard.tsx contains "Save as template" text', () => {
    const source = readFileSync(cardPath, 'utf-8');
    expect(source).toContain('Save as template');
  });

  it('RECUR-01 Test 9: DailyPrepCard.tsx contains "Load template" text', () => {
    const source = readFileSync(cardPath, 'utf-8');
    expect(source).toContain('Load template');
  });

  it('RECUR-01 Test 10: DailyPrepCard.tsx contains hasTemplate in EventCardState', () => {
    const source = readFileSync(cardPath, 'utf-8');
    expect(source).toContain('hasTemplate');
  });
});
