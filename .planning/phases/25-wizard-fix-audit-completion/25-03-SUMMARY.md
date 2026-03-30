---
phase: 25-wizard-fix-audit-completion
plan: 03
subsystem: api
tags: [drizzle-orm, audit-log, transactions, ingestion, discovery, postgresql]

# Dependency graph
requires:
  - phase: 25-01
    provides: audit_log table schema and writeAuditLog helper pattern
  - phase: 22-source-badges-audit-log
    provides: auditLog schema table definition in db/schema.ts
provides:
  - db.transaction() wrapping for all entity writes in ingestion/approve route (insertItem, mergeItem, deleteItem)
  - db.transaction() wrapping for all entity writes in discovery/approve route (insertDiscoveredItem)
  - Atomic audit trail for bulk approval flows — entity write rollback on audit insert failure
affects: [phase-25-04, audit-reporting, ingestion-pipeline, discovery-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "db.transaction(async (tx) => { entity write + tx.insert(auditLog) }) for all bulk approval entity writes"
    - "Full before-state SELECT outside transaction before merge; after_json computed from spread"
    - "before_json: null for all insert operations; after_json: full .returning() result"
    - "before_json: full record for delete; after_json: null"

key-files:
  created: []
  modified:
    - bigpanda-app/app/api/ingestion/approve/route.ts
    - bigpanda-app/app/api/discovery/approve/route.ts
    - bigpanda-app/tests/audit/ingestion-approve-audit.test.ts

key-decisions:
  - "Inline tx.insert(auditLog) inside db.transaction() rather than writeAuditLog helper — helper does not accept tx parameter"
  - "For mergeItem before_json: full SELECT before transaction (findConflict only returns { id })"
  - "entity_type for 'team' remains 'team' (not 'focusArea') matching entity extraction convention"
  - "entity_type for 'note' uses item.entityType ('note') even though storage is engagementHistory table"
  - "history/default case in discovery route uses literal 'history' for entity_type"

patterns-established:
  - "Every entity write in bulk approve routes wrapped in db.transaction() with auditLog insert"
  - "actor_id: 'default' on all audit rows in bulk approve routes"

requirements-completed: [AUDIT-02]

# Metrics
duration: 4min
completed: 2026-03-30
---

# Phase 25 Plan 03: Audit Transactions for Bulk Approve Routes Summary

**db.transaction() wrapping added to all entity writes in ingestion/approve and discovery/approve routes, producing one atomic audit_log row per entity with correct before/after state**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T17:19:15Z
- **Completed:** 2026-03-30T17:23:16Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `insertItem`, `mergeItem`, and `deleteItem` in ingestion/approve now each use `db.transaction()` with inline `tx.insert(auditLog)` — a failed audit insert rolls back the entity write
- `insertDiscoveredItem` in discovery/approve now uses `db.transaction()` for all 6 entity types (action, risk, decision, milestone, stakeholder, history/default)
- All 14 audit tests GREEN (2 new test suites + 1 regression check + 1 existing helper suite)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add audit transactions to ingestion/approve route** - `72e3348` (feat)
2. **Task 2: Add audit transactions to discovery/approve route** - `60b0b0d` (feat)

## Files Created/Modified
- `bigpanda-app/app/api/ingestion/approve/route.ts` - Added auditLog import; insertItem/mergeItem/deleteItem wrapped in db.transaction()
- `bigpanda-app/app/api/discovery/approve/route.ts` - Added auditLog import; insertDiscoveredItem wrapped in db.transaction() for all cases
- `bigpanda-app/tests/audit/ingestion-approve-audit.test.ts` - Fixed test mock setup (mockTx.update/delete chain configuration, default db.select mock)

## Decisions Made
- Used inline `tx.insert(auditLog)` inside `db.transaction()` instead of `writeAuditLog` helper, since the helper uses the top-level `db` and cannot participate in a transaction
- For mergeItem, the before-state is fetched via a full SELECT outside the transaction before the update — this is correct since `findConflict` only returns `{ id }` (per plan pitfall warning)
- entity_type string matches the `item.entityType` / `field` variable from the route, not the underlying table name

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incomplete test mock setup in ingestion-approve-audit.test.ts**
- **Found during:** Task 1 (Add audit transactions to ingestion/approve route)
- **Issue:** `mockTx.update` and `mockTx.delete` had no chain configured in `beforeEach`, causing `TypeError: Cannot read properties of undefined (reading 'set')` when mergeItem test ran. Also, default `db.select` mock returned the artifact object for ALL calls, causing `findConflict` to see a conflict for ING-1 (insert path) and never call `insertItem`.
- **Fix:** Added `mockTx.update.mockReturnValue(mockUpdateChain)` and `mockTx.delete.mockReturnValue(...)` to `beforeEach`. Changed default `db.select` mock to return artifact only on first call, empty array for subsequent calls (no conflict for insert path test).
- **Files modified:** `bigpanda-app/tests/audit/ingestion-approve-audit.test.ts`
- **Verification:** All 7 ingestion audit tests pass GREEN
- **Committed in:** `72e3348` (part of Task 1 commit)

**2. [Rule 1 - Bug] Removed duplicate `source` field in note case of insertItem**
- **Found during:** Task 1 TypeScript check
- **Issue:** `source: 'ingestion'` was specified explicitly AND included via `...attribution` spread, causing TS2783 error
- **Fix:** Removed the explicit `source: 'ingestion'` line, keeping only `...attribution`
- **Files modified:** `bigpanda-app/app/api/ingestion/approve/route.ts`
- **Verification:** `npx tsc --noEmit` shows no errors in modified files
- **Committed in:** `72e3348` (part of Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes were necessary for tests to pass and TypeScript to compile. No scope creep.

## Issues Encountered
- Test mock for `mockTx` in ingestion test was defined with chains at module level (`mockUpdateChain`, `mockDeleteChain`) but those chains were never wired to `mockTx` in `beforeEach`. The pre-existing `mockInsertChain` pattern existed but wasn't applied to update/delete mocks.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AUDIT-02 closed: both bulk approval routes now produce atomic audit_log rows
- All 14 audit tests GREEN
- Ready for Phase 25-04 (next plan in the wizard fix / audit completion phase)

---
*Phase: 25-wizard-fix-audit-completion*
*Completed: 2026-03-30*
