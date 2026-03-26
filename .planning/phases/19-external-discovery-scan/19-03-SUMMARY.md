---
phase: 19-external-discovery-scan
plan: 03
subsystem: api
tags: [vitest, drizzle, nextjs, tdd, discovery, zod]

# Dependency graph
requires:
  - phase: 19-external-discovery-scan/19-01
    provides: discovery_items DB table schema and discoveryItemStatusEnum
  - phase: 18-document-ingestion/18-04
    provides: entity insert pattern with source attribution, Zod v4 z.record fix, vi.resetAllMocks pattern

provides:
  - GET /api/discovery/queue: returns all pending items with 8 display fields, no expiry (DISC-11, DISC-16)
  - GET /api/discovery/dismiss-history: returns status=dismissed items (DISC-15)
  - POST /api/discovery/approve: writes to entity tables with source='discovery', marks discovery_item approved (DISC-14)
  - POST /api/discovery/dismiss: sets status=dismissed via UPDATE (no DELETE), supports bulk inArray (DISC-15)

affects:
  - 19-04 (Review Queue UI calls all 4 routes created here)
  - 22-source-badges-audit-log (source='discovery' attribution visible in badges)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discovery approve uses DISC-{TYPE}-{itemId}-{timestamp} synthetic external_id — same pattern as ING-{TYPE}-{artifactId}-{ts} from 18-04 but keyed on discovery item id"
    - "vi.resetAllMocks() in beforeEach — prevents mockReturnValue implementation leaks across tests (established in 18-04)"
    - "Inline vi.fn() factories in vi.mock() — not top-level const — avoids hoisting issues (established in 18-04)"
    - "Dismiss uses single inArray UPDATE for bulk IDs — one DB roundtrip regardless of batch size"
    - "Approve route iterates per itemId (not inArray) — each item needs individual fetch-then-route logic"

key-files:
  created:
    - bigpanda-app/app/api/discovery/queue/route.ts
    - bigpanda-app/app/api/discovery/dismiss-history/route.ts
    - bigpanda-app/app/api/discovery/approve/route.ts
    - bigpanda-app/app/api/discovery/dismiss/route.ts
  modified:
    - bigpanda-app/tests/discovery/queue.test.ts
    - bigpanda-app/tests/discovery/approve.test.ts
    - bigpanda-app/tests/discovery/dismiss.test.ts

key-decisions:
  - "Discovery approve route uses no conflict detection — simpler than ingestion approve route (18-04). Discovery items are user-curated scan results, not documents with dedup semantics."
  - "source='discovery' written as const in approve route — all entity inserts uniformly attributed to discovery source without per-item logic"
  - "Dismiss uses single inArray UPDATE for bulk efficiency — in contrast to approve which must iterate per item to fetch + route by suggested_field"
  - "catch-all in approve routes unknown suggested_field values to engagement_history — no content is ever lost (mirrors ingestion 'note' catch-all)"

patterns-established:
  - "Discovery CRUD API pattern: GET queue/history (select by status) + POST approve (fetch-route-insert-update) + POST dismiss (batch UPDATE)"
  - "External ID format for discovery: DISC-{TYPE}-{itemId}-{Date.now()} — distinguishable from ingestion ING-* IDs"

requirements-completed: [DISC-10, DISC-11, DISC-12, DISC-13, DISC-14, DISC-15, DISC-16]

# Metrics
duration: 5min
completed: 2026-03-26
---

# Phase 19 Plan 03: Discovery CRUD API Routes Summary

**4 discovery API routes — GET queue (DISC-11,16), GET dismiss-history, POST approve (DISC-13,14), POST dismiss (DISC-15) — all with source='discovery' attribution, 12 tests GREEN**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-26T18:32:03Z
- **Completed:** 2026-03-26T18:35:00Z
- **Tasks:** 2 (both TDD: RED + GREEN)
- **Files modified:** 7 (4 created routes, 3 updated test files)

## Accomplishments

- Created all 4 discovery CRUD API routes for the Review Queue UI (19-04)
- GET /api/discovery/queue: returns all pending items ordered by created_at DESC, no time-based expiry (DISC-16)
- GET /api/discovery/dismiss-history: returns all dismissed items by project
- POST /api/discovery/approve: routes by suggested_field to 5 entity tables + catch-all, writes source='discovery', marks item approved; supports bulk IDs (DISC-13)
- POST /api/discovery/dismiss: sets status='dismissed' via single inArray UPDATE (not DELETE), preserves records (DISC-15)
- 12 tests GREEN across queue.test.ts (5), approve.test.ts (4), dismiss.test.ts (3)

## Task Commits

Each task was committed atomically (TDD: RED then GREEN):

1. **RED: GET queue + dismiss-history tests** - `d4bf196` (test)
2. **GREEN: GET queue + dismiss-history routes** - `4642dbc` (feat)
3. **RED: POST approve + dismiss tests** - `836ef71` (test)
4. **GREEN: POST approve + dismiss routes** - `4b4856d` (feat)

**Plan metadata:** (docs commit — see final commit)

_Note: TDD tasks have RED + GREEN commits each_

## Files Created/Modified

- `bigpanda-app/app/api/discovery/queue/route.ts` — GET handler: pending items by projectId, ordered by created_at DESC
- `bigpanda-app/app/api/discovery/dismiss-history/route.ts` — GET handler: dismissed items by projectId
- `bigpanda-app/app/api/discovery/approve/route.ts` — POST handler: fetch item, insert to entity table by suggested_field, mark approved; bulk itemIds
- `bigpanda-app/app/api/discovery/dismiss/route.ts` — POST handler: inArray UPDATE status=dismissed; no DELETE
- `bigpanda-app/tests/discovery/queue.test.ts` — 5 tests: display fields, no expiry, 400 on missing projectId, dismiss-history shape
- `bigpanda-app/tests/discovery/approve.test.ts` — 4 tests: action/risk insert with source=discovery, status marked approved, bulk IDs
- `bigpanda-app/tests/discovery/dismiss.test.ts` — 3 tests: UPDATE not DELETE, bulk works, dismissed items in history endpoint

## Decisions Made

- **No conflict detection in discovery approve:** Discovery items are user-curated scan results. Unlike ingestion which processes full documents with dedup semantics, discovery items are already filtered by user intent — conflict detection would add friction without benefit.
- **source='discovery' as const:** Written uniformly across all entity inserts in the approve route. No per-item source logic needed.
- **Dismiss uses inArray (batch) vs Approve iterates per item:** Dismiss only needs one UPDATE for all IDs. Approve must fetch each item individually to read `suggested_field` and route to the correct table.
- **catch-all → engagement_history:** Unknown suggested_field values are stored as engagement_history entries — consistent with 18-04's 'note' catch-all pattern, ensures no content is silently dropped.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — pre-existing stub failures in `dedup.test.ts` and `scan.test.ts` (out of scope for this plan, belong to 19-01/19-02) were expected and not touched.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 4 discovery CRUD routes ready for Review Queue UI (19-04)
- Routes follow REST conventions compatible with TanStack Query v5 client patterns
- 12 tests GREEN confirm route contracts before UI wires them

---
*Phase: 19-external-discovery-scan*
*Completed: 2026-03-26*

## Self-Check: PASSED

- FOUND: bigpanda-app/app/api/discovery/queue/route.ts
- FOUND: bigpanda-app/app/api/discovery/dismiss-history/route.ts
- FOUND: bigpanda-app/app/api/discovery/approve/route.ts
- FOUND: bigpanda-app/app/api/discovery/dismiss/route.ts
- FOUND: .planning/phases/19-external-discovery-scan/19-03-SUMMARY.md
- FOUND commit d4bf196: test(19-03): add RED tests for GET queue and dismiss-history
- FOUND commit 4642dbc: feat(19-03): implement GET queue and dismiss-history routes
- FOUND commit 836ef71: test(19-03): add RED tests for POST approve and dismiss
- FOUND commit 4b4856d: feat(19-03): implement POST approve and dismiss routes
