---
phase: 06-ux-polish-and-feature-enhancements
plan: "02"
subsystem: ui
tags: [react, reportGenerator, heuristics, inline-edit, TDD, node-test]

# Dependency graph
requires:
  - phase: 06-01
    provides: "Wave 0 test stubs for reportGenerator buildPanel regression"
provides:
  - "buildPanel() now matches actions by sub-workstream key (e.g. inbound_integrations) not group key (adr)"
  - "overallStatusLabel() derives from workstream data via deriveOverallStatus()"
  - "ArtifactManager status column shows InlineSelectField only — no duplicate badge span"
  - "CustomerOverview uses shared InlineEditField/InlineSelectField from ../components/"
  - "3 passing regression tests for reportGenerator buildPanel workstream filter"
affects:
  - "ReportGenerator — ELT reports will now show correct Looking Ahead bullets"
  - "ArtifactManager — cleaner status cell UI"
  - "CustomerOverview — synced with shared component improvements"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED/GREEN for bug regression: write failing test before fixing code"
    - "node:test dynamic import (await import()) for ESM modules from ESM test runner"
    - "WORKSTREAM_CONFIG.subWorkstreams.map(s => s.key) for sub-key filter pattern"

key-files:
  created: []
  modified:
    - "client/src/lib/reportGenerator.js"
    - "client/src/lib/reportGenerator.test.js"
    - "client/src/views/ArtifactManager.jsx"
    - "client/src/views/CustomerOverview.jsx"

key-decisions:
  - "buildPanel uses groupSubKeys = WORKSTREAM_CONFIG[sw.group].subWorkstreams.map(s => s.key) to filter actions by sub-key not group key — single source of truth from deriveCustomer.js"
  - "overallStatusLabel calls deriveOverallStatus(customer) not customer.status — status field is stale, workstream-derived status is authoritative"
  - "ARTIFACT_STATUS_BADGE_CLASSES and clsx import removed from ArtifactManager — unused after badge span removal"
  - "CustomerOverview local InlineEditField/InlineSelectField deleted — shared component trigger met when ArtifactManager became second consumer (Phase 04 deferral)"

patterns-established:
  - "Regression test written BEFORE bug fix (TDD RED phase) to confirm bug is reproducible"
  - "All ELT slide sections encode Looking Ahead within section content string — test finds section by content.includes('Looking Ahead')"

requirements-completed:
  - UX-10
  - UX-07

# Metrics
duration: 8min
completed: 2026-03-06
---

# Phase 6 Plan 02: P0 Bug Fixes — reportGenerator, ArtifactManager, CustomerOverview Summary

**Fixed 3 P0 bugs: ELT Looking Ahead now shows actual open actions matched by sub-workstream key; ArtifactManager status cell shows select-only (no duplicate badge); CustomerOverview uses shared InlineEditField/InlineSelectField**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-06T02:35:00Z
- **Completed:** 2026-03-06T02:43:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- buildPanel() filter fixed: actions matched by `groupSubKeys.includes(a.workstream)` instead of group key comparison — ELT "Looking Ahead" now correctly shows open actions for ADR and Biggy workstreams
- overallStatusLabel() now calls `deriveOverallStatus(customer)` ensuring status reflects real workstream data, not the potentially stale `customer.status` field
- 3 regression tests written (TDD) and passing in reportGenerator.test.js
- ArtifactManager status cell simplified to InlineSelectField only — badge span and unused constants removed
- CustomerOverview local component definitions deleted; shared components imported from `../components/`

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix reportGenerator.js buildPanel filter and overallStatusLabel** - `47e0901` (fix + test)
2. **Task 2: Fix ArtifactManager duplicate status badge and CustomerOverview shared imports** - `b6b44f1` (fix)

## Files Created/Modified

- `client/src/lib/reportGenerator.js` - Added WORKSTREAM_CONFIG + deriveOverallStatus imports; fixed buildPanel filter; fixed overallStatusLabel
- `client/src/lib/reportGenerator.test.js` - Filled 3 TDD regression tests (previously todo stubs); all passing
- `client/src/views/ArtifactManager.jsx` - Removed duplicate status badge span, clsx import, and ARTIFACT_STATUS_BADGE_CLASSES constant
- `client/src/views/CustomerOverview.jsx` - Deleted local InlineEditField/InlineSelectField definitions; added shared component imports

## Decisions Made

- buildPanel uses `WORKSTREAM_CONFIG[sw.group].subWorkstreams.map(s => s.key)` for action filter — avoids hardcoding sub-workstream lists, stays in sync with deriveCustomer.js as single source of truth
- overallStatusLabel defers to deriveOverallStatus for authoritative status — customer.status field is stale input, not derived output
- ARTIFACT_STATUS_BADGE_CLASSES removed entirely rather than kept as unused constant — Tailwind v4 purge safety concern does not apply to unused code
- CustomerOverview local components deleted now that shared components are confirmed identical in prop interface (both have value, onSave, isPending, className)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Server test suite has 0 pass / 2 fail pre-existing failures unrelated to these changes (workstreams.test.js and yamlService.test.js). Confirmed via git stash before/after comparison. Logged for deferred investigation.

## Next Phase Readiness

- P0 bugs fixed; subsequent UX polish plans can build on a correct foundation
- ELT report generation now correctly shows open actions per workstream group
- All shared component consumers (CustomerOverview, ArtifactManager) using centralized definitions

---
*Phase: 06-ux-polish-and-feature-enhancements*
*Completed: 2026-03-06*
