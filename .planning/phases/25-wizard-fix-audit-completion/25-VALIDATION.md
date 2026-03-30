---
phase: 25
slug: wizard-fix-audit-completion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `cd bigpanda-app && npx vitest run tests/audit/ tests/wizard/` |
| **Full suite command** | `cd bigpanda-app && npx vitest run` |
| **Estimated runtime** | ~15 seconds (quick) / ~60 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `cd bigpanda-app && npx vitest run tests/audit/ tests/wizard/`
- **After every plan wave:** Run `cd bigpanda-app && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + manual verification steps 1–5 completed
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 25-01-01 | 01 | 0 | WIZ-03 | unit | `cd bigpanda-app && npx vitest run tests/wizard/ai-preview-filter.test.ts` | ❌ W0 | ⬜ pending |
| 25-01-02 | 01 | 0 | AUDIT-02 | unit | `cd bigpanda-app && npx vitest run tests/audit/ingestion-approve-audit.test.ts` | ❌ W0 | ⬜ pending |
| 25-01-03 | 01 | 0 | AUDIT-02 | unit | `cd bigpanda-app && npx vitest run tests/audit/discovery-approve-audit.test.ts` | ❌ W0 | ⬜ pending |
| 25-02-01 | 02 | 1 | WIZ-03 | unit | `cd bigpanda-app && npx vitest run tests/wizard/ai-preview-filter.test.ts` | ✅ W0 | ⬜ pending |
| 25-03-01 | 03 | 2 | AUDIT-02 | unit | `cd bigpanda-app && npx vitest run tests/audit/ingestion-approve-audit.test.ts` | ✅ W0 | ⬜ pending |
| 25-03-02 | 03 | 2 | AUDIT-02 | unit | `cd bigpanda-app && npx vitest run tests/audit/discovery-approve-audit.test.ts` | ✅ W0 | ⬜ pending |
| 25-04-01 | 04 | 3 | AUDIT-02 | unit | `cd bigpanda-app && npx vitest run tests/audit/` | ✅ W0 | ⬜ pending |
| 25-04-02 | 04 | 3 | AUDIT-02 | unit | `cd bigpanda-app && npx vitest run tests/audit/` | ✅ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/tests/wizard/ai-preview-filter.test.ts` — unit tests for WIZ-03 filter fix: (1) `fileStatuses.filter(f => f.artifactId)` returns files with `status: 'done'`; (2) the broken filter `f.artifactId && f.status !== 'done'` returns zero files
- [ ] `bigpanda-app/tests/audit/ingestion-approve-audit.test.ts` — unit tests with mocked `db` verifying `insertItem()` and `mergeItem()` call `db.transaction()` and include an `auditLog` insert
- [ ] `bigpanda-app/tests/audit/discovery-approve-audit.test.ts` — unit tests verifying `insertDiscoveredItem()` wraps entity write + audit insert inside a `db.transaction()`

*Existing: `tests/audit/audit-helper.test.ts` (5 tests, GREEN) and `tests/wizard/multi-file-accumulation.test.ts` cover adjacent behaviors but not the specific Phase 25 changes.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SSE extraction fires in E2E wizard flow | WIZ-03 | Requires live server, real file upload, Network tab inspection | Upload a file in wizard step 2 → advance to step 3 → confirm POST /api/ingestion/extract fires and extracted items appear in preview |
| ingestion/approve writes audit_log rows per entity | AUDIT-02 | Requires live DB; integration test would need full server stack | Approve ingestion items → query `SELECT * FROM audit_log ORDER BY id DESC LIMIT 20` → confirm one row per approved entity |
| discovery/approve writes audit_log rows | AUDIT-02 | Requires live DB | Approve a discovery item → confirm audit row in DB with correct entity_type and after_json |
| tasks CRUD writes audit rows | AUDIT-02 | Requires live DB | Create/edit/delete a task → confirm audit rows with before/after JSON |
| stakeholders/workstreams/knowledge-base/plan-templates write audit rows | AUDIT-02 | Requires live DB | Perform mutations on each entity type → confirm audit rows |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
