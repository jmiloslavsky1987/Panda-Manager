// bigpanda-app/worker/jobs/timesheet-reminder.ts — Phase 23 Plan 07
//
// BullMQ worker job handler for 'timesheet-reminder'.
// Fires on schedule (e.g. day before submission due) to remind users about unsubmitted entries.
// Registered in worker/index.ts.

import type { Job } from 'bullmq';
import { computePendingReminders } from '../../lib/time-tracking-notifications';

export default async function timesheetReminderJob(job: Job): Promise<{ status: string }> {
  console.log(`[timesheet-reminder] starting (job id: ${job.id})`);

  try {
    const count = await computePendingReminders();
    console.log(`[timesheet-reminder] created ${count} reminder notification(s)`);
    return { status: 'completed' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[timesheet-reminder] failed: ${message}`);
    throw err; // re-throw so BullMQ marks job as failed
  }
}
