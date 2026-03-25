---
phase: 09-mcp-injection-fix
plan: "01"
subsystem: testing
tags: [vitest, mcp, bullmq, skill-orchestrator, tdd]

# Dependency graph
requires:
  - phase: 06-mcp-integrations
    provides: MCPClientPool singleton and getServersForSkill API
  - phase: 07-file-generation-remaining-skills
    provides: skill-run.ts FILE_SKILLS pattern and vitest test structure
provides:
  - "Failing RED unit tests for MCPClientPool injection in all 4 skill job handlers"
  - "Vitest test scaffold in bigpanda-app/worker/jobs/__tests__/mcp-injection.test.ts"
affects: [09-02-mcp-injection-handlers-fix]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.mock with .returning() support in db insert chain for handlers that use .returning()"
    - "vi.resetModules() + beforeEach for clean dynamic imports per test"
    - "getMockOrchestratorRun() helper to access SkillOrchestrator mock instance's run spy"

key-files:
  created:
    - bigpanda-app/worker/jobs/__tests__/mcp-injection.test.ts
  modified: []

key-decisions:
  - "db mock insert chain includes both .returning() and .onConflictDoNothing() — scheduled handlers use .returning() while outputs inserts use .onConflictDoNothing()"
  - "vi.resetModules() in beforeEach ensures each test gets a fresh handler import that picks up the cleared mock state"

patterns-established:
  - "TDD RED: all 5 tests fail with 'expected getServersForSkill to be called with N calls: 0' — correct assertion-level RED, not import/parse errors"

requirements-completed:
  - SKILL-01
  - SKILL-03
  - SKILL-04
  - SKILL-11
  - SKILL-12

# Metrics
duration: 2min
completed: 2026-03-24
---

# Phase 9 Plan 01: MCP Injection Test Scaffold Summary

**Vitest RED test scaffold for MCPClientPool injection gap across 4 skill job handlers — 5 tests fail because handlers never call getServersForSkill**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-24T21:37:02Z
- **Completed:** 2026-03-24T21:39:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `bigpanda-app/worker/jobs/__tests__/mcp-injection.test.ts` with 5 unit tests covering all 4 affected handlers
- All 5 tests are RED with proper assertion errors (`getServersForSkill called 0 times`) — not import/parse errors
- Mock structure follows established `skill-run-file.test.ts` pattern with `vi.resetModules()` + dynamic imports
- Non-MCP regression test (handoff-doc-generator) included — will pass after Plan 02 without special code paths

## Task Commits

1. **Task 1: TDD RED — MCP injection test scaffold** - `06e68b8` (test)

**Plan metadata:** (to be added in final commit)

## Files Created/Modified

- `bigpanda-app/worker/jobs/__tests__/mcp-injection.test.ts` - 5 failing unit tests for MCPClientPool injection in morning-briefing, context-updater, weekly-customer-status, skill-run handlers

## Decisions Made

- db mock insert chain extended with `.returning()` support — morning-briefing, context-updater, and weekly-customer-status all call `db.insert().values().returning()` to get the new skill_run row ID; the initial mock only had `onConflictDoNothing()` which caused TypeError before reaching the MCPClientPool assertion
- `vi.resetModules()` in `beforeEach` ensures each test dynamically imports a fresh module, preventing stale module cache from causing false positives across tests

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] db mock insert chain missing .returning() method**
- **Found during:** Task 1 (initial test run)
- **Issue:** First run showed `TypeError: default.insert(...).values(...).returning is not a function` for tests 1-3 (morning-briefing, context-updater, weekly-customer-status). The handlers call `.returning()` to get the inserted skill_run row ID, but the mock only provided `.onConflictDoNothing()`.
- **Fix:** Extended the `insert` mock to return an object with both `.returning(vi.fn().mockResolvedValue([{ id: 1 }]))` and `.onConflictDoNothing(vi.fn().mockResolvedValue([]))` methods.
- **Files modified:** `bigpanda-app/worker/jobs/__tests__/mcp-injection.test.ts`
- **Verification:** Re-run confirmed all 5 tests fail with correct assertion errors (not TypeError)
- **Committed in:** 06e68b8 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in mock structure)
**Impact on plan:** Necessary to reach the correct RED assertion state. No scope creep.

## Issues Encountered

None beyond the auto-fixed db mock issue above.

## Next Phase Readiness

- RED baseline established — Plan 02 will add `MCPClientPool.getInstance().getServersForSkill()` calls to all 4 handlers and these tests will turn GREEN
- Mock pattern is complete and correct — Plan 02 needs no changes to test file, only to production handler files

## Self-Check: PASSED

- FOUND: `bigpanda-app/worker/jobs/__tests__/mcp-injection.test.ts`
- FOUND: `.planning/phases/09-mcp-injection-fix/09-01-SUMMARY.md`
- FOUND: commit `06e68b8`

---
*Phase: 09-mcp-injection-fix*
*Completed: 2026-03-24*
