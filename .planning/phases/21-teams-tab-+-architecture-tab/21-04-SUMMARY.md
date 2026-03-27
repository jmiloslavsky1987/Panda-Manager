---
phase: 21-teams-tab-+-architecture-tab
plan: "04"
subsystem: ui
tags: [react, nextjs, architecture-tab, typescript, tailwind, drizzle]

# Dependency graph
requires:
  - phase: 21-02
    provides: "getArchTabData query, ArchTabData types, architecture-integrations/before-state/team-onboarding-status API routes"

provides:
  - "2-tab Architecture view: Before BigPanda + Current & Future State"
  - "BeforeBigPandaTab with 5-phase horizontal flow, AMEX/Kaiser customer rules, pain point cards"
  - "CurrentFutureStateTab with ADR columns, amber BIGGY AI TRACK divider, Biggy columns"
  - "IntegrationNode reusable tile with status pills (Live/In Progress/Pilot/Planned)"
  - "TeamOnboardingTable with ADR (blue) and Biggy (amber) section headers"
  - "BeforeStateEditModal, IntegrationEditModal, TeamOnboardingEditModal inline edit dialogs"

affects:
  - "21-05 (phase 21 testing)"
  - "22-source-badges-audit-log (architecture integrations have source field)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RSC page + 'use client' tab controller pattern: page.tsx loads via getArchTabData, passes to client WorkflowDiagram"
    - "Inline optimistic edit modals: fire POST/PATCH, call onUpdate(result) on success"
    - "Status pill hex tokens: Live #dcfce7/#14532d, In Progress/Pilot #fef3c7/#92400e, Planned #f1f5f9/#475569"

key-files:
  created:
    - bigpanda-app/components/arch/WorkflowDiagram.tsx
    - bigpanda-app/components/arch/BeforeBigPandaTab.tsx
    - bigpanda-app/components/arch/CurrentFutureStateTab.tsx
    - bigpanda-app/components/arch/IntegrationNode.tsx
    - bigpanda-app/components/arch/TeamOnboardingTable.tsx
    - bigpanda-app/components/arch/BeforeStateEditModal.tsx
    - bigpanda-app/components/arch/IntegrationEditModal.tsx
    - bigpanda-app/components/arch/TeamOnboardingEditModal.tsx
  modified:
    - bigpanda-app/app/customer/[id]/architecture/page.tsx

key-decisions:
  - "Typed status state as string (not narrow union) in IntegrationEditModal to avoid TS2345 with select onChange"
  - "Alert Intelligence sub-groups (Normalization/Correlation) rendered inside column using notes field tagging, with even/odd index fallback when no tagging present"
  - "overflow-x-auto on phase column containers satisfies ARCH-12 1280px responsive requirement without media queries"

patterns-established:
  - "Phase column pattern: min-w-48 flex-shrink-0 with overflow-x-auto parent handles 5-column layouts at 1280px+"
  - "Customer rule injection: customer prop passed down to BeforeBigPandaTab, .toLowerCase().includes() for AMEX/Kaiser checks"

requirements-completed:
  - ARCH-01
  - ARCH-02
  - ARCH-03
  - ARCH-04
  - ARCH-05
  - ARCH-06
  - ARCH-07
  - ARCH-08
  - ARCH-09
  - ARCH-11
  - ARCH-12

# Metrics
duration: 4min
completed: 2026-03-27
---

# Phase 21 Plan 04: Architecture Tab Workflow Diagram Summary

**2-tab Architecture view with DB-powered ADR/Biggy workflow tracks, amber divider, team onboarding status table, and customer-specific AMEX/Kaiser rules**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-27T04:31:01Z
- **Completed:** 2026-03-27T04:35:18Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Rebuilt architecture/page.tsx from workstream-card view to RSC loader passing ArchTabData to WorkflowDiagram
- Built 2-tab view with grey dot (Before BigPanda) and green dot (Current & Future State) tab switching without page reload
- Before BigPanda: 5-phase horizontal flow (Event Sources → Aggregation Hub → Ticket Creation → Incident Response → Resolution) with AMEX orange hub, Kaiser "Live in Production" badge, and pain point cards from DB
- Current & Future State: ADR columns in blue with Normalization/Correlation sub-groups in Alert Intelligence, full-width amber divider labeled "↓ BIGGY AI TRACK ↓", Biggy AI columns in purple
- Team Onboarding Status table with ADR (blue header) and Biggy AI (amber header) sections, clickable cells opening edit modal
- All status pills use exact spec hex tokens (ARCH-08)

## Task Commits

1. **Task 1: RSC loader + WorkflowDiagram tab controller** - `3f64abc` (feat)
2. **Task 2: 7 arch components** - `37927da` (feat)

## Files Created/Modified

- `bigpanda-app/app/customer/[id]/architecture/page.tsx` - RSC page calling getArchTabData + getProjectById, renders WorkflowDiagram
- `bigpanda-app/components/arch/WorkflowDiagram.tsx` - Client tab controller with useState for integrations/beforeState/onboardingRows
- `bigpanda-app/components/arch/BeforeBigPandaTab.tsx` - 5-phase flow, AMEX orange, Kaiser badge, pain point cards, BeforeStateEditModal trigger
- `bigpanda-app/components/arch/CurrentFutureStateTab.tsx` - ADR + amber divider + Biggy columns, TeamOnboardingTable, IntegrationEditModal
- `bigpanda-app/components/arch/IntegrationNode.tsx` - Reusable tile with status pills; exports StatusPill for reuse in TeamOnboardingTable
- `bigpanda-app/components/arch/TeamOnboardingTable.tsx` - ADR/Biggy sections, click-to-edit cells, dot legend
- `bigpanda-app/components/arch/BeforeStateEditModal.tsx` - PUT /api/projects/{id}/before-state; pain_points as newline-delimited textarea
- `bigpanda-app/components/arch/IntegrationEditModal.tsx` - POST/PATCH architecture-integrations; track-gated phase select
- `bigpanda-app/components/arch/TeamOnboardingEditModal.tsx` - POST/PATCH team-onboarding-status; all 5 status selects

## Decisions Made

- Typed status state as `string` (not narrow `'live'|'in_progress'|...'`) in IntegrationEditModal — select onChange provides string, narrow union would require cast
- Alert Intelligence Normalization/Correlation sub-groups use notes field tagging with even/odd index fallback for uncategorized data
- StatusPill exported from IntegrationNode.tsx and reused in TeamOnboardingTable to keep color tokens in one place

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — all components compiled on first TypeScript check pass after fixing one status type narrowing issue in IntegrationEditModal (widened to `string`).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Architecture tab complete with all ARCH-01 through ARCH-12 requirements delivered
- Phase 21 has one remaining plan (21-05: test stubs / verification) or end-to-end testing
- Source badges (Phase 22) can now read the `source` field from architecture_integrations rows

---
*Phase: 21-teams-tab-+-architecture-tab*
*Completed: 2026-03-27*
