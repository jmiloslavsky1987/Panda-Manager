---
phase: 62-ingestion-consolidation
plan: 01
subsystem: ingestion-ui
tags: [ui-consolidation, ux, component-migration]
requirements: [INGEST-03]
dependency_graph:
  requires: []
  provides: [scan-in-context-tab]
  affects: [workspace-layout, document-ingestion-tab]
tech_stack:
  added: []
  patterns: [component-relocation, card-section-pattern]
key_files:
  created: []
  modified:
    - bigpanda-app/app/customer/[id]/layout.tsx
    - bigpanda-app/components/ContextTab.tsx
decisions:
  - "Positioned Scan for Updates as Section 0 (topmost) in ContextTab, above Upload Documents"
  - "Used flex justify-between layout to align title/description left and button right"
  - "Applied projectId coercion pattern consistent with IngestionModal usage"
metrics:
  duration_minutes: 1
  tasks_completed: 2
  files_modified: 2
  loc_added: 16
  loc_removed: 7
  commits: 2
  completed_date: "2026-04-15"
---

# Phase 62 Plan 01: Scan for Updates Consolidation Summary

**One-liner:** Relocated "Scan for Updates" button from persistent workspace header into Document Ingestion tab as a dedicated card section.

## What Was Built

Consolidated document ingestion controls by moving the "Scan for Updates" button from the workspace layout header (where it appeared across all tabs) into the Document Ingestion tab as a dedicated card section. This aligns the UI pattern with the principle that document ingestion actions belong in the Document Ingestion tab.

### Implementation Details

**Task 1: Remove from Workspace Layout**
- Deleted `ScanForUpdatesButton` import from `layout.tsx`
- Removed the header bar div wrapper (lines 77-79) containing the button
- Layout now flows directly from WorkspaceTabs to content area

**Task 2: Add to ContextTab**
- Added `ScanForUpdatesButton` import to `ContextTab.tsx`
- Created new Section 0 positioned above existing Upload Documents section
- Used card pattern (`rounded-lg border bg-card p-6`) consistent with other sections
- Applied flex layout with `justify-between` to position title/description left and button right
- Applied projectId coercion pattern: `typeof projectId === 'string' ? parseInt(projectId, 10) : projectId`

### Section Order in ContextTab

1. **Section 0:** Scan for Updates (NEW)
2. **Section 1:** Upload Documents
3. **Section 2:** Upload History
4. **Section 3:** Workspace Completeness

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification checks passed:
- ✅ `grep -r "ScanForUpdatesButton" layout.tsx` returns no results
- ✅ `grep "ScanForUpdatesButton" ContextTab.tsx` shows import and JSX usage (2 occurrences)
- ✅ TypeScript compilation clean (no errors on modified files)
- ✅ Section ordering correct: Scan → Upload → History → Completeness

## Commits

| Task | Commit  | Type     | Description                                         |
| ---- | ------- | -------- | --------------------------------------------------- |
| 1    | 5eb3cbd | refactor | Remove ScanForUpdatesButton from workspace layout   |
| 2    | 082b8ef | feat     | Add Scan for Updates card to Document Ingestion tab |

## Impact

**User Experience:**
- Scan for Updates button no longer persists across all workspace tabs
- Document ingestion controls now consolidated in a single tab location
- Improved discoverability: scanning is clearly grouped with upload and completeness checking

**Technical:**
- Reduced workspace layout complexity (removed persistent header bar)
- No change to ScanForUpdatesButton functionality (same SSE behavior, same source selector)
- Maintains projectId type safety with explicit coercion pattern

## Testing Notes

- ScanForUpdatesButton component is self-contained (handles its own state, dropdown, SSE streaming)
- No additional wiring required beyond import and JSX placement
- Functional behavior unchanged from previous header position

## Self-Check: PASSED

✅ Both modified files exist:
- bigpanda-app/app/customer/[id]/layout.tsx
- bigpanda-app/components/ContextTab.tsx

✅ Both commits exist:
- 5eb3cbd (Task 1)
- 082b8ef (Task 2)

---

**Plan 62-01 Complete** — Scan for Updates successfully consolidated into Document Ingestion tab.
