---
phase: 49-portfolio-dashboard
plan: "01"
subsystem: portfolio-data-layer
tags: [query-functions, client-components, filtering, parallel-queries]
completed_at: "2026-04-09T02:45:09Z"
duration_seconds: 268
requires: []
provides:
  - "getPortfolioData() query function with parallel Promise.all() sub-queries"
  - "PortfolioProject type with 12+ enriched fields"
  - "PortfolioTableClient component with 12-column table"
  - "Client-side filtering via URL params for 7 dimensions"
affects:
  - bigpanda-app/lib/queries.ts
  - bigpanda-app/components/PortfolioTableClient.tsx
tech_stack:
  added: []
  patterns:
    - "Promise.all() parallel sub-queries for per-project enrichment"
    - "Client-side filtering via useSearchParams() and useMemo()"
    - "Collapsible filter panel with active filter count badge"
    - "Badge color conventions for health/risk/dependency status"
key_files:
  created:
    - bigpanda-app/components/PortfolioTableClient.tsx
  modified:
    - bigpanda-app/lib/queries.ts
decisions:
  - "Used Promise.all() pattern from Phase 34 for parallel per-project queries (not N+1 loop)"
  - "Current phase derived from first onboarding_phases row (status field not yet implemented)"
  - "Owner from first ADR workstream with non-null lead (fallback to null)"
  - "Tracks displayed as joined string ('ADR + Biggy') not array"
  - "Risk level derived from highRisks count: 0=None, 1-2=Medium, 3+=High"
  - "Dependency status from blocked tasks count: >0=Blocked, else=Clear"
  - "Filter panel collapsible (not always visible) to keep table header clean"
  - "Search matches customer field only (not extended to other text fields)"
metrics:
  task_count: 2
  commits: 2
  files_created: 1
  files_modified: 1
  lines_added: 474
---

# Phase 49 Plan 01: Portfolio Data Query and Table Summary

Create portfolio data query function and filterable table component for multi-project portfolio management dashboard.

## Tasks Completed

| Task | Name                                      | Commit  | Files                                                 |
| ---- | ----------------------------------------- | ------- | ----------------------------------------------------- |
| 1    | Create getPortfolioData query function    | 9852349 | bigpanda-app/lib/queries.ts                           |
| 2    | Create PortfolioTableClient component     | 4f2712e | bigpanda-app/components/PortfolioTableClient.tsx      |

## Implementation Summary

### Task 1: getPortfolioData Query Function

Added `getPortfolioData()` export to `lib/queries.ts` following Phase 34 parallel query pattern:

**Type Definition:**
```typescript
export interface PortfolioProject extends ProjectWithHealth {
  owner: string | null;
  tracks: string;
  currentPhase: string | null;
  percentComplete: number | null;
  nextMilestone: string | null;
  nextMilestoneDate: string | null;
  riskLevel: 'None' | 'Medium' | 'High';
  dependencyStatus: 'Clear' | 'Blocked';
}
```

**Query Structure:**
1. Fetch all active projects using `getActiveProjects()` (reuses existing health computation)
2. Enrich each project with 4 parallel sub-queries via `Promise.all()`:
   - Workstreams → owner, tracks, percentComplete
   - Onboarding phases → currentPhase
   - Milestones → nextMilestone, nextMilestoneDate
   - Blocked tasks → dependencyStatus
3. Transform results into `PortfolioProject[]` with all enriched fields

**Field Derivation:**
- **owner:** First ADR workstream with non-null `lead` field
- **tracks:** Distinct workstream track values joined with ' + ' (e.g., "ADR + Biggy")
- **currentPhase:** First onboarding phase by display_order (status field not yet implemented)
- **percentComplete:** Average of workstreams.percent_complete (null if no workstreams have progress)
- **nextMilestone:** Nearest upcoming milestone (date >= today, status !== 'completed')
- **riskLevel:** Derived from `highRisks` count (0 = None, 1-2 = Medium, 3+ = High)
- **dependencyStatus:** 'Blocked' if any task has non-null `blocked_by` and status !== 'completed', else 'Clear'

**Performance:** Single batch project fetch + parallel per-project queries. Target <500ms at 20+ projects (will verify in Plan 02 integration).

### Task 2: PortfolioTableClient Component

Created `components/PortfolioTableClient.tsx` following RisksTableClient pattern:

**Component Structure:**
- Props: `{ projects: PortfolioProject[] }`
- Client-side filtering via `useSearchParams()` and `useMemo()`
- Collapsible filter panel with toggle button
- 12-column table with clickable rows

**Columns (in order):**
1. Name (customer field)
2. Owner
3. Team/Track (tracks field)
4. Phase (currentPhase)
5. Health (badge: green/yellow/red)
6. % Complete (formatted as "XX%" or "—")
7. Next Milestone
8. Next Milestone Date
9. Risk Level (badge: None/Medium/High)
10. Dependency (badge: Clear/Blocked)
11. Last Updated (formatted as relative time: "3d ago")
12. Exec Flag (AlertCircle icon if `exec_action_required === true`)

**Filter Dimensions:**
- status (health filter: green/yellow/red)
- owner (exact match from dropdown)
- track (substring match against tracks field)
- phase (exact match from dropdown)
- riskLevel (None/Medium/High)
- dependency (Clear/Blocked)
- search (text match against customer field, case-insensitive)

**Filter Panel:**
- Toggle button shows active filter count badge
- Panel collapses to save vertical space (not always visible like RisksTable inline bar)
- Dropdowns populated from unique values in projects array
- "Clear all filters" button resets all filters

**Row Interaction:**
- Entire row clickable → navigates to `/customer/[projectId]`
- Hover highlights row with `bg-zinc-50`

**Empty State:**
- "No projects match current filters" when `filteredProjects.length === 0`
- Shows count: "Showing X of Y projects" below table

## Verification Results

All Phase 49 tests remain in RED state (expected):
- `npm test -- __tests__/portfolio --run` → 35 tests failed (all throw "not implemented")
- TypeScript compilation clean (no errors related to new code)
- Both files committed with atomic commits

## Deviations from Plan

None - plan executed exactly as written.

## Key Decisions

1. **Promise.all() pattern:** Followed Phase 34 pattern for parallel per-project enrichment. Single batch project fetch, then parallel sub-queries. Avoids N+1 query explosion.

2. **Current phase derivation:** Used first onboarding phase by display_order. `onboarding_phases.status` field not yet implemented, so can't filter by "not completed" yet. This is sufficient for Phase 49 scope.

3. **Owner field source:** First ADR workstream with non-null lead. Biggy workstreams ignored for owner derivation. Falls back to null if no ADR workstream has a lead.

4. **Tracks display format:** Joined string ("ADR + Biggy") instead of array for simpler table rendering. Filter matches substring.

5. **Risk level thresholds:** 0 highRisks = None, 1-2 = Medium, 3+ = High. Based on Phase 34 health computation logic.

6. **Dependency status logic:** Any non-completed task with `blocked_by` FK = Blocked. Ignores completed tasks with historical blockers.

7. **Collapsible filter panel:** Not inline like RisksTable. Toggle button shows active filter count badge. Keeps table header cleaner when filters not in use.

8. **Search scope:** Matches `customer` field only. Not extended to owner, track, or other text fields. Simplifies UX and avoids ambiguous partial matches.

## Performance Characteristics

**Query Pattern:**
- Single `getActiveProjects()` call → fetches all active projects + health data
- Per-project: 4 parallel queries via `Promise.all()` (not sequential)
- Total queries: 1 + (4 × N projects)
- Expected duration: <500ms at 20+ projects (will measure in Plan 02)

**Client Filtering:**
- All projects loaded once at page render
- Filtering via `useMemo()` → instant re-filter on param change
- No server round-trip for filter changes
- Scales well to 50+ projects in memory

## Type Exports for Plan 02

Plan 02 (Portfolio Dashboard Page) can import:
```typescript
import { getPortfolioData, type PortfolioProject } from '@/lib/queries'
import { PortfolioTableClient } from '@/components/PortfolioTableClient'
```

Server Component fetches data via `getPortfolioData()`, passes to `PortfolioTableClient` as prop.

## Test Coverage

Phase 49-00 established 35 RED test stubs across 4 files:
- `getPortfolioData.test.ts` (6 tests) — query function behavior
- `portfolioSummary.test.ts` (8 tests) — summary chips (Plan 02)
- `portfolioFilters.test.ts` (11 tests) — table filtering
- `portfolioExceptions.test.ts` (10 tests) — exceptions panel (Plan 02)

All tests still RED after Plan 01. Plan 02 will implement SummaryChips and ExceptionsPanel, turning those tests GREEN.

## Next Steps

Plan 02 will:
1. Replace `app/page.tsx` with portfolio dashboard layout
2. Create `PortfolioSummaryChips` component (6 stat chips)
3. Create `PortfolioExceptionsPanel` component (5 exception types)
4. Wire `getPortfolioData()` to page via Server Component
5. Turn 35 RED tests GREEN

## Self-Check: PASSED

Verifying all created/modified files exist:
- ✓ bigpanda-app/lib/queries.ts (modified, 133 lines added)
- ✓ bigpanda-app/components/PortfolioTableClient.tsx (created, 341 lines)

Verifying all commits exist:
- ✓ 9852349 (Task 1: getPortfolioData query function)
- ✓ 4f2712e (Task 2: PortfolioTableClient component)

All files created/modified and all commits recorded successfully.
