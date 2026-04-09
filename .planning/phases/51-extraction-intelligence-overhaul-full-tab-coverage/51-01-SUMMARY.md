---
phase: 51-extraction-intelligence-overhaul-full-tab-coverage
plan: 01
subsystem: extraction
tags: [tdd, wave-0, test-infrastructure, gaps-e-g]
dependencies:
  requires: []
  provides: [RED test stubs for status coercers, RED test stubs for weekly_focus handler]
  affects: [ingestion approval handler]
tech_stack:
  added: []
  patterns: [TDD RED stubs, Vitest mocking for Redis]
key_files:
  created:
    - bigpanda-app/app/api/__tests__/status-coercers.test.ts
    - bigpanda-app/app/api/__tests__/weekly-focus-ingestion.test.ts
  modified: []
decisions:
  - Test status-coercers against existing coercers.ts module (created in prior plan as blocking dependency)
  - Mock Redis connection via @/worker/connection for weekly_focus tests
  - weekly_focus tests expect 7-day TTL (604800 seconds) for Redis keys
metrics:
  duration_seconds: 142
  completed_date: "2026-04-09"
  tasks_completed: 2
  tests_added: 16
---

# Phase 51 Plan 01: Wave 0 RED Test Stubs for Gaps E & G Summary

**One-liner:** Created TDD test infrastructure for status coercers (Gap E) and weekly_focus Redis handler (Gap G) before implementation.

## Overview

Established Wave 0 test coverage for two gaps requiring new test infrastructure:
- **Gap E:** Status coercers for wbs_item and arch_node entities
- **Gap G:** weekly_focus Redis handler for storing focus bullets with TTL

Both test files document expected behavior and serve as executable specifications for Wave 1 implementations.

## Tasks Completed

### Task 1: Create status-coercers.test.ts with RED stubs for Gap E
**Status:** ✓ Complete (GREEN - coercers.ts already exists from Plan 51-03)
**Commit:** 21b7196
**Files:** bigpanda-app/app/api/__tests__/status-coercers.test.ts

Created 13 test cases covering:
- `coerceWbsItemStatus`: 7 tests (in_progress, completed, done, not started, blocked→null, null→null)
- `coerceArchNodeStatus`: 6 tests (live, production, in_progress, planned, unknown→null, null→null)

**Note:** Tests are GREEN because coercers.ts was created in Plan 51-03 as a blocking dependency. Tests validate the existing implementation correctly normalizes status synonyms to DB enum values.

### Task 2: Create weekly-focus-ingestion.test.ts with RED stubs for Gap G
**Status:** ✓ Complete (RED - as expected)
**Commit:** ba8215f
**Files:** bigpanda-app/app/api/__tests__/weekly-focus-ingestion.test.ts

Created 3 test cases covering:
- weekly_focus entity returns HTTP 200 with written=1
- Redis handler writes bullets array to key `weekly_focus:${projectId}` with 7-day TTL
- Comma-separated bullets string parses into array correctly

**RED state confirmed:** All 3 tests fail because:
1. `weekly_focus` not in Zod enum → filtered out → written=0
2. Redis mock not called (no handler exists yet)

## Deviations from Plan

### Auto-fixed Issues

**1. [Context Discovery] Coercers module already exists**
- **Found during:** Task 1 verification
- **Issue:** Plan expected coercers.ts to not exist (RED import error), but module was created in Plan 51-03
- **Resolution:** Tests now validate existing implementation instead of documenting future behavior
- **Files affected:** None (test file unchanged)
- **Outcome:** Tests are GREEN for Gap E, RED for Gap G as intended

## Verification Results

**Automated tests:**
- status-coercers.test.ts: ✓ 13/13 passing (GREEN)
- weekly-focus-ingestion.test.ts: ✗ 3/3 failing (RED - expected)

**Full suite:** 661 passing, 63 failing (17 failed test files)
**Regression check:** No new failures introduced - all 63 failures are pre-existing

## Success Criteria

- [x] bigpanda-app/app/api/__tests__/status-coercers.test.ts exists with 13 test stubs
- [x] bigpanda-app/app/api/__tests__/weekly-focus-ingestion.test.ts exists with 3 test stubs
- [x] weekly-focus tests FAIL (RED) - confirmed with written=0 and Redis mock not called
- [x] No previously passing tests broken - confirmed via full suite run

## Key Decisions Made

1. **Coercer testing strategy:** Direct import of coercers module functions for unit testing, rather than indirect testing via POST handler
2. **Redis mock pattern:** Mock `@/worker/connection.createApiRedisConnection()` with set/quit/connect methods
3. **TTL value:** 7 days (604800 seconds) for weekly_focus Redis keys, matching existing Phase 50 pattern

## Next Steps

Plan 51-02 will:
1. ~~Add coerceWbsItemStatus and coerceArchNodeStatus to approve/route.ts~~ (already exists)
2. Add `weekly_focus` to Zod entity type enum
3. Implement weekly_focus Redis handler with bullet parsing
4. Turn all tests GREEN

## Self-Check: PASSED

**Files verified:**
- ✓ FOUND: bigpanda-app/app/api/__tests__/status-coercers.test.ts
- ✓ FOUND: bigpanda-app/app/api/__tests__/weekly-focus-ingestion.test.ts

**Commits verified:**
- ✓ FOUND: 21b7196 (Task 1 - status coercers test)
- ✓ FOUND: ba8215f (Task 2 - weekly_focus test)
