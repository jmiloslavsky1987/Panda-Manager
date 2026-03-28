/**
 * lib/time-tracking-notifications.ts — Phase 23 Plan 07
 *
 * In-app notification logic for time tracking:
 *   - computePendingReminders: determines who has unsubmitted entries and creates reminders
 *   - buildApprovalNotification: inserts an approved notification after approve route succeeds
 *   - buildRejectionNotification: inserts a rejected notification with reason after reject route succeeds
 *
 * All functions write to app_notifications (DB-backed, persistent).
 * User isolation: user_id='default' for the current single-user deployment.
 */

import db from '@/db'
import { appNotifications, timeEntries, timeTrackingConfig } from '@/db/schema'
import { eq, and, isNull, like, sql } from 'drizzle-orm'
import type { TimeEntry } from '@/db/schema'

// ─── Week helpers ──────────────────────────────────────────────────────────────

/**
 * Returns ISO date string (YYYY-MM-DD) for the Monday of the week containing `date`.
 */
function getMondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

/**
 * Returns ISO date string (YYYY-MM-DD) for the Sunday of the week containing `date`.
 */
function getSundayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? 0 : 7 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

// ─── computePendingReminders ───────────────────────────────────────────────────

/**
 * Determines which users have unsubmitted time entries for the current week and
 * creates reminder notifications in app_notifications.
 *
 * Logic:
 * 1. Fetch time_tracking_config — skip entirely if enabled=false or table missing
 * 2. Compute current week bounds (Mon–Sun)
 * 3. Find all projects with at least one entry this week with submitted_on=null
 * 4. For each such project: insert a 'timesheet_reminder' notification
 * 5. Exempt users in config.exempt_users are skipped
 *    (user_id='default' single-user: skip only if 'default' is in exempt_users)
 *
 * Returns the count of notifications created.
 */
export async function computePendingReminders(): Promise<number> {
  // 1. Fetch config — fail-safe: skip on any error
  let config: {
    enabled: boolean
    submission_due_day: string
    submission_due_time: string
    exempt_users: string[]
  } | null = null

  try {
    const rows = await db.select({
      enabled: timeTrackingConfig.enabled,
      submission_due_day: timeTrackingConfig.submission_due_day,
      submission_due_time: timeTrackingConfig.submission_due_time,
      exempt_users: timeTrackingConfig.exempt_users,
    }).from(timeTrackingConfig).limit(1)

    if (rows.length > 0) {
      config = rows[0]
    }
  } catch {
    // time_tracking_config table not yet created or empty — skip reminders
    console.warn('[computePendingReminders] time_tracking_config unavailable — skipping')
    return 0
  }

  if (!config || !config.enabled) {
    console.log('[computePendingReminders] time tracking disabled — skipping reminders')
    return 0
  }

  // 2. Check if 'default' user is exempt
  const exemptUsers: string[] = config.exempt_users ?? []
  if (exemptUsers.includes('default')) {
    console.log('[computePendingReminders] default user is exempt — skipping')
    return 0
  }

  // 3. Compute current week bounds (Mon–Sun ISO dates)
  const now = new Date()
  const weekStart = getMondayOfWeek(now)
  const weekEnd = getSundayOfWeek(now)

  // 4. Find projects with at least one unsubmitted entry this week
  //    time_entries.date is TEXT 'YYYY-MM-DD' — filter by range via string comparison
  const unsubmittedRows = await db
    .selectDistinct({ project_id: timeEntries.project_id })
    .from(timeEntries)
    .where(
      and(
        isNull(timeEntries.submitted_on),
        sql`${timeEntries.date} >= ${weekStart}`,
        sql`${timeEntries.date} <= ${weekEnd}`
      )
    )

  if (unsubmittedRows.length === 0) {
    console.log('[computePendingReminders] no unsubmitted entries this week — no reminders needed')
    return 0
  }

  // 5. Insert one reminder per project
  const duePart = `${config.submission_due_day} at ${config.submission_due_time}`
  let created = 0

  for (const row of unsubmittedRows) {
    await db.insert(appNotifications).values({
      user_id: 'default',
      type: 'timesheet_reminder',
      title: 'Timesheet Reminder',
      body: `You have unsubmitted time entries for the current week. Please submit by ${duePart}.`,
      read: false,
      data: { project_id: row.project_id, week_start: weekStart, week_end: weekEnd },
    })
    created++
  }

  console.log(`[computePendingReminders] created ${created} reminder(s) for week ${weekStart}–${weekEnd}`)
  return created
}

// ─── buildApprovalNotification ────────────────────────────────────────────────

/**
 * Inserts a 'timesheet_approved' notification after an entry is approved.
 * Called from the approve route after the Drizzle update.
 */
export async function buildApprovalNotification(
  entry: TimeEntry,
  approvedBy: string
): Promise<void> {
  await db.insert(appNotifications).values({
    user_id: 'default',
    type: 'timesheet_approved',
    title: 'Time Entry Approved',
    body: `Your entry "${entry.description}" on ${entry.date} has been approved by ${approvedBy}.`,
    read: false,
    data: { entry_id: entry.id, project_id: entry.project_id, date: entry.date },
  })
}

// ─── buildRejectionNotification ───────────────────────────────────────────────

/**
 * Inserts a 'timesheet_rejected' notification with the rejection reason.
 * Called from the reject route after the Drizzle update.
 */
export async function buildRejectionNotification(
  entry: TimeEntry,
  rejectedBy: string,
  reason: string
): Promise<void> {
  await db.insert(appNotifications).values({
    user_id: 'default',
    type: 'timesheet_rejected',
    title: 'Time Entry Rejected',
    body: `Your entry "${entry.description}" on ${entry.date} was rejected by ${rejectedBy}. Reason: ${reason}`,
    read: false,
    data: { entry_id: entry.id, project_id: entry.project_id, date: entry.date, reason },
  })
}
