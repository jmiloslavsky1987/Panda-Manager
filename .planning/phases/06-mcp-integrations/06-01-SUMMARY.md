---
phase: 06-mcp-integrations
plan: 01
subsystem: testing
tags: [playwright, node:test, e2e, tdd, mcp, stubs]

# Dependency graph
requires:
  - phase: 05.2-time-tracking
    provides: completed Wave 0 stub pattern established across all prior phases
provides:
  - "Wave 0 RED baseline for all Phase 6 requirements (DASH-04, DASH-05, SKILL-10, MCP Settings)"
  - "E2E stubs in tests/e2e/phase6.spec.ts — 4 failing tests with --grep targeting"
  - "Unit test stubs in tests/mcp-config.test.ts and tests/orchestrator-mcp.test.ts — 4 failing tests"
affects: [06-mcp-integrations, 06-02, 06-03, 06-04, 06-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 stub: expect(false, 'stub').toBe(true) as first line — visibly RED without server running"
    - "Requirement IDs in test names for --grep targeting in implementation plans"
    - "node:test assert.fail('stub: not yet implemented') for unit test RED stubs"

key-files:
  created:
    - tests/e2e/phase6.spec.ts
    - tests/mcp-config.test.ts
    - tests/orchestrator-mcp.test.ts
  modified: []

key-decisions:
  - "Wave 0 stub pattern consistent with 02-01, 03-01, 04-01, 05.1-01, 05.2-01 — expect(false, 'stub').toBe(true) first line"
  - "Unit stubs use assert.fail() from node:test — no Jest/Vitest dependency needed"
  - "Plans 06-03 and 06-05 activate unit stubs by removing assert.fail() lines"

patterns-established:
  - "Phase 6 E2E --grep targeting: npx playwright test tests/e2e/phase6.spec.ts --grep 'DASH-04'"
  - "Unit test activation: remove assert.fail line and implement real test body in plan 06-03/06-05"

requirements-completed: [SKILL-10, DASH-04, DASH-05]

# Metrics
duration: 5min
completed: 2026-03-24
---

# Phase 6 Plan 01: MCP Integrations Wave 0 RED Stubs Summary

**Wave 0 RED baseline established: 4 Playwright E2E stubs (DASH-04, DASH-05, SKILL-10, MCP Settings) + 4 node:test unit stubs (MCPClientPool + SkillOrchestrator MCP branch) all failing immediately**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-24T18:01:29Z
- **Completed:** 2026-03-24T18:06:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- 4 Playwright E2E stubs in tests/e2e/phase6.spec.ts — each contains requirement ID for `--grep` targeting, all confirmed RED
- 2 node:test unit stubs in tests/mcp-config.test.ts for MCPClientPool.getServersForSkill() — RED targets for Plan 06-03
- 2 node:test unit stubs in tests/orchestrator-mcp.test.ts for SkillOrchestrator MCP branch — RED targets for Plan 06-05

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Phase 6 E2E stub file** - `b6d5508` (test)
2. **Task 2: Create unit test stubs for MCPClientPool and SkillOrchestrator MCP branch** - `5b56148` (test)

## Files Created/Modified

- `tests/e2e/phase6.spec.ts` - 4 Wave 0 RED stubs: DASH-04, DASH-05, SKILL-10, MCP Settings UI
- `tests/mcp-config.test.ts` - 2 RED stubs for MCPClientPool (Plan 06-03 activation target)
- `tests/orchestrator-mcp.test.ts` - 2 RED stubs for SkillOrchestrator MCP branch (Plan 06-05 activation target)

## Decisions Made

- Wave 0 stub pattern consistent with all prior phases (02-01, 03-01, 04-01, 05.1-01, 05.2-01): `expect(false, 'stub').toBe(true)` as first line — visibly RED without server running
- Unit test stubs use `assert.fail()` from `node:test` built-in — no external test framework needed, consistent with Phase 01 decision
- Implementation plans (06-03, 06-05) activate stubs by removing the `assert.fail()` line and adding real test bodies

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- RED baseline complete for all Phase 6 requirements
- Plans 06-02+ can now target specific stubs via `--grep "DASH-04"` etc.
- Unit stubs at tests/mcp-config.test.ts (06-03) and tests/orchestrator-mcp.test.ts (06-05) are activation targets

---
*Phase: 06-mcp-integrations*
*Completed: 2026-03-24*
