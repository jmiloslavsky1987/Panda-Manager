---
phase: 41-ux-polish-consistency
plan: 02
subsystem: ui-components
tags:
  - empty-states
  - overdue-highlighting
  - table-clients
  - uxpol-01
  - uxpol-02
dependency_graph:
  requires:
    - 41-01 (EmptyState component)
  provides:
    - Empty state CTAs for Actions, Risks, Milestones, Decisions tables
    - Overdue row highlighting for Actions and Milestones tables
  affects:
    - ActionsTableClient
    - MilestonesTableClient
    - RisksTableClient
    - DecisionsTableClient
tech_stack:
  added: []
  patterns:
    - Empty state check on raw props array (not filtered)
    - Overdue detection using ISO date comparison
    - Row styling with border-red-500 bg-red-50
    - data-testid attributes for test targeting
key_files:
  created: []
  modified:
    - bigpanda-app/components/ActionsTableClient.tsx
    - bigpanda-app/components/MilestonesTableClient.tsx
    - bigpanda-app/components/RisksTableClient.tsx
    - bigpanda-app/components/DecisionsTableClient.tsx
decisions:
  - Empty state shown only when raw props array is empty (not when filtered)
  - Placeholder onClick handlers for CTA buttons (wiring to forms deferred)
  - Milestones retain both Overdue badge AND row highlight per user decision
  - Badge uses bg-red-100 text-red-700 to contrast against bg-red-50 row
  - data-testid attributes added to table rows for test targeting
metrics:
  duration_minutes: 3
  files_modified: 4
  tests_added: 0
  tests_passing: 13
  commits: 2
completed: 2026-04-07T06:46:08Z
---

# Phase 41 Plan 02: Empty States and Overdue Row Highlighting Summary

**One-liner:** Empty state CTAs and overdue row highlighting (border-red-500 bg-red-50) wired into Actions, Risks, Milestones, and Decisions table clients

## What Was Built

Implemented UXPOL-01 (empty state CTAs) and UXPOL-02 (overdue row highlighting) across all four table-managed tab components in a single pass.

### Task 1: ActionsTableClient — Empty State + Overdue Highlighting

**Changes:**
- Added EmptyState import and early return when `actions.length === 0`
- Created `isOverdueAction(dueDate, status)` helper function
- Applied `border-red-500 bg-red-50` className to overdue action rows
- Added `data-testid="action-row-{id}"` for test targeting
- Excluded completed/cancelled actions from overdue styling

**Empty State:** Shows "No actions yet" with "Add Action" CTA button when actions array is empty. When filters reduce results but actions exist, existing "No actions found" text remains in table body.

**Overdue Logic:** Compares due date string against today's ISO date, excludes completed/cancelled statuses.

**Commit:** `ee7295a` — feat(41-02): add empty state CTA and overdue row highlighting to ActionsTableClient

### Task 2: MilestonesTableClient, RisksTableClient, DecisionsTableClient

**MilestonesTableClient (2 changes):**
1. **Overdue row highlighting:** Added `className={overdue ? 'border-red-500 bg-red-50' : ''}` to TableRow. Existing `isOverdueMilestone()` helper and `overdue` variable already present. Retained existing "Overdue" badge alongside row highlight per user decision.
2. **Empty state:** Shows "No milestones yet" with "Add Milestone" CTA when milestones array is empty.

**RisksTableClient (1 change):**
- **Empty state:** Shows "No risks logged" with "Add Risk" CTA when risks array is empty.

**DecisionsTableClient (1 change):**
- **Empty state:** Shows "No decisions logged" with "Log a Decision" CTA when decisions array is empty.

All empty states use placeholder `onClick: () => {}` handlers — wiring to actual add/create forms is deferred (out of UXPOL scope).

**Commit:** `386443d` — feat(41-02): add overdue row highlighting and empty states to remaining table clients

## Test Results

**Target tests (overdue-highlighting.test.tsx + empty-states.test.tsx):**
- 13 tests passed (100%)
- 0 failures

**Test coverage:**
- Actions table: empty state CTA + overdue open action + no styling on completed action ✅
- Milestones table: overdue incomplete milestone + no styling on completed milestone ✅
- Risks table: empty state CTA ✅
- Decisions table: empty state CTA ✅
- EmptyState component tests (5 direct tests) ✅

**Full test suite:** 553 passed, 8 failed (failures pre-existing, unrelated to this plan — in ingestion, loading-skeletons, wizard tests)

**TypeScript check:** No errors in modified files.

## Deviations from Plan

None — plan executed exactly as written.

## Key Decisions

1. **Empty state trigger:** Check `actions.length === 0` (raw props array), not `filteredActions.length`. Empty state is for "no data at all," not "no data after filtering."
2. **CTA onClick handlers:** Placeholder functions used. Actual wiring to creation forms is deferred as UX polish (not UXPOL requirement scope).
3. **Milestones overdue treatment:** Both existing "Overdue" badge AND new row highlight retained per explicit user decision in plan.
4. **Badge contrast:** Existing badge uses `bg-red-100 text-red-700` to contrast against `bg-red-50` row background.
5. **Test targeting:** Added `data-testid="action-row-{id}"` and `data-testid="milestone-row-{id}"` attributes for reliable test selectors.

## Files Modified

1. **bigpanda-app/components/ActionsTableClient.tsx** (31 lines changed)
   - Added EmptyState import
   - Added `isOverdueAction()` helper function
   - Early return for empty state
   - Row className conditional on overdue status
   - data-testid attribute

2. **bigpanda-app/components/MilestonesTableClient.tsx** (20 lines changed)
   - Added EmptyState import
   - Early return for empty state
   - Row className conditional on overdue status
   - data-testid attribute

3. **bigpanda-app/components/RisksTableClient.tsx** (15 lines changed)
   - Added EmptyState import
   - Early return for empty state

4. **bigpanda-app/components/DecisionsTableClient.tsx** (17 lines changed)
   - Added EmptyState import
   - Early return for empty state

## Commits

1. `ee7295a` — feat(41-02): add empty state CTA and overdue row highlighting to ActionsTableClient
2. `386443d` — feat(41-02): add overdue row highlighting and empty states to remaining table clients

## Verification

✅ All 13 target tests GREEN (overdue-highlighting + empty-states)
✅ TypeScript clean in modified files
✅ No regressions in prior phase tests (553 passed overall)
✅ Milestones: both badge and row highlight present
✅ Actions: overdue styling excludes completed/cancelled

## Requirements Addressed

- **UXPOL-01:** Empty state CTAs for table-managed tabs (Actions, Risks, Milestones, Decisions)
- **UXPOL-02:** Overdue row highlighting for Actions and Milestones tables

## Self-Check: PASSED

**Created files exist:** N/A (no new files created)

**Modified files exist:**
```
FOUND: bigpanda-app/components/ActionsTableClient.tsx
FOUND: bigpanda-app/components/MilestonesTableClient.tsx
FOUND: bigpanda-app/components/RisksTableClient.tsx
FOUND: bigpanda-app/components/DecisionsTableClient.tsx
```

**Commits exist:**
```
FOUND: ee7295a
FOUND: 386443d
```

All claims verified. Plan complete.
