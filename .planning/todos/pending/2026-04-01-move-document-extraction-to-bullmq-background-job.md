---
created: 2026-04-01T17:53:54.290Z
title: Move document extraction to BullMQ background job
area: api
files:
  - bigpanda-app/app/api/ingestion/extract/route.ts
  - bigpanda-app/components/IngestionModal.tsx
  - bigpanda-app/worker/scheduler.ts
---

## Problem

The current document extraction flow uses an SSE stream tied to the browser connection. If the user refreshes the page or navigates away mid-extraction, the entire extraction is lost and must be restarted from scratch. Discovered during Phase 30 verification testing with a 350KB Word doc (4 chunks × ~80K chars, ~4–6 minutes total). Large documents are especially vulnerable since they take the longest.

## Solution

Move the chunked Claude extraction call from the Route Handler into a BullMQ background job:

1. POST /api/ingestion/extract enqueues a job and immediately returns a `jobId`
2. Worker processes chunks sequentially, storing progress + results in Redis
3. IngestionModal polls GET /api/ingestion/extract/status/[jobId] for progress updates (replace SSE listener with polling loop)
4. On completion, job result contains the full extracted items — modal shows preview as before

BullMQ, Redis, and the worker process all exist from Phase 24 — no new infrastructure needed. Scope: v3.1. Threshold for background job: documents over ~50KB (currently all Word/text docs are chunked at 80K chars).
