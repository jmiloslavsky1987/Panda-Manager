---
phase: 03-project-setup-action-manager
plan: "04"
subsystem: ui

tags: [react, tanstack-query, react-router, workstreams, tag-input, optimistic-ui]

# Dependency graph
requires:
  - phase: 03-project-setup-action-manager
    plan: "03"
    provides: PATCH /api/customers/:id/workstreams endpoint with atomic write
  - phase: 03-project-setup-action-manager
    plan: "02"
    provides: POST and PATCH /api/customers/:id/actions endpoints
provides:
  - ProjectSetup.jsx view with 11-subworkstream form, TagInput for scope sub-workstreams, patchWorkstreams mutation
  - setup child route registered at /customer/:customerId/setup in main.jsx
  - postAction, patchAction, patchWorkstreams API client functions in api.js
  - CustomerOverview Project Setup link fixed from <a href> to <Link to> (no full page reload)
affects:
  - 03-05 (Action Manager UI uses postAction and patchAction from api.js)
  - 03-06 (subsequent UI plans can reference workstreams save pattern)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "buildFormState initialises all 11 sub-workstreams from customer.workstreams with safe defaults — avoids undefined access on first render"
    - "TagInput inline component: comma/Enter to add, Backspace to remove last, add-on-blur — reusable pattern for scope arrays"
    - "No useQuery in child views — customer data always from useOutletContext() supplied by CustomerLayout"
    - "workstreamsMutation uses onSuccess to invalidateQueries + setSavedFlag(true) with setTimeout(2000) reset"

key-files:
  created:
    - client/src/views/ProjectSetup.jsx
  modified:
    - client/src/api.js
    - client/src/main.jsx
    - client/src/views/CustomerOverview.jsx

key-decisions:
  - "No useQuery in ProjectSetup — customer data via useOutletContext() to avoid double-fetch and cache duplication"
  - "No optimistic update for workstreams save — form re-init risk if cache update races local formState; simple invalidation used instead"
  - "TagInput inline in same file — not a shared component yet; can be extracted when a second consumer appears"
  - "savedFlag reset via setTimeout(2000) in onSuccess — gives user clear Saved! confirmation without persisting state"

patterns-established:
  - "Pattern: All child views use useOutletContext() for customer data — never duplicate useQuery(['customer', customerId]) in child routes"
  - "Pattern: TagInput for scope arrays — add via Enter/comma, remove via x button or Backspace on empty input"

requirements-completed: [ACT-08]

# Metrics
duration: 1min
completed: 2026-03-05
---

# Phase 3 Plan 04: Project Setup View Summary

**React ProjectSetup.jsx with 11-subworkstream form, TagInput for scope sub-workstreams, patchWorkstreams/postAction/patchAction API functions, and CustomerOverview Link bug fix**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-05T15:37:51Z
- **Completed:** 2026-03-05T15:38:54Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created ProjectSetup.jsx: full 11-subworkstream form in ADR/Biggy cards with status select, percent_complete input, progress_notes textarea, blockers input; TagInput shown only on hasScope sub-workstreams (inbound_integrations, outbound_integrations, udc, real_time_integrations)
- Added postAction, patchAction, patchWorkstreams to api.js — completes all client-side action and workstream write paths
- Registered setup route in main.jsx under customer/:customerId children; imported ProjectSetup
- Fixed CustomerOverview `<a href>` bug: replaced with `<Link to>` for SPA navigation (no full page reload)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add API functions, fix CustomerOverview Link bug, add setup route** - `4d6a970` (feat)
2. **Task 2: Create ProjectSetup.jsx** - `077882c` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `client/src/views/ProjectSetup.jsx` - New: full 11-subworkstream form, TagInput for scope sub-workstreams, buildFormState, handleSubField, workstreamsMutation; Saving.../Saved! indicators; no useQuery
- `client/src/api.js` - Added postAction, patchAction, patchWorkstreams exports
- `client/src/main.jsx` - Added ProjectSetup import and `{ path: 'setup', element: <ProjectSetup /> }` child route
- `client/src/views/CustomerOverview.jsx` - Replaced `<a href>` with `<Link to>` for Project Setup navigation

## Decisions Made

- No useQuery in ProjectSetup — customer data always comes from useOutletContext() provided by CustomerLayout; adding a second useQuery would duplicate cache keys and risk stale data
- No optimistic update for workstreams — form re-init risk if cache update races local formState; simple invalidateQueries on success is safer and correct
- TagInput kept inline in ProjectSetup.jsx — extract to shared component only when a second consumer requires it

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- /customer/:id/setup route live with full 11-subworkstream write form
- api.js now has postAction and patchAction ready for Action Manager UI (Plan 03-05)
- patchWorkstreams ready for any future form that needs to update workstreams
- CustomerOverview SPA navigation fixed — no more full page reload on Project Setup link

---
*Phase: 03-project-setup-action-manager*
*Completed: 2026-03-05*

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| client/src/views/ProjectSetup.jsx | FOUND |
| client/src/api.js | FOUND |
| client/src/main.jsx | FOUND |
| client/src/views/CustomerOverview.jsx | FOUND |
| .planning/phases/03-project-setup-action-manager/03-04-SUMMARY.md | FOUND |
| Commit 4d6a970 (Task 1) | FOUND |
| Commit 077882c (Task 2) | FOUND |
