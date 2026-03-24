# Phase 6: MCP Integrations — Context

**Gathered:** 2026-03-24
**Status:** Ready for planning
**Source:** ROADMAP.md + in-conversation research

<domain>
## Phase Boundary

Enable AI skills to call external services (Glean, Slack, Gmail) via the Anthropic MCP protocol. The SkillOrchestrator gains an optional MCP server list; when populated, it switches to `beta.messages.stream()` with `betas: ["mcp-client-2025-11-20"]`. Servers are configured once in Settings → MCP Servers. The Customer Project Tracker skill (SKILL-10) is the primary consumer — it sweeps Gmail + Slack + Glean for the last 7 days, updates the actions table, and syncs to the xlsx tracker.

DASH-04 (Risk Heat Map) and DASH-05 (Cross-Account Watch List) are pure DB queries — no MCP involved. They ship in an early wave.

</domain>

<decisions>
## Implementation Decisions

### Anthropic SDK MCP API
- Beta header: `mcp-client-2025-11-20` (not the deprecated April version)
- Method: `client.beta.messages.stream()` with `mcp_servers` array + `tools` array of `mcp_toolset` objects
- No new packages: `@anthropic-ai/sdk` 0.80.0 (already installed) supports remote MCP natively
- Streaming: `BetaMessageStream` — verify `.on('text', ...)` works same as `MessageStream` before wiring

### MCP Server Config Storage
- Stored in `settings.json` under a new `mcp_servers` key — array of `{ id, name, url, apiKey, enabled, tools? }`
- API keys in settings.json (local file, never committed) — acceptable for single-user local app
- Settings schema extended in `bigpanda-app/lib/settings.ts`

### MCP Server URLs
- **Glean:** `https://{instance}-be.glean.com/mcp/default` — bearer token auth; use `GLEAN_MCP_TOKEN` from settings
- **Slack:** `https://mcp.slack.com/mcp` — OAuth user token (xoxp-...) with scopes: `channels:read, channels:history, users:read, files:read`
- **Gmail:** Use Glean's `gmail_search` tool if Glean indexes Gmail; otherwise defer to Phase 7

### SkillOrchestrator Extension
- Add `mcpServers?: MCPServerConfig[]` optional param to `SkillOrchestrator.run()`
- If populated → use `beta.messages.stream()` with beta header
- If empty (default) → use existing `messages.stream()` unchanged
- All 5 existing wired skills unaffected (no mcpServers param)
- `bigpanda-app/worker/lib/orchestrator.ts`

### Settings UI
- New "MCP Servers" tab/section in `bigpanda-app/app/settings/page.tsx`
- Per-server: Name, URL, API Key (masked), Enabled toggle, Test Connection button
- Test Connection: calls a new `POST /api/settings/mcp-test` endpoint — sends one no-op call to verify auth
- Token acquisition instructions displayed inline per server type

### SKILL-10: Customer Project Tracker
- Extends existing skill handler pattern in `bigpanda-app/worker/jobs/skill-run.ts`
- New SKILL.md at `bigpanda-app/skills/customer-project-tracker.md` (flat file — NOT a subdirectory, consistent with weekly-customer-status.md pattern)
- MCP tools used: Glean search (account-specific queries), Slack channel history, Gmail thread search
- After run: inserts/updates actions rows from structured output, syncs to xlsx
- Run mode: `projectId` param → single account; no `projectId` → all active accounts sequentially
- Output: structured report saved to `outputs` table + shown in Output Library

### DASH-04: Risk Heat Map
- Pure DB query: `SELECT severity, status, COUNT(*) FROM risks WHERE project_id IN (active_ids) GROUP BY severity, status`
- NOTE: risks table has NO probability or impact columns — only `severity` (low/medium/high/critical) and `status`
- Client component on Dashboard — grid with severity on X axis, status on Y axis, cell count as intensity
- Color scale: white (0) → yellow (1-2) → orange (3-5) → red (6+)
- No MCP involved — ships in Wave 1

### DASH-05: Cross-Account Watch List
- Pure DB query: risks with `status='open'` AND `severity IN ('high','critical')`, ordered by created_at DESC
- NOTE: risks table has NO probability, impact, or due_date columns — filter on severity + status only
- Groups by project; shows project chip + risk title + severity badge
- Client component on Dashboard — compact table
- No MCP involved — ships in Wave 1

### What is NOT in scope
- OAuth flow UI (user manually gets tokens from Slack/Glean dashboards and pastes into Settings)
- MCP stdio transport (remote HTTP only — no local MCP server processes)
- Drive MCP integration (deferred to Phase 8)
- Biggy Weekly Briefing or ELT skills (Phase 7)

</decisions>

<specifics>
## Specific Implementation Notes

- `MCPServerConfig` type: `{ id: string; name: string; url: string; apiKey: string; enabled: boolean; allowedTools?: string[] }`
- Settings key: `mcp_servers: MCPServerConfig[]` (default `[]`)
- The SkillOrchestrator reads MCP servers from settings at runtime (not at module load) — consistent with SKILL.md hot-reload pattern
- SKILL-10 prompt must instruct the model to: (1) search Glean for recent customer activity, (2) read Slack channels for the customer, (3) return structured JSON with new/updated actions list
- Risk Heat Map color scale: white (0) → yellow (1-2) → orange (3-5) → red (6+) risks per cell
- Watch List badge: project name chip (matches sidebar color) + risk title + "X days overdue" or "due in X days"

</specifics>

<deferred>
## Deferred Ideas

- Drive MCP for document search
- OAuth token refresh flow (auto-refresh when token expires)
- Per-skill MCP server allowlist (Phase 7+ concern)
- Slack slash command to trigger skills from Slack

</deferred>

---

*Phase: 06-mcp-integrations*
*Context gathered: 2026-03-24*
