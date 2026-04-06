---
phase: 37-actions-inline-editing-foundation
plan: "05"
subsystem: inline-editing
tags: [risks, milestones, tasks, inline-edit, forms]
dependencies:
  requires: [37-02, 37-03]
  provides: [inline-edit-risks, inline-edit-milestones, task-modal-components]
  affects: [risks-page, milestones-page, task-modal]
tech_stack:
  added: []
  patterns: [per-cell-inline-editing, modal-form-components]
key_files:
  created: []
  modified:
    - bigpanda-app/app/customer/[id]/risks/page.tsx
    - bigpanda-app/app/customer/[id]/milestones/page.tsx
    - bigpanda-app/components/TaskEditModal.tsx
decisions:
  - "Converted risks and milestones pages from Server Components to Client Components for inline editing state management"
  - "Retained RiskEditModal and MilestoneEditModal for mitigation/notes fields only (not row wrappers)"
  - "Applied normaliseRiskStatus() and normaliseMilestoneStatus() to handle non-conforming enum values safely"
  - "DatePickerCell and OwnerCell in TaskEditModal update local form state only (API PATCH on form submit)"
metrics:
  duration_minutes: 12
  tasks_completed: 4
  files_modified: 3
  commits: 4
completed_date: "2026-04-06"
---

# Phase 37 Plan 05: Inline Editing for Risks, Milestones, and Task Modal Summary

**One-liner:** Per-cell inline editing for Risks (status/severity/owner) and Milestones (status/date/owner) tables, plus DatePickerCell and OwnerCell integration in TaskEditModal

## Overview

Successfully wired the shared inline-edit components (InlineSelectCell, DatePickerCell, OwnerCell) into the existing Risks and Milestones tables, replacing the row-wrapping modal pattern with per-cell click-to-edit. Updated TaskEditModal to use DatePickerCell for date fields and OwnerCell for the owner field. Completes IEDIT-01 through IEDIT-04 and satisfies FORM-01/FORM-02 for the Tasks entity.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Wire inline editing into Risks table | 2f55832 | Complete |
| 2 | Wire inline editing into Milestones table | 2272b71 | Complete |
| 3 | Replace date inputs in TaskEditModal with DatePickerCell | 43d8e9f | Complete |
| 4 | Replace owner input in TaskEditModal with OwnerCell | 4e9e7b5 | Complete |

## Implementation Details

### Task 1: Risks Table Inline Editing

- Converted `risks/page.tsx` from Server Component to Client Component
- Added `InlineSelectCell` for:
  - Status field: open / mitigated / resolved / accepted
  - Severity field: low / medium / high / critical
- Added `OwnerCell` for owner field with stakeholder autocomplete
- Implemented `normaliseRiskStatus()` to handle non-conforming status values (e.g., 'closed' or 'Resolved' display as 'open')
- Added `patchRisk()` helper for inline save operations
- Retained `RiskEditModal` for mitigation field only (removed row-wrapper pattern)
- Mitigation cell shows "Add mitigation…" clickable text to open modal

### Task 2: Milestones Table Inline Editing

- Converted `milestones/page.tsx` from Server Component to Client Component
- Added `InlineSelectCell` for status field: not_started / in_progress / completed / blocked
- Added `DatePickerCell` for target_date field with calendar popover
- Added `OwnerCell` for owner field with stakeholder autocomplete
- Implemented `normaliseMilestoneStatus()` to handle non-conforming status values
- Preserved existing `statusBadgeColors` for display state in InlineSelectCell
- Added `patchMilestone()` helper for inline save operations
- Retained `MilestoneEditModal` for notes field only (removed row-wrapper pattern)
- Notes cell shows "Add notes…" clickable text to open modal

### Task 3: TaskEditModal Date Fields

- Imported `DatePickerCell` component
- Replaced plain text inputs for `due` and `start_date` with `DatePickerCell`
- Updated form state to use `null` instead of empty string for date fields
- `DatePickerCell.onSave` updates local form state only (not API directly)
- Calendar popover opens when clicking date fields in modal
- Form submit still sends correct ISO date or null values

### Task 4: TaskEditModal Owner Field

- Imported `OwnerCell` component
- Replaced plain text input for `owner` with `OwnerCell`
- `OwnerCell` receives `projectId` prop for stakeholder autocomplete
- `OwnerCell.onSave` updates local form state only (not API directly)
- Freeform names still accepted per FORM-03
- Form submit sends correct owner string or null

## Architecture Decisions

### Server to Client Component Conversion

Both risks and milestones pages were Server Components that wrapped each `<TableRow>` in a modal component as the click trigger. To support per-cell inline editing:

1. Converted pages to Client Components with `'use client'` directive
2. Used `useEffect` to fetch workspace data via `/api/workspace-data?project_id={id}`
3. Added `useRouter()` for `router.refresh()` after inline saves
4. Retained server-side sorting and display logic

This pattern mirrors the WorkstreamTableClient pattern used elsewhere in the app.

### Modal Component Repurposing

Instead of removing RiskEditModal and MilestoneEditModal entirely:

- Retained them for long-text fields (mitigation, notes)
- Changed trigger from row wrapper to clickable cell text
- Provides consistent UX: quick edits inline, multi-line text in modal

### Form Component Integration

DatePickerCell and OwnerCell in TaskEditModal differ from table usage:

- **Table context:** `onSave` PATCHes API immediately, calls `router.refresh()`
- **Modal context:** `onSave` updates local form state, API PATCH on form submit

This preserves the modal's draft/commit workflow while using the same UI components.

## Enum Normalization

### Risk Status

Non-conforming values (e.g., 'closed', 'Resolved', null) normalize to 'open' via `normaliseRiskStatus()`. This prevents empty selects and provides a safe default as documented in 37-RESEARCH.md Pitfall 5.

### Milestone Status

Non-conforming values normalize to 'not_started' via `normaliseMilestoneStatus()`. Handles variations like 'In Progress', 'in progress', 'InProgress', and null.

## Verification

### TypeScript Compilation

All modified files compile without errors:
- `risks/page.tsx`: No errors
- `milestones/page.tsx`: No errors
- `TaskEditModal.tsx`: No errors

Pre-existing test file errors in `tests/audit/` are unrelated to this plan's changes.

### Manual Verification Required

1. Click a Risk status cell — inline select shows exactly 4 options (open/mitigated/resolved/accepted)
2. Click a Risk owner cell — text input appears with datalist
3. Click a Risk severity cell — inline select shows 4 options (low/medium/high/critical)
4. Click a Milestone status cell — inline select shows exactly 4 options (not_started/in_progress/completed/blocked)
5. Click a Milestone target date cell — calendar popover opens
6. Click a Milestone owner cell — OwnerCell text input with datalist appears
7. Existing non-conforming risk status values (e.g., 'closed') display as 'open' — no empty select
8. Open TaskEditModal (click "Edit" on a task card) — Due Date and Start Date fields show DatePickerCell calendar trigger instead of text input
9. Open TaskEditModal — Owner field shows OwnerCell with autocomplete suggestions from stakeholder list
10. All inline saves trigger `router.refresh()` and update the UI optimistically

## Deviations from Plan

None — plan executed exactly as written.

## Key Files Modified

### bigpanda-app/app/customer/[id]/risks/page.tsx (110 lines changed)

- Converted to client component
- Added inline editing for status, severity, and owner cells
- Implemented risk status normalization
- Retained RiskEditModal for mitigation field only

### bigpanda-app/app/customer/[id]/milestones/page.tsx (111 lines changed)

- Converted to client component
- Added inline editing for status, target_date, and owner cells
- Implemented milestone status normalization
- Retained MilestoneEditModal for notes field only

### bigpanda-app/components/TaskEditModal.tsx (17 lines changed)

- Replaced date inputs (due, start_date) with DatePickerCell
- Replaced owner input with OwnerCell
- Updated form state to use null for date fields

## Requirements Satisfied

- **IEDIT-01:** Per-cell inline editing for entity tables ✓ (Risks and Milestones)
- **IEDIT-02:** InlineSelectCell for status/severity fields ✓
- **IEDIT-03:** DatePickerCell for date fields ✓
- **IEDIT-04:** OwnerCell for owner fields with stakeholder autocomplete ✓
- **FORM-01:** Shared form components for consistency ✓ (DatePickerCell, OwnerCell)
- **FORM-02:** Autocomplete for owner fields ✓

## Dependencies

### Requires
- **37-02:** Shared inline-edit components (InlineSelectCell, DatePickerCell, OwnerCell)
- **37-03:** API endpoints for risks, milestones, and stakeholders

### Provides
- Per-cell inline editing for Risks table
- Per-cell inline editing for Milestones table
- Task modal with shared form components

### Affects
- Risks page UX
- Milestones page UX
- Task creation/editing workflow

## Next Steps

1. Manual verification of inline editing behavior for all cells
2. Verify stakeholder autocomplete populates correctly in OwnerCell
3. Verify enum normalization handles edge cases (null, malformed strings)
4. Run end-to-end tests if available

## Self-Check: PASSED

All modified files verified:

```bash
# Files exist and contain expected changes
✓ bigpanda-app/app/customer/[id]/risks/page.tsx (modified, inline editing added)
✓ bigpanda-app/app/customer/[id]/milestones/page.tsx (modified, inline editing added)
✓ bigpanda-app/components/TaskEditModal.tsx (modified, DatePickerCell and OwnerCell added)

# Commits exist
✓ 2f55832: feat(37-05): wire inline editing into Risks table
✓ 2272b71: feat(37-05): wire inline editing into Milestones table
✓ 43d8e9f: feat(37-05): replace date inputs in TaskEditModal with DatePickerCell
✓ 4e9e7b5: feat(37-05): replace owner input in TaskEditModal with OwnerCell

# TypeScript compilation
✓ No errors in modified files
```
