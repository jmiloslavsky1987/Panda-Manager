---
phase: 20-project-initiation-wizard
plan: "03"
subsystem: ui
tags: [react, wizard, dialog, drag-and-drop, form, shadcn, typescript]

# Dependency graph
requires:
  - phase: 20-02
    provides: POST /api/projects (draft project creation) and PATCH /api/projects/[projectId] (status update)
  - phase: 18-document-ingestion
    provides: /api/ingestion/upload endpoint and IngestionModal/ArtifactsDropZone patterns

provides:
  - ProjectWizard Dialog shell with 5-step progress header and WizardState machine
  - BasicInfoStep form (6 fields, POST /api/projects, loading/error states)
  - CollateralUploadStep with 9-item checklist + drag-and-drop upload zone
  - matchCollateralCategory utility with 4 passing unit tests
  - WizardStep, WizardState, ManualItem, FileStatus types exported from ProjectWizard.tsx

affects:
  - 20-04: AiPreviewStep and ManualEntryStep will import WizardState, ReviewItem, FileStatus from ProjectWizard.tsx
  - 20-05: LaunchStep will consume checklistState and fileStatuses
  - 20-06: Overview completeness score widget integrates with wizard's project creation flow

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wizard step state machine: handleStepComplete(step, data?) merges partial WizardState and advances"
    - "Checklist auto-check: matchCollateralCategory(filename) drives onChecklistChange in upload step"
    - "TDD: checklist-match.test.ts RED-then-GREEN for matchCollateralCategory"

key-files:
  created:
    - bigpanda-app/components/ProjectWizard.tsx
    - bigpanda-app/components/wizard/BasicInfoStep.tsx
    - bigpanda-app/components/wizard/CollateralUploadStep.tsx
  modified: []

key-decisions:
  - "checklistState promoted to WizardState (not local to CollateralUploadStep) so LaunchStep can read checked items"
  - "CollateralUploadStep onContinue/onSkip buttons embedded in step; ProjectWizard footer shown only for non-BasicInfo steps with their own submit"
  - "extractionStage kept in WizardState but not used until Plan 04 AiPreviewStep"

patterns-established:
  - "Wizard step pattern: each step receives onComplete/onSkip/onContinue; step manages own loading state; parent advances WizardState"
  - "matchCollateralCategory: case-insensitive substring match on filename against COLLATERAL_CATEGORIES keyword arrays"

requirements-completed:
  - WIZ-01
  - WIZ-02
  - WIZ-03

# Metrics
duration: 18min
completed: 2026-03-27
---

# Phase 20 Plan 03: Wizard UI Scaffold Summary

**Full-screen Dialog wizard container with 5-step progress indicator, BasicInfoStep (6-field POST form), and CollateralUploadStep (9-item auto-checking checklist + drag-and-drop upload)**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-27T00:00:28Z
- **Completed:** 2026-03-27T00:03:31Z
- **Tasks:** 3
- **Files modified:** 3 created

## Accomplishments

- ProjectWizard Dialog shell with step progress header (green checkmark / blue active / grey upcoming) and central WizardState machine
- BasicInfoStep form with field-level validation, loading/error states, and POST /api/projects integration
- CollateralUploadStep with 9-item checklist, drag-and-drop upload zone, auto-check on filename match, and POST /api/ingestion/upload integration
- `matchCollateralCategory` exported and fully tested — 4 unit tests GREEN, 0 regressions in full suite (135 tests passing)

## Task Commits

Each task was committed atomically:

1. **Task 1: ProjectWizard container — Dialog shell + step state machine** - `1962972` (feat)
2. **Task 2: BasicInfoStep — step 1 project creation form** - `16d1e29` (feat)
3. **Task 3: CollateralUploadStep — step 2 checklist + drag-and-drop** - `144ff08` (feat)

## Files Created/Modified

- `bigpanda-app/components/ProjectWizard.tsx` — Wizard container: Dialog shell, WIZARD_STEPS progress header, WizardState machine, step routing for steps 1-2, placeholder for steps 3-5 (Plan 04)
- `bigpanda-app/components/wizard/BasicInfoStep.tsx` — Step 1 form: name, customer, status (Draft/Active), start_date, end_date, description; field validation; POST /api/projects; loading/error UI
- `bigpanda-app/components/wizard/CollateralUploadStep.tsx` — Step 2: COLLATERAL_CATEGORIES array, matchCollateralCategory function, 9-item Checkbox checklist, drag-and-drop zone, upload to /api/ingestion/upload, file status badges

## Decisions Made

- `checklistState` is promoted into `WizardState` (not local to CollateralUploadStep) so the LaunchStep in Plan 05 can surface which documents were uploaded
- `CollateralUploadStep` owns its own Skip/Continue buttons (matching the plan's `onSkip`/`onContinue` props contract) while `ProjectWizard` still renders a fallback footer for steps 3-5 before they are built
- `extractionStage` field carried in `WizardState` but unused until Plan 04's AiPreviewStep drives SSE extraction

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing test failures in `tests/wizard/completeness.test.ts`, `tests/wizard/completeness-banner.test.ts`, and `tests/wizard/manual-entry.test.ts` import modules not yet built (completeness API route, ManualEntryStep). These failures existed before this plan and are unrelated to this plan's scope (confirmed via git stash). No regressions introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ProjectWizard container and steps 1-2 complete; steps 3-5 slots are placeholder `<div>` elements ready for Plan 04 to fill in
- `WizardState` shape (including `reviewItems`, `manualItems`, `fileStatuses`, `extractionStage`) is stable and ready for Plan 04's AiPreviewStep and ManualEntryStep
- `matchCollateralCategory` and `COLLATERAL_CATEGORIES` are tested and exported from `CollateralUploadStep.tsx` — Plan 04 can import them

---
*Phase: 20-project-initiation-wizard*
*Completed: 2026-03-27*
