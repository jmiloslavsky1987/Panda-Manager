---
phase: 27-ui-overhaul-templates
plan: 01
subsystem: testing
tags: [vitest, tdd, wave-0, red-stubs, next-navigation]

# Dependency graph
requires:
  - phase: 26-multi-user-auth
    provides: better-auth session infrastructure and vitest test patterns
provides:
  - Wave 0 RED test stubs for UI-01 (WorkspaceTabs navigation)
  - Wave 0 RED test stubs for UI-03 (TAB_TEMPLATE_REGISTRY completeness)
  - Wave 0 RED test stubs for UI-04 (seedProjectFromRegistry and PATCH integration)
  - Shared next/navigation mock for component tests
affects: [27-02, 27-03, 27-04, 27-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 stub pattern: const target: any = undefined; expect(target).toBeDefined() — fails RED without brittle import errors"
    - "Inline vi.mock() for next/navigation in component tests (not relying on __mocks__ auto-discovery)"

key-files:
  created:
    - tests/__mocks__/next-navigation.ts
    - tests/ui/workspace-tabs.test.tsx
    - tests/ui/tab-registry.test.ts
    - tests/ui/seed-project.test.ts
    - tests/api/projects-patch.test.ts
  modified: []

key-decisions:
  - "Wave 0 stubs use undefined + toBeDefined() pattern to fail RED without import crashes"
  - "next/navigation mock defined inline in each test file (explicit vi.mock() call) for clarity"
  - "seed-project.test.ts and projects-patch.test.ts remain RED until plans 27-04 and 27-05 implement the logic"

patterns-established:
  - "Wave 0 RED stubs: const target: any = undefined; expect(target).toBeDefined() for future features"
  - "Shared mocks in tests/__mocks__/ for reusable test infrastructure"

requirements-completed: [UI-01, UI-03, UI-04]

# Metrics
duration: 3min
completed: 2026-03-31
---

# Phase 27 Plan 01: Wave 0 Test Stubs Summary

**Created RED test stubs for all Phase 27 UI behaviors (WorkspaceTabs, registry, seeding) with shared next/navigation mock — no import errors, all stubs fail as expected**

## Performance

- **Duration:** 3 min 31 sec
- **Started:** 2026-03-31T06:36:32Z
- **Completed:** 2026-03-31T06:40:03Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Established Wave 0 RED test coverage for all Phase 27 features before implementation
- Created reusable next/navigation mock for component tests
- All 18 tests run without import/parse errors (9 later turned GREEN by 27-02/27-03, 9 remain RED for 27-04/27-05)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared next/navigation mock and component test stubs (UI-01, UI-03)** - Previously committed as `a7bb4a9` (tab-registry) and `68722a3` (workspace-tabs) before this execution
2. **Task 2: Create seeding and PATCH integration test stubs (UI-04)** - `45b4850` (test)

**Plan metadata:** (to be committed with this SUMMARY.md)

_Note: Task 1 files were created in earlier manual commits before this automated execution. This execution completed Task 2 and documented the full plan._

## Files Created/Modified
- `tests/__mocks__/next-navigation.ts` - Shared vi.fn() stubs for useSearchParams, useRouter, usePathname, redirect
- `tests/ui/workspace-tabs.test.tsx` - 5 RED stubs for WorkspaceTabs navigation behaviors (UI-01)
- `tests/ui/tab-registry.test.ts` - 4 RED stubs for TAB_TEMPLATE_REGISTRY completeness (UI-03)
- `tests/ui/seed-project.test.ts` - 5 RED stubs for seedProjectFromRegistry logic (UI-04)
- `tests/api/projects-patch.test.ts` - 4 RED stubs for PATCH handler integration with seeding (UI-04)

## Decisions Made

- **Wave 0 stub pattern:** Used `const target: any = undefined; expect(target).toBeDefined()` pattern for all stubs — ensures RED failures without brittle import errors on missing modules
- **Inline mocking:** Each component test file explicitly calls `vi.mock('next/navigation', ...)` rather than relying on __mocks__ directory auto-discovery for clarity
- **Test organization:** Placed component tests in tests/ui/, API tests in tests/api/, shared mocks in tests/__mocks__/

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all test files created successfully and run with expected RED failures.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 0 RED test coverage complete for all Phase 27 behaviors
- Plans 27-02 (tab-template-registry) and 27-03 (WorkspaceTabs refactor) already executed — tests turned GREEN
- Plans 27-04 (seedProjectFromRegistry) and 27-05 (PATCH integration) ready to execute — will turn remaining 9 RED tests GREEN
- No blockers or concerns

## Self-Check: PASSED

All claimed files verified:
- FOUND: tests/__mocks__/next-navigation.ts
- FOUND: tests/ui/workspace-tabs.test.tsx
- FOUND: tests/ui/tab-registry.test.ts
- FOUND: tests/ui/seed-project.test.ts
- FOUND: tests/api/projects-patch.test.ts

All claimed commits verified:
- FOUND: 45b4850 (test(27-01): add Wave 0 RED stubs for UI-04)

---
*Phase: 27-ui-overhaul-templates*
*Completed: 2026-03-31*
