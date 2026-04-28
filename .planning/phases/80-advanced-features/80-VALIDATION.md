---
phase: 80
slug: advanced-features
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-28
---

# Phase 80 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 80-01-01 | 01 | 1 | RECUR-01 | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 80-01-02 | 01 | 1 | RECUR-01 | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 80-02-01 | 02 | 1 | OUT-01 | manual | N/A | N/A | ⬜ pending |
| 80-02-02 | 02 | 1 | OUT-01 | manual | N/A | N/A | ⬜ pending |
| 80-03-01 | 03 | 2 | AVAIL-01 | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 80-03-02 | 03 | 2 | AVAIL-01 | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 80-04-01 | 04 | 2 | SCHED-01 | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 80-04-02 | 04 | 2 | SCHED-01 | unit | `npm run test -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/__tests__/phase80/recurrence.test.ts` — stubs for RECUR-01 (series detection, template save/load)
- [ ] `bigpanda-app/__tests__/phase80/freebusy.test.ts` — stubs for AVAIL-01 (freebusy API call, degradation on 403)
- [ ] `bigpanda-app/__tests__/phase80/auto-prep-job.test.ts` — stubs for SCHED-01 (BullMQ job enqueue, worker execution)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PDF export renders correctly with full brief content | OUT-01 | Browser print dialog is not automatable | Open a prep brief → click Export PDF → verify PDF contains all sections |
| Print CSS hides UI chrome (nav, buttons) | OUT-01 | Requires visual inspection of print preview | Open print preview → confirm only brief content is visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
