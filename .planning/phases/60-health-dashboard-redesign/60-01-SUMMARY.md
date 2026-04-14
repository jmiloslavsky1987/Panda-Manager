---
phase: 60-health-dashboard-redesign
plan: 01
subsystem: Health Dashboard
tags:
  - health-metrics
  - api
  - formula
  - tdd
dependency_graph:
  requires: []
  provides:
    - overdueMilestones API field
    - computeOverallHealth formula with overdue signals
  affects:
    - HealthDashboard component
    - overview-metrics API
tech_stack:
  added: []
  patterns:
    - TDD test-first development
    - PostgreSQL regex pattern matching for ISO dates
key_files:
  created:
    - bigpanda-app/__tests__/health/computeOverallHealth.test.ts
  modified:
    - bigpanda-app/components/HealthDashboard.tsx
    - bigpanda-app/app/api/projects/[projectId]/overview-metrics/route.ts
decisions:
  - Use PostgreSQL regex `~` operator to filter ISO date format milestones
  - Exclude non-ISO dates (TBD, Q3 2026) from overdue calculation
  - Remove adrCompletion/biggyCompletion parameters from formula (no longer relevant to new design)
metrics:
  duration_minutes: 2.9
  task_count: 1
  file_count: 3
  test_count: 6
  commits: 3
  completed_date: "2026-04-14"
---

# Phase 60 Plan 01: API + Formula Summary

**One-liner:** Extended overview-metrics API with overdue milestone count and updated computeOverallHealth formula to use overdue signals instead of completion percentages.

## Implementation Summary

Implemented TDD-driven update to the Health Dashboard verdict logic. The overview-metrics API now returns an `overdueMilestones` count (milestones with parseable ISO dates before today and status != 'completed'), and the `computeOverallHealth` formula consumes this field instead of the old ADR/Biggy completion percentages.

## Tasks Completed

### Task 1: Add overdueMilestones to API and update computeOverallHealth formula (TDD)

**Status:** Complete (3 commits)
**Files modified:**
- `bigpanda-app/__tests__/health/computeOverallHealth.test.ts` (created)
- `bigpanda-app/components/HealthDashboard.tsx`
- `bigpanda-app/app/api/projects/[projectId]/overview-metrics/route.ts`

**TDD Cycle:**

1. **RED (commit caa30f7):** Created 6 failing tests for new `computeOverallHealth` signature with `overdueMilestones` parameter. Tests expected the new signature but function still had old `adrCompletion`/`biggyCompletion` parameters. 5 tests passed coincidentally (critical risk logic unchanged), 1 failed as expected.

2. **GREEN (commit 763a92d):** Updated `computeOverallHealth` function:
   - Removed `adrCompletion` and `biggyCompletion` parameters
   - Added `overdueMilestones: number` parameter
   - Updated formula: critical risks → red, high risks OR overdue milestones → yellow, else green
   - Updated `OverviewMetricsData` interface to include `overdueMilestones` field
   - All 6 tests now pass

3. **Implementation (commit 43a8a4a):** Added overdue milestone query to API route:
   - Uses PostgreSQL regex pattern `~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'` to filter only ISO date format
   - Excludes 'TBD', 'Q3 2026', and other non-ISO date strings
   - Counts milestones where status is NULL or not 'completed' and date < CURRENT_DATE
   - Returns `overdueMilestones` field in API response

**Verification:** All 6 formula tests pass GREEN. TypeScript compilation clean for modified files. No pre-existing test failures introduced.

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

### ISO Date Filtering Strategy

The milestone `date` field is TEXT (not a proper date type) and contains mixed formats:
- ISO dates: `2026-03-15`
- Placeholder values: `TBD`
- Quarter notation: `Q3 2026`, `2026-Q3`

Used PostgreSQL regex operator `~` with pattern `^[0-9]{4}-[0-9]{2}-[0-9]{2}$` to filter only valid ISO dates before casting to `date` type for comparison. This safely excludes all non-ISO formats.

### Formula Change Rationale

Old formula used ADR/Biggy onboarding completion percentages (< 50% triggered yellow). New design focuses on risk and delivery signals:
- Critical risks always trump (red)
- High risks OR overdue milestones trigger yellow
- Otherwise green

This aligns with the Phase 60 redesign objective: Health Dashboard verdict driven by risks and overdue milestones, not onboarding step completion.

## Risks & Mitigations

**Risk:** Milestones with invalid ISO dates (e.g., `2026-13-45`) pass regex but fail date casting.
**Mitigation:** PostgreSQL will raise an error on invalid date cast, which is caught by the try/catch block and returns 500. Consider adding date validation at ingestion time in future phases.

**Risk:** Timezone differences between server and client could affect "today" calculation.
**Mitigation:** Query uses `CURRENT_DATE` which is server-local. If timezone precision is critical, consider using explicit timezone in query.

## Test Coverage

**6 tests added:**
1. Critical risk trumps all → red
2. High risk → yellow
3. Overdue milestone → yellow
4. No risks/overdue → green
5. Critical + high + overdue → red (critical trumps)
6. High + overdue → yellow (both signals present)

All tests pass GREEN.

## Next Steps

Plan 60-02 will update the HealthDashboard UI to consume the new API field and display overdue milestone information to users.

## Self-Check: PASSED

**Created files verified:**
```
FOUND: bigpanda-app/__tests__/health/computeOverallHealth.test.ts
```

**Commits verified:**
```
FOUND: caa30f7 (RED)
FOUND: 763a92d (GREEN)
FOUND: 43a8a4a (API implementation)
```

**Modified files verified:**
```
FOUND: bigpanda-app/components/HealthDashboard.tsx
FOUND: bigpanda-app/app/api/projects/[projectId]/overview-metrics/route.ts
```
