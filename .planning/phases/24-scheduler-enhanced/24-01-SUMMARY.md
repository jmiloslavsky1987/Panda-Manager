---
phase: 24-scheduler-enhanced
plan: 01
subsystem: testing
tags: [vitest, tdd, scheduler, bullmq, wave-0]

# Dependency graph
requires: []
provides:
  - 8 failing test stubs in bigpanda-app/tests/scheduler/ for Wave 0 TDD compliance
  - Unit test coverage contracts for SCHED-01 through SCHED-12
  - Automated verify commands for all subsequent Wave 1/2 implementation plans
affects: [24-02, 24-03, 24-04, 24-05, 24-06, 24-07, 24-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 TDD scaffold: import-error RED state for not-yet-implemented modules"
    - "vi.mock for DB and BullMQ to keep unit tests free of real I/O"

key-files:
  created:
    - bigpanda-app/tests/scheduler/jobs-crud.test.ts
    - bigpanda-app/tests/scheduler/frequency-to-cron.test.ts
    - bigpanda-app/tests/scheduler/trigger.test.ts
    - bigpanda-app/tests/scheduler/notifications.test.ts
    - bigpanda-app/tests/scheduler/run-history.test.ts
    - bigpanda-app/tests/scheduler/sidebar.test.ts
    - bigpanda-app/tests/scheduler/wizard-step.test.ts
    - bigpanda-app/tests/scheduler/skill-list.test.ts
  modified: []

key-decisions:
  - "appendRunHistoryEntry and insertSchedulerFailureNotification co-located in lib/scheduler-notifications (single concern module)"
  - "SKILL_LIST, SKILLS_WITH_PARAMS, getWizardSteps, and SIDEBAR_NAV_ITEMS all exported from lib/scheduler-skills"
  - "sidebar.test.ts tests SIDEBAR_NAV_ITEMS constant (not full RSC render) since vitest runs in node env — avoids jsdom environment toggle"

patterns-established:
  - "Wave 0 pattern: tests import from not-yet-existing paths, fail with ERR_MODULE_NOT_FOUND (valid RED)"
  - "vi.mock('server-only') stub required for any test that transitively imports a server module"

requirements-completed: [SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05, SCHED-06, SCHED-07, SCHED-08, SCHED-09, SCHED-10, SCHED-11, SCHED-12]

# Metrics
duration: 12min
completed: 2026-03-30
---

# Phase 24 Plan 01: Scheduler Test Scaffold Summary

**8 Vitest stub files in tests/scheduler/ covering all 12 SCHED requirements — all in RED state (import errors + one assertion failure), suite runs in 400ms with no panics**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-30T18:39:18Z
- **Completed:** 2026-03-30T18:51:00Z
- **Tasks:** 1
- **Files modified:** 8 (all created)

## Accomplishments
- Created `tests/scheduler/` directory with 8 stub test files
- All files import from paths where implementation will be created (not yet existing)
- Vitest runs all 8 files in ~400ms; exits with failures (8 failed suites, no panics)
- Covers: jobs CRUD API, frequencyToCron utility, manual trigger, failure notifications, run history, sidebar nav, wizard steps, and skill list

## Task Commits

Each task was committed atomically:

1. **Task 1: Create scheduler test scaffold (8 files)** - `46e852f` (test)

**Plan metadata:** (to be added)

## Files Created/Modified
- `bigpanda-app/tests/scheduler/jobs-crud.test.ts` - Stubs for SCHED-01,03,04,05,07 — POST/PATCH/GET /api/jobs handler tests
- `bigpanda-app/tests/scheduler/frequency-to-cron.test.ts` - Stubs for SCHED-02 — frequencyToCron utility (daily/weekly/monthly/custom/once/biweekly)
- `bigpanda-app/tests/scheduler/trigger.test.ts` - Stubs for SCHED-06 — POST /api/jobs/trigger manual enqueue
- `bigpanda-app/tests/scheduler/notifications.test.ts` - Stubs for SCHED-08 — insertSchedulerFailureNotification with truncation
- `bigpanda-app/tests/scheduler/run-history.test.ts` - Stubs for SCHED-09 — appendRunHistoryEntry with 10-entry cap
- `bigpanda-app/tests/scheduler/sidebar.test.ts` - Stubs for SCHED-10 — SIDEBAR_NAV_ITEMS includes /scheduler with testId
- `bigpanda-app/tests/scheduler/wizard-step.test.ts` - Stubs for SCHED-11 — getWizardSteps and SKILLS_WITH_PARAMS
- `bigpanda-app/tests/scheduler/skill-list.test.ts` - Stubs for SCHED-12 — SKILL_LIST 12 entries with id/label/description/hasParams

## Decisions Made
- sidebar.test.ts tests `SIDEBAR_NAV_ITEMS` exported constant rather than full RSC render, avoiding jsdom env complexity in node-mode vitest. The testId assertion (`'sidebar-scheduler-link'`) is preserved — implementation must export the testId on the nav item.
- `appendRunHistoryEntry` co-located in `lib/scheduler-notifications` alongside `insertSchedulerFailureNotification` (both relate to job run outcomes).
- All scheduler domain exports (`SKILL_LIST`, `SKILLS_WITH_PARAMS`, `getWizardSteps`, `SIDEBAR_NAV_ITEMS`) consolidated in `lib/scheduler-skills`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- trigger.test.ts discovered that `app/api/jobs/trigger/route.ts` already exists from a prior phase. The "unknown skillName" test passes (returns 400) but the "enqueues and returns 200" test fails on assertion (returns 400 instead of 200). Both are valid RED — existing route needs update in Wave 1.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 8 Wave 0 test files exist and are importable by Vitest
- Wave 1 implementation plans (24-02 through 24-08) now have automated verify commands pointing to these files
- trigger.test.ts reveals existing /api/jobs/trigger route needs enhancement (currently returns 400 for valid known skills)

## Self-Check: PASSED

All 8 test files found on disk. Commit 46e852f verified in git log.

---
*Phase: 24-scheduler-enhanced*
*Completed: 2026-03-30*
