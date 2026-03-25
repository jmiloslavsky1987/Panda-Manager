---
phase: 13-skill-ux-+-draft-polish
plan: "03"
subsystem: ui
tags: [react, shadcn, dialog, drafts, modal, typescript, nextjs]

# Dependency graph
requires:
  - phase: 13-01
    provides: Phase 13 E2E stubs (draft modal + template modal tests)
provides:
  - DraftEditModal component (subject/content/recipient edit + dismiss)
  - DraftsInbox refactored to use modalDraft state + modal UX
  - PATCH /api/drafts/[id] extended to accept and persist subject and recipient
  - PhaseBoard TemplatePicker replaced with shadcn Dialog showing task counts
affects: [phase-14, any plan touching DraftsInbox or PhaseBoard templates]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Parent-controlled Dialog pattern: modal open state managed by parent, no DialogTrigger in child component"
    - "Partial update pattern for PATCH routes: only set fields present in body using updateFields record"
    - "Inline template dialog: TemplatePicker logic inlined into PhaseBoard as shadcn Dialog"

key-files:
  created:
    - bigpanda-app/components/DraftEditModal.tsx
  modified:
    - bigpanda-app/components/DraftsInbox.tsx
    - bigpanda-app/app/api/drafts/[id]/route.ts
    - bigpanda-app/components/PhaseBoard.tsx

key-decisions:
  - "DraftEditModal uses parent-controlled open state (no DialogTrigger) because the trigger is the entire card div"
  - "PATCH edit action no longer requires content to be present — any combination of subject/content/recipient is valid"
  - "TemplatePicker sub-component removed entirely — logic inlined into PhaseBoard Dialog for cleaner code"

patterns-established:
  - "Parent-controlled Dialog: parent sets open=true via state, DraftEditModal accepts open/onOpenChange as props"
  - "Card-click-to-modal: entire card div has onClick to open modal; quick-action buttons use e.stopPropagation()"

requirements-completed:
  - DASH-09
  - SKILL-03
  - SKILL-04
  - SKILL-05
  - SKILL-06
  - SKILL-07
  - SKILL-08
  - SKILL-12
  - SKILL-13

# Metrics
duration: 15min
completed: 2026-03-25
---

# Phase 13 Plan 03: Draft Edit Modal + Template Dialog Summary

**DraftEditModal with subject/content/recipient fields, DraftsInbox refactored to modal UX, PhaseBoard templates upgraded to shadcn Dialog with task counts**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-25T19:43:04Z
- **Completed:** 2026-03-25T19:58:00Z
- **Tasks:** 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- Created DraftEditModal.tsx: parent-controlled shadcn Dialog with subject, recipient, and content fields, plus Dismiss Draft/Save/Cancel buttons
- Refactored DraftsInbox: removed expandedId/editContent inline expand state, replaced with modalDraft state; clicking card opens modal
- Extended PATCH /api/drafts/[id] to accept and persist subject and recipient fields via partial update pattern
- Upgraded PhaseBoard TemplatePicker from absolute-positioned div popover to shadcn Dialog with task counts per template row

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend PATCH /api/drafts/[id] to accept subject and recipient** - `c5b7265` (feat)
2. **Task 2: Build DraftEditModal and refactor DraftsInbox to use it** - `0e23f26` (feat)
3. **Task 3: Upgrade TemplatePicker to shadcn Dialog modal with task counts** - `ff233c2` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `bigpanda-app/components/DraftEditModal.tsx` - New modal component with three editable fields and Dismiss Draft button
- `bigpanda-app/components/DraftsInbox.tsx` - Replaced inline expand with modalDraft state; entire card is clickable
- `bigpanda-app/app/api/drafts/[id]/route.ts` - Extended body type; partial update only sets fields present in request
- `bigpanda-app/components/PhaseBoard.tsx` - Replaced absolute div + TemplatePicker component with inline shadcn Dialog; task count shown per template

## Decisions Made
- DraftEditModal is parent-controlled (open/onOpenChange props) rather than self-contained, because the trigger is the whole card div — not a discrete button
- PATCH edit action no longer requires `content` to be present; `action === 'edit'` alone is sufficient; partial updates set only the fields provided
- TemplatePicker sub-component was removed after inlining its logic into the Dialog in PhaseBoard — no external uses existed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in ioredis/bullmq (duplicate type definitions) and js-yaml were present before this plan and are unrelated to these changes. No new errors introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Draft modal UX complete; E2E stubs for draft.*modal, draft.*fields, draft.*save, draft.*dismiss ready to be made GREEN
- Template dialog UX complete; E2E stubs for template.*modal and template.*count ready to be made GREEN
- Plan 13-04 (search date filter or remaining stubs) can proceed

## Self-Check: PASSED

- bigpanda-app/components/DraftEditModal.tsx: FOUND
- bigpanda-app/components/DraftsInbox.tsx: FOUND
- bigpanda-app/app/api/drafts/[id]/route.ts: FOUND
- bigpanda-app/components/PhaseBoard.tsx: FOUND
- .planning/phases/13-skill-ux-+-draft-polish/13-03-SUMMARY.md: FOUND
- Commit c5b7265: FOUND
- Commit 0e23f26: FOUND
- Commit ff233c2: FOUND

---
*Phase: 13-skill-ux-+-draft-polish*
*Completed: 2026-03-25*
