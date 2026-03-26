---
phase: 18
slug: document-ingestion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.1 |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose bigpanda-app/tests/ingestion` |
| **Full suite command** | `npx vitest run --reporter=verbose bigpanda-app/tests/` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run bigpanda-app/tests/ingestion/`
- **After every plan wave:** Run `npx vitest run --reporter=verbose bigpanda-app/tests/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 0 | ING-01, ING-03 | unit | `npx vitest run bigpanda-app/tests/ingestion/upload.test.ts` | ❌ W0 | ⬜ pending |
| 18-01-02 | 01 | 0 | ING-02 | unit | `npx vitest run bigpanda-app/tests/ingestion/validation.test.ts` | ❌ W0 | ⬜ pending |
| 18-01-03 | 01 | 0 | ING-04 | unit | `npx vitest run bigpanda-app/tests/ingestion/extractor.test.ts` | ❌ W0 | ⬜ pending |
| 18-01-04 | 01 | 0 | ING-05, ING-06, ING-07 | unit | `npx vitest run bigpanda-app/tests/ingestion/preview.test.ts` | ❌ W0 | ⬜ pending |
| 18-01-05 | 01 | 0 | ING-08, ING-11, ING-12 | unit | `npx vitest run bigpanda-app/tests/ingestion/dedup.test.ts` | ❌ W0 | ⬜ pending |
| 18-01-06 | 01 | 0 | ING-09, ING-10 | unit | `npx vitest run bigpanda-app/tests/ingestion/write.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/tests/ingestion/upload.test.ts` — stubs for ING-01, ING-03
- [ ] `bigpanda-app/tests/ingestion/validation.test.ts` — stubs for ING-02
- [ ] `bigpanda-app/tests/ingestion/extractor.test.ts` — stubs for ING-04 (mock Claude response)
- [ ] `bigpanda-app/tests/ingestion/preview.test.ts` — stubs for ING-05, ING-06, ING-07
- [ ] `bigpanda-app/tests/ingestion/dedup.test.ts` — stubs for ING-08, ING-11, ING-12
- [ ] `bigpanda-app/tests/ingestion/write.test.ts` — stubs for ING-09, ING-10
- [ ] `bigpanda-app/db/migrations/0012_ingestion_source_attribution.sql` — source_artifact_id + ingested_at columns on all entity tables

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag-and-drop file zone UI interaction | ING-01 | Browser drag-and-drop event cannot be automated in Vitest | Open Artifacts tab, drag a file onto the drop zone, confirm upload starts |
| PPTX text extraction quality | ING-04 | Extraction quality is empirical; depends on PPTX structure | Upload a sample PPTX with known content; verify extracted text matches source |
| Conflict merge/replace/skip prompt display | ING-11 | Requires real DB state + UI interaction | Upload same document twice, confirm conflict prompt appears before any write |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
