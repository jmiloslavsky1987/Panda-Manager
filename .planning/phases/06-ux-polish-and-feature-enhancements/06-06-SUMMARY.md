---
phase: 06-ux-polish-and-feature-enhancements
plan: "06"
subsystem: ui

tags: [react, tanstack-query, tailwind, react-router]

requires:
  - phase: 06-05
    provides: POST /api/customers/:id/risks and /milestones endpoints
  - phase: 06-04
    provides: CustomerLayout context with customer.history, RisksSection with Owner column

provides:
  - Dashboard OverdueActionsPanel listing all overdue open actions across customers with links
  - HistoryTimeline view at /customer/:id/history rendering history entries newest-first
  - History route and Sidebar nav link
  - Inline Add Risk row in CustomerOverview with postRisk mutation
  - Inline Add Milestone row in CustomerOverview with postMilestone mutation
  - postRisk(customerId, body) and postMilestone(customerId, body) in api.js

affects:
  - future ui phases
  - customer overview usage

tech-stack:
  added: []
  patterns:
    - Inline add-row pattern: addingX state + newX state + addXMutation; onSuccess invalidateQueries + reset state
    - OverdueActionsPanel: cross-customer flatMap + filter (due < today) + sort ascending + cap at 10 rows
    - HistoryTimeline reads from useOutletContext() with no extra API call — matches ActionManager/ArtifactManager pattern

key-files:
  created:
    - client/src/views/HistoryTimeline.jsx
  modified:
    - client/src/api.js
    - client/src/views/Dashboard.jsx
    - client/src/views/CustomerOverview.jsx
    - client/src/main.jsx
    - client/src/components/Sidebar.jsx

key-decisions:
  - "OverdueActionsPanel filters actions where due < today (ISO string compare) — getMostOverdueActions returns all open actions with due date, so client-side filter is required for truly overdue subset"
  - "Empty-state for risks/milestones shows add button directly — removes 'Add via YAML Editor' hint since inline creation is now available"
  - "RisksSection and MilestonesSection accept onCancelAdd prop instead of using internal state — keep cancel logic in parent CustomerOverview for cleaner single-source-of-truth"
  - "Add-row uses 7th column (risks) and 6th column (milestones) for Save/Cancel buttons; thead gains matching empty-header column"

patterns-established:
  - "Inline add row: gate on !addingX state; save button disabled when required field empty or mutation pending; onSuccess resets both addingX and newX state"
  - "HistoryTimeline WorkstreamRow: HISTORY_STATUS_DOT lookup with complete literal Tailwind strings"

requirements-completed:
  - UX-07
  - UX-08
  - UX-09

duration: 8min
completed: 2026-03-06
---

# Phase 06 Plan 06: Three High-Value Features Summary

**Cross-customer overdue actions roll-up on Dashboard, History Timeline view with workstream status dots, and inline Risk/Milestone creation without YAML Editor**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-06T02:42:10Z
- **Completed:** 2026-03-06T02:50:30Z
- **Tasks:** 3
- **Files modified:** 6 (1 created, 5 modified)

## Accomplishments

- Dashboard now shows red-bordered Overdue Actions panel above the customer grid listing all open actions past their due date, grouped across all customers, with teal links to each customer's Action Manager
- History Timeline at `/customer/:id/history` renders all weekly update history entries newest-first in cards, showing ADR/Biggy workstream status dots, percent complete, progress notes, and summary bullets for progress/decisions/outcomes
- CustomerOverview Risks section has inline Add Risk form row (description, owner, severity, status, mitigation) that POSTs to the server and refreshes on success; Milestones section has equivalent Add Milestone form row

## Task Commits

Each task was committed atomically:

1. **Task 1: Dashboard overdue actions roll-up panel + api.js new functions** - `e50ff1c` (feat)
2. **Task 2: History Timeline view + route + Sidebar link** - `c7ce601` (feat)
3. **Task 3: Inline Add Risk and Add Milestone rows in CustomerOverview** - `14eda62` (feat)

**Plan metadata:** *(to be committed with docs commit)*

## Files Created/Modified

- `client/src/api.js` - Added postRisk(customerId, body) and postMilestone(customerId, body) exports
- `client/src/views/Dashboard.jsx` - Added OverdueActionsPanel component with getMostOverdueActions import; rendered above customer grid
- `client/src/views/HistoryTimeline.jsx` - New view; WorkstreamRow sub-component; reads from CustomerLayout context via useOutletContext()
- `client/src/views/CustomerOverview.jsx` - postRisk/postMilestone imports; addRiskMutation + addMilestoneMutation; inline add-row in RisksSection and MilestonesSection
- `client/src/main.jsx` - HistoryTimeline import + { path: 'history', element: <HistoryTimeline /> } route
- `client/src/components/Sidebar.jsx` - Added { path: '/history', label: 'History' } to NAV_LINKS after Overview

## Decisions Made

- `getMostOverdueActions` returns all open actions with a due date sorted ascending — the OverdueActionsPanel applies an additional client-side filter `a.due < today` to show only truly overdue actions, not just upcoming ones.
- Empty-state for risks/milestones now shows the "+ Add Risk / + Add Milestone" button directly (removed "Add via YAML Editor" hint since inline creation is now the primary path).
- Cancel button uses `onCancelAdd` prop passed from parent rather than internal state setter to keep state ownership in CustomerOverview.
- The add-row for risks has 7 columns (matching the new empty-header action column added to thead); milestones has 6 columns.

## Deviations from Plan

None — plan executed exactly as written, with one minor clarification: the plan's OverdueActionsPanel filtered within getMostOverdueActions (which doesn't filter by today), so a client-side `due < today` filter was added inline in OverdueActionsPanel. This is consistent with plan intent (showing truly overdue actions) and adds no scope.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three features fully wired end-to-end: Dashboard roll-up, History Timeline, inline Risk/Milestone creation
- UX-07, UX-08, UX-09 requirements complete
- Server suite: 64 tests, 0 failures
- Phase 06 plan 06 is the final plan in Phase 06 — ready for Phase 07

---
*Phase: 06-ux-polish-and-feature-enhancements*
*Completed: 2026-03-06*
