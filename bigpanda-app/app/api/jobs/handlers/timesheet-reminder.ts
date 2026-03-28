/**
 * app/api/jobs/handlers/timesheet-reminder.ts — Phase 23 Plan 07
 *
 * BullMQ job handler for the 'timesheet-reminder' job.
 * Registered in bigpanda-app/worker/index.ts as 'timesheet-reminder'.
 *
 * When fired (by the scheduler or manual trigger):
 *   1. Calls computePendingReminders() to find unsubmitted entries this week
 *   2. Inserts one reminder notification per project with unsubmitted entries
 *   3. Logs result count
 *
 * Schedule: The scheduler should fire this job 'reminder_days_before' days before
 * the configured submission_due_day. Manual trigger: POST /api/jobs/trigger { jobName: 'timesheet-reminder' }
 */

import type { Job } from 'bullmq'
import { computePendingReminders } from '@/lib/time-tracking-notifications'

export default async function timesheetReminderHandler(job: Job): Promise<{ status: string; count: number }> {
  console.log(`[timesheet-reminder] job ${job.id} starting`)

  try {
    const count = await computePendingReminders()
    console.log(`[timesheet-reminder] created ${count} reminder(s)`)
    return { status: 'completed', count }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[timesheet-reminder] failed: ${message}`)
    throw err // re-throw so BullMQ marks the job as failed
  }
}
