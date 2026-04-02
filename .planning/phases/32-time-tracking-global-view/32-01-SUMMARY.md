---
phase: 32-time-tracking-global-view
plan: "01"
subsystem: time-tracking
tags: [wave-0, test-scaffolding, tdd-red, nyquist-rule]
dependency_graph:
  requires: []
  provides:
    - tests/time-tracking-global/api-endpoint.test.ts
    - tests/time-tracking-global/workspace-tabs.test.ts
    - tests/time-tracking-global/global-view.test.ts
  affects:
    - components/WorkspaceTabs.tsx (tested)
    - app/api/time-entries/route.ts (future)
    - components/GlobalTimeView.tsx (future)
tech_stack:
  added: []
  patterns:
    - Wave 0 stub pattern (const x: any = undefined)
    - Vitest test structure
    - Mock patterns for auth and database
key_files:
  created:
    - tests/time-tracking-global/api-endpoint.test.ts
    - tests/time-tracking-global/workspace-tabs.test.ts
    - tests/time-tracking-global/global-view.test.ts
  modified: []
decisions:
  - "Wave 0 stub pattern: const handler: any = undefined; expect(handler).toBeDefined() — fails RED without brittle import errors"
  - "workspace-tabs.test.ts tests actual current state (time tab exists) — will turn GREEN when 32-03 removes it"
  - "Mock patterns align with existing test infrastructure (vi.mock for @/db and @/lib/auth-server)"
  - "Tests target node environment (no React mocking needed) for pure logic and export shape assertions"
metrics:
  duration_minutes: 2
  tasks_completed: 2
  tests_added: 9
  tests_passing: 0
  tests_red: 9
  commits: 2
  lines_added: 159
completed_date: "2026-04-02"
---

# Phase 32 Plan 01: Wave 0 Test Scaffolds Summary

**One-liner:** Created 9 failing RED stub tests across 3 files for TIME-01, TIME-02, and TIME-03, establishing test contracts before implementation begins.

## Objective Achieved

Created Wave 0 test scaffolds — failing RED stubs — for all three test files required by the Nyquist rule before any implementation begins. These tests provide feedback loops that will turn GREEN as future plans implement the production code.

## Tasks Completed

### Task 1: Create api-endpoint.test.ts and workspace-tabs.test.ts stubs ✅
- **Commit:** 71ed035
- **Files created:**
  - `tests/time-tracking-global/api-endpoint.test.ts` (79 lines)
  - `tests/time-tracking-global/workspace-tabs.test.ts` (18 lines)
- **Tests added:** 4 (3 API endpoint + 1 workspace tabs)
- **Status:** All tests fail RED as expected

**Details:**
- `api-endpoint.test.ts`: 3 stub tests for TIME-01 API shape
  - Returns entries with project_name field
  - Accepts project_id filter param
  - Accepts from/to date filter params
  - Uses Wave 0 pattern: `const handler: any = undefined; expect(handler).toBeDefined()`
- `workspace-tabs.test.ts`: 1 test for TIME-03 tab removal
  - Asserts no 'time' subtab in admin group
  - Currently fails RED (time tab exists in current implementation)
  - Will turn GREEN when 32-03 removes the tab

### Task 2: Create global-view.test.ts stub ✅
- **Commit:** 9af319d
- **Files created:**
  - `tests/time-tracking-global/global-view.test.ts` (62 lines)
- **Tests added:** 5
- **Status:** All tests fail RED as expected

**Details:**
- Component export tests (GlobalTimeView, TimeEntryModal)
- Query param handling (?project= initializes project filter)
- Weekly grouping helper functions (getMondayOfWeek, formatWeekHeader)
- All use Wave 0 stub pattern for consistent RED failures

## Verification Results

### Test Execution
```bash
npx vitest run tests/time-tracking-global/
```
**Result:** 3 files, 9 tests, all fail RED with meaningful stub messages ✅

### Regression Check
```bash
npx vitest run --reporter=verbose
```
**Result:** 77 passing tests remain passing (no regressions introduced) ✅

## Test Failure Analysis

All 9 tests fail RED as designed:
- **api-endpoint.test.ts (3 tests):** "expected undefined to be defined" — handler module doesn't exist yet
- **global-view.test.ts (5 tests):** "expected undefined to be defined" — component and helpers don't exist yet
- **workspace-tabs.test.ts (1 test):** Assertion error — time tab currently exists in TAB_GROUPS (will be removed in 32-03)

## Coverage Mapping

| Requirement | Test File | Test Count | What Turns Green |
|------------|-----------|------------|------------------|
| TIME-01 | api-endpoint.test.ts | 3 | Plan 32-02: Implement GET /api/time-entries route |
| TIME-01 | global-view.test.ts | 5 | Plan 32-04: Implement GlobalTimeView component |
| TIME-02 | global-view.test.ts | (covered) | Plan 32-04: Query param handling |
| TIME-03 | workspace-tabs.test.ts | 1 | Plan 32-03: Remove time tab from WorkspaceTabs |

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

### Wave 0 Stub Pattern
Using established pattern from Phase 26:
```typescript
const target: any = undefined;
expect(target).toBeDefined();
```
Benefits:
- Fails RED without brittle import errors
- Provides meaningful failure messages
- Easy to identify as Wave 0 stubs in test output

### Mock Alignment
Followed existing test infrastructure patterns:
- `vi.mock('@/db')` with Drizzle chain mocks
- `vi.mock('@/lib/auth-server')` with requireSession stub
- `vi.mock('server-only')` for Next.js server-only modules
- `vi.mock('drizzle-orm')` for Drizzle ORM functions

### Test Environment
- Node environment (vitest.config.ts)
- No React rendering needed (pure logic and export assertions)
- Path alias `@/` resolves to bigpanda-app/ root

## Next Steps

The test contracts are now established. Future plans will turn these RED tests GREEN:
1. **Plan 32-02:** Implement GET /api/time-entries route → 3 tests turn GREEN
2. **Plan 32-03:** Remove time tab from WorkspaceTabs → 1 test turns GREEN
3. **Plan 32-04:** Implement GlobalTimeView component → 5 tests turn GREEN

## Files Changed

### Created (3 files, 159 lines)
- `tests/time-tracking-global/api-endpoint.test.ts` (79 lines)
- `tests/time-tracking-global/workspace-tabs.test.ts` (18 lines)
- `tests/time-tracking-global/global-view.test.ts` (62 lines)

### Modified (0 files)
None

## Self-Check: PASSED

Verifying claims:

**Created files exist:**
```bash
✅ tests/time-tracking-global/api-endpoint.test.ts (79 lines)
✅ tests/time-tracking-global/workspace-tabs.test.ts (18 lines)
✅ tests/time-tracking-global/global-view.test.ts (62 lines)
```

**Commits exist:**
```bash
✅ 71ed035: test(32-01): add failing tests for time tracking API and tab removal
✅ 9af319d: test(32-01): add failing tests for GlobalTimeView component
```

**Tests fail RED:**
```bash
✅ 9 tests fail with meaningful stub failures
✅ No syntax or import errors
✅ No regressions in existing 77 passing tests
```

All claims verified successfully.
