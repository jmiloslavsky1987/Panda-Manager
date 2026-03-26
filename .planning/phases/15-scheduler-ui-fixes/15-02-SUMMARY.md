---
phase: 15-scheduler-ui-fixes
plan: "02"
subsystem: worker-scheduler, search-ui
tags: [scheduler, bullmq, skill-path, search, fts, settings]
dependency_graph:
  requires: [15-01]
  provides: [correct-scheduler-map, settings-driven-skill-path, complete-search-types]
  affects: [worker/scheduler.ts, worker/jobs/morning-briefing.ts, worker/jobs/weekly-customer-status.ts, worker/jobs/context-updater.ts, app/search/page.tsx]
tech_stack:
  added: []
  patterns: [resolveSkillsDir runtime path resolution, settings-driven skill path, BullMQ phantom cleanup]
key_files:
  created: []
  modified:
    - bigpanda-app/worker/scheduler.ts
    - bigpanda-app/worker/jobs/morning-briefing.ts
    - bigpanda-app/worker/jobs/weekly-customer-status.ts
    - bigpanda-app/worker/jobs/context-updater.ts
    - bigpanda-app/app/search/page.tsx
decisions:
  - "Export JOB_SCHEDULE_MAP and TYPE_OPTIONS for Vitest test import (named exports, not default)"
  - "resolveSkillsDir called inside handler function body (not module level) for runtime settings pickup"
  - "context-updater: advisory lock acquisition remains first async operation; readSettings called after lock succeeds"
  - "health.test.ts failures are pre-existing (db.transaction mock issue) — not introduced by this plan"
metrics:
  duration: "~2 minutes"
  completed: "2026-03-26"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 5
---

# Phase 15 Plan 02: Scheduler + UI Integration Gap Fixes Summary

**One-liner:** Fixed phantom BullMQ scheduler entries, migrated 3 job handlers to settings-driven resolveSkillsDir, and added 4 missing FTS search type options — all Wave 0 tests now GREEN.

## What Was Built

Three integration gap fixes identified by the v1.0 audit:

1. **JOB_SCHEDULE_MAP phantom entry swap** — `action-sync` and `weekly-briefing` replaced with `morning-briefing` → `morning_briefing` and `weekly-customer-status` → `weekly_status`. Both phantom IDs also get `removeJobScheduler()` cleanup calls at the top of `registerAllSchedulers()` to purge stale Redis entries on restart. `JOB_SCHEDULE_MAP` exported for test access.

2. **Settings-driven skill path in 3 handlers** — All three scheduled job handlers (`morning-briefing.ts`, `weekly-customer-status.ts`, `context-updater.ts`) now call `readSettings()` at invocation time and pass `resolveSkillsDir(settings.skill_path ?? '')` instead of a module-level hardcoded `path.join(__dirname, '../../skills')`. The advisory lock in context-updater remains the first async operation; `readSettings()` is called after the lock is acquired.

3. **Search TYPE_OPTIONS expanded** — Added `onboarding_steps`, `onboarding_phases`, `integrations`, and `time_entries` entries to the TYPE_OPTIONS array in `app/search/page.tsx`. Total count now 13 (1 "All Types" + 12 FTS tables). Array exported for test import.

## Test Results

| Test File | Tests | Status |
|-----------|-------|--------|
| tests/scheduler-map.test.ts | 6 | GREEN |
| tests/skill-run-settings.test.ts | 2 | GREEN |
| tests/search-type-options.test.ts | 5 | GREEN |
| app/api/__tests__/health.test.ts | 3 | RED (pre-existing, not introduced) |
| All other test files | 20 | GREEN |

**Total: 31 passed, 3 pre-existing failures**

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | bd79a90 | feat(15-02): fix JOB_SCHEDULE_MAP and remove phantom scheduler IDs |
| Task 2 | 23bf6e8 | feat(15-02): migrate 3 job handlers from hardcoded __dirname to resolveSkillsDir |
| Task 3 | 94174fb | feat(15-02): extend TYPE_OPTIONS with 4 missing FTS table entries |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All 5 modified files exist. All 3 task commits verified (bd79a90, 23bf6e8, 94174fb).
