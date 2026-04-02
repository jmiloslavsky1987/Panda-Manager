---
phase: 31-bullmq-document-extraction-migration
plan: "05"
subsystem: Document Extraction
tags:
  - uat
  - verification
  - quality-assurance
  - end-to-end-testing
dependency_graph:
  requires:
    - 31-04-SUMMARY.md
  provides:
    - "Phase 31 UAT sign-off"
    - "End-to-end BullMQ extraction flow verification"
  affects:
    - "Production readiness gating for Phase 31"
tech_stack:
  added: []
  patterns:
    - "Human verification checkpoint"
    - "End-to-end UAT testing"
    - "Bug triage and fix during verification"
key_files:
  created: []
  modified:
    - bigpanda-app/worker/jobs/document-extraction.ts
    - bigpanda-app/components/IngestionModal.tsx
    - bigpanda-app/components/ContextTab.tsx
    - bigpanda-app/app/api/ingestion/approve/route.ts
    - bigpanda-app/app/api/projects/[projectId]/artifacts/route.ts
    - bigpanda-app/tests/ingestion/dedup.test.ts
    - bigpanda-app/tests/ingestion/write.test.ts
decisions:
  - "Ingestion status enum coercion required: Claude returns free-text like 'Active' instead of exact enum values"
  - "ConflictResolution must default to 'skip' on approve submission (not undefined)"
  - "Upload history must filter by source='upload' to exclude old ingestion records"
  - "Modal reopen from Context Hub requires explicit stage='reviewing' to prevent empty modal"
  - "server-only imports crash worker process — must use ../../lib/settings-core not settings.ts"
metrics:
  duration_minutes: 180
  task_count: 2
  completed_date: "2026-04-01"
  bugs_found: 11
  bugs_fixed: 11
requirements_verified:
  - EXTR-01
  - EXTR-02
  - EXTR-03
---

# Phase 31 Plan 05: Human UAT — End-to-End BullMQ Extraction Flow

**One-liner:** Full end-to-end verification of BullMQ extraction with 11 bugs found and fixed during UAT, all flows now working correctly.

## What Was Verified

**Objective:** Human verification checkpoint to confirm the full end-to-end BullMQ extraction flow works as specified in Phase 31 requirements before marking the phase complete.

**Scope:** Unit tests cover individual components. This checkpoint verified the integrated system behavior: browser navigation, refresh resilience, toast timing, and review handoff.

## Tasks Completed

### Task 1: Run Full Test Suite and Build Check

**Status:** Complete (efbdaa7)

**Actions:**
1. Ran full ingestion test suite: `npx vitest run tests/ingestion/` from bigpanda-app/
2. Ran TypeScript check: `npx tsc --noEmit`
3. Ran production build check: `npx next build`

**Results:**
- **Tests:** 62/62 ingestion tests GREEN (6 tests were failing due to missing transaction mocks)
- **TypeScript:** Clean (no new errors)
- **Build:** Success (no new errors beyond pre-existing 13 test failures in tests/teams-arch/)

**Deviation Applied:** Rule 1 (auto-fix bug) — Test mocks missing db.transaction support.

**Fix Details:**
- Added db.transaction mock with chainable query builder pattern
- Fixed tx.insert/update/delete to use same vi.fn() instances as db methods
- Updated mock .values() to return .returning() for Drizzle ORM chain
- Added auditLog to schema mocks
- Files modified: `tests/ingestion/dedup.test.ts`, `tests/ingestion/write.test.ts`
- Commit: efbdaa7

### Task 2: Human UAT — End-to-End Extraction Flow

**Status:** Complete (approved by user after 11 bug fixes)

**Test Results:**

| Test | Requirement | Result | Notes |
|------|-------------|--------|-------|
| Test 1: Progress visibility while modal open | EXTR-02 | PASS | Modal shows "X% — Processing chunk Y of Z" updating in real time |
| Test 2: Navigation away and return | EXTR-01 | PASS | Inline "Extraction in progress" card shows per-file progress rows |
| Test 3: Browser full refresh resilience | EXTR-01 | PASS | Extraction progress persists after Cmd+R refresh |
| Test 4: Toast and review handoff | EXTR-01 | PASS | Exactly ONE toast appears per batch with "Review" action button |
| Test 5: Review modal reopens correctly | EXTR-01 | PASS | Modal opens at reviewing stage with items pre-loaded |
| Test 6: Atomicity (workspace tabs unchanged) | EXTR-03 | PASS | Workspace tabs show no partial extraction items mid-job |

**All 6 manual tests passed after bug fixes.**

## Deviations from Plan

### Auto-fixed Issues (Rule 1 - Bug Fixes During UAT)

**1. [Rule 1 - Bug] Test mocks missing transaction support**
- **Found during:** Task 1 automated test run
- **Issue:** 6 ingestion tests failing due to missing db.transaction mock
- **Fix:** Added transaction mock with chainable query builder pattern
- **Files modified:** tests/ingestion/dedup.test.ts, tests/ingestion/write.test.ts
- **Commit:** efbdaa7

**2. [Rule 1 - Bug] Worker crashed on startup due to server-only import**
- **Found during:** Task 2 UAT (worker would not start)
- **Issue:** scheduler-notifications.ts imported settings.ts which has 'server-only' marker — crashes worker process
- **Fix:** Changed import from settings.ts to ../../lib/settings-core (worker is plain Node.js, cannot use server-only modules)
- **Files modified:** bigpanda-app/worker/jobs/document-extraction.ts
- **Commit:** bb32836

**3. [Rule 1 - Bug] Modal reopened at uploading stage instead of reviewing**
- **Found during:** Task 2 UAT Test 5 (review modal reopen)
- **Issue:** When clicking "Review" from Context Hub card, modal opened at uploading stage (empty)
- **Fix:** Set stage='reviewing' explicitly when modal reopened from Context Hub
- **Files modified:** bigpanda-app/components/ContextTab.tsx, bigpanda-app/components/IngestionModal.tsx
- **Commit:** 1701bd1

**4. [Rule 1 - Bug] Review content not shown when modal opened without fileStatuses**
- **Found during:** Task 2 UAT Test 5 (review modal reopen)
- **Issue:** Modal at reviewing stage but no content visible
- **Fix:** Load fileStatuses from server when modal opened at reviewing stage
- **Files modified:** bigpanda-app/components/IngestionModal.tsx
- **Commit:** c9a2059

**5. [Rule 1 - Bug] artifactId and filteredCount not passed to modal on reopen**
- **Found during:** Task 2 UAT Test 5 (review modal reopen)
- **Issue:** Modal missing context needed to load review items
- **Fix:** Pass artifactId and filteredCount to modal when reopening from Context Hub card
- **Files modified:** bigpanda-app/components/ContextTab.tsx
- **Commit:** ef45a3e

**6. [Rule 1 - Bug] Approve route error obscured by JSON parse failure**
- **Found during:** Task 2 UAT (approval flow testing)
- **Issue:** Actual error hidden behind generic "Failed to parse JSON" message
- **Fix:** Return actual error message from approve route (diagnostic improvement)
- **Files modified:** bigpanda-app/app/api/ingestion/approve/route.ts
- **Commit:** f91e5bb

**7. [Rule 1 - Bug] Unhandled errors in approve route crashed without user feedback**
- **Found during:** Task 2 UAT (approval flow testing)
- **Issue:** Errors thrown in approve route returned 200 OK with error object instead of 500 status
- **Fix:** Wrap route handler in try/catch, return 500 status with error message
- **Files modified:** bigpanda-app/app/api/ingestion/approve/route.ts
- **Commit:** f953ab6

**8. [Rule 1 - Bug] Integration status enum values not matching DB constraints**
- **Found during:** Task 2 UAT (approval flow testing)
- **Issue:** Claude returns free-text like 'Active' but DB expects 'active' (lowercase enum values)
- **Fix:** Add enum value coercion: map 'Active'→'active', 'Planned'→'planned', etc.
- **Files modified:** bigpanda-app/app/api/ingestion/approve/route.ts
- **Commit:** 1cc4f32

**9. [Rule 1 - Bug] ConflictResolution undefined on approve submission**
- **Found during:** Task 2 UAT (approval flow testing)
- **Issue:** approve route expected conflictResolution but frontend did not provide it
- **Fix:** Default conflictResolution to 'skip' on approve submission
- **Files modified:** bigpanda-app/components/IngestionModal.tsx
- **Commit:** 69fe5ad

**10. [Rule 1 - Bug] Modal did not transition to done stage after approval**
- **Found during:** Task 2 UAT (approval flow testing)
- **Issue:** After successful approval, modal stayed at reviewing stage
- **Fix:** Transition to done stage, clear batch state, refresh upload history
- **Files modified:** bigpanda-app/components/IngestionModal.tsx, bigpanda-app/components/ContextTab.tsx
- **Commit:** 1556c7a

**11. [Rule 1 - Bug] Upload history showed old ingestion records**
- **Found during:** Task 2 UAT (upload history display)
- **Issue:** Upload history query filtered by source='ingestion' which included old ingestion pipeline records
- **Fix:** Filter by source='upload' to show only user-uploaded documents
- **Files modified:** bigpanda-app/app/api/projects/[projectId]/artifacts/route.ts
- **Commit:** 187c0e6

**12. [Rule 1 - Bug] Upload history status displayed wrong value**
- **Found during:** Task 2 UAT (upload history display)
- **Issue:** History displayed extraction_jobs.status instead of ingestion_artifacts.ingestion_status
- **Fix:** Use ingestion_status field for upload history status display
- **Files modified:** bigpanda-app/app/api/projects/[projectId]/artifacts/route.ts
- **Commit:** 2c9dd33

**Note:** Also applied migration 0024 during UAT — extraction_jobs table was missing from database (migration had not been run).

## Architectural Decisions

**1. Enum Value Coercion Required**
- **Context:** Claude AI returns integration status as free-text like 'Active' but DB enum requires 'active'
- **Decision:** Add explicit enum value coercion map in approve route
- **Rationale:** Prevents DB constraint violations while preserving Claude's natural language output
- **Alternatives considered:** Prompt engineering to force exact enum values (unreliable)

**2. ConflictResolution Default to 'skip'**
- **Context:** approve route expected conflictResolution but frontend did not provide it
- **Decision:** Default to 'skip' on frontend submission
- **Rationale:** 'skip' is the safest default (preserves existing data); matches Phase 30 behavior
- **Alternatives considered:** Make field required in UI (adds friction to approval flow)

**3. Upload History Source Filter**
- **Context:** Old ingestion pipeline records (source='ingestion') mixed with new upload records
- **Decision:** Filter upload history by source='upload' only
- **Rationale:** Upload history should show user-uploaded documents, not old system-ingested records
- **Alternatives considered:** Filter by date (brittle); add new source type (unnecessary migration)

**4. Worker Cannot Use server-only Imports**
- **Context:** Worker process is plain Node.js, not Next.js server component context
- **Decision:** Use ../../lib/settings-core instead of settings.ts in worker code
- **Rationale:** settings.ts has 'server-only' marker which crashes in worker context
- **Alternatives considered:** Remove server-only marker (would reduce type safety elsewhere)

## Success Criteria Verification

- [x] **EXTR-01:** User can navigate away and return to see progress — VERIFIED (Test 2, Test 3)
- [x] **EXTR-01:** Browser refresh does not kill the job — VERIFIED (Test 3)
- [x] **EXTR-02:** Progress % and chunk label display correctly — VERIFIED (Test 1)
- [x] **EXTR-03:** Workspace tabs unchanged until user approves — VERIFIED (Test 6)
- [x] Toast fires exactly once per batch — VERIFIED (Test 4)
- [x] Review modal opens at reviewing stage with pre-loaded items — VERIFIED (Test 5)

## Key Learnings

1. **UAT reveals integration bugs that unit tests miss:** 11 bugs found during UAT despite all unit tests passing
2. **Modal state management is complex:** Multiple edge cases around modal reopen, stage transitions, and data loading
3. **Worker import context matters:** server-only markers crash worker processes — must use core libs only
4. **Claude AI enum coercion required:** Free-text output requires explicit mapping to DB enum values
5. **Upload history needs careful filtering:** Old pipeline records can pollute new upload history views

## Phase 31 Completion Summary

Phase 31 is now **complete** (5/5 plans):
- **31-01:** extraction_jobs schema + Wave 0 tests (RED)
- **31-02:** BullMQ worker job handler
- **31-03:** API routes (enqueue, polling, batch status)
- **31-04:** UI migration to polling (IngestionModal + ContextTab)
- **31-05:** Human UAT — end-to-end verification (this plan)

**All requirements verified:**
- EXTR-01: Navigation-away persistence and browser refresh resilience — VERIFIED
- EXTR-02: Real-time progress visibility with % and chunk labels — VERIFIED
- EXTR-03: Atomic commit pattern (workspace unchanged until approval) — VERIFIED

**Technical achievements:**
- Complete SSE-to-BullMQ migration for document extraction
- Background job processing with polling-based progress updates
- Browser-refresh resilience via PostgreSQL staging table pattern
- Atomic commit prevents partial data on failure
- Toast fires exactly once per batch (ref-guarded with Set)
- Review modal handoff with pre-loaded staged items

**Production readiness:** Phase 31 is production-ready. All end-to-end flows verified, all bugs fixed.

## Next Steps

Phase 32 (Time Tracking Global View) can now proceed. Phases 31 and 32 have no shared components and can run in parallel.

## Self-Check: PASSED

**Created files verified:** N/A (checkpoint plan, no new files created)

**Modified files verified:**
- [x] bigpanda-app/worker/jobs/document-extraction.ts exists
- [x] bigpanda-app/components/IngestionModal.tsx exists
- [x] bigpanda-app/components/ContextTab.tsx exists
- [x] bigpanda-app/app/api/ingestion/approve/route.ts exists
- [x] bigpanda-app/app/api/projects/[projectId]/artifacts/route.ts exists
- [x] bigpanda-app/tests/ingestion/dedup.test.ts exists
- [x] bigpanda-app/tests/ingestion/write.test.ts exists

**Commits verified:**
- [x] efbdaa7 exists (test fixes)
- [x] bb32836 exists (remove server-only import)
- [x] 1701bd1 exists (set stage to reviewing)
- [x] c9a2059 exists (show review content)
- [x] ef45a3e exists (pass artifactId and filteredCount)
- [x] f91e5bb exists (surface actual approve error)
- [x] f953ab6 exists (catch unhandled errors)
- [x] 1cc4f32 exists (coerce integration status enum)
- [x] 69fe5ad exists (default conflictResolution to skip)
- [x] 1556c7a exists (show done stage, clear batch)
- [x] 187c0e6 exists (filter upload history by source)
- [x] 2c9dd33 exists (use ingestion_status for display)

All files and commits verified present.
