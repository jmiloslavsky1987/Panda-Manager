---
phase: 10
slug: fts-expansion-code-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (E2E) + Vitest (unit) |
| **Config file** | `playwright.config.ts` at project root; `bigpanda-app/vitest.config.ts` for unit tests |
| **Quick run command** | `npx playwright test tests/e2e/phase10.spec.ts --reporter=list` |
| **Full suite command** | `npx playwright test --reporter=list` |
| **Estimated runtime** | ~30 seconds (E2E) |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test tests/e2e/phase10.spec.ts --reporter=list`
- **After every plan wave:** Run `npx playwright test --reporter=list`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | SRCH-01 | E2E | `npx playwright test tests/e2e/phase10.spec.ts --grep "SRCH-01"` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | SRCH-01 | E2E | `npx playwright test tests/e2e/phase10.spec.ts --grep "SRCH-01"` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 1 | SET-02 | unit | `npx vitest run bigpanda-app/tests/skill-run-settings.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-04 | 01 | 1 | INT-UI-01 | E2E | `npx playwright test tests/e2e/phase10.spec.ts --grep "INT-UI-01"` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 2 | SRCH-01 | E2E (full) | `npx playwright test tests/e2e/phase10.spec.ts --reporter=list` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/e2e/phase10.spec.ts` — E2E stubs for SRCH-01 (onboarding step owner search, time entry description search) + INT-UI-01 (/skills/custom link absent)
- [ ] `bigpanda-app/tests/skill-run-settings.test.ts` — Unit stubs for SET-02 (skill_path honored with fallback to __dirname-relative default)

*Note: Vitest is already installed in bigpanda-app since Phase 07-01. Playwright E2E infrastructure established in Phase 8.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration 0009 backfill populates search_vec for pre-existing rows | SRCH-01 | Requires running DB with existing data; Playwright cannot assert DB state directly | After applying migration, run: `SELECT count(*) FROM onboarding_steps WHERE search_vec IS NOT NULL;` — should equal total row count |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
