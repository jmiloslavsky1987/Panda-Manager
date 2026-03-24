---
phase: 06-mcp-integrations
plan: 05
subsystem: api
tags: [anthropic-sdk, mcp, skill-orchestrator, streaming, typescript]

# Dependency graph
requires:
  - phase: 06-03
    provides: MCPServerConfig type in settings-core.ts

provides:
  - SkillOrchestrator.run() accepts optional mcpServers param
  - Non-MCP path preserved exactly for all 5 wired skills
  - MCP path uses beta.messages.stream() with mcp-client-2025-11-20 header
  - Unit tests verifying branch logic

affects:
  - 06-06-PLAN (SKILL-10 customer-project-tracker skill handler — primary consumer of this MCP path)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Structural type alias (StreamLike) to unify MessageStream and BetaMessageStream union type without @ts-ignore"
    - "useMCP branch: (params.mcpServers?.length ?? 0) > 0 — treats [] same as absent"
    - "intentional logging of server count, never names/tokens"

key-files:
  created: []
  modified:
    - bigpanda-app/lib/skill-orchestrator.ts
    - tests/orchestrator-mcp.test.ts

key-decisions:
  - "Use structural StreamLike type alias rather than @ts-ignore to satisfy TS union incompatibility between MessageStream<ParsedT> and BetaMessageStream generics"
  - "Empty mcpServers array treated same as absent — useMCP false in both cases"
  - "countTokens() call stays on non-beta path regardless of MCP mode — correct per plan"

patterns-established:
  - "StreamLike pattern: extract minimal structural interface for SDK stream union types to avoid @ts-ignore"

requirements-completed: [SKILL-10]

# Metrics
duration: 18min
completed: 2026-03-24
---

# Phase 06 Plan 05: Extend SkillOrchestrator with MCP Stream Path Summary

**SkillOrchestrator branches on mcpServers presence: beta.messages.stream() with mcp-client-2025-11-20 header when servers provided, existing messages.stream() path otherwise — all 5 wired skills unaffected**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-24T18:59:12Z
- **Completed:** 2026-03-24T19:16:54Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Added `mcpServers?: MCPServerConfig[]` to `SkillRunParams` interface
- Non-MCP path (mcpServers absent or empty) calls `this.client.messages.stream()` unchanged — all 5 wired skills (weekly-customer-status, meeting-summary, morning-briefing, context-updater, handoff-doc-generator) continue to work with no code changes
- MCP path calls `this.client.beta.messages.stream()` with `mcp-client-2025-11-20` header, maps `mcp_servers` array and `mcp_toolset` tools with optional allowlist filtering
- `stream.on('text', ...)` and `stream.finalMessage()` work identically on both paths via a `StreamLike` structural type alias (avoids @ts-ignore, resolves TypeScript union incompatibility between `MessageStream<ParsedT>` and `BetaMessageStream` generics)
- Activated 3 unit tests — all pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend SkillOrchestrator with optional MCP stream path** - `26d6e73` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `bigpanda-app/lib/skill-orchestrator.ts` - Added MCPServerConfig import, mcpServers param, useMCP branch with beta stream path
- `tests/orchestrator-mcp.test.ts` - Activated 3 unit tests (replaced assert.fail stubs with real assertions)

## Decisions Made
- Used a `StreamLike` structural type alias instead of `as any` or `@ts-ignore` to satisfy TypeScript's inability to call `.on` on the union of `MessageStream<ParsedT>` and `BetaMessageStream`. Both SDK classes structurally implement the same `.on('text', ...)` and `.finalMessage()` signatures — the alias makes this explicit without losing type information.
- `countTokens()` remains on the non-beta path before the MCP branch — intentional per plan (token counting does not require MCP context).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] StreamLike structural type alias to fix TypeScript union error**
- **Found during:** Task 1 (TypeScript compile check)
- **Issue:** The union type `MessageStream<ParsedT> | BetaMessageStream` caused TS2349 "not callable" error on `stream.on('text', ...)` because the generics differ between the two types
- **Fix:** Declared a local `StreamLike` interface with only the methods used (`on('text', ...)` and `finalMessage()`), assigned `stream: StreamLike` so both branches satisfy the type
- **Files modified:** bigpanda-app/lib/skill-orchestrator.ts
- **Verification:** `npx tsc --noEmit` shows no errors in skill-orchestrator.ts
- **Committed in:** 26d6e73 (part of task commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Necessary TypeScript fix. No scope creep — the structural type alias is the idiomatic SDK-compatible solution, preferred over @ts-ignore per plan instructions.

## Issues Encountered
- Git index.lock intermittent issue during commit — resolved by retrying after a brief wait.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- MCP execution engine ready. SKILL-10 (customer-project-tracker) can now be wired by passing `mcpServers` from settings to `SkillOrchestrator.run()`.
- Plan 06-06 (SKILL-10 handler) is the direct consumer.

---
*Phase: 06-mcp-integrations*
*Completed: 2026-03-24*
