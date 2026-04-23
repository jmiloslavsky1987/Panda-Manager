---
phase: 76-pickers-risk-fields
plan: 02
subsystem: ui
tags: [react, typescript, pickers, blocked-by, milestone, task-board, wbs, drizzle]

# Dependency graph
requires:
  - phase: 76-pickers-risk-fields
    plan: 01
    provides: owner_id FK in TaskEditModal form state (must be preserved)
  - phase: 75-schema-quick-wins
    provides: blocked_by + milestone_id FK columns on tasks table

provides:
  - TaskWithBlockedStatus type: extends Task with is_blocked + milestone_name fields
  - getTasksForProject returns TaskWithBlockedStatus[] with left-joined milestone_name
  - TaskEditModal: searchable single-select Blocked By (task titles) + Linked Milestone (names) dropdowns
  - TaskBoard: red "Blocked" badge on cards when is_blocked; milestone name label below title
  - WbsTree/WbsNode: "Blocked" badge on WBS rows whose phase name matches a blocked task

affects:
  - 77-intelligence-gantt (consumes getTasksForProject — now returns TaskWithBlockedStatus[])

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Left join milestones in getTasksForProject for milestone_name — avoids separate prop drilling"
    - "blockedPhases Set<string> computed in WbsTree useMemo; passed to WbsNode as blockedPhases prop"
    - "TaskEditModal fetches /api/tasks?projectId=N (camelCase) + /api/projects/{id}/milestones on open"

key-files:
  created: []
  modified:
    - lib/queries.ts
    - components/TaskEditModal.tsx
    - components/TaskBoard.tsx
    - components/WbsTree.tsx
    - components/WbsNode.tsx
    - app/customer/[id]/wbs/page.tsx

key-decisions:
  - "Left join milestones in getTasksForProject to include milestone_name — no extra prop on TaskBoard"
  - "Tasks API uses ?projectId=N (camelCase) not ?project_id=N — matched actual route implementation"
  - "Milestones API is /api/projects/{id}/milestones returning {milestones:[...]} — not /api/milestones"
  - "Single-select only for blocked_by per locked CONTEXT.md decision — PICK-03 multi-select superseded"
  - "blockedPhases Set propagated from WbsTree to WbsNode to all recursive children via prop"

patterns-established:
  - "TaskWithBlockedStatus extends Task — structural typing keeps all callers compatible"
  - "WbsNode blocked badge: check blockedPhases?.has(node.name.toLowerCase())"

requirements-completed:
  - PICK-03
  - PICK-04
  - PICK-05

# Metrics
duration: 6min
completed: 2026-04-23
---

# Phase 76 Plan 02: Pickers & Risk Fields — Blocked-By/Milestone Pickers + Blocked Indicators Summary

**Searchable blocked-by and milestone pickers in TaskEditModal; red Blocked badges and milestone name labels on Task Board cards and WBS rows**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-23T01:16:22Z
- **Completed:** 2026-04-23T01:22:02Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- `getTasksForProject` now returns `TaskWithBlockedStatus[]` with two computed fields:
  - `is_blocked`: true when `blocked_by != null` and the blocker's status is not 'done'
  - `milestone_name`: left-joined from milestones table (null when `milestone_id` is null)
- `TaskEditModal` replaces raw number inputs with single-select dropdowns:
  - "Blocked By": fetches non-done tasks via `GET /api/tasks?projectId=N`, filters out current task and done tasks
  - "Linked Milestone": fetches via `GET /api/projects/{id}/milestones`, shows names
  - `owner_id` form state from plan 76-01 fully preserved
- `TaskBoard` updated to use `TaskWithBlockedStatus`:
  - Red "Blocked" badge shown on cards when `task.is_blocked` is true
  - Milestone name label shown below task title when `task.milestone_name` is set
- `WbsTree` computes `blockedPhases: Set<string>` from tasks prop (phase names of blocked tasks, lowercased)
- `WbsNode` receives `blockedPhases` and renders a "Blocked" badge when the node's name matches a blocked phase
- `wbs/page.tsx` queries tasks via `getTasksForProject` and passes to WbsTree; `export const dynamic = 'force-dynamic'` already present

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend getTasksForProject to return TaskWithBlockedStatus** - `33e32050` (feat)
2. **Task 2: Upgrade TaskEditModal pickers + TaskBoard/WbsTree indicators** - `36a49c22` (feat)

## Files Created/Modified

- `lib/queries.ts` - Added `TaskWithBlockedStatus` interface; updated `getTasksForProject` with left join for `milestone_name` and in-memory `is_blocked` computation
- `components/TaskEditModal.tsx` - Added `useEffect` for picker data fetch; replaced blocked_by + milestone_id inputs with `<select>` dropdowns; `projectTasks`/`projectMilestones` state
- `components/TaskBoard.tsx` - Updated all `Task` type references to `TaskWithBlockedStatus`; replaced old blocked indicator with `is_blocked` badge; added `milestone_name` label below title
- `components/WbsTree.tsx` - Added optional `tasks` prop; added `blockedPhases` useMemo; passes `blockedPhases` to WbsNode
- `components/WbsNode.tsx` - Added `blockedPhases?: Set<string>` prop; compute `hasBlockedTask`; render "Blocked" badge inline; propagate `blockedPhases` to recursive children
- `app/customer/[id]/wbs/page.tsx` - Import and call `getTasksForProject`; pass `tasks` to WbsTree

## Decisions Made

- Used left join in `getTasksForProject` to include `milestone_name` — avoids adding a `milestones` prop to `TaskBoard`, keeping its interface minimal
- Discovered that `GET /api/tasks` uses `?projectId=N` (camelCase), not `?project_id=N` as the plan suggested — fixed to match actual route
- Discovered milestones GET is at `/api/projects/{id}/milestones` (returns `{milestones: [...]}`) not `/api/milestones?project_id=N` — fixed accordingly
- Blocked-by is single-select only per the CONTEXT.md locked decision; PICK-03 multi-select requirement is superseded

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] API endpoint mismatch for tasks and milestones**
- **Found during:** Task 2
- **Issue:** Plan specified `fetch('/api/tasks?project_id=${projectId}')` but actual GET route uses `?projectId=N` (camelCase). Similarly, plan specified `fetch('/api/milestones?project_id=N')` but that route has no GET handler; actual endpoint is `/api/projects/{id}/milestones` returning `{milestones: [...]}`.
- **Fix:** Used `?projectId=${projectId}` for tasks and `/api/projects/${projectId}/milestones` for milestones; parsed `.milestones` from the response object
- **Files modified:** `components/TaskEditModal.tsx`
- **Commit:** `36a49c22`

**2. [Rule 2 - Enhancement] Add milestone_name via left join instead of prop drilling**
- **Found during:** Task 2 planning
- **Issue:** Plan gave two options — either add a join to include `milestone_name` in the task, or pass a `milestones[]` prop to TaskBoard. The join approach requires fewer new props and is cleaner.
- **Fix:** Added left join on `milestones.id = tasks.milestone_id` in `getTasksForProject`; added `milestone_name: string | null` to `TaskWithBlockedStatus`
- **Files modified:** `lib/queries.ts`
- **Commit:** `36a49c22`

## Issues Encountered

Pre-existing TypeScript errors in test files (`__tests__/`, `tests/`, `lib/__tests__/`) were present before this plan and are out of scope.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plans 76-03 and 76-04 can proceed — no blocking dependencies from this plan
- 76-03 will add risk structured fields (likelihood, impact, target_date, score) + risks PATCH owner_id
- 76-04 addresses tasks-bulk multi-tenant security gap

## Self-Check: PASSED

- lib/queries.ts: FOUND
- components/TaskEditModal.tsx: FOUND
- components/TaskBoard.tsx: FOUND
- components/WbsTree.tsx: FOUND
- components/WbsNode.tsx: FOUND
- app/customer/[id]/wbs/page.tsx: FOUND
- Commit 33e32050: FOUND
- Commit 36a49c22: FOUND
- force-dynamic in wbs/page.tsx: FOUND
- Zero production TypeScript errors: CONFIRMED

---
*Phase: 76-pickers-risk-fields*
*Completed: 2026-04-23*
