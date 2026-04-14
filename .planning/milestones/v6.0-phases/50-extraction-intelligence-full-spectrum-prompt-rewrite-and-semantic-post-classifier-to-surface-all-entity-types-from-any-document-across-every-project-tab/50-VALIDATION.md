---
phase: 50
slug: extraction-intelligence-full-spectrum-prompt-rewrite-and-semantic-post-classifier-to-surface-all-entity-types-from-any-document-across-every-project-tab
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-08
---

# Phase 50 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.1 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 50-01-01 | 01 | 1 | Gap 1: team entity → teamOnboardingStatus | integration | `npm test -- app/api/__tests__/ingestion-approve.test.ts -t "team entity"` | ❌ W0 | ⬜ pending |
| 50-01-02 | 01 | 1 | Gap 2: architecture entity includes integration_group | integration | `npm test -- app/api/__tests__/ingestion-approve.test.ts -t "architecture entity"` | ❌ W0 | ⬜ pending |
| 50-01-03 | 01 | 1 | Gap 3: focus_area entity → focusAreas table | integration | `npm test -- app/api/__tests__/ingestion-approve.test.ts -t "focus_area entity"` | ❌ W0 | ⬜ pending |
| 50-01-04 | 01 | 1 | Gap 4: e2e_workflow entity → e2eWorkflows + workflowSteps | integration | `npm test -- app/api/__tests__/ingestion-approve.test.ts -t "e2e_workflow entity"` | ❌ W0 | ⬜ pending |
| 50-02-01 | 02 | 1 | Gap 5a: focus_area dedup checks focusAreas.title | unit | `npm test -- lib/__tests__/extraction-types.test.ts -t "focus_area dedup"` | ❌ W0 | ⬜ pending |
| 50-02-02 | 02 | 1 | Gap 5b: e2e_workflow dedup checks workflow_name + team_name | unit | `npm test -- lib/__tests__/extraction-types.test.ts -t "e2e_workflow dedup"` | ❌ W0 | ⬜ pending |
| 50-03-01 | 03 | 2 | Gap 6: wbs_task end-to-end field completeness | manual | Code review: prompt fields → schema columns → insertItem writes | N/A | ⬜ pending |
| 50-03-02 | 03 | 2 | Gap 6: team_engagement end-to-end field completeness | manual | Code review: prompt fields → schema columns → insertItem writes | N/A | ⬜ pending |
| 50-03-03 | 03 | 2 | Gap 6: arch_node end-to-end field completeness | manual | Code review: prompt fields → schema columns → insertItem writes | N/A | ⬜ pending |
| 50-03-04 | 03 | 2 | Gap 6: onboarding_step end-to-end field completeness | manual | Code review: prompt fields → schema columns → insertItem writes | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `app/api/__tests__/ingestion-approve.test.ts` — stubs for Gaps 1–4 (entity commit handlers)
- [ ] `lib/__tests__/extraction-types.test.ts` — stubs for Gap 5 (dedup logic for focus_area and e2e_workflow)

*Framework already installed: vitest.config.ts exists with 370+ passing tests. No new installs required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| wbs_task end-to-end field completeness | Gap 6 | Cross-file trace: prompt → extractionTypes → approve handler | Compare prompt fields in worker/jobs/document-extraction.ts → extraction-types.ts interface → approve/route.ts insert |
| team_engagement end-to-end field completeness | Gap 6 | Cross-file trace: prompt → extractionTypes → approve handler | Compare prompt fields → extraction-types.ts interface → approve/route.ts insert |
| arch_node end-to-end field completeness | Gap 6 | Cross-file trace: prompt → extractionTypes → approve handler | Compare prompt fields → extraction-types.ts interface → approve/route.ts insert |
| onboarding_step end-to-end field completeness | Gap 6 | Cross-file trace: prompt → extractionTypes → approve handler | Compare prompt fields → extraction-types.ts interface → approve/route.ts insert |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
