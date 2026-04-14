---
phase: 46
slug: context-upload-extraction-expansion
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-08
---

# Phase 46 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/ingestion/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/ingestion/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 46-01-00 | 01 | 0 | WBS-03, TEAM-02, ARCH-04 | unit RED | `npx vitest run tests/ingestion/extractor.test.ts tests/ingestion/extraction-types.test.ts` | ❌ W0 | ⬜ pending |
| 46-01-01 | 01 | 1 | WBS-03 | unit | `npx vitest run tests/ingestion/extractor.test.ts` | ❌ W0 | ⬜ pending |
| 46-02-01 | 02 | 2 | WBS-03, TEAM-02, ARCH-04 | unit | `npx vitest run tests/ingestion/extraction-types.test.ts` | ❌ W0 | ⬜ pending |
| 46-02-02 | 02 | 3 | WBS-03, TEAM-02, ARCH-04 | unit | `npx vitest run tests/ingestion/write.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/ingestion/extractor.test.ts` — RED stubs for wbs_task, team_engagement, arch_node entity type extraction
- [ ] `tests/ingestion/extraction-types.test.ts` — RED stubs for isAlreadyIngested() new entity types

*Existing `tests/ingestion/write.test.ts` covers approve route — extend with new entity type cases.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 80%+ accuracy on existing entity types after prompt expansion | EXTR-01 | Requires real document upload; accuracy is subjective | Upload a known PS delivery document, review extraction results, count correct vs incorrect classifications for actions/risks/milestones |
| WBS node fuzzy matching quality | WBS-03 | Matching quality depends on real document language vs seeded WBS names | Upload document with WBS-like tasks, verify extracted items route to correct nodes |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
