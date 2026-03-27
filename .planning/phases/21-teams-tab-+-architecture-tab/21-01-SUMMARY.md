---
phase: 21-teams-tab-+-architecture-tab
plan: "01"
subsystem: api
tags: [drizzle-orm, nextjs, postgresql, teams-tab, architecture-tab, rls]

# Dependency graph
requires:
  - phase: 17-schema-extensions
    provides: businessOutcomes, e2eWorkflows, workflowSteps, focusAreas, architectureIntegrations tables in schema.ts

provides:
  - GET/POST /api/projects/[projectId]/business-outcomes (CRUD)
  - PATCH/DELETE /api/projects/[projectId]/business-outcomes/[id]
  - GET/POST /api/projects/[projectId]/e2e-workflows (with nested steps)
  - PATCH/DELETE /api/projects/[projectId]/e2e-workflows/[workflowId]
  - POST /api/projects/[projectId]/e2e-workflows/[workflowId]/steps
  - PATCH/DELETE /api/projects/[projectId]/e2e-workflows/[workflowId]/steps/[stepId]
  - GET/POST /api/projects/[projectId]/focus-areas
  - PATCH/DELETE /api/projects/[projectId]/focus-areas/[id]
  - getTeamsTabData(projectId) query in queries.ts returning TeamsTabData
  - Exported types: BusinessOutcome, E2eWorkflow, WorkflowStep, FocusArea, ArchitectureIntegration, E2eWorkflowWithSteps, OpenAction, TeamsTabData

affects:
  - 21-03-teams-tab-ui (consumes these routes for inline CRUD)
  - 21-05-skill-context-builder-update (depends on getTeamsTabData signature)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - db.transaction + SET LOCAL RLS pattern (consistent with existing API routes)
    - innerJoin + stepsMap for nested workflow/steps grouping in queries.ts
    - Parallel Promise.all for multi-table RSC data fetch in getTeamsTabData

key-files:
  created:
    - bigpanda-app/app/api/projects/[projectId]/business-outcomes/route.ts
    - bigpanda-app/app/api/projects/[projectId]/business-outcomes/[id]/route.ts
    - bigpanda-app/app/api/projects/[projectId]/e2e-workflows/route.ts
    - bigpanda-app/app/api/projects/[projectId]/e2e-workflows/[workflowId]/route.ts
    - bigpanda-app/app/api/projects/[projectId]/e2e-workflows/[workflowId]/steps/route.ts
    - bigpanda-app/app/api/projects/[projectId]/e2e-workflows/[workflowId]/steps/[stepId]/route.ts
    - bigpanda-app/app/api/projects/[projectId]/focus-areas/route.ts
    - bigpanda-app/app/api/projects/[projectId]/focus-areas/[id]/route.ts
  modified:
    - bigpanda-app/lib/queries.ts

key-decisions:
  - "getTeamsTabData uses db.select() (not explicit column selector) for architectureIntegrations to match $inferSelect type — schema has source/source_artifact_id/ingested_at fields added in Phase 19"
  - "openActions queries actions table with inArray(status, ['open','in_progress']) — no team field on actions table, all open actions returned project-level"
  - "E2E workflow GET route replicates the join+stepsMap pattern from getTeamsTabData for consistency"

patterns-established:
  - "Workflow ownership verification: steps/stepId routes verify workflowId belongs to projectId via inner select before mutating"
  - "Cascade delete: e2e-workflows DELETE relies on FK cascade (workflow_steps.workflow_id ON DELETE CASCADE)"

requirements-completed: [TEAMS-01, TEAMS-02, TEAMS-03, TEAMS-04, TEAMS-05, TEAMS-06, TEAMS-08]

# Metrics
duration: 4min
completed: 2026-03-27
---

# Phase 21 Plan 01: Teams Tab API + getTeamsTabData Query Summary

**9 Next.js API route files + getTeamsTabData RSC query providing full CRUD for business outcomes, e2e workflows with nested steps, focus areas, architecture integrations, and open actions**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-27T04:23:56Z
- **Completed:** 2026-03-27T04:27:41Z
- **Tasks:** 2
- **Files modified:** 9 (1 modified, 8 created)

## Accomplishments

- Added `getTeamsTabData(projectId): Promise<TeamsTabData>` to queries.ts with parallel Promise.all fetch across 5 tables, including architectureIntegrations (for Architecture Overview section) and openActions (open/in_progress only, for Teams Engagement Status section — TEAMS-05)
- Exported 8 new TypeScript types from queries.ts: `BusinessOutcome`, `E2eWorkflow`, `WorkflowStep`, `FocusArea`, `ArchitectureIntegration`, `E2eWorkflowWithSteps`, `OpenAction`, `TeamsTabData`
- Created 8 CRUD API route files following the established db.transaction + SET LOCAL RLS pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Add getTeamsTabData query + export row types** - `4dc5500` (feat)
2. **Task 2: Create CRUD API routes for business-outcomes, e2e-workflows, focus-areas** - `ec300e3` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `bigpanda-app/lib/queries.ts` - Added businessOutcomes/e2eWorkflows/workflowSteps/focusAreas/architectureIntegrations imports, 8 type exports, getTeamsTabData function
- `bigpanda-app/app/api/projects/[projectId]/business-outcomes/route.ts` - GET list + POST create
- `bigpanda-app/app/api/projects/[projectId]/business-outcomes/[id]/route.ts` - PATCH + DELETE
- `bigpanda-app/app/api/projects/[projectId]/e2e-workflows/route.ts` - GET list with nested steps + POST create
- `bigpanda-app/app/api/projects/[projectId]/e2e-workflows/[workflowId]/route.ts` - PATCH + DELETE (cascade)
- `bigpanda-app/app/api/projects/[projectId]/e2e-workflows/[workflowId]/steps/route.ts` - POST create step
- `bigpanda-app/app/api/projects/[projectId]/e2e-workflows/[workflowId]/steps/[stepId]/route.ts` - PATCH + DELETE
- `bigpanda-app/app/api/projects/[projectId]/focus-areas/route.ts` - GET list + POST create
- `bigpanda-app/app/api/projects/[projectId]/focus-areas/[id]/route.ts` - PATCH + DELETE

## Decisions Made

- Used `db.select()` (no column selector) for `architectureIntegrations` in `getTeamsTabData` after discovering the schema has additional Phase 19 fields (`source`, `source_artifact_id`, `ingested_at`) not listed in the plan's interface snippet. The explicit selector caused a type mismatch.
- `openActions` uses `inArray(actions.status, ['open', 'in_progress'])` — the actions table has no team field, so all project-level open actions are returned and the UI handles display grouping.
- Workflow ownership verification added to steps routes: verifies `workflowId` belongs to `projectId` before any mutation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] architectureIntegrations explicit column selector caused TS type mismatch**
- **Found during:** Task 1 (getTeamsTabData query)
- **Issue:** Plan specified explicit column selector for architectureIntegrations omitting `source`, `source_artifact_id`, `ingested_at` fields — these were added to the schema in Phase 19 but not reflected in the plan's interface snippet. TypeScript rejected the partial select as not assignable to `ArchitectureIntegration[]` (full $inferSelect).
- **Fix:** Replaced explicit column selector with `db.select()` to return all columns, matching the `$inferSelect` type exactly.
- **Files modified:** bigpanda-app/lib/queries.ts
- **Verification:** `npx tsc --noEmit` passes with no errors on queries.ts
- **Committed in:** 4dc5500 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required to fix TypeScript correctness. No scope change.

## Issues Encountered

- Pre-existing TypeScript errors in bullmq/ioredis type mismatch (jobs/trigger route, skills/run route, worker files) and tests/wizard files were present before this plan and are unrelated to our changes. No action taken.

## Self-Check

## Self-Check: PASSED

Files verified:
- FOUND: bigpanda-app/app/api/projects/[projectId]/business-outcomes/route.ts
- FOUND: bigpanda-app/app/api/projects/[projectId]/business-outcomes/[id]/route.ts
- FOUND: bigpanda-app/app/api/projects/[projectId]/e2e-workflows/route.ts
- FOUND: bigpanda-app/app/api/projects/[projectId]/e2e-workflows/[workflowId]/route.ts
- FOUND: bigpanda-app/app/api/projects/[projectId]/e2e-workflows/[workflowId]/steps/route.ts
- FOUND: bigpanda-app/app/api/projects/[projectId]/e2e-workflows/[workflowId]/steps/[stepId]/route.ts
- FOUND: bigpanda-app/app/api/projects/[projectId]/focus-areas/route.ts
- FOUND: bigpanda-app/app/api/projects/[projectId]/focus-areas/[id]/route.ts

Commits verified:
- FOUND: 4dc5500 (feat(21-01): add getTeamsTabData query + Teams tab type exports to queries.ts)
- FOUND: ec300e3 (feat(21-01): create CRUD API routes for business-outcomes, e2e-workflows, focus-areas)

## Next Phase Readiness

- Plan 21-02 can proceed: all route files and getTeamsTabData are in place
- Plan 21-03 (Teams tab UI) has all API endpoints it needs for optimistic inline CRUD
- Plan 21-05 (skill context builder) has the getTeamsTabData signature and TeamsTabData type it depends on

---
*Phase: 21-teams-tab-+-architecture-tab*
*Completed: 2026-03-27*
