---
phase: 20-project-initiation-wizard
plan: "05"
subsystem: ui, api
tags: [next.js, drizzle-orm, react, tailwind, completeness-score, warning-banner]

# Dependency graph
requires:
  - phase: 20-02
    provides: "projects table with wizard columns; DB schema with all 9 entity tables"
provides:
  - "GET /api/projects/[projectId]/completeness — score endpoint returning { score, populatedTabs, emptyTabs }"
  - "computeCompletenessScore(TableCounts) → integer 0-100"
  - "getBannerData(emptyTabs[]) → { show: boolean, emptyTabs: string[] }"
  - "Overview page completeness score progress bar (always visible)"
  - "Below-60% non-dismissible yellow warning banner with empty tab links"
affects: [21-teams-arch-tab, overview-page-consumers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Direct DB queries in RSC pages — avoids HTTP self-call round-trip"
    - "Named helper exports from route files for reuse in RSC pages"
    - "TableCounts object pattern for testable score calculation"

key-files:
  created:
    - bigpanda-app/app/api/projects/[projectId]/completeness/route.ts
  modified:
    - bigpanda-app/app/customer/[id]/overview/page.tsx

key-decisions:
  - "computeCompletenessScore takes TableCounts object (not populatedCount int) — matches test contract discovered in existing test files"
  - "getBannerData returns { show, emptyTabs } object (not plain array) — matches test contract"
  - "Overview page imports and calls computeCompletenessScore/getBannerData directly from route file — avoids HTTP self-call; consistent with existing RSC direct-DB pattern"

patterns-established:
  - "Route-level pure functions (computeCompletenessScore, getBannerData) are named exports importable by RSC pages"

requirements-completed: [WIZ-08, WIZ-09]

# Metrics
duration: 8min
completed: 2026-03-27
---

# Phase 20 Plan 05: Completeness Score API + Overview Warning Banner Summary

**GET /api/projects/[projectId]/completeness endpoint and Overview page progress bar with non-dismissible yellow warning banner for sub-60% completeness**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-27T00:00:00Z
- **Completed:** 2026-03-27T00:07:21Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Completeness score endpoint querying all 9 entity tables and returning score (0-100), populatedTabs, and emptyTabs
- Pure helper functions `computeCompletenessScore` and `getBannerData` with correct signatures matching pre-written test contracts
- Overview page updated with always-visible Tailwind progress bar and non-dismissible yellow warning banner listing empty tab names as clickable links
- 141 tests pass; 6 new completeness/completeness-banner tests all GREEN

## Task Commits

Each task was committed atomically:

1. **Task 1: GET /api/projects/[projectId]/completeness — score endpoint** - `37cf877` (feat)
2. **Task 2: Overview page — completeness score bar + warning banner** - `4c98208` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `bigpanda-app/app/api/projects/[projectId]/completeness/route.ts` - Completeness score endpoint with named helper exports
- `bigpanda-app/app/customer/[id]/overview/page.tsx` - Overview page with score bar and warning banner

## Decisions Made
- `computeCompletenessScore` accepts a `TableCounts` object rather than a plain count integer — the pre-written test files revealed this expected signature; function counts `Object.values(counts).filter(c > 0).length` internally
- `getBannerData` returns `{ show: boolean, emptyTabs: string[] }` rather than `string[]` — test contract required the structured response
- Overview page uses direct DB queries instead of HTTP self-call to the completeness endpoint — consistent with the existing RSC pattern used throughout the app (see `actions/page.tsx` → `getWorkspaceData`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Function signatures adjusted to match pre-written test contracts**
- **Found during:** Task 1 (completeness route creation)
- **Issue:** Plan specified `computeCompletenessScore(populatedCount: number)` and `getBannerData(emptyTabs) → string[]` but existing test files expected `computeCompletenessScore(counts: TableCounts)` and `getBannerData → { show, emptyTabs }`
- **Fix:** Implemented functions with signatures matching the test contracts; `computeCompletenessScore` derives populated count from the TableCounts object internally
- **Files modified:** bigpanda-app/app/api/projects/[projectId]/completeness/route.ts
- **Verification:** All 6 completeness/completeness-banner tests GREEN
- **Committed in:** 37cf877 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (function signature alignment with pre-written tests)
**Impact on plan:** Necessary to make tests pass; semantically equivalent behavior, no scope change.

## Issues Encountered
- Pre-existing failure: `tests/wizard/manual-entry.test.ts` references `ManualEntryStep` component not yet built (belongs to plan 20-04). This is out of scope for plan 20-05 and was present before execution.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Completeness score endpoint live and tested; ready for 20-06 (Launch Plan step or final wizard wiring)
- Overview page now shows data completeness feedback loop; users will see score + missing tab guidance after project creation

---
*Phase: 20-project-initiation-wizard*
*Completed: 2026-03-27*
