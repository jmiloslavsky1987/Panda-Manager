---
phase: 23-time-tracking-advanced
plan: "05"
subsystem: api
tags: [time-tracking, bulk-operations, drizzle, react, approval-workflow, next-js]

# Dependency graph
requires:
  - phase: 23-time-tracking-advanced
    provides: "approval state machine helpers (canEdit, isLocked, getEntryStatus) and per-entry approve/reject routes (23-03)"
  - phase: 23-time-tracking-advanced
    provides: "buildApprovalNotification function for per-entry approval notifications (23-07)"
provides:
  - "POST /api/projects/[id]/time-entries/bulk — bulk approve/reject/move/delete with graceful skip and audit log"
  - "TimeTab checkbox selection UI — per-row and select-all checkboxes (approver/admin only)"
  - "TimeTab bulk action toolbar — Approve Selected, Reject Selected (inline reason), Move to Project (dropdown), Delete Selected"
affects:
  - 23-time-tracking-advanced (remaining plans)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bulk endpoint pattern: single POST route with action enum + action-specific optional fields validated via zod"
    - "Best-effort notification pattern: notifications dispatched outside transaction, errors logged but approval not rolled back"
    - "Graceful skip pattern: ineligible entries (wrong status, locked) silently skipped; response returns processed+skipped counts"
    - "Inline reject reason pattern: bulk reject opens inline text input rather than modal, confirmed via Enter or button"
    - "Optimistic toast pattern: success toast auto-dismisses after 4s, error keeps selection for retry"

key-files:
  created:
    - bigpanda-app/app/api/projects/[projectId]/time-entries/bulk/route.ts
  modified:
    - bigpanda-app/components/TimeTab.tsx

key-decisions:
  - "Reject action iterates entries individually (not a single bulk .set()) to append [Rejected: reason] to each entry's description — bulk Drizzle .set() would overwrite description identically for all rows without per-entry content"
  - "Delete action checks isLocked() rather than canEdit() — locked-but-approved entries are not canEdit but also cannot be deleted; isLocked is the correct direct guard"
  - "buildApprovalNotification called outside the DB transaction (best-effort) — approval should never be rolled back due to a notification table write failure"
  - "Project picker for bulk move fetches /api/projects and filters out current project — falls back gracefully to empty state if GET is not available"
  - "Bulk toolbar only visible when isApprover && showBulkBar — regular users never see checkbox column or toolbar"

patterns-established:
  - "entity_type='time_entry_batch' in audit log for all batch operations (vs 'time_entry' for single-entry operations)"

requirements-completed:
  - TTADV-15
  - TTADV-19

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 23 Plan 05: Time Tracking Advanced Summary

**Bulk approve/reject/move/delete API route with per-entry approval notifications, plus TimeTab checkbox multi-select toolbar for approver role**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T02:22:58Z
- **Completed:** 2026-03-28T02:25:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created POST /api/projects/[id]/time-entries/bulk handling all four actions in a single route with Drizzle transactions, RLS SET LOCAL, audit logs (entity_type='time_entry_batch'), and graceful skip of ineligible entries
- Bulk approve dispatches buildApprovalNotification per approved entry outside the transaction (best-effort — approval never rolled back on notify failure), satisfying TTADV-19
- Updated TimeTab with checkbox column (approver/admin only), select-all header checkbox, selected-row highlighting, and a full bulk action toolbar with inline reject reason input and project move dropdown

## Task Commits

Each task was committed atomically:

1. **Task 1: Bulk operations API route** - `575e377` (feat)
2. **Task 2: TimeTab multi-select and bulk action toolbar** - `3e823ea` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `bigpanda-app/app/api/projects/[projectId]/time-entries/bulk/route.ts` - POST bulk endpoint: approve (submitted-only + buildApprovalNotification per entry), reject (submitted-only + per-entry description append), move (canEdit-only + project_id change), delete (non-locked + hard delete + audit log)
- `bigpanda-app/components/TimeTab.tsx` - Added selectedIds state, checkbox column, select-all toggle, bulk action toolbar with four actions, inline reject reason input, project move dropdown, success toast, error display

## Decisions Made

- Reject action loops over entries individually to call `.returning()` with per-entry `updatedDescription` — a single bulk `.set({ description: ... })` would set identical text for all rows without the per-entry original description
- `isLocked()` used as the delete guard rather than `!canEdit()` — locked-but-approved entries are not `canEdit` (correct) but the intent is specifically to block locked entries from deletion; `isLocked` is clearer and more precise
- Approval notifications dispatched after the transaction closes so a notification failure never triggers a rollback of the approval itself
- Move dropdown fetches `/api/projects` and filters out the current project; if no GET handler exists the list gracefully shows "No other projects found"

## Deviations from Plan

None — plan executed exactly as written. The reject action per-entry loop is consistent with the plan's description requirement and follows the same pattern as the single-entry reject route.

## Issues Encountered

Pre-existing TypeScript error: `configResult.rows` on the `RowList` type is not recognized by the TypeScript checker (same error exists in `approve/route.ts` from Plan 23-03). This is a Drizzle type definition gap — `.rows` exists at runtime on the `postgres` driver result. Out of scope to fix; tracked as pre-existing.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Bulk API route is operational; approvers can select multiple entries and process them in a single action
- TTADV-15 (bulk operations) and TTADV-19 (approval notifications for bulk) are complete
- TimeTab bulk UI integrates cleanly with existing per-row action buttons from Plan 23-03
- Remaining Phase 23 plans (23-06 onward) can proceed

## Self-Check: PASSED

- bulk/route.ts: FOUND
- TimeTab.tsx: FOUND
- 23-05-SUMMARY.md: FOUND
- Commit 575e377: FOUND
- Commit 3e823ea: FOUND

---
*Phase: 23-time-tracking-advanced*
*Completed: 2026-03-28*
