---
phase: 68
plan: 03
subsystem: gantt-wbs-rows
tags: [wbs, gantt, ui, data-model, tdd]
dependency_graph:
  requires: [68-01, 68-02]
  provides: [wbs-row-model, gantt-wbs-skeleton]
  affects: [gantt-ui, wbs-task-grouping]
tech_stack:
  added: []
  patterns: [wbs-summary-rows, span-computation, placeholder-bars]
key_files:
  created: []
  modified:
    - bigpanda-app/lib/queries.ts
    - bigpanda-app/app/customer/[id]/gantt/page.tsx
    - bigpanda-app/components/GanttChart.tsx
    - bigpanda-app/tests/components/GanttChart-wbs-rows.test.ts
decisions:
  - WBS-item-based row model replaces milestone grouping for static skeleton structure
  - Empty WBS rows show dashed placeholder bar (4 weeks, opacity 0.3) instead of hiding
  - buildWbsRows exported as pure function for testability and span computation
  - Server page pre-groups tasks by WBS assignment, passing wbsRows prop to GanttChart
metrics:
  duration_seconds: 340
  tasks_completed: 3
  commits: 2
  tests_added: 4
  tests_passing: 4
  completed_at: "2026-04-16T18:56:00Z"
---

# Phase 68 Plan 03: WBS-Based Gantt Row Model Summary

**One-liner:** Redesigned Gantt chart to show WBS level-1 items as static row skeleton with task grouping, replacing milestone-based dynamic rows.

## What Was Built

Transformed the GanttChart from milestone-grouping to WBS-item-based rows, establishing the "static structural skeleton" required by DLVRY-01:

1. **Query Layer (Task 1):** Added `getWbsTaskAssignments(projectId)` to fetch wbs_item_id/task_id pairs across all tracks
2. **Server Component (Task 2):** Updated gantt/page.tsx to fetch both ADR and Biggy WBS items, compute task groupings, and pass structured wbsRows prop
3. **UI Component (Task 3):** Redesigned GanttChart with WbsSummaryRow type, buildWbsRows span computation, placeholder bars for empty rows, and all existing drag/scroll/zoom infrastructure intact

## Tasks Completed

| Task | Name                                      | Commit  | Files Modified                                      |
| ---- | ----------------------------------------- | ------- | --------------------------------------------------- |
| 1    | Add getWbsTaskAssignments query           | 5800bbd | bigpanda-app/lib/queries.ts                         |
| 2-3  | Update gantt page + redesign GanttChart   | 174cd0b | gantt/page.tsx, GanttChart.tsx, test file           |

## Key Changes

### Query Layer
- **getWbsTaskAssignments:** Returns all wbs_item_id/task_id pairs for a project (inner join with wbsItems to filter by project_id)
- **Import:** Added wbsTaskAssignments to schema imports in queries.ts

### Server Component (gantt/page.tsx)
- **Fetches WBS data:** Parallel fetch of ADR + Biggy WBS items via getWbsItems
- **Assignment grouping:** Uses mapDataToWbsRows to build GanttWbsRow[] with tasks pre-grouped by WBS parent
- **Unassigned handling:** Computes unassignedTasks array for tasks with no WBS assignment
- **Props:** Passes wbsRows + unassignedTasks + milestones to GanttChart

### GanttChart Component
- **Row model:** Replaced MilestoneRow with WbsSummaryRow (wbsId, label, colorIdx, tasks, spanStart, spanEnd)
- **buildWbsRows export:** Pure function computes span from earliest task start to latest task end; returns spanStart=null/spanEnd=null for empty WBS rows
- **Placeholder bars:** Empty WBS rows show dashed bar (28 days from timeline start + 7, opacity 0.3, dashed border)
- **Toolbar:** Updated text to "X tasks · Y phases · Z milestones"
- **Infrastructure intact:** All drag handlers, scroll sync, panel resize, zoom, and milestone markers unchanged

### Tests
- **GanttChart-wbs-rows.test.ts:** Updated to import real buildWbsRows function; all 4 tests GREEN
  - Empty WBS row → spanStart/spanEnd null
  - Two tasks → span computed from earliest start to latest end
  - Unassigned tasks → fall into 'unassigned' group
  - Task nesting → tasks properly nested under WBS parent

## Verification Results

- **TypeScript:** All modified files compile with no errors
- **Tests:** 4/4 GanttChart-wbs-rows tests GREEN
- **Self-check:** All files exist, all commits verified

## Deviations from Plan

None — plan executed exactly as written.

## Next Steps (Plan 04)

Plan 04 will extend the drag infrastructure to support:
- Edge drag (resize task duration)
- WBS summary bar drag (shift all child tasks)
- Cascade updates to dependent tasks
- PATCH API alignment for start_date and due fields

## Self-Check: PASSED

All files exist:
- FOUND: bigpanda-app/lib/queries.ts
- FOUND: bigpanda-app/app/customer/[id]/gantt/page.tsx
- FOUND: bigpanda-app/components/GanttChart.tsx

All commits exist:
- FOUND: 5800bbd
- FOUND: 174cd0b
