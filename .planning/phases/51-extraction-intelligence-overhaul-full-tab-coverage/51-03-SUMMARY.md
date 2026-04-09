---
phase: 51-extraction-intelligence-overhaul-full-tab-coverage
plan: 03
subsystem: ingestion-approve-handlers
tags: [extraction, ingestion, approval-flow, handler-fixes, gap-closure]
dependency_graph:
  requires: [51-01]
  provides: [before_state-handler, weekly_focus-handler, wbs_task-orphan-fix, arch_node-graceful-skip]
  affects: [ingestion-approval-flow, wbs-tree-rendering, architecture-tab, before-state-tab, weekly-focus-cache]
tech_stack:
  added: [coercers-module]
  patterns: [upsert-pattern, redis-cache-write, tagged-error-skip, status-coercion]
key_files:
  created:
    - bigpanda-app/app/api/ingestion/approve/coercers.ts
  modified:
    - bigpanda-app/app/api/ingestion/approve/route.ts
    - bigpanda-app/app/api/__tests__/weekly-focus-ingestion.test.ts
decisions:
  - "Created coercers.ts stub in Plan 03 (blocking dependency for Wave 1 parallel execution with Plan 02)"
  - "Used tagged skipEntity error pattern for arch_node graceful degradation (not plain throw)"
  - "Applied per-item try-catch in POST loop to isolate skip errors from full batch failures"
  - "Fixed test bug: weekly-focus test was passing raw array instead of JSON-stringified string for bullets field"
metrics:
  duration_seconds: 301
  tasks_completed: 2
  files_modified: 3
  commits: 2
  tests_passing: 664
  deviations: 2
completed_date: 2026-04-09
---

# Phase 51 Plan 03: Approve Route Handler Fixes (Gaps A, B, C, G) Summary

Fixed four critical handler-level gaps in approve route: wbs_task orphan fallback, arch_node graceful skip on unknown track, before_state upsert handler, and weekly_focus Redis cache write.

## What Was Built

### Task 1: Fix wbs_task orphan (Gap B) + add before_state handler (Gap A)
- **Commit:** 03fa95d
- **Status:** Complete ✓

**Changes:**
1. **Imports:** Added `beforeState` to schema imports, `createApiRedisConnection` from worker/connection, and `coerceWbsItemStatus`/`coerceArchNodeStatus` from new coercers module
2. **Zod enum:** Added `'before_state'` and `'weekly_focus'` to ApprovalItemSchema entity type enum (Gap A+G)
3. **wbs_task handler (Gap B):**
   - Added `fallbackToLevel1` logic: if parent match fails but parent_section_name was provided, treat as Level 1 item (not orphaned)
   - Updated status assignment to use `coerceWbsItemStatus(f.status) ?? 'not_started'` (Gap E fix)
4. **before_state handler (Gap A):**
   - Upsert pattern: SELECT existing row by project_id, then INSERT or UPDATE
   - Pain points parsing: Try JSON.parse first, fall back to comma-separated string split
   - Fields: aggregation_hub_name, alert_to_ticket_problem, pain_points_json
   - Source attribution: `source: 'ingestion'` (not source_artifact_id per schema limitation)
   - Audit log for both INSERT and UPDATE paths

**Key files:**
- `bigpanda-app/app/api/ingestion/approve/route.ts` (imports, Zod enum, wbs_task handler, before_state handler)
- `bigpanda-app/app/api/ingestion/approve/coercers.ts` (created stub with status coercer exports)

**Tests:** ingestion-approve.test.ts (4 tests GREEN)

---

### Task 2: Fix arch_node graceful skip (Gap C) + add weekly_focus handler (Gap G)
- **Commit:** eb28a4d
- **Status:** Complete ✓

**Changes:**
1. **arch_node handler (Gap C):**
   - Replaced direct throw with tagged skipEntity error: `(skipErr as any).skipEntity = true`
   - Updated status assignment to use `coerceArchNodeStatus(f.status) ?? 'planned'` (Gap E fix)
   - Both insert and onConflictDoUpdate blocks use coercer
2. **POST handler skip logic (Gap C):**
   - Wrapped all insertItem/mergeItem calls in try-catch (3 locations: direct insert, replace branch, merge branch)
   - Catch checks for `(err as any).skipEntity === true` → log warning and increment skipped counter
   - All other errors re-thrown to outer catch (preserves existing error handling)
3. **weekly_focus handler (Gap G):**
   - Parses bullets field: try JSON.parse (array), fall back to comma-separated string split
   - Writes to Redis with key format `weekly_focus:${projectId}` and 7-day TTL (604800 seconds)
   - Uses createApiRedisConnection with manual connect/quit (lazyConnect: true pattern)
   - No audit log (Redis cache writes are ephemeral, not DB changes)
4. **Test fix (Deviation Rule 1 - bug):**
   - Fixed weekly-focus-ingestion.test.ts: bullets field must be JSON-stringified string, not raw JavaScript array
   - Test was incorrectly passing `bullets: ['Item 1', 'Item 2']` instead of `bullets: JSON.stringify([...])`
   - Zod schema expects `Record<string, string | null>`, not arrays

**Key files:**
- `bigpanda-app/app/api/ingestion/approve/route.ts` (arch_node handler, POST loop try-catch, weekly_focus handler)
- `bigpanda-app/app/api/__tests__/weekly-focus-ingestion.test.ts` (fixed bullets field format)

**Tests:** weekly-focus-ingestion.test.ts (3 tests GREEN), full suite 664 passing (up from 662)

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created coercers.ts stub for Wave 1 parallel execution**
- **Found during:** Task 1 initialization
- **Issue:** Plan 03 depends on coercers.ts (created in Plan 02), but both plans are Wave 1 with same dependency (51-01). Importing from non-existent module would block execution.
- **Fix:** Created minimal coercers.ts stub with coerceWbsItemStatus and coerceArchNodeStatus exports. Plan 02 will complete/overwrite this file when it runs.
- **Files created:** bigpanda-app/app/api/ingestion/approve/coercers.ts
- **Commit:** 03fa95d (bundled with Task 1)
- **Rationale:** Plan note said import is "forward-compatible" — stub unblocks Plan 03 while preserving Plan 02's ownership of final implementation.

**2. [Rule 1 - Bug] Fixed weekly-focus test bullets field format**
- **Found during:** Task 2 verification (test execution)
- **Issue:** weekly-focus-ingestion.test.ts passed bullets as raw JavaScript array `['Item 1', 'Item 2']`, but Zod schema expects `Record<string, string | null>`. This would fail validation in real flow.
- **Fix:** Changed test to pass bullets as JSON-stringified string: `JSON.stringify(['Item 1', 'Item 2'])`
- **Files modified:** bigpanda-app/app/api/__tests__/weekly-focus-ingestion.test.ts
- **Commit:** eb28a4d (bundled with Task 2)
- **Rationale:** Test design bug — handler correctly expects string field (either JSON or comma-separated). Fixed test to match actual ingestion flow data format.

---

## Verification Results

### Automated Tests
- **ingestion-approve.test.ts:** 4/4 tests GREEN (Gaps 1-4 from Phase 50 still pass, no regressions)
- **weekly-focus-ingestion.test.ts:** 3/3 tests GREEN (all Gap G tests pass after test fix)
- **Full test suite:** 664 passing tests (up from 662 pre-Task 2), 16 failing test files (pre-existing, unrelated to Plan 03)

### Code Inspection
- ✓ `case 'arch_node':` no longer calls `throw new Error('Architecture track not found: ...')` directly — uses tagged skipEntity error
- ✓ `case 'before_state':` exists in insertItem switch with upsert pattern
- ✓ `case 'weekly_focus':` exists in insertItem switch with Redis write
- ✓ `'before_state'` and `'weekly_focus'` are in ApprovalItemSchema Zod enum
- ✓ wbs_task uses `fallbackToLevel1` logic and `coerceWbsItemStatus`
- ✓ arch_node uses `coerceArchNodeStatus` in both insert and onConflictDoUpdate
- ✓ POST loop has per-item try-catch in 3 locations (direct insert, replace, merge)

### Manual Smoke Test (if needed)
Not performed — automated tests provide sufficient coverage for handler logic and Redis mock interaction.

---

## Key Decisions Made

1. **Coercers.ts stub creation:** Created minimal implementation in Plan 03 to unblock Wave 1 parallel execution. Plan 02 owns final implementation.
2. **Tagged error pattern:** Used `skipEntity` property on Error object (not custom error class) for simplicity and minimal refactor.
3. **Per-item try-catch placement:** Wrapped each insertItem/mergeItem call individually (not outer loop) to maximize granularity — one skip doesn't block remaining items.
4. **Weekly focus no audit log:** Redis cache writes are ephemeral (7-day TTL) and not structural DB changes, so no audit log entry created (matches existing cache write patterns).

---

## Success Criteria Met

- [x] All tasks executed (2/2)
- [x] Each task committed individually with proper format
- [x] All deviations documented (2 auto-fixes: coercers stub, test bug)
- [x] SUMMARY.md created in plan directory
- [x] Ready for STATE.md and ROADMAP.md updates

---

## Next Steps

1. Run `gsd-tools state advance-plan` to increment STATE.md Current Plan counter
2. Run `gsd-tools state update-progress` to recalculate progress bar
3. Run `gsd-tools roadmap update-plan-progress 51` to update ROADMAP.md Phase 51 row
4. Run `gsd-tools requirements mark-complete GAP-A GAP-B GAP-C GAP-G` to check off requirement boxes
5. Create final metadata commit with SUMMARY.md, STATE.md, ROADMAP.md, REQUIREMENTS.md
6. Proceed to Plan 04 (Gap F: per-entity write feedback) or Plan 02 if not yet executed

---

## Self-Check: PASSED

All claimed artifacts verified:

**Created files:**
- ✓ bigpanda-app/app/api/ingestion/approve/coercers.ts

**Modified files:**
- ✓ bigpanda-app/app/api/ingestion/approve/route.ts
- ✓ bigpanda-app/app/api/__tests__/weekly-focus-ingestion.test.ts

**Commits:**
- ✓ 03fa95d (Task 1: wbs_task orphan fix + before_state handler)
- ✓ eb28a4d (Task 2: arch_node graceful skip + weekly_focus handler)
