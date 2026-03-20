# Phase 4: Job Infrastructure — Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 delivers the scheduled job execution platform. A persistent BullMQ worker process runs
alongside Next.js, all 6 scheduled jobs are registered with correct cron schedules and advisory
locking, and job status is queryable from a /settings page. The scheduled intelligence platform
is ready for Phase 5 skills to be wired in.

What is NOT in Phase 4:
- Actual skill execution (Phase 5)
- AI report generation (Phase 5)
- Complex job payloads or result parsing

</domain>

<decisions>
## Implementation Decisions

### Worker Process Management
- **Method:** `concurrently` — `npm run dev` starts both Next.js and the BullMQ worker in one terminal command
- Worker lives at `bigpanda-app/worker/index.ts`, launched via a separate script entry in package.json
- Worker script: `npm run worker` (tsx worker/index.ts)
- Dev script: `concurrently "next dev" "npm run worker"`
- Restarting Next.js must NOT kill the worker (separate process via concurrently)

### Redis Connection
- Read from `REDIS_URL` environment variable in `.env.local`
- Default fallback: `redis://localhost:6379` if `REDIS_URL` is unset
- Single Redis connection factory shared across worker and any BullMQ queue clients

### Advisory Locking (Overlap Prevention)
- Use **PostgreSQL `pg_advisory_lock`** — zero extra dependencies, uses existing DB connection
- Each scheduled job has a unique integer lock ID (derived from a hash or hardcoded constant)
- Before executing, worker calls `SELECT pg_try_advisory_lock($id)` — returns true/false
- If false: log "skipped: advisory lock held" and mark job as skipped, do NOT run
- Lock is released with `pg_advisory_unlock($id)` after job completion (or on error)

### Job Status UI
- Lives at **`/settings`** route — new page accessible from sidebar
- Settings page has tabs; the first/default tab is **Jobs**
- Jobs tab shows a table with columns: Job Name | Schedule | Last Run | Last Status | Next Run | Actions
- "Actions" column has a **Trigger Now** button that manually enqueues a test job run
- Status values: pending / running / completed / failed / skipped
- Data comes from `job_runs` DB table (persisted job history)

### Schedule Configurability
- All 6 job cron schedules are stored in the existing `settings` table (key-value pairs)
- UI: each job row has an editable cron field (or human-readable time picker)
- Saving a schedule: PATCH `/api/settings` → worker polls settings every 60s and re-registers changed schedules
- No code deploy or server restart needed to change schedule

### The 6 Scheduled Jobs (Phase 4 registers no-op stubs; Phase 5 wires real execution)
1. `action-sync` — Sync actions from YAML to DB
2. `health-refresh` — Recompute project health scores
3. `weekly-briefing` — Generate weekly customer briefings
4. `context-updater` — Sweep inbound communications for context updates
5. `gantt-snapshot` — Snapshot current plan state
6. `risk-monitor` — Check for newly elevated risks

### Database Table: job_runs
Required columns: id, job_name, status (pending/running/completed/failed/skipped), started_at, completed_at, error_message, triggered_by (scheduled | manual)

</decisions>

<specifics>
## Specific Ideas

- BullMQ v5+ (latest stable) — check `npm view bullmq version` before coding
- `concurrently` package: `concurrently "npm run next-dev" "npm run worker"` in package.json
- Advisory lock IDs: define as constants in `worker/lock-ids.ts` (e.g., ACTION_SYNC = 1001, HEALTH_REFRESH = 1002, etc.)
- Worker should NOT crash on individual job failure — catch errors per-job, log, mark failed
- Settings page sidebar link: label "Settings", icon gear, below existing project links
- SCHED-01 through SCHED-08 requirement IDs must all be addressed
</specifics>

<deferred>
## Deferred

- Actual skill payloads / real job execution (Phase 5)
- Email/Slack notifications on job failure (post-Phase 5)
- Bull Board or external queue monitoring UI (not needed — custom Jobs tab is sufficient)
- Job retry policies beyond basic BullMQ defaults (Phase 5 or later)
</deferred>

---

*Phase: 04-job-infrastructure*
*Context gathered: 2026-03-20*
