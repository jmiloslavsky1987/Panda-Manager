# Phase 31: BullMQ Document Extraction Migration - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate document extraction from SSE streaming to a BullMQ background job so that browser refresh or navigation away from Context Hub during extraction does not kill the job. The extraction logic (chunking, Claude prompt, dedup, entity routing, review, approve) is unchanged — only the transport and persistence layer changes. Users can navigate away mid-extraction and return to see live progress. When extraction completes in the background, they are notified and can enter the review flow.

No changes to workspace tabs, entity routing, or approval logic.

</domain>

<decisions>
## Implementation Decisions

### Active extraction UX (user stays on Context Hub while extracting)
- IngestionModal stays open and polls job progress (replaces SSE streaming)
- Modal shows % complete + current chunk label: e.g., "60% — Processing chunk 3 of 5"
- If the user navigates away while the modal is open, the modal closes silently — job continues running in BullMQ regardless

### Progress visibility on return (user navigated away and comes back)
- When user returns to Context Hub while a job is running, the upload section is replaced by an inline "Extraction in progress" card showing per-file progress rows (one row per file)
- Each row shows filename + % complete + current chunk label
- No global indicator on other pages — extraction status is only visible on the Context Hub page

### Review handoff (extraction completes in background)
- When all jobs in a batch complete, two things happen: (1) a toast notification fires wherever the user is in the app ("Extraction complete — review X items"), (2) the Context Hub inline section changes to a "Ready for review" card with a Review button
- Clicking Review (from either the toast or the card) reopens the IngestionModal at the reviewing stage, loaded with all staged items from DB
- Staged extraction items do NOT expire — they persist in DB until the user reviews and approves/discards

### Multi-file job structure
- One BullMQ job per file (independent tracking, one failure doesn't block others)
- Multiple jobs from one upload session form a logical "batch" — tracked together
- Review is triggered once, when ALL files in the batch are done (combined items across all files in one review pass)
- Context Hub inline section shows one progress row per file, stacked

### Atomicity (EXTR-03)
- Already decided (STATE.md): PostgreSQL staging table for job state — NOT Redis-only
- Extracted items staged in DB; workspace tab writes only happen after user approves
- Failed job leaves no data in workspace tabs — staging table is cleaned up on failure

### Claude's Discretion
- Polling interval (suggest 2s while modal open, 5s for background Context Hub check)
- Exact `extraction_jobs` table schema (status, progress_pct, current_chunk, total_chunks, batch_id, staged_items_json)
- Worker heartbeat + stale job detection (suggested: update updated_at every 30s, mark stale after 10 min)
- Job timeout settings (suggested: 2× P95 extraction time, min 20 min)
- Toast component/library choice (use existing app toast pattern if one exists)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `worker/index.ts`: BullMQ Worker setup, JOB_HANDLERS dispatch map, graceful shutdown, error/completed/failed listeners — add `'document-extraction'` handler to this map
- `worker/jobs/skill-run.ts`: Job handler pattern to follow exactly — update status to running, do work, update to completed, try/catch → failed + re-throw
- `app/api/skills/[skillName]/run/route.ts`: Enqueue pattern — create DB row first, then `queue.add(...)`, return `{ jobId }` — same pattern for extraction
- `components/IngestionModal.tsx`: Already has stage state machine ('uploading' | 'extracting' | 'reviewing' | 'submitting' | 'done'). The 'extracting' stage needs to switch from SSE EventSource to polling loop. ExtractionPreview + approve/reject flow unchanged.
- `components/IngestionStepper.tsx`: Existing stage progress indicator inside the modal — update to show % and chunk label during extracting stage
- `components/ContextTab.tsx`: Needs new state: detect active/completed jobs on mount, render inline progress section or "ready for review" card
- `app/api/ingestion/extract/route.ts`: Currently 575-line SSE route — needs to become a thin enqueue endpoint returning `{ jobId }`. Extraction logic moves to worker job handler.
- `lib/document-extractor.ts` + `splitIntoChunks()`: Move to worker context; import from there. Extraction logic (Claude calls, chunking, dedup) stays unchanged.
- `worker/connection.ts`: `createApiRedisConnection()` / `createRedisConnection()` — use existing pattern

### Established Patterns
- Job enqueue: create DB row (status='pending') → `queue.add(jobName, payload, { jobId })` → return `{ jobId }`
- Job handler: update DB row to 'running' → do work → update to 'completed' → return `{ status }`; try/catch → 'failed' + re-throw
- Polling: `GET /api/...status/[id]` returns current DB row; client polls on interval, stops on terminal state
- `requireSession()` on all route handlers (CVE-2025-29927 defense-in-depth)
- `export const dynamic = 'force-dynamic'` on all route handlers
- Queue name: `'scheduled-jobs'` (single shared queue)

### Integration Points
- New DB table: `extraction_jobs` — job state, progress_pct, current_chunk, total_chunks, batch_id, staged items or reference to staging
- New worker job: `worker/jobs/document-extraction.ts` — registered in `JOB_HANDLERS` in `worker/index.ts`
- New API routes:
  - `POST /api/ingestion/extract` — enqueue job(s), return `{ jobIds, batchId }` (replaces SSE endpoint)
  - `GET /api/ingestion/jobs/[jobId]` — polling endpoint, returns `{ status, progress_pct, current_chunk, total_chunks }`
  - `GET /api/projects/[projectId]/extraction-status` — Context Hub on-mount check: returns any active/pending-review jobs for this project
- Modified: `components/IngestionModal.tsx` — replace SSE EventSource with polling loop in extracting stage
- Modified: `components/ContextTab.tsx` — add inline progress section (active jobs) + "ready for review" card (completed jobs), loaded on mount via extraction-status endpoint

</code_context>

<specifics>
## Specific Ideas

- The inline progress section in Context Hub (while extracting) replaces the upload area entirely — user can't start a new upload while extraction is running
- "Ready for review" card persists on Context Hub until the user clicks Review and completes the approval flow
- The toast fires once when the last file in the batch completes (not per file)
- Upload history list (already in ContextTab) should reflect final job status (processed / failed) — no behavior change, just ensure extraction_jobs status maps to artifact ingestion_status

</specifics>

<deferred>
## Deferred Ideas

- BullMQ job cancellation — explicitly out of scope per REQUIREMENTS.md; restart is the acceptable workaround
- Staged item expiry/auto-cleanup — no expiry; items persist until reviewed
- Global extraction indicator on nav — only Context Hub shows status
- Scheduled/automatic re-extraction triggers — out of scope

</deferred>

---

*Phase: 31-bullmq-document-extraction-migration*
*Context gathered: 2026-04-01*
