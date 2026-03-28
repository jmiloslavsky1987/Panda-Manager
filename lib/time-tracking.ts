/**
 * lib/time-tracking.ts
 *
 * Pure helper functions for the time-entry approval state machine, locking
 * guard, and grouping/subtotal logic.  No DB or server-only imports — safe
 * for both client and server use.
 */

import type { TimeEntry } from '@/db/schema'

// ─── Approval state machine ───────────────────────────────────────────────────

export type EntryStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'locked'

/**
 * Returns the approval status of a single time entry.
 * Priority order: locked > approved > rejected > submitted > draft
 */
export function getEntryStatus(entry: TimeEntry): EntryStatus {
  if (entry.locked) return 'locked'
  if (entry.approved_on) return 'approved'
  if (entry.rejected_on) return 'rejected'
  if (entry.submitted_on) return 'submitted'
  return 'draft'
}

/**
 * Returns true if the entry may be edited.
 * Only draft and rejected entries are editable.
 */
export function canEdit(entry: TimeEntry): boolean {
  const status = getEntryStatus(entry)
  return status === 'draft' || status === 'rejected'
}

/**
 * Returns true if the entry may be submitted for approval.
 * Only draft and rejected entries can be submitted.
 */
export function canSubmit(entry: TimeEntry): boolean {
  const status = getEntryStatus(entry)
  return status === 'draft' || status === 'rejected'
}

// ─── Lock guard ───────────────────────────────────────────────────────────────

/**
 * Returns true if the entry is currently locked.
 * Locking is explicit via the locked flag — not automatic on approval.
 */
export function isLocked(entry: TimeEntry): boolean {
  return entry.locked === true
}

export type UserRole = 'admin' | 'approver' | 'user'

/**
 * Returns true if the given role is allowed to override (unlock) a locked entry.
 * Admins and approvers can override locks; regular users cannot.
 */
export function canOverrideLock(role: string): boolean {
  return role === 'admin' || role === 'approver'
}

/**
 * Builds the Drizzle-compatible update payload to lock an entry.
 */
export function buildLockPayload(): { locked: true } {
  return { locked: true }
}

/**
 * Builds the Drizzle-compatible update payload to unlock an entry.
 */
export function buildUnlockPayload(): { locked: false } {
  return { locked: false }
}

// ─── Grouping and subtotals ───────────────────────────────────────────────────

export type GroupBy = 'project' | 'team_member' | 'status' | 'date'

/**
 * Groups an array of time entries by the specified dimension.
 *
 * - 'project'     → key = entry.project_id.toString()
 * - 'team_member' → key = entry.submitted_by ?? 'unassigned'
 * - 'status'      → key = getEntryStatus(entry)
 * - 'date'        → key = entry.date (YYYY-MM-DD)
 */
export function groupEntries(
  entries: TimeEntry[],
  by: GroupBy
): Record<string, TimeEntry[]> {
  const result: Record<string, TimeEntry[]> = {}

  for (const entry of entries) {
    let key: string

    switch (by) {
      case 'project':
        key = entry.project_id.toString()
        break
      case 'team_member':
        key = entry.submitted_by ?? 'unassigned'
        break
      case 'status':
        key = getEntryStatus(entry)
        break
      case 'date':
        key = entry.date
        break
    }

    if (!result[key]) {
      result[key] = []
    }
    result[key].push(entry)
  }

  return result
}

export interface Subtotals {
  total_hours: number
  billable_hours: number
  non_billable_hours: number
}

/**
 * Computes hour subtotals for a group of entries.
 * An entry is non-billable if its description contains '[non-billable]'
 * (case-insensitive).
 */
export function computeSubtotals(entries: TimeEntry[]): Subtotals {
  let total = 0
  let billable = 0
  let nonBillable = 0

  for (const entry of entries) {
    const hours = parseFloat(entry.hours) || 0
    total += hours

    if (entry.description.toLowerCase().includes('[non-billable]')) {
      nonBillable += hours
    } else {
      billable += hours
    }
  }

  return {
    total_hours: total,
    billable_hours: billable,
    non_billable_hours: nonBillable,
  }
}
