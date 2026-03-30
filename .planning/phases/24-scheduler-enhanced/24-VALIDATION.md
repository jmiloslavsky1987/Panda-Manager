---
phase: 24
slug: scheduler-enhanced
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.1 |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/scheduler/ --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/scheduler/ --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 0 | SCHED-01 | unit | `npx vitest run tests/scheduler/jobs-crud.test.ts -t "POST /api/jobs"` | ❌ W0 | ⬜ pending |
| 24-01-02 | 01 | 0 | SCHED-02 | unit | `npx vitest run tests/scheduler/frequency-to-cron.test.ts` | ❌ W0 | ⬜ pending |
| 24-01-03 | 01 | 0 | SCHED-03 | unit | `npx vitest run tests/scheduler/jobs-crud.test.ts -t "timezone"` | ❌ W0 | ⬜ pending |
| 24-01-04 | 01 | 0 | SCHED-04 | unit | `npx vitest run tests/scheduler/jobs-crud.test.ts -t "skill_params"` | ❌ W0 | ⬜ pending |
| 24-01-05 | 01 | 0 | SCHED-05 | unit | `npx vitest run tests/scheduler/jobs-crud.test.ts -t "enabled"` | ❌ W0 | ⬜ pending |
| 24-01-06 | 01 | 0 | SCHED-06 | unit | `npx vitest run tests/scheduler/trigger.test.ts` | ❌ W0 | ⬜ pending |
| 24-01-07 | 01 | 0 | SCHED-07 | unit | `npx vitest run tests/scheduler/jobs-crud.test.ts -t "last_run"` | ❌ W0 | ⬜ pending |
| 24-01-08 | 01 | 0 | SCHED-08 | unit | `npx vitest run tests/scheduler/notifications.test.ts` | ❌ W0 | ⬜ pending |
| 24-01-09 | 01 | 0 | SCHED-09 | unit | `npx vitest run tests/scheduler/run-history.test.ts` | ❌ W0 | ⬜ pending |
| 24-01-10 | 01 | 0 | SCHED-10 | unit | `npx vitest run tests/scheduler/sidebar.test.ts` | ❌ W0 | ⬜ pending |
| 24-01-11 | 01 | 0 | SCHED-11 | unit | `npx vitest run tests/scheduler/wizard-step.test.ts` | ❌ W0 | ⬜ pending |
| 24-01-12 | 01 | 0 | SCHED-12 | unit | `npx vitest run tests/scheduler/skill-list.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/tests/scheduler/jobs-crud.test.ts` — stubs for SCHED-01, SCHED-03, SCHED-04, SCHED-05, SCHED-07
- [ ] `bigpanda-app/tests/scheduler/frequency-to-cron.test.ts` — stubs for SCHED-02
- [ ] `bigpanda-app/tests/scheduler/trigger.test.ts` — stubs for SCHED-06
- [ ] `bigpanda-app/tests/scheduler/notifications.test.ts` — stubs for SCHED-08
- [ ] `bigpanda-app/tests/scheduler/run-history.test.ts` — stubs for SCHED-09
- [ ] `bigpanda-app/tests/scheduler/sidebar.test.ts` — stubs for SCHED-10
- [ ] `bigpanda-app/tests/scheduler/wizard-step.test.ts` — stubs for SCHED-11
- [ ] `bigpanda-app/tests/scheduler/skill-list.test.ts` — stubs for SCHED-12

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Create Job wizard renders 3-step UI with stepper header | SCHED-11 | Full wizard render requires browser DOM + Dialog | Open /scheduler, click "+ Create Job", verify stepper shows Step 1 (Skill) → Step 2 (Schedule) → Step 3 (Params) |
| Scheduler page shows inline-expand row with run history | SCHED-09 | Row expansion interaction requires browser | Click any job row; verify run history panel expands inline with last 10 entries |
| Manual trigger fires job immediately | SCHED-06 | Requires live BullMQ + worker | Click Trigger on any job; verify toast appears and job appears in run history |
| Disabled job stops running; re-enable resumes | SCHED-05 | Requires live scheduler + time elapsed | Toggle enable off; wait for next scheduled time; confirm no new run history entry |
| Failure notification badge appears on sidebar | SCHED-08 | Requires live worker failure + RSC re-render | Force a job to fail; reload page; verify badge appears on Scheduler sidebar link |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
