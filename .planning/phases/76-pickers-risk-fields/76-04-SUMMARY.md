---
phase: 76-pickers-risk-fields
plan: "04"
subsystem: api
tags: [security, multi-tenant, drizzle-orm, postgres, rls, tasks-bulk]

# Dependency graph
requires:
  - phase: 75-schema-quick-wins
    provides: requireProjectRole and requireSession patterns established for all route handlers
provides:
  - POST /api/tasks-bulk now enforces project membership before modifying tasks
  - Multi-tenant security gap CLOSED — cross-project bulk task updates return 403
affects:
  - 76-pickers-risk-fields (bulk actions UI now safe to extend)
  - any phase adding endpoints that modify tasks in bulk

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Project-scope pattern: look up first task project_id → requireProjectRole → transaction with SET LOCAL app.current_project_id"
    - "TDD: RED commit of failing tests before GREEN implementation commit"

key-files:
  created:
    - app/api/__tests__/tasks-bulk.test.ts
  modified:
    - app/api/tasks-bulk/route.ts

key-decisions:
  - "POST /api/tasks-bulk uses first task's project_id to gate the entire batch (mirrors DELETE handler pattern)"
  - "void session annotation added after transaction block (unreachable but satisfies lint; mirrors DELETE handler)"
  - "Pre-existing TS errors in unrelated test files (lifecycle/archive, skills/front-matter-strip) are out of scope — tasks-bulk route compiles clean"

patterns-established:
  - "Bulk mutation security: always look up first item's project_id, call requireProjectRole before any DB write"

requirements-completed:
  - PICK-05

# Metrics
duration: 12min
completed: "2026-04-23"
---

# Phase 76 Plan 04: Tasks-Bulk POST Security Gap Summary

**POST /api/tasks-bulk hardened with requireProjectRole + RLS transaction, closing confirmed multi-tenant security gap that allowed cross-project task modification**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-23T01:09:57Z
- **Completed:** 2026-04-23T01:11:44Z
- **Tasks:** 1 (TDD: 2 commits — RED test + GREEN implementation)
- **Files modified:** 2

## Accomplishments

- Closed confirmed multi-tenant security gap: POST /api/tasks-bulk previously updated any tasks without project membership check
- Applied the same project-scoping pattern already used in DELETE handler (look up first task project_id → requireProjectRole → transaction with SET LOCAL)
- Added 404 response when task_ids[0] does not exist (previously fell through to a 500 on null reference)
- 10 tests written and passing covering: success path, requireProjectRole called with correct project_id, transaction + RLS SET LOCAL, 403 for non-members, 404 for missing tasks, 422/400 for invalid input, 401 for unauthenticated

## Task Commits

TDD tasks have multiple commits (test → feat):

1. **Task 1 RED — failing tests** - `21eb7361` (test)
2. **Task 1 GREEN — implementation** - `b4ff531e` (feat)

## Files Created/Modified

- `app/api/tasks-bulk/route.ts` - POST handler patched: old direct `db.update()` without project check replaced by (1) task lookup, (2) requireProjectRole gate, (3) transaction with SET LOCAL RLS variable
- `app/api/__tests__/tasks-bulk.test.ts` - 10 tests covering security, success, validation, and auth-gate scenarios

## Decisions Made

- POST handler uses first task's project_id to gate the entire batch — same heuristic as DELETE. Multi-project batches are implicitly scoped to the first task's project; DB-level RLS via SET LOCAL further restricts writes to that project.
- `void session` annotation placed after the try/catch (unreachable code) to match the DELETE handler's style and suppress potential lint warnings.
- Pre-existing TypeScript errors in `__tests__/lifecycle/archive.test.ts` and `__tests__/skills/front-matter-strip.test.ts` and `components/TaskEditModal.tsx` are out of scope — none relate to `tasks-bulk/route.ts` and the target file compiles clean.

## Deviations from Plan

None - plan executed exactly as written. The test assertion for `SET LOCAL` SQL object serialization used `JSON.stringify` instead of `String()` (Drizzle `sql.raw()` returns an object, not a string) — this was a minor test implementation detail, not a deviation from the plan's intent.

## Issues Encountered

None - implementation was straightforward. One test assertion needed adjustment: `String(sql.raw(...))` returns `[object Object]` so switched to `JSON.stringify()` which includes the raw SQL string content.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The multi-tenant security gap in tasks-bulk is closed
- Phase 76 can proceed to remaining plans (owner picker dual-write, risk structured fields, etc.)
- The project-scoping pattern (lookup → requireProjectRole → transaction + SET LOCAL) is now consistently applied to both POST and DELETE in tasks-bulk

---
*Phase: 76-pickers-risk-fields*
*Completed: 2026-04-23*
