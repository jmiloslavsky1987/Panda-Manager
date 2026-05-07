---
phase: 85-wbs-ms-project-style-overhaul
plan: "03"
subsystem: api
tags: [nextjs, drizzle, postgres, wbs, dependencies, tdd]

# Dependency graph
requires:
  - phase: 85-01
    provides: wbsDependencies table in schema + migration 0050
provides:
  - GET /api/projects/[projectId]/wbs/dependencies — list all dep pairs for project
  - POST /api/projects/[projectId]/wbs/dependencies — create FS or SS dependency with onConflictDoNothing
  - DELETE /api/projects/[projectId]/wbs/dependencies/[depId] — remove dep with ownership check
affects:
  - 85-04 (WbsGrid predecessor cell editing consumes POST endpoint)
  - 85-05 (Gantt arrow rendering consumes GET endpoint)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - onConflictDoNothing() for idempotent dependency creation (duplicate silently succeeds)
    - Ownership check pattern before DELETE: fetch dep, compare project_id, return 403 if mismatch

key-files:
  created:
    - app/api/projects/[projectId]/wbs/dependencies/route.ts
    - app/api/projects/[projectId]/wbs/dependencies/[depId]/route.ts
  modified: []

key-decisions:
  - "[85-03] onConflictDoNothing() on wbs_dependencies insert — duplicate (from_item_id, to_item_id) silently succeeds via wbs_dependencies_unique constraint; existing dep fetched and returned as 201"
  - "[85-03] DELETE ownership check: fetch dep.project_id first, compare to route projectId, return 403 before executing delete — prevents cross-project dep deletion"

patterns-established:
  - "Dependency ownership guard: always verify dep.project_id === projectId before mutating; 403 on mismatch"

requirements-completed:
  - WBS-03

# Metrics
duration: 5min
completed: 2026-05-07
---

# Phase 85 Plan 03: WBS Dependencies API Routes Summary

**Two new API routes for wbs_dependencies: GET+POST collection endpoint with onConflictDoNothing, and DELETE with project ownership guard — 5 tests GREEN via TDD**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-07T20:23:00Z
- **Completed:** 2026-05-07T20:25:25Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- GET /api/projects/[projectId]/wbs/dependencies returns all dependency pairs for the project
- POST creates FS or SS dependency, silently handles duplicates via .onConflictDoNothing()
- DELETE removes a dependency with 204; returns 403 if dep belongs to a different project, 404 if not found
- All 5 tests in wbs-dependencies.test.ts GREEN (GET 200, POST 201, POST 400 invalid type, DELETE 204, DELETE 403 mismatch)
- TypeScript compiles without errors for both new route files

## Task Commits

Each task was committed atomically:

1. **Task 1: Create wbs/dependencies/route.ts — GET and POST** - `75630396` (feat)
2. **Task 2: Create wbs/dependencies/[depId]/route.ts — DELETE** - `b11aa7b1` (feat)

## Files Created/Modified
- `app/api/projects/[projectId]/wbs/dependencies/route.ts` - GET + POST handlers for wbs_dependencies collection
- `app/api/projects/[projectId]/wbs/dependencies/[depId]/route.ts` - DELETE handler with project ownership check

## Decisions Made
- onConflictDoNothing() for duplicate (from_item_id, to_item_id) — silent success; fetch existing dep and return 201 when conflict occurs
- DELETE ownership check fetches dep first (SELECT id, project_id), compares project_id, returns 403 before executing delete

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - TDD flow proceeded cleanly. Tests confirmed RED before implementation, GREEN after each route file created.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- wbs_dependencies API fully operational — Plan 85-04 (WbsGrid predecessor cell editing) can now POST to create deps
- Plan 85-05 (Gantt arrow rendering) can now GET deps for display
- No blockers

---
*Phase: 85-wbs-ms-project-style-overhaul*
*Completed: 2026-05-07*
