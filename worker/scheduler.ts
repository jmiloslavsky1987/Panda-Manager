// bigpanda-app/worker/scheduler.ts
import { Queue } from 'bullmq';
import { redisConnection } from './connection';
import type { AppSettings } from '../lib/settings-core';
import { db } from '../db';
import { scheduledJobs } from '../db/schema';
import { eq } from 'drizzle-orm';

export const jobQueue = new Queue('scheduled-jobs', { connection: redisConnection });

// Maps job names to their settings schedule keys
export const JOB_SCHEDULE_MAP: Record<string, keyof AppSettings['schedule']> = {
  'morning-briefing':        'morning_briefing',
  'health-refresh':          'health_check',
  'weekly-customer-status':  'weekly_status',
  'context-updater':         'slack_sweep',
  'gantt-snapshot':          'tracker_weekly',
  'risk-monitor':            'biggy_briefing',
};

/**
 * Registers or updates all job schedulers.
 * Idempotent — safe to call on every restart and in the 60s polling loop.
 * upsertJobScheduler with the same scheduler ID updates in place — no duplicates.
 */
export async function registerAllSchedulers(settings: AppSettings): Promise<void> {
  // Clean up phantom scheduler IDs from Redis (idempotent — safe on every restart)
  await jobQueue.removeJobScheduler('action-sync');
  await jobQueue.removeJobScheduler('weekly-briefing');

  for (const [jobName, scheduleKey] of Object.entries(JOB_SCHEDULE_MAP)) {
    const cronPattern = settings.schedule[scheduleKey];
    await jobQueue.upsertJobScheduler(
      jobName,                          // stable scheduler ID — deduplication key
      { pattern: cronPattern },         // cron expression from settings
      {
        name: jobName,
        data: { triggeredBy: 'scheduled' },
        opts: { removeOnComplete: 100, removeOnFail: 50 },
      }
    );
    console.log(`[scheduler] registered ${jobName} → ${cronPattern}`);
  }

  // customer-project-tracker: daily at 9am — fixed schedule (no settings key)
  await jobQueue.upsertJobScheduler(
    'customer-project-tracker',
    { pattern: '0 9 * * *' },
    {
      name: 'customer-project-tracker',
      data: { triggeredBy: 'scheduled' },
      opts: { removeOnComplete: 100, removeOnFail: 50 },
    }
  );
  console.log('[scheduler] registered customer-project-tracker → 0 9 * * *');

  // discovery-scan: daily at 8am — scans all active projects for external updates
  await jobQueue.upsertJobScheduler(
    'discovery-scan',
    { pattern: '0 8 * * *' },
    {
      name: 'discovery-scan',
      data: { triggeredBy: 'scheduled' },
      opts: { removeOnComplete: 10, removeOnFail: 50 },
    }
  );
  console.log('[scheduler] registered discovery-scan → 0 8 * * *');
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
