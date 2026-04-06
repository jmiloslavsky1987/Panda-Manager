---
phase: 07-smart-data-flow-and-customer-onboarding
plan: "04"
subsystem: ui
tags: [react, tanstack-query, weekly-status, report-generator, workstreams]

# Dependency graph
requires:
  - phase: 07-02
    provides: NewCustomer view and POST /api/customers YAML seeding
  - phase: 07-03
    provides: ArtifactManager with extended artifact types

provides:
  - ReportGenerator with inline WeeklyEntryForm replacing standalone WeeklyUpdateForm view
  - Per-workstream data entry (status, %, notes, blockers) pre-filled from last history entry
  - Save to history button (useMutation/postHistory) after weekly report generation
  - WeeklyUpdateForm fully removed (file, route, and Sidebar link)

affects: [07-05, 07-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Inline sub-form pattern: WeeklyEntryForm renders inside ReportGenerator for weekly type; parent receives merged customer + entry via onDataReady callback
    - Synthetic customer merge: form workstream state merged over raw YAML customer for report generation so report reflects user-entered values

key-files:
  created: []
  modified:
    - client/src/views/ReportGenerator.jsx
    - client/src/main.jsx
    - client/src/components/Sidebar.jsx

key-decisions:
  - "WeeklyEntryForm inline in ReportGenerator — no separate route; single entry point for weekly workflow satisfies MGT-03"
  - "handleWeeklyDataReady receives (mergedCustomer, entry) — mergedCustomer drives report generation using form data; entry drives optional Save to history"
  - "Generate button hidden for weekly type — WeeklyEntryForm owns its own Preview Report button to avoid two-step confusion"
  - "Save to history is optional post-generation action — useMutation with invalidateQueries on success and 3s Saved! flash"
  - "History nav link removed from Sidebar alongside Weekly Update — matches plan target of 6-entry NAV_LINKS"

patterns-established:
  - "Inline sub-form with onDataReady callback: child form notifies parent with both display data (mergedCustomer) and persistence payload (entry)"
  - "Conditional action buttons: activeType !== weekly guard removes Generate button; form provides its own submit"

requirements-completed: [MGT-03]

# Metrics
duration: 8min
completed: 2026-03-06
---

# Phase 7 Plan 04: Merge Weekly Entry Into Report Generator Summary

**Inline WeeklyEntryForm integrated into ReportGenerator, replacing standalone WeeklyUpdateForm with per-workstream data entry, pre-fill from last history, and optional Save to history after generation**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-06T04:55:58Z
- **Completed:** 2026-03-06T05:04:01Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Deleted WeeklyUpdateForm.jsx; removed its import and /update route from main.jsx; removed Weekly Update and History from Sidebar NAV_LINKS (6 entries remain)
- Added WeeklyEntryForm sub-component to ReportGenerator: per-workstream status/percent/notes/blockers fieldsets pre-filled from buildWeeklyFormPrefill; summary fields (progress, decisions, outcomes) from last history entry
- Generate button suppressed for weekly type; WeeklyEntryForm's Preview Report button drives report generation using merged form data (not raw YAML)
- Save to history button appears after weekly generation; useMutation/postHistory writes entry to YAML with optimistic Saved! flash and cache invalidation

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove WeeklyUpdateForm** - `e5c1520` (feat)
2. **Task 2: Add inline WeeklyEntryForm to ReportGenerator** - `1096fc0` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `client/src/views/ReportGenerator.jsx` - Added WeeklyEntryForm sub-component; added useMutation/postHistory for Save to history; handleWeeklyDataReady callback; Generate button gated to ELT types only
- `client/src/main.jsx` - Removed WeeklyUpdateForm import and /update route
- `client/src/components/Sidebar.jsx` - Removed Weekly Update and History from NAV_LINKS (6 entries)

## Decisions Made
- WeeklyEntryForm lives inline in ReportGenerator — no route needed, satisfies MGT-03 single-entry-point requirement
- handleWeeklyDataReady takes (mergedCustomer, entry) — mergedCustomer uses form workstream values for generation; entry is the raw payload for postHistory
- Generate button is hidden for weekly type; WeeklyEntryForm's own Preview Report drives the flow to avoid UI confusion
- History nav link removed from Sidebar alongside Weekly Update to reach the 6-entry target specified in the plan

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Symlinked server node_modules to worktree**
- **Found during:** Task 2 verification (server test suite)
- **Issue:** Worktree had no server/node_modules; npm install failed due to npm cache permission error; `supertest` and `js-yaml` not available
- **Fix:** Symlinked `/Users/jmiloslavsky/Documents/Project Assistant Code/server/node_modules` into worktree server directory
- **Files modified:** server/node_modules (symlink, not committed)
- **Verification:** All 33 server tests passed after symlink
- **Committed in:** Not committed (runtime-only symlink)

---

**Total deviations:** 1 auto-fixed (1 blocking — missing node_modules in worktree)
**Impact on plan:** Node modules symlink enabled test verification; no code scope creep.

## Issues Encountered
- server/node_modules missing in worktree; npm install failed with npm cache permission error; resolved with symlink to main working directory node_modules

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Weekly workflow consolidated: ReportGenerator is the single entry point for weekly status
- WeeklyUpdateForm fully removed; no orphaned routes or nav links
- Plan 07-05 and 07-06 can build on the cleaned-up view structure

---
*Phase: 07-smart-data-flow-and-customer-onboarding*
*Completed: 2026-03-06*
