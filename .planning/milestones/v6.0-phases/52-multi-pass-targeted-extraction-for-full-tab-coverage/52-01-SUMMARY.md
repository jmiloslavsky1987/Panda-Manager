---
phase: 52-multi-pass-targeted-extraction-for-full-tab-coverage
plan: 01
type: tdd
wave: 0
subsystem: extraction-worker-testing
tags: [tdd, wave-0, red-tests, multi-pass, deduplication, progress-display]
dependencies:
  requires: []
  provides:
    - test-stubs-for-pass-structure
    - test-stubs-for-intra-batch-dedup
    - test-stubs-for-pass-progress-ui
  affects:
    - worker/jobs/__tests__/document-extraction-passes.test.ts
    - worker/jobs/__tests__/document-extraction-dedup.test.ts
    - __tests__/ingestion-modal-pass-progress.test.ts
tech_stack:
  added: []
  patterns:
    - wave-0-tdd-red-stubs
    - source-inspection-testing
    - vitest-dynamic-imports
key_files:
  created:
    - worker/jobs/__tests__/document-extraction-passes.test.ts
    - worker/jobs/__tests__/document-extraction-dedup.test.ts
    - __tests__/ingestion-modal-pass-progress.test.ts
  modified: []
decisions:
  - test-stub-strategy: Use dynamic imports with try/catch to gracefully handle missing exports
  - pass-structure-validation: Test PASS_PROMPTS isolation by asserting presence/absence of entity types per pass
  - dedup-key-coverage: Cover all entity types including composite keys (wbs_task, e2e_workflow, arch_node)
  - progress-testing-approach: Use source inspection for IngestionModal (consistent with Phase 48/51 patterns)
  - isAlreadyIngested-import: Test that lib export exists (turns GREEN immediately, confirms Wave 1 path)
metrics:
  duration_seconds: 190
  files_created: 3
  files_modified: 0
  tests_created: 21
  tests_passing: 1
  tests_failing: 20
  commits: 3
  completed_date: 2026-04-09T23:36:46Z
---

# Phase 52 Plan 01: Wave 0 RED Test Stubs for Multi-Pass Extraction Summary

Wave 0 TDD stubs for 3-pass extraction, intra-batch dedup, and pass-aware progress UI — 20 RED tests + 1 GREEN test establish the behavioral contract before implementation.

## What Was Built

Created three test files documenting the exact behaviors Phase 52 must implement:

1. **document-extraction-passes.test.ts** — Multi-pass structure validation
   - Pass prompts isolation (entity types segregated by pass)
   - PDF 3-pass execution flow
   - Text 3-pass execution flow
   - Pass results merge before staging
   - Global progress scale (0-33%, 34-66%, 67-100%)
   - isAlreadyIngested import from lib (GREEN — export already exists)

2. **document-extraction-dedup.test.ts** — Intra-batch deduplication logic
   - Same entityType+key duplicate removal (action, risk, milestone)
   - Cross-type preservation (same key under different entityTypes kept)
   - Composite key coverage (wbs_task, e2e_workflow, arch_node)
   - weekly_focus pass-through (singletons, no dedup)
   - Unkeyed items pass-through (missing/empty primary fields)

3. **ingestion-modal-pass-progress.test.ts** — Pass-aware UI display
   - PASS_LABELS constant existence
   - Pass-index math for progress_pct thresholds (33, 66)
   - Pass-aware message format ("Pass N of 3 — Label (pct%)")
   - Pass label interpolation from PASS_LABELS array
   - Within-pass percentage calculation

## Test Results

```
 Test Files  3 (3 new)
      Tests  21 total
             1 passed (isAlreadyIngested import from lib)
            20 failed (expected RED — implementation not yet built)
   Duration  475ms
```

All core behavioral tests are RED as expected. The single GREEN test confirms that `isAlreadyIngested` is already exported from `lib/extraction-types.ts`, which validates the import path for Wave 1 implementation.

## Key Patterns Applied

### Dynamic Import with Try/Catch
Tests import functions that don't exist yet using dynamic imports with graceful error handling:
```typescript
try {
  const { PASS_PROMPTS } = await import('../document-extraction');
  // assertions here
} catch (error: any) {
  expect(error.message).toContain('PASS_PROMPTS');
  throw new Error('RED: PASS_PROMPTS export does not exist');
}
```

### Source Inspection for UI Components
Following Phase 48/51 patterns, IngestionModal tests read the component source as a string:
```typescript
const modalSrc = readFileSync(
  resolve(__dirname, '../components/IngestionModal.tsx'),
  'utf-8'
);
expect(modalSrc).toContain('PASS_LABELS');
```

### Composite Key Test Coverage
Tests explicitly cover all entity types with composite keys:
- `wbs_task`: title + track
- `e2e_workflow`: workflow_name + team_name
- `arch_node`: node_name + track

## Deviations from Plan

None — plan executed exactly as written.

## Test Coverage Map

| Behavior | Test File | Status |
|----------|-----------|--------|
| Pass prompts isolation | document-extraction-passes.test.ts | RED |
| PDF 3 passes | document-extraction-passes.test.ts | RED |
| Text 3 passes | document-extraction-passes.test.ts | RED |
| Merge all passes | document-extraction-passes.test.ts | RED |
| Global progress scale | document-extraction-passes.test.ts | RED |
| isAlreadyIngested import | document-extraction-passes.test.ts | GREEN |
| Same-type dedup | document-extraction-dedup.test.ts | RED |
| Cross-type preservation | document-extraction-dedup.test.ts | RED |
| Composite keys (wbs_task) | document-extraction-dedup.test.ts | RED |
| Composite keys (e2e_workflow) | document-extraction-dedup.test.ts | RED |
| Composite keys (arch_node) | document-extraction-dedup.test.ts | RED |
| weekly_focus pass-through | document-extraction-dedup.test.ts | RED |
| Unkeyed items pass-through | document-extraction-dedup.test.ts | RED |
| PASS_LABELS constant | ingestion-modal-pass-progress.test.ts | RED |
| Pass-index math (0-33) | ingestion-modal-pass-progress.test.ts | RED |
| Pass-index math (34-66) | ingestion-modal-pass-progress.test.ts | RED |
| Pass message format | ingestion-modal-pass-progress.test.ts | RED |
| Pass label interpolation | ingestion-modal-pass-progress.test.ts | RED |
| Within-pass percentage | ingestion-modal-pass-progress.test.ts | RED |

## Wave 0 Nyquist Compliance

Every behavioral requirement in Phase 52 CONTEXT.md and RESEARCH.md has a corresponding RED test stub:

- **3-pass structure** → PDF + text 3-pass tests
- **Pass-specific prompts** → Pass prompts isolation test
- **Pass-aware progress** → Global scale + UI display tests
- **Intra-batch dedup** → 9 dedup tests covering all entity types
- **Cross-type preservation** → Cross-type test
- **Composite keys** → wbs_task, e2e_workflow, arch_node tests
- **Merge before staging** → Merge test
- **isAlreadyIngested DB dedup** → Import test (GREEN)

## Next Wave

Wave 1 (Plan 02) will implement:
1. `PASS_PROMPTS` constant with 3 pass-specific system prompts
2. 3-pass loop in `documentExtractionJob` for PDF and text paths
3. `deduplicateWithinBatch()` function with composite key support
4. Global progress scale mapping (pass → progress_pct range)
5. Pass results merge before `isAlreadyIngested()` DB sweep

Wave 2 (Plan 03) will implement:
1. `PASS_LABELS` constant in IngestionModal
2. Pass-index calculation from progress_pct thresholds
3. Pass-aware message format string
4. Within-pass percentage calculation

## Commits

| Commit | Task | Files |
|--------|------|-------|
| 8f9028e | Task 1 — Multi-pass structure stubs | document-extraction-passes.test.ts |
| 4b269a3 | Task 2 — Dedup stubs | document-extraction-dedup.test.ts |
| dcdd9e6 | Task 3 — IngestionModal stubs | ingestion-modal-pass-progress.test.ts |

## Self-Check: PASSED

All created files exist:
```bash
✓ worker/jobs/__tests__/document-extraction-passes.test.ts
✓ worker/jobs/__tests__/document-extraction-dedup.test.ts
✓ __tests__/ingestion-modal-pass-progress.test.ts
```

All commits exist:
```bash
✓ 8f9028e: test(52-01): add failing test for multi-pass extraction structure
✓ 4b269a3: test(52-01): add failing test for intra-batch deduplication
✓ dcdd9e6: test(52-01): add failing test for IngestionModal pass progress
```

Test execution verified:
```bash
✓ 21 tests created (20 RED, 1 GREEN)
✓ No syntax errors or import failures
✓ All core behavioral tests RED
✓ isAlreadyIngested import test GREEN (expected)
```
