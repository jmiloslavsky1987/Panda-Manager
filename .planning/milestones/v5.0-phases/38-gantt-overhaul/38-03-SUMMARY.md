---
phase: 38-gantt-overhaul
plan: "03"
subsystem: gantt-ui
tags: [ui, gantt, accordion, drag-drop, date-editing]
requires:
  - frappe-gantt-integration
  - tasks-api-patch
  - milestones-data
provides:
  - accordion-swim-lanes
  - view-mode-toggle
  - drag-to-reschedule
  - milestone-grouping
  - gantt-ready-state
affects:
  - bigpanda-app/components/GanttChart.tsx
  - bigpanda-app/app/customer/[id]/plan/gantt/page.tsx
tech_stack:
  added:
    - sonner-toast-integration
  patterns:
    - accordion-state-management
    - frappe-gantt-reinit-pattern
    - optimistic-rollback
key_files:
  created: []
  modified:
    - bigpanda-app/components/GanttChart.tsx: "Complete rewrite with accordion swim lanes, view toggle, drag-to-reschedule, and ganttReady state"
    - bigpanda-app/app/customer/[id]/plan/gantt/page.tsx: "Updated mapTasksToGantt to encode milestone info in custom_class"
decisions:
  - decision: "Use gantt-ms-{milestoneId} prefix in custom_class for grouping tasks by milestone"
    rationale: "GanttTask doesn't carry milestone_id; encoding in custom_class allows client-side filtering without API changes"
  - decision: "All accordion groups collapsed by default"
    rationale: "Large projects with many milestones would be overwhelming if all expanded; user opts into viewing specific groups"
  - decision: "Re-initialize frappe-gantt on expansion/collapse rather than show/hide tasks"
    rationale: "frappe-gantt doesn't support dynamic task filtering; re-init ensures correct y-axis positioning"
  - decision: "Set ganttReady to false at start of re-init, true in .then() callback"
    rationale: "Prevents Plan 38-04 marker injection from running against stale SVG during transition"
metrics:
  duration_seconds: 119
  tasks_completed: 1
  commits: 1
  files_modified: 2
  tests_added: 0
  tests_fixed: 0
  completed_at: "2026-04-06T18:54:37Z"
---

# Phase 38 Plan 03: Accordion Swim Lanes & Drag-to-Reschedule Summary

**One-liner:** Rewrite GanttChart.tsx with milestone-grouped accordion swim lanes, Day/Week/Month/Quarter Year view toggle, and drag-to-reschedule with optimistic rollback — transforms flat timeline into a grouped, interactive planning tool.

## What Was Built

### Core Features

1. **Accordion Swim Lanes**
   - Each milestone renders as a collapsible accordion header showing name and task count
   - "Unassigned" lane at bottom for tasks without milestone_id (muted styling)
   - All groups collapsed by default for clean initial state
   - Empty milestones still render as headers (0 tasks)

2. **View Mode Toggle**
   - Button group in header: Day, Week, Month, Quarter Year
   - Default view: Month (changed from Week for project-scale timelines)
   - Active button: zinc-800 bg, white text
   - Inactive buttons: white bg, zinc-600 text, hover:zinc-50

3. **Drag-to-Reschedule**
   - on_date_change callback fires PATCH /api/tasks/:id with start_date and due
   - Silent success (no toast on save)
   - On error: rollback bar positions via ganttRef.current.refresh(originalTasks)
   - Error toast: "Failed to save new dates"

4. **Milestone Grouping via custom_class**
   - Updated mapTasksToGantt to encode milestone info: `gantt-ms-{milestoneId} gantt-milestone-{index % 6}`
   - Preserves priority classes: `gantt-high-priority`, `gantt-low-priority`
   - GanttChart filters tasks by custom_class prefix to build groups

5. **ganttReady State**
   - Boolean state: false initially and at start of re-init, true after frappe-gantt initializes
   - Exported for Plan 38-04 milestone marker injection effect
   - Prevents marker injection from running against stale SVG

### Technical Implementation

**State Management:**
- `viewMode`: ViewMode state (default 'Month')
- `expandedGroups`: Set<string> tracking which accordion groups are open
- `ganttReady`: boolean flag for Plan 38-04 marker injection timing
- `tasksRef`: useRef holding current visible tasks for rollback

**Render Flow:**
1. Compute groups from tasks + milestones (filtered by custom_class)
2. Compute visibleTasks from expanded groups
3. Render accordion headers (all milestones + Unassigned)
4. If visibleTasks.length > 0, render frappe-gantt SVG
5. Else show "Expand a milestone group" message

**useEffect Dependencies:**
- Re-init frappe-gantt when `visibleTasks` or `viewMode` changes
- visibleTasks derived from tasks + expandedGroups, so expansion triggers re-init

**Anti-patterns Avoided:**
- Did NOT inject milestone header tasks into frappe-gantt task list
- Did NOT call ganttRef.current.change_view_mode() directly
- Did NOT set ganttRef.current = null after assigning new instance

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

**TypeScript Compilation:**
```bash
npx tsc --noEmit
# No errors in GanttChart.tsx or gantt/page.tsx
```

**Unit Tests:**
```bash
npx vitest run tests/api/tasks-patch-dates.test.ts
# 6 passed (6)
```

**Pre-existing Issues:**
- TypeScript errors in audit test files (unrelated to this plan)
- These were out of scope — not caused by this task's changes

## Requirements Fulfilled

- **GNTT-02:** Tasks displayed under collapsible milestone headers ✓
- **GNTT-03:** Day/Week/Month/Quarter Year button group in header ✓
- **GNTT-04:** Dragging task bar fires PATCH with rollback on error ✓
- **PLAN-03:** gantt-milestone-N custom_class applied per milestone index ✓

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Rewrite GanttChart.tsx with swim lanes, view toggle, and drag-to-reschedule | 88361ca | GanttChart.tsx, gantt/page.tsx |

## Next Steps

Plan 38-04 will inject milestone markers onto the frappe-gantt SVG using the `ganttReady` state flag to ensure markers are added after initialization completes.

## Self-Check: PASSED

**Files Created/Modified:**
```bash
# Modified files exist
FOUND: bigpanda-app/components/GanttChart.tsx
FOUND: bigpanda-app/app/customer/[id]/plan/gantt/page.tsx
```

**Commits:**
```bash
# Commit exists
FOUND: 88361ca
```

All claims verified.
