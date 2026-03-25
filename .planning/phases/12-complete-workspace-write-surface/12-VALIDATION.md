---
phase: 12
slug: complete-workspace-write-surface
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (already installed) |
| **Config file** | `playwright.config.ts` (project root) |
| **Quick run command** | `npx playwright test tests/e2e/phase12.spec.ts --reporter=line` |
| **Full suite command** | `npx playwright test tests/e2e/phase12.spec.ts` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test tests/e2e/phase12.spec.ts --reporter=line`
- **After every plan wave:** Run `npx playwright test tests/e2e/phase12.spec.ts`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 0 | artifacts-tab | smoke | `npx playwright test tests/e2e/phase12.spec.ts --grep "artifacts-tab"` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 0 | ArtifactEditModal | smoke | `npx playwright test tests/e2e/phase12.spec.ts --grep "ArtifactEditModal"` | ❌ W0 | ⬜ pending |
| 12-01-03 | 01 | 0 | artifact-create | integration | `npx playwright test tests/e2e/phase12.spec.ts --grep "artifact-create"` | ❌ W0 | ⬜ pending |
| 12-01-04 | 01 | 0 | artifact-edit | smoke | `npx playwright test tests/e2e/phase12.spec.ts --grep "artifact-edit"` | ❌ W0 | ⬜ pending |
| 12-01-05 | 01 | 0 | add-decision | smoke | `npx playwright test tests/e2e/phase12.spec.ts --grep "add-decision"` | ❌ W0 | ⬜ pending |
| 12-01-06 | 01 | 0 | decision-save | integration | `npx playwright test tests/e2e/phase12.spec.ts --grep "decision-save"` | ❌ W0 | ⬜ pending |
| 12-01-07 | 01 | 0 | architecture-edit | smoke | `npx playwright test tests/e2e/phase12.spec.ts --grep "architecture-edit"` | ❌ W0 | ⬜ pending |
| 12-01-08 | 01 | 0 | architecture-save | integration | `npx playwright test tests/e2e/phase12.spec.ts --grep "architecture-save"` | ❌ W0 | ⬜ pending |
| 12-01-09 | 01 | 0 | teams-progress | smoke | `npx playwright test tests/e2e/phase12.spec.ts --grep "teams-progress"` | ❌ W0 | ⬜ pending |
| 12-01-10 | 01 | 0 | teams-save | integration | `npx playwright test tests/e2e/phase12.spec.ts --grep "teams-save"` | ❌ W0 | ⬜ pending |
| 12-01-11 | 01 | 0 | banner-removed | smoke | `npx playwright test tests/e2e/phase12.spec.ts --grep "banner-removed"` | ❌ W0 | ⬜ pending |
| 12-01-12 | 01 | 0 | artifacts-tab-nav | smoke | `npx playwright test tests/e2e/phase12.spec.ts --grep "artifacts-tab-nav"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/e2e/phase12.spec.ts` — all 12 stubs above (RED baseline, file does not exist yet)

*All stubs follow the `expect(false, 'stub').toBe(true)` first-line pattern established in Phase 2 — 02-01 decision.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Health score recalculates after Teams slider save | SC-4 | Requires visual inspection of health score badge update | 1. Open Teams tab, adjust percent_complete slider, save. 2. Confirm health score badge in header updates without page refresh. |
| Optimistic "Saving…" indicator appears during save | UX decision | No reliable Playwright timing hook for transient state | 1. Throttle network in DevTools. 2. Trigger any save (artifact/decision/architecture/teams). 3. Confirm "Saving…" text visible during in-flight request. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
