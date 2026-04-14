---
phase: 44
slug: navigation-parity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 44 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.1 |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `cd bigpanda-app && npx vitest run app/api/__tests__/` |
| **Full suite command** | `cd bigpanda-app && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd bigpanda-app && npx vitest run`
- **After every plan wave:** Run `cd bigpanda-app && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + manual browser smoke-test for all 5 NAV requirements
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 44-W0-01 | W0 | 0 | RISK-02 | unit | `cd bigpanda-app && npx vitest run app/api/__tests__/risks-bulk-update.test.ts` | ❌ W0 | ⬜ pending |
| 44-W0-02 | W0 | 0 | MILE-02 | unit | `cd bigpanda-app && npx vitest run app/api/__tests__/milestones-bulk-update.test.ts` | ❌ W0 | ⬜ pending |
| 44-NAV-01 | nav | 1 | NAV-01 | manual | Manual browser check | N/A | ⬜ pending |
| 44-NAV-02 | nav | 1 | NAV-02 | manual | Manual browser check | N/A | ⬜ pending |
| 44-NAV-03 | nav | 1 | NAV-03 | manual | Manual browser check | N/A | ⬜ pending |
| 44-NAV-04 | nav | 1 | NAV-04 | manual | Manual browser check | N/A | ⬜ pending |
| 44-NAV-05 | nav | 1 | NAV-05 | manual | Manual browser check | N/A | ⬜ pending |
| 44-RISK-01 | parity | 2 | RISK-01 | unit | `cd bigpanda-app && npx vitest run app/api/__tests__/` | ✅ W0 | ⬜ pending |
| 44-RISK-02 | parity | 2 | RISK-02 | unit | `cd bigpanda-app && npx vitest run app/api/__tests__/risks-bulk-update.test.ts` | ✅ W0 | ⬜ pending |
| 44-MILE-01 | parity | 2 | MILE-01 | unit | `cd bigpanda-app && npx vitest run app/api/__tests__/` | ✅ W0 | ⬜ pending |
| 44-MILE-02 | parity | 2 | MILE-02 | unit | `cd bigpanda-app && npx vitest run app/api/__tests__/milestones-bulk-update.test.ts` | ✅ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/app/api/__tests__/risks-bulk-update.test.ts` — stubs for RISK-02
- [ ] `bigpanda-app/app/api/__tests__/milestones-bulk-update.test.ts` — stubs for MILE-02

*Navigation requirements (NAV-01 through NAV-05) are not automatable with the current vitest/node environment — they require browser rendering to verify URL resolution and tab highlighting. These are manual-verify items.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Plan is first sub-tab under Delivery | NAV-01 | Browser rendering required for tab ordering | Navigate to `/customer/[id]/plan`, verify Plan is leftmost Delivery sub-tab |
| WBS, Task Board, Gantt as Delivery sub-tabs | NAV-02 | Browser rendering required for tab presence | Navigate to `/customer/[id]/tasks` and `/customer/[id]/gantt`, verify Delivery tab highlighted |
| Swimlane removed from navigation | NAV-03 | Browser rendering required | Verify no Swimlane sub-tab appears under Delivery |
| Decisions under Delivery tab | NAV-04 | Browser rendering required | Navigate to `/customer/[id]/decisions`, verify Delivery tab highlighted |
| Intel tab absent; Engagement History under Admin | NAV-05 | Browser rendering required | Verify no Intel tab; navigate to `/customer/[id]/history`, verify Admin tab highlighted |
| Old URLs redirect correctly | NAV-01 | Browser navigation required | Visit `/customer/[id]/plan/board`, `/plan/tasks`, `/plan/gantt`, `/plan/swimlane` — verify redirects, no 404s |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
