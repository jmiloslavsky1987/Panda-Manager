// bigpanda-app/worker/scheduler.ts
import { Queue } from 'bullmq';
import { getRedisConnection } from './connection';
import { db } from '../db';
import { scheduledJobs } from '../db/schema';
import { eq } from 'drizzle-orm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const jobQueue = new Queue('scheduled-jobs', { connection: getRedisConnection() as any });

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
 * Removes BullMQ job schedulers that have no corresponding row in scheduled_jobs.
 * This cleans up phantom schedulers registered directly (e.g. weekly-focus-project-N)
 * before the scheduler UI was wired. Safe to call on every restart — idempotent.
 */
export async function removeOrphanedSchedulers(): Promise<void> {
  // Get all BullMQ job schedulers currently registered in Redis
  const allSchedulers = await jobQueue.getJobSchedulers();

  // Build the set of valid DB-backed scheduler IDs
  const dbJobs = await db.select({ id: scheduledJobs.id }).from(scheduledJobs);
  const validIds = new Set(dbJobs.map(j => `db-job-${j.id}`));

  let removed = 0;
  for (const scheduler of allSchedulers) {
    // Skip schedulers with no ID (can't remove them); remove any not in the valid DB-backed set
    if (scheduler.id && !validIds.has(scheduler.id)) {
      await jobQueue.removeJobScheduler(scheduler.id);
      console.log(`[scheduler] removed orphaned scheduler: ${scheduler.id}`);
      removed++;
    }
  }
  if (removed > 0) {
    console.log(`[scheduler] removed ${removed} orphaned scheduler(s)`);
  } else {
    console.log('[scheduler] no orphaned schedulers found');
  }
}

/**
 * DB-driven scheduler registration.
 * Reads all enabled rows from scheduled_jobs and calls upsertJobScheduler
 * for each row that has a cron_expression.
 * Safe to call on startup and in the 60s polling loop — upsertJobScheduler is idempotent.
 * Preserves backward compatibility with registerAllSchedulers (settings-based).
 */
/**
 * Maps legacy settings-based job IDs to their current skill names.
 * Used by tests and validation - not for runtime scheduling (use registerDbSchedulers).
 */
export const JOB_SCHEDULE_MAP: Record<string, string> = {
  'morning-briefing': 'morning_briefing',
  'weekly-customer-status': 'weekly_status',
  // Legacy jobs removed from active scheduling:
  // 'action-sync', 'weekly-briefing', 'health-refresh', 'context-updater',
  // 'gantt-snapshot', 'risk-monitor', 'customer-project-tracker', 'discovery-scan'
};

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
        data: {
          triggeredBy: 'scheduled',
          jobId: job.id,
          // Spread skill_params_json so handlers receive projectId directly in job.data
          // (handlers check job.data.projectId to scope their run to the correct project)
          ...(job.skill_params_json as Record<string, unknown> ?? {}),
          ...(job.project_id != null ? { projectId: job.project_id } : {}),
        },
        opts: { removeOnComplete: 100, removeOnFail: 50 },
      },
    );
    console.log(`[scheduler] registered db-job-${job.id} (${job.name}) → ${job.cron_expression}`);
  }
}
