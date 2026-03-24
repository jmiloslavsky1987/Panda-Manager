---
phase: 06-mcp-integrations
plan: 03
subsystem: api
tags: [mcp, settings, typescript, singleton, worker]

# Dependency graph
requires:
  - phase: 06-01
    provides: Phase 06 planning context and SKILL-10 requirements
provides:
  - MCPServerConfig interface exported from settings-core.ts
  - AppSettings.mcp_servers field with default []
  - MCPClientPool singleton with getServersForSkill() filtering
  - Worker-safe MCP config registry (no server-only imports)
affects:
  - 06-04 (SkillOrchestrator extension — reads MCPClientPool)
  - 06-05 (SKILL-10 customer-project-tracker — uses getServersForSkill)
  - 06-06 (Settings UI — reads/writes MCPServerConfig[])

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read-at-call-time: settings loaded inside method body, not at module load or getInstance()"
    - "Worker-safe imports: mcp-config.ts imports from settings-core (not settings.ts) to avoid server-only boundary"
    - "Optional settingsPath param: pass override for tests, default SETTINGS_PATH for production"

key-files:
  created:
    - bigpanda-app/lib/mcp-config.ts
  modified:
    - bigpanda-app/lib/settings-core.ts
    - bigpanda-app/lib/settings.ts
    - tests/mcp-config.test.ts

key-decisions:
  - "getServersForSkill accepts optional settingsPath param for testability without mocking the module"
  - "MCPClientPool imports from settings-core, not settings.ts — worker processes cannot import server-only modules"
  - "Double cast (as unknown as Record<string, unknown>) fixes pre-existing TS2352 in writeSettings()"

patterns-established:
  - "Settings read at call time — hot-reload pattern consistent with SKILL.md orchestrator pattern"
  - "Singleton via static instance field + private constructor"

requirements-completed: [SKILL-10]

# Metrics
duration: 12min
completed: 2026-03-24
---

# Phase 06 Plan 03: MCP Config Foundation Summary

**MCPServerConfig type + AppSettings.mcp_servers field in settings-core.ts, MCPClientPool singleton with per-skill enabled-server filtering via call-time settings reads**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-24T18:18:17Z
- **Completed:** 2026-03-24T18:30:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- MCPServerConfig interface with all required fields (id, name, url, apiKey, enabled, allowedTools?) exported from settings-core.ts
- AppSettings.mcp_servers field added with default [] — deep-merges from settings.json at read time
- MCPClientPool singleton created with getServersForSkill() filtering by enabled flag and SKILL_MCP_MAP allowlist
- Unit tests pass: empty settings returns [], disabled/mismatched servers are filtered out

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend settings-core.ts with MCPServerConfig + mcp_servers** - `48985ea` (feat)
2. **Task 2: Create MCPClientPool singleton config registry** - `4f849cc` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `bigpanda-app/lib/settings-core.ts` - Added MCPServerConfig interface, mcp_servers field to AppSettings, DEFAULTS.mcp_servers = [], updated readSettings() merge, fixed pre-existing TS2352 cast
- `bigpanda-app/lib/settings.ts` - Added MCPServerConfig to re-export list
- `bigpanda-app/lib/mcp-config.ts` - New file: MCPClientPool singleton with getServersForSkill(), SKILL_MCP_MAP, worker-safe imports
- `tests/mcp-config.test.ts` - Replaced assert.fail stubs with real test assertions using temp settings files

## Decisions Made
- `getServersForSkill` accepts an optional `settingsPath` parameter for testability — avoids module-level mocking, consistent with how other settings consumers use override paths.
- Import chain: `mcp-config.ts` → `settings-core.ts` (not `settings.ts`) — worker processes cannot import `server-only` modules; this boundary must be maintained for Plans 04 and 05.
- Fixed pre-existing `TS2352` in `writeSettings()` using double cast (`as unknown as Record<string, unknown>`) — TypeScript requires this pattern when `AppSettings` doesn't structurally overlap with `Record<string, unknown>`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing TS2352 type cast in writeSettings()**
- **Found during:** Task 1 (settings-core.ts modification)
- **Issue:** `merged as Record<string, unknown>` was a pre-existing TypeScript error (TS2352) — adding `mcp_servers: MCPServerConfig[]` made the type even more incompatible
- **Fix:** Changed to `merged as unknown as Record<string, unknown>` (the TypeScript-correct pattern for this cast)
- **Files modified:** bigpanda-app/lib/settings-core.ts
- **Verification:** `npx tsc --noEmit` shows no settings-core errors
- **Committed in:** `48985ea` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix resolves pre-existing error that would have become blocking as AppSettings grows. No scope creep.

## Issues Encountered
None beyond the pre-existing TS2352 (auto-fixed above). Other pre-existing errors (ioredis/bullmq version conflict, missing js-yaml types, missing settings route module) are out of scope.

## Next Phase Readiness
- Plan 04 (SkillOrchestrator extension) can import MCPClientPool from `./lib/mcp-config`
- Plan 05 (SKILL-10) can call `MCPClientPool.getInstance().getServersForSkill('customer-project-tracker')`
- Plan 06 (Settings UI) can read/write `AppSettings.mcp_servers` via the existing settings API

---
*Phase: 06-mcp-integrations*
*Completed: 2026-03-24*
