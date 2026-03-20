---
phase: 4
slug: job-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (E2E) + Node.js built-in test runner (unit) |
| **Config file** | `playwright.config.ts` (project root) |
| **Quick run command** | `npx playwright test tests/e2e/phase4.spec.ts --grep "SCHED-08"` |
| **Full suite command** | `npx playwright test tests/e2e/phase4.spec.ts` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test tests/e2e/phase4.spec.ts --grep "SCHED-08"`
- **After every plan wave:** Run `npx playwright test tests/e2e/phase4.spec.ts`
- **Before `/gsd:verify-work`:** Full suite (phase2 + phase3 + phase4) must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | SCHED-01–08 | E2E stub | `npx playwright test tests/e2e/phase4.spec.ts` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 1 | SCHED-01–07 | E2E smoke | `npx playwright test tests/e2e/phase4.spec.ts --grep "SCHED-01"` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 1 | SCHED-01 | E2E smoke | `npx playwright test tests/e2e/phase4.spec.ts --grep "worker"` | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 | 2 | SCHED-01–07 | E2E smoke | `npx playwright test tests/e2e/phase4.spec.ts --grep "SCHED"` | ❌ W0 | ⬜ pending |
| 4-04-01 | 04 | 3 | SCHED-08 | E2E UI | `npx playwright test tests/e2e/phase4.spec.ts --grep "SCHED-08"` | ❌ W0 | ⬜ pending |
| 4-05-01 | 05 | 4 | SCHED-01–08 | E2E full | `npx playwright test tests/e2e/phase4.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/e2e/phase4.spec.ts` — stubs for SCHED-01 through SCHED-08 (all RED)
- [ ] `bigpanda-app/worker/` directory with stub index.ts
- [ ] `bigpanda-app/db/migrations/0003_add_job_runs.sql` — job_runs table migration

*Existing infrastructure: `playwright.config.ts`, `tests/e2e/` directory, Playwright/Chromium all present from Phase 2.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Worker starts alongside Next.js via concurrently | SCHED-01 | Requires process inspection, not browser-testable | Run `npm run dev` from `bigpanda-app/`, verify two processes in terminal output |
| BullMQ advisory lock prevents overlap | SCHED-05 | Requires two concurrent job triggers | Trigger same job twice rapidly; second should log "skipped: advisory lock held" |
| Schedule change takes effect without restart | SCHED-04 | Requires timing/polling observation | Change a cron schedule in Settings, wait 60s, verify job_runs shows updated next_run |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
