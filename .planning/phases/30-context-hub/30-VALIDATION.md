---
phase: 30
slug: context-hub
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test tests/context/ --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 30-??-01 | 01 | 0 | CTX-01 | unit | `npm test tests/ui/workspace-tabs.test.ts -t "Context tab" --run` | ❌ Wave 0 | ⬜ pending |
| 30-??-02 | 01 | 0 | CTX-02 | unit | `npm test tests/ingestion/extractor.test.ts -t "new entity types" --run` | ❌ Wave 0 | ⬜ pending |
| 30-??-03 | 02 | 0 | CTX-03 | unit | `npm test tests/context/completeness.test.ts -t "gap analysis" --run` | ❌ Wave 0 | ⬜ pending |
| 30-??-04 | 03 | 0 | CTX-04 | unit | `npm test tests/context/context-tab.test.ts -t "completeness UI" --run` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/context/completeness.test.ts` — stubs for CTX-03 (gap analysis endpoint)
- [ ] `tests/context/context-tab.test.ts` — stubs for CTX-04 (UI completeness component)
- [ ] `tests/ui/workspace-tabs.test.ts` extension — stubs for CTX-01 (Context tab registration)
- [ ] `tests/ingestion/extractor.test.ts` extension — stubs for CTX-02 (new entity types: workstream, onboarding_step, integration)

*Framework install: none needed — vitest already installed per package.json.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Upload PDF/DOCX/PPTX → extraction preview shows categorized suggestions per tab | CTX-01, CTX-02 | Browser file upload flow; requires real file + live Claude API | Open Context tab, drag a test document, verify IngestionModal shows categorized preview with entity types grouped by workspace tab |
| Approve suggestions → all items written in single transaction; re-upload same doc yields no duplicates | CTX-02 | Requires live DB + transactional verification | Approve batch, check DB for inserted records, re-upload same doc, verify no duplicate records created (idempotency via ingestion_id) |
| "Analyze completeness" button → specific gap descriptions reference record IDs | CTX-03, CTX-04 | Requires live DB with known data state + Claude API call | Populate test project with partial data, click Analyze, verify gap text references specific record IDs and field names (not generic "tab is incomplete") |
| Template placeholder records (source='template') not counted as complete | CTX-03 | Requires DB with template records | Create project (auto-populates template records), run completeness analysis, verify all tabs show "empty" not "complete" |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
