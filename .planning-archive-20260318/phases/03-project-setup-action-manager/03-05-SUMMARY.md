---
phase: 03-project-setup-action-manager
plan: "05"
subsystem: ui

tags: [react, tanstack-query, optimistic-ui, inline-crud, sort, filter, action-manager]

# Dependency graph
requires:
  - phase: 03-project-setup-action-manager
    plan: "02"
    provides: POST and PATCH /api/customers/:id/actions endpoints (postAction, patchAction)
  - phase: 03-project-setup-action-manager
    plan: "04"
    provides: postAction and patchAction API client functions in api.js; useOutletContext pattern
provides:
  - ActionManager.jsx: full inline CRUD table covering ACT-01 through ACT-12
  - Open table with 8 columns: checkbox, ID, description (InlineEditField), owner (InlineEditField), due (date InlineEditField with red overdue), status badge (cycle-on-click), workstream (InlineSelectField), Mark Delayed button
  - Sort by any column (SortableHeader); filter by workstream select and status toggle buttons
  - Optimistic patchAction mutation (onMutate/onError/onSettled) with per-action Saving... indicator
  - Add Action row: inputs for description/owner/due/workstream; Save button; postAction with onSuccess invalidation (no optimistic)
  - Completed table: collapsed by default; Reopen button sends {status:'open', completed_date:''}
affects:
  - 03-06 (subsequent UI plans can reference same optimistic mutation pattern)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-action Saving... indicator: actionMutation.isPending && actionMutation.variables?.actionId === action.id — scoped to mutating row only"
    - "STATUS_BADGE_CLASSES lookup table with complete literal Tailwind strings — prevents purge issues with dynamic class construction"
    - "SortableHeader sub-component: handles active sort state + direction indicator; click toggles asc/desc on same key"
    - "No optimistic update for postAction (server assigns ID) — onSuccess invalidation ensures server-assigned A-### is reflected correctly"
    - "clsx for conditional classes: overdue due date, active filter button state — all class strings from lookup tables, no string interpolation"

key-files:
  created: []
  modified:
    - client/src/views/ActionManager.jsx

key-decisions:
  - "InlineEditField and InlineSelectField copied verbatim from CustomerOverview.jsx — no shared component extraction until second consumer appears"
  - "Add Action row defaults workstream to 'inbound_integrations' (first WORKSTREAM_OPTIONS entry) — consistent with WORKSTREAM_CONFIG ordering"
  - "postAction uses onSuccess invalidation only (no optimistic) — server assigns sequential A-### ID; optimistic would require client-side ID prediction logic"
  - "STATUS_BADGE_CLASSES and STATUS_BADGE_LABELS as module-level lookup objects — Tailwind v4 purge safety, no dynamic class construction"
  - "SortableHeader as sub-component with currentSortKey/currentSortDir props — keeps column header markup declarative; avoids repetition"

patterns-established:
  - "Pattern: Per-action Saving... indicator via mutation.isPending && mutation.variables?.actionId === row.id — use for any row-level mutation in table views"
  - "Pattern: Lookup tables for status badge classes — always use complete literal Tailwind strings, never template literals for dynamic class names"

requirements-completed: [ACT-01, ACT-02, ACT-03, ACT-04, ACT-05, ACT-06, ACT-07, ACT-08, ACT-09, ACT-10, ACT-11, ACT-12]

# Metrics
duration: 1min
completed: 2026-03-05
---

# Phase 3 Plan 05: Action Manager View Summary

**Full inline CRUD ActionManager.jsx with sort/filter, optimistic patchAction mutations, per-action Saving indicator, Add Action row, and collapsible Completed table with Reopen — covering ACT-01 through ACT-12**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-05T15:41:34Z
- **Completed:** 2026-03-05T15:42:48Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Replaced placeholder ActionManager.jsx with 482-line full implementation; all 12 ACT requirements covered in a single view file
- Open actions table: 8 columns with checkbox-complete (optimistic, client-sets completed_date), InlineEditField for description/owner/due, status badge cycling via STATUS_CYCLE, InlineSelectField for 11 workstreams, Mark Delayed button (ACT-12)
- Sort by any column header (SortableHeader sub-component tracks active key + direction); filter by workstream select + status toggle buttons (All/Open/Delayed/In Review)
- Per-action Saving... indicator scoped to the row being mutated; overdue due dates rendered red via clsx + isOverdue check
- Add Action row (ACT-09) pinned at table bottom: saves via postAction with onSuccess invalidate (server assigns A-### ID); Save disabled when description empty
- Completed table (ACT-10, ACT-11): collapsed by default; Reopen sends `{status:'open', completed_date:''}` via same optimistic patchAction mutation

## Task Commits

Both tasks implemented in a single file write; committed atomically:

1. **Task 1: ActionManager core — open table with sort, filter, inline edit, checkbox complete** - `7c7d41e` (feat)
2. **Task 2: Add Action row, Completed table with Reopen** - `7c7d41e` (feat) — same commit (same file, implemented together)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `client/src/views/ActionManager.jsx` - Full replacement: 8-column open actions table; SortableHeader; InlineEditField + InlineSelectField (copied from CustomerOverview); STATUS_BADGE_CLASSES/LABELS lookups; patchAction optimistic mutation; postAction addMutation; Completed section with Reopen; no useQuery; no dynamic Tailwind class construction

## Decisions Made

- InlineEditField and InlineSelectField copied verbatim from CustomerOverview.jsx — no shared component until a second consumer appears (same decision as Plan 04)
- postAction uses onSuccess invalidation only (no optimistic) — server assigns sequential A-### ID; optimistic would require client-side ID prediction
- STATUS_BADGE_CLASSES defined as module-level lookup with complete literal Tailwind strings — Tailwind v4 purge safety, no dynamic class construction (enforced by verification script)
- Add Action row defaults workstream to `inbound_integrations` (first WORKSTREAM_OPTIONS entry, consistent with WORKSTREAM_CONFIG ordering)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ActionManager route (`/customer/:id/actions`) is fully functional with all ACT-01 through ACT-12 requirements
- Optimistic patchAction pattern established for table row mutations — pattern reusable in Phase 4 views
- Add Action row with postAction + invalidation established as the canonical pattern for server-ID-assigned resources
- CustomerOverview "Manage Actions" link navigates to a working view

---
*Phase: 03-project-setup-action-manager*
*Completed: 2026-03-05*

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| client/src/views/ActionManager.jsx | FOUND |
| .planning/phases/03-project-setup-action-manager/03-05-SUMMARY.md | FOUND |
| Commit 7c7d41e (feat: full ActionManager implementation) | FOUND |
| Task 1 verification (node script) | PASS |
| Task 2 verification (node script) | PASS |
