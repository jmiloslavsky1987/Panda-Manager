---
phase: 14-time-+-project-analytics
plan: "03"
subsystem: api + ui
tags: [nextjs, analytics, typescript, drizzle, react]

# Dependency graph
requires:
  - phase: 14-02
    provides: "weekly_hour_target column in schema.ts + projects table; computeProjectAnalytics in queries.ts"
provides:
  - "GET /api/projects/:id/analytics — 8-week time_entries rollup with sparse slot-filling + weekly target fetch"
  - "PATCH /api/projects/:id/analytics — saves weekly_hour_target to projects table"
  - "TimeTab weekly summary collapsible table (data-testid=weekly-summary)"
  - "Inline-editable weekly target field (data-testid=weekly-target)"
affects:
  - "14-04 HealthCard — same analytics patterns established"
  - "E2E phase14.spec.ts SC-1 and SC-4 — testids now present in DOM"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Analytics GET wraps all queries in db.transaction + SET LOCAL RLS (same pattern as time-entries/route.ts)"
    - "Sparse 8-week slot-filling: generateWeekStarts() + Map lookup + default 0 for missing weeks"
    - "WeekRollupRow extends Record<string, unknown> to satisfy Drizzle tx.execute<T> generic constraint"
    - "RowList is iterable directly (for...of) — no .rows property"

key-files:
  created:
    - bigpanda-app/app/api/projects/[projectId]/analytics/route.ts
  modified:
    - bigpanda-app/components/TimeTab.tsx

key-decisions:
  - "tx.execute<T> generic requires T extends Record<string, unknown> — WeekRollupRow uses extends pattern"
  - "RowList from Drizzle is iterable (for...of / Array.from) — not .rows access like raw pg client"
  - "Analytics fetch runs alongside time-entries fetch in same useEffect (refreshCount triggers both)"
  - "summaryExpanded defaults to true — weekly summary visible by default"

patterns-established:
  - "8-week sparse slot-filling in API route (generates expected week-starts, fills from DB results, defaults 0)"
  - "Inline edit pattern: editingTarget bool + input with blur/Enter/Escape handlers"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-03-25
---

# Phase 14 Plan 03: Analytics API + TimeTab Weekly Summary Summary

**Analytics API endpoint (GET/PATCH) plus TimeTab weekly summary table and inline-editable capacity target field using 8-week sparse slot-filling and RLS-transaction pattern**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-25T21:20:15Z
- **Completed:** 2026-03-25T21:25:17Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `app/api/projects/[projectId]/analytics/route.ts` with GET (8-week rollup, weekly target fetch, this-week hours) and PATCH (save weekly_hour_target) handlers
- GET uses db.transaction + SET LOCAL RLS pattern, hours::numeric cast, sparse slot-filling for 8 weeks
- PATCH validates positive number or null, updates projects table via Drizzle ORM
- TimeTab.tsx extended with analytics state, second fetch in useEffect, handleSaveTarget function
- Weekly summary collapsible table above time entries log: `data-testid="weekly-summary"`, per-row `data-testid="weekly-summary-row"`
- Inline-editable target field: `data-testid="weekly-target"` on both display button and edit input
- Click-to-edit saves on blur/Enter, cancels on Escape
- This-week variance indicator shown when target is set
- All existing Phase 5.2 time entries table and controls untouched

## Task Commits

Each task was committed atomically:

1. **Task 1: Analytics API endpoint (GET + PATCH)** - `c92f7b3` (feat)
2. **Task 2: TimeTab weekly summary + capacity planning UI** - `718a5c6` (feat)

## Files Created/Modified

- `bigpanda-app/app/api/projects/[projectId]/analytics/route.ts` — GET and PATCH analytics handlers
- `bigpanda-app/components/TimeTab.tsx` — weekly summary section + capacity planning inline edit

## Decisions Made

- `tx.execute<T>` requires `T extends Record<string, unknown>` — used `extends Record<string, unknown>` pattern on row interfaces
- `RowList` from Drizzle is iterable with `for...of` / `Array.from()` — not `.rows` property
- Analytics fetch runs in same `useEffect` as time-entries (refreshCount triggers both refreshes together)
- `summaryExpanded` defaults `true` — summary visible immediately without user action

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Drizzle tx.execute<T> generic constraint and RowList access pattern**
- **Found during:** Task 1 verification
- **Issue:** `WeekRollupRow` lacked `extends Record<string, unknown>` causing TS2344; `.rows` property doesn't exist on Drizzle RowList (it's iterable directly)
- **Fix:** Added `extends Record<string, unknown>` to row interfaces; replaced `.rows` access with `for...of` and `Array.from()` patterns matching queries.ts
- **Files modified:** `bigpanda-app/app/api/projects/[projectId]/analytics/route.ts`
- **Commit:** included in c92f7b3 (fixed before initial commit)

## Issues Encountered

- Pre-existing TypeScript errors in `app/api/jobs/trigger/route.ts`, `app/api/skills/[skillName]/run/route.ts`, `worker/index.ts` (ioredis/bullmq version conflict) — confirmed pre-existing, out of scope
- Pre-existing `../lib/yaml-export.ts` js-yaml type declaration error — confirmed pre-existing, out of scope
- E2E tests require running dev server (playwright timeout) — expected; stubs remain RED until server+DB is up; TypeScript compilation is the primary gate

## Self-Check

Files exist:
- `bigpanda-app/app/api/projects/[projectId]/analytics/route.ts` — FOUND
- `bigpanda-app/components/TimeTab.tsx` — FOUND (modified)

Commits:
- `c92f7b3` — FOUND
- `718a5c6` — FOUND

## Self-Check: PASSED

---
*Phase: 14-time-+-project-analytics*
*Completed: 2026-03-25*
