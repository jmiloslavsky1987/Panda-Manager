---
phase: 25-wizard-fix-audit-completion
plan: 04
subsystem: api
tags: [drizzle, audit-log, tasks, stakeholders, transaction, tdd, vitest]

# Dependency graph
requires:
  - phase: 22-source-badges-audit-log
    provides: auditLog table in db/schema with entity_type, entity_id, action, actor_id, before_json, after_json columns
  - phase: 25-01
    provides: RED test stubs and audit transaction pattern established for ingestion/discovery routes
  - phase: 25-03
    provides: audit transaction pattern validated in ingestion/approve and discovery/approve routes
provides:
  - "tasks POST route: db.transaction() wrapping task insert + auditLog insert with action=create"
  - "tasks PATCH route: full before-state SELECT + db.transaction() wrapping update + after-state SELECT + auditLog insert with action=update"
  - "tasks DELETE route: full before-state SELECT + db.transaction() wrapping delete + auditLog insert with action=delete"
  - "stakeholders POST route: db.transaction() wrapping stakeholder insert + auditLog insert with action=create"
  - "6 RED-then-GREEN TDD tests for task audit behavior, 3 for stakeholder audit behavior"
affects: [AUDIT-02, audit-log-view, workspace-write-surface]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Entity route audit: import auditLog from schema, full SELECT before mutation, wrap mutation+auditLog in db.transaction(), workstream rollup after transaction"
    - "PATCH consolidation: single full SELECT replaces partial select for both 404 check and audit before_json"
    - "DELETE audit: full SELECT provides both workstream_id for rollup and full before_json for audit"

key-files:
  created:
    - bigpanda-app/tests/audit/tasks-audit.test.ts
    - bigpanda-app/tests/audit/stakeholders-audit.test.ts
  modified:
    - bigpanda-app/app/api/tasks/route.ts
    - bigpanda-app/app/api/tasks/[id]/route.ts
    - bigpanda-app/app/api/stakeholders/route.ts

key-decisions:
  - "PATCH handler consolidated partial SELECT into full SELECT — serves both 404 guard and audit before_json, removing redundant query"
  - "DELETE handler similarly consolidated — full SELECT replaces partial {workstream_id} SELECT"
  - "workstream rollup (updateWorkstreamProgress) preserved after transaction in both PATCH and DELETE — not moved inside transaction per plan spec"
  - "stakeholders/route.ts gained try/catch error handling (Rule 2 auto-fix: previously unhandled DB errors would crash)"

patterns-established:
  - "Full-entity SELECT before mutation: select all columns (not partial) when mutation produces audit row — satisfies both 404 check and before_json"
  - "Transaction scope: only entity mutation + audit insert inside tx; pre-flight SELECTs and post-flight rollups remain outside"

requirements-completed: [AUDIT-02]

# Metrics
duration: 7min
completed: 2026-03-30
---

# Phase 25 Plan 04: Tasks and Stakeholders Audit Writes Summary

**Atomic audit_log writes added to tasks POST/PATCH/DELETE and stakeholders POST using db.transaction() — AUDIT-02 closed for highest-volume entity types**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-30T17:25:00Z
- **Completed:** 2026-03-30T17:32:00Z
- **Tasks:** 2
- **Files modified:** 5 (3 route files + 2 test files)

## Accomplishments
- Tasks POST now writes audit row with action=create, before_json null, after_json full inserted row, inside transaction
- Tasks PATCH now reads full before-state, wraps update + after-state read + auditLog insert in transaction
- Tasks DELETE now reads full before-state, wraps delete + auditLog insert in transaction
- Stakeholders POST now wraps insert + auditLog insert in transaction with action=create
- 9 new TDD tests (6 task audit + 3 stakeholder audit) all GREEN; total audit suite 23/23 passing

## Task Commits

Each task was committed atomically:

1. **RED: Failing audit tests (Task 1+2)** - `58fd3b8` (test)
2. **Task 1: tasks POST/PATCH/DELETE audit** - `2e7e7d3` (feat)
3. **Task 2: stakeholders POST audit** - `f051813` (feat)

## Files Created/Modified
- `bigpanda-app/tests/audit/tasks-audit.test.ts` - 6 TDD tests for task route audit behavior (POST/PATCH/DELETE)
- `bigpanda-app/tests/audit/stakeholders-audit.test.ts` - 3 TDD tests for stakeholders POST audit behavior
- `bigpanda-app/app/api/tasks/route.ts` - POST handler wrapped in db.transaction() with auditLog insert
- `bigpanda-app/app/api/tasks/[id]/route.ts` - PATCH and DELETE handlers wrapped in db.transaction() with auditLog inserts; partial SELECTs consolidated into full SELECTs
- `bigpanda-app/app/api/stakeholders/route.ts` - POST handler wrapped in db.transaction() with auditLog insert; added try/catch error handling

## Decisions Made
- Consolidated the partial `select({ workstream_id })` in PATCH and DELETE into a full `select()` — this serves dual purpose (404 check + audit before_json) and removes a redundant round-trip
- workstream rollup calls preserved outside transaction as specified — they are fire-and-forget and should not roll back with entity mutations

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added try/catch error handling to stakeholders POST**
- **Found during:** Task 2 (stakeholders POST implementation)
- **Issue:** Original stakeholders/route.ts had no error handling around the DB insert — any DB failure would crash with an unhandled exception
- **Fix:** Wrapped transaction in try/catch, returning 500 with error message (consistent with tasks route pattern)
- **Files modified:** bigpanda-app/app/api/stakeholders/route.ts
- **Verification:** Tests pass; route returns 201 on success, 500 on DB error
- **Committed in:** f051813 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (missing critical error handling)
**Impact on plan:** Essential for correct error behavior. No scope creep.

## Issues Encountered
None — plan executed cleanly. Pre-existing TypeScript errors in unrelated files (Redis/ioredis version conflict in jobs/trigger route, time-entries bulk route) were out of scope and logged as deferred items.

## Next Phase Readiness
- AUDIT-02 now fully closed: tasks and stakeholders mutations all produce audit rows atomically
- Pattern established for remaining entity types (actions, risks, milestones, etc.) if audit coverage is extended
- All 54 tests in audit/ and wizard/ suites passing

---
*Phase: 25-wizard-fix-audit-completion*
*Completed: 2026-03-30*

## Self-Check: PASSED

- FOUND: bigpanda-app/app/api/tasks/route.ts
- FOUND: bigpanda-app/app/api/tasks/[id]/route.ts
- FOUND: bigpanda-app/app/api/stakeholders/route.ts
- FOUND: bigpanda-app/tests/audit/tasks-audit.test.ts
- FOUND: bigpanda-app/tests/audit/stakeholders-audit.test.ts
- FOUND: .planning/phases/25-wizard-fix-audit-completion/25-04-SUMMARY.md
- FOUND commit: 58fd3b8 (RED tests)
- FOUND commit: 2e7e7d3 (Task 1 implementation)
- FOUND commit: f051813 (Task 2 implementation)
