---
phase: 23
slug: time-tracking-advanced
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (existing) |
| **Config file** | bigpanda-app/vitest.config.ts |
| **Quick run command** | `cd bigpanda-app && npx vitest run __tests__/time-tracking-advanced/` |
| **Full suite command** | `cd bigpanda-app && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd bigpanda-app && npx vitest run __tests__/time-tracking-advanced/`
- **After every plan wave:** Run `cd bigpanda-app && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 0 | TTADV-07, 08 | unit | `cd bigpanda-app && npx vitest run __tests__/time-tracking-advanced/approval-state.test.ts` | ❌ Wave 0 | ⬜ pending |
| 23-01-02 | 01 | 0 | TTADV-10 | unit | `cd bigpanda-app && npx vitest run __tests__/time-tracking-advanced/entry-locking.test.ts` | ❌ Wave 0 | ⬜ pending |
| 23-01-03 | 01 | 0 | TTADV-15, 17 | unit | `cd bigpanda-app && npx vitest run __tests__/time-tracking-advanced/grouping.test.ts` | ❌ Wave 0 | ⬜ pending |
| 23-02-01 | 02 | 1 | TTADV-01–06 | manual-only | N/A — DB-backed config, verified via browser | N/A | ⬜ pending |
| 23-02-02 | 02 | 1 | TTADV-01–06 | manual-only | N/A — Settings UI, verified via browser | N/A | ⬜ pending |
| 23-03-01 | 03 | 1 | TTADV-07–10 | unit | `cd bigpanda-app && npx vitest run __tests__/time-tracking-advanced/approval-state.test.ts` | ❌ Wave 0 | ⬜ pending |
| 23-03-02 | 03 | 1 | TTADV-07–10 | manual-only | N/A — UI submit/approve/reject flow, verified via browser | N/A | ⬜ pending |
| 23-04-01 | 04 | 2 | TTADV-11–14 | manual-only | N/A — requires live Google Calendar OAuth credentials | N/A | ⬜ pending |
| 23-04-02 | 04 | 2 | TTADV-11–14 | manual-only | N/A — event import + project match, verified via browser | N/A | ⬜ pending |
| 23-05-01 | 05 | 2 | TTADV-15 | unit | `cd bigpanda-app && npx vitest run __tests__/time-tracking-advanced/grouping.test.ts` | ❌ Wave 0 | ⬜ pending |
| 23-05-02 | 05 | 2 | TTADV-15 | manual-only | N/A — bulk toolbar UI, verified via browser | N/A | ⬜ pending |
| 23-06-01 | 06 | 2 | TTADV-16, 17 | unit | `cd bigpanda-app && npx vitest run __tests__/time-tracking-advanced/grouping.test.ts` | ❌ Wave 0 | ⬜ pending |
| 23-06-02 | 06 | 2 | TTADV-16, 17 | manual-only | N/A — file download + group-by UI, verified via browser | N/A | ⬜ pending |
| 23-07-01 | 07 | 2 | TTADV-18 | manual-only | N/A — reminder job scheduling, verified via app notification | N/A | ⬜ pending |
| 23-07-02 | 07 | 2 | TTADV-19 | manual-only | N/A — approval notification wiring, verified via browser | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/__tests__/time-tracking-advanced/approval-state.test.ts` — stubs for TTADV-07, TTADV-08
- [ ] `bigpanda-app/__tests__/time-tracking-advanced/entry-locking.test.ts` — stubs for TTADV-10
- [ ] `bigpanda-app/__tests__/time-tracking-advanced/grouping.test.ts` — stubs for TTADV-15, TTADV-17
- [ ] `bigpanda-app/__tests__/time-tracking-advanced/` directory itself

*All Wave 0 test files are created by Plan 23-01.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin settings persistence | TTADV-01–06 | DB-backed config, no unit test coverage | Navigate to Settings > Time Tracking; toggle enable/disable; set capacity + working days; verify persists on refresh |
| Submit timesheet UI flow | TTADV-07 | Requires running app + database | Click "Submit Week for Approval"; verify status changes to submitted; verify entries locked for edit |
| Approve/reject single entry | TTADV-08 | Requires running app + ?role=approver | Load TimeTab with ?role=approver; approve one entry; verify status = approved; verify locked |
| Submit on behalf | TTADV-09 | Requires ?role=approver UI flow | Load TimeTab with ?role=approver; open Submit Week dialog; verify "Submit for:" selector visible; submit for another user |
| Entry locked after approval | TTADV-10 | Requires approved entry in DB | Attempt to edit approved entry; verify edit blocked; load as approver; override lock; verify editable |
| Google Calendar OAuth | TTADV-11 | Requires live Google credentials + OAuth consent | Click "Connect Google Calendar"; complete OAuth flow; verify token stored; verify /api/oauth/calendar/status returns connected |
| Calendar event import | TTADV-12–14 | Requires connected calendar + events | Click "Import from Calendar"; verify events load; verify auto-match project; override one match; import; verify entries on event dates |
| Bulk operations toolbar | TTADV-15 | Requires running app with entries | Select multiple entries; verify bulk toolbar appears; test approve/reject/delete bulk actions |
| CSV/Excel export | TTADV-16 | File download requires browser | Click export; download CSV; verify audit fields present (submitted_at, approved_at, approved_by); download Excel; verify same |
| Table grouping | TTADV-17 | UI interaction required | Select "Group by Project"; verify grouped view with subtotals; test all 4 grouping dimensions |
| Submission reminder | TTADV-18 | Requires scheduler + time elapse | Verify reminder job is registered; check app_notifications table after due date passes |
| Approval/rejection notifications | TTADV-19 | Requires approve/reject action | Approve an entry; verify app_notifications table entry created; verify notification visible in UI |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
