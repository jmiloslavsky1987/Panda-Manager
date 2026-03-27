---
phase: 21-teams-tab-+-architecture-tab
plan: "03"
subsystem: ui
tags: [react, nextjs, typescript, tailwind, drizzle, optimistic-ui]

# Dependency graph
requires:
  - phase: 21-01
    provides: getTeamsTabData query, API routes for business-outcomes/e2e-workflows/focus-areas, TeamsTabData types
  - phase: 21-02
    provides: architecture_integrations API routes
provides:
  - Teams tab rebuilt as 5-section Team Engagement Map replacing workstream table
  - WarnBanner component (yellow hex-token warning for empty sections)
  - TeamEngagementMap client wrapper orchestrating all 5 sections
  - BusinessOutcomesSection with ADR/Biggy/Both track pills and delivery status badges
  - ArchOverviewSection rendering architecture_integrations in two-panel ADR/Biggy layout with status pills
  - E2eWorkflowsSection with horizontal step flows, track-colored pills, arrows between steps
  - TeamsEngagementSection with AMEX canonical ordering and top-3 project-level open actions (TEAMS-05)
  - FocusAreasSection with tracks pills, why_it_matters, status/next_step, owner fields
  - InlineEditModal reusable modal for add/edit across all sections
affects:
  - Phase 22 (source badges — these components will show ingestion source)
  - Any future Teams tab enhancements

# Tech tracking
tech-stack:
  added: []
  patterns:
    - RSC data loader pattern — page.tsx fetches getTeamsTabData + getProjectById in parallel, passes to client wrapper
    - Optimistic UI — all add/edit operations update state immediately, revert on error
    - Design token inline styles — hex values not expressible by Tailwind applied via style={{ }}
    - Client-side AMEX canonical ordering — customer.toLowerCase().includes('amex') guard

key-files:
  created:
    - bigpanda-app/components/teams/WarnBanner.tsx
    - bigpanda-app/components/teams/TeamEngagementMap.tsx
    - bigpanda-app/components/teams/BusinessOutcomesSection.tsx
    - bigpanda-app/components/teams/ArchOverviewSection.tsx
    - bigpanda-app/components/teams/E2eWorkflowsSection.tsx
    - bigpanda-app/components/teams/TeamsEngagementSection.tsx
    - bigpanda-app/components/teams/FocusAreasSection.tsx
    - bigpanda-app/components/teams/InlineEditModal.tsx
  modified:
    - bigpanda-app/app/customer/[id]/teams/page.tsx

key-decisions:
  - "openActions are project-level (no team field in actions table) — top-3 shown on every team card as shared Open Items block"
  - "architectureIntegrations passed as read-only prop to ArchOverviewSection — no optimistic state since Architecture tab manages this data"
  - "AMEX canonical team ordering: 8-team list enforced only when customer.toLowerCase().includes('amex')"
  - "Design tokens applied via inline style for hex values (#1e40af, #6d28d9, #065f46, etc.) that Tailwind cannot express exactly"

patterns-established:
  - "Section WarnBanner pattern: each section renders WarnBanner when data array is empty, never generic placeholder copy"
  - "Optimistic add with revert: POST API call fires after state update; onUpdate called with original array on catch"
  - "TeamsEngagementSection derives team list from e2eWorkflows.team_name distinct values — no separate teams table"

requirements-completed:
  - TEAMS-01
  - TEAMS-02
  - TEAMS-03
  - TEAMS-04
  - TEAMS-05
  - TEAMS-06
  - TEAMS-07
  - TEAMS-08
  - TEAMS-09
  - TEAMS-11

# Metrics
duration: 6min
completed: 2026-03-27
---

# Phase 21 Plan 03: Team Engagement Map UI Summary

**5-section Teams tab with ADR/Biggy design tokens, optimistic inline editing, AMEX canonical team ordering, and architecture integrations two-panel view — replacing the workstream table**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-27T04:31:00Z
- **Completed:** 2026-03-27T04:37:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Rebuilt teams/page.tsx as RSC that fetches getTeamsTabData + getProjectById in parallel and passes to TeamEngagementMap client wrapper
- Implemented all 5 sections with exact hex design tokens: ADR (#1e40af), Biggy (#6d28d9), E2E green (#065f46), status badges (Live/In Progress/Blocked/Planned)
- TEAMS-05 satisfied: TeamsEngagementSection displays top-3 project-level open action descriptions as plain text on every team card; "No open items" in muted style when empty
- TEAMS-03 satisfied: ArchOverviewSection renders architecture_integrations in ADR/Biggy panels with per-node status pills — not workflow steps
- TEAMS-09 satisfied: AMEX canonical 8-team order enforced when customer includes 'amex' (case-insensitive)
- InlineEditModal reusable across BusinessOutcomes, E2eWorkflows, FocusAreas with optimistic add and revert-on-error

## Task Commits

1. **Task 1: RSC page + WarnBanner + TeamEngagementMap shell** - committed in `37927da` (as stubs by 21-04) — files matched plan spec exactly, no changes needed
2. **Task 2: 5 section components + InlineEditModal** - `1fb4d3e` (feat)

## Files Created/Modified

- `bigpanda-app/app/customer/[id]/teams/page.tsx` — RSC loading TeamsTabData + project in parallel, rendering TeamEngagementMap
- `bigpanda-app/components/teams/WarnBanner.tsx` — Yellow banner (#fef9c3/#fde047/#713f12) for empty sections
- `bigpanda-app/components/teams/TeamEngagementMap.tsx` — Client wrapper with useState for outcomes/workflows/focusAreas
- `bigpanda-app/components/teams/BusinessOutcomesSection.tsx` — Outcome cards with track/status design tokens, optimistic POST
- `bigpanda-app/components/teams/ArchOverviewSection.tsx` — ADR/Biggy two-panel rendering architecture_integrations with status pills
- `bigpanda-app/components/teams/E2eWorkflowsSection.tsx` — Horizontal step flows with arrows, add step/workflow modals
- `bigpanda-app/components/teams/TeamsEngagementSection.tsx` — Team cards from workflow data, AMEX ordering, top-3 open actions
- `bigpanda-app/components/teams/FocusAreasSection.tsx` — Up to 5 cards with tracks, owners, edit modal
- `bigpanda-app/components/teams/InlineEditModal.tsx` — Reusable controlled-input modal (text/select/textarea/number)

## Decisions Made

- `openActions` are project-level (actions table has no team field) — displayed as shared "Open Items" block on every team card, not per-team filtered
- `architectureIntegrations` passed as read-only prop — Architecture tab manages this data, Teams tab only reads it
- AMEX canonical ordering applied only when `customer.toLowerCase().includes('amex')` — future-proof against casing variations
- `source_artifact_id: null, ingested_at: null` added to optimistic objects to satisfy Phase 18 schema fields

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added source_artifact_id/ingested_at to optimistic objects**
- **Found during:** Task 2 (TypeScript verification)
- **Issue:** Schema has Phase-18-added fields source_artifact_id and ingested_at on businessOutcomes, e2eWorkflows, focusAreas; optimistic objects missing these caused TS2739 errors
- **Fix:** Added `source_artifact_id: null, ingested_at: null` to each optimistic object in BusinessOutcomesSection, E2eWorkflowsSection, FocusAreasSection
- **Files modified:** BusinessOutcomesSection.tsx, E2eWorkflowsSection.tsx, FocusAreasSection.tsx
- **Verification:** npx tsc --noEmit returns zero errors for teams components
- **Committed in:** 1fb4d3e (Task 2 commit)

**2. [Rule 1 - Bug] Fixed created_at type: string → Date**
- **Found during:** Task 2 (TypeScript verification)
- **Issue:** new Date().toISOString() returns string but drizzle timestamp() infers as Date
- **Fix:** Changed to new Date() in all optimistic objects
- **Files modified:** BusinessOutcomesSection.tsx, E2eWorkflowsSection.tsx, FocusAreasSection.tsx
- **Verification:** TypeScript no longer reports TS2322 on created_at fields
- **Committed in:** 1fb4d3e (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 type correctness)
**Impact on plan:** Both fixes were caught by TypeScript verification before commit. No scope creep.

## Issues Encountered

- WarnBanner.tsx and TeamEngagementMap.tsx were already committed as identical stubs in Plan 21-04 commit 37927da (which also included teams/page.tsx). My implementations matched the stubs exactly — working tree was clean for those files. Treated as pre-completed; committed section components as Task 2.

## Next Phase Readiness

- Teams tab complete: all 5 sections render with live DB data or WarnBanners when empty
- Phase 22 (Source Badges + Audit Log) can add source indicators to outcome/workflow/focus-area cards
- InlineEditModal is reusable across other future sections

---
*Phase: 21-teams-tab-+-architecture-tab*
*Completed: 2026-03-27*
