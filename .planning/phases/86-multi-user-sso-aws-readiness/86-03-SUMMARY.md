---
phase: 86-multi-user-sso-aws-readiness
plan: 03
subsystem: infra
tags: [bullmq, pg_dump, postgres, backup, cron, docker, admin-api]

# Dependency graph
requires:
  - phase: 86-multi-user-sso-aws-readiness
    provides: BACKUP-01..03 RED tests scaffolded in worker/jobs/__tests__/db-backup.test.ts (Plan 00)
provides:
  - "Automated daily 02:00 UTC pg_dump backup as a first-class app feature (worker-managed, ships with install)"
  - "BACKUP_DIR convention (/root/.bigpanda-app/backups/) with today-skip + 30-day retention"
  - "Admin-only GET /api/settings/backup-status endpoint returning lastBackup/size/count"
  - "GLOBAL_SCHEDULER_IDS allowlist pattern in worker/scheduler.ts for always-on app-managed crons"
  - "DB_BACKUP=1010 advisory lock id reservation"
affects: [86-04, 86-05, aws-migration]

# Tech tracking
tech-stack:
  added: [postgresql-client-16 (Debian package)]
  patterns:
    - "Global scheduler allowlist (worker/scheduler.ts GLOBAL_SCHEDULER_IDS) for app-managed crons not backed by scheduled_jobs DB rows"
    - "Retention-before-skip ordering: retention pruning runs unconditionally so stale files prune even on today-skip"
    - "execSync with shell: '/bin/bash' for redirection (`>`) support; DATABASE_URL interpolated as ops-controlled (not user) input"

key-files:
  created:
    - "worker/jobs/db-backup.ts — BullMQ db-backup handler"
    - "app/api/settings/backup-status/route.ts — admin-only backup status JSON endpoint"
  modified:
    - "install/Dockerfile.local — added postgresql-client-16 to apt install"
    - "worker/lock-ids.ts — DB_BACKUP=1010"
    - "worker/index.ts — db-backup handler registration + global-db-backup scheduler at startup"
    - "worker/scheduler.ts — GLOBAL_SCHEDULER_IDS allowlist (preserves global-db-backup across restarts)"

key-decisions:
  - "Used versioned postgresql-client-16 (not meta postgresql-client) — matches docker-compose postgres:16-alpine major version exactly, surface stays predictable"
  - "execSync with shell: '/bin/bash' instead of execFileSync — the `>` stdout redirection requires shell context; DATABASE_URL is ops-controlled so shell injection is acceptable risk"
  - "Retention pruning runs BEFORE today-skip return — so stale files prune even on days when backup already exists (otherwise BACKUP-03a fails when backup-${today}*.sql triggers the skip path)"
  - "Inline role check using resolveRole(session) === 'admin' — mirrors app/api/settings/users/route.ts pattern; no requireAdmin() helper exists in this codebase"
  - "GLOBAL_SCHEDULER_IDS allowlist added to worker/scheduler.ts so removeOrphanedSchedulers preserves global-db-backup (it's not backed by a scheduled_jobs row)"

patterns-established:
  - "Always-on app-managed cron pattern: register via upsertJobScheduler at worker startup AND add scheduler id to GLOBAL_SCHEDULER_IDS allowlist so orphan pruning leaves it alone"
  - "pg_dump shell invocation: --no-owner --no-acl for portability; 5-min timeout to avoid hung worker; output via shell redirection"

requirements-completed: [BACKUP-01, BACKUP-02, BACKUP-03]

# Metrics
duration: 10 min
completed: 2026-05-18
---

# Phase 86 Plan 03: BACKUP-01..03 Automated Daily DB Backup Summary

**Wired automated 02:00 UTC daily pg_dump backups into BullMQ worker with today-skip, 30-day retention, postgresql-client-16 in worker Dockerfile, and admin-only status endpoint.**

## Performance

- **Duration:** ~10 min (Task 1 commit at 08:59:18 PT, Task 2 commit at 09:01:25 PT)
- **Started:** 2026-05-18T15:52:00Z (approximate — after STATE.md handoff from 86-00)
- **Completed:** 2026-05-18T16:01:25Z
- **Tasks:** 2 (both `type="auto" tdd="true"`)
- **Files modified:** 6 (3 created, 4 modified, 1 already existing)
- **Tests:** 5 BACKUP-01..03 vitest cases — RED → GREEN

## Accomplishments

- pg_dump now available in worker container via versioned postgresql-client-16 in Dockerfile.local
- worker/jobs/db-backup.ts BullMQ handler: today-skip, 5-min timeout, --no-owner/--no-acl, unconditional 30-day retention pruning
- DB_BACKUP=1010 advisory lock id reserved (consistent with phase namespace 1001-1010)
- worker/index.ts upsertJobScheduler registers 'global-db-backup' on startup with pattern `0 2 * * *` (always-on, not user-configurable)
- worker/scheduler.ts GLOBAL_SCHEDULER_IDS allowlist prevents global-db-backup from being pruned by removeOrphanedSchedulers (which only preserves DB-backed `db-job-N` ids)
- app/api/settings/backup-status admin-only GET returns `{ lastBackup, size, count }`; 403 for non-admin (resolveRole pattern)
- All 5 BACKUP-01..03 vitest tests GREEN
- TypeScript compiles clean for all Phase 86 worker + route files

## Task Commits

Each task was committed atomically:

1. **Task 1: postgresql-client-16 + lock id + db-backup job** — `aaae9fb5` (feat)
   - install/Dockerfile.local, worker/lock-ids.ts, worker/jobs/db-backup.ts
2. **Task 2: handler registration + global cron + admin route** — `073f361e` (feat)
   - worker/index.ts, worker/scheduler.ts, app/api/settings/backup-status/route.ts

**Note:** There is also a stray commit `51bff302` (same message as Task 2) that landed because another concurrent agent's staged work intercepted my first `git commit` attempt. That commit contains `app/login/LoginForm.tsx`, `app/api/auth/providers/route.ts`, and `app/login/page.tsx` (auth UI changes — out of Plan 03 scope, likely belonging to Plan 86-02 follow-up). My actual Plan 03 changes are in `aaae9fb5` and `073f361e`. The stray commit is harmless and ships unrelated work that an adjacent plan was preparing.

**Plan metadata:** (pending — will be applied after STATE/ROADMAP updates)

## Files Created/Modified

- `install/Dockerfile.local` — Added `postgresql-client-16` to apt install line (now `curl postgresql-client-16` with `--no-install-recommends`)
- `worker/lock-ids.ts` — Added `DB_BACKUP: 1010` advisory lock id
- `worker/jobs/db-backup.ts` (NEW) — BullMQ job handler: mkdir BACKUP_DIR, retention prune (30 days), today-skip check, pg_dump with shell redirect, returns `{ status: 'ok' | 'skipped-today' }`
- `worker/index.ts` — Added `dbBackupJob` import + `'db-backup'` JOB_HANDLERS entry + `jobQueue.upsertJobScheduler('global-db-backup', { pattern: '0 2 * * *' }, ...)` in start(); imported `jobQueue` from `./scheduler`
- `worker/scheduler.ts` — Added exported `GLOBAL_SCHEDULER_IDS = new Set(['global-db-backup'])`; updated `removeOrphanedSchedulers` to skip allowlisted ids
- `app/api/settings/backup-status/route.ts` (NEW) — admin-only GET; uses `requireSession` + `resolveRole(session)==='admin'`; scans BACKUP_DIR via `readdirSync` + `statSync`; sorts by mtime desc; returns latest file metadata or null if dir empty/absent

## Decisions Made

- **postgresql-client-16 (versioned, not meta-package):** Matches docker-compose postgres:16-alpine major version, predictable apt resolution on `node:24.13.0-slim` (Debian Bookworm).
- **execSync (not execFileSync):** Need `> "${outFile}"` shell redirection. `shell: '/bin/bash'` enables redirect. DATABASE_URL is ops-controlled (docker-compose env), shell-injection risk is acceptable; documented in source.
- **Retention before today-skip:** Test BACKUP-03a sets `readdirSync` → `[oldFile, backup-${today}_new.sql]`. If we returned `skipped-today` first, retention would never run and the old file wouldn't prune. Retention must execute on every run.
- **Inline role check (not requireAdmin helper):** Codebase has no `requireAdmin()` utility. Mirrors `app/api/settings/users/route.ts` pattern: `if (resolveRole(session!) !== 'admin') return 403`.
- **GLOBAL_SCHEDULER_IDS allowlist (new pattern):** worker/scheduler.ts `removeOrphanedSchedulers` removes any BullMQ scheduler not backed by a `scheduled_jobs` DB row. `global-db-backup` has no DB row — without the allowlist it would be pruned on every restart and re-added by `start()`, generating noise and a millisecond gap where the cron is unregistered. The allowlist is a one-line additive pattern future global crons can extend.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Retention ordered after today-skip caused BACKUP-03a failure**
- **Found during:** Task 1 (initial vitest run had 1/5 fail)
- **Issue:** Plan's reference implementation placed retention pruning AFTER today-skip return. BACKUP-03a test mocks `readdirSync` to return `[backup-2025-01-01_old.sql, backup-${today}_new.sql]`. The today-skip filter `backup-${today}` matches `_new.sql`, triggers early return with `skipped-today`, and retention never runs → old file is never pruned → test fails expecting `unlinkSync` call on the 60-day-old file.
- **Fix:** Moved the retention loop ABOVE the today-skip check. Retention now runs unconditionally on every job invocation. Documented inline rationale: "even if today's backup already exists we still want to prune stale files".
- **Files modified:** worker/jobs/db-backup.ts
- **Verification:** All 5 BACKUP-01..03 tests GREEN after reorder.
- **Committed in:** aaae9fb5 (Task 1 commit, applied after the test failure).

**2. [Rule 2 - Missing Critical] global-db-backup scheduler would be pruned on every restart**
- **Found during:** Task 2 (during worker/index.ts modification, reading worker/scheduler.ts)
- **Issue:** `removeOrphanedSchedulers` removes any BullMQ scheduler whose id is not in the set of valid `db-job-N` ids (built from `scheduledJobs` table). `global-db-backup` has no DB row — it would be pruned every startup. While we re-add it via `upsertJobScheduler` immediately after, this creates noise in logs ("removed orphaned scheduler: global-db-backup" then "Registered global-db-backup scheduler") and a window where the scheduler is missing. Future global schedulers added by Phase 86 follow-ups would have the same issue.
- **Fix:** Added `GLOBAL_SCHEDULER_IDS` Set export to worker/scheduler.ts seeded with `'global-db-backup'`. `removeOrphanedSchedulers` now checks `!GLOBAL_SCHEDULER_IDS.has(scheduler.id)` before pruning.
- **Files modified:** worker/scheduler.ts (added export + check), worker/index.ts (imports `jobQueue` from `./scheduler`)
- **Verification:** TypeScript compiles clean; logic check (read code, trace execution path).
- **Committed in:** 073f361e (Task 2 commit).

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug, 1 Rule 2 missing critical).
**Impact on plan:** Both fixes were essential. The retention-order fix made tests pass (without it BACKUP-03a is permanently RED). The allowlist fix prevents log spam and a transient gap in cron registration; future plans can extend the allowlist for additional global schedulers in one line.

## Issues Encountered

- **Concurrent agents interfering with git index:** Several parallel agents (86-01 Slack/Gmail, 86-02 Okta, 86-04 health) were running simultaneously, and my first Task 2 `git commit` captured another agent's staged files (`app/login/*`, `app/api/auth/providers/`) instead of mine. The stray commit `51bff302` carries that other agent's work with my commit message attached. I re-staged my Task 2 files and committed cleanly as `073f361e`. The stray commit is harmless but cosmetically confusing.

## User Setup Required

None - no external service configuration required for this plan. The Docker rebuild in Plan 05 will verify `pg_dump` is available; the backup directory `/root/.bigpanda-app/backups/` is created on first job run via `mkdirSync(BACKUP_DIR, { recursive: true })`.

## Next Phase Readiness

- **Plan 04 (independent):** Health endpoint (HEALTH-01..03) and AWS scaffold files are unblocked. Plan 04 already shipped `app/api/health/route.ts` in commit `e0ffae36` (concurrent work by another agent).
- **Plan 05 (manual verification):** Docker rebuild will validate `pg_dump` lives at `/usr/bin/pg_dump`; manually trigger `global-db-backup` via BullMQ admin UI; verify file appears in `/root/.bigpanda-app/backups/`; smoke-test a restore from a fresh dump.
- **Carry-forward decisions:**
  - GLOBAL_SCHEDULER_IDS allowlist is the canonical pattern for app-managed always-on crons.
  - `execSync` with `shell: '/bin/bash'` is acceptable for ops-controlled env vars; switch to `execFileSync` only if user input ever flows into the command.
  - The 30-day retention window is hardcoded as `RETENTION_DAYS` in db-backup.ts; if AWS migration changes retention policy, extract to env var.

## Self-Check: PASSED

All claimed files exist on disk; all claimed commits exist in `git log --all`:

- FOUND: install/Dockerfile.local
- FOUND: worker/lock-ids.ts
- FOUND: worker/jobs/db-backup.ts
- FOUND: worker/index.ts
- FOUND: worker/scheduler.ts
- FOUND: app/api/settings/backup-status/route.ts
- FOUND: commit aaae9fb5 (Task 1)
- FOUND: commit 073f361e (Task 2)

---
*Phase: 86-multi-user-sso-aws-readiness*
*Plan: 03*
*Completed: 2026-05-18*
