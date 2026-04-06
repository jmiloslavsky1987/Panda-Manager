---
phase: 03-project-setup-action-manager
plan: "06"
subsystem: checkpoint

tags: [checkpoint, test-suite, visual-verification, phase-complete]

# Dependency graph
requires:
  - phase: 03-project-setup-action-manager
    plan: "05"
    provides: ActionManager.jsx — ACT-01 through ACT-12 complete
provides:
  - Phase 3 signed off by human verifier
  - All 6 plans complete — Phase 3 closed

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "require.main === module guard in server/index.js — prevents test suites from occupying port 3001"
    - "HTML <select> controlled value: add <option value=''> placeholder to prevent first-option onChange-never-fires bug"

key-files:
  created:
    - server/routes/customers.js (POST /api/customers + createYamlFile)
    - client/src/views/Dashboard.jsx (NewCustomerModal + Setup card buttons)
  modified:
    - server/index.js (require.main guard)
    - server/services/driveService.js (createYamlFile)
    - client/src/views/ActionManager.jsx (3 post-checkpoint UX fixes)

key-decisions:
  - "server/index.js: require.main === module guard around app.listen() — prevents test suite from holding port 3001, breaking dev server"
  - "InlineSelectField: explicit <option value=''> placeholder ensures controlled select always has a matching DOM option — fixes first-option onChange never firing"
  - "Status column: replaced click-to-cycle span with <select> dropdown (Open/Delayed/In Review) — user preference for explicit status selection"
  - "New Customer: POST /api/customers builds full 11-subworkstream YAML scaffold; file named {slug}_Master_Status.yaml to match Drive listCustomerFiles query filter"
  - "Workstream filter: removed 'Unassigned' sentinel; filter works when workstream is assigned via inline dropdown; helpful empty-state message shown"

patterns-established:
  - "Pattern: require.main guard for Express — always wrap app.listen() so the module is safely require()-able by test suites"
  - "Pattern: controlled <select> with empty placeholder option — prevents the first-option-never-fires onChange bug in React"

requirements-completed: [ACT-01, ACT-02, ACT-03, ACT-04, ACT-05, ACT-06, ACT-07, ACT-08, ACT-09, ACT-10, ACT-11, ACT-12]

# Metrics
duration: 3min
completed: 2026-03-05
---

# Phase 3 Plan 06: Full Test Suite + Human Visual Checkpoint Summary

**Wave 4 checkpoint: automated suite 65/65 green; human visual review completed with 3 post-checkpoint UX fixes; Phase 3 signed off by user ("approved")**

## Performance

- **Duration:** ~3 min (test run) + post-checkpoint fixes
- **Completed:** 2026-03-05
- **Tasks:** 2 (automated + human checkpoint)

## Accomplishments

### Task 1: Full Test Suite — Green

All 65 tests across server and client passed before the checkpoint gate:

| Suite | Tests | Result |
|-------|-------|--------|
| routes/risks.test.js | 5 | PASS |
| routes/milestones.test.js | 5 | PASS |
| routes/actions.test.js | 12 | PASS |
| routes/workstreams.test.js | 5 | PASS |
| client/deriveCustomer.test.js | 39 | PASS |
| **Total** | **65** | **✅ All green** |

**Critical fix discovered during test run:** `node --test` was requiring `server/index.js`, which called `app.listen()` unconditionally, occupying port 3001. The real dev server couldn't start, causing `GET /api/customers` to return `[]`. Fixed by wrapping `app.listen()` with `if (require.main === module)` — tests now exit in ~170ms.

- Commit: `49a9328` — fix(server): only start listening when run as main module

### Task 2: Human Visual Checkpoint — PASSED (with fixes)

Three issues were identified during visual review; all resolved:

#### Fix 1 — Workstream filter always empty
- **Root cause:** New actions had `workstream: undefined`; `a.workstream === filterWorkstream` never matched
- **Initial approach:** Added "Unassigned" sentinel — rejected by user as unnecessary
- **Final fix:** Removed "Unassigned" option; filter works when workstream is assigned via inline dropdown. Helpful empty-state message when filtering a specific workstream with no matches.
- Commit: part of `c9c96f8` (checkpoint fixes), refined in `abfb609`

#### Fix 2 — Status should be dropdown, not click-to-cycle
- **Root cause:** Status cell was a `<span>` cycling through STATUS_CYCLE on click
- **Fix:** Replaced with `<select>` dropdown (Open / Delayed / In Review) styled with STATUS_BADGE_CLASSES for matching pill appearance
- Commit: `c9c96f8`

#### Fix 3 — Project Setup not accessible from Dashboard
- **Root cause:** "Project Setup" link existed only in CustomerOverview workstream header; no entry point on Dashboard
- **Fix:** Added "Setup" button to each CustomerCard alongside "View"; added "New Customer" modal with `+ New Customer` button in Dashboard header
- **New Customer modal:** Fields for customer name (required), project name, go-live date; on success → navigate to `/customer/:id/setup`; `POST /api/customers` builds full 11-subworkstream YAML scaffold; `driveService.createYamlFile()` creates the Drive file
- Commit: `abfb609`

#### Fix 4 — Workstream inline select first-option onChange never fires (post-checkpoint)
- **Root cause:** `InlineSelectField` had `value={value}` where `value` was `undefined` → `value=""`, but no `<option value="">` existed. Browser shows first option visually; React value is `""`; selecting first option fires no `onChange` (no actual value change from browser's perspective).
- **Fix:** Added `<option value="">— Select —</option>` placeholder; `value={value ?? ''}` ensures controlled; `onChange` guards `if (e.target.value)` to skip empty sentinel
- Commit: `dfadf9a`

### Phase 3 Checkpoint Result: **APPROVED** ✅

User confirmed all Phase 3 functionality working end-to-end.

## Post-Checkpoint Commits

| Commit | Type | Description |
|--------|------|-------------|
| `49a9328` | fix | server/index.js: require.main guard — prevent test port occupation |
| `ca24899` | chore | 03-06: full test suite green — 65 tests pass |
| `c9c96f8` | fix | phase3-checkpoint: 3 UX fixes from visual review |
| `abfb609` | feat | new customer creation + UX fixes (New Customer modal, Setup card buttons) |
| `dfadf9a` | fix | ActionManager: workstream select first-option onChange fix |

## Files Created/Modified (Post-Plan-05)

- `server/index.js` — `require.main === module` guard around `app.listen()`; `module.exports = app` for supertest
- `server/services/driveService.js` — added `createYamlFile(fileName, yamlContent)` using Drive API `files.create`
- `server/routes/customers.js` — added `buildNewCustomerYaml()` scaffold builder; `POST /api/customers` endpoint
- `client/src/api.js` — added `createCustomer(body)` → `POST /customers`
- `client/src/views/Dashboard.jsx` — added `NewCustomerModal` component; `+ New Customer` button; "Setup" button on each CustomerCard
- `client/src/views/ActionManager.jsx` — status column → `<select>` dropdown; workstream filter cleanup; `InlineSelectField` placeholder fix

## Decisions Made

- `require.main === module` guard: canonical pattern for Express modules used as both server entry point and supertest dependency
- `<option value="">— Select —</option>`: required in any controlled `<select>` where the backing value can be empty/undefined — prevents silent first-option onChange failure
- Status as `<select>`: explicit user-facing selection preferred over click-to-cycle; badge classes applied to `<select>` element for visual consistency
- New Customer scaffold: `buildNewCustomerYaml()` emits full 11-subworkstream structure with all required keys matching `validateYaml` schema — same as hand-created YAMLs
- File naming: `${slug}_Master_Status.yaml` matches the `listCustomerFiles()` Drive query filter (`name contains '_Master_Status.yaml'`) — essential for the new file to appear on Dashboard

## Phase 3 Requirements Coverage

All 12 ACT requirements covered across Plans 02, 03, 04, 05, 06:

| Req | Description | Delivered by |
|-----|-------------|--------------|
| ACT-01 | Open actions sortable by any column | 03-05 (SortableHeader) |
| ACT-02 | Filter by workstream and status | 03-05 + 03-06 fix |
| ACT-03 | Overdue due dates render red | 03-05 (isOverdue + clsx) |
| ACT-04 | Checkbox complete → Drive write | 03-05 (optimistic patchAction) |
| ACT-05 | Saving... indicator per row | 03-05 (mutation.isPending scoped) |
| ACT-06 | Inline edit description/owner/due | 03-05 (InlineEditField) |
| ACT-07 | Each edit writes to Drive on blur/enter | 03-05 (onBlur/onKeyDown) |
| ACT-08 | Status editable inline | 03-06 fix (select dropdown) |
| ACT-09 | Add Action → A-### ID | 03-05 (postAction + server assignNextId) |
| ACT-10 | Completed table collapsed by default | 03-05 (showCompleted toggle) |
| ACT-11 | Reopen → moves to open | 03-05 (patchAction {status:'open'}) |
| ACT-12 | Workstream editable inline | 03-05 + 03-06 fix (InlineSelectField) |

---
*Phase: 03-project-setup-action-manager*
*Completed: 2026-03-05*
*All 6 plans complete — Phase 3 DONE*

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| .planning/phases/03-project-setup-action-manager/03-06-SUMMARY.md | CREATED |
| Test suite: 65/65 passing | ✅ |
| Human checkpoint: "approved" | ✅ |
| Post-checkpoint fixes committed | ✅ (dfadf9a, abfb609, c9c96f8, 49a9328) |
| Phase 3 requirements: ACT-01 to ACT-12 | ALL COMPLETE |
