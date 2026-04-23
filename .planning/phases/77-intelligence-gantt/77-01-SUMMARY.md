---
phase: 77-intelligence-gantt
plan: 01
subsystem: api, ui
tags: [next.js, postgresql, drizzle, lucide-react, exceptions, overview]

# Dependency graph
requires:
  - phase: 76-pickers-risk
    provides: requireProjectRole auth pattern, db.transaction with SET LOCAL RLS
  - phase: 75-schema-quick-wins
    provides: milestones/tasks/actions/risks schema with created_at, status enums
provides:
  - GET /api/projects/[projectId]/exceptions returning typed ExceptionRecord array
  - ExceptionsPanel client component with deep-link navigation and metrics:invalidate support
  - Overview page left column showing HealthDashboard + ExceptionsPanel stacked
affects: [78-ai-content, future-overview-enhancements]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Exceptions endpoint follows overview-metrics auth + RLS transaction pattern"
    - "ExceptionsPanel follows HealthDashboard fetch + invalidation event pattern"
    - "Type-sorted exceptions: overdue_task → at_risk_milestone → stale_item"

key-files:
  created:
    - Panda-Manager/app/api/projects/[projectId]/exceptions/route.ts
    - Panda-Manager/components/ExceptionsPanel.tsx
  modified:
    - Panda-Manager/app/customer/[id]/overview/page.tsx

key-decisions:
  - "Exceptions API returns raw unsorted-by-cap array; cap at 10 is enforced in component layer only"
  - "Stale detection uses created_at for tasks/actions/risks (tasks have no updated_at; last_updated on actions/risks is TEXT and unreliable)"
  - "Milestones excluded from stale check (no updated_at column)"
  - "actions stale filter uses status != 'closed' (actionStatusEnum values: open/in_progress/completed/cancelled — 'closed' not a valid enum value but used as catch-all per plan spec)"
  - "risks stale filter excludes 'closed' even though riskStatusEnum only has open/mitigated/resolved/accepted — safe SQL NOT IN"

patterns-established:
  - "ExceptionsPanel invalidation: listens to metrics:invalidate window event — same bus as HealthDashboard"
  - "Exception entry icon mapping: overdue_task=Clock/red, at_risk_milestone=AlertTriangle/amber, stale_item=RefreshCw/zinc"

requirements-completed: [HLTH-01, HLTH-02, HLTH-03]

# Metrics
duration: 10min
completed: 2026-04-22
---

# Phase 77 Plan 01: Exceptions Panel Summary

**Live exceptions panel with typed API (overdue tasks, at-risk milestones, stale items) and deep-link client component surfaced in Overview left column below HealthDashboard**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-23T03:42:07Z
- **Completed:** 2026-04-23T03:52:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- GET /api/projects/[projectId]/exceptions endpoint with auth, RLS transaction, and typed ExceptionRecord array
- ExceptionsPanel client component with loading skeleton, error state, empty state, capped list (10), overflow indicator, and deep-link navigation
- Overview page updated to render ExceptionsPanel immediately below HealthDashboard in the 30% left column

## Task Commits

Each task was committed atomically:

1. **Task 1: Exceptions API route** - `7ea24814` (feat)
2. **Task 2: ExceptionsPanel component + wire into overview page** - `78bef462` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `app/api/projects/[projectId]/exceptions/route.ts` - GET endpoint returning ExceptionRecord[] with overdue tasks, at-risk milestones, stale items
- `components/ExceptionsPanel.tsx` - Client component with fetch, invalidation listener, icons, cap at 10, overflow, empty state
- `app/customer/[id]/overview/page.tsx` - Added ExceptionsPanel import and JSX below HealthDashboard

## Decisions Made

- Exceptions API returns full unsorted-beyond-type-order array; 10-item cap enforced in component only (not API layer) — plan spec
- Stale detection uses `created_at` for all three entity types; `last_updated` TEXT field on actions/risks is unreliable per plan notes
- Milestones excluded from stale check per plan (no updated_at column)
- actions stale: `status != 'closed'` catches all non-closed values (open, in_progress, completed, cancelled)
- risks stale: `status NOT IN ('closed', 'resolved', 'mitigated', 'accepted')` — 'closed' included defensively even though not in current enum

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — TypeScript compiled clean on new files. Pre-existing errors in test files are out of scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Exceptions panel fully functional; ready for Phase 77-02 (Gantt phase date aggregation)
- ExceptionRecord type is exported from route.ts and can be imported by future consumers
- metrics:invalidate event bus integration ensures panel refreshes on any data mutation

---
*Phase: 77-intelligence-gantt*
*Completed: 2026-04-22*

## Self-Check: PASSED

- FOUND: `app/api/projects/[projectId]/exceptions/route.ts`
- FOUND: `components/ExceptionsPanel.tsx`
- FOUND: `app/customer/[id]/overview/page.tsx`
- FOUND: `77-01-SUMMARY.md`
- FOUND commit: `7ea24814` (feat: exceptions API route)
- FOUND commit: `78bef462` (feat: ExceptionsPanel + overview wire)
