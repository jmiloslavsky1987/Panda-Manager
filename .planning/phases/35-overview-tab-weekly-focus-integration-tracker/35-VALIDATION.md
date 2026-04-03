---
phase: 35
slug: overview-tab-weekly-focus-integration-tracker
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (vitest@latest) |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `cd bigpanda-app && npx vitest run tests/overview/` |
| **Full suite command** | `cd bigpanda-app && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd bigpanda-app && npx vitest run tests/overview/`
- **After every plan wave:** Run `cd bigpanda-app && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 35-01-01 | 01 | 0 | WKFO-01 | unit | `cd bigpanda-app && npx vitest run tests/overview/weekly-focus.test.ts` | ❌ W0 | ⬜ pending |
| 35-01-02 | 01 | 0 | OINT-01 | unit | `cd bigpanda-app && npx vitest run tests/overview/integration-tracker.test.ts` | ❌ W0 | ⬜ pending |
| 35-01-03 | 01 | 1 | WKFO-01 | unit | `cd bigpanda-app && npx vitest run tests/overview/weekly-focus.test.ts` | ❌ W0 | ⬜ pending |
| 35-02-01 | 02 | 1 | WKFO-01 | unit | `cd bigpanda-app && npx vitest run tests/overview/weekly-focus.test.ts` | ❌ W0 | ⬜ pending |
| 35-02-02 | 02 | 1 | WKFO-02 | unit | `cd bigpanda-app && npx vitest run tests/overview/weekly-focus.test.ts` | ❌ W0 | ⬜ pending |
| 35-03-01 | 03 | 1 | OINT-01 | unit | `cd bigpanda-app && npx vitest run tests/overview/integration-tracker.test.ts` | ❌ W0 | ⬜ pending |
| 35-03-02 | 03 | 1 | OINT-01 | unit | `cd bigpanda-app && npx vitest run tests/overview/integration-tracker.test.ts` | ❌ W0 | ⬜ pending |
| 35-04-01 | 04 | 2 | WKFO-01, WKFO-02, OINT-01 | unit | `cd bigpanda-app && npx vitest run tests/overview/` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/overview/weekly-focus.test.ts` — stubs for WKFO-01, WKFO-02
- [ ] `tests/overview/integration-tracker.test.ts` — stubs for OINT-01
- [ ] Redis mock via `vi.mock('ioredis', ...)` — pattern from `tests/ingestion/extraction-enqueue.test.ts`
- [ ] Recharts mock already present in `vitest.config.ts` — no new mocks needed for ProgressRing

*Existing infrastructure covers test framework; Wave 0 adds test file stubs only.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Weekly focus bullets display correctly in Overview UI | WKFO-01 | Visual rendering validation | Navigate to Overview tab, verify 3-5 bullets appear in Weekly Focus section |
| Circular progress bar renders with correct percentage | WKFO-02 | SVG/visual rendering | Check ProgressRing displays correct completion % tied to ADR+Biggy step counts |
| Integration tracker displays two workstream sections | OINT-01 | Layout/UI structure | Verify ADR and Biggy sections render with proper type groupings |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
