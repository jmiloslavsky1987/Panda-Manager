---
phase: 072-feature-unification
plan: "02"
subsystem: ui-tables
tags: [feature-parity, ux-consistency, filtering, empty-states]
dependencies:
  requires: [072-01]
  provides: [unified-table-search, unified-empty-states]
  affects: [risks-ui, milestones-ui, workstreams-ui, decisions-ui]
tech_stack:
  added: []
  patterns: [controlled-state-filtering, empty-state-component]
key_files:
  created: [.planning/phases/072-feature-unification/deferred-items.md]
  modified:
    - bigpanda-app/components/RisksTableClient.tsx
    - bigpanda-app/components/MilestonesTableClient.tsx
    - bigpanda-app/components/WorkstreamTableClient.tsx
    - bigpanda-app/components/DecisionsTableClient.tsx
decisions:
  - Use controlled `q` state (not URL params) for Risks/Milestones search to match their existing filter patterns
  - Removed unused `emptyMessage` prop from WorkstreamTableClient (no external callers)
  - Adapted DecisionsTableClient fix for card layout (centered bordered container instead of TableRow/TableCell)
  - Documented pre-existing ingestion route error as out-of-scope (unrelated to table client changes)
metrics:
  duration_seconds: 239
  tasks_completed: 3
  files_modified: 4
  commits: 3
  deviations: 1
completed_at: "2026-04-20T15:17:46Z"
---

# Phase 072 Plan 02: Table Client UX Unification Summary

**One-liner:** Unified text search, empty states, and filter patterns across all four entity table clients (Actions, Risks, Milestones, Decisions)

## What Was Built

Resolved four medium-priority UX consistency findings from Phase 71 audit by implementing unified patterns across entity tables:

1. **Text Search Added to RisksTableClient**: Implemented controlled `q` state with Input component filtering on `description` and `mitigation` fields
2. **Text Search Added to MilestonesTableClient**: Implemented controlled `q` state with Input component filtering on `name` and `notes` fields
3. **EmptyState Component in WorkstreamTableClient**: Replaced inline paragraph with proper EmptyState component; removed unused `emptyMessage` prop
4. **Improved DecisionsTableClient Zero-Results Display**: Replaced inline paragraph with centered, bordered container for consistency

All four table clients now provide consistent filtering UX and visually prominent empty/no-results states.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add text search (q state) to RisksTableClient and MilestonesTableClient | b11bbee | RisksTableClient.tsx, MilestonesTableClient.tsx |
| 2 | Replace inline empty states and add intentional comments | 18c2392 | WorkstreamTableClient.tsx, DecisionsTableClient.tsx |
| 3 | Document out-of-scope build error | 7a6c25f | deferred-items.md |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] DecisionsTableClient uses card layout, not table**
- **Found during:** Task 2
- **Issue:** Plan assumed DecisionsTableClient used Table/TableRow/TableCell components and instructed counting TableHead elements for colSpan. Actual component uses card-based layout (div elements) for decisions list.
- **Fix:** Adapted the zero-results message fix to work with the card layout - replaced inline paragraph with centered, bordered div that provides visual prominence matching table-based empty states
- **Files modified:** bigpanda-app/components/DecisionsTableClient.tsx
- **Commit:** 18c2392
- **Rationale:** Plan's intent was UX consistency, not forcing a table structure. Card layout is appropriate for decisions (append-only records with context details). Adapted fix maintains consistency while respecting existing architecture.

## Verification Results

All verification criteria met:

1. ✅ RisksTableClient: `q` state present, filters on description/mitigation, Input in filter bar
2. ✅ MilestonesTableClient: `q` state present, filters on name/notes, Input in filter bar
3. ✅ WorkstreamTableClient: EmptyState component imported and used
4. ✅ DecisionsTableClient: Centered, bordered zero-results container (adapted for card layout)
5. ✅ Intentional comments present in DecisionsTableClient (2) and WorkstreamTableClient (2)
6. ✅ TypeScript clean for all modified components (no errors in RisksTableClient, MilestonesTableClient, WorkstreamTableClient, DecisionsTableClient)

**Build Status:** Pre-existing TypeScript error in `app/api/ingestion/approve/route.ts:396` (milestone status type mismatch) documented in deferred-items.md. Not caused by Phase 072-02 changes. Modified components compile cleanly.

## Key Decisions Made

1. **Controlled State vs URL Params for Search**: Used controlled `q` state (useState) for Risks/Milestones instead of URL params to match their existing filter patterns (status/severity/owner/dates already use URL params via `searchParams.get()`, but the components don't expose a text search in URLs)

2. **EmptyState Prop Removal**: Removed `emptyMessage` prop from WorkstreamTableClient interface after confirming zero external callers. Prop was defined but never used by any parent component.

3. **DecisionsTableClient Layout Adaptation**: Recognized that DecisionsTableClient uses card layout (not table), adapted fix to provide visual consistency without architectural changes. Used centered, bordered div instead of TableRow/TableCell to match the visual prominence of table-based empty states.

4. **Out-of-Scope Error Handling**: Documented pre-existing build error in ingestion route as out-of-scope. Error is related to Phase 71 finding about missing DB enums for status fields and should be addressed in Phase 072-03 (DB enum implementation) or separate bug fix.

## Implementation Notes

### Text Search Pattern

Both RisksTableClient and MilestonesTableClient now follow this pattern:

```typescript
// State
const [q, setQ] = useState('')

// Filter logic in useMemo
if (q) {
  const lowerQ = q.toLowerCase()
  result = result.filter(item =>
    (item.field1?.toLowerCase().includes(lowerQ) ?? false) ||
    (item.field2?.toLowerCase().includes(lowerQ) ?? false)
  )
}

// UI
<Input
  placeholder="Search [entity]..."
  value={q}
  onChange={e => setQ(e.target.value)}
  className="h-8 w-48"
/>
```

Search input appears first in filter bar, clear filters button resets `q` along with other filters.

### Intentional Comments Added

- **DecisionsTableClient**: Two comments documenting append-only design (no bulk actions, no edit modal)
- **WorkstreamTableClient**: Two comments documenting progress-slider UX (no bulk actions) and lack of filter bar (low row counts expected)

These comments preserve Phase 71 audit findings as intentional design decisions for future maintainers.

## Testing Performed

- TypeScript compilation verified for all modified components (zero errors)
- Verified `q` state, filtering logic, and Input components present in RisksTableClient and MilestonesTableClient
- Verified EmptyState import and usage in WorkstreamTableClient
- Verified intentional comments present in DecisionsTableClient and WorkstreamTableClient
- Verified zero-results message styled consistently in DecisionsTableClient

## Files Changed

### Created
- `.planning/phases/072-feature-unification/deferred-items.md` - Documents out-of-scope build error

### Modified
- `bigpanda-app/components/RisksTableClient.tsx` - Added q state, text search filtering, Input component
- `bigpanda-app/components/MilestonesTableClient.tsx` - Added q state, text search filtering, Input component
- `bigpanda-app/components/WorkstreamTableClient.tsx` - Replaced inline paragraph with EmptyState component, removed emptyMessage prop, added intentional comments
- `bigpanda-app/components/DecisionsTableClient.tsx` - Replaced inline paragraph with centered bordered container, added intentional comments

## Dependencies & Next Steps

**Provides:**
- Unified text search pattern for Risks and Milestones tables
- Consistent EmptyState component usage across entity tables
- Documented intentional design decisions preventing false-positive audit findings

**Unblocks:**
- Phase 072-03: Remaining feature parity implementations
- Future entity table additions can follow established patterns

**Follow-up:**
- Address pre-existing ingestion route error (documented in deferred-items.md) in Phase 072-03 or separate bug fix

## Success Criteria Met

- ✅ All tasks executed
- ✅ Each task committed individually
- ✅ SUMMARY.md created
- ✅ All deviations documented
- ✅ TypeScript clean for modified components
- ✅ Pre-existing errors documented as out-of-scope

## Self-Check: PASSED

Verified all claims:

**Created files exist:**
```bash
$ ls -la .planning/phases/072-feature-unification/deferred-items.md
-rw-r--r--  1 user  staff  467 Apr 20 15:15 .planning/phases/072-feature-unification/deferred-items.md
```

**Commits exist:**
```bash
$ git log --oneline --grep="072-02" -3
7a6c25f docs(072-02): document out-of-scope build error in deferred-items
18c2392 feat(072-02): replace inline empty states with consistent patterns
b11bbee feat(072-02): add text search to RisksTableClient and MilestonesTableClient
```

**Modified files contain expected changes:**
- ✅ RisksTableClient.tsx: q state, filtering logic, Input component present
- ✅ MilestonesTableClient.tsx: q state, filtering logic, Input component present
- ✅ WorkstreamTableClient.tsx: EmptyState import and usage present, intentional comments present
- ✅ DecisionsTableClient.tsx: centered bordered zero-results container present, intentional comments present

All claims verified successfully.
