---
phase: 35-overview-tab-weekly-focus-integration-tracker
plan: 01
subsystem: testing
tags: [wave-0, test-scaffolds, tdd-red, vitest, redis-mock]
dependency_graph:
  requires: []
  provides: [RED test baseline for WKFO-01, WKFO-02, OINT-01]
  affects: []
tech_stack:
  added: []
  patterns: [wave-0-stub-pattern, redis-mock-pattern]
key_files:
  created:
    - bigpanda-app/tests/overview/weekly-focus.test.ts
    - bigpanda-app/tests/overview/integration-tracker.test.ts
  modified: []
decisions: []
metrics:
  duration_minutes: 1
  tasks_completed: 2
  files_created: 2
  commits: 2
  tests_added: 13
  completed_date: "2026-04-03"
---

# Phase 35 Plan 01: Wave 0 Test Scaffolds Summary

**One-liner:** Created 13 failing RED test stubs for weekly focus job/API/component (WKFO-01, WKFO-02) and integration tracker grouping/UI (OINT-01) with Wave 0 stub pattern.

## What Was Built

### Task 1: Weekly Focus Test Scaffolds (WKFO-01, WKFO-02)
**Commit:** `59f943c`
**Files:** `bigpanda-app/tests/overview/weekly-focus.test.ts`

Created 6 RED test stubs covering:
- weeklyFocusJob behavior (generates 3-5 bullets, writes to Redis)
- GET /api/.../weekly-focus (cached data, empty state)
- POST /api/.../weekly-focus (on-demand job enqueue)
- WeeklyFocus component (ProgressRing rendering with completion %)
- Progress calculation (average of ADR + Biggy stepCounts)

**Redis mock:** Added `vi.mock('ioredis')` to prevent requiring real Redis instance during tests.

### Task 2: Integration Tracker Test Scaffolds (OINT-01)
**Commit:** `da7a587`
**Files:** `bigpanda-app/tests/overview/integration-tracker.test.ts`

Created 7 RED test stubs covering:
- Track grouping (ADR, Biggy, Unassigned sections)
- Type grouping (ADR: Inbound/Outbound/Enrichment; Biggy: Real-time/Context/Knowledge/UDC)
- PATCH /api/integrations/[id] (accepts track + integration_type)
- Edit form validation (type options filtered by track)

**No Redis mock needed** - integration tracker is pure DB/UI.

## Verification Results

### Automated Tests
```
Test Files  2 failed | 4 passed (6)
      Tests  13 failed | 26 passed (39)
```

**Status:** ✅ All success criteria met
- 13 new RED failures (6 weekly-focus + 7 integration-tracker)
- 26 existing overview tests still passing (no regressions)
- All tests fail with `AssertionError: expected undefined to be defined` (proper RED state)
- No import errors or syntax errors (Wave 0 stub pattern working correctly)

### Existing Test Suite Integrity
All previous Phase 34 and Phase 33 tests continue to pass:
- `completeness-removal.test.ts` - PASS
- `metrics-health.test.ts` - PASS
- `timeline-replacement.test.ts` - PASS
- `track-separation.test.tsx` - PASS

## Technical Implementation

### Wave 0 Stub Pattern (from STATE.md decisions)
```typescript
const x: any = undefined
expect(x).toBeDefined() // Always fails RED without import errors
```

This pattern ensures tests fail properly even when the modules don't exist yet. No brittle import errors that would break the test runner.

### Redis Mock Pattern
Adapted from `tests/ingestion/extraction-enqueue.test.ts`:
```typescript
vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    quit: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn().mockResolvedValue(undefined),
  })),
}))
```

### Test Structure
Both files organized with descriptive `describe` blocks:
- **weekly-focus.test.ts:** 2 describe blocks (job/API vs component)
- **integration-tracker.test.ts:** 3 describe blocks (track grouping, type grouping, API/form)

## Deviations from Plan

None - plan executed exactly as written.

## Requirement Traceability

| Requirement | Test Coverage | Status |
|-------------|---------------|--------|
| WKFO-01 | 4 stubs (job, GET cached, GET empty, POST enqueue) | RED ✅ |
| WKFO-02 | 2 stubs (component render, progress calculation) | RED ✅ |
| OINT-01 | 7 stubs (track grouping, type grouping, API, form) | RED ✅ |

## Next Steps

**Wave 1 Implementation Plans** will turn these RED tests GREEN:
1. Implement weeklyFocusJob BullMQ worker with AI bullet generation
2. Create GET/POST API routes for weekly focus with Redis caching
3. Build WeeklyFocus component with ProgressRing
4. Add track + integration_type columns to integrations table
5. Create PATCH /api/integrations/[id] endpoint
6. Build Integration Tracker UI with grouping logic
7. Implement edit form with type filtering by track

## Self-Check

### File Verification
```bash
[ -f "bigpanda-app/tests/overview/weekly-focus.test.ts" ] && echo "FOUND"
[ -f "bigpanda-app/tests/overview/integration-tracker.test.ts" ] && echo "FOUND"
```

**Result:** ✅ Both files exist

### Commit Verification
```bash
git log --oneline --all | grep -q "59f943c" && echo "FOUND: 59f943c"
git log --oneline --all | grep -q "da7a587" && echo "FOUND: da7a587"
```

**Result:** ✅ Both commits exist

## Self-Check: PASSED

All files created, all commits exist, all tests fail RED as expected.
