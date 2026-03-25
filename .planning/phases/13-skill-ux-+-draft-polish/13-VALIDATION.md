---
phase: 13
slug: skill-ux-draft-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test tests/e2e/phase13.spec.ts` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test tests/e2e/phase13.spec.ts`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | SKILL-04/SKILL-13 | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "history.*skill"` | ❌ Wave 0 | ⬜ pending |
| 13-01-02 | 01 | 1 | SKILL-03/SKILL-13 | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "stakeholders.*skill"` | ❌ Wave 0 | ⬜ pending |
| 13-01-03 | 01 | 1 | SKILL-03/SKILL-13 | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "navigate.*skills"` | ❌ Wave 0 | ⬜ pending |
| 13-02-01 | 02 | 2 | DASH-09 | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "draft.*modal"` | ❌ Wave 0 | ⬜ pending |
| 13-02-02 | 02 | 2 | DASH-09 | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "draft.*fields"` | ❌ Wave 0 | ⬜ pending |
| 13-02-03 | 02 | 2 | DASH-09 | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "draft.*save"` | ❌ Wave 0 | ⬜ pending |
| 13-02-04 | 02 | 2 | DASH-09 | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "draft.*dismiss"` | ❌ Wave 0 | ⬜ pending |
| 13-02-05 | 02 | 2 | SRCH-02 | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "search.*date"` | ❌ Wave 0 | ⬜ pending |
| 13-02-06 | 02 | 2 | SRCH-02 | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "date.*filter.*empty"` | ❌ Wave 0 | ⬜ pending |
| 13-02-07 | 02 | 2 | PLAN-08 | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "template.*modal"` | ❌ Wave 0 | ⬜ pending |
| 13-02-08 | 02 | 2 | PLAN-08 | E2E | `npx playwright test tests/e2e/phase13.spec.ts --grep "template.*count"` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/e2e/phase13.spec.ts` — stubs for all 11 behaviors above (SKILL-04/13, SKILL-03/13, DASH-09, SRCH-02, PLAN-08)

*Existing infrastructure covers all other phase requirements — no new framework setup needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Draft send button actually delivers email via Gmail MCP | DASH-09 | External side-effect; E2E only verifies modal flow | Open Drafts Inbox, edit a draft, click Send, verify email received in Gmail |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
