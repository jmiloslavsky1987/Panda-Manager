---
phase: 67-delivery-tab-cleanup
plan: "02"
subsystem: stakeholders
tags:
  - stakeholder-management
  - delete-operation
  - move-operation
  - ui-enhancement
dependency_graph:
  requires: []
  provides:
    - stakeholder-delete-api
    - stakeholder-move-api
    - stakeholder-edit-modal-actions
  affects:
    - teams-tab-ux
tech_stack:
  added: []
  patterns:
    - inline-delete-no-confirmation
    - company-toggle-via-patch
key_files:
  created: []
  modified:
    - bigpanda-app/app/api/stakeholders/[id]/route.ts
    - bigpanda-app/components/StakeholderEditModal.tsx
    - bigpanda-app/app/customer/[id]/stakeholders/page.tsx
decisions:
  - DELETE endpoint follows existing audit log pattern with transaction wrapping
  - Move operation toggles company field between "BigPanda" and customer company name via PATCH
  - Delete button uses destructive variant and left-alignment (mr-auto)
  - No confirmation dialog on delete per Phase 66 pattern
  - customerCompany prop passed from page server component via project query
metrics:
  duration: 3 minutes
  tasks_completed: 2
  files_modified: 3
  commits: 2
  completed_at: "2026-04-16T14:41:15Z"
requirements_fulfilled:
  - TEAM-01
  - TEAM-02
---

# Phase 67 Plan 02: Stakeholder Delete & Move Operations Summary

**One-liner:** DELETE endpoint and Move/Delete buttons in StakeholderEditModal enable inline stakeholder removal and section toggling with no confirmation dialog.

## Tasks Completed

### Task 1: Add DELETE handler to /api/stakeholders/[id]/route.ts
- **Status:** Complete
- **Commit:** 590da37
- **Files:** bigpanda-app/app/api/stakeholders/[id]/route.ts
- **Description:** Added DELETE endpoint with requireSession guard, 404 check for unknown stakeholder, and audit log entry in transaction. Returns 200 {ok: true} on success.

### Task 2: Add Move and Delete buttons to StakeholderEditModal
- **Status:** Complete
- **Commit:** a1f390a
- **Files:**
  - bigpanda-app/components/StakeholderEditModal.tsx
  - bigpanda-app/app/customer/[id]/stakeholders/page.tsx
- **Description:** Added customerCompany prop to modal interface. Implemented handleDelete and handleMove functions. Added Delete (destructive, left-aligned) and Move buttons in edit mode. Updated all modal usages in stakeholders page to pass customerCompany from project query.

## Deviations from Plan

None — plan executed exactly as written.

## Requirements Fulfilled

- **TEAM-01:** Move stakeholder between sections — Move button toggles company field between "BigPanda" and customer company name
- **TEAM-02:** Delete stakeholder — Delete button calls DELETE /api/stakeholders/[id] with no confirmation dialog

## Key Decisions

1. **DELETE endpoint follows existing audit log pattern** — Transaction wraps db.delete() and audit log insert, consistent with Phase 66 patterns
2. **Move operation uses PATCH with company field** — Existing PATCH handler already supports company updates; no new endpoint needed
3. **Delete button uses destructive variant with left-alignment** — `mr-auto` pushes delete to left side of footer for visual separation from Save/Cancel
4. **No confirmation dialog on delete** — Follows Phase 66 inline delete pattern for consistent UX
5. **customerCompany prop passed from server** — Page queries projects table for customer field, passes to modal for move target calculation

## Technical Implementation

### DELETE Handler
- requireSession() guard at entry
- parseInt validation for numeric ID
- 404 response if stakeholder not found
- Transaction-wrapped delete + audit log insert
- Returns 200 {ok: true} on success

### StakeholderEditModal Enhancements
- Added customerCompany: string to props interface
- Added deleting/moving state flags
- handleDelete: Calls DELETE endpoint, closes modal, refreshes page
- handleMove: Toggles company between "BigPanda" and customerCompany via PATCH
- Delete button: destructive variant, left-aligned, edit mode only
- Move button: outline variant, dynamic label, edit mode only

### Stakeholders Page Integration
- Added db/schema imports for projects query
- Fetched project record to get customer company name
- Passed customerCompany to all StakeholderEditModal instances (3 usages)

## Verification

- TypeScript compilation clean (no new errors)
- DELETE /api/stakeholders/[id] returns 200 for valid ID
- DELETE /api/stakeholders/[id] returns 404 for unknown ID
- StakeholderEditModal in edit mode shows Delete and Move buttons
- StakeholderEditModal in create mode does NOT show Delete or Move buttons
- Move button label dynamically shows target section name

## Self-Check: PASSED

All claimed files exist:
- bigpanda-app/app/api/stakeholders/[id]/route.ts
- bigpanda-app/components/StakeholderEditModal.tsx
- bigpanda-app/app/customer/[id]/stakeholders/page.tsx

All claimed commits exist:
- 590da37 (Task 1: DELETE handler)
- a1f390a (Task 2: Move and Delete buttons)
