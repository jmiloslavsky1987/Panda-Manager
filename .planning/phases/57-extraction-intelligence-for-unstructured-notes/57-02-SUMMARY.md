---
phase: 57-extraction-intelligence-for-unstructured-notes
plan: "02"
subsystem: extraction-pipeline
tags: [architecture, extraction, visual-diagram, gap-closure]

dependency_graph:
  requires:
    - phase: 57-01
      provides: synthesis-first extraction prompts
  provides:
    - architecture extraction → arch_node bridge
    - visual diagram status sync from extraction
  affects: [extraction-pipeline, architecture-diagram, current-future-state]

tech_stack:
  added: []
  patterns:
    - "Transaction-level bridge between extraction tables and visual diagram tables"
    - "Graceful fallback for missing arch_track lookups (skip silently, no error)"
    - "Status coercion chain: f.phase → inserted.status → 'planned' fallback"

key_files:
  created: []
  modified:
    - bigpanda-app/app/api/ingestion/approve/route.ts
    - bigpanda-app/app/api/__tests__/ingestion-approve.test.ts

key_decisions:
  - "Bridge code added inside existing architecture INSERT transaction (after auditLog)"
  - "Status coercion tries f.phase first (pilot/live/planned), then falls back to inserted.status"
  - "No matching arch_track → silent skip (architecture_integrations row still committed)"
  - "Test mock fixed: added select method to transaction mock (was missing)"

patterns_established:
  - "Extraction → diagram bridge pattern: after writing to data table, upsert matching visual diagram node in same transaction"

requirements_completed: [SYNTH-01, SYNTH-02, SYNTH-03, SYNTH-04, SYNTH-05]

metrics:
  duration_seconds: 240
  tasks_completed: 2
  tests_fixed: 1
  commits: 2
  completed_date: "2026-04-13"
---

# Phase 57 Plan 02: Architecture Extraction → Arch Node Bridge Summary

**Bridge architecture_integrations → arch_nodes so diagram statuses reflect extraction data: architecture entities approved from extraction now upsert matching arch_node in same transaction, syncing visual diagram to extraction status**

## Context

UAT Test 5 failed because `architecture_integrations` and `arch_nodes` are separate tables with no bridge. Extracted architecture data (ServiceNow, PagerDuty, Event Ingest) all defaulted to "Planned" in the Current & Future State diagram because arch_node statuses are never updated from extraction.

This single-task fix closes the gap: after inserting an architecture entity into `architecture_integrations`, the code now also upserts the matching `arch_node` (inside the same transaction) so the visual diagram reflects extraction status.

## What Was Built

### Task 1: Bridge Code Implementation

Added arch_node upsert logic inside the existing `case 'architecture':` transaction block in `approve/route.ts` (after the `auditLog` insert).

The bridge logic:
1. Extracts `tool_name` (becomes arch_node.name) and `track` (used for arch_track lookup)
2. Queries `arch_tracks` table for matching track via `ilike` (case-insensitive partial match)
3. If track found: upserts arch_node with coerced status
4. If track not found: silently skips (no error, architecture_integrations row still committed)

Status coercion chain:
- First try: `coerceArchNodeStatus(f.phase)` — "pilot", "live", "planned" from architectureIntegrations.phase field
- Fallback: `coerceArchNodeStatus(String(inserted.status))` — status enum value from architectureIntegrations.status
- Final fallback: `'planned'` — if both coercers return null

Upsert uses `onConflictDoUpdate` on the composite unique key: `(project_id, track_id, name)`.

### Task 1 Deviation: Test Mock Fix

**Auto-fix Rule 1 (Bug):** Test was failing with `tx.select is not a function` error.

- **Root cause:** Transaction mock in `ingestion-approve.test.ts` only provided `insert` and `update` methods, but the bridge code added a `tx.select()` call to lookup arch_tracks
- **Fix:** Added `select` method to transaction mock with same chain structure as db-level select mock
- **Verification:** All 4 ingestion-approve tests now pass (was 3 pass, 1 fail before fix)
- **Files modified:** `bigpanda-app/app/api/__tests__/ingestion-approve.test.ts`

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-13T19:46:58Z
- **Completed:** 2026-04-13T19:50:58Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Architecture extraction now syncs visual diagram status automatically
- Graceful fallback: missing arch_track doesn't break extraction (architecture_integrations still committed)
- Test coverage restored: ingestion-approve.test.ts back to 4/4 passing
- UAT gap closed: ServiceNow/PagerDuty/Event Ingest extraction statuses will now appear in diagram

## Task Commits

Each task was committed atomically:

1. **Task 1: Bridge architecture INSERT to arch_node upsert** - `1a0430a` (feat)

**Plan metadata:** (to be committed after SUMMARY creation)

## Files Created/Modified

- `bigpanda-app/app/api/ingestion/approve/route.ts` - Added arch_node upsert bridge inside architecture INSERT transaction (lines 599-628)
- `bigpanda-app/app/api/__tests__/ingestion-approve.test.ts` - Fixed transaction mock to include select method

## Decisions Made

- **Status coercion priority:** Try f.phase first (explicit deployment phase), then inserted.status (enum value), then 'planned' fallback
- **Graceful degradation:** If arch_track lookup returns empty array, skip arch_node upsert silently (no throw, no skipEntity error)
- **Same transaction:** Bridge code runs inside existing architecture transaction to ensure atomicity (both inserts succeed or both fail)
- **Test mock auto-fix:** Added select to transaction mock rather than refactoring bridge code to avoid select

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incomplete transaction mock in test**
- **Found during:** Task 1 (TypeScript compilation clean, but test run failed)
- **Issue:** Transaction mock in ingestion-approve.test.ts only provided insert/update methods. Bridge code added tx.select() call to lookup arch_tracks, causing `tx.select is not a function` error
- **Fix:** Added select method to transaction mock with same chain structure as db-level select mock
- **Files modified:** `bigpanda-app/app/api/__tests__/ingestion-approve.test.ts`
- **Verification:** npm test ingestion-approve.test.ts → 4/4 tests passing (was 3/4 before fix)
- **Committed in:** 1a0430a (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix necessary for test correctness. No scope creep.

## Issues Encountered

None - plan executed smoothly after test mock fix.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Architecture extraction → diagram bridge complete
- Visual diagram now reflects extraction status for architecture entities
- Ready for Phase 57 Plan 03 (if additional synthesis-first extraction enhancements needed)
- UAT Test 5 gap closed: approved architecture entities now update arch_nodes table

## Verification

```bash
# TypeScript compilation clean (no errors in route.ts)
cd /Users/jmiloslavsky/Documents/Project\ Assistant\ Code/bigpanda-app
npx tsc --noEmit 2>&1 | grep "app/api/ingestion/approve/route.ts"
# (no output = no errors)

# Bridge code present in architecture case
grep -n "archNodes" bigpanda-app/app/api/ingestion/approve/route.ts | grep -v "import\|arch_node"
# Output shows line 611 (new bridge code) and line 885 (original arch_node case)

# onConflictDoUpdate present in architecture case
grep -n "onConflictDoUpdate" bigpanda-app/app/api/ingestion/approve/route.ts
# Output shows line 621 (new bridge) and line 895 (original arch_node case)

# Test suite stable
npm test ingestion-approve.test.ts
# 4/4 tests passing
```

## Requirements Satisfied

- **SYNTH-01**: ✓ (completed in 57-01)
- **SYNTH-02**: ✓ (completed in 57-01)
- **SYNTH-03**: ✓ (completed in 57-01)
- **SYNTH-04**: ✓ (completed in 57-01)
- **SYNTH-05**: ✓ (completed in 57-01)

All Phase 57 requirements already satisfied in Plan 57-01. Plan 57-02 is a gap closure plan (UAT follow-up) addressing the architecture_integrations → arch_nodes bridge gap discovered during testing.

---
*Phase: 57-extraction-intelligence-for-unstructured-notes*
*Completed: 2026-04-13*

## Self-Check: PASSED

✓ File exists: `bigpanda-app/app/api/ingestion/approve/route.ts` (modified with bridge code)
✓ File exists: `bigpanda-app/app/api/__tests__/ingestion-approve.test.ts` (modified with select mock)
✓ Commit exists: 1a0430a
✓ Bridge code at line 611: `archNodes` insert with `onConflictDoUpdate`
✓ Test suite: 4/4 ingestion-approve tests passing
✓ TypeScript: 0 errors in route.ts
