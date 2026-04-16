---
phase: 68
slug: gantt-bi-directional-sync
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 68 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (node environment) |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `cd bigpanda-app && npx vitest run tests/api/milestones-patch.test.ts tests/api/tasks-patch-dates.test.ts` |
| **Full suite command** | `cd bigpanda-app && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd bigpanda-app && npx vitest run tests/api/milestones-patch.test.ts tests/api/tasks-patch-dates.test.ts`
- **After every plan wave:** Run `cd bigpanda-app && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 68-W0-01 | Wave 0 | 0 | DLVRY-03 | unit | `cd bigpanda-app && npx vitest run tests/api/milestones-patch.test.ts` | Yes (extend) | ⬜ pending |
| 68-W0-02 | Wave 0 | 0 | DLVRY-01 | unit | `cd bigpanda-app && npx vitest run tests/components/GanttChart-wbs-rows.test.ts` | ❌ W0 | ⬜ pending |
| 68-W0-03 | Wave 0 | 0 | DLVRY-02 | unit | `cd bigpanda-app && npx vitest run tests/components/GanttChart-edge-drag.test.ts` | ❌ W0 | ⬜ pending |
| 68-W0-04 | Wave 0 | 0 | DLVRY-04 | unit | `cd bigpanda-app && npx vitest run tests/components/MilestonesTableClient-date-field.test.ts` | ❌ W0 | ⬜ pending |
| 68-01-01 | 01 | 1 | DLVRY-01 | unit | `cd bigpanda-app && npx vitest run tests/components/GanttChart-wbs-rows.test.ts` | ❌ W0 | ⬜ pending |
| 68-02-01 | 02 | 1 | DLVRY-02 | unit | `cd bigpanda-app && npx vitest run tests/components/GanttChart-edge-drag.test.ts` | ❌ W0 | ⬜ pending |
| 68-02-02 | 02 | 1 | DLVRY-02 | unit | `cd bigpanda-app && npx vitest run tests/components/GanttChart-edge-drag.test.ts` | ❌ W0 | ⬜ pending |
| 68-02-03 | 02 | 1 | DLVRY-02 | unit | `cd bigpanda-app && npx vitest run tests/components/GanttChart-inline-dates.test.ts` | ❌ W0 | ⬜ pending |
| 68-03-01 | 03 | 2 | DLVRY-03 | unit | `cd bigpanda-app && npx vitest run tests/api/milestones-patch.test.ts` | Yes (extend) | ⬜ pending |
| 68-03-02 | 03 | 2 | DLVRY-03 | unit | `cd bigpanda-app && npx vitest run tests/api/tasks-patch-dates.test.ts` | Yes (exists) | ⬜ pending |
| 68-04-01 | 04 | 2 | DLVRY-04 | unit | `cd bigpanda-app && npx vitest run tests/components/MilestonesTableClient-date-field.test.ts` | ❌ W0 | ⬜ pending |
| 68-04-02 | 04 | 2 | DLVRY-04 | smoke | Manual browser verification | N/A — manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/api/milestones-patch.test.ts` — extend with RED test for `date` field acceptance (file exists, add new `it` block)
- [ ] `tests/components/GanttChart-wbs-rows.test.ts` — stubs for DLVRY-01 WBS row model logic
- [ ] `tests/components/GanttChart-edge-drag.test.ts` — stubs for DLVRY-02 edge drag delta math (left/right handle)
- [ ] `tests/components/GanttChart-inline-dates.test.ts` — stubs for DLVRY-02 inline date cell PATCH
- [ ] `tests/components/MilestonesTableClient-date-field.test.ts` — stubs for DLVRY-04 field alignment fix

*Note: GanttChart component tests run in Vitest node environment — focus on pure computation functions (barLeft, barWidth, drag delta math), not DOM rendering.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| WBS level-1 items appear as Gantt rows on page load with structural skeleton | DLVRY-01 | SVG rendering requires real browser; JSDOM can't fully simulate SVG layout | Navigate to Gantt tab; verify each WBS phase name appears as a row header |
| Empty WBS rows show greyed placeholder bar (no tasks) | DLVRY-01 | Visual rendering of placeholder bar requires browser | Create WBS item with no tasks; verify greyed bar appears at default position |
| Drag a task bar left edge — only start date changes | DLVRY-02 | Mouse drag interaction requires browser | Drag left edge of a task bar; verify start date changes but end date stays |
| Drag a task bar right edge — only end date changes | DLVRY-02 | Mouse drag interaction requires browser | Drag right edge of a task bar; verify end date changes but start date stays |
| Drag a milestone vertical line — marker repositions | DLVRY-02 | Mouse drag interaction requires browser | Drag a milestone dashed line; verify marker moves and date updates |
| WBS summary bar edge drag shifts all child tasks | DLVRY-02 | Multi-PATCH interaction requires browser | Drag WBS summary row edge; verify all child task dates shift by same delta |
| Date change in Milestones tab propagates to Gantt | DLVRY-04 | Requires real navigation between tabs and server re-fetch | Edit milestone date in Milestones tab; navigate to Gantt; verify marker moved |
| Date change in Task Board propagates to Gantt | DLVRY-04 | Requires real navigation between tabs and server re-fetch | Edit task dates in Task Board modal; navigate to Gantt; verify bars moved |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
