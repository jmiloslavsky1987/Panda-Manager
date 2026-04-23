---
phase: 76-pickers-risk-fields
plan: 01
subsystem: ui
tags: [react, typescript, stakeholders, owner-picker, fk, combobox, sonner]

# Dependency graph
requires:
  - phase: 75-schema-quick-wins
    provides: owner_id FK columns on tasks, actions, risks, milestones tables + stakeholders table

provides:
  - FK-based owner picker (OwnerCell) that saves owner_id alongside owner display text
  - Auto-create stakeholder on unknown name with sonner toast confirmation
  - Clear owner_id to null when field is emptied
  - PATCH schemas for tasks, actions, milestones now accept owner_id
  - All four entity table clients (Tasks via modal, Actions, Risks, Milestones) pass owner_id on save

affects:
  - 76-03 (risks PATCH schema — owner_id deliberately NOT added here, handled there)
  - 77-intelligence-gantt (will consume owner_id data from these tables)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - OwnerCell blur-based auto-create: POST /api/stakeholders when typed name not in list, save returned FK
    - Dual-write pattern: owner text (display) + owner_id (FK) sent together in PATCH payload

key-files:
  created: []
  modified:
    - components/OwnerCell.tsx
    - components/TaskEditModal.tsx
    - components/ActionsTableClient.tsx
    - components/RisksTableClient.tsx
    - components/MilestonesTableClient.tsx
    - app/api/tasks/[id]/route.ts
    - app/api/actions/[id]/route.ts
    - app/api/milestones/[id]/route.ts

key-decisions:
  - "OwnerCell datalist preserved for native autocomplete UX while tracking stakeholder by id internally"
  - "Blur handler resolves: empty->null, case-insensitive match->existing FK, no match->POST auto-create"
  - "risks PATCH schema (owner_id) intentionally excluded — handled by 76-03 to avoid parallel file conflict"
  - "Dual-write: both owner text and owner_id sent on save for backwards compatibility with any display consumers"

patterns-established:
  - "Inline picker auto-create: POST entity on blur when typed name is unrecognized, save returned FK"
  - "OwnerCell onSave receives {ownerId, ownerName} object — callers spread both fields into PATCH payload"

requirements-completed:
  - PICK-01
  - PICK-02

# Metrics
duration: 18min
completed: 2026-04-23
---

# Phase 76 Plan 01: Pickers & Risk Fields — OwnerCell FK Upgrade Summary

**OwnerCell upgraded to FK-based stakeholder picker with auto-create: saves owner_id to tasks, actions, risks, and milestones via dual-write PATCH**

## Performance

- **Duration:** 18 min
- **Started:** 2026-04-23T01:10:23Z
- **Completed:** 2026-04-23T01:28:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- OwnerCell now fetches full stakeholder objects (id + name + role) and resolves to FK on blur
- Unknown typed names trigger POST /api/stakeholders to auto-create, returning FK, with sonner toast confirmation
- Clearing the owner field sets owner_id to null (both locally and via PATCH)
- All four entity PATCH routes (tasks, actions, milestones) updated to accept owner_id
- risks PATCH route deliberately excluded per plan instruction (handled by 76-03)

## Task Commits

Each task was committed atomically:

1. **Task 1: Upgrade OwnerCell to FK-based stakeholder picker** - `01522044` (feat)
2. **Task 2: Update all OwnerCell callers + PATCH schemas to save owner_id** - `e00d61c9` (feat)

## Files Created/Modified
- `components/OwnerCell.tsx` - New interface with ownerId prop + onSave({ownerId, ownerName}); auto-create flow with toast
- `components/TaskEditModal.tsx` - owner_id added to form state + handleSubmit payload; OwnerCell caller updated
- `components/ActionsTableClient.tsx` - OwnerCell caller updated with new onSave signature
- `components/RisksTableClient.tsx` - OwnerCell caller updated (component props only, no API changes)
- `components/MilestonesTableClient.tsx` - OwnerCell caller updated with new onSave signature
- `app/api/tasks/[id]/route.ts` - TaskPatchSchema: added owner_id: z.number().nullable().optional()
- `app/api/actions/[id]/route.ts` - ActionPatchSchema: added owner_id field + owner made nullable
- `app/api/milestones/[id]/route.ts` - patchSchema: added owner_id field + owner made nullable

## Decisions Made
- Kept the datalist element for native browser autocomplete UX while adding FK resolution logic on top
- Blur handler resolves in priority order: empty string, exact match, auto-create (no partial matching)
- `role: ''` and `company: ''` sent as empty strings (not null) to satisfy Zod postSchema minimum-length requirements
- risks PATCH schema intentionally NOT modified — plan 76-03 handles the full risks route update (avoids merge conflict)

## Deviations from Plan
None — plan executed exactly as written.

## Issues Encountered
None. Pre-existing TypeScript errors in test files (`__tests__/`, `tests/`, `lib/__tests__/`) were present before this plan and are out of scope.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- OwnerCell FK picker is live for tasks, actions, risks, and milestones
- Plan 76-02 can proceed with dependency/milestone picker work
- Plan 76-03 will add risks PATCH owner_id support alongside the full risk structured fields (likelihood, impact, target_date, score)

---
*Phase: 76-pickers-risk-fields*
*Completed: 2026-04-23*
