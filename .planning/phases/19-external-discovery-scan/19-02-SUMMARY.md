---
phase: 19-external-discovery-scan
plan: "02"
subsystem: discovery-scanner
tags: [mcp, anthropic-beta, sse, discovery, drizzle]
dependency_graph:
  requires: [19-01]
  provides: [runDiscoveryScan, POST /api/discovery/scan]
  affects: [discovery_items table, mcp-config SKILL_MCP_MAP]
tech_stack:
  added: [jsonrepair]
  patterns: [MCP beta API, SSE streaming, dedup-before-insert]
key_files:
  created:
    - bigpanda-app/lib/discovery-scanner.ts
    - bigpanda-app/app/api/discovery/scan/route.ts
  modified:
    - bigpanda-app/lib/mcp-config.ts
    - bigpanda-app/tests/discovery/scan.test.ts
decisions:
  - "Used Anthropic beta.messages.create with mcp_servers per skill-orchestrator.ts pattern — same MCP beta header approach"
  - "Silently skip sources with no matching MCPServerConfig — partial results are valid"
  - "jsonrepair fallback for Claude JSON output (same as 18-06 decision)"
  - "Dedup on dismissed status only (DISC-15): pending/approved items from same source+content are not skipped"
metrics:
  duration: "177 seconds"
  completed_date: "2026-03-26"
  tasks_completed: 2
  files_changed: 4
---

# Phase 19 Plan 02: Discovery Scan Service + SSE Route Summary

**One-liner:** MCP beta fetch from Slack/Gmail/Glean/Gong + Claude analysis producing DiscoveryItem[], persisted via SSE scan endpoint with dismissed-item dedup.

## What Was Built

### Task 1: lib/discovery-scanner.ts (TDD)
Implements `runDiscoveryScan(params)` which:
1. For each requested source, looks up its MCPServerConfig by name — silently skips if not found/disabled
2. Calls `anthropic.beta.messages.create` with `mcp_servers` and `mcp_toolset` tool for the source-specific tool (`search_messages`, `search_emails`, `search_documents`, `get_transcripts`)
3. Collects text from all source responses into `sourceResults`
4. Feeds combined results to Claude streaming analysis call with `DISCOVERY_SYSTEM` prompt
5. Parses accumulated response with `jsonrepair` fallback
6. Returns `DiscoveryItem[]` — `{ source, content, suggested_field, source_excerpt, source_url? }`

Tests: 5/5 GREEN (DISC-05 through DISC-09 including source_excerpt shape assertion).

### Task 2: app/api/discovery/scan/route.ts
SSE endpoint `POST /api/discovery/scan`:
- Body: `{ projectId, sources, since? }` validated via zod
- Generates `scan_id = 'scan-{projectId}-{timestamp}'`
- Fetches project name from DB for use as search query context
- Gets MCP servers via `MCPClientPool.getServersForSkill('discovery-scan')`
- Filters servers to only requested sources
- Streams per-source progress events then calls `runDiscoveryScan`
- For each result: checks dismissed dedup (DISC-15) then inserts to `discovery_items` with `source_excerpt` and `scan_id`
- Final SSE: `{ type: 'complete', itemCount, newItems, skippedDups }`

Also updated `mcp-config.ts` SKILL_MCP_MAP: added `'discovery-scan': ['slack', 'gmail', 'glean', 'gong']`.

## Decisions Made

1. **MCP beta API pattern**: Used `anthropic.beta.messages.create` with `mcp_servers` param and `mcp-client-2025-11-20` beta header — consistent with `skill-orchestrator.ts`. Avoids forking the approach.

2. **Silent skip for missing sources**: If a requested source has no MCPServerConfig or is disabled, `runDiscoveryScan` logs a warning and continues. Partial scan results are valid — no throw.

3. **jsonrepair fallback**: Same decision as 18-06 — Claude occasionally emits malformed JSON on edge cases; `jsonrepair` recovers gracefully.

4. **Dismissed-only dedup**: DISC-15 specifies dismissed items don't reappear. Pending and approved items are not deduplicated — a rescan should be able to produce new pending items even if same content was previously approved.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Anthropic SDK mock was not a proper constructor**
- **Found during:** Task 1 TDD GREEN phase
- **Issue:** `vi.fn().mockImplementation()` for default export produces a function, not a class constructor — `new Anthropic()` fails with "not a constructor"
- **Fix:** Replaced with `class MockAnthropic` inside mock factory, providing proper `beta.messages.create` and `messages.stream` instances
- **Files modified:** `bigpanda-app/tests/discovery/scan.test.ts`
- **Commit:** e363d81 (part of GREEN implementation)

## Self-Check: PASSED

- FOUND: bigpanda-app/lib/discovery-scanner.ts
- FOUND: bigpanda-app/app/api/discovery/scan/route.ts
- Commit e363d81 (feat GREEN): lib/discovery-scanner.ts implementation
- Commit 52e005e (feat Task 2): scan route + mcp-config update
- scan.test.ts 5/5 GREEN confirmed
