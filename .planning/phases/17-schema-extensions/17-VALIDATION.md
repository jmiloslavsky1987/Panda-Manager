---
phase: 17
slug: schema-extensions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (vitest.config.ts present, environment: node) |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `cd bigpanda-app && npx vitest run tests/` |
| **Full suite command** | `cd bigpanda-app && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd bigpanda-app && npx vitest run tests/`
- **After every plan wave:** Run `cd bigpanda-app && npx vitest run` + psql column introspection checks
- **Before `/gsd:verify-work`:** Full suite must be green + all new tables visible in `\dt` + all column checks pass + seed inserts succeed without FK violations
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-T-01 | 01 | 0 | SCHEMA-01–11 | unit | `cd bigpanda-app && npx vitest run tests/schema-v2.test.ts` | ❌ W0 | ⬜ pending |
| 17-T-02 | 01 | 1 | SCHEMA-01 | DB smoke | `psql $DATABASE_URL -c "SELECT * FROM discovery_items LIMIT 1"` | ❌ W0 | ⬜ pending |
| 17-T-03 | 01 | 1 | SCHEMA-02 | DB smoke | `psql $DATABASE_URL -c "SELECT * FROM audit_log LIMIT 1"` | ❌ W0 | ⬜ pending |
| 17-T-04 | 01 | 1 | SCHEMA-03 | DB introspect | `psql $DATABASE_URL -c "\d time_entries"` | ❌ W0 | ⬜ pending |
| 17-T-05 | 01 | 1 | SCHEMA-04 | DB introspect | `psql $DATABASE_URL -c "\d artifacts"` | ❌ W0 | ⬜ pending |
| 17-T-06 | 01 | 1 | SCHEMA-05 | DB introspect | `psql $DATABASE_URL -c "\d scheduled_jobs"` | ❌ W0 | ⬜ pending |
| 17-T-07 | 01 | 1 | SCHEMA-06 | DB smoke | `psql $DATABASE_URL -c "SELECT * FROM business_outcomes LIMIT 1"` | ❌ W0 | ⬜ pending |
| 17-T-08 | 01 | 1 | SCHEMA-07 | DB smoke | `psql $DATABASE_URL -c "SELECT * FROM e2e_workflows LIMIT 1"` | ❌ W0 | ⬜ pending |
| 17-T-09 | 01 | 1 | SCHEMA-08 | DB smoke | `psql $DATABASE_URL -c "SELECT * FROM focus_areas LIMIT 1"` | ❌ W0 | ⬜ pending |
| 17-T-10 | 01 | 1 | SCHEMA-09 | DB smoke | `psql $DATABASE_URL -c "SELECT * FROM architecture_integrations LIMIT 1"` | ❌ W0 | ⬜ pending |
| 17-T-11 | 01 | 1 | SCHEMA-10 | DB smoke | `psql $DATABASE_URL -c "SELECT * FROM before_state LIMIT 1"` | ❌ W0 | ⬜ pending |
| 17-T-12 | 01 | 1 | SCHEMA-11 | DB smoke | `psql $DATABASE_URL -c "SELECT * FROM team_onboarding_status LIMIT 1"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/tests/schema-v2.test.ts` — Vitest test verifying Drizzle schema.ts exports new table names: `discoveryItems`, `auditLog`, `businessOutcomes`, `e2eWorkflows`, `workflowSteps`, `focusAreas`, `architectureIntegrations`, `beforeState`, `teamOnboardingStatus`, `scheduledJobs`, and all new enum exports

*Seed SQL for smoke-testing new tables is inline in plan verification steps (not a separate test file).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration rollback + re-apply leaves DB in identical state | SCHEMA-11 (idempotency) | Requires manual DROP/APPLY cycle and visual diff | Run `drizzle-kit migrate:drop` then `drizzle-kit migrate`, compare `\dt` output before and after |
| workflow_steps RLS isolation via e2e_workflows subquery | SCHEMA-07 | Requires cross-table RLS policy inspection | Attempt to SELECT workflow_steps from a different project_id context; verify 0 rows returned |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
