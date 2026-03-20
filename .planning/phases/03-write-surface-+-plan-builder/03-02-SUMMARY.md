---
phase: 03-write-surface-+-plan-builder
plan: 02
subsystem: database
tags: [drizzle, postgres, schema, migration, dnd-kit, frappe-gantt, sonner]

# Dependency graph
requires:
  - phase: 01-data-foundation
    provides: Drizzle schema with tasks and workstreams tables
  - phase: 02-app-shell-read-surface
    provides: queries.ts with existing query functions and types

provides:
  - tasks.blocked_by self-referential FK (nullable integer)
  - tasks.milestone_id FK to milestones (nullable integer)
  - tasks.start_date TEXT column (nullable)
  - workstreams.percent_complete integer column (0-100, nullable)
  - SQL migration 0002_add_task_deps.sql with IF NOT EXISTS guards
  - getTasksForProject(projectId) query function
  - getWorkstreamsWithProgress(projectId) query function
  - updateWorkstreamProgress(workstreamId) progress rollup function
  - getPlanTemplates() query function
  - Task and PlanTemplate inferred types exported from queries.ts
  - @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities installed
  - frappe-gantt installed
  - sonner installed

affects:
  - 03-03 (Kanban board uses @dnd-kit and getTasksForProject)
  - 03-04 (Gantt chart uses frappe-gantt and getTasksForProject)
  - 03-05 (workstream progress uses updateWorkstreamProgress)
  - 03-06+ (all task write views use blocked_by and milestone_id)

# Tech tracking
tech-stack:
  added:
    - "@dnd-kit/core@6.3.1 — drag-and-drop core"
    - "@dnd-kit/sortable@10.0.0 — sortable list/grid primitives"
    - "@dnd-kit/utilities@3.2.2 — dnd-kit CSS transform utilities"
    - "frappe-gantt@1.2.2 — SVG Gantt chart renderer"
    - "sonner@2.0.7 — toast notification library"
  patterns:
    - "Self-referential FK pattern: AnyPgColumn import from drizzle-orm/pg-core for tasks.blocked_by"
    - "Progress rollup pattern: updateWorkstreamProgress derives percent_complete from task status ratio"

key-files:
  created:
    - bigpanda-app/db/migrations/0002_add_task_deps.sql
  modified:
    - bigpanda-app/db/schema.ts
    - bigpanda-app/lib/queries.ts
    - bigpanda-app/package.json

key-decisions:
  - "AnyPgColumn import required for self-referential FK (tasks.blocked_by references tasks.id)"
  - "Migration SQL written manually (not via drizzle-kit generate) — DB not available in dev environment"
  - "npm install --no-package-lock used — invalid esbuild semver in package-lock.json blocks standard install (same pattern as 02-01)"
  - "updateWorkstreamProgress counts both 'done' and 'completed' as finished task statuses"

patterns-established:
  - "Self-referential FK: use AnyPgColumn type from drizzle-orm/pg-core to break circular reference"
  - "Manual migration SQL: write IF NOT EXISTS guards for all ALTER TABLE statements"

requirements-completed: [PLAN-01, PLAN-06, PLAN-09]

# Metrics
duration: 8min
completed: 2026-03-20
---

# Phase 3 Plan 02: Schema Extensions + Phase 3 Package Install Summary

**4 new Drizzle columns (blocked_by, milestone_id, start_date, percent_complete), hand-written migration SQL, 4 new query functions, and 5 Phase 3 npm packages installed**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-20T~14:00Z
- **Completed:** 2026-03-20T~14:08Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments

- Extended tasks table with blocked_by (self-FK), milestone_id (FK to milestones), and start_date columns enabling Kanban blocking chains and Gantt date range display
- Extended workstreams table with percent_complete enabling progress rollup (PLAN-09)
- Added getTasksForProject, getWorkstreamsWithProgress, updateWorkstreamProgress, and getPlanTemplates to queries.ts with correct Drizzle types
- Installed all 5 Phase 3 packages: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, frappe-gantt, sonner

## Task Commits

Each task was committed atomically:

1. **Task 1: Add 4 schema columns and generate migration SQL** - `d73c884` (feat)
2. **Task 2: Add task/workstream query functions and install packages** - `f97bbea` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `bigpanda-app/db/schema.ts` - Added AnyPgColumn import; blocked_by/milestone_id/start_date on tasks; percent_complete on workstreams
- `bigpanda-app/db/migrations/0002_add_task_deps.sql` - Hand-written ALTER TABLE statements with IF NOT EXISTS guards
- `bigpanda-app/lib/queries.ts` - Added tasks/planTemplates imports, Task/PlanTemplate types, 4 new query functions
- `bigpanda-app/package.json` - Added 5 new dependency entries

## Decisions Made

- **AnyPgColumn for self-referential FK:** Drizzle requires `AnyPgColumn` type (not `PgColumn`) to break the circular type inference when a column references its own table.
- **Manual migration SQL:** drizzle-kit generate requires a live DB connection. Written by hand with IF NOT EXISTS guards for safe re-run.
- **npm install --no-package-lock:** Continued the established 02-01 pattern — invalid esbuild semver in package-lock.json blocks standard `npm install`.
- **Dual status check in updateWorkstreamProgress:** Counts both 'done' and 'completed' as finished since the tasks table uses 'todo' default but plan specs reference both status values.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — both tasks completed without errors. TypeScript confirmed zero errors in schema.ts and queries.ts after all changes.

## User Setup Required

None - no external service configuration required. Migration SQL is ready to apply once PostgreSQL is available (existing prerequisite from Phase 1).

## Next Phase Readiness

- Schema has all columns needed for Kanban (blocked_by), Gantt (start_date, milestone_id), and progress rollup (percent_complete)
- @dnd-kit packages ready for Kanban board implementation (03-03)
- frappe-gantt ready for Gantt chart implementation (03-04)
- sonner ready for toast notifications throughout Phase 3 write surfaces
- getTasksForProject and updateWorkstreamProgress ready for all task write views

---
*Phase: 03-write-surface-+-plan-builder*
*Completed: 2026-03-20*
