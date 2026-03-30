// bigpanda-app/worker/scheduler.ts
import { Queue } from 'bullmq';
import { redisConnection } from './connection';
import { db } from '../db';
import { scheduledJobs } from '../db/schema';
import { eq } from 'drizzle-orm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const jobQueue = new Queue('scheduled-jobs', { connection: redisConnection as any });

/**
 * Removes legacy settings-based scheduler IDs from Redis.
 * All scheduling is now DB-driven via registerDbSchedulers — use the
 * /scheduler UI to create and manage jobs.
 * Idempotent — safe to call on every restart.
 */
export async function registerAllSchedulers(): Promise<void> {
  const legacyIds = [
    'action-sync',
    'weekly-briefing',
    'morning-briefing',
    'health-refresh',
    'weekly-customer-status',
    'context-updater',
    'gantt-snapshot',
    'risk-monitor',
    'customer-project-tracker',
    'discovery-scan',
  ];
  for (const id of legacyIds) {
    await jobQueue.removeJobScheduler(id);
  }
  console.log('[scheduler] legacy schedulers removed — all scheduling is now DB-driven');
}

/**
 * DB-driven scheduler registration.
 * Reads all enabled rows from scheduled_jobs and calls upsertJobScheduler
 * for each row that has a cron_expression.
 * Safe to call on startup and in the 60s polling loop — upsertJobScheduler is idempotent.
 * Preserves backward compatibility with registerAllSchedulers (settings-based).
 */
export async function registerDbSchedulers(): Promise<void> {
  const enabledJobs = await db
    .select()
    .from(scheduledJobs)
    .where(eq(scheduledJobs.enabled, true));

  for (const job of enabledJobs) {
    if (!job.cron_expression) {
      console.log(`[scheduler] skipping db-job-${job.id} (${job.name}) — no cron expression`);
      continue;
    }
    await jobQueue.upsertJobScheduler(
      `db-job-${job.id}`,
      {
        pattern: job.cron_expression,
        ...(job.timezone ? { tz: job.timezone } : {}),
      },
      {
        name: job.skill_name,
        data: { triggeredBy: 'scheduled', jobId: job.id },
        opts: { removeOnComplete: 100, removeOnFail: 50 },
      },
    );
    console.log(`[scheduler] registered db-job-${job.id} (${job.name}) → ${job.cron_expression}`);
  }
}
