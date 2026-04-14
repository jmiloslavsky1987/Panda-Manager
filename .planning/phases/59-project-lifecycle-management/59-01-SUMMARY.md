---
phase: 59-project-lifecycle-management
plan: 01
subsystem: testing
tags: [tdd, red-phase, lifecycle, rbac, portfolio]
dependency_graph:
  requires: [Phase 58 RBAC foundation, existing PATCH handler, getActiveProjects query]
  provides: [37 RED test contracts for lifecycle operations]
  affects: [app/api/projects/[projectId]/route.ts, lib/queries.ts]
tech_stack:
  added: []
  patterns: [TDD RED-GREEN-REFACTOR, Vitest test stubs, behavioral contracts]
key_files:
  created:
    - bigpanda-app/__tests__/lifecycle/archive.test.ts
    - bigpanda-app/__tests__/lifecycle/delete.test.ts
    - bigpanda-app/__tests__/lifecycle/restore.test.ts
    - bigpanda-app/__tests__/lifecycle/portfolio.test.ts
  modified: []
decisions:
  - "Use throw new Error('not implemented') pattern for RED stubs (matches existing portfolio test pattern)"
  - "Organize tests by API endpoint + authorization (archive.test, delete.test, restore.test) and query integration (portfolio.test)"
  - "Include pre-flight checks in delete.test for skill_runs and extraction_jobs with pending/running status"
  - "Verify seedProjectFromRegistry idempotency in restore tests"
metrics:
  duration_minutes: 2
  completed_date: "2026-04-14"
  tasks_completed: 1
  tests_added: 37
  files_created: 4
---

# Phase 59 Plan 01: Project Lifecycle RED Tests Summary

**One-liner:** TDD RED phase establishing 37 behavioral contracts for archive/delete/restore operations with admin RBAC enforcement and portfolio query filtering.

## What Was Built

Created four comprehensive RED test files defining behavioral contracts for project lifecycle management:

### 1. Archive Tests (7 tests)
- Admin-only archive operation via PATCH /api/projects/[projectId]
- Status transition to 'archived' with updated_at timestamp
- Authorization: requireProjectRole with 'admin' minimum role
- Conditional logic: seedProjectFromRegistry NOT called on archive
- Error handling: 404 for non-existent projects

### 2. Delete Tests (10 tests)
- Pre-flight checks blocking deletion:
  - Status must be 'archived' (not 'active' or 'draft')
  - No pending/running skill_runs
  - No pending/running extraction_jobs
- Successful deletion with cascade to child tables
- Admin-only authorization via requireProjectRole
- Edge case: allows deletion with completed/failed jobs

### 3. Restore Tests (9 tests)
- PATCH with {status: 'active'} restores archived project
- Triggers seedProjectFromRegistry on transition to 'active'
- Idempotency: handles already-active projects gracefully
- Conditional logic: seeding only on 'active', not 'draft'
- Admin-only authorization

### 4. Portfolio Query Tests (11 tests)
- getActiveProjects filters: includes 'active' and 'draft', excludes 'archived'
- Hard delete behavior: deleted rows do not appear in results
- RBAC integration: membership filter respects archived status
- getPortfolioData integration: enrichment limited to active/draft projects

## Test Results

```
✓ All 4 test files created
✓ All 37 tests failing RED (expected TDD state)
✓ Test structure matches existing __tests__/portfolio/ pattern
✓ No import errors (commented out imports until Plan 02)
```

**Test breakdown:**
- archive.test.ts: 7 failing tests
- delete.test.ts: 10 failing tests
- restore.test.ts: 9 failing tests
- portfolio.test.ts: 11 failing tests

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

### Test Pattern Consistency
- Follows existing portfolio test pattern: `throw new Error('not implemented')` for RED stubs
- Uses Vitest describe/it/expect structure
- Comments out imports that will fail until Plan 02 implements production code
- Each test includes behavioral contract comments explaining expected behavior

### Behavioral Contracts Established
1. **Authorization:** All lifecycle operations require 'admin' role (upgrade from current 'user' role in PATCH)
2. **Pre-flight checks:** DELETE blocked by pending/running jobs (skill_runs, extraction_jobs)
3. **Status transitions:** Archive→Delete flow enforced (cannot delete active/draft projects)
4. **Seeding:** seedProjectFromRegistry called only on status transition to 'active'
5. **Portfolio filtering:** getActiveProjects explicitly excludes 'archived' status

### Phase 58 Integration Points
- Tests reference requireProjectRole with 'admin' enforcement (RBAC foundation)
- Portfolio tests verify membership filter respects archived status
- Authorization contracts align with Phase 58 project_members table

## Next Steps

**Plan 02 (Wave 1):** Implement production code to satisfy RED test contracts:
1. Upgrade PATCH handler requireProjectRole to 'admin' for status changes
2. Add DELETE handler with pre-flight checks
3. Update route.ts with archive/restore conditional logic
4. Verify getActiveProjects filtering behavior
5. Drive all 37 tests to GREEN

## Self-Check: PASSED

**Files created:**
```bash
✓ bigpanda-app/__tests__/lifecycle/archive.test.ts
✓ bigpanda-app/__tests__/lifecycle/delete.test.ts
✓ bigpanda-app/__tests__/lifecycle/restore.test.ts
✓ bigpanda-app/__tests__/lifecycle/portfolio.test.ts
```

**Commit exists:**
```bash
✓ 206b431: test(59-01): add failing RED tests for project lifecycle
```

**Test execution:**
```bash
✓ npx vitest run __tests__/lifecycle/ → 37 failed (RED state confirmed)
```
