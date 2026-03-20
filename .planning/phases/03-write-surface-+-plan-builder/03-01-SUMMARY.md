---
phase: 03-write-surface-+-plan-builder
plan: 01
subsystem: testing
tags: [playwright, e2e, tdd, wave0, red-baseline]

# Dependency graph
requires:
  - phase: 02-app-shell-read-surface
    provides: Playwright + Chromium installed, playwright.config.ts, phase2.spec.ts pattern

provides:
  - Phase 3 E2E test stub file with 18 failing tests covering all 12 requirements
  - Grep targets for each requirement ID (WORK-02, PLAN-01 through PLAN-11)
  - Wave 0 RED baseline — implementation plans can use --grep to verify individual requirements

affects: [03-02-PLAN.md, 03-03-PLAN.md, 03-04-PLAN.md, 03-05-PLAN.md, 03-06-PLAN.md, 03-07-PLAN.md, 03-08-PLAN.md, 03-09-PLAN.md]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 stub pattern: expect(false, 'stub — implement Phase 3').toBe(true) as FIRST assertion — tests visibly RED not silently skipped"
    - "Requirement ID in test name convention: PLAN-01, WORK-02 etc. for --grep targeting"

key-files:
  created:
    - tests/e2e/phase3.spec.ts
  modified: []

key-decisions:
  - "18 tests organized in 8 describe blocks matching requirement group boundaries"
  - "stub assertion placed as FIRST line in each test to ensure immediate failure before navigation"
  - "Page interactions and selectors aspirational — describe intent for implementation plans, not current state"

patterns-established:
  - "Phase 3 selectors follow Phase 2 data-testid conventions (action-row, action-edit-modal, etc.)"
  - "Bulk operations intercepted via page.on('request') not route.fulfill() — consistent with drag-and-drop approach"

requirements-completed: [WORK-02, PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05, PLAN-06, PLAN-07, PLAN-08, PLAN-09, PLAN-10, PLAN-11]

# Metrics
duration: 2min
completed: 2026-03-20
---

# Phase 3 Plan 01: Write Phase 3 E2E Test Stubs Summary

**18 Playwright E2E test stubs for all 12 Phase 3 requirements (WORK-02, PLAN-01 through PLAN-11) — Wave 0 RED baseline established**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-20T14:04:14Z
- **Completed:** 2026-03-20T14:06:20Z
- **Tasks:** 1/1
- **Files modified:** 1

## Accomplishments

- Created `tests/e2e/phase3.spec.ts` with 18 failing tests in 8 describe blocks
- All 12 requirement IDs (WORK-02, PLAN-01 through PLAN-11) represented with named tests
- RED baseline confirmed: all 18 tests fail with `stub — implement Phase 3` message
- Grep targets available for each requirement (e.g., `--grep "WORK-02"`, `--grep "PLAN-08"`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write Phase 3 E2E test stubs** - `f01362e` (test)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `tests/e2e/phase3.spec.ts` — 18 Playwright E2E stubs for all Phase 3 user-observable behaviors, organized by requirement group

## Decisions Made

- Stub assertion `expect(false, 'stub — implement Phase 3').toBe(true)` placed as FIRST line in each test body — ensures test is visibly RED and fails immediately without requiring server to be running
- Page interactions and selectors are aspirational descriptions of post-implementation behavior, not current state
- Tests for network interception (PATCH /api/actions/*, PATCH /api/tasks-bulk) use `page.on('request')` listener pattern consistent with Phase 2 approach

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 0 RED baseline established for Phase 3
- All subsequent implementation plans (03-02 through 03-09) can reference this spec with `--grep "PLAN-NN"` in their verify commands
- Tests will flip GREEN one-by-one as implementation plans complete

---
*Phase: 03-write-surface-+-plan-builder*
*Completed: 2026-03-20*
