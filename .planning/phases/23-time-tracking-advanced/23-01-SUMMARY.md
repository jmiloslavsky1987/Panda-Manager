---
phase: 23-time-tracking-advanced
plan: "01"
subsystem: testing
tags: [vitest, tdd, time-tracking, approval-workflow, state-machine]

# Dependency graph
requires:
  - phase: 17-schema-extensions
    provides: time_entries table with submitted_on/approved_on/rejected_on/locked fields (SCHEMA-03)
provides:
  - TDD RED test scaffold for approval state machine (getEntryStatus, canEdit, canSubmit)
  - TDD RED test scaffold for entry locking guard (isLocked, canOverrideLock, buildLockPayload, buildUnlockPayload)
  - TDD RED test scaffold for grouping and subtotals (groupEntries by project/team_member/status/date, computeSubtotals)
affects:
  - 23-time-tracking-advanced Wave 1 plans (implement against these contracts)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED first: test files import from non-existent module, fail with Cannot find module"
    - "makeEntry factory function pattern for minimal TimeEntry fixture construction"
    - "Requirement ID tagging in test names (TTADV-07-1, TTADV-10-3, etc.)"

key-files:
  created:
    - bigpanda-app/__tests__/time-tracking-advanced/approval-state.test.ts
    - bigpanda-app/__tests__/time-tracking-advanced/entry-locking.test.ts
    - bigpanda-app/__tests__/time-tracking-advanced/grouping.test.ts
  modified: []

key-decisions:
  - "Test directory is __tests__/time-tracking-advanced/ (plan-specified) — vitest scans all *.test.ts by default"
  - "Grouping scope limited to 4 schema-supported dimensions (project, team_member/submitted_by, status, date) — role/phase/task grouping requires schema extension not in Phase 23 scope"
  - "Locking is explicit (locked=true flag), NOT automatic on approval — test TTADV-15-2 documents this distinction"

patterns-established:
  - "Import from @/lib/time-tracking (module created in Wave 1) — single source of truth for all approval/locking/grouping helpers"

requirements-completed:
  - TTADV-07
  - TTADV-08
  - TTADV-10
  - TTADV-15
  - TTADV-17

# Metrics
duration: 12min
completed: 2026-03-27
---

# Phase 23 Plan 01: Time Tracking Advanced Summary

**Failing TDD RED tests for approval state machine, entry lock guard, and grouping/subtotals — defining exact function signatures for Wave 1 implementation against @/lib/time-tracking**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-28T02:05:35Z
- **Completed:** 2026-03-28T02:17:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Created 16 approval-state tests covering all transitions: draft, submitted, approved, rejected, locked (with locked as highest priority)
- Created 10 entry-locking tests defining explicit lock semantics, role-based override (admin/approver/user), and lock/unlock payload shapes
- Created 15 grouping tests covering 4 schema-supported dimensions plus 7 subtotal edge cases including billable/non-billable [non-billable] tag parsing

## Task Commits

Each task was committed atomically:

1. **Task 1: TDD RED — Approval state machine tests** - `dc76780` (test)
2. **Task 2: TDD RED — Entry locking guard tests** - `f3b4e1f` (test)
3. **Task 3: TDD RED — Grouping and subtotal logic tests** - `227fc27` (test)

## Files Created/Modified

- `bigpanda-app/__tests__/time-tracking-advanced/approval-state.test.ts` - 16 tests for getEntryStatus, canEdit, canSubmit
- `bigpanda-app/__tests__/time-tracking-advanced/entry-locking.test.ts` - 10 tests for isLocked, canOverrideLock, buildLockPayload, buildUnlockPayload
- `bigpanda-app/__tests__/time-tracking-advanced/grouping.test.ts` - 15 tests for groupEntries (4 dimensions) and computeSubtotals

## Decisions Made

- Test directory `__tests__/time-tracking-advanced/` used as plan-specified (vitest default testMatch picks it up without config changes)
- Grouping by role/phase/task deferred: current time_entries schema has no role, phase, or task per-entry fields; only 4 dimensions (project, team_member via submitted_by, status, date) are implementable in Phase 23
- Locking is explicitly flag-driven: approved_on being set does NOT automatically set locked=true — this distinction is captured in test TTADV-15-2

## Deviations from Plan

None — plan executed exactly as written. All three test files fail RED with "Cannot find package '@/lib/time-tracking'" as required.

## Issues Encountered

None. All tests fail RED cleanly on import.

## Known Gaps (Documented per plan)

TTADV-17 lists grouping by role, phase, and task. These require schema extensions (per-entry fields) not present in the Phase 17 SCHEMA-03 approval schema. Grouping by these dimensions is out of scope for Phase 23 and should be addressed in a future schema extension phase.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All three test contracts define exact function signatures Wave 1 plans must implement in `@/lib/time-tracking`
- Wave 1 plans (23-02 through 23-05 or similar) should implement against these test files — GREEN phase
- No blockers

---
*Phase: 23-time-tracking-advanced*
*Completed: 2026-03-27*
