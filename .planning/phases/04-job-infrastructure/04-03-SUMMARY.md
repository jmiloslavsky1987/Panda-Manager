---
phase: 04-job-infrastructure
plan: 03
subsystem: infra
tags: [bullmq, redis, ioredis, postgres, drizzle-orm, advisory-locks, cron, worker-process]

# Dependency graph
requires:
  - phase: 04-02
    provides: Redis connection factory, lock IDs, job_runs schema, settings-core

provides:
  - BullMQ Worker entry point (worker/index.ts) — registered schedulers, graceful shutdown, 60s polling loop
  - worker/scheduler.ts — registerAllSchedulers() mapping 6 job names to settings schedule keys via upsertJobScheduler
  - 6 no-op job stub handlers with advisory locking and job_runs write pattern (action-sync, health-refresh, weekly-briefing, context-updater, gantt-snapshot, risk-monitor)

affects: [05-skill-engine, worker-process, job-infrastructure]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BullMQ upsertJobScheduler idempotent scheduler registration (no queue.add with repeat:, no immediately:true)"
    - "Static import dispatch map for job handlers (tsx-watch compatible, avoids dynamic import cache issues)"
    - "pg_try_advisory_xact_lock per-job distributed mutex with job_runs start/complete/fail audit trail"
    - "Dedicated Redis connection per Worker instance (never share with Queue)"
    - "Mandatory worker.on('error') listener to prevent silent processing halt"
    - "60s settings polling loop via setInterval — picks up cron schedule changes without restart"

key-files:
  created:
    - bigpanda-app/worker/index.ts
    - bigpanda-app/worker/scheduler.ts
    - bigpanda-app/worker/jobs/action-sync.ts
    - bigpanda-app/worker/jobs/health-refresh.ts
    - bigpanda-app/worker/jobs/weekly-briefing.ts
    - bigpanda-app/worker/jobs/context-updater.ts
    - bigpanda-app/worker/jobs/gantt-snapshot.ts
    - bigpanda-app/worker/jobs/risk-monitor.ts
  modified: []

key-decisions:
  - "Static job dispatch map (not dynamic import) — tsx watch mode has module cache issues with dynamic import()"
  - "concurrency: 1 on Worker — one job at a time prevents advisory lock contention within same process"
  - "settings-core imported directly (not lib/settings.ts) — server-only marker crashes worker process context"

patterns-established:
  - "Job handler pattern: pg_try_advisory_xact_lock → insert job_runs(running) → execute → update job_runs(completed/failed) → re-throw on failure"
  - "Scheduler registration: upsertJobScheduler with stable scheduler ID = job name (deduplication key)"

requirements-completed: [SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05, SCHED-06, SCHED-07]

# Metrics
duration: 6min
completed: 2026-03-20
---

# Phase 4 Plan 03: BullMQ Worker — Scheduler + Job Stubs Summary

**BullMQ Worker with idempotent upsertJobScheduler registration for 6 cron jobs, each with pg_try_advisory_xact_lock + job_runs audit trail — no-op stubs ready for Phase 5 skill wiring**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-20T16:08:32Z
- **Completed:** 2026-03-20T16:14:30Z
- **Tasks:** 2/2
- **Files modified:** 8

## Accomplishments

- Created worker/scheduler.ts with registerAllSchedulers() mapping 6 job names to settings cron keys via BullMQ v5 upsertJobScheduler (idempotent, safe to call on every restart)
- Created 6 no-op job stub handlers (action-sync, health-refresh, weekly-briefing, context-updater, gantt-snapshot, risk-monitor) — each acquires pg_try_advisory_xact_lock, writes job_runs row on start, updates on completion or failure
- Created worker/index.ts: process entry point with static dispatch map, dedicated Redis connection for Worker, mandatory error listener, SIGTERM/SIGINT graceful shutdown, and 60s settings polling loop

## Task Commits

Each task was committed atomically:

1. **Task 1: Create worker scheduler and 6 no-op job handlers** - `b5722c4` (feat)
2. **Task 2: Create worker entry point with graceful shutdown and polling loop** - `9be0800` (feat)

**Plan metadata:** (docs commit — follows this summary)

## Files Created/Modified

- `bigpanda-app/worker/index.ts` - Worker process entry point; registers schedulers, static dispatch map, error listener, SIGTERM/SIGINT handlers, 60s polling loop
- `bigpanda-app/worker/scheduler.ts` - registerAllSchedulers() calling upsertJobScheduler for all 6 jobs; exports jobQueue (Queue instance for shared use)
- `bigpanda-app/worker/jobs/action-sync.ts` - No-op stub with LOCK_IDS.ACTION_SYNC advisory lock and job_runs write pattern
- `bigpanda-app/worker/jobs/health-refresh.ts` - No-op stub with LOCK_IDS.HEALTH_REFRESH advisory lock and job_runs write pattern
- `bigpanda-app/worker/jobs/weekly-briefing.ts` - No-op stub with LOCK_IDS.WEEKLY_BRIEFING advisory lock and job_runs write pattern
- `bigpanda-app/worker/jobs/context-updater.ts` - No-op stub with LOCK_IDS.CONTEXT_UPDATER advisory lock and job_runs write pattern
- `bigpanda-app/worker/jobs/gantt-snapshot.ts` - No-op stub with LOCK_IDS.GANTT_SNAPSHOT advisory lock and job_runs write pattern
- `bigpanda-app/worker/jobs/risk-monitor.ts` - No-op stub with LOCK_IDS.RISK_MONITOR advisory lock and job_runs write pattern

## Decisions Made

- **Static import dispatch map** instead of dynamic `import()` — tsx watch mode has module cache issues with dynamic imports; static map is more reliable
- **concurrency: 1** on Worker — single-job processing prevents advisory lock contention within same worker process
- **settings-core imported directly** (not lib/settings.ts) — lib/settings.ts has server-only marker which crashes when loaded in non-Next.js Node.js context

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Worker starts automatically via `npm run dev` (concurrently runs Next.js + worker). Requires Redis available at REDIS_URL (defaults to redis://localhost:6379).

## Next Phase Readiness

- Worker infrastructure complete — Phase 5 (Skill Engine) replaces stub bodies with real skill execution calls
- All 6 job handler files follow identical pattern — Phase 5 needs only to replace the "No-op stub" comment block with skill invocation
- Settings polling ensures cron schedule changes take effect within 60s without restart
- job_runs audit table populated by every job execution — Phase 5 can query for job history display

---
*Phase: 04-job-infrastructure*
*Completed: 2026-03-20*
