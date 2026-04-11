---
phase: 57-extraction-intelligence-for-unstructured-notes
plan: "00"
subsystem: extraction-pipeline
tags: [tdd, wave-0, test-stubs, behavioral-contracts]
dependency_graph:
  requires: [phase-53-extraction-prompts]
  provides: [synth-01-contract, synth-02-contract, synth-03-contract, synth-04-contract, synth-05-contract]
  affects: [extraction-pipeline, test-suite]
tech_stack:
  added: []
  patterns: [tdd-red-phase, vitest-test-stubs]
key_files:
  created: []
  modified:
    - bigpanda-app/tests/ingestion/extraction-prompts.test.ts
decisions:
  - Import PASS_0_PROMPT from document-extraction.ts (already exported at line 312)
  - Created 10 test cases covering 5 SYNTH requirements (SYNTH-01 through SYNTH-05)
  - Maintained backward compatibility with existing 12 Phase 53 tests
metrics:
  duration_seconds: 96
  tasks_completed: 1
  tests_added: 10
  tests_passing: 12
  tests_failing: 10
  commits: 1
  completed_date: "2026-04-11"
---

# Phase 57 Plan 00: Wave 0 RED Test Stubs Summary

**One-liner:** Created 10 RED test stubs documenting Phase 57 synthesis-first extraction behavioral contracts (inference posture, document classification, entity prediction, transcript conditionals, confidence calibration)

## Context

Phase 57 introduces synthesis-first extraction intelligence for unstructured notes (transcripts, braindumps, meeting notes). This Wave 0 plan establishes behavioral contracts as failing tests before any prompt changes, enabling TDD-style verification in Plan 57-01.

The plan follows the established Phase 53 TDD pattern: create RED stubs first, then implement GREEN changes in subsequent waves.

## What Was Built

### Test Coverage

Added 10 RED test stubs to `extraction-prompts.test.ts` covering 5 behavioral requirements:

1. **SYNTH-01** (1 test): Global inference posture in EXTRACTION_BASE
   - Tests that EXTRACTION_BASE contains "unstructured" AND "infer" keywords
   - Current state: No inference-first posture language

2. **SYNTH-02** (1 test): Pass 0 document type classification
   - Tests that PASS_0_PROMPT outputs `document_type` XML tag
   - Current state: Pass 0 has no classification output

3. **SYNTH-03** (1 test): Pass 0 entity type prediction
   - Tests that PASS_0_PROMPT outputs `likely_entity_types` XML tag
   - Current state: Pass 0 has no entity prediction output

4. **SYNTH-04** (3 tests): Transcript-mode conditional instructions
   - Tests that each of PASS_PROMPTS[1], [2], [3] contains "transcript" keyword
   - Current state: No document-type-aware conditional behavior

5. **SYNTH-05** (4 tests): Confidence calibration and singleton enforcement
   - Tests EXTRACTION_BASE includes 0.5-0.7 confidence range guidance
   - Tests PASS_PROMPTS[3] weekly_focus includes SINGLETON marker
   - Tests PASS_PROMPTS[2] before_state includes SINGLETON marker
   - Tests PASS_PROMPTS[3] e2e_workflow includes "scattered" assembly guidance
   - Current state: Insufficient confidence calibration, no singleton markers, no assembly guidance

### Implementation Details

- Updated import to include PASS_0_PROMPT (verified already exported at line 312 of document-extraction.ts)
- Appended 10 test cases after existing Phase 53 tests (line 94)
- Each test includes RED comment explaining what Plan 01 must implement
- All tests use clear assertion messages for debugging

### Test Results

```
Test Files  1 failed (1)
      Tests  10 failed | 12 passed (22)
```

- ✓ 12 pre-existing Phase 53 tests remain GREEN (no regressions)
- ✓ 10 new Phase 57 stubs are RED with clear failure messages
- ✓ No TypeScript compilation errors
- ✓ No import failures

## Deviations from Plan

None - plan executed exactly as written.

The plan's `must_haves` mentioned "8 new RED test stubs" but the actual `<implementation>` section specified 10 `it()` blocks covering the 5 SYNTH requirements. This is correct: the 5 behavioral requirements expand into 10 individual test cases (1+1+1+3+4=10).

## Requirements Satisfied

- **SYNTH-01**: RED stub created ✓
- **SYNTH-02**: RED stub created ✓
- **SYNTH-03**: RED stub created ✓
- **SYNTH-04**: RED stub created ✓
- **SYNTH-05**: RED stub created ✓

All requirements have failing tests documenting expected behavior. Phase 57 Plan 01 will implement GREEN changes.

## Verification

```bash
cd /Users/jmiloslavsky/Documents/Project\ Assistant\ Code/bigpanda-app
npm test -- extraction-prompts --run
```

**Expected result:** 12 tests pass (Phase 53), 10 tests fail (Phase 57 RED stubs)
**Actual result:** ✓ Matches expectation

All failures are clear assertion errors about missing prompt content:
- SYNTH-01: `expected false to be true` (no inference posture)
- SYNTH-02: `expected 'You are a document pre-analyzer...' to contain 'document_type'`
- SYNTH-03: `expected 'You are a document pre-analyzer...' to contain 'likely_entity_types'`
- SYNTH-04: `expected '...' to contain 'transcript'` (3 failures for passes 1-3)
- SYNTH-05: Various assertion failures for missing confidence ranges, SINGLETON markers, and scattered guidance

No syntax errors, import errors, or infrastructure failures.

## Files Changed

### Modified
- `bigpanda-app/tests/ingestion/extraction-prompts.test.ts` (+67 lines)
  - Added PASS_0_PROMPT to import
  - Appended 10 RED test stubs with Phase 57 section header

## Next Steps

1. **Phase 57 Plan 01** (Wave 1): Implement GREEN changes to prompts
   - Rewrite EXTRACTION_BASE with inference-first posture
   - Rewrite PASS_0_PROMPT with document classification and entity prediction
   - Add transcript-mode conditionals to Passes 1-3
   - Add confidence calibration rubric
   - Add singleton markers and assembly guidance
   - All 10 RED stubs should turn GREEN after implementation

2. **Phase 57 Plan 02** (Wave 2): Verification and integration testing
   - Run extraction on real unstructured documents
   - Verify document classification accuracy
   - Verify entity prediction improves extraction recall

## Commit Summary

- **424a1ac**: `test(57-00): add failing tests for Phase 57 synthesis-first extraction`

## Self-Check: PASSED

✓ Test file exists: `bigpanda-app/tests/ingestion/extraction-prompts.test.ts`
✓ Commit exists: 424a1ac
✓ 10 new RED tests documented
✓ 12 pre-existing tests remain GREEN
✓ No TypeScript errors
