---
phase: 80-advanced-features
plan: "04"
subsystem: worker
tags: [bullmq, anthropic, daily-prep, scheduler, googleapis, drizzle, postgresql]

# Dependency graph
requires:
  - phase: 80-01
    provides: daily_prep_briefs table in DB schema (migration 0045)
provides:
  - BullMQ worker job meeting-prep-daily that fetches today's Google Calendar events, generates prep briefs via non-streaming Claude call, and upserts to daily_prep_briefs with user_id=default
  - GET /api/daily-prep/briefs?date=YYYY-MM-DD route returning DB-stored briefs for authenticated user
  - DB persistence in generate route — SSE streaming completes, then brief is upserted to daily_prep_briefs
  - localStorage removed from /daily-prep page; briefs loaded from DB on page load
  - meeting-prep-daily entry in SKILL_LIST (hasParams: true) visible in CreateJobWizard
  - JobParamsStep case for meeting-prep-daily with descriptive paragraph (no project picker)
affects: [80-advanced-features, scheduler, daily-prep, worker]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Worker uses advisory lock (LOCK_IDS.MEETING_PREP_DAILY=1009) + jobRuns record/complete pattern from weekly-focus.ts
    - Non-streaming Anthropic client.messages.create (not stream) in BullMQ worker context
    - DB persistence after SSE in route wrapped in try/catch — streaming never broken by persistence failure
    - Promise.all parallel fetch of events + briefs on page load for reduced latency

key-files:
  created:
    - worker/jobs/meeting-prep-daily.ts
    - app/api/daily-prep/briefs/route.ts
  modified:
    - lib/scheduler-skills.ts
    - worker/lock-ids.ts
    - worker/index.ts
    - components/wizard/JobParamsStep.tsx
    - app/api/daily-prep/generate/route.ts
    - app/daily-prep/page.tsx

key-decisions:
  - "meeting-prep-daily worker uses user_id=default (no session) — matches calendar OAuth token storage pattern for the default user"
  - "Non-streaming messages.create in BullMQ worker — no SSE needed, simpler and more reliable in long-running process context"
  - "DB persistence in generate route wrapped in try/catch — stream delivery is highest priority; DB failure is non-fatal and logged"
  - "Promise.all parallel fetch: events + briefs fetched simultaneously on page load for reduced latency"
  - "Cards with DB briefs initialize with briefStatus=done and expanded=true — auto-generated briefs surface immediately on page load"

patterns-established:
  - "Worker pattern: advisory lock + jobRuns record + per-event try/catch + jobRuns complete/fail — follow weekly-focus.ts exactly"
  - "DB-backed page persistence: remove localStorage, fetch from /api/daily-prep/briefs in parallel with events; route handles write"

requirements-completed: [SCHED-01]

# Metrics
duration: 7min
completed: 2026-04-28
---

# Phase 80 Plan 04: SCHED-01 Auto-Prep Worker Summary

**BullMQ meeting-prep-daily job fetches today's calendar events, generates Claude briefs non-streaming, persists to daily_prep_briefs; localStorage removed from /daily-prep page, replaced with DB reads via new GET /api/daily-prep/briefs route**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-28T18:03:42Z
- **Completed:** 2026-04-28T18:10:42Z
- **Tasks:** 3 (1a, 1b, 2)
- **Files modified:** 8

## Accomplishments

- BullMQ worker `meeting-prep-daily` fetches today's Google Calendar events, matches projects, generates prep briefs via non-streaming Anthropic call, upserts each to `daily_prep_briefs` with `user_id: 'default'`
- New GET `/api/daily-prep/briefs?date=YYYY-MM-DD` route returns stored briefs map for authenticated user; `force-dynamic` + `requireSession` pattern
- Generate route now persists final brief text to DB after SSE stream completes; persistence failure logged but never breaks streaming
- `/daily-prep` page removes all localStorage usage — events and briefs fetched in parallel via `Promise.all`; cards with pre-existing DB briefs open pre-populated and expanded on load

## Task Commits

Each task was committed atomically:

1. **Task 1a: SKILL_LIST entry, BullMQ worker, worker registration, JobParamsStep UI** - `0caafbd1` (feat)
2. **Task 1b: Generate route persistence + briefs GET route** - `7cf41f31` (feat)
3. **Task 2: Replace LocalStorage with DB reads in /daily-prep page** - `55769c9e` (feat)

**Plan metadata:** (see final docs commit)

## Files Created/Modified

- `/Users/jmiloslavsky/Documents/Panda-Manager/worker/jobs/meeting-prep-daily.ts` - New BullMQ job handler for daily auto-prep
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/daily-prep/briefs/route.ts` - New GET route returning stored briefs for a date
- `/Users/jmiloslavsky/Documents/Panda-Manager/lib/scheduler-skills.ts` - Added meeting-prep-daily to SKILL_LIST and SKILLS_WITH_PARAMS
- `/Users/jmiloslavsky/Documents/Panda-Manager/worker/lock-ids.ts` - Added MEETING_PREP_DAILY = 1009
- `/Users/jmiloslavsky/Documents/Panda-Manager/worker/index.ts` - Import and JOB_HANDLERS registration for meeting-prep-daily
- `/Users/jmiloslavsky/Documents/Panda-Manager/components/wizard/JobParamsStep.tsx` - Added meeting-prep-daily case with description paragraph
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/daily-prep/generate/route.ts` - Added DB upsert after SSE stream completes
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/daily-prep/page.tsx` - Replaced localStorage read/write with parallel DB fetch

## Decisions Made

- Worker uses `user_id: 'default'` — matches how calendar OAuth tokens are stored; worker has no session context
- Non-streaming `client.messages.create` in worker — simpler and more appropriate for a long-running BullMQ process vs. SSE streaming which is only needed for client-facing routes
- Per-event `try/catch` in worker loop — one event failure doesn't abort the entire job
- DB persistence in generate route wrapped in `try/catch` — SSE streaming always completes even if DB is down
- `Promise.all` parallel fetch of events + briefs on page load — reduces perceived page load latency

## Deviations from Plan

None — plan executed exactly as written. `getCalendarClient` from `calendar-import/route.ts` was not exported as a shared module, so the OAuth client setup was replicated in the worker following the same exact pattern (the plan noted to "check exact path" — the answer was to reproduce the pattern locally, which is idiomatic for this codebase).

## Issues Encountered

None — all 7 meeting-prep-daily tests passed GREEN after implementation.

## User Setup Required

None — no external service configuration required beyond existing Google Calendar OAuth setup.

## Next Phase Readiness

- SCHED-01 fully delivered: auto-prep BullMQ job + DB-backed brief persistence + localStorage removal
- Phase 80 plans 02–04 complete; remaining plans in wave 2+ can proceed
- The `meeting-prep-daily` job is registered and will appear in CreateJobWizard on /scheduler

---
*Phase: 80-advanced-features*
*Completed: 2026-04-28*
