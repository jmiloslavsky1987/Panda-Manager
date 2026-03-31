---
phase: 22
slug: source-badges-+-audit-log
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `cd bigpanda-app && npx vitest run tests/audit/` |
| **Full suite command** | `cd bigpanda-app && npx vitest run` |
| **Estimated runtime** | ~15 seconds (audit suite), ~60 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `cd bigpanda-app && npx vitest run tests/audit/`
- **After every plan wave:** Run `cd bigpanda-app && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 0 | AUDIT-01 | unit | `cd bigpanda-app && npx vitest run tests/audit/source-badge.test.ts` | ❌ W0 | ⬜ pending |
| 22-01-02 | 01 | 0 | AUDIT-02 | unit | `cd bigpanda-app && npx vitest run tests/audit/audit-helper.test.ts` | ❌ W0 | ⬜ pending |
| 22-01-03 | 01 | 0 | AUDIT-03 | unit | `cd bigpanda-app && npx vitest run tests/audit/audit-helper.test.ts` | ❌ W0 | ⬜ pending |
| 22-02-01 | 02 | 1 | AUDIT-01 | unit | `cd bigpanda-app && npx vitest run tests/audit/source-badge.test.ts` | ❌ W0 | ⬜ pending |
| 22-03-01 | 03 | 1 | AUDIT-02 | integration | `cd bigpanda-app && npx vitest run tests/audit/audit-helper.test.ts` | ❌ W0 | ⬜ pending |
| 22-03-02 | 03 | 1 | AUDIT-03 | integration | `cd bigpanda-app && npx vitest run tests/audit/audit-helper.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/tests/audit/source-badge.test.ts` — unit tests for SourceBadge label derivation (Manual / Ingested — filename / Discovered — tool)
- [ ] `bigpanda-app/tests/audit/audit-helper.test.ts` — unit tests for `writeAuditLog()` helper: correct entity_type, entity_id, action, actor_id, before_json, after_json, timestamp; DELETE-before-remove ordering

*Wave 0 must pass before Wave 1 execution begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Source badge visually appears on every entity tab | AUDIT-01 | UI rendering requires browser | Open ACME project → visit Actions, Risks, Milestones, Decisions, Stakeholders, Engagement History, Artifacts tabs — confirm badge renders on each row |
| Deletion confirmation dialog opens before delete | AUDIT-03 | Browser interaction flow | Click delete on any entity → confirm modal appears → confirm delete fires → record removed |
| audit_log row written with correct fields on create/edit/delete | AUDIT-02 | Requires live DB query | Create/edit/delete a record → run `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 5;` → verify fields |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
