---
phase: 04-job-infrastructure
plan: 02
subsystem: infra
tags: [bullmq, ioredis, redis, concurrently, settings, postgres, drizzle]

# Dependency graph
requires:
  - phase: 04-01
    provides: Phase 4 Wave-0 E2E RED stubs baseline

provides:
  - Worker-safe settings module (settings-core.ts) importable in Node.js worker process
  - Redis IORedis connection factory with maxRetriesPerRequest: null (BullMQ required)
  - Advisory lock ID constants for 6 scheduled jobs
  - job_runs Drizzle table definition and jobRunStatusEnum
  - Migration SQL 0003_add_job_runs.sql ready to apply
  - Concurrently-based dev script launching NEXT + WORKER processes

affects: [04-03, 04-04, 04-05, 04-06, 04-07, 04-08]

# Tech tracking
tech-stack:
  added: [bullmq@5.71.0, ioredis@5.10.1, concurrently@9.2.1]
  patterns:
    - settings-core.ts / settings.ts split — worker-safe core + server-only wrapper
    - createRedisConnection() factory — each caller gets its own IORedis instance
    - Advisory lock IDs as const object — stable integer IDs, never reuse retired IDs
    - Migration SQL written manually (DB not available in dev environment)

key-files:
  created:
    - bigpanda-app/lib/settings-core.ts
    - bigpanda-app/worker/connection.ts
    - bigpanda-app/worker/lock-ids.ts
    - bigpanda-app/db/migrations/0003_add_job_runs.sql
  modified:
    - bigpanda-app/lib/settings.ts
    - bigpanda-app/db/schema.ts
    - bigpanda-app/package.json

key-decisions:
  - "settings-core.ts holds all settings logic without server-only; settings.ts is a thin re-export wrapper that adds the guard"
  - "maxRetriesPerRequest: null is mandatory on every IORedis instance used with BullMQ Worker — omitting causes silent EXECABORT failures"
  - "createRedisConnection() factory pattern — Queue and Worker each call it separately to get distinct IORedis instances"
  - "Advisory lock IDs use pg_try_advisory_xact_lock integer IDs 1001-1006; transaction-scoped xact variant auto-releases safely with connection pools"
  - "Migration uses TIMESTAMPTZ (not TIMESTAMP) for timezone-aware scheduler timestamps"

patterns-established:
  - "Worker module split: worker-safe core module (no server-only) + thin server-only wrapper for Next.js"
  - "Advisory lock IDs: stable integer constants in lock-ids.ts — never reuse retired IDs"
  - "Redis factory: createRedisConnection() called per-consumer, not shared across Queue+Worker"

requirements-completed: [SCHED-01, SCHED-08]

# Metrics
duration: 2min
completed: 2026-03-20
---

# Phase 4 Plan 02: Job Infrastructure Wave 1 Summary

**BullMQ/IORedis packages installed with worker-safe settings split, Redis connection factory, advisory lock IDs, and job_runs schema+migration ready for Phase 4 worker implementation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-20T16:03:25Z
- **Completed:** 2026-03-20T16:06:10Z
- **Tasks:** 2/2
- **Files modified:** 7

## Accomplishments

- Installed bullmq, ioredis, concurrently in bigpanda-app/ and added concurrently-based dev script
- Created settings-core.ts (worker-safe, no server-only) and refactored settings.ts to thin re-export wrapper
- Created worker/ directory with connection.ts (IORedis factory, maxRetriesPerRequest: null) and lock-ids.ts (6 advisory lock IDs)
- Appended jobRunStatusEnum and jobRuns (Table 14) to db/schema.ts and created 0003_add_job_runs.sql migration

## Task Commits

Each task was committed atomically:

1. **Task 1: Install packages and create worker-safe settings-core.ts** - `b4cb1f3` (feat)
2. **Task 2: Redis connection factory, lock IDs, job_runs schema and migration** - `66b337d` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `bigpanda-app/lib/settings-core.ts` - Full settings logic without server-only marker; safe for worker process
- `bigpanda-app/lib/settings.ts` - Refactored to thin re-export wrapper that adds server-only guard
- `bigpanda-app/package.json` - Added bullmq/ioredis deps, concurrently devDep, updated dev script
- `bigpanda-app/worker/connection.ts` - IORedis factory with maxRetriesPerRequest: null and enableReadyCheck: false
- `bigpanda-app/worker/lock-ids.ts` - Advisory lock integer constants for 6 scheduled jobs (1001-1006)
- `bigpanda-app/db/schema.ts` - Appended jobRunStatusEnum + jobRuns table (Table 14) with 7 columns
- `bigpanda-app/db/migrations/0003_add_job_runs.sql` - DDL for job_run_status enum + job_runs table with 2 indexes

## Decisions Made

- settings-core.ts / settings.ts split: worker needs the full settings functions but cannot trigger the `server-only` Next.js guard; the split keeps all existing imports working unchanged.
- maxRetriesPerRequest: null is a hard BullMQ requirement — without it, the Worker throws `EXECABORT` errors silently.
- createRedisConnection() factory: Queue and Worker are separate consumers and must each have their own IORedis instance; sharing one connection causes protocol state corruption.
- Advisory lock IDs use pg_try_advisory_xact_lock (transaction-scoped xact variant) so locks auto-release at transaction end — safe with Postgres connection pools.
- Migration SQL written manually (same pattern as 0002): Postgres not available in dev environment during execution.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- TypeScript reported `TS2352` on the `as Record<string, unknown>` cast in settings-core.ts (line 81). This is identical to the cast that existed in the original settings.ts before this plan refactored it — the error moved to the new file but is not new. Pre-existing issue, out of scope per deviation rules.

## User Setup Required

None - no external service configuration required. When PostgreSQL is available, apply migration:
```
cd bigpanda-app && DATABASE_URL=postgresql://localhost:5432/bigpanda_app npx drizzle-kit migrate
```

## Next Phase Readiness

- All shared primitives ready: settings-core.ts, connection.ts, lock-ids.ts, job_runs schema
- Worker directory established — 04-03 can create worker/index.ts and individual job modules
- BullMQ Queue clients can import createRedisConnection(); BullMQ Worker must call createRedisConnection() separately

---
*Phase: 04-job-infrastructure*
*Completed: 2026-03-20*
