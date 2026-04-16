---
phase: 67-delivery-tab-cleanup
plan: "01"
subsystem: delivery-ui
tags: [ui-polish, table-cleanup, form-scoping]
dependency_graph:
  requires: []
  provides: [delivery-tables-clean, decision-form-scoped]
  affects: [delivery-ux]
tech_stack:
  added: []
  patterns: [column-removal, form-label-scoping]
key_files:
  created: []
  modified:
    - bigpanda-app/components/ActionsTableClient.tsx
    - bigpanda-app/components/RisksTableClient.tsx
    - bigpanda-app/components/MilestonesTableClient.tsx
    - bigpanda-app/components/AddDecisionModal.tsx
decisions: []
metrics:
  duration_seconds: 167
  duration_minutes: 2
  tasks_completed: 2
  files_modified: 4
  commits: 2
  lines_removed: 28
  lines_added: 7
completed: 2026-04-16T14:35:26Z
---

# Phase 67 Plan 01: Delivery Tab Cleanup Summary

**One-liner:** Removed noisy ID and Source columns from Actions/Risks/Milestones tables; scoped Decision form labels to operational impact documentation

## Overview

Cleaned up delivery tables by removing non-actionable columns (ID, Source) and updated the Add Decision modal labels to scope inputs toward operational transformation events rather than generic decisions.

## Tasks Completed

### Task 1: Remove ID/Source columns from Actions, Risks, Milestones tables
**Status:** ✅ Complete
**Commit:** 6beeb2d
**Files:** ActionsTableClient.tsx, RisksTableClient.tsx, MilestonesTableClient.tsx

**Changes:**
- Removed ID column (external_id display) from all three tables
- Removed Source column (SourceBadge) from Actions table only
- Updated empty state colSpan: Actions 7→5, Risks/Milestones 7→6
- Removed unused SourceBadge import from ActionsTableClient

**Verification:** TypeScript clean. Column counts match across header and empty state.

### Task 2: Update Decisions entry form labels and placeholders (DLVRY-10)
**Status:** ✅ Complete
**Commit:** 5b4f78d
**Files:** AddDecisionModal.tsx

**Changes:**
- Label "Decision" → "Decision / Action" (retained required asterisk)
- Placeholder → "What was decided or agreed operationally? (e.g. routing rule change, automation enabled, process formalized)"
- Label "Context" → "Operational Impact / Rationale" (retained "(optional)" suffix)
- Placeholder → "Why this decision? What does it affect operationally? What was the alternative?"

**Verification:** TypeScript clean. Modal renders with updated labels.

## Deviations from Plan

None. Plan executed exactly as written. No bugs discovered, no missing functionality, no blocking issues.

## Verification Results

✅ TypeScript compilation passes with no errors in modified components
✅ Actions table renders 5 columns (checkbox, description, owner, due date, status)
✅ Risks table renders 6 columns (checkbox, description, severity, owner, status, mitigation)
✅ Milestones table renders 6 columns (checkbox, name, status, target/date, owner, notes)
✅ Add Decision modal shows "Decision / Action" and "Operational Impact / Rationale" labels
✅ All colSpan values match remaining column counts

## Success Criteria

- ✅ DLVRY-07: Actions tab ID and Source columns removed from rendered table
- ✅ DLVRY-08: Risks tab ID column removed from rendered table
- ✅ DLVRY-09: Milestones tab ID column removed from rendered table
- ✅ DLVRY-10: Add Decision form scoped to operational impact (updated labels/placeholders)
- ✅ Build is clean (TypeScript passes)

## Technical Notes

**Column removal approach:** Simple JSX deletion. The external_id field remains in the database and query results; only the table rendering was changed. No schema modifications required.

**SourceBadge retained in Risks/Milestones:** These tables display SourceBadge in the description cell (as a secondary line). Only Actions table had Source as a separate column, which was removed.

**Form field names unchanged:** The AddDecisionModal still uses the same field names (`decision`, `context`) and schema. Only the labels and placeholders were updated for user-facing clarity.

## Self-Check: PASSED

**Created files:** None (all modifications)

**Modified files exist:**
- ✅ bigpanda-app/components/ActionsTableClient.tsx
- ✅ bigpanda-app/components/RisksTableClient.tsx
- ✅ bigpanda-app/components/MilestonesTableClient.tsx
- ✅ bigpanda-app/components/AddDecisionModal.tsx

**Commits exist:**
- ✅ 6beeb2d (Task 1: Remove ID/Source columns)
- ✅ 5b4f78d (Task 2: Update decision form labels)

All files modified and commits verified in git log.
