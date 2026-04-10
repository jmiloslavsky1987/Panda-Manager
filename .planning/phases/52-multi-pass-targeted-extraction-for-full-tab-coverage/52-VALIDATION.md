---
phase: 52
slug: multi-pass-targeted-extraction-for-full-tab-coverage
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 52 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `cd "/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app" && npx vitest run --reporter=verbose worker/jobs/__tests__/ __tests__/ingestion-modal-pass-progress.test.ts 2>&1 \| tail -40` |
| **Full suite command** | `cd "/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app" && npx vitest run` |
| **Estimated runtime** | ~30 seconds (quick), ~60 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run quick command above
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 52-01-01 | 01 | 0 | Pass structure | unit | `npx vitest run worker/jobs/__tests__/document-extraction-passes.test.ts worker/jobs/__tests__/document-extraction-dedup.test.ts __tests__/ingestion-modal-pass-progress.test.ts` | ❌ W0 | ⬜ pending |
| 52-01-02 | 01 | 1 | runClaudeCall signature | unit | `npx vitest run worker/jobs/__tests__/document-extraction-passes.test.ts -t "pass prompts"` | ❌ W0 | ⬜ pending |
| 52-01-03 | 01 | 1 | 3 passes PDF path | unit | `npx vitest run worker/jobs/__tests__/document-extraction-passes.test.ts -t "PDF 3 passes"` | ❌ W0 | ⬜ pending |
| 52-01-04 | 01 | 1 | 3 passes text path | unit | `npx vitest run worker/jobs/__tests__/document-extraction-passes.test.ts -t "text 3 passes"` | ❌ W0 | ⬜ pending |
| 52-01-05 | 01 | 1 | Progress global scale | unit | `npx vitest run worker/jobs/__tests__/document-extraction-passes.test.ts -t "progress"` | ❌ W0 | ⬜ pending |
| 52-02-01 | 02 | 1 | Intra-batch dedup same type | unit | `npx vitest run worker/jobs/__tests__/document-extraction-dedup.test.ts -t "intra-batch"` | ❌ W0 | ⬜ pending |
| 52-02-02 | 02 | 1 | Intra-batch dedup cross-type preserved | unit | `npx vitest run worker/jobs/__tests__/document-extraction-dedup.test.ts -t "cross-type preserved"` | ❌ W0 | ⬜ pending |
| 52-02-03 | 02 | 1 | Merge all passes before staging | unit | `npx vitest run worker/jobs/__tests__/document-extraction-passes.test.ts -t "merge"` | ❌ W0 | ⬜ pending |
| 52-02-04 | 02 | 1 | isAlreadyIngested import from lib | unit | `npx vitest run worker/jobs/__tests__/document-extraction-passes.test.ts -t "isAlreadyIngested"` | ❌ W0 | ⬜ pending |
| 52-03-01 | 03 | 2 | IngestionModal pass message format | unit (source inspection) | `npx vitest run __tests__/ingestion-modal-pass-progress.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `worker/jobs/__tests__/document-extraction-passes.test.ts` — unit stubs for pass structure, runClaudeCall signature, PDF 3 passes, text 3 passes, progress encoding, merge behavior, isAlreadyIngested import
- [ ] `worker/jobs/__tests__/document-extraction-dedup.test.ts` — unit stubs for `deduplicateWithinBatch()`: same-type dedup, cross-type preservation, all entity type key fields
- [ ] `__tests__/ingestion-modal-pass-progress.test.ts` — source inspection that `PASS_LABELS` constant and pass-index math exist in `IngestionModal.tsx`

*Three test files, all Wave 0 stubs — existing test infrastructure covers all requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "Pass N of 3 — Label (X%)" displayed in modal during upload | Progress display locked decision | Requires live BullMQ worker + actual document upload | Upload a PDF, watch IngestionModal for pass labels cycling through all 3 |
| Review queue contains items from all 3 passes after upload | Merge + dedup completeness | Requires real Claude API call with real document | Upload doc known to have arch_node + wbs_task + actions; verify all tabs have new items |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
