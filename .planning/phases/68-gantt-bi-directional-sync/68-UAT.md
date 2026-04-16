---
status: complete
phase: 68-gantt-bi-directional-sync
source: 68-02-SUMMARY.md, 68-03-SUMMARY.md, 68-04-SUMMARY.md
started: 2026-04-16T22:00:00Z
updated: 2026-04-16T22:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. ADR / Biggy Track Separation
expected: Open the Gantt tab for a project. The left panel shows a labeled "ADR" section header above ADR phase rows and a "Biggy" section header above Biggy phase rows. The two tracks are not mixed together.
result: pass

### 2. WBS Hierarchy Expansion
expected: Clicking an L1 phase row expands it to reveal L2 child rows, each indented further right than L1. Clicking an L2 row with children expands it to show L3 rows, indented further right than L2. Rows with no children show a dash (–) instead of a chevron.
result: pass

### 3. Task Grouping Under WBS Phases
expected: Expanding a WBS phase row (that has tasks) shows the tasks nested below it. Tasks that match the phase should NOT appear only in an "Unassigned" row — they should be grouped under their WBS parent.
result: pass

### 4. Milestone Date Edit (Milestones Tab)
expected: On the Milestones tab, click a date cell in the date column. A date picker popover opens. Select a new date — it closes and the cell updates immediately. Refreshing the page shows the new date persisted.
result: pass

### 5. Edge Drag — Start Date Only
expected: On the Gantt, hover near the LEFT edge of a task bar — cursor changes to a horizontal resize arrow. Drag left or right — only the start date moves, the end date stays fixed. The bar width changes. Releasing saves the new start date.
result: pass

### 6. Edge Drag — Due Date Only
expected: Hover near the RIGHT edge of a task bar — cursor changes to resize arrow. Drag — only the due date moves, start stays fixed. Bar width changes. A 1-day minimum is enforced (can't drag end before start). Releasing saves.
result: pass

### 7. Milestone Drag
expected: A dashed vertical milestone marker line is visible on the Gantt. Hover over it — cursor changes to resize. Drag it left or right — the marker moves with the cursor. Release — the milestone's date updates and persists (verified by refreshing).
result: pass

### 8. Inline Date Edit (Left Panel Start / Due Cells)
expected: In the Gantt left panel, each expanded task row shows clickable Start and Due date cells. Clicking one opens a date picker popover. Selecting a date closes the popover, the cell shows the new date abbreviated (e.g. "May 3"), and the task bar shifts/resizes on the Gantt immediately without a page refresh.
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
