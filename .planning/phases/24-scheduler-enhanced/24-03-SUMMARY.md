---
phase: 24-scheduler-enhanced
plan: 03
subsystem: ui
tags: [react, nextjs, tailwind, drizzle, lucide-react, sonner, scheduler]

# Dependency graph
requires:
  - phase: 24-01
    provides: scheduler-skills.ts with SKILL_LIST, SIDEBAR_NAV_ITEMS, scheduler API routes (GET/PATCH/DELETE /api/jobs, POST /api/jobs/trigger)
  - phase: 23-time-tracking-advanced
    provides: app_notifications table with NotificationBadge component pattern
provides:
  - /scheduler RSC page rendering SchedulerJobTable
  - SchedulerJobTable client component — sorted job list, Create Job button stub (data-testid=create-job-button)
  - SchedulerJobRow client component — 7-column row, inline expand, enable/disable toggle (PATCH), trigger (POST), delete with confirm, run history list
  - Sidebar /scheduler link with scheduler_failure NotificationBadge count (data-testid=sidebar-scheduler-link)
affects: [24-04-CreateJobWizard, any phase that extends scheduler UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - RSC fetches jobs server-side, passes initialJobs prop to client component (no client-side GET on mount)
    - Optimistic enable/disable toggle — flip immediately, revert on error
    - Inline expand via sibling <tr colSpan={7}> row — no separate component
    - NotificationBadge on sidebar link queried directly in async RSC via drizzle (parallel with getActiveProjects)

key-files:
  created:
    - bigpanda-app/app/scheduler/page.tsx
    - bigpanda-app/components/SchedulerJobTable.tsx
    - bigpanda-app/components/SchedulerJobRow.tsx
  modified:
    - bigpanda-app/components/Sidebar.tsx

key-decisions:
  - "Sidebar queries app_notifications for scheduler_failure count in parallel with getActiveProjects — no extra request overhead"
  - "SchedulerJobRow.id typed as number (matches DB serial) not string — aligns with scheduledJobs schema"
  - "Edit button in expanded panel rendered as disabled stub — CreateJobWizard wired in Plan 04"
  - "Trigger button uses sonner toast (existing dep) for success/failure feedback — no spinner to avoid layout shift"

patterns-established:
  - "Scheduler UI pattern: RSC initialJobs prop → client state → optimistic mutations"
  - "Inline expand: sibling <tr colSpan={N}> pattern for zero-extra-component row expansion"

requirements-completed: [SCHED-05, SCHED-06, SCHED-07, SCHED-08, SCHED-09, SCHED-10]

# Metrics
duration: 3min
completed: 2026-03-30
---

# Phase 24 Plan 03: Scheduler Page UI Summary

**Scheduler page with sidebar link + failure badge, RSC job list, 7-column table with inline expand, enable/disable toggle, trigger button, and run history panel**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-30T18:59:10Z
- **Completed:** 2026-03-30T19:01:47Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added /scheduler sidebar link (data-testid=sidebar-scheduler-link, CalendarClock icon) with NotificationBadge showing unread scheduler_failure count queried via drizzle
- Created /scheduler RSC page that fetches GET /api/jobs server-side and passes jobs to SchedulerJobTable
- Implemented SchedulerJobTable with enabled-first sort, Create Job stub, and optimistic update/delete callbacks
- Implemented SchedulerJobRow with all 7 columns, inline expand panel (Edit stub / Enable-Disable / Delete + confirm), PATCH enable/disable toggle, POST trigger with sonner toast, and run history list (last 10, scrollable)

## Task Commits

1. **Task 1: Sidebar Scheduler link + notification badge** - `b053345` (feat)
2. **Task 2: /scheduler RSC page + SchedulerJobTable + SchedulerJobRow** - `d60898f` (feat)

**Plan metadata:** (see final docs commit below)

## Files Created/Modified

- `bigpanda-app/components/Sidebar.tsx` - Added /scheduler link with CalendarClock icon, scheduler_failure NotificationBadge count
- `bigpanda-app/app/scheduler/page.tsx` - RSC: fetches GET /api/jobs, renders SchedulerJobTable
- `bigpanda-app/components/SchedulerJobTable.tsx` - Client component: sorted job table, Create Job button, expand/update/delete state
- `bigpanda-app/components/SchedulerJobRow.tsx` - Client component: 7-column row, inline expand, optimistic toggle, trigger, delete, run history

## Decisions Made

- Sidebar drizzle query runs in parallel with getActiveProjects (Promise.all) — zero extra latency
- SchedulerJobRow.id typed as `number` to match the `serial` DB primary key
- Edit button in expanded panel is a disabled stub — CreateJobWizard wired in Plan 04 per spec
- sonner toast used for trigger feedback (already a project dependency, consistent with rest of app)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Scheduler read surface complete; Plan 04 can wire the CreateJobWizard into the Create Job button and the Edit stub
- sidebar-scheduler-link tests pass GREEN; TypeScript clean on all new scheduler files

## Self-Check: PASSED

- FOUND: bigpanda-app/app/scheduler/page.tsx
- FOUND: bigpanda-app/components/SchedulerJobTable.tsx
- FOUND: bigpanda-app/components/SchedulerJobRow.tsx
- FOUND: .planning/phases/24-scheduler-enhanced/24-03-SUMMARY.md
- FOUND commit b053345 (Task 1)
- FOUND commit d60898f (Task 2)

---
*Phase: 24-scheduler-enhanced*
*Completed: 2026-03-30*
