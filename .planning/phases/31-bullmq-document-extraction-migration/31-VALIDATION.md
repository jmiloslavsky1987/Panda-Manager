---
phase: 31
slug: bullmq-document-extraction-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/ingestion/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/ingestion/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 31-01-01 | 01 | 0 | EXTR-01 | unit | `npx vitest run tests/ingestion/extraction-job.test.ts` | ❌ W0 | ⬜ pending |
| 31-01-02 | 01 | 0 | EXTR-01 | unit | `npx vitest run tests/ingestion/extraction-enqueue.test.ts` | ❌ W0 | ⬜ pending |
| 31-01-03 | 01 | 0 | EXTR-02 | unit | `npx vitest run tests/ingestion/extraction-poll.test.ts` | ❌ W0 | ⬜ pending |
| 31-01-04 | 01 | 0 | EXTR-01,02,03 | unit | `npx vitest run tests/ingestion/extraction-status.test.ts` | ❌ W0 | ⬜ pending |
| 31-02-01 | 02 | 1 | EXTR-01 | unit | `npx vitest run tests/ingestion/extraction-job.test.ts` | ❌ W0 | ⬜ pending |
| 31-02-02 | 02 | 1 | EXTR-02 | unit | `npx vitest run tests/ingestion/extraction-job.test.ts` | ❌ W0 | ⬜ pending |
| 31-02-03 | 02 | 1 | EXTR-03 | unit | `npx vitest run tests/ingestion/extraction-job.test.ts` | ❌ W0 | ⬜ pending |
| 31-03-01 | 03 | 2 | EXTR-01 | unit | `npx vitest run tests/ingestion/extraction-enqueue.test.ts` | ❌ W0 | ⬜ pending |
| 31-04-01 | 04 | 2 | EXTR-02 | unit | `npx vitest run tests/ingestion/extraction-poll.test.ts` | ❌ W0 | ⬜ pending |
| 31-04-02 | 04 | 2 | EXTR-02 | unit | `npx vitest run tests/ingestion/extraction-status.test.ts` | ❌ W0 | ⬜ pending |
| 31-05-01 | 05 | 3 | EXTR-03 | unit | `npx vitest run tests/ingestion/write.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/ingestion/extraction-job.test.ts` — worker job handler unit tests (EXTR-01, EXTR-02, EXTR-03): pending→running→completed transitions, progress_pct increments, failed job leaves staged_items_json=null
- [ ] `tests/ingestion/extraction-enqueue.test.ts` — enqueue route unit test with mocked Queue and DB (EXTR-01): returns {jobIds, batchId}, creates DB rows
- [ ] `tests/ingestion/extraction-poll.test.ts` — polling endpoint unit test (EXTR-02): returns progress_pct, current_chunk, total_chunks from DB
- [ ] `tests/ingestion/extraction-status.test.ts` — batch completion logic (EXTR-01,02,03): batch_complete=true only when all jobs in batch are terminal

Test patterns to follow: `tests/ingestion/extractor.test.ts` (vi.mock for Anthropic + DB), `tests/ingestion/write.test.ts` (approve route tests).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| User navigates away mid-extraction, returns to see inline progress card | EXTR-01 | Requires real browser navigation and real BullMQ job | Start extraction → navigate away → return to Context Hub → verify inline progress card shows correct % |
| Toast fires once when entire batch completes, not per-file | EXTR-01 | Multi-file batch behavior requires real queue and browser | Upload 2 files → navigate away → wait for completion → verify exactly 1 toast appears |
| Extraction survives browser full refresh mid-job | EXTR-01 | Requires real BullMQ process and browser | Start extraction → hard refresh browser mid-extraction → return to Context Hub → verify progress card resumes |
| 4-6 minute extraction completes without timeout | EXTR-01 | Requires real document and real Claude API | Upload large document → wait full extraction → verify completion |
| Failed extraction shows no data in workspace tabs | EXTR-03 | Requires triggered failure condition | Force extraction failure (invalid artifact) → check workspace tabs are unchanged |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
