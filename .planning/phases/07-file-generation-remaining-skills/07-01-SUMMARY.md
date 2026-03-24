---
phase: 07-file-generation-remaining-skills
plan: 01
subsystem: testing
tags: [vitest, playwright, tdd, test-stubs, red-baseline]

# Dependency graph
requires:
  - phase: 06-mcp-integrations
    provides: MCP integration patterns + skill-run.ts generic handler + outputs/drafts registration
provides:
  - Wave 0 RED baseline: 6 Playwright E2E stubs for SKILL-05/06/07/08, PLAN-12, PLAN-13
  - 5 vitest unit stub files covering pptx-generator, html-generator, skill-run file extension, ai-plan API, sprint-summary API
  - vitest ^4.1.1 installed in bigpanda-app devDependencies
affects: [07-02, 07-03, 07-04, 07-05, 07-06]

# Tech tracking
tech-stack:
  added: [vitest ^4.1.1]
  patterns: [Wave 0 RED stub pattern (expect(false, 'stub').toBe(true) as first line), requirement IDs in test names for --grep targeting]

key-files:
  created:
    - tests/e2e/phase7.spec.ts
    - bigpanda-app/lib/file-gen/__tests__/pptx-generator.test.ts
    - bigpanda-app/lib/file-gen/__tests__/html-generator.test.ts
    - bigpanda-app/worker/jobs/__tests__/skill-run-file.test.ts
    - bigpanda-app/app/api/__tests__/ai-plan.test.ts
    - bigpanda-app/app/api/__tests__/sprint-summary.test.ts
  modified:
    - bigpanda-app/package.json

key-decisions:
  - "vitest ^4.1.1 installed in bigpanda-app (not at project root) — tests run in bigpanda-app context where dependencies live"
  - "Wave 0 stub pattern: expect(false, 'stub').toBe(true) as FIRST line — keeps tests visibly RED in reporter without server running (consistent with 02-01, 03-01, 04-01, 05.1-01, 05.2-01, 06-01)"
  - "npm install --no-package-lock for vitest — invalid esbuild semver in package-lock.json blocks standard install (established project pattern)"

patterns-established:
  - "Wave 0 RED baseline: all stubs fail with 'stub' message before any implementation; implementation plans turn tests GREEN"
  - "Requirement IDs in test names (SKILL-05, PLAN-12 etc.) — implementation plans use --grep to target specific tests"

requirements-completed: [SKILL-05, SKILL-06, SKILL-07, SKILL-08, PLAN-12, PLAN-13]

# Metrics
duration: 4min
completed: 2026-03-24
---

# Phase 07 Plan 01: Wave 0 RED Baseline Summary

**vitest installed + 17 test stubs (6 Playwright E2E + 11 vitest unit) all failing RED across SKILL-05/06/07/08 and PLAN-12/13**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-24T20:10:24Z
- **Completed:** 2026-03-24T20:14:30Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- vitest ^4.1.1 installed in bigpanda-app as devDependency using --no-package-lock (established esbuild semver workaround)
- tests/e2e/phase7.spec.ts created with 6 Playwright stubs — all 6 failing RED with 'stub' message
- 5 vitest unit stub files created covering pptx-generator (3 stubs), html-generator (2), skill-run file extension (2), ai-plan API (2), sprint-summary API (2) — all 11 failing RED

## Task Commits

Each task was committed atomically:

1. **Task 1: Install vitest + create Playwright E2E stubs** - `f6aad59` (test)
2. **Task 2: Create vitest unit stub files** - `3f63b4c` (test)

## Files Created/Modified

- `tests/e2e/phase7.spec.ts` - 6 Playwright E2E stubs for SKILL-05, SKILL-06, SKILL-07, SKILL-08, PLAN-12, PLAN-13
- `bigpanda-app/lib/file-gen/__tests__/pptx-generator.test.ts` - 3 vitest stubs for PPTX generation (SKILL-05, SKILL-06, fence stripping)
- `bigpanda-app/lib/file-gen/__tests__/html-generator.test.ts` - 2 vitest stubs for HTML generation (SKILL-07, SKILL-08)
- `bigpanda-app/worker/jobs/__tests__/skill-run-file.test.ts` - 2 vitest stubs for skill-run.ts file gen extension
- `bigpanda-app/app/api/__tests__/ai-plan.test.ts` - 2 vitest stubs for PLAN-12 API
- `bigpanda-app/app/api/__tests__/sprint-summary.test.ts` - 2 vitest stubs for PLAN-13 API
- `bigpanda-app/package.json` - vitest ^4.1.1 added to devDependencies

## Decisions Made

- vitest installed in bigpanda-app (not project root) — app-level tests need app-level dependencies
- Used --no-package-lock flag (established project pattern — invalid esbuild semver in package-lock.json blocks standard install since Phase 02-01)
- Wave 0 stub pattern consistent with all prior phases: expect(false, 'stub').toBe(true) as first line

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 0 RED baseline established: all 17 stubs failing visibly
- Plans 07-02 through 07-06 each target specific --grep patterns to turn specific stubs GREEN
- Implementation can begin immediately with 07-02 (SKILL.md files + file-gen stubs)

---
*Phase: 07-file-generation-remaining-skills*
*Completed: 2026-03-24*
