---
phase: 09-mcp-injection-fix
plan: 02
subsystem: worker
tags: [mcp, bullmq, skill-orchestrator, mcp-client-pool, vitest]

# Dependency graph
requires:
  - phase: 09-01
    provides: RED test scaffold for MCPClientPool injection gap (5 failing tests)
provides:
  - MCPClientPool import + getServersForSkill call in morning-briefing.ts
  - MCPClientPool import + getServersForSkill call in context-updater.ts
  - MCPClientPool import + getServersForSkill call in weekly-customer-status.ts
  - MCPClientPool import + getServersForSkill(skillName) dynamic call in skill-run.ts
  - All 5 mcp-injection.test.ts tests GREEN, full vitest suite 18/18 GREEN
affects: [06-mcp-integrations, skill-orchestrator, worker-jobs]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - bigpanda-app/worker/jobs/morning-briefing.ts
    - bigpanda-app/worker/jobs/context-updater.ts
    - bigpanda-app/worker/jobs/weekly-customer-status.ts
    - bigpanda-app/worker/jobs/skill-run.ts

key-decisions:
  - "Two-line MCP injection pattern (import MCPClientPool + getServersForSkill before orchestrator.run) applied uniformly to all 4 handlers matching customer-project-tracker.ts reference"
  - "skill-run.ts uses dynamic getServersForSkill(skillName) variable — not a hardcoded string — enabling runtime MCP resolution for any skill dispatched on-demand"

patterns-established:
  - "All skill job handlers must call MCPClientPool.getInstance().getServersForSkill(skillName) before orchestrator.run() — getServersForSkill never throws and returns [] for non-MCP skills"

requirements-completed: [SKILL-01, SKILL-03, SKILL-04, SKILL-11, SKILL-12]

# Metrics
duration: 4min
completed: 2026-03-25
---

# Phase 9 Plan 02: MCP Injection Fix Summary

**MCPClientPool injection gap closed in all 4 skill handlers — morning-briefing, context-updater, weekly-customer-status, and skill-run now call getServersForSkill before orchestrator.run(), turning all 5 RED tests GREEN**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-25T04:39:55Z
- **Completed:** 2026-03-25T04:43:30Z
- **Tasks:** 3/3 (Task 3: human-verify checkpoint — approved)
- **Files modified:** 4

## Accomplishments
- Applied two-line MCPClientPool injection to morning-briefing.ts, context-updater.ts, and weekly-customer-status.ts (scheduled handlers)
- Applied dynamic MCPClientPool injection to skill-run.ts generic handler using skillName variable from job.data
- All 5 mcp-injection.test.ts tests GREEN (SKILL-01, SKILL-03, SKILL-04, SKILL-11, SKILL-12)
- Full vitest suite 18/18 passing with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix morning-briefing.ts, context-updater.ts, weekly-customer-status.ts** - `f7ce645` (feat)
2. **Task 2: Fix skill-run.ts generic handler** - `b7152a9` (feat)

3. **Task 3: Human verification checkpoint** — approved (all 5 MCP injection tests GREEN, 18/18 full suite passing)

_Note: Task 3 is a checkpoint:human-verify — no code commit needed._

## Files Created/Modified
- `bigpanda-app/worker/jobs/morning-briefing.ts` - Added MCPClientPool import + getServersForSkill('morning-briefing') before orchestrator.run()
- `bigpanda-app/worker/jobs/context-updater.ts` - Added MCPClientPool import + getServersForSkill('context-updater') before orchestrator.run(); lock behavior unchanged
- `bigpanda-app/worker/jobs/weekly-customer-status.ts` - Added MCPClientPool import + getServersForSkill('weekly-customer-status') before orchestrator.run()
- `bigpanda-app/worker/jobs/skill-run.ts` - Added MCPClientPool import + getServersForSkill(skillName) dynamic call before orchestrator.run()

## Decisions Made
- Two-line injection pattern matches customer-project-tracker.ts reference implementation exactly
- skill-run.ts uses the dynamic `skillName` variable (not a hardcoded string) — critical for on-demand skill dispatch to any skill
- No try/catch around getServersForSkill — it never throws, returns [] for unconfigured skills (non-MCP path remains safe)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 handlers now inject MCP servers correctly — MCP-enabled skills (morning-briefing, context-updater, weekly-customer-status, customer-project-tracker) will receive Glean/Gmail context at runtime
- Non-MCP skills (handoff-doc-generator, etc.) receive mcpServers: [] and continue unaffected
- Human verification approved: all 5 MCP injection tests GREEN, 18/18 full vitest suite passing
- Phase 9 complete — ready to proceed to Phase 10 (FTS Expansion + Code Polish)

---
*Phase: 09-mcp-injection-fix*
*Completed: 2026-03-25*
