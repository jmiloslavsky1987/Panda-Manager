---
phase: 85-wbs-ms-project-style-overhaul
plan: "01"
subsystem: database
tags: [drizzle, postgresql, wbs, migrations, api-routes, tdd]

# Dependency graph
requires:
  - phase: 85-00
    provides: Research and design decisions for WBS MS-Project overhaul
provides:
  - db/migrations/0050_wbs_overhaul.sql with duration_days, percent_complete (backfilled from status), assignee columns + wbs_dependencies table
  - wbsDependencies Drizzle table, WbsDependency/WbsDependencyInsert types exported from db/schema.ts
  - getWbsDependencies(projectId) function in lib/queries.ts
  - Level-1 WBS guard removal (PATCH name, DELETE, reorder all now work on level-1 nodes)
  - wbs/route.ts POST accepts level=1 and nullable parent_id
  - wbs/reorder/route.ts recomputes level from parent chain after reorder
affects: [85-02, 85-03, 85-04, 85-05, wbs-components, gantt]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isNull(column) for nullable FK sibling queries in Drizzle (replaces eq(col, null) which breaks)"
    - "Level recomputation from parent chain: walk parentMap up to root counting hops"
    - "mockReturnValueOnce/mockReturnValue sequence for multi-select vitest route mocks"

key-files:
  created:
    - db/migrations/0050_wbs_overhaul.sql
    - tests/schema/wbs-overhaul.test.ts
  modified:
    - db/schema.ts
    - lib/queries.ts
    - app/api/projects/[projectId]/wbs/route.ts
    - app/api/projects/[projectId]/wbs/[itemId]/route.ts
    - app/api/projects/[projectId]/wbs/reorder/route.ts
    - tests/api/wbs-crud.test.ts

key-decisions:
  - "isNull() from drizzle-orm required for root-level sibling queries when parent_id IS NULL — eq(col, null) does not work"
  - "Level recomputation walks parentMap built from full project item list — single query, no recursion overhead"
  - "Old 403 level-1 guard tests converted to new behavior (200/204) in wbs-crud.test.ts — old expectations contradicted plan goals"
  - "drizzle-orm mock in wbs-crud.test.ts extended with isNull: vi.fn() to prevent runtime errors from new import"
  - "mockReturnValueOnce + mockReturnValue chain pattern used in reorder tests to handle two distinct select call shapes"

patterns-established:
  - "isNull(column) pattern: Use drizzle-orm isNull() for nullable FK columns in WHERE clauses; import alongside eq/and"
  - "Multi-select mock sequencing: mockReturnValueOnce for first call (with .limit()), mockReturnValue for subsequent (with direct .where() await)"

requirements-completed: [WBS-01, WBS-03, WBS-04]

# Metrics
duration: 12min
completed: 2026-05-07
---

# Phase 85 Plan 01: Schema Foundation + API Guard Removal Summary

**PostgreSQL migration adding duration_days/percent_complete/assignee to wbs_items plus wbs_dependencies table, with all three Level-1 route guards removed to unlock root node editing**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-07T20:07:00Z
- **Completed:** 2026-05-07T20:20:06Z
- **Tasks:** 2
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments
- Migration 0050 adds 3 new columns to wbs_items and creates wbs_dependencies with UNIQUE constraint + 3 indexes
- percent_complete backfilled from status CASE expression (not_started=0, in_progress=50, complete=100) before NOT NULL constraint applied
- wbsDependencies Drizzle table and WbsDependency/WbsDependencyInsert types exported from db/schema.ts
- getWbsDependencies(projectId) added to lib/queries.ts
- Level-1 PATCH name guard removed, Level-1 DELETE guard removed, Level-1 reorder guard removed
- POST /wbs now accepts level=1 with nullable parent_id; null parent_id uses isNull() for sibling ordering
- Reorder route recomputes item.level from parent chain after move

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration 0050 + Drizzle schema additions** - `74d42f83` (feat)
2. **Task 2: Update WBS API routes + getWbsDependencies** - `92698ca6` (feat)

## Files Created/Modified
- `db/migrations/0050_wbs_overhaul.sql` - ALTER TABLE wbs_items + CREATE TABLE wbs_dependencies
- `db/schema.ts` - Added duration_days, percent_complete, assignee to wbsItems; added wbsDependencies table + types
- `lib/queries.ts` - Added getWbsDependencies(projectId), imported wbsDependencies and WbsDependency
- `app/api/projects/[projectId]/wbs/route.ts` - Relaxed CreateWbsItemSchema (level min 1, nullable parent_id), added isNull for root siblings, include new fields in insert
- `app/api/projects/[projectId]/wbs/[itemId]/route.ts` - Removed Level-1 PATCH and DELETE guards, extended UpdateWbsItemSchema
- `app/api/projects/[projectId]/wbs/reorder/route.ts` - Nullable newParentId, removed Level-1 reorder guard, recompute level from parent chain
- `tests/schema/wbs-overhaul.test.ts` - 10 tests for migration existence and schema exports (created)
- `tests/api/wbs-crud.test.ts` - Updated 2 old 403 guard tests to new 200/204 behavior; added isNull to drizzle mock; updated reorder mock for multi-select sequence

## Decisions Made
- isNull() from drizzle-orm required for nullable parent_id comparisons — eq(col, null) silently produces incorrect SQL
- Level recomputation uses a single full-project select to build a parentMap, then walks up the chain counting hops — no recursive DB calls
- Old wbs-crud.test.ts tests asserting 403 for level-1 were converted to assert new behavior (200/204) since keeping them would create a test paradox with the new unlock tests

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated conflicting level-1 tests in wbs-crud.test.ts**
- **Found during:** Task 2 (wbs-crud.test.ts verification)
- **Issue:** Test file had both old "Level 1 returns 403" tests AND new "Level 1 returns 200/204 (lock removed)" tests — after removing guards, old tests would fail creating a test paradox
- **Fix:** Renamed old 403 tests to assert new behavior (200 for PATCH status change, 204 for DELETE) reflecting the unlocked state
- **Files modified:** tests/api/wbs-crud.test.ts
- **Verification:** All 15 wbs-crud.test.ts tests pass GREEN
- **Committed in:** 92698ca6 (Task 2 commit)

**2. [Rule 1 - Bug] Added isNull to drizzle-orm mock in wbs-crud.test.ts**
- **Found during:** Task 2 (POST level=1 test failing with 500)
- **Issue:** Route imports isNull from drizzle-orm but test mock lacked isNull: vi.fn() — calling isNull() returned undefined causing 500 error
- **Fix:** Added isNull: vi.fn() to the vi.mock('drizzle-orm', ...) block
- **Files modified:** tests/api/wbs-crud.test.ts
- **Verification:** POST with level=1 test returns 201 as expected
- **Committed in:** 92698ca6 (Task 2 commit)

**3. [Rule 1 - Bug] Updated reorder test mockSelect for multi-select sequence**
- **Found during:** Task 2 (reorder route now does 2 select calls when newParentId !== null)
- **Issue:** Original mockSelect used single mockReturnValue for all calls; new level-recompute code issues a second select() with no .limit() chain
- **Fix:** Used mockReturnValueOnce for item-fetch call (with .limit()), mockReturnValue for subsequent parent-map select (with direct .where() await)
- **Files modified:** tests/api/wbs-crud.test.ts
- **Verification:** Reorder tests pass GREEN
- **Committed in:** 92698ca6 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 - Bug in test infrastructure, no production code scope creep)
**Impact on plan:** All 3 fixes were in test support code to match route implementation reality. No scope expansion.

## Issues Encountered
None — plan executed cleanly. Pre-existing TypeScript errors in `__tests__/` and `lib/__tests__/` directories confirmed to be pre-existing (not caused by this plan's changes).

## User Setup Required
None - no external service configuration required. Migration 0050 will be applied automatically by Docker `run-migrations.ts` on next container startup.

## Next Phase Readiness
- Schema foundation complete: duration_days, percent_complete, assignee available on wbs_items
- wbs_dependencies table ready for dependency management (Plan 85-02+)
- getWbsDependencies() available in lib/queries.ts for Gantt dependency rendering
- All three Level-1 guards removed — root nodes are fully editable via API
- Ready for Phase 85-02: WBS UI components and Gantt-style rendering

## Self-Check: PASSED

All created files found on disk. Both task commits verified in git log.

---
*Phase: 85-wbs-ms-project-style-overhaul*
*Completed: 2026-05-07*
