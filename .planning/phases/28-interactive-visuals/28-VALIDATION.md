---
phase: 28
slug: interactive-visuals
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.1 |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green + manual hydration verification (`next build && next start`)
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 28-W0-mock | Wave 0 | 0 | VIS-01, VIS-02 | setup | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 28-W0-engagement | Wave 0 | 0 | VIS-01 | smoke | `npm test tests/visuals/engagement-graph.test.ts --run` | ❌ W0 | ⬜ pending |
| 28-W0-drawer | Wave 0 | 0 | VIS-01 | unit | `npm test tests/visuals/node-detail-drawer.test.ts --run` | ❌ W0 | ⬜ pending |
| 28-W0-arch | Wave 0 | 0 | VIS-02 | smoke | `npm test tests/visuals/arch-graph.test.ts --run` | ❌ W0 | ⬜ pending |
| 28-W0-dagre | Wave 0 | 0 | VIS-02 | unit | `npm test tests/visuals/dagre-layout.test.ts --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/__mocks__/react-flow.ts` — Mock for @xyflow/react (ResizeObserver, DOM APIs); required by all visual tests
- [ ] `tests/visuals/engagement-graph.test.ts` — stubs for VIS-01 (Teams graph render + click)
- [ ] `tests/visuals/node-detail-drawer.test.ts` — stubs for VIS-01 (drawer content)
- [ ] `tests/visuals/arch-graph.test.ts` — stubs for VIS-02 (Architecture graph render)
- [ ] `tests/visuals/dagre-layout.test.ts` — stubs for VIS-02 (layout calculation)
- [ ] Framework install: Already present (Vitest 4.1.1)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No hydration errors in production build | VIS-01, VIS-02 | Hydration errors are runtime browser-only; Next.js dev mode does not surface all hydration errors; requires production build cycle | Run `next build && next start`; open Teams tab and Architecture tab in browser; check browser console for hydration warnings ("Hydration failed", "Expected server HTML"); pass = zero hydration warnings |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
