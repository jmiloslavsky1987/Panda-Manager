---
phase: 66-overview-tracks-redesign
plan: 01
subsystem: api
tags: [bullmq, integrations, scheduled-jobs, weekly-focus, delete-endpoint]

# Dependency graph
requires:
  - phase: 65-project-scoped-scheduling
    provides: BullMQ job scheduling infrastructure and project-scoped jobs pattern
provides:
  - DELETE /api/projects/[projectId]/integrations/[integId] endpoint for integration removal
  - Auto-registration of weekly-focus repeatable BullMQ job on project creation
affects: [overview-tracks-ui, integrations-ui, scheduled-jobs]

# Tech tracking
tech-stack:
  added: []
  patterns: [best-effort-job-registration, repeatable-job-per-project]

key-files:
  created: []
  modified:
    - bigpanda-app/app/api/projects/[projectId]/integrations/[integId]/route.ts
    - bigpanda-app/app/api/projects/route.ts

key-decisions:
  - "DELETE endpoint uses same 'user' role guard as PATCH for consistency"
  - "Weekly-focus job registration is best-effort with try/catch to prevent Redis unavailability from failing project creation"
  - "Job scheduler key pattern: weekly-focus-project-{id} for uniqueness and idempotency"
  - "Cron pattern 0 6 * * 1 (every Monday at 6am UTC) per OVRVW-03 requirement"

patterns-established:
  - "Best-effort BullMQ job registration: wrap in try/catch, log errors but don't fail primary operation"
  - "Repeatable job naming: {skill-name}-project-{id} for per-project automation"

requirements-completed: [OVRVW-03, OVRVW-05]

# Metrics
duration: 103 seconds
completed: 2026-04-16
---

# Phase 66 Plan 01: Integration Deletion & Weekly Focus Automation

**DELETE endpoint for integration records and auto-registered weekly-focus BullMQ jobs firing every Monday at 6am UTC**

## Performance

- **Duration:** 1m 43s
- **Started:** 2026-04-16T03:57:23Z
- **Completed:** 2026-04-16T03:59:06Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- DELETE /api/projects/[projectId]/integrations/[integId] endpoint enables per-row integration deletion
- Weekly-focus repeatable jobs auto-register on project creation without manual scheduler setup
- Both implementations follow established patterns (RLS transactions, best-effort job registration)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add DELETE handler to integrations/[integId]/route.ts** - `1085e6d` (feat)
2. **Task 2: Register weekly-focus repeatable job in project creation route** - `c742f68` (feat)

## Files Created/Modified
- `bigpanda-app/app/api/projects/[projectId]/integrations/[integId]/route.ts` - Added DELETE handler using same auth guard and RLS pattern as PATCH
- `bigpanda-app/app/api/projects/route.ts` - Added weekly-focus BullMQ job registration block after transaction

## Decisions Made

**DELETE endpoint role guard consistency**
- Used 'user' role (not 'admin') for DELETE handler to match existing PATCH pattern
- Rationale: Users should be able to delete integrations they can edit; role consistency reduces confusion

**Best-effort job registration**
- Wrapped BullMQ registration in try/catch to prevent Redis unavailability from failing project creation
- Rationale: Project creation is the primary operation; job registration is a convenience feature that should degrade gracefully

**Job scheduler key pattern**
- Used `weekly-focus-project-${result.id}` naming convention for repeatable job keys
- Rationale: Ensures uniqueness per project; upsertJobScheduler makes pattern idempotent for future updates

**Cron pattern placement**
- Hardcoded `0 6 * * 1` (Monday 6am UTC) per OVRVW-03 requirement
- Rationale: Weekly focus timing is product requirement, not user configuration; consistent schedule across all projects

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - both tasks executed without blocking issues. TypeScript compilation passed for both modified files. Pre-existing test failures in unrelated files remain out of scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DELETE endpoint ready for UI integration in overview tracks
- Weekly-focus jobs will begin firing for all new projects created after this deployment
- Existing projects can be migrated via backfill script if needed (not in current phase scope)

## Self-Check: PASSED

All claims verified:
- ✓ SUMMARY.md created
- ✓ Commit 1085e6d exists (Task 1)
- ✓ Commit c742f68 exists (Task 2)
- ✓ Modified file bigpanda-app/app/api/projects/[projectId]/integrations/[integId]/route.ts exists
- ✓ Modified file bigpanda-app/app/api/projects/route.ts exists

---
*Phase: 66-overview-tracks-redesign*
*Completed: 2026-04-16*
