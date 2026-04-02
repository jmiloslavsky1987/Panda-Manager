---
phase: 33
slug: overview-tab-schema-migration-workstream-structure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + @testing-library/react 16.3.2 |
| **Config file** | `bigpanda-app/vitest.config.ts` (exists) |
| **Quick run command** | `npm test -- tests/overview/track-separation.test.ts -x` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds (quick), ~60 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- tests/overview/ -x`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green + manual browser verification of dual-track UI
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 33-W0-01 | test-scaffolds | 0 | WORK-01 | unit | `npm test -- tests/overview/track-separation.test.ts -x` | ❌ W0 | ⬜ pending |
| 33-W0-02 | test-scaffolds | 0 | WORK-01 | unit | `npm test -- tests/api/onboarding-grouped.test.ts -x` | ❌ W0 | ⬜ pending |
| 33-W0-03 | test-scaffolds | 0 | WORK-01 | integration | `npm test -- tests/api/project-seeding.test.ts -x` | ❌ W0 | ⬜ pending |
| 33-W0-04 | test-scaffolds | 0 | WORK-02 | unit | `npm test -- tests/overview/completeness-removal.test.ts -x` | ❌ W0 | ⬜ pending |
| 33-schema | schema-migration | 1 | WORK-01 | unit | `npm test -- tests/api/project-seeding.test.ts -x` | ❌ W0 | ⬜ pending |
| 33-seed | project-seeding | 2 | WORK-01 | integration | `npm test -- tests/api/project-seeding.test.ts -x` | ❌ W0 | ⬜ pending |
| 33-api | api-grouping | 3 | WORK-01 | unit | `npm test -- tests/api/onboarding-grouped.test.ts -x` | ❌ W0 | ⬜ pending |
| 33-ui | dual-track-ui | 4 | WORK-01 | unit | `npm test -- tests/overview/track-separation.test.ts -x` | ❌ W0 | ⬜ pending |
| 33-rm | completeness-removal | 4 | WORK-02 | unit | `npm test -- tests/overview/completeness-removal.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/overview/track-separation.test.ts` — stubs for WORK-01 (dual-track rendering, shared filter)
- [ ] `tests/api/onboarding-grouped.test.ts` — stubs for WORK-01 (API grouping by track)
- [ ] `tests/api/project-seeding.test.ts` — stubs for WORK-01 (auto-seeded phases on project creation)
- [ ] `tests/overview/completeness-removal.test.ts` — stubs for WORK-02 (completeness score/banner removed)

*Framework install: N/A — Vitest already configured in vitest.config.ts*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dual-column side-by-side on desktop, stacked on mobile | WORK-01 | Visual responsive layout requires browser | Open Overview tab on ≥768px screen, verify ADR and Biggy render side-by-side; on mobile, verify stacked |
| ADR/Biggy columns visually distinguished (border-l-4 colors) | WORK-01 | Visual styling cannot be asserted in JSDOM | Check ADR column has blue-200 left border, Biggy has green-200 left border |
| Overview tab renders correctly for project with no steps yet | WORK-01 | Edge case visual state | Create new project, go to Overview tab — both columns should show phases with "0/0 steps" |
| Filter bar affects both columns simultaneously | WORK-01 | Cross-column interaction | Type in search filter, verify results filtered in both ADR and Biggy columns |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
