---
phase: 51-extraction-intelligence-overhaul-full-tab-coverage
plan: 04
subsystem: extraction-pipeline
tags: [approval-feedback, user-visibility, gap-f]
requires: [51-02, 51-03]
provides: [per-entity-approval-breakdown, ui-feedback-display]
affects: [approve-route, ingestion-modal]
tech_stack:
  added: []
  patterns: [per-entity-accumulation, structured-response-breakdown]
key_files:
  created: []
  modified:
    - bigpanda-app/app/api/ingestion/approve/route.ts
    - bigpanda-app/components/IngestionModal.tsx
decisions:
  - "Per-entity response structure uses Record<string, number> for written/skipped counts (not flat integers)"
  - "Errors array accumulates instead of throwing to preserve batch resilience"
  - "IngestionModal 'done' stage displays entity-type breakdown with color-coded sections (written/skipped/errors)"
metrics:
  duration: 45m
  tasks_completed: 3
  tests_added: 0
  tests_updated: 2
  commits: 2
  completed_date: 2026-04-09
---

# Phase 51 Plan 04: Per-Entity Approval Feedback Summary

**One-liner:** Per-entity approval breakdown with structured response (written/skipped/errors by type) and IngestionModal UI feedback display

## What Was Built

Plan 04 closes **Gap F** (per-entity write feedback) and completes the full Phase 51 implementation across all 10 gaps (A–J).

**Core changes:**
1. **Approve route response restructure**: Changed from `{ written: number, skipped: number }` to `{ written: Record<string, number>, skipped: Record<string, number>, errors: Array<{entityType, error}> }`
2. **Per-entity accumulation**: All `written++` and `skipped++` replaced with `written[item.entityType] = (written[item.entityType] ?? 0) + 1` pattern
3. **Error accumulation**: Non-skipEntity errors now accumulate in `errors` array instead of throwing (batch resilience)
4. **IngestionModal feedback display**: 'done' stage now shows entity-type breakdown ("3 actions, 2 risks written; 1 arch_node skipped")
5. **Artifact log update**: Uses `Object.values(written).reduce()` to calculate total written for `items_approved` field

**User-visible outcome:** After approving a batch, users see exactly which entity types were written, skipped, or errored — not just "Items saved to your project."

## Phase 51 Full Coverage

This plan completes all 10 gaps identified in Phase 51:

| Gap | Description | Plan |
|-----|-------------|------|
| A | before_state entity extraction and writing | 51-01 |
| B | wbs_task orphan fallback to Level 1 | 51-03 |
| C | arch_node with unknown track skips gracefully | 51-03 |
| D | team_engagement removed from extraction prompt | 51-02 |
| E | coerceWbsItemStatus + coerceArchNodeStatus normalize statuses | 51-01, 51-02 |
| **F** | **Per-entity write feedback in approve response + UI** | **51-04** |
| G | weekly_focus entity written to Redis cache | 51-01, 51-03 |
| H | team_pathway added to extraction prompt | 51-02 |
| I | workstream disambiguation rule in prompt | 51-02 |
| J | arch_node track name constraint in prompt | 51-02 |

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Restructure approve route response to per-entity breakdown | a4bfb70 | ✓ |
| 2 | Update IngestionModal to display per-entity approval feedback | e51f047 | ✓ |
| 3 | Human verification checkpoint | — | ✓ Approved |

## Deviations from Plan

None — plan executed exactly as written.

## Testing

**Updated tests:**
- `app/api/__tests__/ingestion-approve.test.ts`: Updated assertions to match new response shape (body.written.action === 1 instead of body.written === 1)
- All existing tests pass with new structured response

**Manual verification (Task 3):**
- User uploaded project document, extracted entities, approved batch
- IngestionModal 'done' stage displayed per-entity breakdown correctly
- Skipped arch_node entities appeared in "Skipped" section (not "Errors")
- Full test suite GREEN

## Key Decisions

**1. Per-entity response structure uses Record<string, number> for written/skipped counts (not flat integers)**
- **Rationale:** Enables UI to display entity-type breakdown without additional API calls
- **Impact:** Breaking change for any client expecting `written: number` — mitigated by updating IngestionModal in same plan
- **Alternative considered:** Separate `/api/ingestion/approve/summary` endpoint — rejected as unnecessary round-trip

**2. Errors array accumulates instead of throwing to preserve batch resilience**
- **Rationale:** One entity insertion failure shouldn't crash entire batch approval
- **Impact:** Errors are surfaced in response but don't block other entities from writing
- **Pattern:** Follows same accumulation pattern as skipped entities

**3. IngestionModal 'done' stage displays entity-type breakdown with color-coded sections (written/skipped/errors)**
- **Rationale:** Clear visual hierarchy for success (green), warnings (yellow), and errors (red)
- **Impact:** Users can immediately see which entity types succeeded and which require attention
- **UX pattern:** Mirrors existing unresolvedRefs warning pattern for consistency

## Files Modified

**bigpanda-app/app/api/ingestion/approve/route.ts:**
- Changed `written` and `skipped` from `number` to `Record<string, number>`
- Added `errors: Array<{entityType, error}>` accumulator
- Updated all `written++` to per-entity increment pattern
- Updated all `skipped++` to per-entity increment pattern
- Modified catch block to accumulate errors instead of throwing
- Updated artifact log calculation to use `Object.values(written).reduce()`
- Added `errors` to final response

**bigpanda-app/components/IngestionModal.tsx:**
- Added `approvalResult` state to hold structured response
- Updated approve call response handling to extract `written`, `skipped`, `errors`
- Replaced static "Items saved" message with dynamic entity-type breakdown
- Added color-coded sections for written (green), skipped (yellow), errors (red)
- Reset `approvalResult` on modal close/open

## Metrics

- **Duration:** 45 minutes
- **Tasks completed:** 3/3
- **Tests updated:** 2 (ingestion-approve.test.ts assertions)
- **Commits:** 2 task commits
- **Lines changed:** ~80 (route.ts: ~50, IngestionModal.tsx: ~30)

## Self-Check: PASSED

**Files verified:**
```
FOUND: bigpanda-app/app/api/ingestion/approve/route.ts
FOUND: bigpanda-app/components/IngestionModal.tsx
```

**Commits verified:**
```
FOUND: a4bfb70 (Task 1)
FOUND: e51f047 (Task 2)
```

**Response shape verified:**
- approve/route.ts returns `{ written: Record, skipped: Record, errors: [], rejected, unresolvedRefs }`
- IngestionModal.tsx consumes structured response and displays per-entity breakdown

**Manual verification:**
- User approved checkpoint after testing UI feedback display
- Full test suite GREEN (all tests passing)

## Next Steps

Phase 51 is now **complete** with all 10 gaps (A–J) addressed across Plans 01–04.

**Immediate next actions:**
1. Update STATE.md to mark Phase 51 Plan 04 complete
2. Update ROADMAP.md with plan progress
3. Commit documentation changes

**Future recommendations:**
- Monitor user feedback on per-entity breakdown clarity (especially for large batches with 10+ entity types)
- Consider adding tooltip explanations for "skipped" vs "errors" distinction
- Potential future enhancement: Click-to-view-details for error messages in errors array
