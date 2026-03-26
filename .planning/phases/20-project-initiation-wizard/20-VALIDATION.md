---
phase: 20
slug: project-initiation-wizard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `cd bigpanda-app && npx vitest run tests/wizard/ --reporter=verbose` |
| **Full suite command** | `cd bigpanda-app && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd bigpanda-app && npx vitest run tests/wizard/ --reporter=verbose`
- **After every plan wave:** Run `cd bigpanda-app && npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 0 | WIZ-02 | unit | `npx vitest run tests/wizard/create-project.test.ts -x` | ❌ W0 | ⬜ pending |
| 20-01-02 | 01 | 0 | WIZ-02 | unit | `npx vitest run tests/wizard/schema-wizard.test.ts -x` | ❌ W0 | ⬜ pending |
| 20-01-03 | 01 | 0 | WIZ-03 | unit | `npx vitest run tests/wizard/checklist-match.test.ts -x` | ❌ W0 | ⬜ pending |
| 20-01-04 | 01 | 0 | WIZ-04 | unit | `npx vitest run tests/wizard/multi-file-accumulation.test.ts -x` | ❌ W0 | ⬜ pending |
| 20-01-05 | 01 | 0 | WIZ-05 | unit | `npx vitest run tests/wizard/manual-entry.test.ts -x` | ❌ W0 | ⬜ pending |
| 20-01-06 | 01 | 0 | WIZ-07 | unit | `npx vitest run tests/wizard/launch.test.ts -x` | ❌ W0 | ⬜ pending |
| 20-01-07 | 01 | 0 | WIZ-08 | unit | `npx vitest run tests/wizard/completeness.test.ts -x` | ❌ W0 | ⬜ pending |
| 20-01-08 | 01 | 0 | WIZ-09 | unit | `npx vitest run tests/wizard/completeness-banner.test.ts -x` | ❌ W0 | ⬜ pending |
| 20-WIZ-01 | TBD | 1 | WIZ-01 | manual | manual — DOM interaction | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/wizard/` directory — create before Wave 1
- [ ] `tests/wizard/create-project.test.ts` — stubs for WIZ-02 project creation API
- [ ] `tests/wizard/schema-wizard.test.ts` — stubs for WIZ-02 schema fields (description, start_date, end_date, draft status)
- [ ] `tests/wizard/checklist-match.test.ts` — stubs for WIZ-03 filename-to-category matching
- [ ] `tests/wizard/multi-file-accumulation.test.ts` — stubs for WIZ-04 ReviewItems accumulation across files
- [ ] `tests/wizard/manual-entry.test.ts` — stubs for WIZ-05 manual entry write flow
- [ ] `tests/wizard/launch.test.ts` — stubs for WIZ-07 PATCH status update + navigation
- [ ] `tests/wizard/completeness.test.ts` — stubs for WIZ-08 completeness score (9 tables, 0–100%)
- [ ] `tests/wizard/completeness-banner.test.ts` — stubs for WIZ-09 below-60% banner data

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "New Project" button opens wizard Dialog | WIZ-01 | UI interaction — Dialog open/close requires browser DOM | Click "New Project" on Dashboard; verify wizard opens as full-screen Dialog with step 1 visible |
| Wizard step progress indicator updates | WIZ-01 | Visual rendering — stepper UI state requires browser | Advance through steps; verify active step highlights blue, completed steps show green checkmark |
| Closing wizard after step 1 leaves Draft in Dashboard | WIZ-02 | Multi-step UI flow | Complete step 1, close wizard via X; verify project appears in Dashboard as Draft |
| Drag-and-drop file upload in step 2 | WIZ-03 | Browser drag event | Drag a file onto the upload zone; verify it appears in file list and checklist auto-checks |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
