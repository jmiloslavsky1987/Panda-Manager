---
phase: 03-write-surface-+-plan-builder
plan: 07
subsystem: ui
tags: [frappe-gantt, gantt, next.js, react, dynamic-import, ssr]

requires:
  - phase: 03-05
    provides: Plan tab shell with /plan/gantt route stub and PlanTabs component
  - phase: 03-06
    provides: Task schema with blocked_by, start_date columns and getTasksForProject query
  - phase: 03-02
    provides: tasks table with blocked_by self-referential FK and start_date TEXT column

provides:
  - frappe-gantt SVG chart at /customer/:id/plan/gantt rendering task bars with dependency arrows
  - GanttChart 'use client' wrapper component with SSR-safe dynamic import pattern
  - TypeScript declaration file for frappe-gantt (no @types package available)
  - Task-to-GanttTask mapping: status→progress, blocked_by→dependencies string, priority→custom_class

affects: [03-08, 03-09, phases using GanttChart component]

tech-stack:
  added: [types/frappe-gantt.d.ts (hand-authored type declarations)]
  patterns:
    - "Dynamic import inside useEffect for DOM-only libraries (frappe-gantt SSR pattern)"
    - "SVG ref cleared before Gantt re-initialization to prevent duplicate instances"
    - "RSC fetches + maps data, Client component handles DOM library lifecycle"

key-files:
  created:
    - bigpanda-app/components/GanttChart.tsx
    - bigpanda-app/types/frappe-gantt.d.ts
  modified:
    - bigpanda-app/app/customer/[id]/plan/gantt/page.tsx
    - bigpanda-app/app/globals.css

key-decisions:
  - "frappe-gantt has no @types package — added manual types/frappe-gantt.d.ts declaration file"
  - "frappe-gantt CSS loaded via globals.css @import (Tailwind 4 compatible path)"
  - "Only single-dependency chains supported in Phase 3 — blocked_by is a single integer FK; multi-dependency would require text[] column (Phase 4+ concern)"
  - "progress mapped from task.status: done=100, in_progress=50, blocked=10, todo=0"

patterns-established:
  - "SSR-unsafe libraries: dynamic import inside useEffect + next/dynamic ssr:false wrapper"

requirements-completed: [PLAN-04, PLAN-05, PLAN-06]

duration: 2min
completed: 2026-03-20
---

# Phase 3 Plan 07: Gantt Timeline Summary

**frappe-gantt SVG Gantt chart at /customer/:id/plan/gantt — tasks as bars, blocked_by as dependency arrows, ssr:false wrapper prevents Next.js SSR crash**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-20T14:21:14Z
- **Completed:** 2026-03-20T14:23:02Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- GanttChart 'use client' component wraps frappe-gantt with safe SSR pattern — dynamic import inside useEffect, SVG cleared on re-render
- Gantt page RSC maps DB tasks to GanttTask format: validates YYYY-MM-DD dates, ensures end >= start, converts blocked_by FK to dependency string
- Hand-authored TypeScript declarations for frappe-gantt (no @types package exists) unblocked TS compilation

## Task Commits

Each task was committed atomically:

1. **Task 1: Build GanttChart client component** - `e5fee17` (feat)
2. **Task 2: Build the Gantt page with task and milestone mapping** - `06d59a3` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `bigpanda-app/components/GanttChart.tsx` - 'use client' frappe-gantt wrapper; SVG ref + useEffect dynamic import; empty state message; data-testid
- `bigpanda-app/types/frappe-gantt.d.ts` - Hand-authored TS declarations (Gantt class, GanttTask, GanttOptions)
- `bigpanda-app/app/customer/[id]/plan/gantt/page.tsx` - RSC; fetches tasks, maps to GanttTask, dynamic imports GanttChart with ssr:false
- `bigpanda-app/app/globals.css` - Added frappe-gantt CSS @import

## Decisions Made
- frappe-gantt has no @types package — added `types/frappe-gantt.d.ts` (Rule 3 auto-fix, blocking TS error)
- Only single blocked_by dependency per task supported (schema constraint); documented as Phase 4+ concern for multi-dependency

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added types/frappe-gantt.d.ts — no @types/frappe-gantt package**
- **Found during:** Task 1 (Build GanttChart client component)
- **Issue:** `TS7016: Could not find a declaration file for module 'frappe-gantt'` — blocked TypeScript compilation
- **Fix:** Created `bigpanda-app/types/frappe-gantt.d.ts` with hand-authored Gantt class, GanttTask, and GanttOptions declarations
- **Files modified:** bigpanda-app/types/frappe-gantt.d.ts (new), bigpanda-app/components/GanttChart.tsx (removed any cast)
- **Verification:** `npx tsc --noEmit` produces 0 errors matching "GanttChart" or "frappe-gantt"
- **Committed in:** e5fee17 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for TypeScript correctness. No scope creep.

## Issues Encountered
None beyond the frappe-gantt type declarations handled above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Gantt Timeline complete — PLAN-04 (Gantt view), PLAN-05 (task bars), PLAN-06 (dependency arrows) delivered
- GanttChart component reusable for any future plan view needing frappe-gantt
- frappe-gantt type declarations available for future plans using the library
- CSS loaded globally — no per-page setup needed

---
*Phase: 03-write-surface-+-plan-builder*
*Completed: 2026-03-20*
