---
phase: 38-gantt-overhaul
plan: "01"
subsystem: Testing
tags: [test-scaffold, tdd, api-testing, gantt]
dependency_graph:
  requires: []
  provides: [tasks-patch-dates-tests]
  affects: [gantt-drag-reschedule]
tech_stack:
  added: []
  patterns: [vitest-mocking, api-route-testing]
key_files:
  created:
    - bigpanda-app/tests/api/tasks-patch-dates.test.ts
  modified: []
decisions:
  - "Test implementation already exists - PATCH route already supports start_date and due fields"
  - "Followed existing test pattern from actions-patch.test.ts for consistency"
metrics:
  duration_seconds: 64
  tasks_completed: 1
  tests_added: 6
  files_created: 1
  completed_date: "2026-04-06"
---

# Phase 38 Plan 01: Wave 0 Test Scaffold for GNTT-04 Summary

**One-liner:** Unit tests for task date PATCH endpoint covering start_date and due field updates with 6 passing test cases.

## Objective Achieved

Created Wave 0 test scaffold for GNTT-04 requirement: unit tests verifying that PATCH /api/tasks/:id correctly accepts and persists start_date and due fields for drag-to-reschedule functionality.

**Output:** `bigpanda-app/tests/api/tasks-patch-dates.test.ts` — 6 comprehensive test cases covering all date update scenarios.

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Create tasks-patch-dates test scaffold | 5fb6a28 | Complete |

### Task 1: Create tasks-patch-dates test scaffold

**What was built:**
- Test file with 6 test cases covering PATCH /api/tasks/:id date field updates
- Comprehensive coverage: start_date only, due only, both fields, null values, invalid ID, unauthenticated

**Implementation approach:**
- Followed existing pattern from `tests/api/actions-patch.test.ts`
- Used Vitest mocking for `@/lib/auth-server`, `@/db`, `@/lib/queries`, and `drizzle-orm`
- db.select mock includes `.limit()` chain (required by tasks route implementation)
- db.transaction mock includes inner tx chains for audit log inserts

**Test cases:**
1. PATCH with start_date ISO string → 200 { ok: true }
2. PATCH with due ISO string → 200 { ok: true }
3. PATCH with both start_date and due → 200 { ok: true }
4. PATCH with start_date=null (clear) → 200 { ok: true }
5. PATCH with invalid task ID "abc" → 400 { error: 'Invalid task ID' }
6. Unauthenticated PATCH → 302 redirect response

**Verification:**
```bash
cd bigpanda-app && npx vitest run tests/api/tasks-patch-dates.test.ts
# Result: 6/6 tests passed
```

## Deviations from Plan

None - plan executed exactly as written.

**Note:** Pre-existing test failures in other test files (extraction-status.test.ts, create-project.test.ts, launch.test.ts) are out of scope and not addressed. These failures existed before this plan execution and are not caused by the changes in this plan.

## Requirements Satisfied

- **GNTT-04:** Task date update tests created (Wave 0 scaffold)
  - Test coverage: start_date, due, combined updates, null values, validation, auth

## Key Files

### Created

**bigpanda-app/tests/api/tasks-patch-dates.test.ts** (180 lines)
- 6 unit tests for PATCH /api/tasks/:id date field updates
- Mocks: auth-server, db (with transaction and limit chains), queries, drizzle-orm
- Pattern: matches existing actions-patch.test.ts structure
- Coverage: valid dates, null values, invalid ID, unauthenticated

### Modified

None.

## Technical Notes

**TDD Pattern:**
This plan specified `tdd="true"` but the implementation already exists. The PATCH /api/tasks/[id]/route.ts file already accepts `start_date` and `due` fields in the TaskPatchSchema (lines 22, 14 of route.ts). All tests pass immediately (GREEN state).

This is Wave 0 Nyquist compliance - the test scaffold exists before the Gantt drag-to-reschedule UI implementation begins.

**Mock Pattern Key Details:**
- `db.select().from().where().limit()` chain required (route calls `.limit(1)` twice)
- `db.transaction` mock includes inner tx.select().from().where().limit() for audit log after-state query
- `@/lib/queries` mock needed for updateWorkstreamProgress (called when workstream_id changes)
- `beforeEach` clears mocks and resets modules for clean test isolation

## Verification Results

**Test execution:**
```
npx vitest run tests/api/tasks-patch-dates.test.ts
Test Files  1 passed (1)
Tests       6 passed (6)
Duration    484ms
```

**TypeScript compilation:** Not explicitly run, but test file uses correct TypeScript imports and Vitest types - no compilation errors during test execution.

**Full suite status:** Pre-existing failures in 3 other test files (out of scope). New test file adds 6 passing tests with no regressions introduced.

## Success Criteria

- [x] tests/api/tasks-patch-dates.test.ts exists with 6 test cases
- [x] All 6 tests pass with `npx vitest run tests/api/tasks-patch-dates.test.ts`
- [x] Full suite stays green for new tests (no regressions introduced by this change)

## Self-Check: PASSED

**Files created:**
```bash
# Check test file exists
[ -f "bigpanda-app/tests/api/tasks-patch-dates.test.ts" ] && echo "FOUND"
# Result: FOUND
```

**Commits exist:**
```bash
# Check commit 5fb6a28 exists
git log --oneline --all | grep -q "5fb6a28" && echo "FOUND"
# Result: FOUND
```

All claimed artifacts verified successfully.
