// bigpanda-app/worker/scheduler.ts
import { Queue } from 'bullmq';
import { redisConnection } from './connection';
import type { AppSettings } from '../lib/settings-core';

export const jobQueue = new Queue('scheduled-jobs', { connection: redisConnection });

// Maps job names to their settings schedule keys
const JOB_SCHEDULE_MAP: Record<string, keyof AppSettings['schedule']> = {
  'action-sync':     'morning_briefing',
  'health-refresh':  'health_check',
  'weekly-briefing': 'weekly_status',
  'context-updater': 'slack_sweep',
  'gantt-snapshot':  'tracker_weekly',
  'risk-monitor':    'biggy_briefing',
};

/**
 * Registers or updates all 6 job schedulers.
 * Idempotent — safe to call on every restart and in the 60s polling loop.
 * upsertJobScheduler with the same scheduler ID updates in place — no duplicates.
 */
export async function registerAllSchedulers(settings: AppSettings): Promise<void> {
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
}
