---
phase: 61-ingestion-edit-and-move
plan: 01
subsystem: ingestion
tags: [tdd, red-stubs, test-contracts, ingest-01, ingest-05]
dependency_graph:
  requires: []
  provides: [test-contracts-edit-propagation, test-contracts-note-reclassification]
  affects: [ingestion-modal, extraction-item-edit-form, extraction-preview]
tech_stack:
  added: []
  patterns: [tdd-red-phase, behavioral-test-stubs, force-fail-pattern]
key_files:
  created:
    - bigpanda-app/tests/extraction/ingestion-edit-propagation.test.ts
    - bigpanda-app/tests/extraction/note-reclassification.test.ts
    - bigpanda-app/app/api/__tests__/ingestion-approve-reclassify.test.ts
  modified: []
decisions:
  - Use explicit `expect(true).toBe(false)` to force RED status until Plan 02 implements
  - Separate test files by requirement (INGEST-01 vs INGEST-05) for clear traceability
  - Baseline GREEN tests for approve route confirm backend already handles reclassification
metrics:
  duration_seconds: 249
  tasks_completed: 1
  files_created: 3
  test_delta: "+14 RED, +3 GREEN"
completed_date: "2026-04-14"
---

# Phase 61 Plan 01: RED Test Stubs for Edit Propagation and Note Reclassification

**One-liner:** TDD Wave 0 test contracts defining exact behaviors for ingestion edit propagation (INGEST-01) and note reclassification field mapping (INGEST-05)

## What Was Built

Created three test files establishing behavioral contracts for Plan 02 implementation:

### 1. ingestion-edit-propagation.test.ts (6 RED tests)
Tests for INGEST-01 edit propagation and pre-submit validation:
- **edited flag:** onChange receives `edited: true` after save
- **field round-trip:** Updated fields survive ReviewItem state merge
- **validation:** Empty primary fields on approved items block submit
- **validation:** Unapproved items excluded from validation checks
- **PRIMARY_FIELDS:** action → description, task → title mappings

### 2. note-reclassification.test.ts (8 RED tests)
Tests for INGEST-05 content→primary field mapping:
- **NOTE_RECLASSIFY_PRIMARY_FIELD mappings:** 5 tests asserting content maps to correct primary field for each reclassification target (action, task, milestone, decision, risk)
- **field mapping logic:** Content value becomes primary field value, note-specific fields (author, date) are cleared
- **NOTE_RECLASSIFY_TARGETS array:** Exactly 5 entries for supported reclassification targets

### 3. ingestion-approve-reclassify.test.ts (3 GREEN tests)
Baseline verification that approve route already handles reclassified notes:
- entityType:action routes correctly (written >= 1)
- entityType:task routes correctly (written >= 1)
- entityType:note routes correctly (baseline)

## Test Results

**RED status achieved:** 14 failing tests (expected behavioral gaps)
**GREEN baseline:** 3 passing tests (confirm backend ready)

```
Test Files  2 failed | 1 passed (3)
Tests       14 failed | 3 passed (17)
```

**Non-regression verified:**
- Baseline (without new tests): 121 failed, 716 passed
- With new tests: 135 failed (+14), 719 passed (+3)
- Delta matches exactly: No existing tests broken

## Implementation Notes

### RED Pattern: Force-Fail Until Implementation
Used explicit `expect(true).toBe(false)` with TODO comments:
```typescript
// RED: Force failure
expect(true).toBe(false) // TODO Plan 02: Replace with real implementation
```

This ensures tests fail for behavioral reasons (missing functionality), not syntax/import errors.

### Test Organization
- **Pure unit tests:** ingestion-edit-propagation.test.ts (no component imports, tests logic in isolation)
- **Export contract tests:** note-reclassification.test.ts (asserts on constants that don't exist yet)
- **Integration baseline:** ingestion-approve-reclassify.test.ts (confirms backend routing is correct)

### Contracts Defined for Plan 02

Plan 02 must export from IngestionModal:
```typescript
export const PRIMARY_FIELDS: Record<string, string>
export function validateApprovedItems(items: ReviewItem[]): number[]
```

Plan 02 must export from ExtractionItemEditForm:
```typescript
export const NOTE_RECLASSIFY_PRIMARY_FIELD: Record<string, string> = {
  action: 'description',
  task: 'title',
  milestone: 'name',
  decision: 'decision',
  risk: 'description',
}
export const NOTE_RECLASSIFY_TARGETS = ['action', 'task', 'milestone', 'decision', 'risk']
```

Plan 02 must implement reclassification logic in ExtractionPreview:
- Map `note.fields.content` → `targetEntity.fields[PRIMARY_FIELD]`
- Clear note-specific fields (author, date) after reclassification
- Update `entityType` to target entity type

## Deviations from Plan

None - plan executed exactly as written.

## Verification

### Test Execution
```bash
cd bigpanda-app && npx vitest run tests/extraction/ingestion-edit-propagation.test.ts tests/extraction/note-reclassification.test.ts app/api/__tests__/ingestion-approve-reclassify.test.ts
```

**Expected:**
- ingestion-edit-propagation.test.ts: 6 failed (RED)
- note-reclassification.test.ts: 8 failed (RED)
- ingestion-approve-reclassify.test.ts: 3 passed (GREEN baseline)

**Actual:** Matches exactly ✓

### Non-Regression
Full suite delta: +14 failed, +3 passed (expected: new RED stubs + GREEN baseline)

## Commits

- **201fb36:** test(61-01): add RED test stubs for INGEST-01 and INGEST-05

## Next Steps

**Plan 02 (Wave 1 Implementation):**
1. Export PRIMARY_FIELDS from IngestionModal
2. Implement validateApprovedItems function
3. Export NOTE_RECLASSIFY_PRIMARY_FIELD and NOTE_RECLASSIFY_TARGETS from ExtractionItemEditForm
4. Implement reclassification logic in ExtractionPreview
5. Wire edited flag propagation in ExtractionItemRow.handleSave
6. Drive all 14 RED tests to GREEN
7. Human verification checkpoint: Test edit + reclassify workflow in UI

## Self-Check: PASSED

Verifying created files exist:
- ✓ FOUND: ingestion-edit-propagation.test.ts
- ✓ FOUND: note-reclassification.test.ts
- ✓ FOUND: ingestion-approve-reclassify.test.ts

Verifying commit exists:
- ✓ FOUND: 201fb36

All files and commits verified.
