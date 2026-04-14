---
phase: 61-ingestion-edit-and-move
plan: 02
subsystem: ingestion-ui
tags: [ingest-01, ingest-05, tdd, frontend, validation]
dependency_graph:
  requires:
    - 61-01 (RED test stubs)
  provides:
    - NOTE_RECLASSIFY_PRIMARY_FIELD and NOTE_RECLASSIFY_TARGETS exports
    - Type dropdown for note reclassification
    - onTypeChange prop threading through ExtractionItemRow
    - Field remapping on entityType change in IngestionModal
    - Pre-submit validation gate in ExtractionPreview
  affects:
    - ExtractionItemEditForm (exports + Type dropdown)
    - ExtractionItemRow (key prop + onTypeChange + validation error display)
    - IngestionModal (handleItemChange field remapping)
    - ExtractionPreview (validation gate + error state)
tech_stack:
  added: []
  patterns:
    - TDD Red-Green cycle (2 tasks)
    - React key prop for component remount on state change
    - Primary field derivation from ENTITY_FIELDS[type][0]
    - Set<number> for validation error tracking
key_files:
  created: []
  modified:
    - bigpanda-app/components/ExtractionItemEditForm.tsx
    - bigpanda-app/components/ExtractionItemRow.tsx
    - bigpanda-app/components/IngestionModal.tsx
    - bigpanda-app/components/ExtractionPreview.tsx
    - bigpanda-app/tests/extraction/note-reclassification.test.ts
    - bigpanda-app/tests/extraction/ingestion-edit-propagation.test.ts
decisions:
  - Use native HTML select for Type dropdown (consistent with ConflictControl)
  - key={item.entityType} on ExtractionItemEditForm to force remount and prevent stale draft state
  - Primary field validation uses ENTITY_FIELDS[type][0] (first entry is primary field)
  - Validation errors stored as Set<number> of item indices
  - Clear validation errors on any item change (immediate feedback)
metrics:
  duration_minutes: 5
  tasks_completed: 2
  files_modified: 6
  tests_added: 0
  tests_fixed: 11
  commits: 4
  completed_date: "2026-04-14"
---

# Phase 61 Plan 02: Note Reclassification UI & Validation Summary

**One-liner:** Type dropdown for note reclassification with field remapping (content→primary field) and pre-submit validation gate for empty primary fields on approved items

## Overview

Implemented three front-end changes to drive Plan 01's RED tests GREEN:
1. Exported NOTE_RECLASSIFY_PRIMARY_FIELD and added Type dropdown to ExtractionItemEditForm
2. Threaded onTypeChange through ExtractionItemRow with key prop reset, added field remapping in IngestionModal
3. Added pre-submit validation gate in ExtractionPreview with inline error display

All 11 Wave 0 tests now GREEN. INGEST-01 (edit propagation + validation) and INGEST-05 (note reclassification) complete. INGEST-02 deferred per user decision.

## Tasks Completed

### Task 1: Export reclassification constants and add Type dropdown to ExtractionItemEditForm

**What was done:**
- Exported NOTE_RECLASSIFY_PRIMARY_FIELD (5 entity types: action→description, task→title, milestone→name, decision→decision, risk→description)
- Exported NOTE_RECLASSIFY_TARGETS array (5 entries)
- Added onTypeChange optional prop to ExtractionItemEditForm interface
- Rendered Type dropdown (native select) for notes with 6 options (note + 5 reclassify targets)
- Rendered read-only type label for non-note entities
- TDD: RED phase (test imports that don't exist) → GREEN phase (implementation) → 6/6 tests GREEN

**Files modified:**
- `bigpanda-app/components/ExtractionItemEditForm.tsx`
- `bigpanda-app/tests/extraction/note-reclassification.test.ts`

**Commits:**
- `a11fca3`: test(61-02): add failing test for note reclassification constants
- `07de258`: feat(61-02): implement note reclassification constants and Type dropdown

### Task 2: Thread onTypeChange through ExtractionItemRow and wire reclassification in IngestionModal + add validation gate in ExtractionPreview

**What was done:**

**ExtractionItemRow:**
- Added onTypeChange and hasValidationError props
- Added handleTypeChange to call onTypeChange?.(newType)
- Passed key={item.entityType} to ExtractionItemEditForm (forces remount on type change, prevents stale draft state)
- Passed onTypeChange={handleTypeChange} to ExtractionItemEditForm
- Added inline error indicator: "Required field empty" displayed when hasValidationError is true

**IngestionModal:**
- Imported NOTE_RECLASSIFY_PRIMARY_FIELD and NoteReclassifyTarget
- Updated handleItemChange to detect entityType changes and remap fields:
  - content→primary field (using NOTE_RECLASSIFY_PRIMARY_FIELD mapping)
  - Set edited:true
- Field remapping executed before state update

**ExtractionPreview:**
- Imported ENTITY_FIELDS for primary field derivation
- Added validationErrors state (Set<number> of item indices)
- Added getPrimaryField helper: returns ENTITY_FIELDS[entityType]?.[0]
- Updated handleSubmit with validation gate:
  - Check approved items only
  - Block submit if any approved item has empty primary field
  - Set validationErrors state to show inline errors
- Clear validationErrors on any item change (in onChange and onTypeChange callbacks)
- Pass onTypeChange and hasValidationError to ExtractionItemRow

**TDD:**
- RED phase: Updated tests to import ENTITY_FIELDS and test logic patterns
- GREEN phase: Implemented all three components
- 5/5 tests GREEN (ingestion-edit-propagation.test.ts) + 6/6 tests GREEN (note-reclassification.test.ts) = 11/11 total

**Files modified:**
- `bigpanda-app/components/ExtractionItemRow.tsx`
- `bigpanda-app/components/IngestionModal.tsx`
- `bigpanda-app/components/ExtractionPreview.tsx`
- `bigpanda-app/tests/extraction/ingestion-edit-propagation.test.ts`

**Commits:**
- `831299c`: test(61-02): update edit propagation tests to test implementation logic
- `408d3b9`: feat(61-02): implement onTypeChange threading and validation gate

## Deviations from Plan

None — plan executed exactly as written.

## Key Decisions

1. **Native select for Type dropdown:** Consistent with existing ConflictControl component pattern. No shadcn Select component needed.

2. **key={item.entityType} forces remount:** Prevents stale draft state in ExtractionItemEditForm when entityType changes. React remounts the component, resetting internal useState to new fieldKeys.

3. **Primary field = ENTITY_FIELDS[type][0]:** First entry in field array is always the primary field. Simple, consistent pattern for validation.

4. **Validation errors as Set<number>:** Efficient lookup for hasValidationError prop. Cleared on any item change for immediate user feedback.

5. **Validation gate blocks submit:** Prevents users from submitting items with empty primary fields. Inline error message guides correction.

## Requirements Satisfied

- **INGEST-01** (edit propagation + validation): ✅ Complete
  - edited flag set on save
  - field values round-trip through ReviewItem state
  - pre-submit validation blocks empty primary fields
  - inline error indicators on offending rows

- **INGEST-05** (note reclassification): ✅ Complete
  - Type dropdown for notes (6 options)
  - Field remapping on entityType change (content→primary field)
  - author/date cleared (not in remap, so effectively cleared)
  - key prop reset prevents stale draft state

- **INGEST-02** (move entity to different artifact): ❌ Deferred per user decision (not in scope for this plan)

## Test Results

All 11 Wave 0 tests GREEN:
- `tests/extraction/note-reclassification.test.ts`: 6/6 passing
- `tests/extraction/ingestion-edit-propagation.test.ts`: 5/5 passing

No regressions in modified components. Pre-existing test failures in other modules (unrelated to this plan).

## Self-Check: PASSED

**Files created:** None (all files modified)

**Files modified:** All 6 files exist and contain expected changes
- ✅ `bigpanda-app/components/ExtractionItemEditForm.tsx` (NOTE_RECLASSIFY_PRIMARY_FIELD export + Type dropdown)
- ✅ `bigpanda-app/components/ExtractionItemRow.tsx` (key prop + onTypeChange + hasValidationError)
- ✅ `bigpanda-app/components/IngestionModal.tsx` (field remapping in handleItemChange)
- ✅ `bigpanda-app/components/ExtractionPreview.tsx` (validation gate + error state)
- ✅ `bigpanda-app/tests/extraction/note-reclassification.test.ts` (real imports, 6 tests GREEN)
- ✅ `bigpanda-app/tests/extraction/ingestion-edit-propagation.test.ts` (real imports, 5 tests GREEN)

**Commits exist:**
- ✅ `a11fca3`: test(61-02): add failing test for note reclassification constants
- ✅ `07de258`: feat(61-02): implement note reclassification constants and Type dropdown
- ✅ `831299c`: test(61-02): update edit propagation tests to test implementation logic
- ✅ `408d3b9`: feat(61-02): implement onTypeChange threading and validation gate

## Next Steps

Plan 61-03 (final plan in phase): Entity move UI + API endpoint to reassign entity to different artifact (INGEST-02 implementation).
