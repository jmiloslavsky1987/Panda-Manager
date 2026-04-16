---
phase: 68-gantt-bi-directional-sync
plan: 04
subsystem: ui-gantt-interaction
tags: [gantt, drag-drop, edge-drag, milestone-drag, inline-editing, tdd-green]
dependency_graph:
  requires: [68-03]
  provides: [computeEdgeDrag, edge-handles, milestone-drag, inline-date-cells]
  affects: [GanttChart]
tech_stack:
  added: [DatePickerCell-integration]
  patterns: [edge-drag-clamping, milestone-optimistic-ui, inline-date-editing]
key_files:
  created: []
  modified: [bigpanda-app/components/GanttChart.tsx, bigpanda-app/tests/components/GanttChart-edge-drag.test.ts, bigpanda-app/tests/components/GanttChart-inline-dates.test.ts]
decisions: []
metrics:
  duration_minutes: 5
  tasks_completed: 2
  tests_added: 0
  tests_updated: 2
  tests_passing: 10
  files_modified: 3
  commits: 2
  completion_date: "2026-04-16"
---

# Phase 68 Plan 04: Edge Drag Handles + Milestone Drag + Inline Date Cells Summary

**One-liner:** Edge drag handles on task/WBS bars with left/right clamping, draggable milestone markers, and DatePickerCell-based inline date editing in left panel.

## Objectives Achieved

Extended Gantt chart drag infrastructure to support:
- Edge-specific drag (left edge = start only, right edge = due only) with 1-day minimum span clamping
- Draggable milestone dashed-line markers with optimistic UI updates
- Inline date editing via DatePickerCell in left panel Start/Due columns
- WBS summary bar edge drag that shifts all child tasks by same delta

All DLVRY-02 requirements met: users can adjust dates by dragging bar edges, milestone lines, or clicking date cells.

## Tasks Completed

### Task 1: Export computeEdgeDrag + Extend dragRef for Edge Drag (TDD)
**Commit:** `41d4547`

**Changes:**
- Added `computeEdgeDrag` pure function with side-specific logic and clamping
  - Left edge: moves start only; clamps to `end - 1 day`
  - Right edge: moves due only; clamps to `start + 1 day`
- Extended `dragRef` type with `side: 'move' | 'left' | 'right'` and `wbsChildOriginals` array
- Added `onEdgeMouseDown` handler with `e.stopPropagation()` to prevent whole-bar drag conflict
- Updated `onMove` to branch on `side` and call `computeEdgeDrag` for left/right, or shift both for move
- Updated `onUp` to:
  - PATCH only changed fields based on side (`start_date` for left, `due` for right, both for move)
  - Handle WBS summary drag by PATCHing all children with same delta
- Updated test file to import real `computeEdgeDrag`; all 4 edge drag tests GREEN

**Verification:**
```bash
cd bigpanda-app && npx vitest run tests/components/GanttChart-edge-drag.test.ts
✓ 4/4 tests GREEN
```

### Task 2: Add Edge Handles, Milestone Drag, and Inline Date Cells
**Commit:** `2271238`

**Changes:**
- Added `DatePickerCell` import for inline date editing
- Added `milestoneOverride` state for optimistic milestone position updates during drag
- Updated `markerPositions` useMemo to use `milestoneOverride.get(m.id) ?? parseDate(m.date!)` as `effectiveDate`
- Added `milestoneDragRef` and separate `useEffect` for milestone drag lifecycle
  - `onMsMove`: updates `milestoneOverride` with new date
  - `onMsUp`: PATCHes `/api/milestones/{id}` with `{ date: fmtISO(curDate) }`
- Made milestone dashed line draggable:
  - Changed `pointer-events-none` to `pointer-events-auto`
  - Added `cursor-ew-resize` and `onMouseDown` handler
- Replaced static date displays in left panel task rows with `DatePickerCell`:
  - Start cell: PATCHes `start_date` field, updates `dragOverride` with new start
  - Due cell: PATCHes `due` field, updates `dragOverride` with new end
- Added left/right edge handles to task bars:
  - `w-1.5`, `cursor-ew-resize`, `hover:bg-black/20`, `z-20` for layering
  - Left handle at `left: 0`, right handle at `right: 0`
  - Calls `onEdgeMouseDown` with appropriate `side` param
- Added edge handles and drag support to WBS summary bars:
  - Populated `childOriginals` array from `row.tasks`
  - Passed to `onBarMouseDown` and `onEdgeMouseDown` for WBS summary bar
  - Whole-bar drag and edge drag both shift all children by same delta
- Updated inline dates test to use correct field wiring pattern; all 2 tests GREEN

**Verification:**
```bash
cd bigpanda-app && npx vitest run tests/components/GanttChart-inline-dates.test.ts
✓ 2/2 tests GREEN
```

## Test Results

All Gantt TDD tests GREEN:
- `GanttChart-edge-drag.test.ts`: 4/4 passed
- `GanttChart-inline-dates.test.ts`: 2/2 passed
- `GanttChart-wbs-rows.test.ts`: 4/4 passed (unchanged from Plan 03)

**Total:** 10/10 Gantt tests passing

TypeScript build clean for GanttChart.tsx.

## Deviations from Plan

None — plan executed exactly as written.

## Technical Decisions

### Edge Handle z-index Layering
Edge handles use `z-20` to ensure they're above the bar content (z-5/z-30) but below milestone markers (z-10). This prevents click target conflicts.

### WBS Summary Drag Shifts All Children
When dragging a WBS summary bar (whole-bar or edge), all child tasks shift by the same delta. This maintains relative task spacing within the phase, which is the expected behavior for a phase-level reschedule operation.

### Milestone Drag Uses Separate Ref
Milestone drag uses `milestoneDragRef` instead of reusing `dragRef` to avoid state conflicts. Milestones and tasks can theoretically be dragged simultaneously if multiple mouse events fire (edge case), and separate refs isolate their state cleanly.

### DatePickerCell Error Handling
DatePickerCell handles fetch errors internally with optimistic rollback via `setOptimisticValue(prev)`. GanttChart's `onSave` callbacks do not need additional error handling beyond the fetch calls.

## Next Steps

Plan 68-05 (final plan in phase): Full integration verification + human verification gate to confirm:
- Edge drag UX (cursor changes, clamping, visual feedback)
- Milestone drag UX (dashed line remains visible during drag, position updates)
- Inline date cell UX (popover opens, save persists, bar updates without router.refresh)
- WBS summary drag shifts all child tasks visually and persists correctly

## Self-Check: PASSED

**Created files:** None (all modifications to existing files)

**Modified files:**
- ✓ `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/components/GanttChart.tsx`
- ✓ `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/tests/components/GanttChart-edge-drag.test.ts`
- ✓ `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/tests/components/GanttChart-inline-dates.test.ts`

**Commits:**
- ✓ `41d4547`: feat(68-04): export computeEdgeDrag and extend dragRef for edge drag
- ✓ `2271238`: feat(68-04): add edge handles, milestone drag, and inline date cells

All claims verified.
