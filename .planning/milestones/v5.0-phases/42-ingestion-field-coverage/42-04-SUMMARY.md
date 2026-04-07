---
phase: 42-ingestion-field-coverage
plan: 04
subsystem: ingestion-pipeline
tags: [extraction, llm-prompt, ui-form-fields, field-coverage]
dependencies:
  requires: [42-01]
  provides: [extended-extraction-prompt, approval-form-field-coverage]
  affects: [document-extraction, approval-cards]
tech_stack:
  added: []
  patterns: [llm-prompt-engineering, test-driven-development]
key_files:
  created: []
  modified:
    - bigpanda-app/worker/jobs/document-extraction.ts
    - bigpanda-app/components/ExtractionItemEditForm.tsx
    - bigpanda-app/tests/ingestion/extraction-job.test.ts
decisions:
  - Export EXTRACTION_SYSTEM constant for test verification (enables prompt content testing)
  - Fixed test imports to use ES6 import instead of try/catch require pattern (proper module loading in Vitest)
metrics:
  duration_seconds: 161
  duration_minutes: 2
  completed_at: "2026-04-07T17:06:43Z"
  tasks_completed: 2
  commits: 2
  tests_added: 0
  tests_fixed: 8
---

# Phase 42 Plan 04: Extraction Prompt Field Coverage Summary

Extended LLM extraction prompt in document-extraction.ts to instruct Claude to extract all new fields (task dates, FK name references, priority, owner for milestones, notes/type for actions). Updated ENTITY_FIELDS in ExtractionItemEditForm.tsx so all new fields appear in approval card edit forms.

## Objective

Make the extraction pipeline produce the data that the approve route (Plans 02 and 03) now knows how to write. Without this, the approve route improvements would be inert — no new data would arrive.

## Tasks Completed

### Task 1: Extend extraction system prompt and export EXTRACTION_SYSTEM constant (TDD)

**Commit:** 7681eb8

**Files modified:**
- bigpanda-app/worker/jobs/document-extraction.ts
- bigpanda-app/tests/ingestion/extraction-job.test.ts

**Changes:**
- Exported EXTRACTION_SYSTEM constant (changed from `const` to `export const`)
- Extended task entity guidance to include: description, start_date (ISO date or null), due_date (ISO date or null), priority ("high"/"medium"/"low" or null), milestone_name (verbatim name or null), workstream_name (verbatim name or null)
- Extended milestone entity guidance to include: owner (verbatim name or null)
- Extended action entity guidance to include: notes (additional notes or null), type (category or null)
- Added verbatim extraction instruction: "Extract all names (owners, milestone names, workstream names) exactly as they appear in the document. Do not abbreviate, normalize, or infer names. Use null for any field not explicitly present in the document."
- Fixed test imports to use ES6 import pattern instead of try/catch require

**TDD Flow:**
- RED: 8 tests failing (EXTRACTION_SYSTEM not exported, tests got empty string)
- GREEN: Fixed imports, all 13 tests passing
- No refactoring needed

**Test results:** 13/13 passed in extraction-job.test.ts

### Task 2: Update ENTITY_FIELDS in ExtractionItemEditForm.tsx for task, milestone, and action

**Commit:** e2affba

**Files modified:**
- bigpanda-app/components/ExtractionItemEditForm.tsx

**Changes:**
- task: changed from 4 fields to 10 fields — added: description, start_date, due_date, milestone_name, workstream_name, priority
- milestone: changed from 3 fields to 4 fields — added: owner
- action: changed from 4 fields to 6 fields — added: notes, type
- No changes to risk, decision, stakeholder, architecture, history, businessOutcome, team (per plan requirements)

**Impact:** All new fields will now appear in the approval card edit forms, enabling human review and editing before approval.

**Verification:** TypeScript compilation clean for ExtractionItemEditForm.tsx (no errors introduced by this file)

## Verification

- ✅ EXTRACTION_SYSTEM is a named export in document-extraction.ts
- ✅ Task entity guidance in prompt lists: description, start_date, due_date, priority, milestone_name, workstream_name (with verbatim instruction for names)
- ✅ Milestone entity guidance lists: owner
- ✅ Action entity guidance lists: notes, type
- ✅ ENTITY_FIELDS task array in ExtractionItemEditForm.tsx includes 10 fields
- ✅ ENTITY_FIELDS milestone array includes 'owner' (4 fields total)
- ✅ ENTITY_FIELDS action array includes 'notes' and 'type' (6 fields total)
- ✅ All Wave 0 extraction-job.test.ts cases GREEN (13/13 passed)
- ⚠️ TypeScript compilation has errors in approve/route.ts from Plan 42-03 (out of scope — pre-existing)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test import pattern for EXTRACTION_SYSTEM**
- **Found during:** Task 1 GREEN phase
- **Issue:** Tests using try/catch require() pattern couldn't load exported EXTRACTION_SYSTEM, tests remained RED despite export being added
- **Fix:** Changed from require() with try/catch to ES6 import statement at top of test file
- **Files modified:** bigpanda-app/tests/ingestion/extraction-job.test.ts
- **Commit:** 7681eb8 (included in Task 1 commit)

## Out-of-Scope Observations

**Pre-existing TypeScript errors in approve/route.ts:**
- 16 TypeScript errors in app/api/ingestion/approve/route.ts related to mergeItem signature changes (unresolvedMilestones/unresolvedWorkstreams return type)
- 4 TypeScript errors in audit test files (transaction mock type incompatibility)
- These errors are from Plan 42-03 work (approve route enhancements)
- Not introduced by Plan 42-04 changes
- Deferred to Plan 42-03 completion or Plan 42-05 cleanup

**Test failures in ingestion suite:**
- 13 failed tests in tests/ingestion/write.test.ts and approve-routes.test.ts
- Related to unresolvedRefs field and cross-entity resolution logic
- Known issue documented in STATE.md under "Blockers/Concerns" from Plan 42-02
- Not caused by Plan 42-04 changes (extraction prompt and form fields)
- Tests specific to extraction-job.test.ts (Plan 42-04 scope) all passing (13/13)

## Key Links Established

1. **EXTRACTION_SYSTEM → Claude API → extractedItems.fields**
   - Pattern: LLM prompt engineering
   - Flow: EXTRACTION_SYSTEM string → Anthropic Claude API structured output → staged_items_json in extraction_jobs table
   - Impact: Claude will now extract all new fields when processing documents

2. **ENTITY_FIELDS → Approval card rendering**
   - Pattern: Field metadata drives form generation
   - Flow: ENTITY_FIELDS[item.entityType] → ExtractionItemEditForm field loop → input elements in approval card
   - Impact: All new fields visible and editable in approval UI before writing to workspace tables

## Dependencies

**Requires:**
- Plan 42-01: Schema and migration for new fields (milestone_id, workstream_id, priority columns on tasks; owner on milestones; notes/type on actions)

**Provides:**
- Extended extraction prompt that produces new field data
- Approval form field coverage for all new fields

**Affects:**
- Document extraction job: will now extract additional fields from uploaded documents
- Approval cards: will now display all new fields for human review/edit
- Plan 42-03 and 42-05: approve route will receive and can write all new field data

## Success Criteria Met

- [x] All tasks executed (2/2)
- [x] Each task committed individually
- [x] EXTRACTION_SYSTEM exported and testable
- [x] Task entity guidance includes 6 new fields
- [x] Milestone entity guidance includes owner
- [x] Action entity guidance includes notes, type
- [x] ENTITY_FIELDS updated for task (10 fields), milestone (4 fields), action (6 fields)
- [x] Extraction-job.test.ts all GREEN (13/13)
- [x] TypeScript compilation clean for modified files (errors in approve/route.ts are out of scope)

## Next Steps

1. **Plan 42-03:** Complete approve route enhancements (fix TypeScript errors, implement cross-entity resolution)
2. **Plan 42-05:** Integration testing and E2E verification of full ingestion pipeline with new fields
3. **Future:** Live ingestion test with real document upload → extraction → approval → verify all new fields written to DB

## Self-Check

Verifying all claimed artifacts exist and commits are present:

**Files modified:**
- [✓] bigpanda-app/worker/jobs/document-extraction.ts
- [✓] bigpanda-app/components/ExtractionItemEditForm.tsx
- [✓] bigpanda-app/tests/ingestion/extraction-job.test.ts

**Commits:**
- [✓] 7681eb8: Task 1 - extend extraction prompt with new fields and export EXTRACTION_SYSTEM
- [✓] e2affba: Task 2 - update ENTITY_FIELDS for task, milestone, and action entities

**Test verification:**
```bash
cd bigpanda-app && npx vitest run tests/ingestion/extraction-job.test.ts
# Result: 13/13 tests passed
```

**TypeScript check:**
```bash
cd bigpanda-app && npx tsc --noEmit 2>&1 | grep ExtractionItemEditForm
# Result: No errors (empty output)
```

## Self-Check: PASSED

All files exist. All commits present in git log. All Task 1 tests GREEN. Task 2 introduces no TypeScript errors in modified file.
