---
phase: 31-bullmq-document-extraction-migration
plan: 03
subsystem: api-routes-ingestion
tags: [api, enqueue, polling, batch-status, bullmq, tdd]
dependency_graph:
  requires:
    - extraction_jobs table (Plan 31-01)
    - worker/jobs/document-extraction.ts (Plan 31-02)
  provides:
    - POST /api/ingestion/extract (thin enqueue endpoint)
    - GET /api/ingestion/jobs/[jobId] (polling endpoint)
    - GET /api/projects/[projectId]/extraction-status (batch status)
  affects:
    - IngestionModal.tsx (Plan 31-04 will update to use polling)
    - Context Hub (Plan 31-04 will check batch status on mount)
tech_stack:
  added: []
  patterns:
    - BullMQ Queue enqueue pattern (createApiRedisConnection, queue.close())
    - Polling endpoint with force-dynamic export
    - Stale job detection inline (no cron required)
    - Batch grouping in JavaScript (not SQL aggregation)
key_files:
  created:
    - bigpanda-app/app/api/ingestion/extract/route.ts (REPLACED 575-line SSE route with 50-line enqueue)
    - bigpanda-app/lib/extraction-types.ts
    - bigpanda-app/app/api/ingestion/jobs/[jobId]/route.ts
    - bigpanda-app/app/api/projects/[projectId]/extraction-status/route.ts
  modified:
    - bigpanda-app/app/api/ingestion/approve/route.ts (import path)
    - bigpanda-app/components/IngestionModal.tsx (import path)
    - bigpanda-app/components/wizard/AiPreviewStep.tsx (import path)
    - bigpanda-app/tests/ingestion/dedup.test.ts (import path)
    - bigpanda-app/tests/ingestion/extractor.test.ts (import path)
    - bigpanda-app/tests/ingestion/extraction-enqueue.test.ts (completed assertions)
    - bigpanda-app/tests/ingestion/extraction-poll.test.ts (completed assertions)
    - bigpanda-app/tests/ingestion/extraction-status.test.ts (completed assertions)
decisions:
  - "SSE route completely replaced — extraction logic now in worker (Plan 31-02)"
  - "Shared types moved to lib/extraction-types.ts — prevents import breakage, supports both API and worker"
  - "Stale detection inline (no cron) — polling endpoint checks updated_at and marks stale jobs failed"
  - "Batch status filters for active jobs only — excludes 'failed' to keep UI response clean"
  - "queue.close() called after all enqueues — prevents Redis connection leaks"
metrics:
  duration_seconds: 473
  tasks_completed: 2
  files_created: 4
  files_modified: 8
  commits: 4
  tests_added: 0
  tests_passing: 13
  tests_failing_red: 0
completed_date: "2026-04-02"
---

# Phase 31 Plan 03: API Routes (Enqueue, Polling, Batch Status)

**One-liner:** Replace 575-line SSE extract route with thin BullMQ enqueue endpoint and create two polling routes for UI refresh resilience.

## Objective

Replace the SSE extract route with a thin BullMQ enqueue endpoint, and create two new polling/status API routes that the UI will call in Plan 04.

Purpose: The three API routes together deliver browser-refresh resilience (EXTR-01) and real-time progress visibility (EXTR-02). The enqueue route is intentionally thin — all extraction logic lives in the worker job from Plan 02.

## What Was Built

### Task 1: Replace extract route with enqueue endpoint

**Replaced bigpanda-app/app/api/ingestion/extract/route.ts:**
- Old: 575 lines with SSE streaming, Claude API calls, DB writes
- New: 50 lines — thin enqueue handler only
- POST body: `{ artifactIds: number[], projectId: number }`
- Response: `{ jobIds: number[], batchId: string }`
- Behavior:
  - Validates body with Zod schema
  - Generates one batchId (randomUUID()) for all artifacts
  - For each artifactId: inserts extraction_jobs row (status='pending'), enqueues BullMQ job
  - Calls `queue.close()` after all enqueues (prevents Redis connection leaks)
  - Returns jobIds array and batchId immediately (no blocking, no SSE)

**Created bigpanda-app/lib/extraction-types.ts:**
- Extracted shared types from old route to prevent import breakage:
  - `EntityType` (17 entity types)
  - `ExtractionItem` interface
  - `isAlreadyIngested()` function (dedup logic)
- Updated imports in 7 files:
  - app/api/ingestion/approve/route.ts
  - components/IngestionModal.tsx
  - components/wizard/AiPreviewStep.tsx
  - tests/ingestion/dedup.test.ts
  - tests/ingestion/extractor.test.ts

**Test updates:**
- extraction-enqueue.test.ts: completed 5 test assertions (RED → GREEN)
- Tests verify: response shape, DB inserts, queue.add() calls, queue.close(), validation

### Task 2: Create polling + batch status endpoints

**Created bigpanda-app/app/api/ingestion/jobs/[jobId]/route.ts:**
- GET polling endpoint for per-job progress
- Returns: `{ status, progress_pct, current_chunk, total_chunks, error_message }`
- Returns 404 if jobId not found
- Stale detection: if status='running' AND updated_at > 10 min ago:
  - Updates DB row: status='failed', error_message='Job timed out (stale heartbeat)'
  - Returns failed status in response
- Has `export const dynamic = 'force-dynamic'` (required for polling routes)
- Has `requireSession()` auth guard (CVE-2025-29927 defense-in-depth)

**Created bigpanda-app/app/api/projects/[projectId]/extraction-status/route.ts:**
- GET batch status check (Context Hub on-mount call)
- Returns: `{ jobs: ExtractionJob[], batches: Record<string, { jobs, batch_complete, all_terminal }> }`
- Queries extraction_jobs for project where status IN ('pending', 'running', 'completed')
- Excludes 'failed' to keep response clean — UI only shows active/ready-to-review jobs
- Groups jobs by batch_id in JavaScript (not SQL aggregation)
- Computes flags per batch:
  - `batch_complete`: true only when ALL jobs in batch have status='completed'
  - `all_terminal`: true only when ALL jobs have status in ('completed', 'failed')
- Ordered by created_at ASC
- Has `export const dynamic = 'force-dynamic'` and `requireSession()`

**Test updates:**
- extraction-poll.test.ts: completed 4 test assertions (RED → GREEN)
- extraction-status.test.ts: completed 4 test assertions (RED → GREEN)
- Tests verify: response shapes, 404 handling, stale detection, batch grouping, completion flags

## Verification

✅ All 13 tests GREEN (5 enqueue + 4 poll + 4 status)
✅ TypeScript compiles cleanly (no errors in new or modified files)
✅ Extract route has NO SSE code (ReadableStream removed)
✅ Both new routes have `export const dynamic = 'force-dynamic'`
✅ Both new routes have `requireSession()` guard
✅ queue.close() called in enqueue route after all queue.add() calls
✅ Stale detection inline (no cron needed) — polling endpoint self-heals stale jobs

## Deviations from Plan

**Auto-fixed missing requirement (Rule 2):**
- **Found during:** Task 1 implementation
- **Issue:** The old extract route exported `EntityType`, `ExtractionItem`, `isAlreadyIngested` that 7 other files imported. Deleting the route would break all imports.
- **Fix:** Created `lib/extraction-types.ts` to hold shared types and updated all import paths
- **Files modified:** approve route, 2 UI components, 3 test files
- **Why critical:** Prevents build breakage; worker job (Plan 02) also needs these types

This was a **Rule 2 (missing critical functionality)** auto-fix: the shared types are essential for correct operation of both the API routes and the worker job. The plan said "If any other files import these from the old route, search for and update those imports" — I executed this instruction proactively.

## Blockers Encountered

None.

## Dependencies

**Downstream:** Plan 04 can now:
- Call POST /api/ingestion/extract to enqueue jobs (replaces SSE call)
- Poll GET /api/ingestion/jobs/[jobId] for progress (replaces SSE listener)
- Check GET /api/projects/[projectId]/extraction-status on Context Hub mount (batch status)

**Requirements coverage:**
- EXTR-01 (browser-refresh resilience): polling endpoints allow UI to recover state after refresh
- EXTR-02 (progress visibility): polling endpoint returns progress_pct, current_chunk, total_chunks

## Commits

1. **826f67a** — `test(31-03): add failing tests for extract enqueue endpoint`
   - Complete TODO assertions for 5 test cases in extraction-enqueue.test.ts
   - Tests fail RED (current route doesn't match new contract)

2. **4a13696** — `feat(31-03): replace SSE extract route with thin BullMQ enqueue endpoint`
   - Replace 575-line SSE route with 50-line enqueue handler
   - Create lib/extraction-types.ts for shared types
   - Update 7 import paths (approve route, UI components, tests)
   - Tests pass GREEN (5/5)

3. **07299f5** — `test(31-03): add failing tests for polling and batch status endpoints`
   - Complete test assertions for extraction-poll.test.ts (4 tests)
   - Complete test assertions for extraction-status.test.ts (4 tests)
   - Tests fail RED (routes don't exist yet)

4. **1e3c554** — `feat(31-03): create polling and batch status endpoints`
   - Create GET /api/ingestion/jobs/[jobId] for per-job progress polling
   - Stale detection: marks jobs failed if running + updated_at >10 min ago
   - Create GET /api/projects/[projectId]/extraction-status for batch status
   - Both routes have `dynamic = 'force-dynamic'` and `requireSession()`
   - Tests pass GREEN (8/8)

## Key Patterns Established

1. **Thin enqueue pattern:** API route creates DB row, enqueues job, returns immediately — no business logic in route
2. **Polling with stale detection:** Polling endpoint self-heals stale jobs (no cron required)
3. **Shared type extraction:** When replacing routes, extract shared types to prevent import breakage
4. **Batch grouping in JS:** Simple JavaScript grouping for batch status (no SQL aggregation complexity)

## Next Steps

**Plan 04** will:
- Update IngestionModal to use polling instead of SSE
- Update Context Hub to check batch status on mount
- Remove SSE event listener code
- Add polling UI (progress bars, status badges)

## Self-Check

### Files Created
```
✅ FOUND: bigpanda-app/lib/extraction-types.ts
✅ FOUND: bigpanda-app/app/api/ingestion/extract/route.ts (REPLACED)
✅ FOUND: bigpanda-app/app/api/ingestion/jobs/[jobId]/route.ts
✅ FOUND: bigpanda-app/app/api/projects/[projectId]/extraction-status/route.ts
```

### Commits Exist
```
✅ FOUND: 826f67a (test: enqueue RED)
✅ FOUND: 4a13696 (feat: enqueue GREEN)
✅ FOUND: 07299f5 (test: polling RED)
✅ FOUND: 1e3c554 (feat: polling GREEN)
```

### Tests Pass
```
✅ extraction-enqueue.test.ts: 5/5 GREEN
✅ extraction-poll.test.ts: 4/4 GREEN
✅ extraction-status.test.ts: 4/4 GREEN
✅ Total: 13/13 GREEN
```

### Route Exports
```
✅ POST /api/ingestion/extract — returns { jobIds, batchId }
✅ GET /api/ingestion/jobs/[jobId] — returns { status, progress_pct, ... }
✅ GET /api/projects/[projectId]/extraction-status — returns { jobs, batches }
✅ All routes have dynamic = 'force-dynamic'
✅ All routes have requireSession() auth guard
```

## Self-Check: PASSED
