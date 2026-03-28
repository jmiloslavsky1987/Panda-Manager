---
phase: 23-time-tracking-advanced
plan: "03"
subsystem: api
tags: [time-tracking, approval-workflow, tdd, drizzle, next-js, react]

# Dependency graph
requires:
  - phase: 23-time-tracking-advanced
    provides: TDD RED test scaffold for approval state machine, locking, and grouping (23-01)
  - phase: 17-schema-extensions
    provides: time_entries table with submitted_on/approved_on/rejected_on/locked fields (SCHEMA-03)
provides:
  - "lib/time-tracking.ts — 9 pure helper functions: getEntryStatus, canEdit, canSubmit, isLocked, canOverrideLock, buildLockPayload, buildUnlockPayload, groupEntries, computeSubtotals"
  - "POST /api/projects/[id]/time-entries/submit — batch-submits draft week entries for approval"
  - "POST /api/projects/[id]/time-entries/[entryId]/approve — approves entry, optional auto-lock"
  - "POST /api/projects/[id]/time-entries/[entryId]/reject — rejects entry with mandatory reason"
  - "TimeTab with status badges, Submit Week dialog (with submit-on-behalf for approver), approve/reject/override-lock actions"
affects:
  - 23-time-tracking-advanced (remaining plans)
  - 24-scheduler-enhanced (may use canEdit/isLocked helpers)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure helper lib pattern: lib/time-tracking.ts has zero server/DB imports — safe for client components"
    - "Graceful config degradation: approve route defaults lock_after_approval=false when time_tracking_config table absent"
    - "Role-from-URL pattern: ?role=approver|admin|user query param drives UI branching (auth deferred)"
    - "Per-entry optimistic saving state: Record<entryId, actionString> prevents double-clicks"

key-files:
  created:
    - bigpanda-app/lib/time-tracking.ts
    - bigpanda-app/app/api/projects/[projectId]/time-entries/submit/route.ts
    - bigpanda-app/app/api/projects/[projectId]/time-entries/[entryId]/approve/route.ts
    - bigpanda-app/app/api/projects/[projectId]/time-entries/[entryId]/reject/route.ts
  modified:
    - bigpanda-app/components/TimeTab.tsx

key-decisions:
  - "lib/time-tracking.ts exports both value functions AND TypeScript types (EntryStatus, GroupBy, Subtotals) — client components can import types without server-only side effects"
  - "Approve route tries to fetch time_tracking_config but catches table-not-found error and defaults lock_after_approval=false — allows 23-03 to run before 23-02"
  - "Reject route appends [Rejected: reason] to description and does NOT lock — rejected entries return to draft state, enabling correction + resubmission"
  - "Submit Week dialog uses <datalist> for recent submitters (not a full select) — allows free-text username entry for TTADV-09 compliance"
  - "Override Lock calls PATCH on the entry route (not a separate endpoint) — reuses existing PATCH handler"

patterns-established:
  - "Status priority: locked > approved > rejected > submitted > draft"
  - "Audit log for approval events uses entity_type='time_entry' (per-entry) vs 'time_entry_batch' (submit operation)"

requirements-completed:
  - TTADV-07
  - TTADV-08
  - TTADV-09
  - TTADV-10

# Metrics
duration: 4min
completed: 2026-03-28
---

# Phase 23 Plan 03: Time Tracking Advanced Summary

**Approval state machine, submit/approve/reject API routes, and TimeTab UI — 41 TDD RED tests from 23-01 now GREEN, approvers can submit on behalf of another user via ?role=approver**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-28T02:09:47Z
- **Completed:** 2026-03-28T02:13:16Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Implemented all 9 helper functions in `lib/time-tracking.ts`; all 41 TDD RED tests from 23-01 now pass GREEN
- Created 3 approval workflow API routes: submit (batch week), approve (per-entry with optional auto-lock), reject (with mandatory reason + description note)
- Updated TimeTab with status badges, Submit Week dialog (TTADV-09 submit-on-behalf for approver role), per-row approve/reject buttons, lock icon, Override Lock button, and edit/delete gating on canEdit()

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement lib/time-tracking.ts (GREEN for Wave 0 RED tests)** - `9ecf7bf` (feat)
2. **Task 2: Approval workflow API routes + TimeTab UI updates** - `f33d0ac` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `bigpanda-app/lib/time-tracking.ts` - 9 pure helper functions; zero DB/server imports; safe for client+server
- `bigpanda-app/app/api/projects/[projectId]/time-entries/submit/route.ts` - POST batch-submits draft entries for a week
- `bigpanda-app/app/api/projects/[projectId]/time-entries/[entryId]/approve/route.ts` - POST approves a submitted entry; reads lock_after_approval with graceful fallback
- `bigpanda-app/app/api/projects/[projectId]/time-entries/[entryId]/reject/route.ts` - POST rejects submitted entry, requires reason, appends to description
- `bigpanda-app/components/TimeTab.tsx` - Added status badges, Submit Week dialog, per-row approve/reject/unlock, canEdit gating

## Decisions Made

- `lib/time-tracking.ts` exports both functions and TypeScript types (`EntryStatus`, `GroupBy`, `Subtotals`) — client components can import types without triggering server-only side effects
- Approve route gracefully degrades when `time_tracking_config` table is absent (23-02 not yet run): catches the error and defaults `lock_after_approval=false` rather than blocking
- Submit Week dialog uses `<datalist>` for recent submitters rather than a `<select>` — allows free-text entry for usernames not yet in the system, required for TTADV-09 compliance
- Override Lock button calls `PATCH` on the existing entry route with `{ locked: false }` — reuses existing update handler rather than adding a new endpoint

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Graceful time_tracking_config fallback in approve route**
- **Found during:** Task 2 (approve route implementation)
- **Issue:** Plan 23-02 (which creates `time_tracking_config` table) has not been executed; plan 23-03 depends only on 23-01. Without a fallback, the approve route would 500 on every request.
- **Fix:** Wrapped the `SELECT lock_after_approval FROM time_tracking_config` query in a try/catch; on any error (table doesn't exist, no rows) defaults to `lock_after_approval=false`
- **Files modified:** `bigpanda-app/app/api/projects/[projectId]/time-entries/[entryId]/approve/route.ts`
- **Verification:** Route still functional; will automatically use real config value once 23-02 creates the table
- **Committed in:** `f33d0ac` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical resilience)
**Impact on plan:** Required for correctness — approve route must not error when 23-02 hasn't run yet. No scope creep.

## Issues Encountered

None. All 41 TDD tests went GREEN on first implementation attempt.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All four approval workflow API routes operational (submit, approve, reject; PATCH for unlock uses existing entry route)
- TimeTab fully wired for approval UX with role-based actions via `?role=approver` URL param
- When 23-02 runs (time_tracking_config table + settings UI), the approve route will automatically start respecting `lock_after_approval` without any code changes
- 23-04 and subsequent plans can build on this foundation

---
*Phase: 23-time-tracking-advanced*
*Completed: 2026-03-28*
