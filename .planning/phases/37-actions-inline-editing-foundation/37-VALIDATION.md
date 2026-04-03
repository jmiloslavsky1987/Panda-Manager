---
phase: 37
slug: actions-inline-editing-foundation
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-03
---

# Phase 37 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.1 |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `cd bigpanda-app && npx vitest run tests/api/` |
| **Full suite command** | `cd bigpanda-app && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd bigpanda-app && npx vitest run tests/api/`
- **After every plan wave:** Run `cd bigpanda-app && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 37-01-01 | 37-01 | 0 | ACTN-02 | unit | `cd bigpanda-app && npx vitest run tests/api/actions-patch.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| 37-01-02 | 37-01 | 0 | ACTN-05 | unit | `cd bigpanda-app && npx vitest run tests/api/actions-bulk.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| 37-01-03 | 37-01 | 0 | IEDIT-01 | unit | `cd bigpanda-app && npx vitest run tests/api/risks-patch.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| 37-01-04 | 37-01 | 0 | IEDIT-02 | unit | `cd bigpanda-app && npx vitest run tests/api/milestones-patch.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| 37-01-05 | 37-01 | 0 | FORM-02 | unit | `cd bigpanda-app && npx vitest run tests/api/stakeholders-get.test.ts -x` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/tests/api/actions-patch.test.ts` — covers ACTN-02 (inline PATCH for status/owner/due)
- [ ] `bigpanda-app/tests/api/actions-bulk.test.ts` — covers ACTN-05 (bulk status update)
- [ ] `bigpanda-app/tests/api/risks-patch.test.ts` — covers IEDIT-01 (Risk status enum validation)
- [ ] `bigpanda-app/tests/api/milestones-patch.test.ts` — covers IEDIT-02 (Milestone status enum validation)
- [ ] `bigpanda-app/tests/api/stakeholders-get.test.ts` — covers FORM-02 (GET stakeholders endpoint)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Actions table renders with correct columns (ID, Description, Owner, Due Date, Status, Source) | ACTN-01 | UI layout verification | Open any project's Actions tab and confirm 6 columns in correct order |
| Owner + date range filter params update URL and filter table | ACTN-03 | Client-side filter with URL params | Apply owner filter and date range; confirm URL updates and rows filter |
| Description text search filters actions | ACTN-04 / SRCH-03 | Client-side text filter | Type text in search box; confirm matching rows shown, non-matching hidden |
| Risk status dropdown shows exactly: open / mitigated / resolved / accepted | IEDIT-03 | Enum values in dropdown UI | Click a Risk status cell; confirm exactly 4 options present |
| Milestone status dropdown shows exactly: not_started / in_progress / completed / blocked | IEDIT-04 | Enum values in dropdown UI | Click a Milestone status cell; confirm exactly 4 options present |
| DatePickerCell opens calendar popover and saves ISO date on selection | FORM-01 | UI component interaction | Click a date cell; confirm calendar opens; select date; confirm save and display update |
| OwnerCell accepts freeform name not in stakeholder list | FORM-03 | Datalist freeform input | Type a name not in stakeholder list; blur; confirm save without error |
| TaskEditModal due date field shows DatePickerCell (not plain text input) | FORM-01 | UI component in modal | Open task edit modal; confirm Due Date field is a calendar picker |
| TaskEditModal owner field shows OwnerCell with autocomplete | FORM-02 | UI component in modal | Open task edit modal; type a letter in owner field; confirm suggestions appear |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready for execution
