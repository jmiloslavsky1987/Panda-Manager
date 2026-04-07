---
phase: 42-ingestion-field-coverage
plan: 01
subsystem: ingestion-testing
tags: [tdd, red-phase, test-scaffolding]
dependencies:
  requires: []
  provides: [red-test-suite-phase-42]
  affects: [write.test.ts, extraction-job.test.ts]
tech_stack:
  added: []
  patterns: [tdd-wave-0, indirect-behavior-testing]
key_files:
  created: []
  modified:
    - bigpanda-app/tests/ingestion/write.test.ts
    - bigpanda-app/tests/ingestion/extraction-job.test.ts
decisions:
  - Indirect testing of coerceRiskSeverity via POST endpoint behavior (function not exported)
  - Mock-based cross-entity resolution testing using db.select stub patterns
  - 19 new failing test cases establish contracts for Plans 02-04 implementation
metrics:
  duration: 134s
  tasks_completed: 2
  tests_added: 19
  tests_red: 19
  completed_at: "2026-04-07T16:47:13Z"
---

# Phase 42 Plan 01: TDD RED Test Scaffolding Summary

Nyquist Wave 0 compliance - extended existing ingestion test files with 19 failing RED test cases for Phase 42 field coverage behaviors before implementation begins.

## Tasks Completed

| Task | Description | Commit | Tests Added |
|------|-------------|--------|-------------|
| 1 | Extend write.test.ts with RED cases for approve route new behaviors | 8b91789 | 11 tests (11 RED) |
| 2 | Extend extraction-job.test.ts with RED cases for prompt field coverage | 4c861c6 | 8 tests (8 RED) |

## Implementation Summary

### Task 1: Approve Route Test Coverage

Extended `bigpanda-app/tests/ingestion/write.test.ts` with a new describe block `describe('Phase 42 — new field coverage')` containing 11 test cases:

**coerceRiskSeverity mapping tests (2 tests):**
- `critical → critical` mapping verification
- `nonsense → medium` default fallback verification

**insertItem tests (3 tests):**
- `insertItem(risk)`: severity field present in insert values
- `insertItem(task)`: start_date, due, description, priority fields present
- `insertItem(milestone)`: owner field present

**mergeItem fill-null-only tests (2 tests):**
- `mergeItem(risk)`: non-null severity not overwritten (fill-null-only guard)
- `mergeItem(task)`: null start_date gets filled (fill-null-only behavior)

**Cross-entity resolution tests (3 tests):**
- Exactly 1 milestone match → milestone_id set
- 0 matches → milestone_id null, description appended with "Milestone ref: [name]"
- Both milestone and workstream unresolved → description includes both refs

**API response field test (1 test):**
- unresolvedRefs field present in API response when task has unresolved ref

All tests use the existing mock infrastructure pattern established in the ING-09/ING-10 tests. The coerceRiskSeverity function is tested indirectly via POST endpoint behavior (not yet exported from route).

### Task 2: Extraction Prompt Test Coverage

Extended `bigpanda-app/tests/ingestion/extraction-job.test.ts` with a new describe block `describe('Phase 42 — extraction prompt field coverage')` containing 8 test cases:

**Task entity field presence (6 tests):**
- milestone_name
- workstream_name
- start_date
- due_date
- priority
- description

**Milestone entity field presence (1 test):**
- owner

**Extraction instruction (1 test):**
- verbatim instruction present

All tests attempt to import `EXTRACTION_SYSTEM` from `document-extraction.ts`. Import fails (expected) because EXTRACTION_SYSTEM is not yet exported, resulting in empty string. All assertions fail RED as expected.

## Test Results

**Overall ingestion suite:**
- 81 total tests
- 58 passed (existing tests)
- 23 failed (19 new Phase 42 RED tests + 4 pre-existing unrelated failures)
- No syntax errors

**Success criteria met:**
- [x] write.test.ts has new describe block with 11 failing test cases
- [x] extraction-job.test.ts has new describe block with 8 failing test cases
- [x] Both files run without syntax errors (failures are assertion failures, not parse errors)
- [x] Failing tests define exact contracts that Plans 02, 03, and 04 will implement against

## Deviations from Plan

None - plan executed exactly as written.

## Key Decisions Made

1. **Indirect coerceRiskSeverity testing:** The coerceRiskSeverity function is not exported from the approve route. Rather than prematurely exposing it, tests verify the behavior indirectly by asserting on the `severity` field in the `db.insert().values()` mock call. This maintains encapsulation while still validating the mapping logic.

2. **Mock-based cross-entity resolution:** Cross-entity FK resolution tests use the existing mock DB pattern (stub `db.select` to return 0/1/2+ rows) rather than creating a real test database. This keeps the test suite fast and follows the established pattern in the file.

3. **Try-catch pattern for EXTRACTION_SYSTEM import:** The extraction-job tests use a try-catch block to attempt importing `EXTRACTION_SYSTEM`. When the import fails (expected RED state), the tests assign an empty string, ensuring all 8 assertions fail predictably without crashing the test suite.

## Next Steps

Plan 02 will implement the extraction prompt additions (EXTRACTION_SYSTEM export and field guidance). Plan 03 will implement coerceRiskSeverity and extend insertItem. Plan 04 will implement cross-entity resolution and mergeItem fill-null-only guards. All implementations will turn these RED tests GREEN.

## Self-Check: PASSED

**Created files:**
- `.planning/phases/42-ingestion-field-coverage/42-01-SUMMARY.md` — FOUND

**Modified files:**
- `bigpanda-app/tests/ingestion/write.test.ts` — FOUND (463 lines added)
- `bigpanda-app/tests/ingestion/extraction-job.test.ts` — FOUND (46 lines added)

**Commits:**
- `8b91789` — FOUND (Task 1: write.test.ts RED cases)
- `4c861c6` — FOUND (Task 2: extraction-job.test.ts RED cases)

All claims verified.
