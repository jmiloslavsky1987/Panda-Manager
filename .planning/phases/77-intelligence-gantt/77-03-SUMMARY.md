---
phase: 77-intelligence-gantt
plan: 03
subsystem: ui
tags: [gantt, baseline, ghost-bars, variance, react, typescript]

# Dependency graph
requires:
  - phase: 77-intelligence-gantt-02
    provides: activeBaselineSnapshot state, gantt-baselines API, Save Baseline + Compare dropdown toolbar

provides:
  - Ghost bars (opacity 0.3) on task rows showing baseline dates when a baseline is active
  - Ghost span bars on WBS summary rows computed from min/max of child task baseline dates
  - Variance column ("Var.") in left panel header, conditional on activeBaselineSnapshot
  - Per-row variance values: +Nd red (behind schedule), -Nd green (ahead), dash (no data)
  - WBS aggregate variance using max baseline spanEnd vs current spanEnd
  - Section-header spacer divs to maintain column alignment

affects: [78-ai-content, future-gantt-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - IIFE pattern for inline computed JSX blocks (variance column cells)
    - Ghost bar rendered as sibling div with zIndex 3 behind current bar at zIndex 5
    - All baseline-dependent UI conditioned on activeBaselineSnapshot non-null check

key-files:
  created: []
  modified:
    - components/GanttChart.tsx

key-decisions:
  - "(77-03) Ghost bars use the same color.bar as the current bar at 0.3 opacity — color consistency reinforces the visual comparison"
  - "(77-03) WBS ghost span computed from min baseline start + max baseline end across all child tasks with snapshot entries"
  - "(77-03) Variance uses daysBetween(baselineEnd, currentEnd): positive = behind schedule = red; negative = ahead = green"
  - "(77-03) WBS aggregate variance computed from max baseline spanEnd vs current spanEnd (not sum of child variances)"
  - "(77-03) Section-header rows include w-14 spacer div for Variance column alignment — no value shown in separator rows"

patterns-established:
  - "Ghost bar pattern: render ghost div before current bar div (ghost zIndex 3, current zIndex 5)"
  - "IIFE inside JSX for inline variance computation: {activeBaselineSnapshot && (() => { ... })()}"

requirements-completed: [GANTT-03, GANTT-04]

# Metrics
duration: 3min
completed: 2026-04-23
---

# Phase 77 Plan 03: Intelligence & Gantt — Ghost Bars + Variance Column Summary

**Semi-transparent ghost bars at baseline dates and a conditional Variance column showing +/-Nd schedule delta added to GanttChart using activeBaselineSnapshot state from Plan 02**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-23T03:49:52Z
- **Completed:** 2026-04-23T03:52:34Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Ghost bars rendered on task rows at 0.3 opacity using baseline start/end from `activeBaselineSnapshot`, positioned before the current bar (zIndex 3 vs zIndex 5)
- Ghost span bars on WBS summary rows using min baseline start / max baseline end across all child tasks that have snapshot entries
- Variance column ("Var.") conditionally added to left panel header, WBS rows, task rows, and section-header spacers — entirely hidden when no baseline is active
- Variance color coding: red for positive (behind schedule), green for negative (ahead), neutral dash for no data

## Task Commits

Each task was committed atomically:

1. **Task 1: Ghost bars in right panel + Variance column in left panel** - `6a6b48b2` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `/Users/jmiloslavsky/Documents/Panda-Manager/components/GanttChart.tsx` — Added ghost bar rendering blocks in right panel (task rows + WBS summary rows), Variance column header and per-row values in left panel

## Decisions Made
- Ghost bars use color.bar at 0.3 opacity for visual consistency with the current bar
- WBS ghost span computed from min/max of child task baseline dates (mirrors how current span is computed from live task dates)
- Variance sign convention: `daysBetween(baselineEnd, currentEnd)` — positive = current end is later = behind schedule = red
- WBS aggregate variance uses max baseline spanEnd vs current spanEnd, not sum of child variances (simpler, consistent with span bar logic)
- Section-header rows get a `w-14 shrink-0` spacer div (no value) to keep column alignment when baseline is active

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in test files (`GanttChart-wbs-rows.test.ts`, `archive.test.ts`, `require-project-role.test.ts`) confirmed to exist before this plan's changes via git stash verification. No new errors introduced by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 77 complete: all four GANTT requirements (GANTT-01 through GANTT-04) and all three HLTH requirements delivered across Plans 01-03
- Phase 78 (AI & Content) ready to begin: Meeting Prep skill, inline outputs, Outputs Library inline preview + XSS hardening
- Ghost bar + variance feature fully functional once a baseline is saved and selected via Compare dropdown

---
*Phase: 77-intelligence-gantt*
*Completed: 2026-04-23*
