---
phase: 40-search-traceability-skills-ux
plan: 03
subsystem: search-traceability
tags: [client-side-filtering, url-params, radix-tabs, reverse-lookup]
dependencies:
  requires: [40-01]
  provides: [decisions-filter-ui, artifact-traceability]
  affects: [decisions-tab, artifacts-modal]
tech_stack:
  added: []
  patterns: [server-component-client-island, url-param-filtering, radix-tabs, fetch-on-tab-switch]
key_files:
  created:
    - bigpanda-app/components/DecisionsTableClient.tsx
    - bigpanda-app/app/api/artifacts/[id]/extracted/route.ts
  modified:
    - bigpanda-app/app/customer/[id]/decisions/page.tsx
    - bigpanda-app/lib/queries.ts
    - bigpanda-app/components/ArtifactEditModal.tsx
    - bigpanda-app/tests/search/decisions-filter.test.tsx
    - bigpanda-app/tests/artifacts/extracted-entities.test.tsx
decisions:
  - "DecisionsTableClient follows ActionsTableClient pattern: Server Component passes data, Client island filters with URL params"
  - "Client-side filtering via useMemo — no additional API calls for text/date filters"
  - "Artifact extracted entities endpoint path: /api/artifacts/[id]/extracted (plan spec, not test placeholder)"
  - "ArtifactEditModal uses Radix Tabs with lazy loading: entities fetched only when tab clicked"
  - "Entity links are buttons (not anchors) that call router.push and setOpen(false) to navigate and close modal"
  - "Fixed test mocks to use Map pattern (consistent with workspace-tabs.test.tsx)"
metrics:
  duration_seconds: 442
  completed_at: "2026-04-07T03:24:19Z"
  test_files_modified: 2
  test_cases_passing: 10
  commits: 2
---

# Phase 40 Plan 03: Decisions Filter + Artifact Traceability Summary

**One-liner:** Decisions tab now supports text and date-range filtering via URL params; ArtifactEditModal shows extracted entities grouped by type with navigation links.

## What Was Done

Implemented two independent UX improvements that wire existing infrastructure to new surfaces:

**SRCH-02 (Decisions Filtering):**
- Created DecisionsTableClient component following the established Server Component + Client island pattern from Phase 37
- Text filter searches `decision` and `context` fields (case-insensitive)
- Date range filters use `from` and `to` URL params (composable with text filter)
- Filter state lives in URL — refreshing preserves filters, back button works
- Refactored decisions page.tsx to delegate rendering to DecisionsTableClient
- Client-side filtering with useMemo — zero additional API calls

**ARTF-01 (Extracted Entities):**
- Added `getEntitiesExtractedFromArtifact(artifactId)` query to lib/queries.ts
- Created `/api/artifacts/[id]/extracted` GET endpoint using requireSession auth
- Modified ArtifactEditModal to show two tabs: Details (existing form) + Extracted Entities (new)
- Extracted Entities tab lazy-loads data on first click (no fetch until needed)
- Entities grouped by type (Risks, Actions, Milestones, Decisions) with counts
- Each entity is a clickable button that navigates to the correct tab and closes modal
- Uses existing Radix Tabs component (already installed)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed decisions-filter.test.tsx mock pattern**
- **Found during:** Task 1 verification
- **Issue:** Test attempted to re-mock `useSearchParams` inside each test case using `vi.mocked(...).mockReturnValue()`, which doesn't work with Vitest's hoisting. Tests failed with "mockReturnValue is not a function"
- **Fix:** Changed to Map-based mock pattern (const mockSearchParams = new Map()) that can be updated in beforeEach, consistent with workspace-tabs.test.tsx
- **Files modified:** `bigpanda-app/tests/search/decisions-filter.test.tsx`
- **Commit:** b3d9a71

**2. [Rule 1 - Bug] Fixed extracted-entities.test.tsx component interface**
- **Found during:** Task 2 verification
- **Issue:** Test used `isOpen={true}` and `onClose={fn}` props that don't exist on ArtifactEditModal. The component uses Radix Dialog pattern with `trigger` prop and internal state. Test also used default import for named export.
- **Fix:** Changed test to use correct props (`artifact`, `projectId`, `trigger`) and open modal by clicking trigger. Changed to named import. Updated mock pattern to use shared mockRouter (consistent with decisions-filter fix).
- **Files modified:** `bigpanda-app/tests/artifacts/extracted-entities.test.tsx`
- **Commit:** 25088d9

**3. [Rule 1 - Bug] Fixed extracted-entities.test.tsx API endpoint path**
- **Found during:** Task 2 verification
- **Issue:** Test expected `/api/artifacts/1/entities` but plan specifies `/api/artifacts/[id]/extracted`
- **Fix:** Updated test to expect correct endpoint path
- **Files modified:** `bigpanda-app/tests/artifacts/extracted-entities.test.tsx`
- **Commit:** 25088d9

**4. [Rule 1 - Bug] Fixed mockArtifact shape in extracted-entities.test.tsx**
- **Found during:** Task 2 verification
- **Issue:** Mock artifact had wrong fields (title/content/type instead of name/external_id/status/owner/description)
- **Fix:** Updated mock to match actual Artifact type from schema
- **Files modified:** `bigpanda-app/tests/artifacts/extracted-entities.test.tsx`
- **Commit:** 25088d9

## Technical Notes

### Decisions Filter Implementation

**URL Param Filtering Pattern:**
```typescript
const q = searchParams.get('q') ?? ''
const fromDate = searchParams.get('from') ?? ''
const toDate = searchParams.get('to') ?? ''

const filtered = useMemo(() => {
  let result = decisions
  if (q) result = result.filter(d => d.decision.toLowerCase().includes(q.toLowerCase()))
  if (fromDate) result = result.filter(d => (d.date ?? created_at_fallback) >= fromDate)
  if (toDate) result = result.filter(d => (d.date ?? created_at_fallback) <= toDate)
  return result
}, [decisions, q, fromDate, toDate])
```

**updateParam helper:**
- Creates URLSearchParams from current state
- Sets or deletes key based on value
- Calls `router.push` with `scroll: false` to avoid scroll jump

**Date handling:**
- Uses `decision.date` if present, otherwise falls back to `created_at` ISO date
- Comparison uses string comparison (ISO dates sort correctly)

### Extracted Entities Implementation

**Lazy Loading Pattern:**
```typescript
async function loadExtracted() {
  if (!artifact || extracted) return  // Guard: don't refetch
  setExtractedLoading(true)
  const res = await fetch(`/api/artifacts/${artifact.id}/extracted`)
  const data = await res.json()
  setExtracted(data)
  setExtractedLoading(false)
}

<TabsTrigger value="extracted" onClick={loadExtracted} disabled={!artifact}>
```

**Query implementation:**
```typescript
export async function getEntitiesExtractedFromArtifact(artifactId: number) {
  const [risks, actions, milestones, decisions] = await Promise.all([
    db.select().from(risks).where(eq(risks.source_artifact_id, artifactId)),
    // ... same for actions, milestones, keyDecisions
  ])
  return { risks, actions, milestones, decisions }
}
```

**Navigation pattern:**
- Entity links are buttons (not anchors) for modal close control
- `handleEntityClick(tabPath)` calls `setOpen(false)` then `router.push(path)`
- Tab path map: risks → 'risks', actions → 'actions', milestones → 'milestones', decisions → 'decisions'

### Test Pattern Fixes

Both test files had similar issues: attempting to re-mock hoisted dependencies inside test cases. The fix pattern:

**Before (broken):**
```typescript
it('test', () => {
  vi.mocked(require('next/navigation').useSearchParams).mockReturnValue({ ... })
  render(<Component />)
})
```

**After (working):**
```typescript
const mockSearchParams = new Map()
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key) => mockSearchParams.get(key) ?? null })
}))

beforeEach(() => { mockSearchParams.clear() })
it('test', () => {
  mockSearchParams.set('q', 'budget')
  render(<Component />)
})
```

This pattern is consistent with workspace-tabs.test.tsx and allows per-test mock state without re-mocking.

## Verification

**Automated Tests:**
```bash
cd bigpanda-app && npm test -- --run tests/search/decisions-filter.test.tsx tests/artifacts/extracted-entities.test.tsx
# Result: Test Files 2 passed, Tests 10 passed
```

**TypeScript:**
```bash
npx tsc --noEmit 2>&1 | grep -E "(DecisionsTableClient|ArtifactEditModal|getEntitiesExtractedFromArtifact)"
# Result: No errors in new files
```

## Commits

1. **b3d9a71** — `feat(40-03): add DecisionsTableClient with text + date filtering (SRCH-02)`
   - Created DecisionsTableClient component with URL param filtering
   - Refactored decisions page to Server Component + Client island
   - Fixed test mock pattern to use Map-based approach
   - 5 test cases pass GREEN

2. **25088d9** — `feat(40-03): add extracted entities tab to ArtifactEditModal (ARTF-01)`
   - Added getEntitiesExtractedFromArtifact query and /api/artifacts/[id]/extracted endpoint
   - Modified ArtifactEditModal to show two tabs with lazy loading
   - Fixed test interface, mock pattern, and artifact shape
   - 5 test cases pass GREEN

## Next Steps

The following features remain for Phase 40:
- **SRCH-01** (Global Search Bar) — already implemented in 40-02
- **HIST-01** (Audit History Feed) — merge audit_log entries with engagement_history
- **SKLS-01** (Skills Job Progress) — elapsed timer + status polling
- **SKLS-02** (Skills Job Cancellation) — cancel endpoint + queue removal

SRCH-02 and ARTF-01 are complete and verified. Both features are ready for production use.

## Self-Check: PASSED

All created/modified files verified present:
- bigpanda-app/components/DecisionsTableClient.tsx ✓
- bigpanda-app/app/api/artifacts/[id]/extracted/route.ts ✓
- bigpanda-app/app/customer/[id]/decisions/page.tsx ✓
- bigpanda-app/lib/queries.ts ✓
- bigpanda-app/components/ArtifactEditModal.tsx ✓

All commits verified present:
- b3d9a71 (Task 1: DecisionsTableClient) ✓
- 25088d9 (Task 2: Extracted Entities tab) ✓

All tests passing:
- decisions-filter.test.tsx: 5/5 GREEN ✓
- extracted-entities.test.tsx: 5/5 GREEN ✓
