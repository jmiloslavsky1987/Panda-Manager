---
phase: 03-write-surface-+-plan-builder
plan: 05
subsystem: ui
tags: [next.js, routing, tabs, navigation, react, typescript]

# Dependency graph
requires:
  - phase: 02-app-shell-read-surface
    provides: WorkspaceTabs component with 9 tabs; customer workspace layout
provides:
  - Plan Builder route shell with nested layout and 4 stub sub-pages
  - PlanTabs second-level nav component (Phase Board / Task Board / Gantt / Swimlane)
  - WorkspaceTabs updated to 10 tabs with subRoute active-check pattern
affects:
  - 03-06 (Phase Board implementation — depends on plan/board/page.tsx)
  - 03-07 (Gantt — depends on plan/gantt/page.tsx)
  - 03-08 (Swimlane — depends on plan/swimlane/page.tsx)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - subRoute flag on tab entries for includes-based active check (vs endsWith for leaf tabs)
    - Nested layout pattern: parent layout (workspace) > child layout (plan) > page
    - async RSC layout awaiting params Promise for Next.js 15 compatibility

key-files:
  created:
    - bigpanda-app/components/PlanTabs.tsx
    - bigpanda-app/app/customer/[id]/plan/layout.tsx
    - bigpanda-app/app/customer/[id]/plan/page.tsx
    - bigpanda-app/app/customer/[id]/plan/board/page.tsx
    - bigpanda-app/app/customer/[id]/plan/tasks/page.tsx
    - bigpanda-app/app/customer/[id]/plan/gantt/page.tsx
    - bigpanda-app/app/customer/[id]/plan/swimlane/page.tsx
  modified:
    - bigpanda-app/components/WorkspaceTabs.tsx

key-decisions:
  - "Used satisfies Array<...> (not as const) for TABS array — allows tab.subRoute access without TS union narrowing errors"
  - "subRoute: true flag on Plan tab entry enables pathname.includes active check for nested /plan/* routes"

patterns-established:
  - "subRoute flag pattern: tabs with nested sub-routes use pathname.includes; leaf tabs use pathname.endsWith"
  - "Nested RSC layouts: each layout level awaits params and renders its own nav before children"

requirements-completed: [PLAN-02, PLAN-03, PLAN-04, PLAN-05]

# Metrics
duration: 2min
completed: 2026-03-20
---

# Phase 03 Plan 05: Plan Builder Tab Shell Summary

**Plan Builder routing shell with 10-tab WorkspaceTabs, PlanTabs second-level nav, and 4 stub sub-pages under /customer/[id]/plan/***

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-20T14:10:02Z
- **Completed:** 2026-03-20T14:11:25Z
- **Tasks:** 2/2
- **Files modified:** 8

## Accomplishments
- WorkspaceTabs upgraded from 9 to 10 tabs; Plan tab uses pathname.includes for active highlight on all /plan/* sub-routes
- PlanTabs client component renders second-level nav with Phase Board / Task Board / Gantt / Swimlane tabs
- Nested plan layout wraps all sub-routes; /customer/[id]/plan redirects to /customer/[id]/plan/board; 4 stub pages with correct data-testid attributes ready for plans 03-06 through 03-08

## Task Commits

Each task was committed atomically:

1. **Task 1: Update WorkspaceTabs to add the Plan tab** - `a3cdae1` (feat)
2. **Task 2: Create PlanTabs component and plan layout/redirect** - `2851627` (feat)

## Files Created/Modified
- `bigpanda-app/components/WorkspaceTabs.tsx` - Added Plan as 10th tab with subRoute active check
- `bigpanda-app/components/PlanTabs.tsx` - New client component with 4 plan sub-tabs
- `bigpanda-app/app/customer/[id]/plan/layout.tsx` - Nested RSC layout rendering PlanTabs above children
- `bigpanda-app/app/customer/[id]/plan/page.tsx` - Redirect page to /plan/board
- `bigpanda-app/app/customer/[id]/plan/board/page.tsx` - Stub (data-testid=phase-board)
- `bigpanda-app/app/customer/[id]/plan/tasks/page.tsx` - Stub (data-testid=task-board)
- `bigpanda-app/app/customer/[id]/plan/gantt/page.tsx` - Stub (data-testid=gantt-container)
- `bigpanda-app/app/customer/[id]/plan/swimlane/page.tsx` - Stub (data-testid=swimlane-view)

## Decisions Made
- `satisfies Array<...>` used for TABS array instead of `as const` — `as const` creates a narrow union where most entries lack `subRoute`, causing TS2339 when accessing `tab.subRoute`. `satisfies` validates shape without narrowing the union.
- `subRoute: true` flag on the Plan entry drives the `pathname.includes` active check rather than hardcoding special logic for a single tab name.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error from `as const satisfies` TABS array**
- **Found during:** Task 1 (Update WorkspaceTabs)
- **Issue:** `as const satisfies ReadonlyArray<...>` caused TS2339 — the `as const` union narrowed each entry to its literal type, and entries without `subRoute` didn't have that property accessible
- **Fix:** Removed `as const`, used only `satisfies Array<...>` — preserves shape validation, allows `tab.subRoute` access throughout the map
- **Files modified:** bigpanda-app/components/WorkspaceTabs.tsx
- **Verification:** `npx tsc --noEmit` shows 0 errors for WorkspaceTabs
- **Committed in:** a3cdae1

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary correction to TypeScript idiom. No scope creep.

## Issues Encountered
None beyond the auto-fixed TS error above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan Builder routing infrastructure complete — plans 03-06, 03-07, 03-08 can implement Phase Board, Gantt, and Swimlane content respectively
- All stub pages have correct data-testid attributes matching test expectations
- WorkspaceTabs Plan tab highlights correctly on any /plan/* sub-route

---
*Phase: 03-write-surface-+-plan-builder*
*Completed: 2026-03-20*

## Self-Check: PASSED
- All 8 files verified present on disk
- Both commits (a3cdae1, 2851627) confirmed in git log
