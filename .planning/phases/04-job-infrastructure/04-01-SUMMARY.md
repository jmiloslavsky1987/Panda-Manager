---
phase: 04-job-infrastructure
plan: 01
subsystem: testing
tags: [playwright, e2e, tdd, bullmq, scheduled-jobs]

# Dependency graph
requires:
  - phase: 03-write-surface-+-plan-builder
    provides: Playwright test infrastructure and RED-stub pattern established in 03-01
provides:
  - Phase 4 E2E acceptance criteria as 8 RED Playwright stubs (SCHED-01..08)
affects: [04-02, 04-03, 04-04, 04-05, 04-06, 04-07, 04-08, 04-09]

# Tech tracking
tech-stack:
  added: []
  patterns: [Wave-0 RED stub pattern — expect(false, 'stub').toBe(true) as first assertion in each test]

key-files:
  created:
    - tests/e2e/phase4.spec.ts
  modified: []

key-decisions:
  - "Wave-0 stub assertion placed as FIRST line in each test — visibly RED without server running (same pattern as 02-01, 03-01)"
  - "Requirement IDs in test names (SCHED-01..08) — implementation plans use --grep to target specific tests"

patterns-established:
  - "RED stub pattern: expect(false, 'stub').toBe(true) on first line prevents any accidental green"
  - "Single describe block for Phase 4 — mirrors phase2.spec.ts and phase3.spec.ts structure"

requirements-completed: [SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05, SCHED-06, SCHED-07, SCHED-08]

# Metrics
duration: 5min
completed: 2026-03-20
---

# Phase 4 Plan 01: Job Infrastructure E2E Stubs Summary

**8 RED Playwright stub tests covering BullMQ worker startup, all 6 scheduler registrations (action-sync, health-refresh, context-updater, gantt-snapshot, weekly-briefing, risk-monitor), and the /settings Jobs tab UI — providing acceptance criteria for all Phase 4 work**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-20T16:00:00Z
- **Completed:** 2026-03-20T16:01:43Z
- **Tasks:** 1/1
- **Files modified:** 1

## Accomplishments
- Created tests/e2e/phase4.spec.ts with 8 stub tests matching SCHED-01 through SCHED-08
- All 8 tests confirmed RED via `npx playwright test --reporter=list` (8 failed, 0 passed)
- `--grep "SCHED-08"` returns exactly 1 test (verified)
- Each stub's `goto('/settings')` call documents the target URL for implementation

## Task Commits

Each task was committed atomically:

1. **Task 1: Write Phase 4 E2E test stubs** - `41275e7` (test)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `tests/e2e/phase4.spec.ts` - 8 RED E2E stubs for Phase 4 SCHED requirements

## Decisions Made
- Wave-0 stub pattern (`expect(false, 'stub').toBe(true)` as first line) maintained — same as 02-01 and 03-01 for consistency
- All 8 tests placed in a single `test.describe('Phase 4 — Job Infrastructure', ...)` block — mirrors prior phase structure

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 4 RED baseline established — implementation plans 04-02+ can use `--grep "SCHED-XX"` to target specific tests
- All 6 job names confirmed in stubs: action-sync, health-refresh, context-updater, gantt-snapshot, weekly-briefing, risk-monitor
- /settings route targeted in all tests — implementation must create this route

---
*Phase: 04-job-infrastructure*
*Completed: 2026-03-20*
