---
phase: 03-write-surface-+-plan-builder
plan: 03
subsystem: action-edit
tags: [write-surface, actions, xlsx, drizzle, modal, nextjs]
dependency_graph:
  requires: [03-02]
  provides: [WORK-02, action-edit-modal, patch-actions-api]
  affects: [bigpanda-app/app/customer/[id]/actions/page.tsx, bigpanda-app/components/ActionEditModal.tsx, bigpanda-app/app/api/actions/[id]/route.ts]
tech_stack:
  added: [ExcelJS document-based workbook write, zod validation]
  patterns: [xlsx-first dual-write, optimistic UI with router.refresh, RSC+client-component split, shadcn DialogTrigger asChild]
key_files:
  created:
    - bigpanda-app/components/ActionEditModal.tsx
    - bigpanda-app/app/api/actions/[id]/route.ts
  modified:
    - bigpanda-app/app/customer/[id]/actions/page.tsx
decisions:
  - "Card-based layout replaces table rows in actions page — avoids span-inside-tr DOM nesting issues when wrapping with ActionEditModal trigger"
  - "xlsx write is skipped gracefully when file not found (dev environment without tracker)"
  - "EBUSY/EPERM on xlsx writeFile returns human-readable 'Close in Excel' message"
  - "Row moved to Completed sheet uses addRow + spliceRows pattern (ExcelJS document-based)"
metrics:
  duration: 2min
  completed_date: "2026-03-20"
  tasks_completed: 3
  files_created: 2
  files_modified: 1
---

# Phase 3 Plan 3: Action Inline Edit Summary

**One-liner:** ActionEditModal client component + PATCH /api/actions/[id] route with ExcelJS xlsx-first dual-write, wired into RSC actions tab.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build ActionEditModal component | 0b9ccdb | bigpanda-app/components/ActionEditModal.tsx |
| 2 | Build PATCH /api/actions/[id] route with xlsx dual-write | 1e754f4 | bigpanda-app/app/api/actions/[id]/route.ts |
| 3 | Update Actions tab page to wire ActionEditModal | c6b6e2d | bigpanda-app/app/customer/[id]/actions/page.tsx |

## What Was Built

**ActionEditModal** (`bigpanda-app/components/ActionEditModal.tsx`): A `'use client'` component using shadcn Dialog with `DialogTrigger asChild`. Exposes editable fields for description, owner, due, status, and notes. On submit, sends `PATCH /api/actions/:id` with JSON body. Shows inline error display (`data-testid="error-toast"`) and saving indicator (`data-testid="saving-indicator"`) while in-flight. Calls `router.refresh()` on success to revalidate RSC data.

**PATCH Route** (`bigpanda-app/app/api/actions/[id]/route.ts`): Validates input with Zod (`ActionPatchSchema`). Calls `updateXlsxRow()` first — if xlsx write fails, the error propagates and the DB write is blocked. `updateXlsxRow()` uses ExcelJS document-based Workbook to read `PA3_Action_Tracker.xlsx`, builds a header map from row 2, finds the matching row by `external_id`, and either moves the row to the Completed sheet (on `status=completed`) or updates cells in-place. Gracefully skips when xlsx file is absent (dev environment).

**Actions Page** (`bigpanda-app/app/customer/[id]/actions/page.tsx`): Updated from table layout to card layout. Each action card is the trigger for an `ActionEditModal`. Status filter links and PAGE_SIZE pagination are preserved. Overdue highlighting (red border/background) preserved. Page remains RSC with no `'use client'` directive.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Table row DOM nesting issue**
- **Found during:** Task 3
- **Issue:** The plan's `ActionEditModal` wraps its trigger in `<span data-testid="action-row">`. A `<span>` cannot be a valid parent of `<tr>` elements, which would produce invalid HTML and potential browser rendering issues.
- **Fix:** Replaced the existing shadcn Table layout with the card-based layout specified in the plan's template JSX. The plan's own template used `<div>` cards (not table rows) — the page was updated to match that design, preserving filter links and overdue indicators.
- **Files modified:** `bigpanda-app/app/customer/[id]/actions/page.tsx`
- **Commit:** c6b6e2d

## Self-Check: PASSED

Files verified:
- FOUND: bigpanda-app/components/ActionEditModal.tsx
- FOUND: bigpanda-app/app/api/actions/[id]/route.ts
- FOUND: bigpanda-app/app/customer/[id]/actions/page.tsx

Commits verified:
- FOUND: 0b9ccdb (feat(03-03): add ActionEditModal client component)
- FOUND: 1e754f4 (feat(03-03): add PATCH /api/actions/[id] route with xlsx dual-write)
- FOUND: c6b6e2d (feat(03-03): wire ActionEditModal into Actions tab page)
