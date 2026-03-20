// bigpanda-app/app/api/job-runs/route.ts
import { NextResponse } from 'next/server';
import db from '../../../../db';
import { jobRuns } from '../../../../db/schema';
import { desc } from 'drizzle-orm';

const JOB_NAMES = [
  'action-sync',
  'health-refresh',
  'weekly-briefing',
  'context-updater',
  'gantt-snapshot',
  'risk-monitor',
] as const;

export async function GET() {
  try {
    // Get latest run per job name using a lateral join / subquery approach
    // Fall back to simple: fetch last 100 runs, then deduplicate in JS
    const rows = await db
      .select()
      .from(jobRuns)
      .orderBy(desc(jobRuns.started_at))
      .limit(100);

    // Build a map: job_name → most recent row
    const latestByJob = new Map<string, typeof rows[number]>();
    for (const row of rows) {
      if (!latestByJob.has(row.job_name)) {
        latestByJob.set(row.job_name, row);
      }
    }

    // Build response — include all 6 known jobs even if never run
    const result = JOB_NAMES.map((name) => ({
      job_name: name,
      last_run: latestByJob.get(name) ?? null,
    }));

    return NextResponse.json(result);
  } catch (err) {
    // DB not yet migrated (job_runs table doesn't exist) — return empty
    console.error('[api/job-runs] error', err);
    return NextResponse.json(
      JOB_NAMES.map((name) => ({ job_name: name, last_run: null }))
    );
  }
}
