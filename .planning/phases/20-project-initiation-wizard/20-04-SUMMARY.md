---
phase: 20-project-initiation-wizard
plan: "04"
subsystem: ui
tags: [react, wizard, sse, extraction, manual-entry, launch, shadcn, typescript]

# Dependency graph
requires:
  - phase: 20-03
    provides: ProjectWizard container, WizardState, BasicInfoStep, CollateralUploadStep
  - phase: 18-document-ingestion
    provides: /api/ingestion/extract SSE endpoint, /api/ingestion/approve, IngestionStepper, ExtractionPreview

provides:
  - AiPreviewStep: SSE multi-file extraction orchestration + ExtractionPreview drop-in (step 3)
  - ManualEntryStep: tab-per-entity manual entry with read-only AI rows + Add Row form; buildEntityPayload exported (step 4)
  - LaunchStep: completeness summary + Launch Project PATCH + router.push to /customer/[id] (step 5)
  - ProjectWizard: fully wired 5-step flow with correct prop passing and router.refresh on close
  - Dashboard NewProjectButton: state-controlled Dialog open/close with ProjectWizard

affects:
  - bigpanda-app/app/page.tsx: Dashboard now has New Project button
  - bigpanda-app/components/ProjectWizard.tsx: all 5 steps routed

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SSE extraction accumulation: setReviewItems(prev => [...prev, ...items]) — never replace"
    - "Wizard step self-navigation: steps 3-5 own their Skip/Continue buttons; generic footer suppressed"
    - "NewProjectButton: isolated 'use client' component in RSC page for Dialog open/close"
    - "router.refresh() on wizard close to show new draft project in Dashboard"

key-files:
  created:
    - bigpanda-app/components/wizard/AiPreviewStep.tsx
    - bigpanda-app/components/wizard/ManualEntryStep.tsx
    - bigpanda-app/components/wizard/LaunchStep.tsx
    - bigpanda-app/components/NewProjectButton.tsx
  modified:
    - bigpanda-app/components/ProjectWizard.tsx
    - bigpanda-app/app/page.tsx

key-decisions:
  - "Steps 3-5 own their navigation buttons — generic wizard footer suppressed for these steps"
  - "NewProjectButton extracted as separate component file (not inline in page.tsx) for clean RSC boundary"
  - "LaunchStep imports ENTITY_TABS from ManualEntryStep to avoid duplication of entity type config"
  - "router.refresh() on wizard close ensures Dashboard re-fetches to show new draft project"

requirements-completed:
  - WIZ-01
  - WIZ-04
  - WIZ-05
  - WIZ-07

# Metrics
duration: 13min
completed: 2026-03-27
---

# Phase 20 Plan 04: Wizard Steps 3-5 + Dashboard Button Summary

**AiPreviewStep (SSE multi-file accumulation), ManualEntryStep (tab-per-entity with Add Row forms), and LaunchStep (PATCH status active + navigate), wired into ProjectWizard and Dashboard**

## Performance

- **Duration:** 13 min
- **Started:** 2026-03-27T00:00:00Z
- **Completed:** 2026-03-27T00:13:46Z
- **Tasks:** 3
- **Files modified:** 4 created, 2 modified

## Accomplishments

- AiPreviewStep: SSE extraction per file (sequential on mount), accumulation pattern, IngestionStepper sidebar, ExtractionPreview after all done, skip for empty files, /api/ingestion/approve on submit
- ManualEntryStep: 9 entity-type tabs, approved AI items as read-only rows with "AI" badge, Add Row inline form, count badge on tabs with content, write-on-exit via entity API routes, `buildEntityPayload` and `ENTITY_TABS` exported
- LaunchStep: item summary by entity type, completeness note, Launch Project PATCH /api/projects/[projectId] with status:active, router.push to /customer/[id], loading state on button
- ProjectWizard updated: imports and routes all 5 steps with correct prop wiring; footer shown only for step 2 (upload); router.refresh() on close
- Dashboard page.tsx: NewProjectButton (isolated client component) in header row alongside NotificationBadge
- All 8 wizard test files GREEN (27 tests); full suite 145 tests passing; no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: AiPreviewStep — step 3 extraction + review** - `27065e2` (feat)
2. **Task 2: ManualEntryStep + LaunchStep — steps 4 and 5** - `856b322` (feat)
3. **Task 3: Wire steps 3-5 into ProjectWizard + Dashboard button** - `7a7438d` (feat)

## Files Created/Modified

- `bigpanda-app/components/wizard/AiPreviewStep.tsx` — Step 3: SSE extraction per artifactId, item accumulation, IngestionStepper sidebar, ExtractionPreview after extraction, skip/approve handlers
- `bigpanda-app/components/wizard/ManualEntryStep.tsx` — Step 4: ENTITY_TABS config, buildEntityPayload utility, shadcn Tabs per entity, AI read-only rows, Add Row form, write-on-exit via entity routes
- `bigpanda-app/components/wizard/LaunchStep.tsx` — Step 5: summary counts by entity type, Launch Project button with loading state, PATCH + router.push
- `bigpanda-app/components/NewProjectButton.tsx` — Client component: useState dialog, ProjectWizard open/close wrapper
- `bigpanda-app/components/ProjectWizard.tsx` — Updated: imports AiPreviewStep/ManualEntryStep/LaunchStep, routes steps 3-5, footer logic simplified, router.refresh on close
- `bigpanda-app/app/page.tsx` — Updated: imports NewProjectButton, added to header row

## Decisions Made

- Steps 3-5 own their navigation buttons: the generic wizard footer (Skip/Next) was only useful as a placeholder; now suppressed for steps that have their own Submit/Continue/Launch controls
- NewProjectButton extracted as a separate component file rather than inline in page.tsx to keep a clean RSC/client boundary
- LaunchStep imports ENTITY_TABS from ManualEntryStep to avoid config duplication
- router.refresh() on wizard close triggers Dashboard re-fetch, showing new draft projects immediately

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in 10 files (approve/route.ts duplicate property, Redis type, js-yaml missing types, test Request vs NextRequest) — all pre-existing from before this plan, no new errors introduced.

## User Setup Required

None.

## Next Phase Readiness

- All 5 wizard step components complete; ProjectWizard fully functional end-to-end
- Dashboard has New Project button wired to ProjectWizard dialog
- Plan 20-05 (completeness score) and 20-06 (final wizard plan) can proceed

## Self-Check: PASSED

All created files confirmed present. All task commits verified in git history.

---
*Phase: 20-project-initiation-wizard*
*Completed: 2026-03-27*
