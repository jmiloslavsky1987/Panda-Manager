---
phase: 51
slug: extraction-intelligence-overhaul-full-tab-coverage
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-09
---

# Phase 51 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `cd bigpanda-app && npm test` |
| **Full suite command** | `cd bigpanda-app && npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd bigpanda-app && npm test`
- **After every plan wave:** Run `cd bigpanda-app && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Gap | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-----|-----------|-------------------|-------------|--------|
| 51-01-W0 | 01 | 0 | E,G | unit stubs | `npm test` | ❌ Wave 0 | ⬜ pending |
| 51-01-01 | 01 | 1 | D,H,I,J | code inspection | Manual verify EXTRACTION_SYSTEM string | N/A | ⬜ pending |
| 51-01-02 | 01 | 1 | A | unit | `npm test` | ❌ Wave 0 | ⬜ pending |
| 51-01-03 | 01 | 1 | G | unit | `npm test` | ❌ Wave 0 | ⬜ pending |
| 51-01-04 | 01 | 1 | E | unit | `npm test` | ❌ Wave 0 | ⬜ pending |
| 51-02-01 | 02 | 2 | A | unit | `npm test` | ✅ extend | ⬜ pending |
| 51-02-02 | 02 | 2 | B | unit | `npm test` | ✅ extend | ⬜ pending |
| 51-02-03 | 02 | 2 | C | unit | `npm test` | ✅ extend | ⬜ pending |
| 51-02-04 | 02 | 2 | G | unit | `npm test` | ❌ Wave 0 | ⬜ pending |
| 51-03-01 | 03 | 3 | F | integration | `npm test` | ✅ extend | ⬜ pending |
| 51-03-02 | 03 | 3 | F | manual | Review Queue UI display | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/app/api/__tests__/status-coercers.test.ts` — stubs for Gap E (`coerceWbsItemStatus`, `coerceArchNodeStatus`)
- [ ] `bigpanda-app/app/api/__tests__/weekly-focus-ingestion.test.ts` — stubs for Gap G (Redis cache write via insertItem)

*Existing infrastructure:*
- `bigpanda-app/app/api/__tests__/ingestion-approve.test.ts` — extend for Gaps A, B, C, F (Gaps 1-4 stubs already present from Phase 50)

---

## Manual-Only Verifications

| Behavior | Gap | Why Manual | Test Instructions |
|----------|-----|------------|-------------------|
| `team_engagement` removed from extraction prompt | D | String inspection in large prompt constant | Read `EXTRACTION_SYSTEM` in document-extraction.ts, confirm `team_engagement` not in entityType union |
| `team_pathway` added to extraction prompt with correct fields | H | Prompt content verification | Read `EXTRACTION_SYSTEM`, confirm `team_pathway` entry with team_name, route_description, status, notes |
| Disambiguation examples present for task/wbs_task, architecture/arch_node/integration, team/stakeholder | E | Prompt content verification | Read disambiguation section of `EXTRACTION_SYSTEM` |
| Valid track name guidance (ADR Track, AI Assistant Track) present in prompt | J | Prompt content verification | Read `EXTRACTION_SYSTEM` arch_node section |
| ReviewQueue shows per-entity write breakdown after approval | F | UI interaction | Approve a batch with mixed entity types, verify breakdown toast shows entity counts + skipped |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
