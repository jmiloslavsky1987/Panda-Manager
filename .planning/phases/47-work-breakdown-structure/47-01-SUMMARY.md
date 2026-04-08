---
phase: 47-work-breakdown-structure
plan: 01
subsystem: wbs-crud-api
tags: [wave-0-red-tests, tdd, api-routes, crud, recursive-delete]
dependency_graph:
  requires: [45-01]
  provides: [wbs-crud-api, delete-subtree-helper]
  affects: [wbs-ui-47-02, wbs-generate-47-03]
tech_stack:
  added: []
  patterns: [wave-0-tdd, bfs-traversal, async-params-next16]
key_files:
  created:
    - bigpanda-app/tests/api/wbs-crud.test.ts
    - bigpanda-app/tests/wbs/delete-cascade.test.ts
    - bigpanda-app/tests/wbs/reorder.test.ts
    - bigpanda-app/tests/wbs/generate-plan.test.ts
    - bigpanda-app/tests/wbs/generate-dedup.test.ts
    - bigpanda-app/app/api/projects/[projectId]/wbs/route.ts
    - bigpanda-app/app/api/projects/[projectId]/wbs/[itemId]/route.ts
    - bigpanda-app/app/api/projects/[projectId]/wbs/reorder/route.ts
  modified:
    - bigpanda-app/lib/queries.ts
decisions:
  - Wave 0 TDD: Created 5 RED test files (24 test cases) before implementation
  - BFS traversal for deleteWbsSubtree: Load all project items, build children map, traverse subtree, delete in single batch
  - Level 1 protection: API enforces Level 1 nodes cannot be deleted, renamed, or reparented (403 response)
  - Next.js 16 async params: Updated routes to await params Promise for App Router compatibility
  - Default db import: Used default export from db/index.ts for consistency with test mock pattern
  - Display order recalculation: Shift siblings >= newDisplayOrder by +1 before inserting moved node
metrics:
  duration_minutes: 9
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_created: 8
  files_modified: 1
  tests_added: 24
  tests_passing: 18
  tests_red_wave0: 6
---

# Phase 47 Plan 01: WBS CRUD API & Wave 0 Test Scaffolds

**One-liner:** Wave 0 RED test scaffolds (24 tests) + fully functional WBS CRUD API routes with recursive subtree deletion using BFS traversal

## Summary

Implemented complete WBS CRUD backend surface with Wave 0 TDD approach. Created 5 test files (24 test cases) as RED stubs before implementation. Built POST/PATCH/DELETE/reorder API routes with Level 1 protection, display_order management, and recursive subtree deletion helper. All 18 CRUD tests GREEN. Generate Plan tests (6 tests) remain RED for Plan 03.

## Execution Timeline

- **Start:** 2026-04-08T18:14:25Z
- **Task 1 Complete:** 85f17e2 (Wave 0 RED tests)
- **Task 2 Complete:** a8b4965 (WBS CRUD implementation)
- **End:** 2026-04-08T18:23:42Z
- **Duration:** 9 minutes

## Tasks Completed

### Task 1: Wave 0 — RED test scaffolds for WBS

**Files:**
- tests/api/wbs-crud.test.ts (12 tests: POST/PATCH/DELETE/reorder)
- tests/wbs/delete-cascade.test.ts (3 tests: recursive deletion)
- tests/wbs/reorder.test.ts (3 tests: display_order recalculation)
- tests/wbs/generate-plan.test.ts (3 tests: Wave 0 for Plan 03)
- tests/wbs/generate-dedup.test.ts (3 tests: Wave 0 for Plan 03)

**Result:** 24 tests created, all RED (module not found errors) as expected for Wave 0.

**Commit:** 85f17e2

### Task 2: WBS CRUD API routes + deleteWbsSubtree helper

**Implementation:**

**lib/queries.ts additions:**
- `deleteWbsSubtree(itemId)`: Recursively deletes WBS item and all descendants
  - Fetch item's project_id
  - Load all items for project
  - Build childrenMap for BFS traversal
  - Collect all descendant IDs via BFS
  - Delete all in single batch with `inArray()`

**app/api/projects/[projectId]/wbs/route.ts:**
- `POST`: Create new WBS item (Level 2 or 3 only), calculate max display_order + 1
- `GET`: List WBS items by track, ordered by level then display_order

**app/api/projects/[projectId]/wbs/[itemId]/route.ts:**
- `PATCH`: Update name and/or status. Reject Level 1 name changes with 403
- `DELETE`: Delete item + subtree via deleteWbsSubtree(). Reject Level 1 with 403

**app/api/projects/[projectId]/wbs/reorder/route.ts:**
- `POST`: Update parent_id and display_order for drag-and-drop
  - Shift siblings at target position (display_order >= newDisplayOrder) by +1
  - Set moved item to newParentId and newDisplayOrder
  - Reject Level 1 reorder with 403

**Result:** All 18 CRUD tests GREEN. Generate tests (6) remain RED as expected.

**Commit:** a8b4965

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Next.js 16 async params pattern**
- **Found during:** Task 2 TypeScript check
- **Issue:** Route handlers expected `{ params: { projectId: string } }` but Next.js 16 App Router passes `{ params: Promise<{ projectId: string }> }`
- **Fix:** Changed all route signatures to `{ params: Promise<...> }` and added `const resolvedParams = await params` at start of each handler
- **Files modified:** route.ts, [itemId]/route.ts, reorder/route.ts
- **Commit:** a8b4965

**2. [Rule 3 - Blocking] Test mocks incompatible with implementation**
- **Found during:** Task 2 test execution
- **Issue:** Tests mocked db with static chains that didn't support `.limit()` or proper return values for different query patterns
- **Fix:** Refactored test mocks to return proper mock chains with `.limit()` support, added conditional logic for project_id vs full item queries, created beforeEach mock setup per describe block
- **Files modified:** wbs-crud.test.ts, delete-cascade.test.ts, reorder.test.ts
- **Commit:** a8b4965

**3. [Rule 3 - Blocking] Named vs default db import inconsistency**
- **Found during:** Task 2 test execution
- **Issue:** lib/queries.ts used `import { db }` but tests mocked `{ default: mockDb }`
- **Fix:** Changed lib/queries.ts to `import db from '../db'` to match test mocks and route import pattern
- **Files modified:** lib/queries.ts
- **Commit:** a8b4965

**4. [Rule 1 - Bug] Zod enum errorMap syntax error**
- **Found during:** Task 2 TypeScript check
- **Issue:** `z.enum(['ADR', 'Biggy'], { errorMap: () => ({ message: '...' }) })` is invalid syntax in Zod
- **Fix:** Removed errorMap parameter, used default Zod error message
- **Files modified:** route.ts
- **Commit:** a8b4965

**5. [Rule 1 - Bug] Status field type mismatch**
- **Found during:** Task 2 TypeScript check
- **Issue:** updateFields defined as `{ status?: string }` but Drizzle expects `'not_started' | 'in_progress' | 'complete'`
- **Fix:** Changed type to `{ status?: 'not_started' | 'in_progress' | 'complete' }`
- **Files modified:** [itemId]/route.ts
- **Commit:** a8b4965

## Verification

**CRUD tests (GREEN):**
```bash
npm test -- --run tests/api/wbs-crud.test.ts tests/wbs/delete-cascade.test.ts tests/wbs/reorder.test.ts
# Result: 3 passed (18 tests)
```

**Generate Plan tests (RED - expected):**
```bash
npm test -- --run tests/wbs/generate-plan.test.ts tests/wbs/generate-dedup.test.ts
# Result: 2 failed (6 tests) - module not found (expected for Plan 03)
```

**TypeScript:**
```bash
npx tsc --noEmit
# 6 WBS-related errors: all in generate test files (expected)
# All route implementations: 0 errors
```

**Route files exist:**
- app/api/projects/[projectId]/wbs/route.ts (POST, GET)
- app/api/projects/[projectId]/wbs/[itemId]/route.ts (PATCH, DELETE)
- app/api/projects/[projectId]/wbs/reorder/route.ts (POST)

**deleteWbsSubtree:**
- Exported from lib/queries.ts (line 1155)
- Used by DELETE route
- All 3 delete-cascade tests GREEN

## Key Technical Details

**deleteWbsSubtree Algorithm:**
1. Query item to get project_id
2. Load all items for that project (for full tree context)
3. Build childrenMap: `Map<parent_id, child_ids[]>`
4. BFS from itemId: queue starting with itemId, collect all descendants
5. Delete all collected IDs in single batch: `db.delete(wbsItems).where(inArray(wbsItems.id, idsToDelete))`

**Level 1 Protection:**
- PATCH: Reject name change with 403 (status change allowed)
- DELETE: Reject with 403
- Reorder: Reject with 403
- Routes check item.level before operation, return 403 if level === 1

**Display Order Management:**
- POST: Calculate max display_order for siblings at parent_id, set new item to max + 1
- Reorder: Shift siblings >= newDisplayOrder by +1, then set moved item to exact newDisplayOrder

**Next.js 16 Compatibility:**
- All route handlers await params Promise
- Tests updated to pass `{ params: Promise.resolve({ ... }) }`

## Success Criteria Met

- ✅ 5 Wave 0 test files exist (24 tests total)
- ✅ 3 WBS CRUD API route files implemented
- ✅ deleteWbsSubtree helper in lib/queries.ts
- ✅ wbs-crud, delete-cascade, reorder tests all GREEN (18/18)
- ✅ generate-plan and generate-dedup tests still RED (6/6 - expected for Plan 03)
- ✅ No TypeScript errors in route implementations

## Next Steps

**Plan 02:** WBS Tree UI with drag-and-drop, inline editing, add/delete buttons
**Plan 03:** Generate Plan modal with AI proposal flow + deduplication logic
