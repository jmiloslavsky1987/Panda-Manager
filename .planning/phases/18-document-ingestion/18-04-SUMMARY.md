---
phase: 18-document-ingestion
plan: 04
subsystem: api
tags: [vitest, drizzle, nextjs, tdd, ingestion, conflict-detection, zod]

# Dependency graph
requires:
  - phase: 18-document-ingestion/18-02
    provides: upload route + artifact DB records
  - phase: 18-document-ingestion/18-03
    provides: ExtractionItem type, isAlreadyIngested, extract route

provides:
  - POST /api/ingestion/approve route: writes approved items to entity tables with source attribution, detects conflicts (409), handles skip/replace/merge resolutions, updates ingestion_log_json
  - findConflict(): server-authoritative conflict detection for all 10 entity types
  - insertItem()/mergeItem()/deleteItem(): entity write helpers used by approve handler

affects:
  - 18-05 (preview UI triggers approve route on user confirmation)
  - 18-06 (source badge queries use source_artifact_id FK written here)
  - 22-source-badges-audit-log (ingestion_log_json shape established here)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zod v4 z.record requires two args: z.record(z.string(), z.string()) — single-arg form broken in v4"
    - "vi.resetAllMocks() in beforeEach (not vi.clearAllMocks()) — clearAllMocks does not reset mockReturnValue implementations; state leaks across tests"
    - "Append-only DB types (key_decisions, engagement_history): auto-skip on conflict in approve handler — no replace/merge allowed per DB trigger constraint"
    - "synthetic external_id for ingestion inserts: ING-{TYPE}-{artifactId}-{timestamp} — actions/risks/milestones have external_id NOT NULL"
    - "team entityType maps to focus_areas table (consistent with 18-03 extract route decision)"

key-files:
  created:
    - bigpanda-app/app/api/ingestion/approve/route.ts
  modified:
    - bigpanda-app/tests/ingestion/write.test.ts
    - bigpanda-app/tests/ingestion/dedup.test.ts

key-decisions:
  - "Zod v4 z.record API: single-arg z.record(z.string()) crashes at runtime with '_zod' undefined error — two-arg form z.record(z.string(), z.string()) required"
  - "vi.resetAllMocks() vs vi.clearAllMocks(): clearAllMocks only clears call history/instances; mockReturnValue implementations persist across tests causing ING-12 false positive — resetAllMocks required"
  - "team entityType uses focusAreas table (not teamOnboardingStatus): teamOnboardingStatus lacks source_artifact_id/ingested_at columns; focusAreas has them and is the correct mapping established in 18-03"
  - "Append-only conflict handling: key_decisions and engagement_history are protected by DB append-only triggers — approve route auto-skips these on conflict instead of blocking with 409"

# Metrics
duration: 5min
completed: 2026-03-26
---

# Phase 18 Plan 04: Approve API Route Summary

**POST /api/ingestion/approve — closes the ingestion pipeline: writes user-approved items to entity tables with full source attribution (source='ingestion', source_artifact_id, ingested_at), server-side conflict detection with 409 return, skip/replace/merge resolution paths, and ingestion_log_json audit update**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-26T06:39:28Z
- **Completed:** 2026-03-26T06:43:53Z
- **Tasks:** 1 (TDD: RED + GREEN commits)
- **Files modified:** 3 (1 created, 2 updated)

## Accomplishments

- Created `bigpanda-app/app/api/ingestion/approve/route.ts` with full POST handler
- Zod validation of ApproveRequest (artifactId, projectId, items[], totalExtracted)
- `findConflict()`: server-authoritative conflict check using same dedup key as extract route, covering all 10 entity types
- Conflict resolution paths: 409 (no resolution provided), skip, replace (delete+insert), merge (update)
- Append-only types (decision, history) auto-skip on conflict — consistent with DB trigger constraints
- `insertItem()`: full entity insert for all 10 entity types with source attribution
- `mergeItem()` / `deleteItem()`: update and delete helpers for resolve paths
- Artifact `ingestion_log_json` updated after all writes with filename, uploaded_at, items_extracted, items_approved, items_rejected, completed_at
- `write.test.ts`: 5 real assertions (ING-09 source attribution x3, ING-10 log update x2)
- `dedup.test.ts`: 3 new approve-route conflict tests (409, skip, replace) + 5 existing ING-12 tests — 8 total
- All 13 tests GREEN; approve route has 0 TypeScript errors

## Task Commits

Each task was committed atomically:

1. **RED: add failing test stubs for approve route write and conflict behavior** - `533d33a` (test)
2. **GREEN: implement /api/ingestion/approve route** - `5fc5aff` (feat)

**Plan metadata:** (docs commit — see final commit)

## Files Created/Modified

- `bigpanda-app/app/api/ingestion/approve/route.ts` — POST handler: validates, conflict-checks, writes entities, updates artifact log
- `bigpanda-app/tests/ingestion/write.test.ts` — upgraded from 5 stubs to real ING-09/ING-10 assertions
- `bigpanda-app/tests/ingestion/dedup.test.ts` — added 3 ING-08 approve-route conflict tests; kept ING-11/ING-12 tests intact

## Decisions Made

- **Zod v4 z.record API:** `z.record(z.string())` crashes at runtime in Zod v4 with `Cannot read properties of undefined (reading '_zod')`. Two-arg form `z.record(z.string(), z.string())` is required.
- **vi.resetAllMocks() vs vi.clearAllMocks():** `vi.clearAllMocks()` does not reset `mockReturnValue` implementations. When test N sets `.mockReturnValue({...conflictRows...})`, test N+1 inherits that implementation even with clearAllMocks. `vi.resetAllMocks()` is required to prevent cross-test contamination.
- **team → focusAreas table:** `teamOnboardingStatus` table lacks `source_artifact_id` and `ingested_at` columns. `focusAreas` has both and is the established mapping from 18-03 SUMMARY. Consistent throughout approve and extract routes.
- **Append-only auto-skip:** `key_decisions` and `engagement_history` tables have DB-level append-only triggers. The approve route auto-skips these on conflict (rather than returning 409) to avoid blocking the user on records that cannot be updated anyway.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4 z.record single-arg crash**
- **Found during:** GREEN phase (first test run)
- **Issue:** `z.record(z.string())` raises `TypeError: Cannot read properties of undefined (reading '_zod')` in Zod v4.3.6 at safeParse time
- **Fix:** Changed to `z.record(z.string(), z.string())` — two-arg form accepted by Zod v4
- **Files modified:** `bigpanda-app/app/api/ingestion/approve/route.ts`
- **Commit:** 5fc5aff

**2. [Rule 1 - Bug] vi.clearAllMocks() mock state leak**
- **Found during:** GREEN phase (ING-12 net-new test failed after ING-08 conflict tests)
- **Issue:** `vi.clearAllMocks()` doesn't reset `mockReturnValue` implementations — the conflict mock from the ING-08 replace test (returning `[{id:99}]`) persisted into the ING-12 test, causing `isAlreadyIngested` to incorrectly return `true`
- **Fix:** Changed `beforeEach` to use `vi.resetAllMocks()` which resets all mock implementations
- **Files modified:** `bigpanda-app/tests/ingestion/dedup.test.ts`
- **Commit:** 5fc5aff

---

**Total deviations:** 2 auto-fixed (Rule 1 — bugs causing test failures)
**Impact on plan:** Both fixes were necessary for correctness. No scope creep.

## Issues Encountered

- Pre-existing TypeScript errors in `lib/yaml-export.ts` and worker files — unchanged, out of scope for this plan.

## Self-Check: PASSED

- FOUND: bigpanda-app/app/api/ingestion/approve/route.ts
- FOUND: bigpanda-app/tests/ingestion/write.test.ts
- FOUND: bigpanda-app/tests/ingestion/dedup.test.ts
- FOUND commit 533d33a: test(18-04): add RED test assertions
- FOUND commit 5fc5aff: feat(18-04): implement /api/ingestion/approve route

---
*Phase: 18-document-ingestion*
*Completed: 2026-03-26*
