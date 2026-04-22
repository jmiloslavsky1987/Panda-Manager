---
phase: 75-schema-quick-wins-admin
plan: "02"
subsystem: database, ui, api
tags: [postgres, drizzle, enum, milestone, portfolio, nextjs]

# Dependency graph
requires:
  - phase: 75-01
    provides: DB migrations 0038-0042 applied; schema.ts updated for v9.0 tables

provides:
  - milestone_status PG enum rebuilt with on_track/at_risk/complete/missed values (migration 0043)
  - MilestoneEditModal status field replaced with 4-option select dropdown
  - PATCH /api/milestones/[id] accepts new enum values via zod schema
  - POST /api/milestones route uses new enum values with on_track default
  - PortfolioProject.overdueMilestones computed field (date < today AND status != complete)
  - PortfolioSummaryChips Overdue Milestones chip reads live overdueMilestones data

affects: [76-pickers-risk-fields, 77-intelligence-gantt, portfolio-dashboard, milestone-edit-surface]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Milestone status enum: on_track | at_risk | complete | missed (replaces not_started/in_progress/completed/blocked)"
    - "Portfolio overdue milestones: server-side computed in getPortfolioData as date < today AND status != complete"
    - "coerceMilestoneStatus maps ingestion free-text to new enum values with on_track as safe default"

key-files:
  created:
    - db/migrations/0043_milestone_status_enum.sql
  modified:
    - db/schema.ts
    - app/api/milestones/[id]/route.ts
    - app/api/milestones/route.ts
    - app/api/ingestion/approve/route.ts
    - lib/queries.ts
    - lib/seed-project.ts
    - components/MilestoneEditModal.tsx
    - components/PortfolioSummaryChips.tsx

key-decisions:
  - "milestone_status enum rebuilt via DROP + CREATE since milestones table was empty and column was already TEXT (Phase 75-01 had not applied a typed enum)"
  - "coerceMilestoneStatus updated to map at_risk/blocked/stuck to at_risk and missed/overdue to missed; on_track is default fallback"
  - "overdueMilestones computed in getPortfolioData alongside existing milestoneData fetch (no extra DB query)"

patterns-established:
  - "Milestone status values: always use on_track/at_risk/complete/missed — never completed, not_started, in_progress, blocked"

requirements-completed: [MILE-01, MILE-02]

# Metrics
duration: 7min
completed: 2026-04-22
---

# Phase 75 Plan 02: Milestone Status Enum Fix + Portfolio Counter Summary

**Rebuilt milestone_status PG enum to on_track/at_risk/complete/missed, wired MilestoneEditModal to a 4-option select dropdown, and made the Portfolio Overdue Milestones chip compute live data from date < today AND status != complete**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-22T20:00:11Z
- **Completed:** 2026-04-22T20:07:41Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Migration 0043 applied: milestone_status PG enum rebuilt with on_track/at_risk/complete/missed
- MilestoneEditModal.tsx status free-text input replaced with a 4-option select dropdown
- PATCH /api/milestones/[id] and POST /api/milestones routes updated to accept new enum values
- PortfolioSummaryChips Overdue Milestones chip now reads live overdueMilestones from PortfolioProject
- All stale 'completed' milestone status references updated to 'complete' across queries and ingestion pipeline

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate milestone_status enum and update schema.ts + PATCH route** - `affd0f60` (feat)
2. **Task 2: Fix MilestoneEditModal status dropdown and Portfolio overdue counter** - `7fa87421` (feat)

## Files Created/Modified
- `db/migrations/0043_milestone_status_enum.sql` - Rebuilds milestone_status enum; migrates existing data; casts column back
- `db/schema.ts` - milestoneStatusEnum updated to new four values
- `app/api/milestones/[id]/route.ts` - patchSchema updated for new enum values
- `app/api/milestones/route.ts` - postSchema + default value updated
- `app/api/ingestion/approve/route.ts` - coerceMilestoneStatus rewritten for new enum values
- `lib/queries.ts` - ne(milestones.status, 'complete') fix; upcomingMilestones filter fix; overdueMilestones computed field added to getPortfolioData; PortfolioProject interface extended
- `lib/seed-project.ts` - default milestone status changed from not_started to on_track
- `components/MilestoneEditModal.tsx` - status text input replaced with select dropdown
- `components/PortfolioSummaryChips.tsx` - Overdue Milestones chip uses overdueMilestonesCount from p.overdueMilestones

## Decisions Made
- Migration 0043 applied via psql directly (milestones.status was already TEXT — Phase 75-01 had not created a typed enum, so DROP + CREATE was needed rather than ALTER TYPE)
- coerceMilestoneStatus function updated with sensible mappings: blocked/stuck/at-risk → at_risk; missed/overdue/late → missed; completed/complete/done → complete; everything else → on_track
- overdueMilestones computed in getPortfolioData using the already-fetched milestoneData (no extra DB roundtrip)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed stale milestone status references in additional source files**
- **Found during:** Task 1 (TypeScript check after schema update)
- **Issue:** TypeScript errors in app/api/milestones/route.ts, app/api/ingestion/approve/route.ts, and lib/seed-project.ts — all used old enum values (not_started, completed, in_progress, blocked)
- **Fix:** Updated postSchema, default status value, coerceMilestoneStatus function, and seed-project default to use new enum values
- **Files modified:** app/api/milestones/route.ts, app/api/ingestion/approve/route.ts, lib/seed-project.ts
- **Verification:** npx tsc --noEmit passes clean on all source files
- **Committed in:** affd0f60 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required for TypeScript compilation and runtime correctness. No scope creep.

## Issues Encountered
- _migrations tracking table had no rows despite DB being fully set up (migrations were applied directly via psql in Phase 75-01). The migration runner failed on 0001_initial.sql due to a __drizzle_migrations primary key conflict. Worked around by applying migration 0043 directly via psql then updating the migration file to match the actual DB state.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Milestone status enum is stable; Phase 76 picker work can reference on_track/at_risk/complete/missed
- Portfolio dashboard Overdue Milestones chip now shows live data
- All milestone-related API routes aligned on new enum values

---
*Phase: 75-schema-quick-wins-admin*
*Completed: 2026-04-22*
