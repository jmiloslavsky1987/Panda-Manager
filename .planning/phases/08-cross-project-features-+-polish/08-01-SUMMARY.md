---
phase: 08-cross-project-features-+-polish
plan: 01
subsystem: testing
tags: [playwright, e2e, wave-0, stubs, search, knowledge-base]

# Dependency graph
requires:
  - phase: 07-file-generation-remaining-skills
    provides: Completed Phase 7 — all prior E2E patterns established
provides:
  - RED baseline Playwright E2E stubs for SRCH-01/02/03 and KB-01/02/03
  - tests/e2e/phase8.spec.ts with 6 intentionally-failing Wave 0 stub tests
affects:
  - 08-02-PLAN through 08-07-PLAN (activation plans that will remove stub assertions)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 stub pattern: expect(false, 'stub').toBe(true) as first line — tests visibly RED without server running"
    - "Requirement IDs in test names ([SRCH-01]) for --grep targeting in activation plans"
    - "Commented-out activation assertions describe full intended behavior for implementation plans"

key-files:
  created:
    - tests/e2e/phase8.spec.ts
  modified: []

key-decisions:
  - "Wave 0 stub assertion placed as FIRST line in each test — visibly RED without server running (consistent with 02-01, 03-01, 04-01, 05.1-01, 06-01, 07-01)"
  - "Requirement IDs (SRCH-01/02/03, KB-01/02/03) in test names for --grep targeting in implementation plans"

patterns-established:
  - "Phase 8 stub pattern: same expect(false, 'stub').toBe(true) first-line pattern used since Phase 2"

requirements-completed: [SRCH-01, SRCH-02, SRCH-03, KB-01, KB-02, KB-03]

# Metrics
duration: 10min
completed: 2026-03-25
---

# Phase 08 Plan 01: Cross-Project Features + Polish — Wave 0 RED Baseline Summary

**6 failing Playwright E2E stub tests covering global search (SRCH-01/02/03) and knowledge base (KB-01/02/03) with commented activation specs for implementation plans 08-02 through 08-07.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-25T02:05:54Z
- **Completed:** 2026-03-25T02:15:36Z
- **Tasks:** 1/1
- **Files modified:** 1

## Accomplishments

- Created tests/e2e/phase8.spec.ts with 6 Wave 0 stub tests
- All 6 tests fail at `expect(false, 'stub').toBe(true)` — verified by Playwright run (0 passed, 6 failed)
- Commented-out activation assertions describe full intended behavior for each requirement, serving as spec for implementation plans

## Task Commits

Each task was committed atomically:

1. **Task 1: Write Phase 8 E2E stubs (Wave 0 RED baseline)** - `3647b80` (test)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `tests/e2e/phase8.spec.ts` - 6 failing Wave 0 stub tests for SRCH-01/02/03 and KB-01/02/03

## Decisions Made

- Wave 0 stub assertion placed as FIRST line in each test body — consistent with all prior phases (02-01 through 07-01); keeps tests visibly RED without requiring a running server.
- Requirement IDs embedded in test names using `[SRCH-01]` bracket pattern — enables `--grep "SRCH-01"` targeting in activation plans.
- Commented-out assertions (not `test.fixme()` or `.skip()`) — provides activation spec inline, consistent with established project pattern.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 8 Wave 0 baseline established — all 6 requirement stubs are RED and committed
- Implementation plans 08-02 through 08-07 can now activate individual stubs via `--grep` targeting
- Global search route (`/search`) and knowledge base route (`/knowledge-base`) are the primary new surfaces to build

## Self-Check: PASSED

- FOUND: tests/e2e/phase8.spec.ts
- FOUND: .planning/phases/08-cross-project-features-+-polish/08-01-SUMMARY.md
- FOUND: commit 3647b80

---
*Phase: 08-cross-project-features-+-polish*
*Completed: 2026-03-25*
