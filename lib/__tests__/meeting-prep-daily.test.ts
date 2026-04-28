import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// SCHED-01 (auto-scheduling job): BullMQ worker job meeting-prep-daily runs
//   on a schedule, generates daily-prep briefs server-side, and persists them
//   to the daily_prep_briefs DB table; the daily-prep page stops reading from
//   LocalStorage (key: daily-prep-briefs:${selectedDate}) and instead fetches
//   from the DB.
// ---------------------------------------------------------------------------

const schedulerSkillsPath = path.resolve(__dirname, '../../lib/scheduler-skills.ts');
const meetingPrepDailyJobPath = path.resolve(__dirname, '../../worker/jobs/meeting-prep-daily.ts');
const workerIndexPath = path.resolve(__dirname, '../../worker/index.ts');
const schemaPath = path.resolve(__dirname, '../../db/schema.ts');
const migrationPath = path.resolve(__dirname, '../../db/migrations/0045_daily_prep_tables.sql');
const pagePath = path.resolve(__dirname, '../../app/daily-prep/page.tsx');

describe('SCHED-01: scheduler-skills.ts registration', () => {
  it('SCHED-01 Test 1: lib/scheduler-skills.ts contains meeting-prep-daily job name', () => {
    const source = readFileSync(schedulerSkillsPath, 'utf-8');
    expect(source).toContain('meeting-prep-daily');
  });
});

describe('SCHED-01: worker/jobs/meeting-prep-daily.ts job file', () => {
  it('SCHED-01 Test 2: worker/jobs/meeting-prep-daily.ts file exists', () => {
    expect(existsSync(meetingPrepDailyJobPath)).toBe(true);
  });

  it('SCHED-01 Test 3: worker/index.ts imports meeting-prep-daily', () => {
    const source = readFileSync(workerIndexPath, 'utf-8');
    expect(source).toContain('meeting-prep-daily');
  });

  it('SCHED-01 Test 4: worker/index.ts JOB_HANDLERS contains meeting-prep-daily entry', () => {
    const source = readFileSync(workerIndexPath, 'utf-8');
    expect(source).toContain("'meeting-prep-daily'");
  });
});

describe('SCHED-01: DB schema daily_prep_briefs', () => {
  it('SCHED-01 Test 5: db/schema.ts contains daily_prep_briefs table', () => {
    const source = readFileSync(schemaPath, 'utf-8');
    expect(source).toContain('daily_prep_briefs');
  });

  it('SCHED-01 Test 6: db/migrations/0045_daily_prep_tables.sql migration file exists', () => {
    expect(existsSync(migrationPath)).toBe(true);
  });
});

describe('SCHED-01: daily-prep page removes LocalStorage brief loading', () => {
  it('SCHED-01 Test 7: app/daily-prep/page.tsx does NOT contain daily-prep-briefs: localStorage key (LocalStorage removed)', () => {
    const source = readFileSync(pagePath, 'utf-8');
    // After SCHED-01: page reads from DB instead of localStorage
    // RED now (page currently reads from localStorage); GREEN after implementation
    expect(source).not.toContain('daily-prep-briefs:');
  });
});
