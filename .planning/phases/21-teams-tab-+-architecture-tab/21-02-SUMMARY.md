---
phase: 21-teams-tab-+-architecture-tab
plan: "02"
subsystem: api
tags: [drizzle-orm, nextjs, postgres, architecture-integrations, before-state, team-onboarding-status]

# Dependency graph
requires:
  - phase: 21-teams-tab-+-architecture-tab
    provides: "Plan 21-01 added architectureIntegrations to queries.ts and schema; Plan 21-00 added the three new tables to DB schema"
provides:
  - "GET+POST /api/projects/[projectId]/architecture-integrations"
  - "PATCH+DELETE /api/projects/[projectId]/architecture-integrations/[id]"
  - "GET+PUT /api/projects/[projectId]/before-state (idempotent upsert)"
  - "GET+POST /api/projects/[projectId]/team-onboarding-status"
  - "PATCH+DELETE /api/projects/[projectId]/team-onboarding-status/[id]"
  - "getArchTabData query function in queries.ts"
  - "BeforeState, TeamOnboardingStatus, ArchTabData exported types"
affects: [21-04-arch-tab-rebuild, 21-05-skill-context-builder]

# Tech tracking
tech-stack:
  added: []
  patterns: [drizzle-orm-transaction-rls, nextjs-app-router-route-handlers, upsert-via-select-then-update-or-insert]

key-files:
  created:
    - bigpanda-app/app/api/projects/[projectId]/architecture-integrations/route.ts
    - bigpanda-app/app/api/projects/[projectId]/architecture-integrations/[id]/route.ts
    - bigpanda-app/app/api/projects/[projectId]/before-state/route.ts
    - bigpanda-app/app/api/projects/[projectId]/team-onboarding-status/route.ts
    - bigpanda-app/app/api/projects/[projectId]/team-onboarding-status/[id]/route.ts
  modified:
    - bigpanda-app/lib/queries.ts

key-decisions:
  - "before-state PUT uses select-then-update-or-insert pattern (not Postgres ON CONFLICT) because project_id has no unique constraint declared in schema — avoids migration"
  - "getArchTabData added to queries.ts as part of 21-01 commit (was already in HEAD when 21-02 started — no duplicate work needed)"

patterns-established:
  - "Upsert pattern for single-row-per-project tables: SELECT first, then UPDATE if exists else INSERT — all in one transaction with RLS SET LOCAL"
  - "CRUD routes follow integrations/route.ts pattern: integer validation, try/catch 500, db.transaction with SET LOCAL RLS, zod schema validation"

requirements-completed: [ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05, ARCH-06, ARCH-07, ARCH-08, ARCH-09]

# Metrics
duration: 4min
completed: 2026-03-27
---

# Phase 21 Plan 02: Architecture Tab API Routes + getArchTabData Query Summary

**Five CRUD API route handlers and getArchTabData RSC query for architecture_integrations, before_state, and team_onboarding_status tables**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-27T04:24:21Z
- **Completed:** 2026-03-27T04:28:25Z
- **Tasks:** 2
- **Files modified:** 6 (5 created, 1 modified)

## Accomplishments
- Created 5 route files covering all Architecture tab CRUD operations: architecture integrations (GET/POST/PATCH/DELETE), before-state (GET/PUT upsert), team onboarding status (GET/POST/PATCH/DELETE)
- Added BeforeState, TeamOnboardingStatus, ArchTabData types to queries.ts alongside existing ArchitectureIntegration type
- Added getArchTabData(projectId) function for RSC use in Architecture tab — returns architectureIntegrations (ordered by phase/tool_name), beforeState (null if not set), teamOnboardingStatus (ordered by team_name)
- before-state PUT is idempotent: second call updates existing row, never inserts duplicate

## Task Commits

Each task was committed atomically:

1. **Task 1: getArchTabData query + ArchTabData types** - `4dc5500` (feat) — Note: this was already committed as part of Plan 21-01 execution; no new commit needed
2. **Task 2: CRUD API routes for architecture-integrations, before-state, team-onboarding-status** - `1926379` (feat)

## Files Created/Modified
- `bigpanda-app/app/api/projects/[projectId]/architecture-integrations/route.ts` — GET list + POST create
- `bigpanda-app/app/api/projects/[projectId]/architecture-integrations/[id]/route.ts` — PATCH update + DELETE
- `bigpanda-app/app/api/projects/[projectId]/before-state/route.ts` — GET + PUT upsert
- `bigpanda-app/app/api/projects/[projectId]/team-onboarding-status/route.ts` — GET list + POST create
- `bigpanda-app/app/api/projects/[projectId]/team-onboarding-status/[id]/route.ts` — PATCH update + DELETE
- `bigpanda-app/lib/queries.ts` — BeforeState, TeamOnboardingStatus, ArchTabData types + getArchTabData function (already in HEAD from 21-01)

## Decisions Made
- before-state PUT upsert implemented as select-then-update-or-insert (not ON CONFLICT DO UPDATE) because the schema does not declare a unique constraint on project_id for the before_state table, so relying on ON CONFLICT would require a migration. The transactional approach is functionally equivalent.
- getArchTabData was already present in queries.ts at plan start (committed by Plan 21-01 execution) — Task 1 was verified complete without creating a duplicate commit.

## Deviations from Plan

None - plan executed exactly as written. Task 1 was already complete from Plan 21-01 commit 4dc5500.

## Issues Encountered
- queries.ts Task 1 changes were discovered to be pre-committed in 4dc5500 (Plan 21-01 extended to cover Architecture tab types as well as Teams tab types). This was not a blocking issue — verification confirmed the content was correct and no rework was needed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Architecture tab CRUD endpoints are fully operational and consistent with the existing integrations route pattern
- getArchTabData is available for RSC calls in Plan 21-04 (Architecture tab page rebuild)
- BeforeState, TeamOnboardingStatus, ArchTabData types are available for Plan 21-05 (skill context builder serialization)
- No blockers

---
*Phase: 21-teams-tab-+-architecture-tab*
*Completed: 2026-03-27*
