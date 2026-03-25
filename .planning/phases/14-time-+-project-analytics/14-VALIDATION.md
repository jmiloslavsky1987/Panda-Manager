---
phase: 14
slug: time-project-analytics
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (`@playwright/test`, existing) |
| **Config file** | `playwright.config.ts` (project root) |
| **Quick run command** | `npx playwright test tests/e2e/phase14.spec.ts` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~30 seconds (quick), ~2 minutes (full) |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test tests/e2e/phase14.spec.ts`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-W0 | 01 | 0 | SC-1,SC-4 | E2E stub | `npx playwright test tests/e2e/phase14.spec.ts` | ❌ W0 | ⬜ pending |
| 14-01-migration | 01 | 1 | SC-4 (weekly_hour_target) | E2E structural | `npx playwright test tests/e2e/phase14.spec.ts --grep "capacity"` | ❌ W0 | ⬜ pending |
| 14-01-queries | 01 | 1 | SC-1 | E2E structural | `npx playwright test tests/e2e/phase14.spec.ts --grep "weekly summary"` | ❌ W0 | ⬜ pending |
| 14-01-ui | 01 | 1 | SC-1,SC-4 | E2E structural | `npx playwright test tests/e2e/phase14.spec.ts --grep "weekly summary\|capacity"` | ❌ W0 | ⬜ pending |
| 14-02-W0 | 02 | 0 | SC-2,SC-3 | E2E stub | `npx playwright test tests/e2e/phase14.spec.ts` | ❌ W0 | ⬜ pending |
| 14-02-velocity | 02 | 2 | SC-2 | E2E structural | `npx playwright test tests/e2e/phase14.spec.ts --grep "velocity"` | ❌ W0 | ⬜ pending |
| 14-02-risk-trend | 02 | 2 | SC-3 | E2E structural | `npx playwright test tests/e2e/phase14.spec.ts --grep "risk-trend"` | ❌ W0 | ⬜ pending |
| 14-03-e2e | 03 | 3 | SC-1,SC-2,SC-3,SC-4 | E2E full | `npx playwright test tests/e2e/phase14.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/e2e/phase14.spec.ts` — 6 E2E stubs covering all 4 success criteria:
  - `[data-testid="weekly-summary"]` + 8 rows max (SC-1)
  - `[data-testid="total-hours"]` visible (SC-1)
  - `[data-testid="velocity-chart"]` with 4 bars (SC-2)
  - `[data-testid="action-trend"]` shows ↑/↓/→ (SC-2)
  - `[data-testid="risk-trend"]` visible (SC-3)
  - `[data-testid="weekly-target"]` editable field (SC-4)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Trend arrow logic (up/flat/down) produces correct classification | SC-2 | Logic thresholds (e.g., ±10% = flat) are UX judgments | Seed 4 weeks of actions with known counts; verify arrow direction matches expectation |
| Over/under capacity coloring | SC-4 | CSS color coding is a visual judgment | Log hours above and below weekly target; verify cell background changes to red/green |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
