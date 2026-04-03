---
phase: 34
slug: overview-tab-metrics-health-dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.1 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- tests/overview/ -x` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- tests/overview/ -x`
- **After every plan wave:** Run `npm test -- tests/overview/ tests/api/overview-metrics.test.ts`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 34-xx-01 | TBD | 0 | METR-01 | unit | `npm test -- tests/overview/metrics-health.test.ts::METR-01 -x` | ❌ W0 | ⬜ pending |
| 34-xx-02 | TBD | 0 | METR-01 | unit | `npm test -- tests/api/overview-metrics.test.ts::aggregation -x` | ❌ W0 | ⬜ pending |
| 34-xx-03 | TBD | 0 | HLTH-01 | integration | `npm test -- tests/overview/metrics-health.test.ts::HLTH-01 -x` | ❌ W0 | ⬜ pending |
| 34-xx-04 | TBD | 0 | HLTH-01 | unit | `npm test -- tests/overview/metrics-health.test.ts::health-formula -x` | ❌ W0 | ⬜ pending |
| 34-xx-05 | TBD | 0 | TMLN-01 | integration | `npm test -- tests/overview/metrics-health.test.ts::TMLN-01 -x` | ❌ W0 | ⬜ pending |
| 34-xx-06 | TBD | 0 | TMLN-01 | smoke | `npm test -- tests/overview/timeline-replacement.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/overview/metrics-health.test.ts` — stubs for METR-01, HLTH-01, TMLN-01 (integration tests)
- [ ] `tests/api/overview-metrics.test.ts` — API aggregation logic unit tests for METR-01
- [ ] `tests/overview/timeline-replacement.test.ts` — smoke test verifying old timeline section removed (TMLN-01)
- [ ] `tests/__mocks__/recharts.ts` — mock Recharts components for Vitest (node env lacks ResizeObserver)
- [ ] `npm install recharts react-is` — Recharts not currently installed; required before any component work

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Charts render with responsive design across viewport sizes | METR-01, TMLN-01 | CSS/visual layout cannot be reliably tested in jsdom | Resize browser window; verify charts reflow and don't overflow containers |
| Overall RAG badge color matches visual expectation | HLTH-01 | Color perception and visual hierarchy are subjective | Check red/yellow/green badge against design spec; verify contrast ratio |
| Milestone timeline appears near top of Overview tab (layout position) | TMLN-01 | DOM order alone doesn't confirm visual position with CSS flex/grid | Scroll to Overview tab; confirm timeline renders above metrics section |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
