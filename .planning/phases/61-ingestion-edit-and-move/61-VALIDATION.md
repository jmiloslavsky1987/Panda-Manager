---
phase: 61
slug: ingestion-edit-and-move
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 61 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `cd bigpanda-app && npx vitest run tests/extraction/ tests/ingestion/write.test.ts app/api/__tests__/ingestion-approve.test.ts` |
| **Full suite command** | `cd bigpanda-app && npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd bigpanda-app && npx vitest run tests/extraction/ tests/ingestion/write.test.ts`
- **After every plan wave:** Run `cd bigpanda-app && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 61-01-01 | 01 | 0 | INGEST-01 | unit | `cd bigpanda-app && npx vitest run tests/extraction/ingestion-edit-propagation.test.ts` | ❌ W0 | ⬜ pending |
| 61-01-02 | 01 | 0 | INGEST-05 | unit | `cd bigpanda-app && npx vitest run tests/extraction/note-reclassification.test.ts` | ❌ W0 | ⬜ pending |
| 61-01-03 | 01 | 0 | INGEST-05 | unit | `cd bigpanda-app && npx vitest run app/api/__tests__/ingestion-approve-reclassify.test.ts` | ❌ W0 | ⬜ pending |
| 61-01-04 | 01 | 1 | INGEST-01 | unit | `cd bigpanda-app && npx vitest run tests/extraction/ingestion-edit-propagation.test.ts -t "edited"` | ❌ W0 | ⬜ pending |
| 61-01-05 | 01 | 1 | INGEST-01 | unit | `cd bigpanda-app && npx vitest run tests/extraction/ingestion-edit-propagation.test.ts -t "validation"` | ❌ W0 | ⬜ pending |
| 61-01-06 | 01 | 1 | INGEST-05 | unit | `cd bigpanda-app && npx vitest run tests/extraction/note-reclassification.test.ts -t "reclassif"` | ❌ W0 | ⬜ pending |
| 61-01-07 | 01 | 1 | INGEST-05 | unit | `cd bigpanda-app && npx vitest run app/api/__tests__/ingestion-approve-reclassify.test.ts -t "reclassif"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/tests/extraction/ingestion-edit-propagation.test.ts` — stubs for INGEST-01 (edited flag, field round-trip, pre-submit validation logic)
- [ ] `bigpanda-app/tests/extraction/note-reclassification.test.ts` — stubs for INGEST-05 (all 5 content→primary field mappings, entityType change)
- [ ] `bigpanda-app/app/api/__tests__/ingestion-approve-reclassify.test.ts` — stubs for INGEST-05 approve route routing for reclassified notes

*Existing infrastructure covers shared fixtures — `vi.mock('@/db')` pattern from `write.test.ts` and `ingestion-approve.test.ts` is reusable. No new framework or fixture files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Type dropdown appears only for note entities in ExtractionItemEditForm | INGEST-05 | Visual/UI rendering | Open IngestionModal, expand a note item, verify Type dropdown appears; expand non-note item, verify no dropdown |
| Reclassified item moves to correct tab immediately after type change | INGEST-05 | UI state transition | Change note to action, verify item disappears from Notes tab and appears in Actions tab instantly |
| Inline error indicator shown on row with empty primary field on approve | INGEST-01 | Visual/UI rendering | Approve items with empty primary field, verify "Required field empty" appears inline on offending rows |
| Error indicators clear after correcting the empty field | INGEST-01 | UI state transition | Fix the empty field, re-approve, verify error clears and approve succeeds |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
