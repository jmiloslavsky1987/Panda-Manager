---
phase: 31-bullmq-document-extraction-migration
plan: 02
subsystem: worker-job-handler
tags: [bullmq, worker, extraction, background-jobs, progress-tracking]
dependency_graph:
  requires:
    - 31-01 (extraction_jobs schema and Wave 0 tests)
  provides:
    - BullMQ worker job handler for document extraction
    - Job registration in worker/index.ts JOB_HANDLERS map
  affects:
    - worker/jobs/document-extraction.ts (created)
    - worker/index.ts (modified)
tech_stack:
  added: []
  patterns:
    - BullMQ job handler pattern (skill-run.ts template)
    - Progress tracking with heartbeat (updated_at after each chunk)
    - Atomic staging pattern (staged_items_json only, no workspace writes)
    - Worker-safe imports (../../lib paths, NOT @/ alias)
key_files:
  created:
    - bigpanda-app/worker/jobs/document-extraction.ts
  modified:
    - bigpanda-app/worker/index.ts
decisions:
  - "Worker job uses ../../lib/settings-core (NOT settings.ts — has server-only marker that crashes worker)"
  - "Relative imports (../../lib/*) instead of Next.js @/ alias — worker is plain Node.js process"
  - "Dedup logic copied from route (not imported) — avoids Next.js module resolution issues"
  - "Progress heartbeat: updated_at set after every chunk for stale detection (10 min threshold)"
  - "Atomic staging: items only in staged_items_json — workspace table writes happen in separate approve route"
metrics:
  duration_seconds: 187
  tasks_completed: 2
  files_created: 1
  files_modified: 1
  commits: 2
  tests_passing: 5
completed_date: "2026-04-02"
---

# Phase 31 Plan 02: BullMQ Worker Job Handler

**One-liner:** Full document extraction logic moved from SSE route to worker/jobs/document-extraction.ts with progress tracking, dedup, and atomic staging.

## Objective

Create the BullMQ worker job handler for document extraction and register it in the worker process. The extraction logic (Claude API calls, chunking, dedup, entity routing) moves from the 575-line SSE route into `worker/jobs/document-extraction.ts` — unchanged in behavior, changed only in transport and persistence.

Purpose: This is the core of EXTR-01/03. The job survives browser refresh because it runs in the worker process (not tied to an HTTP request). Progress is written to PostgreSQL after each chunk (EXTR-02). Items are staged in `staged_items_json` — workspace table writes happen only after user approval in the existing approve route (EXTR-03).

## What Was Built

### Task 1: Document Extraction Worker Job Handler

**Created bigpanda-app/worker/jobs/document-extraction.ts (~531 lines):**

**Job Handler Pattern:**
- Follows skill-run.ts pattern exactly: running → try { work + completed } catch { failed + throw }
- Exports default `documentExtractionJob(job: Job)` and named `processDocumentExtraction` for test compatibility

**Job Payload:**
- `{ jobId: number, artifactId: number, projectId: number, batchId: string }`

**Execution Flow:**
1. **Mark running:** Updates extraction_jobs.status='running', artifacts.ingestion_status='extracting'
2. **Read artifact:** Fetches artifact record from DB to get file path
3. **Read file:** Reads file from disk at `{workspace_path}/ingestion/{projectId}/{filename}`
4. **Extract text:** Calls extractDocumentText from ../../lib/document-extractor (PDF → base64 block, others → text)
5. **Split/chunk:** For text documents, splits into 80k-char chunks; PDFs sent as single native document block
6. **Claude extraction:** For each chunk:
   - Calls Claude API with EXTRACTION_SYSTEM prompt
   - Parses JSON response (with jsonrepair fallback)
   - Updates progress: `progress_pct = Math.round(((i+1)/chunks.length)*100)`, `current_chunk = i+1`, `total_chunks = chunks.length`
   - Sets `updated_at = new Date()` — heartbeat for stale detection (10 min threshold)
7. **Deduplication:** Calls `isAlreadyIngested()` for each extracted item — copied from route.ts (not imported to avoid Next.js module resolution)
8. **Completion:** Sets status='completed', staged_items_json=newItems, filtered_count, progress_pct=100; updates artifacts.ingestion_status='preview'
9. **Error handling:** Catch block sets status='failed', error_message, artifacts.ingestion_status='failed'; re-throws error so BullMQ marks job failed in Redis

**Key Implementation Details:**
- **Worker-safe imports:** Uses `../../lib/settings-core` (NOT `../../lib/settings` — has server-only marker)
- **No Next.js aliases:** All imports use relative paths (../../db, ../../lib) — worker is plain Node.js, not Next.js RSC
- **Atomic staging:** NO writes to actions, risks, milestones, or other workspace tables — items ONLY go to staged_items_json
- **Progress heartbeat:** `updated_at` set after every chunk satisfies stale detection threshold (>10 min = stale)
- **Chunk-level error resilience:** If Claude returns non-JSON for a chunk, logs error and skips chunk (doesn't abort entire job)

**Copied Functions:**
- `splitIntoChunks()` — copied from route.ts (80k-char limit with paragraph boundary breaking)
- `isAlreadyIngested()` — copied from route.ts (dedup logic for all 13 entity types)
- `parseClaudeResponse()` — helper to parse Claude JSON with jsonrepair fallback
- `EXTRACTION_SYSTEM` — full system prompt copied from route.ts

### Task 2: Worker Registration

**Modified bigpanda-app/worker/index.ts:**
- Added import: `import documentExtraction from './jobs/document-extraction';`
- Added JOB_HANDLERS entry: `'document-extraction': documentExtraction,`

**Worker Behavior:**
- Worker picks up 'document-extraction' jobs from 'scheduled-jobs' queue
- Concurrency: 1 (intentionally sequential — unchanged)
- Multi-file batches process files one at a time
- Worker handles errors, graceful shutdown, and scheduler polling (all existing behavior, no changes)

## Verification

✅ `npx vitest run tests/ingestion/extraction-job.test.ts` — all 5 tests GREEN
✅ `npx tsc --noEmit` — no TypeScript errors in worker/ or document-extraction
✅ worker/index.ts has `'document-extraction': documentExtraction` in JOB_HANDLERS
✅ document-extraction.ts has NO imports from @/ alias paths (only relative ../../ paths)
✅ document-extraction.ts imports from settings-core (NOT settings)
✅ document-extraction.ts has NO direct writes to actions, risks, milestones, etc.

## Deviations from Plan

None — plan executed exactly as written.

## Blockers Encountered

None.

## Dependencies

**Requirements coverage:**
- EXTR-01: Job survives browser refresh (runs in worker process, not HTTP request)
- EXTR-02: Progress tracking with PostgreSQL persistence (progress_pct, current_chunk, total_chunks updated after each chunk)
- EXTR-03: Atomic staging pattern (items in staged_items_json only — workspace writes in separate approve route)

**Downstream plans:**
- Plan 03 will create the polling endpoint (`/api/ingestion/jobs/[jobId]`) and batch status endpoint
- Plan 04 will modify the SSE route to enqueue jobs instead of extracting inline

## Commits

1. **2e14bcb** — `feat(31-02): create BullMQ worker job handler for document extraction`
   - Full extraction logic moved from SSE route to worker/jobs/document-extraction.ts
   - Job handler follows skill-run.ts pattern (running → completed/failed with re-throw)
   - Progress tracking: updates progress_pct, current_chunk, total_chunks after each chunk
   - Heartbeat: updated_at set after every chunk for stale detection (10 min threshold)
   - Deduplication: copies isAlreadyIngested logic from route (dedup before staging)
   - Atomic staging: items written to staged_items_json only (no workspace table writes)
   - Status sync: updates artifacts.ingestion_status (extracting → preview/failed)
   - Worker-safe imports: uses ../../lib/settings-core (NOT settings.ts with server-only marker)
   - Named export processDocumentExtraction for test compatibility

2. **ef93f36** — `feat(31-02): register document-extraction in worker JOB_HANDLERS`
   - Add import for documentExtraction job handler
   - Add 'document-extraction' entry to JOB_HANDLERS map
   - Worker now picks up document-extraction jobs from scheduled-jobs queue
   - No changes to concurrency (intentionally 1 for sequential processing)

## Key Patterns Established

1. **BullMQ job handler pattern:** Follows skill-run.ts template exactly — running → try { work + completed } catch { failed + throw }

2. **Progress heartbeat:** `updated_at` set after every chunk serves dual purpose: progress tracking for UI + heartbeat for stale detection cron

3. **Atomic staging:** Items go to `staged_items_json` only — workspace table writes happen only after user approval in existing approve route (defense-in-depth against partial ingestion)

4. **Worker-safe imports:** ../../lib/settings-core (NOT settings.ts with server-only marker) + relative paths (NOT @/ alias which requires Next.js module resolution)

5. **Chunk-level error resilience:** Claude JSON parse errors for a single chunk don't abort entire job — log + skip chunk + continue

## Next Steps

**Plan 03** will:
- Create `/api/ingestion/jobs/[jobId]` polling endpoint (returns status, progress_pct, current_chunk, total_chunks)
- Create `/api/projects/[projectId]/extraction-status` batch status endpoint (groups jobs by batch_id)
- Implement stale detection: marks jobs failed if status=running and updated_at >10 min ago
- Make extraction-poll.test.ts and extraction-status.test.ts GREEN

**Plan 04** will:
- Modify `/api/ingestion/extract` route to enqueue jobs (not extract inline)
- Replace SSE stream with immediate response: `{ jobIds: number[], batchId: string }`
- Make extraction-enqueue.test.ts GREEN

## Self-Check

### Files Created
```
✅ FOUND: bigpanda-app/worker/jobs/document-extraction.ts
```

### Files Modified
```
✅ FOUND: bigpanda-app/worker/index.ts (import + JOB_HANDLERS entry)
```

### Commits Exist
```
✅ FOUND: 2e14bcb (feat: worker job handler)
✅ FOUND: ef93f36 (feat: worker registration)
```

### Key Patterns Verified
```
✅ Worker job uses settings-core (NOT settings.ts)
✅ No @/ alias imports (only relative ../../ paths)
✅ No workspace table writes (only staged_items_json)
✅ Progress tracking: progress_pct, current_chunk, total_chunks updated after each chunk
✅ Heartbeat: updated_at set after every chunk
✅ Tests pass GREEN (5/5)
```

## Self-Check: PASSED
