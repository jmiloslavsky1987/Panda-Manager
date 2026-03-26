---
phase: 15-scheduler-ui-fixes
plan: 01
subsystem: testing
tags: [vitest, tdd, scheduler, search, bullmq, fts]

# Dependency graph
requires:
  - phase: 15-scheduler-ui-fixes
    provides: RESEARCH.md documenting JOB_SCHEDULE_MAP phantom entries and missing TYPE_OPTIONS values
provides:
  - Failing Vitest test for JOB_SCHEDULE_MAP: verifies morning-briefing + weekly-customer-status present, action-sync + weekly-briefing absent
  - Failing Vitest test for TYPE_OPTIONS: verifies 13 total entries including onboarding_steps, onboarding_phases, integrations, time_entries
affects:
  - 15-02 (implementation plan — these RED tests become GREEN targets)

# Tech tracking
tech-stack:
  added: []
  patterns: [TDD RED scaffold — write failing tests before touching source, import-fails-as-test-failure pattern for unexported symbols]

key-files:
  created:
    - bigpanda-app/tests/scheduler-map.test.ts
    - bigpanda-app/tests/search-type-options.test.ts
  modified: []

key-decisions:
  - "Test imports of unexported symbols produce TypeError at test body, not import-time failure — Vitest treats it as test failure (RED), which is the intended state"
  - "scheduler-map.test.ts has 6 tests: 2 include-key, 2 exclude-key, 2 value assertions"
  - "search-type-options.test.ts has 5 tests: 4 value assertions + 1 length assertion (13 total)"

patterns-established:
  - "Wave 0 TDD RED: create tests importing currently-unexported or wrong-value symbols; let failures drive Wave 1 implementation"

requirements-completed: [SCHED-01, SRCH-02]

# Metrics
duration: 5min
completed: 2026-03-26
---

# Phase 15 Plan 01: Scheduler Map + Search Type-Options RED Tests Summary

**Two Vitest RED scaffolds that define acceptance criteria for scheduler key rename and TYPE_OPTIONS expansion — 6 scheduler tests and 5 search tests all fail against current source**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-26T00:26:56Z
- **Completed:** 2026-03-26T00:32:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `scheduler-map.test.ts` with 6 tests; 6/6 fail (RED) — JOB_SCHEDULE_MAP not exported and has wrong keys
- Created `search-type-options.test.ts` with 5 tests; 5/5 fail (RED) — TYPE_OPTIONS not exported and missing 4 FTS table entries
- Pre-existing `skill-run-settings.test.ts` remains 2/2 GREEN — no regressions introduced

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing scheduler map test** - `36f2fac` (test)
2. **Task 2: Write failing search type-options test** - `ad218d1` (test)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `bigpanda-app/tests/scheduler-map.test.ts` - 6 Vitest tests for JOB_SCHEDULE_MAP key correctness; RED against current scheduler.ts
- `bigpanda-app/tests/search-type-options.test.ts` - 5 Vitest tests for TYPE_OPTIONS completeness; RED against current search/page.tsx

## Decisions Made
- Confirmed JOB_SCHEDULE_MAP is not currently exported from `worker/scheduler.ts` — import yields `undefined`, tests fail via TypeError. Plan 02 will add the `export` keyword.
- Confirmed TYPE_OPTIONS is not currently exported from `app/search/page.tsx` — same pattern. Plan 02 adds the named export and 4 missing entries.
- Used `TypeError: Cannot read properties of undefined (reading 'map')` failures as valid RED state — syntactically valid tests, semantically failing due to unexported symbols.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — both test files ran immediately under existing Vitest config (`vitest.config.ts` with `environment: 'node'`).

## Next Phase Readiness
- Both RED test files are in place at `bigpanda-app/tests/`
- Plan 02 verify commands (`npx vitest run tests/scheduler-map.test.ts` and `npx vitest run tests/search-type-options.test.ts`) will now point to real, previously-failing files
- Plan 02 must: export JOB_SCHEDULE_MAP with corrected keys; export TYPE_OPTIONS with 4 additional entries

## Self-Check: PASSED
- scheduler-map.test.ts: FOUND
- search-type-options.test.ts: FOUND
- 15-01-SUMMARY.md: FOUND
- Commit 36f2fac: FOUND
- Commit ad218d1: FOUND

---
*Phase: 15-scheduler-ui-fixes*
*Completed: 2026-03-26*
