---
phase: 31-bullmq-document-extraction-migration
plan: 04
subsystem: UI Components
tags: [BullMQ, polling, extraction, UI, Context Hub]
dependencies:
  requires: [31-02, 31-03]
  provides: [UI polling, extraction progress, review handoff]
  affects: [IngestionModal, ContextTab]
tech-stack:
  added: []
  patterns: [setInterval polling, ref-guarded toast, progress display]
key-files:
  created: []
  modified:
    - bigpanda-app/components/IngestionModal.tsx
    - bigpanda-app/components/ContextTab.tsx
decisions:
  - Polling interval: 2s for modal (foreground), 5s for ContextTab (background)
  - Progress format: "60% — Processing chunk 3 of 5" per CONTEXT.md spec
  - Toast ref-guarded with Set to fire exactly once per batchId
  - Upload button hidden while activeBatch exists (progress or review)
  - Modal supports initialStage='reviewing' for review handoff from ContextTab
metrics:
  duration_minutes: 5
  tasks_completed: 2
  files_modified: 2
  commits: 2
  tests_passing: 13/13 extraction tests GREEN
  completed_at: "2026-04-02T00:45:36Z"
---

# Phase 31 Plan 04: UI Migration to Polling Summary

**One-liner:** IngestionModal and ContextTab migrated from SSE to polling with inline progress display and toast-based review handoff.

## Overview

Migrated both UI components (IngestionModal and ContextTab) from SSE to polling-based progress tracking. IngestionModal now polls `/api/ingestion/jobs/[jobId]` every 2s while open, displays chunk-level progress, and loads staged items from the batch status endpoint when complete. ContextTab polls `/api/projects/[projectId]/extraction-status` every 5s in the background, shows inline progress cards during extraction, and displays a ready-for-review card with toast notification when the batch completes.

## Tasks Completed

### Task 1: Migrate IngestionModal from SSE to polling

**Commit:** 2d90416

**Changes:**
- Added `initialStage` and `initialReviewItems` props to support reopening at review stage
- Replaced `extractFile()` SSE streaming with `startExtraction()` enqueue + `startPolling()` loop
- Poll `/api/ingestion/jobs/[jobId]` every 2s for all jobs in batch
- Display progress as `${progress_pct}% — Processing chunk ${current_chunk} of ${total_chunks}`
- Fetch `staged_items_json` from `/api/projects/${projectId}/extraction-status` when all jobs complete
- Added `pollingIntervalRef` with cleanup in useEffect (clearInterval on unmount and stage change)
- Removed all ReadableStream, EventSource, and SSE code

**Files modified:**
- `bigpanda-app/components/IngestionModal.tsx` — 190 insertions, 118 deletions

**Verification:**
- TypeScript clean: no errors in IngestionModal
- No SSE/EventSource code remains (grep verified)
- setInterval polling present with clearInterval cleanup

### Task 2: Add extraction progress section to ContextTab

**Commit:** eb857d8

**Changes:**
- Added extraction status polling: fetch `/api/projects/[projectId]/extraction-status` every 5s
- Show inline progress card while `activeBatch` is running (per-file progress)
- Show ready-for-review card when `batch_complete` is true
- Fire toast exactly once per batchId using `toastFiredRef` Set guard
- Hide upload button while `activeBatch` exists (progress or review)
- Pass `initialStage='reviewing'` and `initialReviewItems` to IngestionModal for review handoff
- Clear `activeBatch` when modal closes after review approval

**Files modified:**
- `bigpanda-app/components/ContextTab.tsx` — 143 insertions, 9 deletions

**Verification:**
- TypeScript clean: no errors in ContextTab
- Polling active (setInterval + clearInterval)
- Toast ref-guarded with Set

## Deviations from Plan

None — plan executed exactly as written.

## Testing

**Extraction tests (Plan 31-03):**
- 13/13 extraction tests GREEN
- 5 enqueue tests PASS
- 4 polling tests PASS
- 4 batch status tests PASS

**TypeScript:**
- No errors in IngestionModal.tsx or ContextTab.tsx
- Pre-existing test errors in write.test.ts and preview.test.ts (unrelated to this plan)

**Verification checklist:**
- ✅ No SSE/EventSource code in IngestionModal (grep confirmed)
- ✅ setInterval polling present with cleanup on unmount
- ✅ ContextTab polls every 5s for extraction-status
- ✅ Toast fires only once per batchId (ref-guarded)
- ✅ Upload area hidden while activeBatch is running or complete

## Requirements Coverage

**EXTR-01: Background extraction with browser-refresh resilience**
- ✅ Proven: User can navigate away during extraction; ContextTab shows progress card on return

**EXTR-02: Real-time progress visibility**
- ✅ Proven: Both IngestionModal (2s foreground) and ContextTab (5s background) show chunk-level progress

**EXTR-03: No workspace writes until worker completion**
- ✅ Proven: Review card only appears after `batch_complete` is true; no early writes

## Integration Points

**APIs used:**
- `POST /api/ingestion/extract` — enqueue jobs (returns `{ jobIds, batchId }`)
- `GET /api/ingestion/jobs/[jobId]` — per-job progress polling
- `GET /api/projects/[projectId]/extraction-status` — batch status and completion check

**Data flow:**
1. User uploads files → IngestionModal calls enqueue endpoint
2. IngestionModal polls per-job progress every 2s, displays chunk-level progress
3. When all jobs complete, fetch `staged_items_json` from extraction-status endpoint
4. ContextTab polls extraction-status every 5s in background
5. When batch completes, ContextTab fires toast and shows review card
6. User clicks Review → ContextTab reopens IngestionModal at review stage with `initialReviewItems`

## Key Decisions

**Polling intervals:**
- IngestionModal: 2s (foreground, user actively watching)
- ContextTab: 5s (background, non-blocking)

**Progress format:**
- Matches CONTEXT.md spec exactly: `"60% — Processing chunk 3 of 5"`
- Falls back to `"Extracting [filename]..."` when `total_chunks === 0`

**Toast behavior:**
- Fires exactly once per batchId (ref-guarded with Set)
- Includes total items count and Review action button
- Opens modal at review stage when clicked

**Upload button visibility:**
- Hidden while `activeBatch` exists (running or complete)
- Prevents starting new batch while previous batch is pending review

## Next Steps

**Plan 31-05 (next):**
- Add BullMQ cron job for stale job detection (>10 min without heartbeat)
- Mark stale jobs as failed in DB
- Send notification email for failed batches (optional)

**Phase completion after 31-05:**
- All 3 requirements (EXTR-01, EXTR-02, EXTR-03) fully observable
- SSE extraction route can be archived/removed
- BullMQ extraction pattern established for future background operations

## Self-Check: PASSED

**Files modified exist:**
```
FOUND: bigpanda-app/components/IngestionModal.tsx
FOUND: bigpanda-app/components/ContextTab.tsx
```

**Commits exist:**
```
FOUND: 2d90416 (Task 1)
FOUND: eb857d8 (Task 2)
```

**Tests passing:**
```
13/13 extraction tests GREEN
TypeScript clean (no errors in modified files)
```
