---
phase: 75-schema-quick-wins-admin
plan: "04"
subsystem: ui
tags: [react, nextjs, taskboard, week-view, dnd-kit, tailwind]

# Dependency graph
requires:
  - phase: 75-schema-quick-wins-admin
    provides: TaskBoard.tsx with DnD columns and BulkToolbar (from plans 03)
provides:
  - Board/Week toggle in TaskBoard header row
  - WeekView component with 4 rolling week buckets (ISO Monday-based)
  - Unscheduled group for tasks with no due date
  - WeekTaskCard with status badge (colored pill), title, owner, due, priority
  - getWeekBuckets helper for week window computation
  - STATUS_BADGE_COLORS constant for status badge styling
affects: [phase-76, phase-77, task-board-consumers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "viewMode state pattern: single 'board' | 'week' string drives conditional rendering of two distinct views"
    - "Week bucket filter: ISO date string comparison (t.due >= start && t.due <= end) for inclusive range check"

key-files:
  created: []
  modified:
    - /Users/jmiloslavsky/Documents/Panda-Manager/components/TaskBoard.tsx

key-decisions:
  - "No DnD in Week view — omitted for simplicity per design intent (user said nothing about DnD in week view)"
  - "STATUS_BADGE_COLORS as module-level constant (not inline) for reuse across WeekTaskCard and future components"
  - "isIsoDate regex check ensures tasks with TBD or other non-date strings land in Unscheduled group"

patterns-established:
  - "WeekView/WeekTaskCard co-located in TaskBoard.tsx — no new file for self-contained UI extension"
  - "getWeekBuckets: pure function outside component, testable without React context"

requirements-completed: [TASK-04, TASK-05]

# Metrics
duration: 8min
completed: 2026-04-22
---

# Phase 75 Plan 04: Week View for Task Board Summary

**Board/Week toggle added to TaskBoard with rolling 4-week date-bucket view, status badge pills on task cards, and Unscheduled group for tasks with no due date**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-22T20:16:41Z
- **Completed:** 2026-04-22T20:24:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added `viewMode` state with Board/Week toggle buttons in the TaskBoard header row
- Built `WeekView` component rendering 4 labeled week sections (current + 3 ahead, ISO Monday start) plus an Unscheduled group at the bottom
- Built `WeekTaskCard` with colored status badge pill (STATUS_BADGE_COLORS), title, owner, due date, and priority; no DnD per design intent

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Board/Week toggle and Week view rendering to TaskBoard.tsx** - `e265daf7` (feat)

**Plan metadata:** `[pending docs commit]` (docs: complete plan)

## Files Created/Modified

- `/Users/jmiloslavsky/Documents/Panda-Manager/components/TaskBoard.tsx` - Added viewMode state, Board/Week toggle UI, getWeekBuckets helper, STATUS_BADGE_COLORS constant, WeekView component, WeekTaskCard component; Board view wrapped in conditional alongside new Week view

## Decisions Made

- No DnD in Week view — plan spec explicitly omitted it for simplicity
- `isIsoDate` regex (`/^\d{4}-\d{2}-\d{2}/`) ensures any non-ISO string (TBD, blank, custom) lands in Unscheduled group
- `STATUS_BADGE_COLORS` defined at module level (not inside component) for potential reuse by future components

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript pre-existing errors in test files only; no new source errors introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Task Board now has two distinct views; Phase 76 can extend WeekView or Board view with FK-based owner/dependency pickers without conflicts
- STATUS_BADGE_COLORS constant available for reuse if Phase 76 adds status badge display in other surfaces
- No blockers

---
*Phase: 75-schema-quick-wins-admin*
*Completed: 2026-04-22*

## Self-Check: PASSED

- FOUND: `/Users/jmiloslavsky/Documents/Panda-Manager/components/TaskBoard.tsx`
- FOUND: `/Users/jmiloslavsky/Documents/Project Assistant Code/.planning/phases/75-schema-quick-wins-admin/75-04-SUMMARY.md`
- FOUND: commit `e265daf7` — feat(75-04): add Board/Week toggle and Week view to TaskBoard
