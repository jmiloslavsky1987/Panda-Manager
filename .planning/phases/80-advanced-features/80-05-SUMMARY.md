---
phase: 80-advanced-features
plan: "05"
subsystem: ui
tags: [print, css, window.print, daily-prep, export, media-print]

# Dependency graph
requires:
  - phase: 80-advanced-features/80-02
    provides: DailyPrepCard and EventCardState types, briefStatus state
  - phase: 80-advanced-features/80-03
    provides: availability chips on DailyPrepCard
  - phase: 80-advanced-features/80-04
    provides: DB-persisted briefs on /daily-prep page
provides:
  - "@media print block in globals.css hiding nav/controls, showing brief sections"
  - "Per-card Export button on DailyPrepCard (briefStatus=done only)"
  - "Page-level Export All button on /daily-prep (shown when any brief done)"
  - "handleExportCard: print-single + print-target class injection pattern"
  - "handleExportAll: printing-all class injection + afterprint cleanup"
affects: [80-advanced-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "window.print() with CSS class injection for targeted print output"
    - "@media print with .printing-all override for expanded brief display"
    - "afterprint event listener with { once: true } for cleanup"

key-files:
  created: []
  modified:
    - app/globals.css
    - components/DailyPrepCard.tsx
    - app/daily-prep/page.tsx

key-decisions:
  - "Per-card Export uses .print-single + .print-target class injection on body/card elements — no React state change needed"
  - "Export All uses .printing-all CSS class override — avoids needing to expand React state before print"
  - "Export button has no-print class — it disappears in actual print output (consistent with plan spec)"
  - "data-print-visible attribute on brief-section div — satisfies Test 5 which checks for this attribute"
  - "Print-only event header added with hidden print:block — ensures event context in PDF even with other elements hidden"
  - "Pre-existing TypeScript errors in tests/ui/, tests/wbs/, tests/wizard/ are out-of-scope (not caused by this plan)"

patterns-established:
  - "Print CSS pattern: CSS class injection on document.body triggers @media print overrides"
  - "afterprint cleanup: window.addEventListener('afterprint', fn, { once: true }) removes injected classes"

requirements-completed: [OUT-01]

# Metrics
duration: 15min
completed: 2026-04-28
---

# Phase 80 Plan 05: PDF Export (OUT-01) Summary

**Native browser PDF export via window.print() + @media print CSS — per-card Export button and page-level Export All button with CSS class injection pattern, zero new dependencies**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-28T11:14:00Z
- **Completed:** 2026-04-28T11:17:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- @media print CSS block in globals.css hides nav, checkboxes, dropdowns, and interactive controls; forces brief sections visible; controls card page breaks
- Per-card Export button appears on DailyPrepCard when briefStatus === 'done' — triggers handleExportCard with print-single/print-target class injection
- Page-level Export All button in daily-prep toolbar — triggers handleExportAll with printing-all class override that forces all brief sections visible without React state changes
- All 5 pdf-export.test.ts tests GREEN; TypeScript clean in modified files

## Task Commits

Each task was committed atomically:

1. **Task 1: Print CSS in globals.css + data-testid attributes on DailyPrepCard** - `7c272f6a` (feat)
2. **Task 2: Per-card Export button + page-level Export All button** - `26ebcb03` (feat)

**Plan metadata:** see docs commit below

## Files Created/Modified

- `app/globals.css` - Added @media print block with class-based targeting patterns
- `components/DailyPrepCard.tsx` - Added data-event-id, data-print-visible on brief section, onExport? callback, print-only event header, Export button
- `app/daily-prep/page.tsx` - Added handleExportCard, handleExportAll, Export All toolbar button, onExport prop on DailyPrepCard

## Decisions Made

- Per-card Export uses CSS class injection (print-single + print-target) rather than React state — avoids re-render lag before print dialog opens
- Export All uses .printing-all CSS class to override brief section display — @media print CSS rule forces all brief sections visible without expanding React state
- Export buttons use no-print class so they disappear from the actual printed output
- data-print-visible attribute placed on brief-section div as a data attribute (not a prop/boolean) to satisfy Test 5 check

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in unrelated test files (`tests/ui/overdue-highlighting.test.tsx`, `tests/wbs/generate-dedup.test.ts`, `tests/wizard/`) were present before this plan and are out of scope. No errors in modified files.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- OUT-01 (PDF export) fully delivered — daily-prep page now has complete print/export capability
- Phase 80 plans 01–05 complete; plan 06 is the final plan in this phase
- All print CSS infrastructure is in place; no additional changes needed for other features

---
*Phase: 80-advanced-features*
*Completed: 2026-04-28*
