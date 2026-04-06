---
plan: "38-04"
phase: "38-gantt-overhaul"
status: complete
completed: 2026-04-06
---

# 38-04 Summary: Milestone Markers + Human Verification

## What Was Built

Milestone marker implementation and full Phase 38 human verification. The frappe-gantt SVG injection approach from the original plan was superseded by a complete custom split-panel Gantt implementation, which natively renders all milestone markers, labels, and popup behaviour without DOM manipulation.

### Changes from original plan

Original plan called for SVG DOM injection into frappe-gantt. During execution, frappe-gantt was replaced entirely with a custom pure-React split-panel Gantt (`GanttChart.tsx`) that:
- Renders milestone markers as dashed indigo vertical lines with staggered labels (120px proximity threshold, 24px stagger gap)
- Shows a click popup (name, date, status) via React state — no DOM event listeners needed
- Handles all GNTT-01 requirements natively without post-render SVG manipulation

### Additional fixes applied during human verification

- **Drag TypeError fixed**: Captured `taskId` before `setDragOverride` async callback to prevent null ref race condition
- **View mode rescale**: `pxPerDay` now auto-scales via `Math.max(base, containerWidth / totalDays)` backed by ResizeObserver — timeline always fills container
- **Groups start collapsed**: Initial expanded state changed to `new Set()`
- **Column resize**: Draggable grip in the "Project plan" header allows resizing the name column (200–600px range)
- **Label truncation tooltip**: Custom fixed-position tooltip on milestone row hover shows full name immediately (escapes overflow:hidden)

## Verification

All Phase 38 success criteria met and human-approved:

- GNTT-01: Milestone markers (dashed lines + staggered labels + click popup) ✓
- GNTT-02: View mode toggle (Day/Week/Month/Quarter Year), rescales to fill container ✓
- GNTT-03: Accordion swim lanes, collapsed by default, Unassigned lane at bottom ✓
- GNTT-04: Drag-to-reschedule with silent PATCH save + rollback + toast on error ✓
- PLAN-03: Milestone colour coding — 6 cycling colours per group ✓

TypeScript: 0 errors in Gantt files. Vitest: 6/6 tests pass.

## Key Files

- `bigpanda-app/components/GanttChart.tsx` — complete custom Gantt, 560 lines
- `bigpanda-app/app/customer/[id]/plan/gantt/page.tsx` — Server Component, unchanged from 38-02
- `bigpanda-app/scripts/seed-acme-gantt.ts` — 20 tasks seeded across 5 milestones for testing
