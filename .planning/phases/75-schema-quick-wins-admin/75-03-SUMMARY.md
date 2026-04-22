---
phase: 75-schema-quick-wins-admin
plan: 03
subsystem: ui
tags: [dnd-kit, react, kanban, bulk-actions, drizzle-orm, nextjs, rls]

# Dependency graph
requires:
  - phase: 75-01
    provides: DB schema with tasks.project_id and requireProjectRole auth helper
provides:
  - DroppableColumn wrapper in TaskBoard.tsx enabling empty-column drag targets
  - DELETE /api/tasks-bulk handler with requireProjectRole + SET LOCAL RLS
  - "Delete Selected" button in BulkToolbar for multi-task deletion
affects: [76-pickers-risk-fields, testing, task-board]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useDroppable wraps SortableContext children to give columns DnD identity independent of item count"
    - "Bulk actions: mode===null toolbar branch contains all action buttons; specialized modes render inline forms"
    - "tasks-bulk DELETE: first task's project_id drives requireProjectRole check before inArray delete"

key-files:
  created: []
  modified:
    - /Users/jmiloslavsky/Documents/Panda-Manager/components/TaskBoard.tsx
    - /Users/jmiloslavsky/Documents/Panda-Manager/app/api/tasks-bulk/route.ts

key-decisions:
  - "DroppableColumn placed inside SortableContext (not outside) so SortableContext still owns sort logic while DroppableColumn provides the droppable surface for empty-column detection"
  - "No confirmation dialog for bulk delete — consistent with CONTEXT.md decision"
  - "requireProjectRole check uses first task_id's project_id; partial cross-project deletes rejected at DB RLS layer"
  - "void session at end of DELETE handler to suppress TS unused-variable warning — session validated earlier via requireSession"

patterns-established:
  - "DroppableColumn pattern: useDroppable({ id: columnId }) inside column wrapper; isOver drives border-blue-400 bg-blue-50 highlight"
  - "tasks-bulk destructive ops: requireSession + requireProjectRole(firstTask.project_id) + db.transaction with SET LOCAL RLS"

requirements-completed: [TASK-01, TASK-02, TASK-03]

# Metrics
duration: 15min
completed: 2026-04-22
---

# Phase 75 Plan 03: Task Board Drag-to-Empty-Column + Bulk Delete Summary

**useDroppable-per-column fixes empty-column drop targets in dnd-kit; DELETE /api/tasks-bulk + BulkToolbar "Delete Selected" button adds multi-task deletion with RLS-safe auth**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-22T20:10:00Z
- **Completed:** 2026-04-22T20:25:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `DroppableColumn` component with `useDroppable` so every Kanban column — including empty ones — is a valid DnD drop target; dragging to an empty column now resolves `over.id` correctly in `handleDragEnd`
- Added `DELETE /api/tasks-bulk` handler with `requireSession` + `requireProjectRole` + transactional RLS (`SET LOCAL app.current_project_id`) before `inArray` delete
- Added `handleBulkDelete` function and "Delete Selected" red-border button in `BulkToolbar` mode===null branch; existing bulk status/owner/due/phase actions unaffected

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix empty-column droppability** - `afdcfa3e` (feat)
2. **Task 2: Bulk delete — BulkToolbar + tasks-bulk DELETE** - `a30da86d` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `/Users/jmiloslavsky/Documents/Panda-Manager/components/TaskBoard.tsx` - Added `useDroppable` import, `DroppableColumn` component, replaced bare div with DroppableColumn in render, added `handleBulkDelete` and "Delete Selected" button to BulkToolbar
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/tasks-bulk/route.ts` - Added `NextResponse`, `sql`, `eq`, `requireProjectRole` imports; added `DELETE` handler with auth + RLS + inArray delete

## Decisions Made
- `DroppableColumn` sits inside `SortableContext` rather than outside — `SortableContext` manages sort ordering among items within the column; `DroppableColumn` provides the droppable surface that `handleDragEnd` resolves via `over.id`. Nesting order: `SortableContext > DroppableColumn > TaskCard[]`.
- No delete confirmation dialog — matches the existing design intent noted in plan context ("No confirmation required").
- `requireProjectRole` is called with the `project_id` from the first task; this is sufficient for the common case where all selected tasks belong to the same project. Full per-task validation would be O(n) queries — deferred to Phase 76 which closes the broader tasks-bulk multi-tenant gap.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in `__tests__/lifecycle/archive.test.ts` (Type 'Response' missing NextResponse properties, `mockWhere` block-scoped variable issues) were present before this plan and are out of scope. No new errors introduced.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TASK-01, TASK-02, TASK-03 complete: Kanban drag cross-column (including to empty columns), bulk status change, and bulk delete all functional
- Phase 76 can safely extend tasks-bulk with the full multi-tenant security fix (per-task project_id validation via `inArray` on `tasks.project_id`)
- No blockers for Phase 76 (pickers and risk fields)

---
*Phase: 75-schema-quick-wins-admin*
*Completed: 2026-04-22*
