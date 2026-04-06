---
phase: 38
slug: gantt-overhaul
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 38 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (vitest.config.ts) |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `cd bigpanda-app && npx vitest run tests/api/tasks-patch-dates.test.ts` |
| **Full suite command** | `cd bigpanda-app && npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd bigpanda-app && npx tsc --noEmit`
- **After every plan wave:** Run `cd bigpanda-app && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + manual browser verification of all GNTT requirements
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 38-01-01 | 01 | 1 | GNTT-02, GNTT-03, GNTT-04 | compile | `cd bigpanda-app && npx tsc --noEmit` | ✅ | ⬜ pending |
| 38-01-02 | 01 | 1 | GNTT-01, GNTT-03 | compile | `cd bigpanda-app && npx tsc --noEmit` | ✅ | ⬜ pending |
| 38-02-01 | 02 | 2 | GNTT-02, GNTT-03, GNTT-04, PLAN-03 | compile + unit | `cd bigpanda-app && npx tsc --noEmit && npx vitest run tests/api/tasks-patch-dates.test.ts` | ❌ W0 | ⬜ pending |
| 38-03-01 | 03 | 3 | GNTT-01 | compile | `cd bigpanda-app && npx tsc --noEmit` | ✅ | ⬜ pending |
| 38-03-02 | 03 | 3 | GNTT-01, GNTT-02, GNTT-03, GNTT-04 | manual | N/A — human verify checkpoint | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/tests/api/tasks-patch-dates.test.ts` — unit test covering GNTT-04: verifies PATCH `/api/tasks/:id` correctly persists `start_date` and `due` fields (follow pattern from `tests/api/actions-patch.test.ts`)

*All other phase behaviors (GNTT-01, GNTT-02, GNTT-03, PLAN-03) require browser environment and cannot be unit-tested with the current `environment: 'node'` vitest config. frappe-gantt accesses `document`, `SVGElement`, and `requestAnimationFrame` at runtime. Manual verification via the human-verify checkpoint in Plan 38-03 Task 2 covers these requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Milestone markers rendered as dashed vertical lines | GNTT-01 | frappe-gantt accesses SVG DOM — requires browser | Open Gantt page; verify dashed lines with milestone name labels appear at correct dates |
| View mode toggle changes time scale | GNTT-02 | Requires browser rendering of frappe-gantt SVG | Click Day/Week/Month/Quarter Year buttons; verify chart re-renders at correct scale |
| Tasks grouped under milestone swim lanes | GNTT-03 | Requires browser rendering of accordion UI | Verify accordion rows with milestone headers; expand/collapse; confirm tasks appear in correct lanes |
| Drag-to-reschedule saves immediately | GNTT-04 | Drag interaction requires browser | Drag a task bar; verify DB persists new dates without separate save action |
| Tasks colour-coded by milestone | PLAN-03 | Visual CSS verification requires browser | Verify each milestone lane has a distinct colour applied via `gantt-milestone-N` CSS class |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
