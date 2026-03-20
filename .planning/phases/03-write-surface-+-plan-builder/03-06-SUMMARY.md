---
phase: 03-write-surface-+-plan-builder
plan: 06
subsystem: ui
tags: [dnd-kit, exceljs, kanban, tasks, plan-builder, next-js, drizzle]

# Dependency graph
requires:
  - phase: 03-02
    provides: tasks table with blocked_by, milestone_id, start_date; getTasksForProject, getPlanTemplates, updateWorkstreamProgress in queries.ts
  - phase: 03-05
    provides: PlanTabs nav, plan layout with 4 stub pages (board, tasks, gantt, swimlane)
provides:
  - POST/GET /api/tasks — create and list tasks with PLAN-09 workstream rollup
  - PATCH/DELETE /api/tasks/:id — partial update and delete
  - POST /api/tasks-bulk — bulk update owner/due/phase/status
  - GET /api/plan-export/:projectId — KAISER-format xlsx download via ExcelJS
  - POST /api/plan-import — parse KAISER xlsx and create tasks
  - TaskEditModal — shadcn Dialog for create/edit with all PLAN-01 fields
  - TaskBoard — 4-column status Kanban with @dnd-kit drag, bulk toolbar
  - PhaseBoard — phase-column Kanban with DnD, template picker, export/import
  - /customer/:id/plan/tasks — RSC page wired to TaskBoard
  - /customer/:id/plan/board — RSC page wired to PhaseBoard
affects: [03-07-gantt, 03-08-swimlane, tests/e2e]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "@dnd-kit/core + @dnd-kit/sortable for drag-and-drop Kanban (PointerSensor with 5px activation)"
    - "Optimistic UI: update local state immediately, revert on PATCH failure, router.refresh() on success"
    - "RSC passes DB data to client components as props — no client-side fetching on page load"
    - "ExcelJS buffer cast via eslint-disable any — Buffer<ArrayBuffer> type mismatch with ExcelJS overload"

key-files:
  created:
    - bigpanda-app/app/api/tasks/route.ts
    - bigpanda-app/app/api/tasks/[id]/route.ts
    - bigpanda-app/app/api/tasks-bulk/route.ts
    - bigpanda-app/app/api/plan-export/[projectId]/route.ts
    - bigpanda-app/app/api/plan-import/route.ts
    - bigpanda-app/components/TaskEditModal.tsx
    - bigpanda-app/components/TaskBoard.tsx
    - bigpanda-app/components/PhaseBoard.tsx
  modified:
    - bigpanda-app/app/customer/[id]/plan/tasks/page.tsx
    - bigpanda-app/app/customer/[id]/plan/board/page.tsx

key-decisions:
  - "ExcelJS load() Buffer type incompatibility with @types/node 20.x — used eslint-disable any cast; works at runtime"
  - "PhaseBoard derives columns dynamically from task.phase values; falls back to DEFAULT_PHASES if no tasks"
  - "Bulk toolbar shows only when 2+ tasks selected (inline mode: owner/due/phase inputs appear in-toolbar)"
  - "Template instantiation loops POST /api/tasks for each task in template.data.tasks array (no batch endpoint needed)"

patterns-established:
  - "Pattern: @dnd-kit/sortable per column with SortableContext; DragEnd resolves target by checking if over.id matches column ID or task ID in that column"
  - "Pattern: Optimistic UI — setTasks optimistically, revert on fetch error, router.refresh() on success"

requirements-completed: [PLAN-01, PLAN-02, PLAN-03, PLAN-07, PLAN-08, PLAN-09, PLAN-10, PLAN-11]

# Metrics
duration: 6min
completed: 2026-03-20
---

# Phase 3 Plan 06: Task + Phase Board Summary

**Full Kanban plan builder with @dnd-kit drag-and-drop, TaskEditModal (all PLAN-01 fields), bulk ops, template instantiation, and KAISER xlsx import/export via ExcelJS**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-20T14:13:23Z
- **Completed:** 2026-03-20T14:19:02Z
- **Tasks:** 2/2
- **Files modified:** 10

## Accomplishments
- Full CRUD task API (POST/GET/PATCH/DELETE) with PLAN-09 workstream progress rollup on every mutation
- 4-column status Kanban (TaskBoard) with @dnd-kit drag, optimistic updates, bulk select toolbar
- Phase-column Kanban (PhaseBoard) with dynamic phases, template picker, xlsx export/import
- TaskEditModal covering all PLAN-01 fields: title, description, owner, due, start_date, priority, type, phase, status, blocked_by, milestone_id

## Task Commits

Each task was committed atomically:

1. **Task 1: Build task API routes (CRUD + bulk + import + export)** - `21d854a` (feat)
2. **Task 2: Build TaskEditModal, TaskBoard, PhaseBoard + wire plan pages** - `23a8ba8` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `bigpanda-app/app/api/tasks/route.ts` — POST create task + GET list by projectId
- `bigpanda-app/app/api/tasks/[id]/route.ts` — PATCH partial update + DELETE
- `bigpanda-app/app/api/tasks-bulk/route.ts` — POST bulk update owner/due/phase/status
- `bigpanda-app/app/api/plan-export/[projectId]/route.ts` — GET xlsx export in KAISER format
- `bigpanda-app/app/api/plan-import/route.ts` — POST multipart xlsx import
- `bigpanda-app/components/TaskEditModal.tsx` — shadcn Dialog, create/edit modes, all PLAN-01 fields
- `bigpanda-app/components/TaskBoard.tsx` — 4-column status Kanban with DnD + bulk toolbar
- `bigpanda-app/components/PhaseBoard.tsx` — phase-column Kanban with DnD + template/export/import
- `bigpanda-app/app/customer/[id]/plan/tasks/page.tsx` — RSC → TaskBoard
- `bigpanda-app/app/customer/[id]/plan/board/page.tsx` — RSC → PhaseBoard

## Decisions Made
- ExcelJS `load()` signature expects legacy `Buffer` type; `@types/node` 20.x returns `Buffer<ArrayBuffer>`. Used `any` cast with eslint-disable comment — works at runtime, avoids patching types.
- PhaseBoard derives phase columns dynamically from existing task phases. Falls back to `['Discovery', 'Design', 'Build', 'Test', 'Go-Live']` default if no tasks exist yet.
- Bulk toolbar shows in-place micro-forms (owner/due/phase inputs) rather than modal overlays — keeps the interaction lightweight.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Buffer type mismatch in plan-import ExcelJS.load() call**
- **Found during:** Task 1 (TypeScript verification)
- **Issue:** `Buffer.from(arrayBuffer)` returns `Buffer<ArrayBufferLike>` in @types/node 20.x but ExcelJS type signature requires legacy `Buffer`
- **Fix:** Used `eslint-disable-next-line @typescript-eslint/no-explicit-any` cast — runtime is correct, TS overload is an ExcelJS type definition lag
- **Files modified:** bigpanda-app/app/api/plan-import/route.ts
- **Verification:** `npx tsc --noEmit` — no errors in api/plan files
- **Committed in:** 21d854a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking TS error)
**Impact on plan:** Purely a type-definition compatibility issue. No behavior change. No scope creep.

## Issues Encountered
None — beyond the Buffer/ExcelJS TS type issue above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Task data exists in DB after Task Board + Phase Board create/import operations
- 03-07 (Gantt) and 03-08 (Swimlane) can now query tasks via getTasksForProject()
- Tasks have start_date + due + phase + milestone_id — all fields Gantt/Swimlane views need

---
*Phase: 03-write-surface-+-plan-builder*
*Completed: 2026-03-20*
