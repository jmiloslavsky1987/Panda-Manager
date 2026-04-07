---
phase: 41
slug: ux-polish-consistency
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-06
---

# Phase 41 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 1.x + @testing-library/react 16.3.2 |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `npm test -- tests/ui/` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test tests/ui/empty-states.test.tsx tests/ui/overdue-highlighting.test.tsx tests/ui/loading-skeletons.test.tsx -x`
- **After every plan wave:** Run `npm test` (full suite)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 41-01-01 | 01 | 0 | UXPOL-01 | unit | `npm test tests/ui/empty-states.test.tsx -t "Actions empty"` | ❌ W0 | ⬜ pending |
| 41-01-02 | 01 | 0 | UXPOL-01 | unit | `npm test tests/ui/empty-states.test.tsx -t "Artifacts empty"` | ❌ W0 | ⬜ pending |
| 41-01-03 | 01 | 0 | UXPOL-01 | unit | `npm test tests/ui/empty-states.test.tsx -t "History empty"` | ❌ W0 | ⬜ pending |
| 41-02-01 | 02 | 0 | UXPOL-02 | unit | `npm test tests/ui/overdue-highlighting.test.tsx -t "Actions overdue"` | ❌ W0 | ⬜ pending |
| 41-02-02 | 02 | 0 | UXPOL-02 | unit | `npm test tests/ui/overdue-highlighting.test.tsx -t "Milestones overdue"` | ❌ W0 | ⬜ pending |
| 41-02-03 | 02 | 1 | UXPOL-02 | unit | `npm test tests/plan/task-board.test.tsx -t "overdue"` | ✅ Phase 39 | ⬜ pending |
| 41-03-01 | 03 | 0 | UXPOL-03 | unit | `npm test tests/ui/loading-skeletons.test.tsx -t "OverviewMetrics"` | ❌ W0 | ⬜ pending |
| 41-03-02 | 03 | 0 | UXPOL-03 | unit | `npm test tests/ui/loading-skeletons.test.tsx -t "HealthDashboard"` | ❌ W0 | ⬜ pending |
| 41-03-03 | 03 | 0 | UXPOL-03 | unit | `npm test tests/ui/loading-skeletons.test.tsx -t "SkillsTabClient"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/tests/ui/empty-states.test.tsx` — stubs for UXPOL-01 (9 tabs: Actions, Risks, Milestones, Decisions, Stakeholders, Teams, Architecture, Artifacts, History)
- [ ] `bigpanda-app/tests/ui/overdue-highlighting.test.tsx` — stubs for UXPOL-02 (Actions, Milestones)
- [ ] `bigpanda-app/tests/ui/loading-skeletons.test.tsx` — stubs for UXPOL-03 (OverviewMetrics, HealthDashboard, SkillsTabClient)
- [ ] `bigpanda-app/components/EmptyState.tsx` — shared component (required before all tab implementations)

*Existing infrastructure (vitest + @testing-library/react) covers all other phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Artifacts empty state "Upload a document" button navigates to Context Hub tab | UXPOL-01 | Tab navigation requires full browser context, not supported in jsdom | 1. Open project with no artifacts. 2. Go to project detail > Overview tab. 3. Confirm Artifacts section shows empty state with "Upload a document" button. 4. Click button. 5. Confirm Context Hub tab becomes active. |
| Overdue row red border is visually distinct and readable | UXPOL-02 | Visual fidelity not verifiable in jsdom | 1. Create an action with due_date = yesterday, status = open. 2. Open Actions tab. 3. Confirm row has red background and red border. 4. Confirm row text is still readable. |
| Milestones overdue badge (dark red) contrasts with row background (light red) | UXPOL-02 | Color contrast requires visual inspection | 1. Create overdue milestone. 2. Open Milestones tab. 3. Confirm both badge and row highlight are visible without color clash. |
| Skeleton layout matches approximate final content height | UXPOL-03 | Layout shift perception is subjective | 1. Throttle network in DevTools. 2. Navigate to Overview tab. 3. Confirm skeleton shows 3-card grid before data loads. 4. Confirm no significant layout shift when data renders. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-06
