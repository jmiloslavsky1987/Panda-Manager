---
phase: 11
slug: health-score-wire
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.1 (unit) + Playwright (E2E) |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `cd bigpanda-app && npx vitest run app/api/__tests__/` |
| **Full suite command** | `npx playwright test tests/e2e/phase3.spec.ts --grep "PLAN-09"` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd bigpanda-app && npx tsc --noEmit`
- **After every plan wave:** Run `cd bigpanda-app && npx vitest run app/api/__tests__/` + `npx playwright test tests/e2e/phase3.spec.ts --grep "PLAN-09"`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 0 | PLAN-09 | unit | `cd bigpanda-app && npx vitest run app/api/__tests__/health.test.ts` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | PLAN-09 | type-check | `cd bigpanda-app && npx tsc --noEmit` | ✅ | ⬜ pending |
| 11-01-03 | 01 | 1 | PLAN-09 | type-check | `cd bigpanda-app && npx tsc --noEmit` | ✅ | ⬜ pending |
| 11-01-04 | 01 | 1 | PLAN-09 | type-check | `cd bigpanda-app && npx tsc --noEmit` | ✅ | ⬜ pending |
| 11-01-05 | 01 | 1 | PLAN-09 | unit | `cd bigpanda-app && npx vitest run app/api/__tests__/health.test.ts` | ❌ W0 | ⬜ pending |
| 11-01-06 | 01 | 1 | PLAN-09 | E2E | `npx playwright test tests/e2e/phase3.spec.ts --grep "PLAN-09"` | ✅ (stub) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/app/api/__tests__/health.test.ts` — unit stubs for PLAN-09: `computeHealth()` return shape (stalledWorkstreams present, typed as number); mock DB following `ai-plan.test.ts` pattern

*No new framework install needed — vitest and playwright already installed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard health card reflects task progress within 1 reload | PLAN-09 | Requires seeded DB with real workstream + task data | 1. Open app with a seeded project. 2. Set all tasks in a workstream to incomplete. 3. Reload. 4. Confirm health card shows stalled workstream count > 0. 5. Complete all tasks. 6. Reload. 7. Confirm count drops to 0. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
