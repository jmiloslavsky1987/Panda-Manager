---
phase: 12-complete-workspace-write-surface
plan: 02
subsystem: ui, api
tags: [next.js, drizzle, artifacts, modal, workspace-tabs]

# Dependency graph
requires:
  - phase: 12-01
    provides: RED E2E stubs for Phase 12 behaviors including artifacts tests
provides:
  - GET /api/artifacts?projectId=X — artifact rows ordered by external_id
  - POST /api/artifacts — create artifact with auto-assigned X-NNN external_id
  - PATCH /api/artifacts/[id] — update name/status/owner/description
  - ArtifactEditModal component — dual-mode create/edit with saving/error states
  - /customer/[id]/artifacts RSC page — artifacts table with div-grid layout
  - WorkspaceTabs 13th entry — Artifacts tab after Time
affects:
  - 12-04 (E2E GREEN phase — artifacts tests will be driven against this page)
  - 12-05 (final polish if any)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Artifacts API routes use @/ alias imports and Next.js 15 async params (await params)
    - POST auto-assigns X-NNN external_id by finding max numeric suffix across project rows
    - source='ui' defaulted for artifacts created via modal (source column is NOT NULL)
    - Div-grid layout for artifact rows (avoids Dialog-inside-tr React DOM nesting issue)
    - Native HTML input/textarea elements with inline Tailwind (no missing shadcn components)

key-files:
  created:
    - bigpanda-app/app/api/artifacts/route.ts
    - bigpanda-app/app/api/artifacts/[id]/route.ts
    - bigpanda-app/components/ArtifactEditModal.tsx
    - bigpanda-app/app/customer/[id]/artifacts/page.tsx
  modified:
    - bigpanda-app/components/WorkspaceTabs.tsx

key-decisions:
  - "source='ui' injected in POST handler — artifacts.source is NOT NULL in schema, plan omitted it"
  - "Div-grid rows instead of <tr> in artifacts page — avoids React DOM nesting warning from Dialog wrapping table rows"
  - "Native HTML input/textarea used in ArtifactEditModal — shadcn Input/Label/Textarea components do not exist in this project; established pattern from ActionEditModal used instead"

patterns-established:
  - "Artifact API pattern: GET by projectId, POST with auto-ID, PATCH by numeric id — all with Zod validation"
  - "X-NNN auto-assignment: select all external_ids, parse numeric suffix, take max+1, skip non-NNN formats"

requirements-completed: []

# Metrics
duration: 15min
completed: 2026-03-25
---

# Phase 12 Plan 02: Artifacts Tab Summary

**Full artifacts CRUD surface: three API routes (GET/POST/PATCH), ArtifactEditModal dual-mode create/edit component, RSC artifacts page with div-grid table, and 13th tab entry in WorkspaceTabs**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-25T18:12:00Z
- **Completed:** 2026-03-25T18:27:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Three API routes implemented: GET lists project artifacts, POST creates with auto-assigned X-NNN ID, PATCH updates editable fields
- ArtifactEditModal handles both create (no artifact prop) and edit (artifact prop) modes with saving indicator, error display, and router.refresh() on success
- Artifacts RSC page at /customer/[id]/artifacts uses div-grid layout to avoid React DOM nesting issues, with empty state and click-to-edit rows
- WorkspaceTabs now has 13 entries — Artifacts is the 13th tab after Time

## Task Commits

Each task was committed atomically:

1. **Task 1: Artifacts API routes — GET/POST and PATCH [id]** - `6cff084` (feat)
2. **Task 2: ArtifactEditModal + artifacts page + WorkspaceTabs update** - `657733e` (feat)

## Files Created/Modified

- `bigpanda-app/app/api/artifacts/route.ts` - GET list and POST create with X-NNN auto-assignment
- `bigpanda-app/app/api/artifacts/[id]/route.ts` - PATCH update with Zod validation
- `bigpanda-app/components/ArtifactEditModal.tsx` - Dual-mode modal with create/edit, saving/error states, data-testid attributes
- `bigpanda-app/app/customer/[id]/artifacts/page.tsx` - RSC page with div-grid artifact table and New Artifact button
- `bigpanda-app/components/WorkspaceTabs.tsx` - Added Artifacts as 13th tab after Time

## Decisions Made

- **source='ui' in POST insert:** The `artifacts.source` column is `NOT NULL` in the DB schema but the plan's POST schema omitted it. Injected `source: 'ui'` for UI-created records (Rule 2 auto-fix).
- **Div-grid instead of semantic table:** Plan noted potential `Dialog-inside-tr` React DOM nesting issue. ActionsPage (the reference) uses `<div>` cards not `<tr>` rows. Used div-grid layout for artifact rows to match established pattern.
- **Native HTML elements in modal:** Plan specified shadcn `Input`, `Label`, `Textarea` components which don't exist in this project. Used native `<input>`, `<textarea>`, `<label>` with inline Tailwind classes — the pattern from ActionEditModal.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added source='ui' to POST artifacts insert**
- **Found during:** Task 1 (Artifacts API routes)
- **Issue:** Plan's POST handler omitted `source` field, but `artifacts.source` is `NOT NULL` in DB schema — insert would fail at runtime
- **Fix:** Added `source: 'ui'` to the `db.insert(artifacts).values({...})` call
- **Files modified:** bigpanda-app/app/api/artifacts/route.ts
- **Verification:** TypeScript compiles clean on artifacts files
- **Committed in:** 6cff084 (Task 1 commit)

**2. [Rule 1 - Bug] Replaced missing shadcn UI components with native HTML elements**
- **Found during:** Task 2 (ArtifactEditModal)
- **Issue:** Plan specified `Input`, `Label`, `Textarea` from `@/components/ui/` but these files don't exist in this project (only button, dialog, badge, card, checkbox, separator, table, tabs exist)
- **Fix:** Used native `<input>`, `<textarea>`, `<label>` with inline Tailwind classes — exactly the pattern used in ActionEditModal and StakeholderEditModal
- **Files modified:** bigpanda-app/components/ArtifactEditModal.tsx
- **Verification:** TypeScript compiles without errors on ArtifactEditModal
- **Committed in:** 657733e (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both fixes essential for correct operation. No scope creep.

## Issues Encountered

5 pre-existing TypeScript errors in Redis/BullMQ and js-yaml files — all unrelated to this plan's work, unchanged by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Artifacts API and UI are complete and ready for E2E test validation in plan 12-04
- WorkspaceTabs has 13 entries — remaining tabs (Notes, Open Questions) to be added in plans 12-03+
- ArtifactEditModal pattern is reusable for other write-surface modals in this phase

---
*Phase: 12-complete-workspace-write-surface*
*Completed: 2026-03-25*
