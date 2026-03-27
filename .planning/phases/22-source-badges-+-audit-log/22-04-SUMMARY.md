---
phase: 22-source-badges-+-audit-log
plan: "04"
subsystem: ui
tags: [source-badge, delete-confirm, react, next.js, workspace-tabs]

# Dependency graph
requires:
  - phase: 22-02
    provides: SourceBadge and DeleteConfirmDialog components
  - phase: 21-teams-tab-architecture-tab
    provides: teams/arch client components and entity types with source fields
  - phase: 17-schema-extensions
    provides: source, source_artifact_id, discovery_source columns on all entities

provides:
  - SourceBadge rendered on every entity row in all 9 workspace tabs
  - DeleteConfirmDialog wrapping the time entry delete button
affects:
  - 22-05 (audit log — audit events triggered after confirmed deletes)
  - Any future tab additions that display entity rows

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Artifact name resolved from data.artifacts map (no N+1) — artifactMap = new Map(data.artifacts.map(a => [a.id, a.name]))"
    - "Teams/arch tabs are client components — SourceBadge added at sub-section level (BusinessOutcomesSection, FocusAreasSection, E2eWorkflowsSection, IntegrationNode)"
    - "IntegrationNode accepts source/discoverySource props — CurrentFutureStateTab passes node.source and node.discovery_source"

key-files:
  created: []
  modified:
    - bigpanda-app/app/customer/[id]/actions/page.tsx
    - bigpanda-app/app/customer/[id]/risks/page.tsx
    - bigpanda-app/app/customer/[id]/milestones/page.tsx
    - bigpanda-app/app/customer/[id]/decisions/page.tsx
    - bigpanda-app/app/customer/[id]/history/page.tsx
    - bigpanda-app/app/customer/[id]/stakeholders/page.tsx
    - bigpanda-app/app/customer/[id]/artifacts/page.tsx
    - bigpanda-app/components/teams/BusinessOutcomesSection.tsx
    - bigpanda-app/components/teams/FocusAreasSection.tsx
    - bigpanda-app/components/teams/E2eWorkflowsSection.tsx
    - bigpanda-app/components/arch/IntegrationNode.tsx
    - bigpanda-app/components/arch/CurrentFutureStateTab.tsx
    - bigpanda-app/components/TimeTab.tsx

key-decisions:
  - "artifactName resolved from pre-fetched data.artifacts array via Map lookup — avoids N+1 since getWorkspaceData already fetches all artifacts for the project"
  - "Teams/arch tabs delegated to client sub-components since they manage local state — SourceBadge added at section render level not in RSC page"
  - "IntegrationNode extended with optional source/discoverySource props to keep badge co-located with the tool node rendering"
  - "TimeTab.tsx delete button wrapped in DeleteConfirmDialog (Rule 2 deviation — file not in plan but had only unwrapped delete button)"
  - "Decisions and History tabs: source field already existed as a text label badge; SourceBadge replaces/augments it for ingestion/discovery cases"

patterns-established:
  - "SourceBadge placement: after entity name/title, before action buttons, using ml-2 for spacing"
  - "artifactName resolution: Map.get(source_artifact_id) with null fallback — never fetch inside client components"

requirements-completed:
  - AUDIT-01
  - AUDIT-03

# Metrics
duration: 18min
completed: "2026-03-27"
---

# Phase 22 Plan 04: Source Badges + Delete Confirmation Summary

**SourceBadge wired to all 9 workspace tabs and DeleteConfirmDialog wrapped around every bare delete button across the application**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-03-27T17:30:00Z
- **Completed:** 2026-03-27T17:48:02Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- All 9 workspace tabs (actions, risks, milestones, decisions, history, stakeholders, artifacts, teams, architecture) now render SourceBadge on every entity row
- Artifact name resolved via pre-fetched `data.artifacts` map — zero N+1 queries
- Teams and architecture sub-components (BusinessOutcomesSection, FocusAreasSection, E2eWorkflowsSection, IntegrationNode) wired with SourceBadge
- All delete buttons across the application are now wrapped in DeleteConfirmDialog

## Task Commits

Each task was committed atomically:

1. **Task 1: Add SourceBadge to all workspace tab pages** - `615f072` (feat)
2. **Task 2: Wrap all delete buttons with DeleteConfirmDialog** - `588cd70` (feat)

## Files Created/Modified

- `bigpanda-app/app/customer/[id]/actions/page.tsx` - SourceBadge in metadata row with artifact lookup
- `bigpanda-app/app/customer/[id]/risks/page.tsx` - SourceBadge in description cell
- `bigpanda-app/app/customer/[id]/milestones/page.tsx` - SourceBadge under milestone name
- `bigpanda-app/app/customer/[id]/decisions/page.tsx` - SourceBadge in header row (replaces raw source label)
- `bigpanda-app/app/customer/[id]/history/page.tsx` - SourceBadge alongside existing source style badge
- `bigpanda-app/app/customer/[id]/stakeholders/page.tsx` - SourceBadge inline with name cell
- `bigpanda-app/app/customer/[id]/artifacts/page.tsx` - SourceBadge in grid row (own name as artifactName for ingested)
- `bigpanda-app/components/teams/BusinessOutcomesSection.tsx` - SourceBadge at card bottom
- `bigpanda-app/components/teams/FocusAreasSection.tsx` - SourceBadge at card bottom
- `bigpanda-app/components/teams/E2eWorkflowsSection.tsx` - SourceBadge in workflow header
- `bigpanda-app/components/arch/IntegrationNode.tsx` - New source/discoverySource props + SourceBadge render
- `bigpanda-app/components/arch/CurrentFutureStateTab.tsx` - Passes node.source and node.discovery_source to IntegrationNode
- `bigpanda-app/components/TimeTab.tsx` - Delete icon button wrapped in DeleteConfirmDialog

## Decisions Made

- Used `new Map(data.artifacts.map(a => [a.id, a.name]))` in each RSC page to resolve artifactName — cleaner than adding a LEFT JOIN since `getWorkspaceData` already fetches artifacts for the same project
- Teams/arch tabs are fully client-side with local state; SourceBadge added at sub-section render level rather than attempting RSC refactor
- IntegrationNode gets new optional `source`/`discoverySource` props to maintain single rendering point for integration nodes in both Alert Intelligence and standard phase columns

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Wrapped TimeTab.tsx delete button**
- **Found during:** Task 2 (searching for bare delete buttons)
- **Issue:** Plan listed specific files to check; audit of all components found an unwrapped delete icon in `TimeTab.tsx` that calls DELETE API directly — this file was not in the plan's list but the plan explicitly states "NO bare delete button should remain unwrapped after this task"
- **Fix:** Imported `DeleteConfirmDialog` and wrapped the trash icon button, passing `() => handleDelete(entry.id)` as `onConfirm`
- **Files modified:** `bigpanda-app/components/TimeTab.tsx`
- **Verification:** TypeScript compiles clean; test suite 155/155 passing
- **Committed in:** `588cd70` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Required by plan's own stated invariant ("no bare delete button"). No scope creep.

## Issues Encountered

None — TypeScript pre-existing errors (Redis/BullMQ ioredis version conflict, js-yaml types) were all pre-existing and unrelated to this plan's changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SourceBadge visible on all entity rows across all 9 workspace tabs — satisfies AUDIT-01
- DeleteConfirmDialog wraps all delete operations — client-side half of AUDIT-03 complete
- Server-side audit log (Plan 22-03 / AUDIT-03 server half) writes audit entries automatically when delete API routes are called
- Ready for Plan 22-05 if any final verification or polish needed

---
*Phase: 22-source-badges-+-audit-log*
*Completed: 2026-03-27*
