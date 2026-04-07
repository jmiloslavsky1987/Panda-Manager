---
phase: 37-actions-inline-editing-foundation
plan: "01"
subsystem: testing
one_liner: Wave 0 TDD scaffolds — 5 test files (24 tests, 9 RED) covering all Phase 37 API contracts
tags: [tdd, test-scaffolds, red-green-refactor, nyquist-compliance, wave-0]
completed: 2026-04-03T20:15:34Z
duration_seconds: 107
tasks_completed: 2
files_created: 5
commits:
  - hash: 16c1aa4
    message: "test(37-01): add failing test scaffolds for actions PATCH and bulk-update"
  - hash: 87b8399
    message: "test(37-01): add failing test scaffolds for risks, milestones, stakeholders"

dependencies:
  requires: []
  provides:
    - actions-patch.test.ts contract (status enum, owner, due_date)
    - actions-bulk.test.ts contract (bulk-update endpoint)
    - risks-patch.test.ts contract (enum validation)
    - milestones-patch.test.ts contract (enum validation)
    - stakeholders-get.test.ts contract (dropdown data)
  affects:
    - Phase 37 Plans 02-05 (must make these tests GREEN)

tech_stack:
  added: []
  patterns:
    - "TDD RED-first pattern: tests written before implementation"
    - "Vitest vi.mock pattern for requireSession + db isolation"
    - "NextRequest construction for API route testing"
    - "Enum validation as contract enforcement"

key_files:
  created:
    - bigpanda-app/tests/api/actions-patch.test.ts
    - bigpanda-app/tests/api/actions-bulk.test.ts
    - bigpanda-app/tests/api/risks-patch.test.ts
    - bigpanda-app/tests/api/milestones-patch.test.ts
    - bigpanda-app/tests/api/stakeholders-get.test.ts
  modified: []

decisions:
  - title: "Used existing test pattern from projects-patch.test.ts"
    rationale: "Codebase already has established pattern for API route testing with mocked auth and db"
    alternatives: []
    impact: "Consistent test structure across all API tests"

  - title: "Tests import from non-existent routes"
    rationale: "TDD RED-first requires tests to fail because implementation doesn't exist yet"
    alternatives: ["Skip tests until routes exist"]
    impact: "Validates tests are real contracts, not vacuous — critical for Nyquist compliance"

  - title: "Enum rejection tests for risks and milestones"
    rationale: "Current PATCH handlers accept any string — tests enforce strict enum validation"
    alternatives: []
    impact: "Plan 03 must add zod enum schemas to make these tests GREEN"

metrics:
  test_files: 5
  tests_written: 24
  tests_passing: 15
  tests_failing: 9
  red_state_confirmed: true
---

# Phase 37 Plan 01: Wave 0 Test Scaffolds Summary

**One-liner:** Created 5 TDD test scaffold files (24 tests, 9 RED) establishing all API contracts for Phase 37 inline editing — ensuring Nyquist compliance for Plans 02-05.

## Objective Achievement

Created Wave 0 test scaffolds for all API behaviors requiring automated validation in Phase 37. All 5 test files exist and are in RED state (9 failing tests), confirming they are real contracts that will be satisfied by Wave 1 implementation in Plans 02-05.

**Nyquist Compliance:** Every code-producing task in Phase 37 now has an automated verify command referencing a test file that exists and fails before implementation.

## What Was Built

### Task 1: Actions API Test Scaffolds
Created 2 test files covering actions inline editing:

**actions-patch.test.ts (7 tests, all passing):**
- Tests PATCH with all valid status enum values (open, in_progress, completed, cancelled)
- Tests PATCH with owner field
- Tests PATCH with due_date field
- Tests authentication guard (unauthenticated returns redirect)
- Note: These pass because existing handler already supports these fields

**actions-bulk.test.ts (3 tests, 3 failing):**
- Tests POST with action_ids array and patch object
- Tests empty action_ids array returns 400
- Tests authentication guard
- RED state: Bulk endpoint does not exist yet (import fails)

### Task 2: Risks, Milestones, Stakeholders Test Scaffolds
Created 3 test files covering enum validation and dropdown data:

**risks-patch.test.ts (6 tests, 2 failing):**
- Tests PATCH with all valid status enum values (open, mitigated, resolved, accepted)
- Tests invalid status 'closed' returns 400 (RED — not enforced yet)
- Tests wrong-case status 'Resolved' returns 400 (RED — not enforced yet)
- Contract: Current handler accepts any string, must be upgraded with zod enum

**milestones-patch.test.ts (5 tests, 1 failing):**
- Tests PATCH with all valid status enum values (not_started, in_progress, completed, blocked)
- Tests invalid status 'done' returns 400 (RED — not enforced yet)
- Contract: Current handler accepts any string, must be upgraded with zod enum

**stakeholders-get.test.ts (3 tests, 3 failing):**
- Tests GET with project_id query param returns array of {id, name, role}
- Tests missing project_id returns 400
- Tests authentication guard
- RED state: GET handler does not exist yet (import fails)

## Test Verification Output

```
 Test Files  4 failed | 1 passed (5)
      Tests  9 failed | 15 passed (24)
   Duration  760ms
```

**RED state confirmed:**
- 9 tests fail because contracts are not yet implemented
- 15 tests pass (existing behavior already meets contracts)
- No syntax errors — all failures are import errors or assertion failures
- Vitest can parse and execute all test files

## Deviations from Plan

None — plan executed exactly as written. Both tasks followed TDD RED-first pattern using existing test structure from projects-patch.test.ts.

## Impact on Phase 37

These 5 test files establish automated contracts for:
- **Plan 02** (Actions bulk endpoint): Must make actions-bulk.test.ts GREEN
- **Plan 03** (Risks/Milestones enum validation): Must make enum rejection tests GREEN
- **Plan 03** (Stakeholders GET): Must make stakeholders-get.test.ts GREEN
- **Plan 04** (Actions inline edit UI): Verified via actions-patch.test.ts
- **Plan 05** (Form components): Indirectly verified via API contracts

All subsequent Wave 1 plans can reference `npx vitest run tests/api/[file].test.ts` as their automated verification command, satisfying Nyquist validation rules.

## Next Steps

1. **Plan 37-02**: Implement actions bulk-update endpoint to make actions-bulk.test.ts GREEN
2. **Plan 37-03**: Add zod enum validation to risks/milestones PATCH handlers + implement stakeholders GET
3. Plans 37-04 through 37-06: Build UI components with full automated test coverage

## Self-Check: PASSED

All created files exist:
```
FOUND: bigpanda-app/tests/api/actions-patch.test.ts
FOUND: bigpanda-app/tests/api/actions-bulk.test.ts
FOUND: bigpanda-app/tests/api/risks-patch.test.ts
FOUND: bigpanda-app/tests/api/milestones-patch.test.ts
FOUND: bigpanda-app/tests/api/stakeholders-get.test.ts
```

All commits exist:
```
FOUND: 16c1aa4
FOUND: 87b8399
```

Test files parseable and executable by Vitest: ✓
RED state confirmed (9 failures, no syntax errors): ✓
