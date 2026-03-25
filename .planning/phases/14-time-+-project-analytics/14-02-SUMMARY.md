---
phase: 14-time-+-project-analytics
plan: "02"
subsystem: database
tags: [drizzle, postgres, analytics, typescript, tdd]

# Dependency graph
requires:
  - phase: 14-01
    provides: Phase 14 context + research confirming actions.updated_at and risk status field names
provides:
  - "0010_analytics.sql: ALTER TABLE projects ADD COLUMN weekly_hour_target NUMERIC(5,2)"
  - "ProjectWithHealth extended with velocityWeeks, actionTrend, openRiskCount, riskTrend"
  - "computeProjectAnalytics() exported from lib/queries.ts, called in getActiveProjects() and getProjectWithHealth()"
  - "computeTrend() helper: |diff|<=1→flat, >0→up, <0→down"
affects:
  - "14-03 Time tab — reads weekly_hour_target via project record"
  - "14-04 HealthCard — consumes ProjectWithHealth analytics fields"
  - "Dashboard page — getActiveProjects() now returns analytics fields on each project"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "computeProjectAnalytics wraps all queries in db.transaction + SET LOCAL RLS (same pattern as getWorkspaceData)"
    - "Velocity slot-filling: Monday-snapping + Map lookup + 4-slot array generation in JS"
    - "riskTrend compares openNow vs openLastWeek (created_at < now() - 7 days, still non-terminal status)"

key-files:
  created:
    - bigpanda-app/db/migrations/0010_analytics.sql
    - tests/analytics.test.ts
  modified:
    - bigpanda-app/db/schema.ts
    - bigpanda-app/lib/queries.ts

key-decisions:
  - "velocityWeeks fills 4 slots always: Monday-snap today, subtract 0/7/14/21 days, default 0 for missing weeks"
  - "actionTrend uses current week (slot[3]) vs prior week (slot[2]) via computeTrend()"
  - "riskTrend compares openRiskCount (now) vs risks created >7 days ago that are still open (openLastWeek)"
  - "drizzle-kit migrate fails without DATABASE_URL — migration noted in SUMMARY but does not block; schema.ts is the critical artifact"
  - "Pre-existing ioredis/bullmq type conflict in route.ts and worker/index.ts excluded from scope (out-of-scope pre-existing errors)"

patterns-established:
  - "All analytics DB queries: db.transaction + SET LOCAL app.current_project_id = ${projectId}"
  - "Sparse week-slot filling pattern reusable for any time-series aggregation"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-03-25
---

# Phase 14 Plan 02: Analytics Data Foundation Summary

**DB migration adds weekly_hour_target column; computeProjectAnalytics() populates 4-week action velocity, action trend, open risk count, and risk trend on every ProjectWithHealth record**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-25T21:14:55Z
- **Completed:** 2026-03-25T21:18:22Z
- **Tasks:** 2
- **Files modified:** 4 (schema.ts, queries.ts, 0010_analytics.sql, analytics.test.ts)

## Accomplishments

- Migration 0010_analytics.sql adds `weekly_hour_target NUMERIC(5,2)` to projects table with `IF NOT EXISTS` guard
- `ProjectWithHealth` extended with `velocityWeeks: number[]`, `actionTrend`, `openRiskCount`, `riskTrend`
- `computeProjectAnalytics()` implements 4-week Monday-snapped velocity slot-filling and risk trend comparison
- All analytics queries wrapped in RLS transaction (SET LOCAL app.current_project_id)
- `getActiveProjects()` and `getProjectWithHealth()` both wired to include analytics data
- 6 unit tests (node:test) GREEN: computeTrend thresholds, velocityWeeks slot-filling, ProjectWithHealth type shape

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration + schema update** - `0df4d25` (feat)
2. **Task 2 RED: analytics tests** - `c663a89` (test)
3. **Task 2 GREEN: computeProjectAnalytics() + ProjectWithHealth extension** - `099e948` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD task has two commits — test (RED) then implementation (GREEN)_

## Files Created/Modified

- `bigpanda-app/db/migrations/0010_analytics.sql` - ALTER TABLE projects ADD COLUMN weekly_hour_target
- `bigpanda-app/db/schema.ts` - Added `numeric` import and `weekly_hour_target` column to projects table
- `bigpanda-app/lib/queries.ts` - Extended ProjectWithHealth, added computeTrend(), computeProjectAnalytics(), wired into getActiveProjects/getProjectWithHealth
- `tests/analytics.test.ts` - 6 unit tests for pure-logic helpers (computeTrend, velocityWeeks slot-filling, type shape)

## Decisions Made

- velocityWeeks always returns exactly 4 elements — Monday-snap to find current week, generate -3w/-2w/-1w/current slots, default 0 for missing
- actionTrend uses slot[3] (current) vs slot[2] (prior) to detect week-over-week change
- riskTrend compares openRiskCount now vs risks created >7 days ago still open (captures newly created risks vs sustained load)
- drizzle-kit migrate requires DATABASE_URL — noted in SUMMARY but does not block; schema.ts carries the type contract

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `drizzle-kit migrate` failed with "url: undefined" (no DATABASE_URL set in environment) — expected, noted in plan. Schema update is the critical artifact. Migration can be run manually once DB is available.
- Pre-existing TypeScript errors in `app/api/jobs/trigger/route.ts`, `app/api/skills/[skillName]/run/route.ts`, `worker/index.ts` (ioredis/bullmq version conflict) — out of scope, confirmed pre-existing.

## User Setup Required

To apply the DB migration, run:
```bash
cd bigpanda-app && DATABASE_URL=<your-db-url> npx drizzle-kit migrate
```

## Next Phase Readiness

- 14-03 (Time tab) can now read `weekly_hour_target` from the project record — column defined in schema
- 14-04 (HealthCard) can consume all 4 analytics fields from `ProjectWithHealth` — type contract established
- Dashboard API endpoint (`getDashboardData`) already returns analytics fields via `getActiveProjects()`

---
*Phase: 14-time-+-project-analytics*
*Completed: 2026-03-25*
