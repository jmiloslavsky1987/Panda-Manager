---
phase: 23-time-tracking-advanced
plan: "07"
subsystem: time-tracking
tags: [db-migration, notifications, bullmq, api, react, drizzle, nextjs]
dependency_graph:
  requires:
    - 23-02 (time_tracking_config table for exempt_users and schedule config)
    - 23-03 (approve/reject routes that this plan extends with notification calls)
  provides:
    - app_notifications DB table (persistent in-app notifications)
    - GET/PATCH /api/notifications/time-tracking
    - lib/time-tracking-notifications.ts (computePendingReminders, buildApprovalNotification, buildRejectionNotification)
    - worker/jobs/timesheet-reminder.ts (BullMQ handler registered as 'timesheet-reminder')
    - TimeTab notification banner with dismiss
  affects:
    - Phase 23 plans 08+ (can build on notification infrastructure)
tech_stack:
  added: []
  patterns:
    - DB-backed in-app notifications via app_notifications table (persistent across sessions)
    - Non-fatal notification writes: approval/rejection calls wrapped in .catch() — never block the primary route response
    - Auto-refresh pattern: setInterval(fetchNotifications, 60_000) cleared on unmount
    - Worker handler at two paths: app/api/jobs/handlers/ (plan-specified artifact) + worker/jobs/ (actual BullMQ registration)
key_files:
  created:
    - bigpanda-app/db/migrations/0019_notifications.sql
    - bigpanda-app/lib/time-tracking-notifications.ts
    - bigpanda-app/app/api/notifications/time-tracking/route.ts
    - bigpanda-app/app/api/jobs/handlers/timesheet-reminder.ts
    - bigpanda-app/worker/jobs/timesheet-reminder.ts
  modified:
    - bigpanda-app/db/schema.ts (appNotifications table + AppNotification types)
    - bigpanda-app/worker/index.ts (registered 'timesheet-reminder' in JOB_HANDLERS)
    - bigpanda-app/components/TimeTab.tsx (notification banner + dismiss + auto-refresh)
    - bigpanda-app/app/api/projects/[projectId]/time-entries/[entryId]/approve/route.ts (wired buildApprovalNotification)
    - bigpanda-app/app/api/projects/[projectId]/time-entries/[entryId]/reject/route.ts (wired buildRejectionNotification)
decisions:
  - Migration numbered 0019 (plan said 0016, but 0016 already taken by wizard_schema.sql)
  - Notification calls in approve/reject routes are non-fatal — wrapped in .catch() to never block the primary 200 response
  - Worker handler created at both plan-specified path (app/api/jobs/handlers/) and actual BullMQ path (worker/jobs/) — registration goes through worker/index.ts
  - computePendingReminders uses fail-safe: returns 0 if time_tracking_config table missing or enabled=false
  - TimeTab auto-refresh uses setInterval cleared on unmount — avoids memory leak; interval is 60s matching spec
metrics:
  duration: "~3 min"
  completed: "2026-03-28"
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 5
---

# Phase 23 Plan 07: Time Tracking Notifications Summary

**One-liner:** DB-backed in-app notification system for time tracking — approval/rejection events insert to app_notifications and surface in TimeTab as a yellow dismissible banner with 60s auto-refresh.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Notifications DB table + notification logic lib | 6079839 | 0019_notifications.sql, schema.ts, time-tracking-notifications.ts |
| 2 | Notification API, reminder job handler, TimeTab notification display, approve/reject route wiring | 778f05b | route.ts, timesheet-reminder.ts (x2), worker/index.ts, TimeTab.tsx, approve/route.ts, reject/route.ts |

## What Was Built

**DB Layer:** `app_notifications` table with user_id, type, title, body, read, data (JSONB), created_at. Migration 0019 applied. Index on (user_id, read, created_at DESC) for fast unread queries. Drizzle schema exports `AppNotification` and `AppNotificationInsert` types.

**Notification Logic Lib:** `lib/time-tracking-notifications.ts` exports three functions:
- `computePendingReminders()`: fetches config, checks enabled flag and exempt_users, finds projects with unsubmitted entries in current week (Mon-Sun), inserts one `timesheet_reminder` per project. Fail-safe on missing config table.
- `buildApprovalNotification(entry, approvedBy)`: inserts `timesheet_approved` with entry description and date.
- `buildRejectionNotification(entry, rejectedBy, reason)`: inserts `timesheet_rejected` with full rejection reason in body.

**API Layer:** `GET /api/notifications/time-tracking` returns unread timesheet notifications for `user_id='default'`, newest first, limit 20. `PATCH /api/notifications/time-tracking` marks a single notification read by id.

**Worker Registration:** `worker/jobs/timesheet-reminder.ts` calls `computePendingReminders()` and is registered as `'timesheet-reminder'` in `worker/index.ts` JOB_HANDLERS dispatch map. Can be triggered manually via POST /api/jobs/trigger `{ jobName: 'timesheet-reminder' }`.

**Route Wiring (TTADV-19):** Approve route calls `buildApprovalNotification` after successful Drizzle update; reject route calls `buildRejectionNotification` with mandatory reason. Both calls are non-fatal (`.catch()`) — primary route response never blocked.

**TimeTab UI:** Yellow info bar appears when `unread_count > 0`. "View" button expands list of unread notifications with title, body, and "Dismiss" button. Dismiss calls PATCH and removes notification from local state. Notifications auto-refresh every 60s via `setInterval` (cleared on unmount).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migration file number collision**
- **Found during:** Task 1
- **Issue:** Plan specified `0016_notifications.sql` but `0016_wizard_schema.sql` already exists in migrations directory
- **Fix:** Named migration `0019_notifications.sql` (next available after `0018_time_tracking_config.sql`)
- **Files modified:** Migration file name only
- **Commit:** 6079839

**2. [Rule 2 - Missing Critical] Worker handler at actual BullMQ registration path**
- **Found during:** Task 2
- **Issue:** Plan specified handler at `app/api/jobs/handlers/timesheet-reminder.ts` but the real worker handler registry (`worker/index.ts`) imports from `worker/jobs/*.ts` using relative paths. A handler at the plan-specified path would not be executed by BullMQ.
- **Fix:** Created `worker/jobs/timesheet-reminder.ts` using relative import from `../../lib/time-tracking-notifications` and registered it as `'timesheet-reminder'` in `worker/index.ts` JOB_HANDLERS. Also kept the plan-specified path as a self-contained handler module.
- **Files modified:** worker/jobs/timesheet-reminder.ts (new), worker/index.ts (modified)
- **Commit:** 778f05b

## Verification

- DB: `SELECT * FROM app_notifications;` — table exists, accepts queries, currently empty
- grep approve/route.ts: `buildApprovalNotification` at lines 9 (import) and 120 (call)
- grep reject/route.ts: `buildRejectionNotification` at lines 9 (import) and 112 (call)
- Files: all 5 new files confirmed present; all 5 modified files confirmed updated
- TypeScript: zero errors from new/modified files (pre-existing errors in approve route `.rows` access and worker Redis type are out of scope, introduced in 23-03)

## Self-Check: PASSED

Files verified present:
- [x] bigpanda-app/db/migrations/0019_notifications.sql
- [x] bigpanda-app/lib/time-tracking-notifications.ts
- [x] bigpanda-app/app/api/notifications/time-tracking/route.ts
- [x] bigpanda-app/app/api/jobs/handlers/timesheet-reminder.ts
- [x] bigpanda-app/worker/jobs/timesheet-reminder.ts

Commits verified:
- [x] 6079839 — feat(23-07): notifications DB table + notification logic lib
- [x] 778f05b — feat(23-07): notification API, reminder job handler, TimeTab notification panel, approve/reject wiring
