---
phase: 82-chat-write-operations-tool-use-mutations-for-actions-milestones-risks-teams-and-architecture-nodes-with-confirmation-ux
plan: "01"
subsystem: api
tags: [vercel-ai-sdk, drizzle-orm, zod, tool-use, needsApproval, chat, crud]

# Dependency graph
requires:
  - phase: 82-00
    provides: Wave 0 RED test scaffolds (chat-tools.test.ts), arch-nodes POST route, arch-nodes PATCH extension
provides:
  - 15 write tool factories across 5 entities (actions, milestones, risks, stakeholders, tasks)
  - allWriteTools(projectId) aggregator function in tools/index.ts
  - needsApproval: true on every tool — no mutation executes without user confirmation
affects:
  - 82-02 (MutationConfirmCard component)
  - 82-03 (chat route.ts tools integration + ChatPanel rendering)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tool factory pattern: (projectId: number) => tool({ needsApproval: true, execute: async () => { dynamic import('@/db'); ownership check; DB call } })"
    - "Dynamic imports inside execute() for Docker build compatibility — no module-load-time DB initialization"
    - "projectId injected via closure — never in inputSchema (cross-project mutation prevention)"
    - "Ownership verification pattern: select project_id, check === projectId, throw if mismatch"

key-files:
  created:
    - app/api/projects/[projectId]/chat/tools/actions-tools.ts
    - app/api/projects/[projectId]/chat/tools/milestones-tools.ts
    - app/api/projects/[projectId]/chat/tools/risks-tools.ts
    - app/api/projects/[projectId]/chat/tools/stakeholders-tools.ts
    - app/api/projects/[projectId]/chat/tools/tasks-tools.ts
    - app/api/projects/[projectId]/chat/tools/index.ts
  modified: []

key-decisions:
  - "actionStatusEnum in DB is 'open'|'in_progress'|'completed'|'cancelled' — plan had wrong values 'closed'|'overdue'; corrected to match actual schema"
  - "Stakeholders table has no external_id column — only source: 'chat' injected on insert"
  - "Tasks table has no external_id column; status is plain text (not enum) — z.string().optional() used"
  - "All update/delete tools verify project ownership before mutation (select project_id, compare to closure value)"

patterns-established:
  - "Tool factory pattern: export const createXxxTool = (projectId: number) => tool({ ... }) — all 15 tools follow this"
  - "Dynamic imports inside execute() body — await import('@/db'), await import('@/db/schema'), await import('drizzle-orm')"
  - "allWriteTools(projectId) aggregator in index.ts maps snake_case tool names to factory return values"

requirements-completed: []

# Metrics
duration: 15min
completed: 2026-04-29
---

# Phase 82 Plan 01: Chat Write Tools — Actions, Milestones, Risks, Stakeholders, Tasks Summary

**15 Vercel AI SDK write tool factories (create/update/delete) for 5 project entities, all with needsApproval: true and direct Drizzle DB calls via dynamic imports**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-29T18:50:02Z
- **Completed:** 2026-04-29T19:05:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created 6 tool files (5 entity files + 1 index aggregator) covering 15 write tools
- All tools use `needsApproval: true` — the SDK gates execution on user confirmation before any DB write
- `allWriteTools(projectId)` aggregator ready for wiring into the chat `streamText` call in plan 82-03
- All 4 `chat-tools.test.ts` tests GREEN; production build clean

## Task Commits

1. **Task 1: Actions + Milestones + Risks tools** - `35d463b5` (feat)
2. **Task 2: Stakeholders + Tasks tools** - `9a1fcb26` (feat)
3. **Auto-fix: actionStatusEnum correction** - `d085c3a8` (fix)

## Files Created/Modified
- `app/api/projects/[projectId]/chat/tools/actions-tools.ts` — createActionTool, updateActionTool, deleteActionTool
- `app/api/projects/[projectId]/chat/tools/milestones-tools.ts` — createMilestoneTool, updateMilestoneTool, deleteMilestoneTool
- `app/api/projects/[projectId]/chat/tools/risks-tools.ts` — createRiskTool, updateRiskTool, deleteRiskTool
- `app/api/projects/[projectId]/chat/tools/stakeholders-tools.ts` — createStakeholderTool, updateStakeholderTool, deleteStakeholderTool
- `app/api/projects/[projectId]/chat/tools/tasks-tools.ts` — createTaskTool, updateTaskTool, deleteTaskTool
- `app/api/projects/[projectId]/chat/tools/index.ts` — allWriteTools(projectId) aggregator + named re-exports

## Decisions Made
- Plan specified action status enum as `'open'|'in_progress'|'closed'|'overdue'` but the actual `actionStatusEnum` in DB schema is `'open'|'in_progress'|'completed'|'cancelled'` — used correct DB values
- Stakeholders and tasks have no `external_id` column — external_id generation skipped for those two entities
- Tasks `status` is `text` (not a pg enum) — `z.string().optional()` used instead of z.enum()

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed actionStatusEnum values to match DB schema**
- **Found during:** Build verification after Task 2
- **Issue:** Plan's interfaces block specified `'closed'|'overdue'` as valid action status values, but the actual `actionStatusEnum` in `db/schema.ts` uses `'completed'|'cancelled'`. TypeScript build failed with type incompatibility error.
- **Fix:** Updated both `createActionTool` and `updateActionTool` Zod enums to use `'open'|'in_progress'|'completed'|'cancelled'`
- **Files modified:** `app/api/projects/[projectId]/chat/tools/actions-tools.ts`
- **Verification:** `npm run build` passed cleanly after fix
- **Committed in:** `d085c3a8`

---

**Total deviations:** 1 auto-fixed (Rule 1 - type/enum mismatch)
**Impact on plan:** Necessary correctness fix — wrong enum values would cause runtime DB errors on create/update. No scope creep.

## Issues Encountered
- Pre-existing `chat-route.test.ts` failures (missing `requireProjectRole` mock) and `mutation-confirm-card.test.tsx` failures (component not yet built) are Wave 0 RED stubs — not caused by this plan's changes.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `allWriteTools(projectId)` is ready to be wired into `streamText` in `app/api/projects/[projectId]/chat/route.ts` (plan 82-03)
- `MutationConfirmCard` component needed next (plan 82-02) to render confirmation cards for `approval-requested` tool parts
- Teams and Architecture tools (plan 82-05/82-06) will follow same factory pattern established here

## Self-Check: PASSED

- FOUND: app/api/projects/[projectId]/chat/tools/actions-tools.ts
- FOUND: app/api/projects/[projectId]/chat/tools/milestones-tools.ts
- FOUND: app/api/projects/[projectId]/chat/tools/risks-tools.ts
- FOUND: app/api/projects/[projectId]/chat/tools/stakeholders-tools.ts
- FOUND: app/api/projects/[projectId]/chat/tools/tasks-tools.ts
- FOUND: app/api/projects/[projectId]/chat/tools/index.ts
- FOUND commit: 35d463b5 (Task 1 — actions/milestones/risks)
- FOUND commit: 9a1fcb26 (Task 2 — stakeholders/tasks/index)
- FOUND commit: d085c3a8 (fix — actionStatusEnum correction)
- All 4 chat-tools.test.ts tests GREEN
- Production build clean

---
*Phase: 82-chat-write-operations-tool-use-mutations-for-actions-milestones-risks-teams-and-architecture-nodes-with-confirmation-ux*
*Completed: 2026-04-29*
