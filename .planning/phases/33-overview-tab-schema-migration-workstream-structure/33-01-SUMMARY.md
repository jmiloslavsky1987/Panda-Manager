---
phase: 33-overview-tab-schema-migration-workstream-structure
plan: 01
subsystem: testing
tags: [wave-0, test-scaffolds, tdd, onboarding, overview-tab]
completed: 2026-04-02T18:13:48Z
duration_seconds: 139
task_count: 4
commits: [9012ed6, adeee13, 41417bf, 977e25e]
requirements: [WORK-01, WORK-02]
dependencies:
  requires: []
  provides:
    - Wave 0 test scaffolds for Phase 33
    - 23 failing RED tests for dual-track onboarding and completeness removal
  affects: []
tech_stack:
  added: []
  patterns:
    - Stub pattern for failing RED tests (const x: any = undefined; expect(x).toBeDefined())
    - Testing-library/react for component rendering tests
    - Vitest mocking for API route tests
key_files:
  created:
    - bigpanda-app/tests/overview/track-separation.test.ts
    - bigpanda-app/tests/api/onboarding-grouped.test.ts
    - bigpanda-app/tests/api/project-seeding.test.ts
    - bigpanda-app/tests/overview/completeness-removal.test.ts
  modified: []
decisions:
  - Used stub pattern (const x: any = undefined) to fail RED without brittle import errors
  - Created tests/overview/ directory for overview page component tests
  - Created tests/api/ directory for API route tests (alongside existing tests/ingestion/)
  - 23 total failing test cases across 4 test files (exceeds plan target of 17-21)
metrics:
  tests_created: 23
  test_files: 4
  lines_added: 334
---

# Phase 33 Plan 01: Wave 0 Test Scaffolds Summary

**One-liner:** Created 23 failing RED test scaffolds for dual-track onboarding UI (ADR/Biggy separation) and completeness removal using stub pattern.

## Completion Summary

All 4 tasks completed successfully. Created Wave 0 test scaffolds for Phase 33 schema migration and UI restructuring.

### Test Coverage

**Track separation tests (6 tests):**
- ADR section rendering with data-testid
- Biggy section rendering with data-testid
- Independent progress rings per track
- Shared filter bar across both columns
- Track-specific phase filtering

**API grouping tests (5 tests):**
- Grouped response shape { adr: [], biggy: [] }
- Track-specific phase arrays
- Empty array handling
- Nested steps structure

**Auto-seeding tests (8 tests):**
- ADR phase seeding (5 phases)
- Biggy phase seeding (5 phases)
- Display order validation
- Track field validation
- Transaction atomicity
- Phase name specification matching
- No step creation during seeding

**Completeness removal tests (4 tests):**
- No completeness score bar
- No warning banner
- No "Project Completeness" text
- No yellow banner classes

## Task Details

### Task 1: Create track-separation.test.ts
- **Status:** Complete
- **Commit:** 9012ed6
- **Files:** bigpanda-app/tests/overview/track-separation.test.ts
- **Result:** 6 failing RED tests for dual-track UI (WORK-01)

### Task 2: Create onboarding-grouped.test.ts
- **Status:** Complete
- **Commit:** adeee13
- **Files:** bigpanda-app/tests/api/onboarding-grouped.test.ts
- **Result:** 5 failing RED tests for API grouping (WORK-01)

### Task 3: Create project-seeding.test.ts
- **Status:** Complete
- **Commit:** 41417bf
- **Files:** bigpanda-app/tests/api/project-seeding.test.ts
- **Result:** 8 failing RED tests for auto-seeding phases (WORK-01)

### Task 4: Create completeness-removal.test.ts
- **Status:** Complete
- **Commit:** 977e25e
- **Files:** bigpanda-app/tests/overview/completeness-removal.test.ts
- **Result:** 4 failing RED tests for completeness removal (WORK-02)

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

### Stub Pattern Applied
All tests use the Phase 32 stub pattern to fail RED without brittle import errors:
```typescript
const target: any = undefined;
expect(target).toBeDefined(); // or .toBeNull() for negative assertions
```

### Test Infrastructure
- Created `tests/overview/` directory for overview page tests
- Created `tests/api/` directory for API route tests
- All tests compile without TypeScript errors
- All tests run via `npm test` commands
- Mocking pattern established for db, auth-server, drizzle-orm, server-only

### Test Verification
All 23 tests verified to fail RED with clear error messages:
- track-separation.test.ts: 6/6 failing
- onboarding-grouped.test.ts: 5/5 failing
- project-seeding.test.ts: 8/8 failing
- completeness-removal.test.ts: 4/4 failing

## Next Steps

Plan 33-02 will:
1. Add `track` column to schema (migration + Drizzle schema update)
2. Implement API grouping logic in GET /api/projects/[id]/onboarding
3. Implement auto-seeding in POST /api/projects
4. Turn these 23 RED tests GREEN

## Self-Check: PASSED

✓ All 4 test files exist at expected paths
✓ All 4 commits exist in git log (9012ed6, adeee13, 41417bf, 977e25e)
✓ All tests compile without errors
✓ All tests fail RED with clear error messages
✓ Test count (23) exceeds plan target (17-21)
