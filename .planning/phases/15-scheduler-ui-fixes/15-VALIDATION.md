---
phase: 15
slug: scheduler-ui-fixes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `cd bigpanda-app && npx vitest run tests/skill-run-settings.test.ts` |
| **Full suite command** | `cd bigpanda-app && npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd bigpanda-app && npx vitest run tests/skill-run-settings.test.ts`
- **After every plan wave:** Run `cd bigpanda-app && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 0 | SCHED-01 | unit | `cd bigpanda-app && npx vitest run tests/scheduler-map.test.ts` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 0 | SRCH-02 | unit | `cd bigpanda-app && npx vitest run tests/search-type-options.test.ts` | ❌ W0 | ⬜ pending |
| 15-01-03 | 01 | 1 | SCHED-01 | unit | `cd bigpanda-app && npx vitest run tests/scheduler-map.test.ts` | ❌ W0 | ⬜ pending |
| 15-01-04 | 01 | 1 | SKILL-14, SET-02 | unit | `cd bigpanda-app && npx vitest run tests/skill-run-settings.test.ts` | ✅ | ⬜ pending |
| 15-01-05 | 01 | 1 | SKILL-14, SET-02 | unit | `cd bigpanda-app && npx vitest run tests/skill-run-settings.test.ts` | ✅ | ⬜ pending |
| 15-01-06 | 01 | 1 | SKILL-14, SET-02 | unit | `cd bigpanda-app && npx vitest run tests/skill-run-settings.test.ts` | ✅ | ⬜ pending |
| 15-01-07 | 01 | 1 | SRCH-02, SRCH-03 | unit | `cd bigpanda-app && npx vitest run tests/search-type-options.test.ts` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 2 | All | integration | `cd bigpanda-app && npx vitest run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/tests/scheduler-map.test.ts` — verifies `JOB_SCHEDULE_MAP` keys contain `morning-briefing` and `weekly-customer-status`; verifies phantom `action-sync` and `weekly-briefing` are absent; covers SCHED-01
- [ ] `bigpanda-app/tests/search-type-options.test.ts` — verifies TYPE_OPTIONS values include all 12 FTS table names (`onboarding_steps`, `onboarding_phases`, `integrations`, `time_entries` plus existing 8); covers SRCH-02

*No framework install needed — Vitest already installed and configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Scheduled jobs fire on cron schedule at configured times | SCHED-01, SKILL-03, SKILL-11 | Cron scheduling requires wall-clock time — unit tests verify registration, not actual firing | After deployment, check BullMQ dashboard or logs to confirm `morning-briefing` and `weekly-customer-status` appear as scheduled jobs with correct cron expressions |
| Phantom scheduler IDs removed from Redis | SCHED-01 | Redis state cannot be unit-tested without live Redis | After deploying scheduler changes, verify `action-sync` and `weekly-briefing` no longer appear in BullMQ repeatable jobs list |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
