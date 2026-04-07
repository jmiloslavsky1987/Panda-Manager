---
phase: 42
slug: ingestion-field-coverage
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 42 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (confirmed — `vitest` in test files, `describe/it/expect/vi` imports) |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `cd bigpanda-app && npx vitest run tests/ingestion/` |
| **Full suite command** | `cd bigpanda-app && npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd bigpanda-app && npx vitest run tests/ingestion/`
- **After every plan wave:** Run `cd bigpanda-app && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 42-W0-01 | Wave 0 | 0 | coerceRiskSeverity helper | unit | `cd bigpanda-app && npx vitest run tests/ingestion/write.test.ts` | ❌ W0 | ⬜ pending |
| 42-W0-02 | Wave 0 | 0 | insertItem risk writes severity | unit | `cd bigpanda-app && npx vitest run tests/ingestion/write.test.ts` | ❌ W0 | ⬜ pending |
| 42-W0-03 | Wave 0 | 0 | insertItem task writes all new FK/date fields | unit | `cd bigpanda-app && npx vitest run tests/ingestion/write.test.ts` | ❌ W0 | ⬜ pending |
| 42-W0-04 | Wave 0 | 0 | insertItem milestone writes owner | unit | `cd bigpanda-app && npx vitest run tests/ingestion/write.test.ts` | ❌ W0 | ⬜ pending |
| 42-W0-05 | Wave 0 | 0 | mergeItem risk fill-null-only for severity | unit | `cd bigpanda-app && npx vitest run tests/ingestion/write.test.ts` | ❌ W0 | ⬜ pending |
| 42-W0-06 | Wave 0 | 0 | mergeItem task fill-null-only for start_date, due, milestone_id | unit | `cd bigpanda-app && npx vitest run tests/ingestion/write.test.ts` | ❌ W0 | ⬜ pending |
| 42-W0-07 | Wave 0 | 0 | Cross-entity resolution: 1 match → FK set; 0 or 2+ matches → null | unit | `cd bigpanda-app && npx vitest run tests/ingestion/write.test.ts` | ❌ W0 | ⬜ pending |
| 42-W0-08 | Wave 0 | 0 | Unresolved milestone ref stored in task.description as "Milestone ref: [name]" | unit | `cd bigpanda-app && npx vitest run tests/ingestion/write.test.ts` | ❌ W0 | ⬜ pending |
| 42-W0-09 | Wave 0 | 0 | Approval API response includes unresolvedRefs message when applicable | unit | `cd bigpanda-app && npx vitest run tests/ingestion/write.test.ts` | ❌ W0 | ⬜ pending |
| 42-W0-10 | Wave 0 | 0 | Extraction prompt includes milestone_name, workstream_name, start_date, due_date, priority, description for tasks | unit (prompt string inspection) | `cd bigpanda-app && npx vitest run tests/ingestion/extraction-job.test.ts` | ❌ W0 | ⬜ pending |
| 42-W0-11 | Wave 0 | 0 | ENTITY_FIELDS for task includes new fields | unit | `cd bigpanda-app && npx vitest run tests/ui/` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/tests/ingestion/write.test.ts` — extend existing file with new test cases for: severity write (INSERT), task FK/date write (INSERT), fill-null-only guards (MERGE), cross-entity resolution, unresolved ref description append, unresolvedRefs API response field
- [ ] `bigpanda-app/tests/ingestion/extraction-job.test.ts` — extend existing file to assert new prompt fields for task entity guidance (milestone_name, workstream_name, start_date, due_date, priority, description) and milestone entity guidance (owner)

*No new test files needed — extend existing ingestion test files.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Approval cards show new fields before commit (task: start_date, due, milestone_name, priority; risk: severity; decision: rationale; milestone: owner) | CONTEXT.md § Approval UI visibility | Requires browser + real document upload; no unit test for visual layout | Upload a sample project document; open approval modal; verify each entity card shows new fields |
| Unresolved ref notice appears in approval UI toast/message | CONTEXT.md § Unmatched reference handling | Requires integration with real document that has unresolvable references | Upload document with milestone/workstream references that don't match any DB records; verify notice text in UI |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
