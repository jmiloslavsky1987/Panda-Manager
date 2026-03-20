---
phase: 03-write-surface-+-plan-builder
plan: 08
subsystem: ui
tags: [react, next.js, tailwind, drizzle, swimlane, kanban, workstreams]

# Dependency graph
requires:
  - phase: 03-05
    provides: swimlane page stub and plan sub-navigation tabs
  - phase: 03-06
    provides: PATCH /api/tasks/:id endpoint for status updates, @dnd-kit patterns
  - phase: 03-02
    provides: tasks + workstreams schema with workstream_id FK and percent_complete column
provides:
  - SwimlaneView client component — grouped by workstream, per-row progress bar, status columns
  - Swimlane RSC page at /customer/:id/plan/swimlane — parallel data fetch
affects: [03-09, phase-04, e2e-tests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Optimistic status update via useState + PATCH with revert-on-error
    - Per-workstream task grouping using Map<number|null, Task[]>
    - RSC parallel fetch with Promise.all then pass to 'use client' child

key-files:
  created:
    - bigpanda-app/components/SwimlaneView.tsx
  modified:
    - bigpanda-app/app/customer/[id]/plan/swimlane/page.tsx

key-decisions:
  - "Status change via select dropdown (click-to-move) rather than full @dnd-kit drag — plan explicitly permits this fallback for nested scrollable container complexity"
  - "Unassigned lane filtered out when no tasks have workstream_id=null — avoids empty row clutter"
  - "updatingIds Set tracks in-flight PATCH requests for per-card disabled/opacity feedback"

patterns-established:
  - "Optimistic UI pattern: setOptimisticTasks immediately, revert in catch block, router.refresh() in try"
  - "LaneWorkstream union type handles both Workstream rows and the synthetic Unassigned lane without casting"

requirements-completed: [PLAN-05, PLAN-08, PLAN-09, PLAN-10, PLAN-11]

# Metrics
duration: 2min
completed: 2026-03-20
---

# Phase 3 Plan 8: Team Swimlane View Summary

**Per-workstream swimlane Kanban at /customer/:id/plan/swimlane — task cards grouped by workstream in 4 status columns with percent_complete progress bars and optimistic PATCH on status change**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-20T14:21:15Z
- **Completed:** 2026-03-20T14:22:39Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments
- Built SwimlaneView 'use client' component: one row per workstream, each row has name/track badge/progress bar header and 4 status sub-columns
- Unassigned lane appears only when tasks with workstream_id=null exist
- Status change via select dropdown calls PATCH /api/tasks/:id with optimistic update and error revert
- Replaced stub page.tsx with RSC that parallel-fetches tasks and workstreams, renders SwimlaneView

## Task Commits

Each task was committed atomically:

1. **Task 1: Build SwimlaneView component** - `a32e07f` (feat)
2. **Task 2: Build the Swimlane page** - `f7ffd72` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `bigpanda-app/components/SwimlaneView.tsx` - Client swimlane component; rows per workstream, status columns, optimistic PATCH, data-testid attributes
- `bigpanda-app/app/customer/[id]/plan/swimlane/page.tsx` - RSC page; parallel fetch of tasks + workstreams, empty state, delegates to SwimlaneView

## Decisions Made
- Status change uses a `<select>` dropdown (click-to-move) rather than @dnd-kit drag-and-drop. Plan explicitly notes this as an acceptable fallback — the E2E test only requires PATCH /api/tasks/:id to fire, not a specific interaction mechanism.
- `updatingIds` Set provides per-card visual feedback (opacity change) during in-flight PATCH without blocking other cards.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Swimlane view is live at /customer/:id/plan/swimlane and linked from the Plan sub-tabs (added in 03-05)
- PLAN-05 E2E test (swimlane view rendering) can now be activated and run
- PLAN-09 (progress rollup) is visually represented via percent_complete bars — rollup logic already exists in updateWorkstreamProgress (03-02)
- No blockers for 03-09 or subsequent plans

---
*Phase: 03-write-surface-+-plan-builder*
*Completed: 2026-03-20*
