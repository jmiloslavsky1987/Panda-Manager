---
phase: 04-job-infrastructure
plan: 04
subsystem: ui
tags: [next.js, bullmq, radix-ui, lucide-react, drizzle-orm, job-scheduling]

# Dependency graph
requires:
  - phase: 04-02
    provides: jobRuns table in schema.ts and createRedisConnection() factory
  - phase: 04-03
    provides: BullMQ Worker + scheduler with 'scheduled-jobs' queue name

provides:
  - GET /api/job-runs — returns latest run per job for all 6 known jobs
  - POST /api/jobs/trigger — enqueues one-off manual BullMQ job
  - /settings page with Jobs tab — live job status table with Trigger Now buttons
  - Sidebar Settings link with gear icon

affects:
  - phase-05-skill-engine
  - phase-08-cross-project-features

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client Component + useEffect fetch pattern for settings page (not RSC) — avoids DB import in client bundle"
    - "queue.add() for one-off manual trigger vs upsertJobScheduler for repeating cron"
    - "Graceful DB error fallback in GET /api/job-runs — returns 6 null rows if table unavailable"

key-files:
  created:
    - bigpanda-app/app/api/job-runs/route.ts
    - bigpanda-app/app/api/jobs/trigger/route.ts
    - bigpanda-app/app/settings/page.tsx
  modified:
    - bigpanda-app/components/Sidebar.tsx

key-decisions:
  - "Settings page is a Client Component (not RSC) — data fetched via useEffect to keep DB imports server-side only"
  - "Cron schedules hardcoded in JOB_DISPLAY map (UI constants) — Redis scheduler state not surfaced to API in Phase 4"
  - "queue.add() with unique jobId (manual-{name}-{timestamp}) prevents duplicate manual triggers within same second"

patterns-established:
  - "data-testid on all interactive job UI elements: jobs-tab root, job-row-{name}, trigger-{name}, sidebar-settings-link"
  - "Trigger Now: optimistic disable (setTriggering) + 1.5s delay before re-fetch for UX responsiveness"

requirements-completed: [SCHED-08]

# Metrics
duration: 8min
completed: 2026-03-20
---

# Phase 4 Plan 4: Settings UI + Job Status API Summary

**Settings page at /settings with Radix Jobs tab, 6-row job status table with Trigger Now buttons, backed by GET /api/job-runs and POST /api/jobs/trigger BullMQ queue integration**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-20T16:15:00Z
- **Completed:** 2026-03-20T16:23:00Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments
- GET /api/job-runs returns latest run per job for all 6 known jobs (null if never run), with graceful fallback when table unavailable
- POST /api/jobs/trigger enqueues one-off BullMQ job via queue.add() with unique jobId, returns { ok: true, jobName }
- /settings page: Radix Tabs client component, Jobs tab with all 6 job rows (name, cron, last run, status, Trigger Now)
- Sidebar updated with Settings link (lucide Settings icon, data-testid, href=/settings)

## Task Commits

Each task was committed atomically:

1. **Task 1: API routes — GET /api/job-runs and POST /api/jobs/trigger** - `24e83ea` (feat)
2. **Task 2: Settings page UI and Sidebar link** - `c4c770e` (feat)

## Files Created/Modified
- `bigpanda-app/app/api/job-runs/route.ts` - GET endpoint returning latest job_run per job name (6 known jobs, null fallback)
- `bigpanda-app/app/api/jobs/trigger/route.ts` - POST endpoint enqueuing one-off BullMQ job via queue.add()
- `bigpanda-app/app/settings/page.tsx` - Client Component /settings page with Radix Jobs tab, job table, Trigger Now buttons
- `bigpanda-app/components/Sidebar.tsx` - Added Settings link with lucide gear icon and data-testid

## Decisions Made
- Settings page is a Client Component (not RSC) — fetching from /api/job-runs avoids importing DB into the client bundle
- Cron schedules hardcoded as UI constants (JOB_DISPLAY map) — Redis does not surface schedule metadata to the API yet; Phase 5+ can make this editable
- queue.add() with jobId `manual-{name}-{timestamp}` prevents duplicate triggers within the same second

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required beyond what 04-02 and 04-03 already established (Redis, PostgreSQL).

## Next Phase Readiness
- /settings page is fully wired and ready to test end-to-end once the worker process is running
- POST /api/jobs/trigger will fail gracefully (500) if Redis is unavailable — same behavior as worker startup
- Phase 5 (Skill Engine) can add additional tabs to the Settings page if needed

---
*Phase: 04-job-infrastructure*
*Completed: 2026-03-20*
