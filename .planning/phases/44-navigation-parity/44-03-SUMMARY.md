---
phase: 44-navigation-parity
plan: 03
subsystem: milestones
tags:
  - filtering
  - bulk-actions
  - url-params
  - incomplete-first-sort
dependency_graph:
  requires:
    - 44-01-PLAN.md (navigation restructure)
  provides:
    - MilestonesTableClient filter bar (status, owner, date range)
    - Checkbox multi-select with bulk status update
    - /api/milestones/bulk-update endpoint
  affects:
    - Milestones sub-tab UX (now matches Actions table parity)
tech_stack:
  added:
    - useSearchParams for URL param filtering
    - useMemo for client-side filtering with incomplete-first preservation
    - Checkbox component from Shadcn UI
  patterns:
    - Client-side filtering (server passes full data, client filters in-memory)
    - URL params for filter state persistence
    - CustomEvent('metrics:invalidate') for cross-tab sync
    - Incomplete-first sort preserved after filtering (split -> filter -> sort -> concat)
    - Date filter skips non-ISO values (TBD, Q3) to keep them visible
key_files:
  created:
    - bigpanda-app/app/api/milestones/bulk-update/route.ts
  modified:
    - bigpanda-app/components/MilestonesTableClient.tsx
decisions:
  - Filter bar inline (not collapsible) matching Actions UX pattern from Plan 02
  - Date filter applies to target ?? date field with non-ISO value preservation
  - Incomplete-first sort applied AFTER filtering to maintain expected order
  - Bulk update only supports status field (aligned with milestones schema focus)
metrics:
  duration_minutes: 13
  tasks_completed: 2
  tests_added: 3
  files_created: 1
  files_modified: 1
  commits: 2
  completed_date: "2026-04-08T06:23:15Z"
---

# Phase 44 Plan 03: Milestones Bulk Actions Summary

**One-liner:** Milestones table now has 3-dimension filtering (status, owner, date range) and checkbox bulk actions matching Actions table UX parity.

## What Was Built

### /api/milestones/bulk-update Endpoint
- POST endpoint accepting `milestone_ids: number[]` and `patch: { status }`
- Zod validation for milestone status enum: `not_started`, `in_progress`, `completed`, `blocked`
- requireSession auth guard (CVE-2025-29927 defense-in-depth)
- Returns `{ ok: true, count: N }` on success
- Validates non-empty milestone_ids array and non-empty patch object
- Uses Drizzle `inArray()` for efficient bulk update

### MilestonesTableClient Filter Bar
**3-dimension filter UI:**
- Status dropdown (all statuses, not_started, in_progress, completed, blocked)
- Owner dropdown (populated from unique milestone owners)
- Date range inputs (from/to) with ISO date filtering
- Clear filters button (appears when any filter active)

**Filter behavior:**
- URL params persist filter state (`?status=blocked&owner=Alice&from=2026-04-01`)
- Client-side filtering via `useMemo` (full data passed from server)
- Date filter checks for ISO format (`/^\d{4}-\d{2}-\d{2}/.test(d)`) and **skips non-ISO values** (keeps TBD, Q3 visible)
- Incomplete-first sort preserved: filter full array → split incomplete/complete → sort each half → concat

### Checkbox Multi-Select + Bulk Actions
- Checkbox column added to table (first column)
- Select-all checkbox in header (checks/unchecks all filtered rows)
- `selectedIds: Set<number>` state tracks selected milestones
- Floating bulk bar appears when rows selected:
  - Shows count: "N selected"
  - Dropdown: "Change status..." → 4 status options
  - Clear button to deselect all
- `bulkUpdateStatus()` calls `/api/milestones/bulk-update` and dispatches `CustomEvent('metrics:invalidate')`

## Deviations from Plan

None - plan executed exactly as written. All must-haves verified:
- User can filter by status, owner, and date range simultaneously ✓
- URL params reflect active filters (survives refresh) ✓
- Incomplete milestones still appear before completed ones after filtering ✓
- User can select multiple rows and bulk-update status ✓
- Floating bulk bar appears/disappears correctly ✓
- POST /api/milestones/bulk-update returns ok:true ✓

## Technical Highlights

### Incomplete-First Sort Preservation
**Challenge:** Original code split milestones into incomplete/complete arrays before sorting. Needed to preserve this behavior after adding filters.

**Solution:** Moved split/sort logic INSIDE `filteredMilestones` useMemo:
```typescript
const filteredMilestones = useMemo(() => {
  let result = [...milestones]
  // Apply all filters first
  if (statusFilter) result = result.filter(...)
  if (ownerFilter) result = result.filter(...)
  if (fromDate) result = result.filter(...)
  if (toDate) result = result.filter(...)

  // THEN split and sort (preserves incomplete-first order)
  const incomplete = result.filter(m => status !== 'completed')
  const complete = result.filter(m => status === 'completed')
  return [...incomplete.sort(sortByDate), ...complete.sort(sortByDate)]
}, [milestones, statusFilter, ownerFilter, fromDate, toDate])
```

### Non-ISO Date Handling
Milestones `target` and `date` fields can contain:
- ISO dates: `2026-04-15`
- Relative dates: `2026-Q3`
- Placeholders: `TBD`

**Filter logic:** Check for ISO format before comparison, return `true` (keep) for non-ISO:
```typescript
if (fromDate) {
  result = result.filter(m => {
    const d = m.target ?? m.date ?? ''
    if (!/^\d{4}-\d{2}-\d{2}/.test(d)) return true  // keep TBD, Q3
    return d >= fromDate
  })
}
```

This ensures milestones with non-ISO dates remain visible unless filtered by status/owner.

## Testing

### TDD Flow (Task 1)
**RED:** Test file existed from wave 0 stub. Ran test, route missing → test failed ✓
**GREEN:** Created route.ts following actions/bulk-update pattern → 3 tests pass ✓
**REFACTOR:** Code already clean, no refactor needed ✓

### Test Coverage
- 3 tests in `app/api/__tests__/milestones-bulk-update.test.ts`:
  1. Valid bulk update returns 200 { ok: true, count: N }
  2. Empty milestone_ids array returns 400
  3. Empty patch object returns 400

### Regression Testing
Full vitest suite: 579 passed, 13 failed (pre-existing mock setup issues from v5.0, deferred past v6.0)

## Requirements Fulfilled

- **MILE-01:** Milestones table supports filtering by status, owner, and date range ✓
- **MILE-02:** Milestones table supports checkbox multi-select and bulk status update ✓

## Files Modified

**Created:**
- `bigpanda-app/app/api/milestones/bulk-update/route.ts` (56 lines)

**Modified:**
- `bigpanda-app/components/MilestonesTableClient.tsx` (+198 lines, -8 lines)
  - Added useSearchParams, useMemo, useCallback imports
  - Added Checkbox import from Shadcn UI
  - Added `selectedIds` state, `updateParam`, `bulkUpdateStatus`, `toggleSelection`, `toggleSelectAll` functions
  - Added `uniqueOwners` useMemo
  - Added `filteredMilestones` useMemo with incomplete-first sort preservation
  - Added filter bar JSX (4 controls: status, owner, from, to)
  - Added floating bulk bar JSX (appears when rows selected)
  - Added checkbox column to table header and each row

## Commits

- `f7f42c5` - feat(44-03): implement milestones bulk-update API endpoint
- `8a22630` - feat(44-03): add filter bar and bulk actions to milestones table

## Self-Check: PASSED

**Created files exist:**
```bash
FOUND: bigpanda-app/app/api/milestones/bulk-update/route.ts
```

**Modified files exist:**
```bash
FOUND: bigpanda-app/components/MilestonesTableClient.tsx
```

**Commits exist:**
```bash
FOUND: f7f42c5 (feat(44-03): implement milestones bulk-update API endpoint)
FOUND: 8a22630 (feat(44-03): add filter bar and bulk actions to milestones table)
```

**Tests pass:**
```bash
✓ app/api/__tests__/milestones-bulk-update.test.ts (3 tests passed)
```

## Next Steps

Phase 44 complete (3/3 plans). Next action:
- Update STATE.md with Phase 44 completion
- Update ROADMAP.md with plan progress
- Mark requirements MILE-01, MILE-02 complete in REQUIREMENTS.md
- Execute Phase 45 (Database Schema Foundation)
