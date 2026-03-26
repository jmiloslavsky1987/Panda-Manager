---
phase: 04-job-infrastructure
verified: 2026-03-26T02:12:31Z
status: gaps_found
score: 5/8 automated must-haves verified
re_verification: false
human_verification:
  - test: "Worker process starts alongside Next.js and registers all schedulers"
    expected: "Running `npm run dev` from bigpanda-app/ shows two processes in terminal: Next.js and the BullMQ worker; worker logs [scheduler] registered entries for morning-briefing, health-refresh, weekly-customer-status, context-updater, gantt-snapshot, risk-monitor, customer-project-tracker"
    why_human: "Requires live process inspection and Redis availability; not browser-testable"
  - test: "BullMQ advisory lock prevents concurrent overlap"
    expected: "Triggering the same job twice rapidly causes the second to log 'skipped: advisory lock ... held' in the worker process terminal"
    why_human: "Requires two concurrent job triggers and live Redis + PostgreSQL — not automatable in CI without full infrastructure"
  - test: "Settings UI does not expose schedule editing (SCHED-08 gap confirmation)"
    expected: "Visiting /settings → Jobs tab shows static cron schedule strings with no edit controls; changing a schedule requires editing the settings JSON file directly"
    why_human: "UI state inspection required; confirms that schedule configurability is worker-level only, not surfaced to the user"
---

# Phase 04 — Job Infrastructure Verification

Retroactive audit covering SCHED-01 through SCHED-08. Phase 04 built the BullMQ worker infrastructure (04-02..04-03), the Settings Jobs UI (04-04), and activated all E2E tests (04-05). Phase 15 subsequently modified scheduler.ts (removed phantom entries `action-sync` and `weekly-briefing`, added `morning-briefing` and `weekly-customer-status`, added `customer-project-tracker` with fixed schedule). This verification reads the **live codebase** as the source of truth.

---

## Goal Achievement — Observable Truths

| Observable Truth | Status | Evidence |
|-----------------|--------|----------|
| `bigpanda-app/worker/index.ts` exists and starts a BullMQ Worker (not in-process cron) | FOUND | Worker created with `new Worker(...)`, dedicated `createRedisConnection()`, `concurrency: 1` |
| `maxRetriesPerRequest: null` on Worker Redis connection | FOUND | `connection.ts` line 14: `maxRetriesPerRequest: null, // REQUIRED for BullMQ Worker` |
| `worker/scheduler.ts` has `JOB_SCHEDULE_MAP` and `registerAllSchedulers()` | FOUND | Maps 6 job names to settings schedule keys; also registers `customer-project-tracker` with fixed cron |
| Phase 15 removed phantom schedulers `action-sync` and `weekly-briefing` | CONFIRMED | `scheduler.ts` lines 25-26: `await jobQueue.removeJobScheduler('action-sync')` and `removeJobScheduler('weekly-briefing')` |
| `morning-briefing` registered with `morning_briefing` → `'0 8 * * *'` (SCHED-02) | SATISFIED | JOB_SCHEDULE_MAP entry confirmed; handler `worker/jobs/morning-briefing.ts` uses SkillOrchestrator |
| `weekly-customer-status` registered with `weekly_status` → `'0 16 * * 4'` (SCHED-06) | SATISFIED | JOB_SCHEDULE_MAP entry confirmed; handler `worker/jobs/weekly-customer-status.ts` creates drafts |
| `customer-project-tracker` registered with hardcoded `'0 9 * * *'` | GAP | Spec SCHED-05 requires Monday 7am (`0 7 * * 1`); actual schedule is daily 9am |
| Settings UI at `/settings` has Jobs tab with job status display | FOUND | `app/settings/page.tsx` — Radix Tabs, JOB_DISPLAY map, job rows with Trigger Now buttons |
| Schedule values in Settings UI are editable by user | NOT FOUND | `JOB_DISPLAY` in `page.tsx` has hardcoded schedule strings; no input controls for editing |
| `job_runs` table defined in schema | FOUND | `db/schema.ts` has jobRunStatusEnum + jobRuns table; migration `0003_add_job_runs.sql` created |

---

### Required Artifacts

| Expected File | Status | Details |
|--------------|--------|---------|
| `bigpanda-app/worker/index.ts` | FOUND | BullMQ Worker entry point with dispatch map, error listeners, graceful shutdown, 60s polling loop |
| `bigpanda-app/worker/connection.ts` | FOUND | `createRedisConnection()` with `maxRetriesPerRequest: null`; `createApiRedisConnection()` with fast-fail config |
| `bigpanda-app/worker/lock-ids.ts` | FOUND | 7 advisory lock IDs: ACTION_SYNC(1001)..RISK_MONITOR(1006), SKILL_RUN(1007) |
| `bigpanda-app/worker/scheduler.ts` | FOUND | `JOB_SCHEDULE_MAP` with 6 entries + `customer-project-tracker` hardcoded; phantom removal in place |
| `bigpanda-app/worker/jobs/action-sync.ts` | FOUND | No-op stub; advisory lock + job_runs audit pattern. NOT in JOB_SCHEDULE_MAP (removed by Phase 15) |
| `bigpanda-app/worker/jobs/health-refresh.ts` | FOUND | No-op stub; in JOB_SCHEDULE_MAP → `health_check` → `'0 8 * * *'` |
| `bigpanda-app/worker/jobs/weekly-briefing.ts` | FOUND | No-op stub; NOT in JOB_SCHEDULE_MAP (removed as phantom by Phase 15) |
| `bigpanda-app/worker/jobs/context-updater.ts` | FOUND | SkillOrchestrator delegation; in JOB_SCHEDULE_MAP → `slack_sweep` → `'0 9 * * *'` |
| `bigpanda-app/worker/jobs/gantt-snapshot.ts` | FOUND | No-op stub; in JOB_SCHEDULE_MAP → `tracker_weekly` → `'0 7 * * 1'` |
| `bigpanda-app/worker/jobs/risk-monitor.ts` | FOUND | No-op stub; in JOB_SCHEDULE_MAP → `biggy_briefing` → `'0 9 * * 5'` |
| `bigpanda-app/worker/jobs/morning-briefing.ts` | FOUND | SkillOrchestrator delegation; in JOB_SCHEDULE_MAP → `morning_briefing` → `'0 8 * * *'` |
| `bigpanda-app/worker/jobs/weekly-customer-status.ts` | FOUND | SkillOrchestrator delegation + drafts write; in JOB_SCHEDULE_MAP → `weekly_status` → `'0 16 * * 4'` |
| `bigpanda-app/worker/jobs/customer-project-tracker.ts` | FOUND | Registered with hardcoded `'0 9 * * *'` — not settings-driven |
| `bigpanda-app/app/api/job-runs/route.ts` | FOUND | GET returns latest run per 6 known jobs with null fallback |
| `bigpanda-app/app/api/jobs/trigger/route.ts` | FOUND | POST enqueues one-off BullMQ job via queue.add() with unique jobId |
| `bigpanda-app/app/settings/page.tsx` | FOUND | Jobs tab with hardcoded JOB_DISPLAY map; no schedule editing controls |
| `bigpanda-app/db/migrations/0003_add_job_runs.sql` | FOUND | DDL for job_run_status enum + job_runs table with 2 indexes |
| `bigpanda-app/lib/settings-core.ts` | FOUND | 6 schedule keys in AppSettings.schedule; defaults defined; read/write functions |

---

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `worker/index.ts` | `worker/scheduler.ts` | `registerAllSchedulers(settings)` | VERIFIED |
| `worker/index.ts` | BullMQ Worker | `new Worker('scheduled-jobs', handler, { connection: createRedisConnection() })` | VERIFIED |
| `worker/scheduler.ts` | `settings-core.ts` | `settings.schedule[scheduleKey]` for each job name | VERIFIED |
| `worker/scheduler.ts` | BullMQ `upsertJobScheduler` | Idempotent scheduler registration per job name | VERIFIED |
| `app/api/job-runs/route.ts` | `db/schema.ts` jobRuns | Drizzle ORM select with desc order + JS dedup | VERIFIED |
| `app/api/jobs/trigger/route.ts` | BullMQ Queue | `queue.add()` with `createApiRedisConnection()` fast-fail | VERIFIED |
| `app/settings/page.tsx` | `/api/job-runs` | `useEffect` fetch on mount | VERIFIED |
| `app/settings/page.tsx` | `/api/jobs/trigger` | Trigger Now button POST | VERIFIED |
| Settings UI → schedule editing | NOT CONNECTED | JOB_DISPLAY is hardcoded in page.tsx; no API route to read/write schedule from UI | GAP |

---

### Requirements Coverage

| Req ID | Source Plan | Description | Status | Evidence |
|--------|-------------|-------------|--------|----------|
| SCHED-01 | 04-02, 04-03 | BullMQ worker as dedicated process, not in-process cron | SATISFIED | `worker/index.ts`: dedicated `new Worker(...)` process; `connection.ts`: `maxRetriesPerRequest: null`; `concurrency: 1`; graceful shutdown handlers |
| SCHED-02 | 04-03 | Daily 8am Morning Briefing — result stored in DB, surfaced in dashboard | SATISFIED | `worker/jobs/morning-briefing.ts` exists; registered in JOB_SCHEDULE_MAP → `morning_briefing` → `'0 8 * * *'`; writes to skillRuns + outputs tables via SkillOrchestrator |
| SCHED-03 | 04-03 | Daily 8am cross-account health check — flag status changes, approaching due dates | SATISFIED (indirect) | `worker/jobs/health-refresh.ts` registered → `health_check` → `'0 8 * * *'`; currently no-op stub (skill wiring deferred to Phase 5); infrastructure + schedule in place |
| SCHED-04 | 04-03 | Daily 9am Slack + Gmail sweep | SATISFIED (indirect) | `worker/jobs/context-updater.ts` registered → `slack_sweep` → `'0 9 * * *'`; delegates to SkillOrchestrator; actual Slack/Gmail sweep depends on skill YAML + MCP config |
| SCHED-05 | 04-03 | Monday 7am Full Customer Project Tracker run | NEEDS HUMAN | `worker/jobs/customer-project-tracker.ts` exists and is registered, but cron is `'0 9 * * *'` (daily 9am) not `'0 7 * * 1'` (Monday 7am); also not in JOB_SCHEDULE_MAP so not settings-driven; schedule mismatch with SCHED-05 spec |
| SCHED-06 | 04-03, 04-04 | Thursday 4pm Weekly Status Draft — Gmail drafts, dashboard notification | SATISFIED | `worker/jobs/weekly-customer-status.ts` → `weekly_status` → `'0 16 * * 4'` (Thursday 4pm); writes to drafts table via `draft_type: 'email'`; SkillOrchestrator delegates to skill |
| SCHED-07 | 04-03 | Friday 9am Biggy Weekly Briefing — stored in Output Library | GAPS_FOUND | `risk-monitor` job is mapped to `biggy_briefing` schedule key → `'0 9 * * 5'` (Friday 9am); however `risk-monitor.ts` is a no-op stub with no briefing semantics; `weekly-briefing.ts` exists as stub but was removed from scheduler by Phase 15 as "phantom"; semantic mismatch between job name and requirement intent |
| SCHED-08 | 04-04 | All schedule times configurable via Settings; job status queryable in UI | GAPS_FOUND | Job status queryable: SATISFIED (`/api/job-runs` + Settings Jobs tab). Schedule configurability: GAPS_FOUND — `settings-core.ts` holds schedule values and they drive `upsertJobScheduler`, but Settings UI (`page.tsx`) shows hardcoded `JOB_DISPLAY` schedule strings with no edit controls; user cannot change schedules via UI |

---

### Anti-Patterns Found

None that are new or critical. The following pre-existing patterns are noted:

1. **JOB_DISPLAY hardcoded in Settings UI**: `page.tsx` has a static `JOB_DISPLAY` map with schedule strings that do not reflect the actual `settings.schedule` values. These are display strings only and cannot be edited. This is documented as a deferred decision from Phase 04 (key-decisions: "Cron schedules hardcoded in JOB_DISPLAY map").

2. **`action-sync` and `weekly-briefing` handler stubs retained but not scheduled**: Both files exist in `worker/jobs/` but their scheduler entries were removed by Phase 15. The handlers are orphaned but not harmful.

3. **`customer-project-tracker` uses hardcoded cron**: Unlike the other 6 jobs in `JOB_SCHEDULE_MAP`, `customer-project-tracker` uses a fixed `'0 9 * * *'` schedule that is not sourced from `settings.schedule` and cannot be changed without a code edit.

---

### TypeScript Compilation

Not re-run as part of this verification. Per 04-02-SUMMARY.md: one pre-existing TS2352 cast in `settings-core.ts` (moved from settings.ts during refactor) was noted as out-of-scope. No new TypeScript errors introduced by Phase 04 were reported across all Phase 04 SUMMARYs.

---

### Human Verification Required

**HV-01: Worker process startup and scheduler registration**
- Why: Redis required; not browser-testable; requires live process output inspection
- Steps: Run `npm run dev` from `bigpanda-app/`; inspect terminal for `[scheduler] registered morning-briefing → 0 8 * * *` and 6 other entries; confirm two processes (Next.js + worker)

**HV-02: Advisory lock prevents duplicate execution (SCHED-05 gap impact)**
- Why: Requires concurrent triggers with live Redis + PostgreSQL
- Steps: With worker running, trigger the same job twice rapidly via POST /api/jobs/trigger; check worker logs for "skipped: advisory lock ... held"

**HV-03: Settings UI schedule configurability gap**
- Why: Confirms SCHED-08 partial gap is accurately assessed
- Steps: Visit /settings → Jobs tab; verify no schedule input fields exist; confirm cron values shown are static display strings from JOB_DISPLAY (not from settings file)

---

### Gaps Summary

| Gap | Requirement | Severity | Remediation |
|-----|-------------|----------|-------------|
| `customer-project-tracker` cron is `'0 9 * * *'` not `'0 7 * * 1'` (Monday 7am) | SCHED-05 | Medium | Move to JOB_SCHEDULE_MAP with a `tracker_weekly` schedule key (already exists at `'0 7 * * 1'`) or add a dedicated settings key; requires Phase 17+ plan |
| `risk-monitor` mapped to `biggy_briefing` schedule — semantic mismatch with SCHED-07 | SCHED-07 | Low | Rename/rewire: create a `biggy-briefing` job handler for the Friday briefing; `risk-monitor` should use a dedicated schedule key; requires Phase 17+ plan |
| Settings UI has no schedule editing controls — user cannot change schedules without editing settings JSON | SCHED-08 (partial) | Medium | Add schedule editing form to Settings Jobs tab; wire to a settings PATCH API route; deferred to Phase 17+ |
| `action-sync` removed from scheduler but spec originally included it | Deferred scope | Low | `action-sync.ts` handler retained; Phase 17+ can reassess whether Action Sync background job is still required |
| Worker process startup not verifiable without Redis + PostgreSQL | SCHED-01, multiple | Infrastructure | Install Redis (`brew install redis && brew services start redis`) and apply migration before full verification |

**Overall verdict:** Phase 04 successfully established the BullMQ worker infrastructure, dedicated process pattern, advisory locking, job_runs audit table, and Settings UI. 5 of 8 SCHED requirements are satisfied or satisfied indirectly. SCHED-05 has a schedule mismatch (daily vs Monday), SCHED-07 has a semantic mismatch (risk-monitor serving biggy-briefing role), and SCHED-08 is partially satisfied (status queryable but schedule not UI-editable).
