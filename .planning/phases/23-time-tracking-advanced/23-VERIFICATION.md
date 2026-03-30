---
phase: 23-time-tracking-advanced
verified: 2026-03-27T19:45:00Z
status: complete
score: 19/19 must-haves verified; human sign-off received 2026-03-30
human_verification:
  - test: "Admin settings persist and gate downstream features"
    expected: "Toggle enable on → save → reload → persists enabled; changing capacity/due-day saves correctly"
    why_human: "DB persistence and UI round-trip cannot be fully verified without running server"
  - test: "Approval workflow end-to-end in browser"
    expected: "Submit Week changes entries to 'Submitted' (blue badge); Approve turns green + shows lock icon; approved entry edit button hidden/disabled; Reject with reason turns red"
    why_human: "Status badge rendering, button state, and visual transitions require live browser"
  - test: "Google Calendar OAuth flow navigable"
    expected: "Clicking 'Import from Calendar' when not connected shows 'Connect Google Calendar' button; clicking it redirects to Google OAuth consent screen"
    why_human: "OAuth redirect chain and external Google consent screen cannot be verified programmatically"
  - test: "Bulk operations process entries in approver role"
    expected: "With ?role=approver, checkboxes appear; selecting 2+ shows bulk toolbar; Approve Selected changes both entries' status; Delete Selected removes entries after confirm dialog"
    why_human: "Role-conditional UI rendering and multi-step interaction require live browser"
  - test: "Export downloads a real file with audit columns"
    expected: "Export CSV downloads a file; opening it shows Submitted_On, Approved_On, Rejected_On columns present; Export Excel downloads .xlsx"
    why_human: "File download and column content require browser/filesystem verification"
  - test: "Grouping renders with subtotals"
    expected: "Group by Status shows sections for Draft/Submitted/Approved/Rejected with total/billable/non-billable hours in each group header"
    why_human: "Visual grouping layout and subtotal accuracy require live browser with real data"
  - test: "Notification banner appears and dismisses"
    expected: "After approving an entry, yellow banner at top of TimeTab shows 'You have 1 timesheet notification'; View expands list; Dismiss removes notification from list"
    why_human: "Banner visibility, expand/collapse, and PATCH dismiss require live browser interaction"
  - test: "TTADV-17 known gap: grouping by role/phase/task"
    expected: "Grouping by 'role', 'phase', 'task' is NOT implemented — only project, team_member, status, date are available. User should confirm this known gap is acceptable."
    why_human: "TTADV-17 requirement lists 6 grouping dimensions; only 4 are implemented due to schema limitations"
---

# Phase 23: Time Tracking Advanced — Verification Report

**Phase Goal:** The Time tab gains an approval workflow, Google Calendar import, and admin configuration — transforming basic time logging into a team-grade time management system with submission reminders, locked entries, and bulk operations.

**Verified:** 2026-03-27T19:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

All automated checks pass. Human verification is needed for UI/UX behaviors, browser rendering, file download, and OAuth redirect chain.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Admin can configure time tracking globally from Settings | VERIFIED | `TimeTrackingSettings.tsx` (432 lines), GET/PATCH `/api/settings/time-tracking` exports confirmed, `fetch('/api/settings/time-tracking')` at line 80 and 104 |
| 2 | Admin settings persist to DB (time_tracking_config table) | VERIFIED | Migration `0018_time_tracking_config.sql` with `CREATE TABLE IF NOT EXISTS "time_tracking_config"` + seed row; `timeTrackingConfig` exported from `db/schema.ts` |
| 3 | User can submit week for approval | VERIFIED | `submit/route.ts` — sets `submitted_on`, `submitted_by` on all draft entries for the week; TimeTab `Submit Week` dialog at line 177+ with `fetch(...time-entries/submit)` at line 208 |
| 4 | Approver can approve entries (with auto-lock) | VERIFIED | `approve/route.ts` — sets `approved_on`, `approved_by`, `locked`; reads `lock_after_approval` from config; `buildApprovalNotification` wired at line 120 |
| 5 | Approver can reject entries with mandatory reason | VERIFIED | `reject/route.ts` — requires `reason` (zod `.min(1)`), appends `[Rejected: reason]` to description, sets `rejected_on`; `buildRejectionNotification` wired at line 112 |
| 6 | Approver can submit on behalf of another user | VERIFIED | TimeTab `Submit for:` selector at line 249–266 (datalist pattern); `submitted_by` passed in POST body at line 206 |
| 7 | Approved entries locked for editing (status gating) | VERIFIED | `lib/time-tracking.ts` exports `canEdit` (returns false for approved/locked); TimeTab uses `canEdit(entry)` at lines 1157, 1287 to gate edit/delete buttons |
| 8 | Status badges (Draft/Submitted/Approved/Rejected/Locked) in TimeTab | VERIFIED | `getEntryStatus` imported and called at lines 1156, 1285; `data-testid="status-badge"` at line 30 |
| 9 | User can connect Google Calendar via OAuth | VERIFIED | `app/api/oauth/calendar/route.ts` uses `GOOGLE_CALENDAR_REDIRECT_URI` exclusively (no fallback to Gmail URI), scope `calendar.events.readonly`; `app/api/oauth/calendar/callback/route.ts` uses `oauth_calendar_state` cookie |
| 10 | User can import calendar events as draft time entries | VERIFIED | `calendar-import/route.ts` (258 lines): GET lists events with project matching; POST creates draft entries; TTADV-14 — uses `event.start.dateTime.split('T')[0]` for date |
| 11 | Auto-match events to projects by attendee overlap | VERIFIED | `calendar-import/route.ts` line 106+ — stakeholder email overlap logic with `high`/`low`/`none` confidence |
| 12 | User can override project match or skip events | VERIFIED | `CalendarImportModal.tsx` (370 lines) — project dropdown per event, skip checkbox, confidence badges |
| 13 | CalendarImportModal wired in TimeTab | VERIFIED | `TimeTab.tsx` imports `CalendarImportModal` at line 7; renders at line 983 with `projectId` and `onSuccess` props |
| 14 | Bulk approve/reject/move/delete for approvers | VERIFIED | `bulk/route.ts` (312 lines) — zod-validated action enum, all 4 actions implemented; TimeTab `selectedIds` state at line 320, bulk fetch at line 386+ |
| 15 | Bulk approve dispatches approval notifications | VERIFIED | `bulk/route.ts` imports `buildApprovalNotification` at line 8; called at line 136 per entry, outside transaction (best-effort) |
| 16 | Bulk UI only visible for approver/admin role | VERIFIED | TimeTab `showBulkBar` at line 321; checkboxes and bulk toolbar gated on approver role check |
| 17 | Export CSV and Excel with audit fields | VERIFIED | `export/route.ts` (238 lines) — ExportRow type includes `Submitted_On`, `Approved_On`, `Rejected_On`, `Team_Member`; CSV headers at lines 58–60; xlsx uses ExcelJS |
| 18 | Table grouping with subtotals | VERIFIED | `TimeTab.tsx` imports `groupEntries`, `computeSubtotals` at line 9; grouped render at lines 1128–1131; `export/route.ts` uses same helpers for grouped xlsx |
| 19 | In-app notifications for approval/rejection | VERIFIED | `time-tracking-notifications.ts` exports all 3 functions; `app_notifications` table created by `0019_notifications.sql`; notification API GET/PATCH at `/api/notifications/time-tracking`; TimeTab polls at 60s interval (line 534); `timesheet-reminder` job registered in `worker/index.ts` at line 48 |

**Score:** 19/19 truths verified (automated)

---

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `bigpanda-app/__tests__/time-tracking-advanced/approval-state.test.ts` | VERIFIED | 16 tests — 41/41 suite passes GREEN |
| `bigpanda-app/__tests__/time-tracking-advanced/entry-locking.test.ts` | VERIFIED | 10 tests — part of 41/41 GREEN |
| `bigpanda-app/__tests__/time-tracking-advanced/grouping.test.ts` | VERIFIED | 15 tests — part of 41/41 GREEN |
| `bigpanda-app/lib/time-tracking.ts` | VERIFIED | 156 lines; all 9 functions exported (getEntryStatus, canEdit, canSubmit, isLocked, canOverrideLock, buildLockPayload, buildUnlockPayload, groupEntries, computeSubtotals) |
| `bigpanda-app/db/migrations/0018_time_tracking_config.sql` | VERIFIED | Creates `time_tracking_config` table with seed row |
| `bigpanda-app/app/api/settings/time-tracking/route.ts` | VERIFIED | Exports `GET` and `PATCH`; Drizzle-backed, zod-validated |
| `bigpanda-app/components/TimeTrackingSettings.tsx` | VERIFIED | 432 lines; 6 TTADV-01–06 sections; fetches `/api/settings/time-tracking` |
| `bigpanda-app/app/settings/time-tracking/page.tsx` | VERIFIED | Thin RSC rendering TimeTrackingSettings |
| `bigpanda-app/app/api/projects/[projectId]/time-entries/submit/route.ts` | VERIFIED | POST sets `submitted_on`, `submitted_by`; week-range query; audit log |
| `bigpanda-app/app/api/projects/[projectId]/time-entries/[entryId]/approve/route.ts` | VERIFIED | POST approves; reads `lock_after_approval`; calls `buildApprovalNotification` |
| `bigpanda-app/app/api/projects/[projectId]/time-entries/[entryId]/reject/route.ts` | VERIFIED | POST rejects with mandatory reason; calls `buildRejectionNotification` |
| `bigpanda-app/app/api/oauth/calendar/route.ts` | VERIFIED | `GOOGLE_CALENDAR_REDIRECT_URI` exclusive; scope `calendar.events.readonly` |
| `bigpanda-app/app/api/oauth/calendar/callback/route.ts` | VERIFIED | `oauth_calendar_state` cookie; guards on missing refresh_token; upserts to `user_source_tokens` |
| `bigpanda-app/app/api/oauth/calendar/status/route.ts` | VERIFIED | Returns `{ connected, expires_at }` |
| `bigpanda-app/app/api/projects/[projectId]/time-entries/calendar-import/route.ts` | VERIFIED | 258 lines; `setCredentials()` + `'tokens'` event; no `refreshAccessToken`; event-date for entries; all-day event filter |
| `bigpanda-app/components/CalendarImportModal.tsx` | VERIFIED | 370 lines; status check + connect prompt; project override; skip; confidence badges |
| `bigpanda-app/app/api/projects/[projectId]/time-entries/bulk/route.ts` | VERIFIED | 312 lines; all 4 actions; `buildApprovalNotification` per approved entry; audit log |
| `bigpanda-app/app/api/projects/[projectId]/time-entries/export/route.ts` | VERIFIED | 238 lines; 13-column CSV with audit fields; ExcelJS grouped xlsx with subtotals |
| `bigpanda-app/lib/time-tracking-notifications.ts` | VERIFIED | Exports `computePendingReminders`, `buildApprovalNotification`, `buildRejectionNotification` |
| `bigpanda-app/db/migrations/0019_notifications.sql` | VERIFIED | Creates `app_notifications` table with index |
| `bigpanda-app/app/api/notifications/time-tracking/route.ts` | VERIFIED | GET returns unread notifications; PATCH marks read |
| `bigpanda-app/app/api/jobs/handlers/timesheet-reminder.ts` | VERIFIED | Exists (plan-specified path) |
| `bigpanda-app/worker/jobs/timesheet-reminder.ts` | VERIFIED | Calls `computePendingReminders`; registered as `'timesheet-reminder'` in `worker/index.ts` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `TimeTrackingSettings.tsx` | `/api/settings/time-tracking` | `fetch` GET on mount, PATCH on change | WIRED | Lines 80 and 104 |
| `db/schema.ts` | `0018_time_tracking_config.sql` | `timeTrackingConfig` table export | WIRED | Lines 460–478 in schema.ts |
| `TimeTab.tsx` | `/api/projects/[id]/time-entries/submit` | `Submit Week` dialog POST | WIRED | Line 208 |
| `approve/route.ts` | `timeEntries` DB table | Drizzle update `approved_on`, `approved_by`, `locked` | WIRED | Drizzle update call confirmed |
| `approve/route.ts` | `lib/time-tracking-notifications.ts` | `buildApprovalNotification` after DB update | WIRED | Import line 9; call line 120 |
| `reject/route.ts` | `lib/time-tracking-notifications.ts` | `buildRejectionNotification` after DB update | WIRED | Import line 9; call line 112 |
| `CalendarImportModal.tsx` | `/api/projects/[id]/time-entries/calendar-import` | GET to list events, POST to import | WIRED | Both fetch calls present in 370-line component |
| `calendar-import/route.ts` | `user_source_tokens` DB table | `setCredentials()` + `'tokens'` event (no deprecated `refreshAccessToken`) | WIRED | Lines 9, 26–30 in calendar-import route; `refreshAccessToken` absent |
| `TimeTab.tsx` | `/api/projects/[id]/time-entries/bulk` | POST with action + entry IDs | WIRED | Line 386 |
| `bulk/route.ts` | `buildApprovalNotification` | Called per approved entry outside transaction | WIRED | Lines 8 and 136 |
| `TimeTab.tsx` | `/api/projects/[id]/time-entries/export` | GET with `?format=csv|xlsx` | WIRED | `export?format` pattern in TimeTab |
| `TimeTab.tsx` | `lib/time-tracking.ts` | `groupEntries` + `computeSubtotals` for grouped view | WIRED | Import line 9; usage lines 1128–1131 |
| `worker/jobs/timesheet-reminder.ts` | `lib/time-tracking-notifications.ts` | `computePendingReminders()` | WIRED | Import line 8; call line 14 |
| `worker/index.ts` | `worker/jobs/timesheet-reminder.ts` | `JOB_HANDLERS['timesheet-reminder']` | WIRED | Lines 33 and 48 |
| `TimeTab.tsx` | `/api/notifications/time-tracking` | Polling every 60s; PATCH on dismiss | WIRED | Lines 522–539 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| TTADV-01 | 23-02, 23-08 | Admin global enable/disable toggle | SATISFIED | `TimeTrackingSettings.tsx` enable toggle; PATCH to DB |
| TTADV-02 | 23-02, 23-08 | Admin configures capacity, working days, due date, reminder frequency | SATISFIED | 6-section settings UI covers all fields |
| TTADV-03 | 23-02, 23-08 | Admin manages custom time entry categories | SATISFIED | Category pill manager with add/remove in settings UI |
| TTADV-04 | 23-02, 23-08 | Admin restricts time entry to assigned projects / active only | SATISFIED | `restrict_to_assigned` + `active_projects_only` toggles in UI |
| TTADV-05 | 23-02, 23-08 | Admin designates exempt users | SATISFIED | Exempt users tag-input in settings UI; `computePendingReminders` checks `exempt_users` |
| TTADV-06 | 23-02, 23-08 | Admin locks timesheets after approval | SATISFIED | `lock_after_approval` toggle; approve route reads it from DB |
| TTADV-07 | 23-01, 23-03, 23-08 | User submits week for approval | SATISFIED | Submit route + TimeTab Submit Week dialog |
| TTADV-08 | 23-03, 23-08 | Approver can approve/reject individually AND in bulk | SATISFIED | Per-entry routes (23-03); bulk route (23-05) — both satisfy this requirement |
| TTADV-09 | 23-03, 23-08 | Approver submits on behalf of another user | SATISFIED | `Submit for:` datalist in Submit Week dialog; `submitted_by` passed to API |
| TTADV-10 | 23-01, 23-03, 23-08 | Approved entries locked for editing unless overridden | SATISFIED | `canEdit` returns false for approved/locked; Override Lock button in TimeTab |
| TTADV-11 | 23-04, 23-08 | User connects Google Calendar via OAuth | SATISFIED | 3 OAuth routes; `CalendarImportModal` connect prompt |
| TTADV-12 | 23-04, 23-08 | Auto-match events to projects by attendee overlap | SATISFIED | Stakeholder email overlap logic in `calendar-import` GET |
| TTADV-13 | 23-04, 23-08 | User overrides project match or marks as non-project | SATISFIED | `CalendarImportModal` project dropdown + skip checkbox |
| TTADV-14 | 23-04, 23-08 | Imported entries use event date, not import date | SATISFIED | `event.start.dateTime.split('T')[0]` used for `date` field |
| TTADV-15 | 23-01, 23-05, 23-08 | Bulk approve/reject/move/delete | SATISFIED | `bulk/route.ts` all 4 actions; TimeTab checkbox multi-select toolbar |
| TTADV-16 | 23-06, 23-08 | Export CSV/Excel with audit fields | SATISFIED | `export/route.ts` — 13 columns including all audit fields |
| TTADV-17 | 23-01, 23-06, 23-08 | Grouping by project/team member/status + subtotals | PARTIAL — known gap | 4 of 6 dimensions implemented (project, team_member, status, date). Role/phase/task grouping not implemented — `time_entries` schema has no per-entry role/phase/task fields. Documented in Plans 23-01, 23-06, and 23-07 summaries as known schema gap. |
| TTADV-18 | 23-07, 23-08 | Submission reminder notifications, exempt users excluded | SATISFIED | `computePendingReminders` checks `exempt_users`; `timesheet-reminder` BullMQ job registered |
| TTADV-19 | 23-05, 23-07, 23-08 | Approval/rejection notifications with summary | SATISFIED | `buildApprovalNotification` wired in approve route + bulk approve; `buildRejectionNotification` wired in reject route |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `TimeTrackingSettings.tsx` | 330, 402 | HTML `placeholder` attributes on `<input>` elements | Info | Standard HTML — not a code stub. Values are input hints ("New category name", "user@example.com or username"). No impact. |

No blockers or functional stubs found. No `TODO`/`FIXME`/`PLACEHOLDER` comments in logic code. No empty return stubs in API routes or lib functions.

---

### Known Gaps (Non-Blocking)

**TTADV-17 partial — role/phase/task grouping:**
The requirement lists 6 grouping dimensions: project, team member, status, role, phase, task. Only 4 are implemented. The `time_entries` schema (Phase 17 SCHEMA-03) has no `role`, `phase`, or `task` per-entry columns. All three plans (23-01, 23-06 objective note, 23-06 summary) explicitly document this as a schema gap requiring a future extension. The 4 implemented dimensions fully satisfy the testable portion of the requirement. Human should confirm this known gap is acceptable or file a schema extension issue.

**Google Calendar OAuth requires external setup:**
The OAuth flow is implemented correctly but completing the auth handshake requires Google Cloud Console configuration (enable Calendar API, add redirect URI, set `GOOGLE_CALENDAR_REDIRECT_URI` env var). This is by design — the User Setup section of Plan 23-04 documents all steps.

**Migration manual application:**
`0018_time_tracking_config.sql` required manual `psql -f` application during Plan 23-02 execution. Documented in Plan 23-08 summary. This is an ops gap, not a code gap.

---

### Human Verification Required

**1. Admin settings persist and gate downstream features**
**Test:** Visit `/settings/time-tracking`. Toggle "Enable Time Tracking" on → Save → reload → confirm still enabled. Change weekly capacity to 36 → save → reload → confirm 36 persists.
**Expected:** All changes survive page reload; "Saving..." indicator appears during PATCH.
**Why human:** DB persistence and optimistic UI require live server + browser round-trip.

**2. Approval workflow end-to-end in browser**
**Test:** Visit any project Time tab. Submit Week. Confirm entries show "Submitted" (blue). Visit same URL with `?role=approver`. Approve one entry → confirm green badge + lock icon. Reject one with reason → confirm red badge. Try editing an approved entry → confirm edit button is hidden or disabled.
**Expected:** Status transitions are visually correct; locked entry cannot be edited.
**Why human:** Status badge colors, edit-button disabling, and visual transitions require live browser.

**3. Google Calendar OAuth flow navigable**
**Test:** Click "Import from Calendar" in TimeTab. Confirm "Connect Google Calendar" button appears when not connected. Click it — confirm redirect to Google OAuth consent page (even if not completing auth).
**Expected:** OAuth redirect chain works; correct Google consent screen appears with Calendar scope.
**Why human:** OAuth redirect and external Google screen cannot be verified programmatically.

**4. Bulk operations in approver role**
**Test:** Visit Time tab with `?role=approver`. Confirm checkboxes appear in entry rows. Select 2 submitted entries. Confirm bulk toolbar appears with Approve/Reject/Move/Delete. Bulk approve both → confirm both show green "Approved" badge.
**Expected:** Bulk toolbar appears on selection; actions process all selected entries.
**Why human:** Role-conditional UI and multi-step interaction require live browser with real data.

**5. Export downloads a real file with audit columns**
**Test:** Click Export dropdown → "Export CSV". Open downloaded file. Confirm columns include `Submitted_On`, `Approved_On`, `Rejected_On`, `Team_Member`. Click "Export Excel" → confirm `.xlsx` file opens in spreadsheet app.
**Expected:** Files download and contain the documented columns.
**Why human:** File download and column inspection require browser/filesystem access.

**6. Grouping renders with subtotals**
**Test:** In TimeTab, change "Group by" to "Status". Confirm entries are grouped into Draft/Submitted/Approved/Rejected sections. Confirm each group header shows total/billable/non-billable hours.
**Expected:** Grouped sections render with zinc-100 header row and correct subtotals.
**Why human:** Visual grouping and subtotal accuracy require live browser with real data.

**7. Notification banner appears and dismisses**
**Test:** Approve an entry. Confirm a yellow banner appears at the top of TimeTab ("You have 1 timesheet notification"). Click "View" → see "Time Entry Approved" notification. Click "Dismiss" → notification removed.
**Expected:** Banner appears, view expands list, dismiss removes item from list.
**Why human:** DOM rendering, expand/collapse, and optimistic dismiss require live browser.

**8. TTADV-17 known gap confirmation**
**Test:** In TimeTab Group by selector, confirm options are: None, Project, Team Member, Status, Date. Confirm NO options for Role, Phase, or Task.
**Expected:** 5 options visible (None + 4 schema-supported dimensions). User confirms this known gap is acceptable or creates a future schema extension task.
**Why human:** Gap is documented but user sign-off on acceptability is required.

---

## Summary

Phase 23 achieved its goal at the code level. All 19 TTADV requirements have corresponding, substantive, wired implementations. The TDD suite (41/41 tests GREEN) validates all core state machine logic. All key links between components, API routes, and the DB layer are verified present and connected.

One partial gap exists: TTADV-17 specifies grouping by role/phase/task which requires schema fields not present in Phase 23's approved schema. This is documented across three plan artifacts as a known constraint, not an oversight.

Human verification is required for visual rendering, OAuth redirect chain, file download, and the TTADV-17 gap acceptability sign-off before Phase 23 can be closed as fully complete.

---

_Verified: 2026-03-27T19:45:00Z_
_Verifier: Claude (gsd-verifier)_
