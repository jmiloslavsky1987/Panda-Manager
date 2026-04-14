---
phase: 48-architecture-team-engagement
plan: "01"
subsystem: arch-nodes
tags: [api, tdd, wave-0]
dependency_graph:
  requires: [phase-45-schema]
  provides: [arch-node-status-api, arch-node-reorder-api]
  affects: []
tech_stack:
  added: []
  patterns: [gap-close-gap-open-place-reorder, requireSession-defense-in-depth]
key_files:
  created:
    - bigpanda-app/app/api/projects/[projectId]/arch-nodes/[nodeId]/route.ts
    - bigpanda-app/app/api/projects/[projectId]/arch-nodes/reorder/route.ts
    - bigpanda-app/tests/arch/arch-nodes-wiring.test.ts
    - bigpanda-app/tests/arch/status-cycle.test.ts
    - bigpanda-app/tests/arch/column-reorder.test.ts
  modified: []
decisions:
  - Used gap-close/gap-open/place pattern from Phase 47 WBS for display_order reordering
  - Wave 0 test stubs created for Plan 03 (arch-nodes-wiring.test.ts remains RED until data wiring)
  - requireSession used in both API routes for CVE-2025-29927 defense-in-depth
  - Zod enum validation for status field (planned/in_progress/live) matches arch_node_status schema
metrics:
  duration_seconds: 212
  tasks_completed: 3
  files_created: 5
  tests_added: 8
  tests_passing: 6
  tests_deferred: 2
  completed_at: "2026-04-08T21:03:34Z"
---

# Phase 48 Plan 01: Architecture Node API Routes Summary

**One-liner:** Two PATCH API routes for arch node status cycling and column reordering, plus Wave 0 RED test stubs for Plan 03 data wiring.

## Objective

Create the two mutation APIs that Plan 03 (diagram rewiring) depends on, enabling parallel execution. Built status cycling endpoint (PATCH /arch-nodes/[nodeId]) and display_order reordering endpoint (PATCH /arch-nodes/reorder) following Phase 47 WBS patterns. Included Wave 0 test stubs to validate Plan 03's data integration.

## Tasks Completed

### Task 1: Wave 0 RED test stubs
**Commit:** 83fc539
**Status:** Complete (RED as expected)

Created three test files in `tests/arch/`:
- `arch-nodes-wiring.test.ts` — validates getArchNodes integration (2 tests, RED until Plan 03)
- `status-cycle.test.ts` — validates status cycling API (3 tests, now GREEN)
- `column-reorder.test.ts` — validates column reorder API (3 tests, now GREEN)

All 8 tests initially RED before API routes created. After Tasks 2-3, 6/8 GREEN (2 remain RED as Wave 0 stubs for Plan 03).

### Task 2: PATCH /arch-nodes/[nodeId] status cycling API route
**Commit:** d8e9319
**Status:** Complete (GREEN)

Implemented status update endpoint at `app/api/projects/[projectId]/arch-nodes/[nodeId]/route.ts`:
- Zod schema validates `status: z.enum(['planned', 'in_progress', 'live'])`
- Returns 404 for non-existent nodes (pre-check before update)
- Returns 400 for invalid status values or malformed JSON
- requireSession enforces authentication (CVE-2025-29927 defense)
- Returns `{ ok: true }` on success

All 3 status-cycle.test.ts tests now GREEN.

### Task 3: PATCH /arch-nodes/reorder display_order API route
**Commit:** f8fea19
**Status:** Complete (GREEN)

Implemented reorder endpoint at `app/api/projects/[projectId]/arch-nodes/reorder/route.ts`:
- Zod schema validates `{ nodeId, trackId, newDisplayOrder }` payload
- Three-step gap algorithm (copied from Phase 47 WBS pattern):
  1. Close gap at old position (decrement nodes after moved node)
  2. Open gap at new position (increment nodes at/after target)
  3. Place node at newDisplayOrder
- Returns 404 for non-existent nodes
- Returns 400 for missing/invalid fields
- requireSession enforces authentication

All 3 column-reorder.test.ts tests now GREEN.

## Verification

**Full arch test suite:**
```bash
npm test tests/arch/ -- --run
```
Result: 6/8 passing (2 RED stubs expected for Plan 03)

**Full test suite:**
```bash
npm test -- --run
```
Result: 627 passing (15 pre-existing failures in health mocks, deferred past v6.0 per STATE.md)

## Deviations from Plan

None — plan executed exactly as written.

## Dependencies Met

**Requirements satisfied:**
- ARCH-01: Wave 0 test stub created (arch-nodes-wiring.test.ts validates getArchNodes integration)
- ARCH-02: Status cycling API fully implemented and tested

**Blockers resolved:**
- None

**Unblocks next plans:**
- Plan 02 (Team Engagement) can proceed in parallel (no dependency on arch APIs)
- Plan 03 (diagram rewiring) can now integrate these APIs for interactive status cycling and column reordering

## Success Criteria

- [x] All tasks executed (3/3)
- [x] Each task committed individually (3 commits)
- [x] SUMMARY.md created in plan directory
- [x] STATE.md updated with position and decisions
- [x] ROADMAP.md updated with plan progress
- [x] Both API route files exist at correct paths
- [x] PATCH /arch-nodes/[nodeId]: valid status → 200 {ok:true}; invalid status → 400; no auth → redirect; missing node → 404
- [x] PATCH /arch-nodes/reorder: valid payload → 200 {ok:true}; bad payload → 400; missing node → 404
- [x] Three test files created in tests/arch/ (RED before routes, 6/8 GREEN after, 2/8 RED stubs for Plan 03)
- [x] No existing tests broken (pre-existing 15 failures unchanged)

## Technical Notes

### Gap-Close/Gap-Open/Place Pattern

Copied verbatim from `48-RESEARCH.md` and Phase 47 WBS implementation:

1. **Close gap at old position:** `SET display_order = display_order - 1 WHERE display_order > oldDisplayOrder AND track_id = trackId`
2. **Open gap at new position:** `SET display_order = display_order + 1 WHERE display_order >= newDisplayOrder AND track_id = trackId`
3. **Place node:** `SET display_order = newDisplayOrder WHERE id = nodeId`

This pattern prevents display_order gaps and handles concurrent reorders correctly.

### Wave 0 Test Strategy

Following Phase 47 precedent, created test stubs BEFORE implementation:
- Prevents accidental implementation without tests
- Documents API contract early for dependent plans
- arch-nodes-wiring.test.ts remains RED until Plan 03 wires data through InteractiveArchGraph

### Auth Pattern Consistency

Both routes use `requireSession()` at the handler entry point (app-wide standard from Phase 44):
- CVE-2025-29927 defense-in-depth
- Returns redirect Response for unauthenticated requests
- Consistent with all other mutation APIs (WBS, Actions, etc.)

## Self-Check

**Created files verification:**
```bash
[ -f "bigpanda-app/app/api/projects/[projectId]/arch-nodes/[nodeId]/route.ts" ] && echo "FOUND"
[ -f "bigpanda-app/app/api/projects/[projectId]/arch-nodes/reorder/route.ts" ] && echo "FOUND"
[ -f "bigpanda-app/tests/arch/arch-nodes-wiring.test.ts" ] && echo "FOUND"
[ -f "bigpanda-app/tests/arch/status-cycle.test.ts" ] && echo "FOUND"
[ -f "bigpanda-app/tests/arch/column-reorder.test.ts" ] && echo "FOUND"
```

**Commits verification:**
```bash
git log --oneline --all | grep -q "83fc539" && echo "FOUND: Task 1 commit"
git log --oneline --all | grep -q "d8e9319" && echo "FOUND: Task 2 commit"
git log --oneline --all | grep -q "f8fea19" && echo "FOUND: Task 3 commit"
```

## Self-Check: PASSED

All files created and all commits verified.
