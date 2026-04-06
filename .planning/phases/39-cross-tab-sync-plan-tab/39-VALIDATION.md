---
phase: 39
slug: cross-tab-sync-plan-tab
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 39 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.1 with @testing-library/react 16.3.2 |
| **Config file** | vitest.config.ts (jsdom environment for UI tests) |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run --reporter=verbose` |
| **Estimated runtime** | ~5-10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 39-01-01 | 01 | 0 | SYNC-01 | unit | `npm test -- tests/sync/metrics-invalidate.test.tsx --run` | ❌ W0 | ⬜ pending |
| 39-01-02 | 01 | 0 | SYNC-02 | unit | `npm test -- tests/sync/chart-drill-down.test.tsx --run` | ❌ W0 | ⬜ pending |
| 39-01-03 | 01 | 0 | SYNC-03 | unit | `npm test -- tests/sync/active-blockers.test.tsx --run` | ❌ W0 | ⬜ pending |
| 39-01-04 | 01 | 0 | PLAN-01 | unit | `npm test -- tests/plan/overdue-visual.test.tsx --run` | ❌ W0 | ⬜ pending |
| 39-01-05 | 01 | 0 | PLAN-02 | unit | `npm test -- tests/plan/bulk-status.test.tsx --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/sync/metrics-invalidate.test.tsx` — stubs for SYNC-01 (custom event dispatch + listener)
- [ ] `tests/sync/chart-drill-down.test.tsx` — stubs for SYNC-02 (Recharts onClick + router.push)
- [ ] `tests/sync/active-blockers.test.tsx` — stubs for SYNC-03 (blocked tasks query + link rendering)
- [ ] `tests/plan/overdue-visual.test.tsx` — stubs for PLAN-01 (date comparison + conditional className)
- [ ] `tests/plan/bulk-status.test.tsx` — stubs for PLAN-02 (BulkToolbar status mode + PhaseBulkToolbar)

*Shared setup: `tests/setup-jest-dom.ts` — already exists*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Recharts pie segment cursor changes to pointer on hover | SYNC-02 | CSS cursor style not detectable in jsdom | Open Overview tab, hover over risk distribution chart segments — cursor should change to pointer |
| Metrics update visually in-place (no loading spinner) | SYNC-01 | Visual animation behavior | Edit a Risk/Action/Milestone, save — verify Overview metrics change without loading indicator |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
