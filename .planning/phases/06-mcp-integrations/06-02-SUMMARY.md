---
phase: 06-mcp-integrations
plan: "02"
subsystem: dashboard
tags: [dashboard, risks, postgresql, drizzle, react]
dependency_graph:
  requires: [06-01]
  provides: [DASH-04, DASH-05]
  affects: [bigpanda-app/app/page.tsx]
tech_stack:
  added: []
  patterns: [drizzle-aggregate-query, client-component-fetch, tdd-e2e]
key_files:
  created:
    - bigpanda-app/app/api/dashboard/risks-heatmap/route.ts
    - bigpanda-app/app/api/dashboard/watch-list/route.ts
    - bigpanda-app/components/RiskHeatMap.tsx
    - bigpanda-app/components/WatchList.tsx
  modified:
    - bigpanda-app/app/page.tsx
    - tests/e2e/phase6.spec.ts
decisions:
  - "Used @/ alias imports for db and schema in API routes (tsconfig paths configured)"
  - "RiskHeatMap groups statuses dynamically from query results rather than hardcoding a status list"
  - "WatchList uses inArray(risks.severity, ['high','critical']) for severity filter"
  - "Cell color scale: 0=white, 1-2=light, 3-5=medium, 6+=full per severity column color"
  - "Watch list includes risks where status IS NULL OR status != 'resolved' to handle nullable status field"
metrics:
  duration: "3m47s"
  completed_date: "2026-03-24"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 2
---

# Phase 06 Plan 02: DASH-04 Risk Heat Map + DASH-05 Cross-Account Watch List Summary

**One-liner:** PostgreSQL aggregate queries for cross-project risk visibility — severity x status heat map and high/critical watch list — wired as client components on the dashboard.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Risk Heat Map and Watch List API routes | 62ed4bb | risks-heatmap/route.ts, watch-list/route.ts, phase6.spec.ts |
| 2 | RiskHeatMap + WatchList components wired to Dashboard | 6871f2d | RiskHeatMap.tsx, WatchList.tsx, page.tsx |

## What Was Built

### DASH-04: Risk Heat Map (`/api/dashboard/risks-heatmap`)
- Drizzle query: `SELECT severity, status, COUNT(*)::int FROM risks INNER JOIN projects WHERE projects.status = 'active' AND risks.status != 'resolved' GROUP BY severity, status`
- Returns `{ heatmap: Array<{ severity, status, count }> }` — active projects only, no resolved risks
- Client component renders a `<table>` grid with severity columns (low/medium/high/critical) and dynamic status rows
- Color intensity by count: 0=white, 1-2=light tint, 3-5=medium tint, 6+=full color per severity column
- `data-testid="risk-heat-map"` present on root div in all states (loading, error, empty, data)

### DASH-05: Cross-Account Watch List (`/api/dashboard/watch-list`)
- Drizzle query: `SELECT risks.*, projects.name, projects.customer WHERE projects.status = 'active' AND risks.severity IN ('high','critical') AND (risks.status IS NULL OR risks.status != 'resolved') ORDER BY created_at DESC LIMIT 20`
- Returns `{ items: Array<{ id, description, severity, status, project_name, customer, last_updated }> }`
- Client component renders a compact table with project chips (bg-zinc-100), severity badges (orange/red text), status and last_updated columns
- `data-testid="watch-list"` present on root div in all states
- Live data: 20 high-severity open risks across MERCK, KAISER, and AMEX projects

### Dashboard Integration
- Both panels inserted after Morning Briefing panel and before Project Health grid
- Section wrappers with `data-testid="risk-heat-map-section"` and `data-testid="watch-list-section"`

## Test Results

```
npx playwright test tests/e2e/phase6.spec.ts --grep "DASH"
  ✓ DASH-04: Risk Heat Map panel visible on Dashboard (422ms)
  ✓ DASH-05: Cross-Account Watch List panel visible on Dashboard (207ms)
  2 passed (2.4s)
```

## Deviations from Plan

### TDD Adaptation
- **Found during:** Task 1 RED phase
- **Issue:** The E2E test stubs had `expect(false, 'stub').toBe(true)` preventing real assertions from running
- **Fix:** Removed the stub guard lines for DASH-04 and DASH-05 as part of the TDD RED step — tests now fail for the correct reason (missing elements) rather than the stub guard
- **Files modified:** tests/e2e/phase6.spec.ts
- **Commit:** 62ed4bb (included with Task 1)

### Dynamic Status Rows in Heat Map
- **Found during:** Task 2 implementation
- **Issue:** Status values in real data include 'open', 'Open' (case-inconsistent), 'closed', 'monitoring' — hardcoding ['open','mitigated'] would miss data
- **Fix (Rule 1):** RiskHeatMap collects unique statuses from query results dynamically, normalizes to lowercase for grouping
- No separate commit — handled inline during component creation

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| bigpanda-app/app/api/dashboard/risks-heatmap/route.ts | FOUND |
| bigpanda-app/app/api/dashboard/watch-list/route.ts | FOUND |
| bigpanda-app/components/RiskHeatMap.tsx | FOUND |
| bigpanda-app/components/WatchList.tsx | FOUND |
| .planning/phases/06-mcp-integrations/06-02-SUMMARY.md | FOUND |
| commit 62ed4bb | FOUND |
| commit 6871f2d | FOUND |
| data-testid="risk-heat-map" in RiskHeatMap.tsx | FOUND |
| data-testid="watch-list" in WatchList.tsx | FOUND |
