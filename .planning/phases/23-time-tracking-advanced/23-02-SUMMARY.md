---
phase: 23-time-tracking-advanced
plan: "02"
subsystem: time-tracking
tags: [db-migration, admin-settings, api, ui, drizzle, nextjs]
dependency_graph:
  requires: []
  provides:
    - time_tracking_config DB table (single-row admin config)
    - GET/PATCH /api/settings/time-tracking
    - TimeTrackingSettings React component
    - /settings/time-tracking page
  affects:
    - Phase 23 plans 03-08 (all gate on tt config enabled flag)
tech_stack:
  added: []
  patterns:
    - Single-row config table seeded by migration (id=1 always exists)
    - Drizzle .update().where(eq(id,1)).returning() for config updates
    - Optimistic UI with error-revert in client component
    - Inline ToggleSwitch (no Switch shadcn dep — not installed)
key_files:
  created:
    - bigpanda-app/db/migrations/0018_time_tracking_config.sql
    - bigpanda-app/app/api/settings/time-tracking/route.ts
    - bigpanda-app/components/TimeTrackingSettings.tsx
    - bigpanda-app/app/settings/time-tracking/page.tsx
  modified:
    - bigpanda-app/db/schema.ts (added timeTrackingConfig table + types)
decisions:
  - Migration numbered 0018 (plan said 0015, but 0015 already taken by discovery_dedup_flag.sql)
  - Implemented inline ToggleSwitch instead of importing shadcn Switch (not in components/ui/)
  - Settings page at standalone route /settings/time-tracking (no sidebar layout in settings)
metrics:
  duration: "~2 min"
  completed: "2026-03-28"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 1
---

# Phase 23 Plan 02: Time Tracking Admin Configuration Summary

**One-liner:** time_tracking_config DB table + GET/PATCH API + 6-section Settings UI covering all TTADV-01 through TTADV-06 requirements.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DB migration — time_tracking_config table + schema export | 1a2ddcd | 0018_time_tracking_config.sql, schema.ts |
| 2 | Admin settings API + Settings UI component | 2ea91dc | route.ts, TimeTrackingSettings.tsx, page.tsx |

## What Was Built

**DB Layer:** `time_tracking_config` table with 11 config columns and a seeded default row. Migration applied successfully to local Postgres. Drizzle schema export provides `TimeTrackingConfig` and `TimeTrackingConfigInsert` types.

**API Layer:** `GET /api/settings/time-tracking` fetches the singleton row (id=1). `PATCH /api/settings/time-tracking` accepts partial updates, validates with zod, and returns the updated row. Both routes use the Drizzle `db` singleton.

**UI Layer:** `TimeTrackingSettings` client component covers all six TTADV requirements:
- TTADV-01: Enable/disable toggle (inline ToggleSwitch component)
- TTADV-02: Weekly capacity hours, working days checkboxes, submission due day select, due time input, reminder days
- TTADV-03: Category manager — display as pills with remove, add via text input + Enter/button
- TTADV-04: restrict_to_assigned and active_projects_only toggles
- TTADV-05: Exempt users — amber pill tags with add/remove
- TTADV-06: lock_after_approval toggle

Each field patches immediately on change (blur for text/number fields to avoid per-keystroke saves). Optimistic UI reverts on failure. "Saving..." / "Saved HH:MM:SS" status bar at top.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migration file number collision**
- **Found during:** Task 1
- **Issue:** Plan specified `0015_time_tracking_config.sql` but `0015_discovery_dedup_flag.sql` already exists
- **Fix:** Named migration `0018_time_tracking_config.sql` (next available after `0017_discovery_source_column.sql`)
- **Files modified:** Migration file name only
- **Commit:** 1a2ddcd

**2. [Rule 2 - Missing] shadcn Switch component not installed**
- **Found during:** Task 2
- **Issue:** Plan referenced shadcn Switch component but it is not in `components/ui/`
- **Fix:** Implemented inline `ToggleSwitch` button component with aria-checked, proper focus styles, and consistent styling
- **Files modified:** TimeTrackingSettings.tsx
- **Commit:** 2ea91dc

## Verification

- DB: `SELECT enabled, weekly_capacity_hours, categories FROM time_tracking_config LIMIT 1;` returns default row with `f, 40.00, {Development,Meetings,QA,Discovery,Admin}`
- TypeScript: `tsc --noEmit` produces zero errors from new files (pre-existing errors in ioredis/bullmq version mismatch are out of scope)
- Server not running during execution — API endpoint verified via file inspection and type-check

## Self-Check: PASSED

Files verified present:
- [x] bigpanda-app/db/migrations/0018_time_tracking_config.sql
- [x] bigpanda-app/app/api/settings/time-tracking/route.ts
- [x] bigpanda-app/components/TimeTrackingSettings.tsx
- [x] bigpanda-app/app/settings/time-tracking/page.tsx

Commits verified:
- [x] 1a2ddcd — feat(23-02): DB migration and schema export
- [x] 2ea91dc — feat(23-02): admin settings API + Settings UI
