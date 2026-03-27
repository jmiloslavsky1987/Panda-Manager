---
phase: 21
slug: teams-tab-+-architecture-tab
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-03-26
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.1 |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `cd bigpanda-app && npx vitest run tests/teams-arch/` |
| **Full suite command** | `cd bigpanda-app && npx vitest run` |
| **Estimated runtime** | ~15 seconds (quick), ~60 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `cd bigpanda-app && npx vitest run tests/teams-arch/`
- **After every plan wave:** Run `cd bigpanda-app && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | TEAMS-02 | unit | `cd bigpanda-app && npx vitest run tests/teams-arch/business-outcomes.test.ts` | ❌ W0 | ⬜ pending |
| 21-01-02 | 01 | 1 | TEAMS-04 | unit | `cd bigpanda-app && npx vitest run tests/teams-arch/e2e-workflows.test.ts` | ❌ W0 | ⬜ pending |
| 21-02-01 | 02 | 1 | ARCH-01 | unit | `cd bigpanda-app && npx vitest run tests/teams-arch/arch-tabs.test.ts` | ❌ W0 | ⬜ pending |
| 21-02-02 | 02 | 1 | ARCH-03 | unit | `cd bigpanda-app && npx vitest run tests/teams-arch/pain-points.test.ts` | ❌ W0 | ⬜ pending |
| 21-03-01 | 03 | 2 | TEAMS-01 | unit | `cd bigpanda-app && npx vitest run tests/teams-arch/teams-sections.test.ts` | ❌ W0 | ⬜ pending |
| 21-03-02 | 03 | 2 | TEAMS-07, TEAMS-09 | unit | `cd bigpanda-app && npx vitest run tests/teams-arch/warning-banner.test.ts tests/teams-arch/team-order.test.ts` | ❌ W0 | ⬜ pending |
| 21-04-01 | 04 | 2 | ARCH-08 | unit | `cd bigpanda-app && npx vitest run tests/teams-arch/status-pills.test.ts` | ❌ W0 | ⬜ pending |
| 21-04-02 | 04 | 2 | ARCH-11 | unit | `cd bigpanda-app && npx vitest run tests/teams-arch/customer-rules.test.ts` | ❌ W0 | ⬜ pending |
| 21-05-01 | 05 | 3 | TEAMS-10, ARCH-10 | unit | `cd bigpanda-app && npx vitest run tests/teams-arch/skill-context-teams.test.ts tests/teams-arch/skill-context-arch.test.ts` | ❌ W0 | ⬜ pending |
| 21-05-02 | 05 | 3 | TEAMS-11, ARCH-12 | unit | `cd bigpanda-app && npx vitest run tests/teams-arch/design-tokens.test.ts tests/teams-arch/skill-html-export.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `bigpanda-app/tests/teams-arch/business-outcomes.test.ts` — stubs for TEAMS-02 API shape
- [x] `bigpanda-app/tests/teams-arch/e2e-workflows.test.ts` — stubs for TEAMS-04 nested query
- [x] `bigpanda-app/tests/teams-arch/teams-sections.test.ts` — stubs for TEAMS-01 section rendering
- [x] `bigpanda-app/tests/teams-arch/warning-banner.test.ts` — stubs for TEAMS-07 empty section banner
- [x] `bigpanda-app/tests/teams-arch/team-order.test.ts` — stubs for TEAMS-09 AMEX canonical ordering
- [x] `bigpanda-app/tests/teams-arch/skill-context-teams.test.ts` — stubs for TEAMS-10 context extension
- [x] `bigpanda-app/tests/teams-arch/design-tokens.test.ts` — stubs for TEAMS-11 design token consistency
- [x] `bigpanda-app/tests/teams-arch/arch-tabs.test.ts` — stubs for ARCH-01 two-tab structure
- [x] `bigpanda-app/tests/teams-arch/pain-points.test.ts` — stubs for ARCH-03 JSONB pain points
- [x] `bigpanda-app/tests/teams-arch/status-pills.test.ts` — stubs for ARCH-08 status pill color map
- [x] `bigpanda-app/tests/teams-arch/skill-context-arch.test.ts` — stubs for ARCH-10 arch context extension
- [x] `bigpanda-app/tests/teams-arch/customer-rules.test.ts` — stubs for ARCH-11 customer-specific rules
- [x] `bigpanda-app/tests/teams-arch/skill-html-export.test.ts` — stubs for ARCH-12 self-contained HTML export

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Optimistic UI shows/hides correctly on add/edit | TEAMS-03, TEAMS-06, ARCH-05, ARCH-06 | Requires browser interaction timing | Add an item, verify UI updates before server confirms; simulate slow network via DevTools throttle |
| Yellow warning banner visible for empty sections | TEAMS-07 | Visual rendering check | Create project with no business outcomes; load Teams tab; verify amber banner appears above section |
| Tab switching between Before BigPanda / Current & Future State | ARCH-01 | Requires browser state | Click each tab header; verify content swaps without page reload |
| Skill HTML exports render correctly in browser | TEAMS-10, ARCH-10, ARCH-12 | File output requires browser open | Run each skill; open resulting HTML file in browser; verify all sections render with correct colors |
| Design token colors visually match spec | TEAMS-11, ARCH-12 | Pixel-level visual check | Open both tab views and skill exports; use browser DevTools to confirm computed colors match hex values |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
