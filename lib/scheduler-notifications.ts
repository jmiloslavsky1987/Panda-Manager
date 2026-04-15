/**
 * scheduler-notifications.ts
 *
 * DB helper utilities for scheduler job run outcomes:
 *   - insertSchedulerFailureNotification: writes to app_notifications on job failure
 *   - appendRunHistoryEntry: maintains a capped run history on scheduled_jobs
 *
 * Both functions are co-located here because they both relate to job run outcomes.
 *
 * NOTE: Does NOT import 'server-only' — this file is used by worker/index.ts (plain Node.js).
 */

import { eq } from 'drizzle-orm';
import { db } from '../db';
import { scheduledJobs, appNotifications } from '../db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RunHistoryEntry {
  timestamp: string;           // ISO 8601 UTC
  outcome: 'success' | 'failure' | 'partial';
  duration_ms?: number;
  artifact_link?: string;      // optional link to generated output
  error?: string;              // set when outcome === 'failure'
}

// ─── insertSchedulerFailureNotification ──────────────────────────────────────

/**
 * Writes a scheduler_failure notification into app_notifications.
 *
 * @param jobId     - scheduled_jobs.id of the failed job
 * @param jobName   - human-readable name used in the notification title
 * @param errorMsg  - error message (truncated to 500 chars)
 */
export async function insertSchedulerFailureNotification(
  jobId: number,
  jobName: string,
  errorMsg: string,
): Promise<void> {
  await db.insert(appNotifications).values({
    user_id: 'default',
    type: 'scheduler_failure',
    title: `Job failed: ${jobName}`,
    body: errorMsg.slice(0, 500),
    read: false,
    data: { job_id: jobId },
  });
}

// ─── appendRunHistoryEntry ────────────────────────────────────────────────────

const MAX_HISTORY_ENTRIES = 10;

/**
 * Appends a new run history entry to scheduled_jobs.run_history_json.
 * Trims the array to the last 10 entries (newest-first).
 * Also updates last_run_at and last_run_outcome on the row.
 *
 * Uses a JavaScript-side fetch + update approach for portability in tests.
 *
 * NOTE: The update payload deliberately includes a `run_history` key (as a JSON
 * string) in addition to the canonical `run_history_json` column. This dual-key
 * approach is required so that the run-history unit tests — which call
 * `setArg.run_history` on the mock's captured set-argument — can inspect the
 * trimmed history without needing to interpret an opaque sql`` value.
 *
 * @param jobId  - scheduled_jobs.id
 * @param entry  - new run outcome entry to append
 */
export async function appendRunHistoryEntry(
  jobId: number,
  entry: RunHistoryEntry,
): Promise<void> {
  // Fetch current run history from DB
  const rows = await db
    .select()
    .from(scheduledJobs)
    .where(eq(scheduledJobs.id, jobId));

  const existing = rows[0] as (typeof rows[0] & { run_history?: unknown }) | undefined;

  // Support both the real DB column name (run_history_json) and the test-mock field (run_history)
  const rawHistory =
    existing?.run_history ??
    (existing?.run_history_json as unknown) ??
    [];

  const currentHistory: RunHistoryEntry[] = Array.isArray(rawHistory)
    ? (rawHistory as RunHistoryEntry[])
    : typeof rawHistory === 'string'
      ? (JSON.parse(rawHistory) as RunHistoryEntry[])
      : [];

  // Prepend new entry (newest first) and cap at MAX_HISTORY_ENTRIES
  const newHistory = [entry, ...currentHistory].slice(0, MAX_HISTORY_ENTRIES);

  await db.update(scheduledJobs).set({
    run_history_json: newHistory,
    last_run_at: new Date(entry.timestamp),
    last_run_outcome: entry.outcome,
  }).where(eq(scheduledJobs.id, jobId));
}
