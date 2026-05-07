---
phase: 85-wbs-ms-project-style-overhaul
plan: "04"
subsystem: ui
tags: [react, nextjs, gantt, wbs, svg, typescript, drizzle]

# Dependency graph
requires:
  - phase: 85-01
    provides: getWbsDependencies query, WBS schema with percent_complete
  - phase: 85-02
    provides: WbsGrid component with indent/outdent/dependency editing
  - phase: 85-03
    provides: wbs_dependencies API routes (GET/POST/DELETE)
provides:
  - WbsPageClient 'use client' component with ADR/Biggy tab switcher and all interactive handlers
  - WBS page server/client split — page.tsx fetches data, WbsPageClient handles interactions
  - GanttChart percent_complete progress bar fills on WBS summary bars
  - SVG dependency arrows rendered over Gantt right panel for FS/SS predecessor links
  - Exported pure functions buildWbsDependencyArrows + wbsRowToProgress (TDD-verified)
  - Gantt page wired to fetch and pass wbsDependencies to GanttChart
affects:
  - gantt
  - wbs

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server/Client split — server component fetches data, 'use client' sibling holds all state+handlers
    - SVG overlay rendered inside IIFE within rows.map — collects row positions during render, builds arrows immediately after
    - wbsRowToProgress: percent_complete wins over status-derived progress; fallback for legacy rows

key-files:
  created:
    - app/customer/[id]/wbs/WbsPageClient.tsx
  modified:
    - components/GanttChart.tsx
    - app/customer/[id]/wbs/page.tsx
    - app/customer/[id]/gantt/page.tsx

key-decisions:
  - "[85-04] WbsPageClient.tsx is a separate sibling file (not inline export in page.tsx) — clean RSC/client boundary"
  - "[85-04] SVG arrows computed inside IIFE in rows.map render — avoids extra useMemo pass; row positions captured at render time"
  - "[85-04] wbsRowToProgress: percent_complete wins when defined (even 0); status-derived only as fallback for legacy rows"
  - "[85-04] onDependenciesChange: DELETE existing where to_item_id=itemId, then POST new set — full replace semantics"

patterns-established:
  - "Server/Client split pattern: page.tsx = async server component, WbsPageClient.tsx = 'use client' sibling with all state"

requirements-completed:
  - WBS-01
  - WBS-02
  - WBS-03
  - WBS-04

# Metrics
duration: 6min
completed: 2026-05-07
---

# Phase 85 Plan 04: WBS Page Wiring + Gantt Dependencies Summary

**WbsGrid wired into WBS page via server/client split, Gantt updated with percent_complete bars and SVG dependency arrows for FS/SS predecessor links**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-07T20:29:30Z
- **Completed:** 2026-05-07T20:35:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created WbsPageClient.tsx — 'use client' component with ADR/Biggy tabs, onAddRow/onIndent/onOutdent/onDependenciesChange handlers all wired to fetch + router.refresh()
- Updated WBS page.tsx to server/client split — fetches adrItems, biggyItems, deps; renders WbsPageClient; WbsTree removed
- Added percent_complete field to GanttWbsRow and wbsRowToProgress pure function — WBS summary bar fills use actual completion percentage
- Added buildWbsDependencyArrows pure function + SVG overlay in Gantt right panel for FS/SS dependency arrows
- Gantt page fetches getWbsDependencies and passes deps to GanttChart; passes percent_complete on each WBS row

## Task Commits

Each task was committed atomically:

1. **Task 1: Update GanttChart.tsx — percent_complete bars + SVG dependency arrows** - `f9c10c0c` (feat)
2. **Task 2: Create WbsPageClient.tsx + update page.tsx; update Gantt page** - `37c5e6d6` (feat)

## Files Created/Modified

- `/Users/jmiloslavsky/Documents/Panda-Manager/app/customer/[id]/wbs/WbsPageClient.tsx` - New 'use client' component: ADR/Biggy switcher, all interactive handlers
- `/Users/jmiloslavsky/Documents/Panda-Manager/components/GanttChart.tsx` - Added DependencyArrow type, buildWbsDependencyArrows, wbsRowToProgress exports; SVG overlay; percent_complete support
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/customer/[id]/wbs/page.tsx` - Server component: fetches data, renders WbsPageClient; WbsTree removed
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/customer/[id]/gantt/page.tsx` - Adds getWbsDependencies fetch, percent_complete on rows, wbsDependencies prop passed to GanttChart

## Decisions Made

- WbsPageClient.tsx is a separate sibling file rather than inline export in page.tsx — clean RSC/client boundary, easier to test
- SVG arrows computed inside an IIFE in the rows.map render block — row positions are captured during the same render pass, then immediately used for arrow geometry without a separate useMemo
- wbsRowToProgress uses percent_complete when defined (including value 0) — percent_complete always wins; status-derived fallback only for rows without this field
- onDependenciesChange does a full DELETE+POST round-trip — DELETE all where to_item_id=itemId, POST new set; simple semantics, no partial update needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- All 4 WBS requirements (WBS-01 through WBS-04) are now functionally complete end-to-end
- Phase 85 has 1 remaining plan (85-05) if it exists; WBS overhaul is otherwise feature-complete
- All 42 Phase 85 tests GREEN; TypeScript production source clean

---
*Phase: 85-wbs-ms-project-style-overhaul*
*Completed: 2026-05-07*

## Self-Check: PASSED

- WbsPageClient.tsx: FOUND
- GanttChart.tsx: FOUND
- wbs/page.tsx: FOUND
- gantt/page.tsx: FOUND
- Commit f9c10c0c: FOUND
- Commit 37c5e6d6: FOUND
