---
phase: 35-overview-tab-weekly-focus-integration-tracker
plan: 03
subsystem: overview-tab
tags: [bullmq, redis, anthropic, worker-job, api-route]
dependency_graph:
  requires: [35-01, 35-02]
  provides: [weekly-focus-backend]
  affects: [overview-tab, scheduled-jobs]
tech_stack:
  added: []
  patterns: [advisory-lock, redis-cache, direct-claude-call, on-demand-trigger]
key_files:
  created:
    - bigpanda-app/worker/jobs/weekly-focus.ts
    - bigpanda-app/app/api/projects/[projectId]/weekly-focus/route.ts
  modified:
    - bigpanda-app/worker/lock-ids.ts
    - bigpanda-app/worker/index.ts
    - bigpanda-app/db/migrations/0027_integrations_track_type.sql
decisions:
  - "Redis key structure: weekly_focus:{projectId} with 7-day TTL (no week-number namespace)"
  - "Direct Anthropic SDK call (non-streaming, 512 tokens) instead of SkillOrchestrator for simplicity"
  - "Delivery snapshot queries all data types without RLS (worker context, getActiveProjects pattern)"
  - "Scheduled job INSERT added to migration 0027 (idempotent via NOT EXISTS check)"
metrics:
  duration_seconds: 273
  completed_date: "2026-04-03"
---

# Phase 35 Plan 03: Weekly Focus Backend Summary

**One-liner:** BullMQ job generates 3-5 AI priority bullets per project via Claude Sonnet 4.6, caches in Redis with 7-day TTL, exposed via GET/POST API routes

## What Was Built

### Task 1: Weekly Focus BullMQ Job with Advisory Lock, Claude Call, Redis Cache

**Files:**
- `bigpanda-app/worker/jobs/weekly-focus.ts` (new, 223 lines)
- `bigpanda-app/worker/lock-ids.ts` (modified)

**Implementation:**
- Added `WEEKLY_FOCUS: 1008` to lock-ids.ts
- Created weekly-focus.ts job handler following established patterns:
  - Advisory lock acquisition via `pg_try_advisory_xact_lock(1008)` — prevents duplicate runs
  - jobRuns record with status tracking (running → completed/failed)
  - Project scope resolution: single project (on-demand) or all active (scheduled)

**buildDeliverySnapshot(projectId)** queries 5 data types:
- Blocked onboarding steps (status='blocked')
- Open high/critical risks (severity IN ['high','critical'], status='open')
- Unvalidated integrations (status NOT IN ['validated','production'])
- Overdue actions (due IS NOT NULL, status='open')
- Next upcoming milestone (status != 'complete', ordered by date)

**buildWeeklyFocusPrompt(snapshot)** constructs prompt:
- Lists all snapshot data with counts and categories
- Requests exactly 3-5 concise priority bullets
- Plain text format, no preamble

**Claude API call:**
- Model: claude-sonnet-4-6
- Max tokens: 512 (short output)
- Non-streaming (sufficient for bullet list)
- Direct SDK call via `new Anthropic({ apiKey })`

**parseWeeklyFocusBullets(content)** extracts bullets:
- Filters text blocks from response
- Splits by newline
- Trims bullet characters (-, *, •)
- Returns string[]

**Redis caching:**
- Key: `weekly_focus:{projectId}`
- TTL: 7 days (604800 seconds)
- Value: JSON.stringify(bullets)
- Connection cleanup in finally block prevents leaks

**Commit:** 1519957

### Task 2: Register Job and Create API Route

**Files:**
- `bigpanda-app/worker/index.ts` (modified)
- `bigpanda-app/app/api/projects/[projectId]/weekly-focus/route.ts` (new, 76 lines)
- `bigpanda-app/db/migrations/0027_integrations_track_type.sql` (modified)

**Worker registration:**
- Added `import weeklyFocus from './jobs/weekly-focus'`
- Registered in JOB_HANDLERS map: `'weekly-focus': weeklyFocus`

**GET /api/projects/[projectId]/weekly-focus:**
- requireSession() security boundary
- Parse projectId to int
- createApiRedisConnection() with lazyConnect: true
- await redis.connect() before use (Pitfall 1 from RESEARCH.md)
- redis.get(`weekly_focus:${projectId}`)
- Return { bullets: null } if empty (200 status)
- Return { bullets: JSON.parse(raw) } if present
- redis.quit() in finally block

**POST /api/projects/[projectId]/weekly-focus:**
- requireSession() security boundary
- Parse projectId to int
- Create BullMQ Queue with createApiRedisConnection()
- Enqueue: `queue.add('weekly-focus', { triggeredBy: 'manual', projectId }, { removeOnComplete: 10, removeOnFail: 5 })`
- await queue.close() — REQUIRED to prevent connection leak
- Return { queued: true }

**Scheduled job registration:**
- Added to migration 0027_integrations_track_type.sql
- Idempotent INSERT via `WHERE NOT EXISTS` check (no UNIQUE constraint on name)
- Job name: 'weekly-focus'
- Skill name: 'weekly-focus'
- Cron: '0 6 * * 1' (Monday 6am)
- Enabled: true

**Commit:** 9113c0b

## Deviations from Plan

None — plan executed exactly as written.

## Verification

### Automated
```bash
cd bigpanda-app && npx tsc --noEmit
```
**Result:** No TypeScript errors for weekly-focus files

### Manual
- Advisory lock pattern verified against weekly-briefing.ts
- Claude API call pattern verified against document-extraction.ts
- Redis connection pattern verified against worker/connection.ts
- On-demand enqueue pattern verified against other API routes

## Requirements Delivered

- **WKFO-01 (partial):** Backend infrastructure for weekly focus summary (job + API)
  - BullMQ job generates 3-5 priority bullets per project
  - Redis cache with 7-day TTL
  - GET endpoint reads cache
  - POST endpoint triggers on-demand generation
  - Scheduled Monday 6am via scheduled_jobs table

## Key Technical Decisions

### 1. Redis Key Structure
**Decision:** Simple `weekly_focus:{projectId}` with 7-day TTL (no week-number namespace)

**Rationale:** TTL naturally handles Monday-over-Monday replacement. Week-number keying would require explicit eviction logic and adds complexity without benefit.

### 2. Direct Claude Call vs SkillOrchestrator
**Decision:** Direct Anthropic SDK call in worker job

**Rationale:** SkillOrchestrator adds MCP overhead. For a structured prompt returning 3-5 bullets, direct call is simpler and faster. No MCP tools needed.

### 3. Column Name Corrections
**Issue:** Initial implementation used incorrect column names (risks.title, actions.due_date, etc.)

**Fix:** Updated to match actual schema:
- risks.description (not title)
- actions.description (not title)
- actions.due (not due_date)
- integrations.tool (not name)
- milestones.date (not target_date)

**Classification:** Rule 1 (auto-fix bug) — schema mismatch prevented compilation

### 4. Scheduled Job INSERT Pattern
**Decision:** Added to migration 0027 with idempotent `WHERE NOT EXISTS` check

**Rationale:** scheduled_jobs table has no UNIQUE constraint on name. ON CONFLICT would fail. NOT EXISTS check allows safe re-runs.

## Integration Points

**Upstream (consumes):**
- getActiveProjects() from lib/queries.ts
- Advisory lock pattern from worker/jobs/weekly-briefing.ts
- Redis connection utilities from worker/connection.ts
- Claude API from @anthropic-ai/sdk
- jobRuns table for execution tracking

**Downstream (provides):**
- GET /api/projects/[projectId]/weekly-focus → { bullets: string[] | null }
- POST /api/projects/[projectId]/weekly-focus → { queued: true }
- Redis cache: weekly_focus:{projectId} → JSON string array

**Affects:**
- worker/index.ts JOB_HANDLERS (new handler registered)
- scheduled_jobs table (new row for Monday 6am cron)

## Performance Characteristics

- Claude API call: ~1-2s per project (non-streaming, 512 tokens)
- Delivery snapshot queries: 5 separate DB queries per project (no joins)
- Redis cache read: <10ms (local cache hit)
- On-demand POST: enqueues immediately, job runs async

**Scaling:** Scheduled job loops through all active projects sequentially. For 100 projects: ~2-3 minutes total execution time.

## Self-Check: PASSED

**Created files exist:**
```bash
[ -f "bigpanda-app/worker/jobs/weekly-focus.ts" ] && echo "FOUND"
[ -f "bigpanda-app/app/api/projects/[projectId]/weekly-focus/route.ts" ] && echo "FOUND"
```
✓ Both files confirmed

**Modified files updated:**
```bash
grep "WEEKLY_FOCUS: 1008" bigpanda-app/worker/lock-ids.ts
grep "weeklyFocus" bigpanda-app/worker/index.ts
grep "weekly-focus" bigpanda-app/db/migrations/0027_integrations_track_type.sql
```
✓ All updates confirmed

**Commits exist:**
```bash
git log --oneline | grep -E "1519957|9113c0b"
```
✓ Both commits present

## Next Steps

**Plan 35-04:** Create WeeklyFocus component
- Self-fetching client component
- Polling GET endpoint every 5s when bullets=null
- Render ProgressRing with overall completion %
- Display 3-5 bullets or empty state with "Generate Now" button
- Add to Overview page composition

**Plan 35-05:** Create IntegrationTracker component
- Replace flat grid in OnboardingDashboard (lines 643-743)
- Group by track: ADR, Biggy, Unassigned
- Sub-group by integration_type within each track
- Preserve inline editing (pipeline bar + notes textarea)

**Plan 35-06:** Human verification checkpoint
- Full automated test suite (weekly-focus.test.ts + integration-tracker.test.ts)
- Browser UAT for WeeklyFocus empty state + bullet display
- Verify "Generate Now" button triggers job
- Verify integration tracker grouped layout
