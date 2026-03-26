---
phase: 19-external-discovery-scan
plan: "04"
subsystem: ui
tags: [react, nextjs, tailwind, discovery, review-queue]

# Dependency graph
requires:
  - phase: 19-03
    provides: /api/discovery/queue, /api/discovery/approve, /api/discovery/dismiss, /api/discovery/dismiss-history routes
  - phase: 19-02
    provides: discoveryItems DB schema and scan infrastructure
provides:
  - Review Queue workspace tab with pending-item badge
  - /customer/[id]/queue RSC page route
  - ReviewQueue client component (orchestrator with bulk-approve, dismiss history)
  - QueueItemRow component (DISC-11 fields: source badge, date, excerpt, destination, value, approve/edit/dismiss)
  - DiffView component (side-by-side conflict diff with Merge/Replace/Skip)
affects: [19-05, phase-19-overall]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - RSC shell page with 'use client' child component (same as Phase 18)
    - useEffect badge fetch in WorkspaceTabs for real-time pending count
    - 409-driven DiffView: approve route can return conflict; client shows inline diff
    - readonly prop on QueueItemRow for dismissed history display

key-files:
  created:
    - bigpanda-app/app/customer/[id]/queue/page.tsx
    - bigpanda-app/components/ReviewQueue.tsx
    - bigpanda-app/components/QueueItemRow.tsx
    - bigpanda-app/components/DiffView.tsx
  modified:
    - bigpanda-app/components/WorkspaceTabs.tsx

key-decisions:
  - "WorkspaceTabs useEffect fetches queue count client-side on mount — badge is non-critical, errors silently ignored"
  - "DiffView triggered by 409 from approve route — consistent with Phase 18 ingestion conflict approach; current approve route does not yet return 409 but DiffView is wired for when it does"
  - "readonly prop on QueueItemRow reuses component for dismissed history without duplicating markup"

patterns-established:
  - "Review Queue UI pattern: RSC page shell + 'use client' orchestrator + per-item row component"
  - "Badge count: useEffect in nav component, non-blocking, silent failure"
  - "Conflict resolution: inline DiffView with Merge/Replace/Skip, no modal"

requirements-completed: [DISC-10, DISC-11, DISC-12, DISC-13, DISC-17]

# Metrics
duration: 10min
completed: 2026-03-26
---

# Phase 19 Plan 04: Review Queue UI Summary

**Review Queue workspace tab with pending-item badge, per-item row (DISC-11 fields), bulk-approve, and inline conflict DiffView wired to 409 approve response**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-26T18:37:55Z
- **Completed:** 2026-03-26T18:48:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added 14th "Review Queue" workspace tab to WorkspaceTabs with amber badge showing pending count
- Created RSC page route at /customer/[id]/queue rendering ReviewQueue client component
- ReviewQueue orchestrates fetch-on-mount, bulk "Approve All" action, and "View dismissal history" toggle
- QueueItemRow shows all DISC-11 fields: source badge (color-coded per tool), scan date, extracted content, suggested destination, collapsible source excerpt with URL link, approve/edit/dismiss actions
- DiffView provides side-by-side comparison with Merge (append), Replace (overwrite), Skip (dismiss) actions, triggered when approve returns 409

## Task Commits

Each task was committed atomically:

1. **Task 1: Review Queue page + WorkspaceTabs queue tab** - `902476b` (feat)
2. **Task 2: ReviewQueue + QueueItemRow + DiffView components** - `0b1c766` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `bigpanda-app/app/customer/[id]/queue/page.tsx` - RSC shell page accepting params Promise<{ id: string }>, renders ReviewQueue
- `bigpanda-app/components/ReviewQueue.tsx` - Orchestrator: fetch queue, bulk-approve, dismiss history toggle, maps items to QueueItemRow
- `bigpanda-app/components/QueueItemRow.tsx` - Per-item row: source badge, date, excerpt, approve/edit/dismiss, DiffView on 409; exports DiscoveryQueueItem interface
- `bigpanda-app/components/DiffView.tsx` - Side-by-side diff grid (existing vs discovered) with Merge/Replace/Skip buttons
- `bigpanda-app/components/WorkspaceTabs.tsx` - Added Review Queue tab (14th), useEffect to fetch pending count, amber badge when count > 0

## Decisions Made
- WorkspaceTabs fetches pending count via useEffect on mount; errors silently ignored (badge is non-critical UX)
- DiffView is wired for 409 conflict response from approve route — the current approve route processes all items without conflict detection, but DiffView will activate automatically when/if the route is enhanced
- Used `readonly` prop on QueueItemRow to reuse for dismissed history display without duplicating markup

## Deviations from Plan

None — plan executed exactly as written. The approve route not currently returning 409 is a known design note; DiffView is built per spec and will activate when the route supports it.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Review Queue UI is complete and accessible from workspace navigation
- DiffView is ready for activation once approve route returns 409 on conflicts
- Phase 19 is now complete (19-01 through 19-04 all done)

---
*Phase: 19-external-discovery-scan*
*Completed: 2026-03-26*
