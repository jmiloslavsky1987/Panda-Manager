---
phase: 19-external-discovery-scan
plan: 01
subsystem: testing
tags: [vitest, tdd, discovery, postgres, drizzle]

# Dependency graph
requires:
  - phase: 17-schema-extensions
    provides: discoveryItems table + discoveryItemStatusEnum in schema.ts
  - phase: 18-document-ingestion
    provides: Wave 0 stub pattern (expect(false, 'stub').toBe(true)) and vitest import conventions
provides:
  - 15 RED test stubs across 5 discovery test files (scan, queue, approve, dismiss, dedup)
  - Migration 0013 extending discovery_items with source_excerpt + scan_id columns
  - Updated schema.ts discoveryItems table with both new columns
affects:
  - 19-02 through 19-N (all Wave 1+ discovery plans go GREEN against these stubs)
  - 22-source-badges-audit-log (uses source attribution patterns defined in approve stubs)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 TDD stub: import { describe, it, expect } from 'vitest' + expect(false, 'stub: DISC-XX — desc').toBe(true)"
    - "Discovery dedup pattern: scan_id groups items from same scan run; dismissed items not re-inserted"
    - "Source attribution: approved discovery items written with source='discovery', no source_artifact_id"

key-files:
  created:
    - bigpanda-app/tests/discovery/scan.test.ts
    - bigpanda-app/tests/discovery/queue.test.ts
    - bigpanda-app/tests/discovery/approve.test.ts
    - bigpanda-app/tests/discovery/dismiss.test.ts
    - bigpanda-app/tests/discovery/dedup.test.ts
    - bigpanda-app/db/migrations/0013_discovery_source_excerpt.sql
  modified:
    - bigpanda-app/db/schema.ts

key-decisions:
  - "Wave 0 stub imports: vitest globals=false requires explicit import { expect } from 'vitest' — no production module imports"
  - "source_excerpt stores raw text snippet from source that triggered discovery; scan_id groups all items from one scan run"
  - "Migration 0013 uses IF NOT EXISTS for idempotent schema extension (consistent with Phase 17 pattern)"

patterns-established:
  - "Discovery test stubs: must import { describe, it, expect } from 'vitest' explicitly (globals=false in vitest.config.ts)"
  - "Stub pattern: expect(false, 'stub: DISC-XX — description').toBe(true) — fails RED with assertion error not ReferenceError"

requirements-completed: [DISC-05, DISC-06, DISC-07, DISC-08, DISC-09, DISC-11, DISC-14, DISC-15, DISC-16]

# Metrics
duration: 8min
completed: 2026-03-26
---

# Phase 19 Plan 01: External Discovery Scan — Wave 0 TDD Summary

**15 RED test stubs across 5 discovery behavior contracts + migration 0013 adding source_excerpt + scan_id to discovery_items**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-26T18:28:01Z
- **Completed:** 2026-03-26T18:36:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Created 5 RED test files with 15 stubs covering all DISC-05/06/07/08/09/11/14/15/16 requirements
- All 15 stubs fail with proper assertion errors (not import errors) — verified by vitest run
- Migration 0013 adds source_excerpt and scan_id to discovery_items with IF NOT EXISTS (idempotent)
- schema.ts discoveryItems updated with both new nullable columns in correct position

## Task Commits

Each task was committed atomically:

1. **Task 1: RED test stubs for all discovery behaviors** - `b7756a6` (test)
2. **Task 2: Migration 0013 + schema.ts update** - `26e3e15` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `bigpanda-app/tests/discovery/scan.test.ts` - DISC-05/06/07/08/09 stubs: scan sources + Claude analysis shape
- `bigpanda-app/tests/discovery/queue.test.ts` - DISC-11/16 stubs: queue display fields + no-expiry pending
- `bigpanda-app/tests/discovery/approve.test.ts` - DISC-14 stubs: approve writes entity table with source=discovery
- `bigpanda-app/tests/discovery/dismiss.test.ts` - DISC-15 stubs: dismiss sets status=dismissed, history, queue exclusion
- `bigpanda-app/tests/discovery/dedup.test.ts` - dedup stubs: dismissed not re-inserted, scan_id grouping
- `bigpanda-app/db/migrations/0013_discovery_source_excerpt.sql` - ALTER TABLE with 2 IF NOT EXISTS columns
- `bigpanda-app/db/schema.ts` - discoveryItems extended with source_excerpt + scan_id

## Decisions Made

- vitest config uses `globals: false` — explicit `import { expect } from 'vitest'` required in all test files; plan said "no production module imports" which applies to app code not test framework imports
- source_excerpt and scan_id are nullable (no .notNull()) — scan items created before migration have null values
- Migration uses IF NOT EXISTS pattern consistent with Phase 17 migrations for idempotency

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added explicit vitest expect import to all 5 test files**
- **Found during:** Task 1 (RED test stubs)
- **Issue:** vitest.config.ts has `globals: false` — `expect` is not a global; initial files without import caused `ReferenceError: expect is not defined` instead of assertion failures
- **Fix:** Added `expect` to the `import { describe, it, expect } from 'vitest'` line in all 5 files
- **Files modified:** all 5 discovery test files
- **Verification:** Re-ran `npx vitest run tests/discovery/` — all 15 fail with AssertionError not ReferenceError
- **Committed in:** b7756a6 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug: wrong failure type)
**Impact on plan:** Required for correct RED failure behavior. No scope creep.

## Issues Encountered

Pre-existing TypeScript errors in BullMQ/ioredis version mismatch (jobs/trigger/route.ts, skills/run/route.ts, worker/index.ts) — out of scope, logged but not fixed.

## User Setup Required

None — no external service configuration required. Migration 0013 must be applied to the database before Wave 1+ plans are executed.

## Next Phase Readiness

- All 15 discovery RED stubs ready for Wave 1+ plans to go GREEN against
- Migration 0013 must be applied: `psql $DATABASE_URL -f bigpanda-app/db/migrations/0013_discovery_source_excerpt.sql`
- schema.ts exports updated discoveryItems with source_excerpt + scan_id ready for use in Wave 1 routes

---
*Phase: 19-external-discovery-scan*
*Completed: 2026-03-26*
