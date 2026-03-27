---
phase: 21-teams-tab-+-architecture-tab
plan: "00"
subsystem: testing
tags: [vitest, teams-tab, architecture-tab, tdd, test-stubs, wave-0]

# Dependency graph
requires:
  - phase: 17-schema-extensions
    provides: business_outcomes, e2e_workflows, focus_areas, architecture_integrations, before_state, team_onboarding_status tables
provides:
  - 13 Vitest stub files in bigpanda-app/tests/teams-arch/ covering all Phase 21 requirements
  - Wave 0 test harness enabling all subsequent Phase 21 waves to proceed with TDD
affects:
  - 21-01 (Teams DB queries)
  - 21-02 (Architecture DB queries)
  - 21-03 (Teams UI components)
  - 21-04 (Architecture UI components)
  - 21-05 (Skill context builders)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 stub pattern: it.todo() stubs with commented-out imports allow TypeScript errors to surface post-implementation"
    - "Test directory structure: bigpanda-app/tests/teams-arch/ mirrors component/lib split"

key-files:
  created:
    - bigpanda-app/tests/teams-arch/business-outcomes.test.ts
    - bigpanda-app/tests/teams-arch/e2e-workflows.test.ts
    - bigpanda-app/tests/teams-arch/teams-sections.test.ts
    - bigpanda-app/tests/teams-arch/warning-banner.test.ts
    - bigpanda-app/tests/teams-arch/team-order.test.ts
    - bigpanda-app/tests/teams-arch/skill-context-teams.test.ts
    - bigpanda-app/tests/teams-arch/design-tokens.test.ts
    - bigpanda-app/tests/teams-arch/arch-tabs.test.ts
    - bigpanda-app/tests/teams-arch/pain-points.test.ts
    - bigpanda-app/tests/teams-arch/status-pills.test.ts
    - bigpanda-app/tests/teams-arch/skill-context-arch.test.ts
    - bigpanda-app/tests/teams-arch/customer-rules.test.ts
    - bigpanda-app/tests/teams-arch/skill-html-export.test.ts
  modified:
    - .planning/phases/21-teams-tab-+-architecture-tab/21-VALIDATION.md

key-decisions:
  - "Wave 0 stubs use it.todo() so suite is green immediately — tests turn red as Wave 1+ implementations are written"
  - "Import lines commented out so TypeScript errors surface only after implementation modules exist"

patterns-established:
  - "Stub pattern: import line commented with plan reference, it.todo() for each behavior — makes Wave 0 pass green instantly"

requirements-completed:
  - TEAMS-01
  - TEAMS-02
  - TEAMS-04
  - TEAMS-07
  - TEAMS-09
  - TEAMS-10
  - TEAMS-11
  - ARCH-01
  - ARCH-03
  - ARCH-08
  - ARCH-10
  - ARCH-11
  - ARCH-12

# Metrics
duration: 5min
completed: 2026-03-27
---

# Phase 21 Plan 00: Wave 0 Test Stubs Summary

**13 Vitest todo-stub files written in bigpanda-app/tests/teams-arch/ covering all Teams and Architecture tab requirements, with 67 todo tests passing green immediately**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-27T04:20:27Z
- **Completed:** 2026-03-27T04:25:00Z
- **Tasks:** 2
- **Files modified:** 14 (13 new test stubs + 1 VALIDATION.md update)

## Accomplishments

- Created bigpanda-app/tests/teams-arch/ directory and wrote all 13 Wave 0 stub files
- All 67 todo tests pass green with zero failures (`npx vitest run tests/teams-arch/` exits 0)
- Updated 21-VALIDATION.md: `wave_0_complete: true` and all 13 Wave 0 checklist items marked complete

## Task Commits

Each task was committed atomically:

1. **Task 1: 7 Teams-side stubs** - `30b363e` (test)
2. **Task 2: 6 Architecture-side stubs** - `b6b55be` (test)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `bigpanda-app/tests/teams-arch/business-outcomes.test.ts` - TEAMS-02 API shape stubs
- `bigpanda-app/tests/teams-arch/e2e-workflows.test.ts` - TEAMS-04 nested query stubs
- `bigpanda-app/tests/teams-arch/teams-sections.test.ts` - TEAMS-01 5-section rendering stubs
- `bigpanda-app/tests/teams-arch/warning-banner.test.ts` - TEAMS-07 empty section banner stubs
- `bigpanda-app/tests/teams-arch/team-order.test.ts` - TEAMS-09 AMEX canonical ordering stubs
- `bigpanda-app/tests/teams-arch/skill-context-teams.test.ts` - TEAMS-10 context extension stubs
- `bigpanda-app/tests/teams-arch/design-tokens.test.ts` - TEAMS-11 design token stubs
- `bigpanda-app/tests/teams-arch/arch-tabs.test.ts` - ARCH-01 two-tab structure stubs
- `bigpanda-app/tests/teams-arch/pain-points.test.ts` - ARCH-03 JSONB pain points stubs
- `bigpanda-app/tests/teams-arch/status-pills.test.ts` - ARCH-08 status pill color map stubs
- `bigpanda-app/tests/teams-arch/skill-context-arch.test.ts` - ARCH-10 arch context extension stubs
- `bigpanda-app/tests/teams-arch/customer-rules.test.ts` - ARCH-11 customer-specific rules stubs
- `bigpanda-app/tests/teams-arch/skill-html-export.test.ts` - ARCH-12 self-contained HTML export stubs
- `.planning/phases/21-teams-tab-+-architecture-tab/21-VALIDATION.md` - wave_0_complete set to true, all 13 checklist items checked

## Decisions Made

- Wave 0 stubs use `it.todo()` pattern so the suite is immediately green — stubs turn red as Wave 1+ implementations are written and specifications filled in
- Import lines are commented out (with plan reference comments) so TypeScript errors only surface once implementation modules exist

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 0 complete: all 13 test stubs exist and pass green
- Phase 21 Plan 01 (Teams DB queries) can proceed immediately
- Phase 21 Plan 02 (Architecture DB queries) can proceed in parallel
- VALIDATION.md `nyquist_compliant` remains `false` — will be set true once Wave 1 tests are implemented (Plans 01-04)

---
*Phase: 21-teams-tab-+-architecture-tab*
*Completed: 2026-03-27*
