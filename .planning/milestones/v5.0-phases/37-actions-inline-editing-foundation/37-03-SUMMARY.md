---
phase: 37-actions-inline-editing-foundation
plan: "03"
subsystem: api
one_liner: API endpoints for inline editing — stakeholders GET, actions bulk-update, enum validation on risks/milestones status fields
tags: [api, enum-validation, bulk-operations, tdd-green, wave-1]
completed: 2026-04-03T20:20:16Z
duration_seconds: 194
tasks_completed: 2
files_created: 1
commits:
  - hash: ffdaf63
    message: "feat(37-03): add stakeholders GET and actions bulk-update endpoints"
  - hash: 032dd4a
    message: "feat(37-03): add enum validation to risks and milestones PATCH"

dependencies:
  requires:
    - 37-01-SUMMARY.md (test scaffolds)
  provides:
    - GET /api/stakeholders?project_id=X for owner autocomplete dropdown
    - POST /api/actions/bulk-update for bulk status changes
    - Enum-constrained status validation on risks (4 values) and milestones (4 values)
  affects:
    - Plans 37-02, 37-04, 37-05 (UI components can now call these endpoints)

tech_stack:
  added: []
  patterns:
    - "Drizzle inArray() for bulk update pattern"
    - "Zod enum validation for fixed status dropdowns"
    - "GET endpoint with query param validation"
    - "Consistent 400 status code for validation errors"

key_files:
  created:
    - bigpanda-app/app/api/actions/bulk-update/route.ts
  modified:
    - bigpanda-app/app/api/stakeholders/route.ts
    - bigpanda-app/app/api/risks/[id]/route.ts
    - bigpanda-app/app/api/milestones/[id]/route.ts

decisions:
  - title: "Validation error status code changed to 400"
    rationale: "Tests expected 400, and actions route already uses 400 — consistency across all API routes"
    alternatives: ["Keep 422 (RFC 4918 standard for validation errors)"]
    impact: "All validation errors now return 400 instead of 422 for risks and milestones"

  - title: "Bulk endpoint does not write to xlsx"
    rationale: "Per RESEARCH.md, bulk is Actions-UI only; single-action PATCH already handles xlsx sync"
    alternatives: ["Add xlsx write to bulk endpoint"]
    impact: "Bulk updates only modify DB, not xlsx — acceptable for inline editing use case"

metrics:
  test_files_green: 5
  tests_passing: 24
  api_routes_added: 2
  api_routes_modified: 2
---

# Phase 37 Plan 03: API Endpoints for Inline Editing Summary

**One-liner:** Added stakeholders GET endpoint for owner dropdowns, actions bulk-update for multi-row edits, and tightened risks/milestones status validation to fixed enums — making all Wave 0 tests GREEN.

## Objective Achievement

Implemented all API contracts required for Wave 1 inline editing components. All 5 Wave 0 test files now pass (24 tests GREEN, 0 RED). The API surface supports:
- Owner autocomplete via stakeholders list
- Bulk status changes on actions
- Strict enum validation preventing invalid status values on risks and milestones

## What Was Built

### Task 1: Stakeholders GET + Actions Bulk Update

**Stakeholders GET endpoint:**
- Added GET handler to `/api/stakeholders?project_id=X`
- Returns `[{ id, name, role }]` for dropdown population
- Requires `project_id` query param (returns 400 if missing)
- Enforces `requireSession()` auth guard

**Actions bulk-update endpoint:**
- Created POST `/api/actions/bulk-update`
- Accepts `{ action_ids: number[], patch: { status?, owner?, due? } }`
- Uses `inArray()` for efficient bulk DB update
- Validates `action_ids` array has min length 1
- Returns `{ ok: true, count: N }`
- No xlsx write (bulk is UI-only per RESEARCH.md)

**Files:**
- `bigpanda-app/app/api/stakeholders/route.ts` (modified) — added GET export before existing POST
- `bigpanda-app/app/api/actions/bulk-update/route.ts` (created) — mirrors tasks-bulk pattern

**Test result:** `stakeholders-get.test.ts` and `actions-bulk.test.ts` both GREEN (6/6 tests pass)

### Task 2: Enum Validation on Risks and Milestones

**Risks PATCH schema:**
- Changed `status: z.string().optional()` → `z.enum(['open', 'mitigated', 'resolved', 'accepted']).optional()`
- Invalid values like 'closed' or 'Resolved' now return 400

**Milestones PATCH schema:**
- Changed `status: z.string().optional()` → `z.enum(['not_started', 'in_progress', 'completed', 'blocked']).optional()`
- Invalid values like 'done' now return 400

**Validation error consistency fix:**
- Changed error status code from 422 → 400 in both routes
- Matches actions route pattern and test expectations

**Files:**
- `bigpanda-app/app/api/risks/[id]/route.ts` (modified) — enum status + 400 error code
- `bigpanda-app/app/api/milestones/[id]/route.ts` (modified) — enum status + 400 error code

**Test result:** `risks-patch.test.ts` and `milestones-patch.test.ts` both GREEN (11/11 tests pass); `actions-patch.test.ts` remains GREEN (7/7 tests pass)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Validation error status code mismatch**
- **Found during:** Task 1 test run
- **Issue:** Bulk-update endpoint returned 422 for validation errors, test expected 400
- **Fix:** Changed status code to 400 to match test contract and actions route pattern
- **Files modified:** `bigpanda-app/app/api/actions/bulk-update/route.ts`
- **Commit:** ffdaf63 (same commit, fixed before final GREEN)

## Test Verification

All Wave 0 tests are now GREEN:

```
Test Files  9 passed (9)
     Tests  46 passed (46)
```

**Specific to this plan:**
- `tests/api/stakeholders-get.test.ts` — 3 tests GREEN
- `tests/api/actions-bulk.test.ts` — 3 tests GREEN
- `tests/api/risks-patch.test.ts` — 6 tests GREEN (2 were RED, now fixed)
- `tests/api/milestones-patch.test.ts` — 5 tests GREEN (1 was RED, now fixed)
- `tests/api/actions-patch.test.ts` — 7 tests GREEN (already passing)

**Zero regressions:** Full `npx vitest run tests/api/` suite passes (46 tests, 9 files).

## Impact on Phase 37

**Plans unblocked:**
- **Plan 37-02** (Actions table components) — can call bulk-update endpoint
- **Plan 37-04** (Risk/Milestone inline editing) — enum validation ensures valid data
- **Plan 37-05** (Shared form components) — stakeholders GET provides dropdown data

**Requirements satisfied:**
- **ACTN-05:** Bulk-update endpoint ready for checkbox multi-select
- **IEDIT-01:** Risks API accepts only valid enum statuses
- **IEDIT-02:** Milestones API accepts only valid enum statuses
- **IEDIT-03:** Risk status enum enforced at API layer
- **IEDIT-04:** Milestone status enum enforced at API layer
- **FORM-02:** Stakeholders GET endpoint provides autocomplete data

## Next Steps

1. **Plan 37-02** or **37-04**: Build UI components that consume these endpoints
2. **Plan 37-05**: Create shared `<DatePickerCell />` and `<OwnerCell />` components
3. **Plan 37-06**: Wire inline editing into Risks and Milestones tables

## Self-Check: PASSED

All created files exist:
```
FOUND: bigpanda-app/app/api/actions/bulk-update/route.ts
```

All modified files exist:
```
FOUND: bigpanda-app/app/api/stakeholders/route.ts
FOUND: bigpanda-app/app/api/risks/[id]/route.ts
FOUND: bigpanda-app/app/api/milestones/[id]/route.ts
```

All commits exist:
```
FOUND: ffdaf63
FOUND: 032dd4a
```

Test files GREEN (verified via `npx vitest run tests/api/`): ✓
Zero TypeScript syntax errors (project-wide config issues are pre-existing): ✓
No regressions in existing API tests: ✓
