# Phase 6: MCP Integrations - Research

**Researched:** 2026-03-24
**Domain:** Anthropic MCP Connector API, remote MCP servers (Glean/Gmail/Slack), SkillOrchestrator extension
**Confidence:** MEDIUM-HIGH (SDK API verified from official docs; MCP server URLs/tools verified; OAuth flow details MEDIUM — token acquisition is runtime user action)

---

## Summary

Phase 6 wires three external MCP servers (Glean, Slack, Gmail) into the existing SkillOrchestrator so skills can read live signals — primarily for the Customer Project Tracker (SKILL-10), which sweeps Gmail and Slack for a customer over the last 7 days and updates the actions table. Two dashboard panels (DASH-04 cross-project Risk Heat Map, DASH-05 Cross-Account Watch List) are also in scope but are pure PostgreSQL aggregation queries — no MCP required for those.

The Anthropic SDK (currently at 0.80.0) supports MCP via `client.beta.messages.stream()` using `mcp_servers` + `tools` parameters and the beta header `mcp-client-2025-11-20`. This is a server-side remote MCP call — Anthropic's infrastructure connects to the MCP server on your behalf, so no separate MCP client process is needed. The SDK streams exactly like a standard call; `mcp_tool_use` and `mcp_tool_result` blocks appear inline in the stream.

MCP server configs (URL + authorization token) are stored as an array in `settings.json` (at `~/.bigpanda-app/settings.json`), extending the existing `AppSettings` interface. API keys live there — acceptable for a single-user local app. The Settings page gains a new "MCP Servers" tab using the existing Radix Tabs pattern. A singleton `MCPClientPool` provides a registry of named configs that `SkillOrchestrator.run()` accepts as an optional parameter.

**Primary recommendation:** Use `client.beta.messages.stream()` with the `mcp-client-2025-11-20` beta header. Extend `SkillOrchestrator.run()` to accept optional `mcpServers` config. Store tokens in `settings.json` under `mcp_servers[]`. The DASH-04/05 panels are purely DB-side — do not conflate them with MCP work.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SKILL-10 | Customer Project Tracker — sweep Gmail + Slack for last 7 days; update actions; sync xlsx; structured report | Glean search tool, Slack search_messages, Gmail MCP tools; streamed via SkillOrchestrator |
| DASH-04 | Cross-project Risk Heat Map — probability x impact matrix across all active accounts | Pure DB aggregation query on risks table; no MCP needed |
| DASH-05 | Cross-Account Watch List — escalated/time-sensitive items across active accounts | Pure DB aggregation query; no MCP needed |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | 0.80.0 (installed) | MCP via `beta.messages.stream()` with `mcp_servers` | Already installed; SDK handles MCP connection lifecycle |
| `settings-core.ts` | project file | Extended `AppSettings` with `mcp_servers[]` | Already in project; worker-safe; server-only wrapper pattern established |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@anthropic-ai/sdk/helpers/beta/mcp` | 0.80.x | TypeScript MCP helpers (stdio/local servers only) | NOT needed — we use remote URL-based MCP, not stdio |
| `@modelcontextprotocol/sdk` | latest | MCP stdio client | NOT needed — remote `mcp_servers` API param replaces this |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `mcp_servers` param (Anthropic handles connection) | `@modelcontextprotocol/sdk` local client | Local client adds process management, MCPClientPool complexity, and requires stdio support. Remote param is simpler and already supported. |
| Settings.json token storage | OS keychain | Keychain is better security but adds platform-specific complexity. Settings.json is acceptable for single-user local app per existing SET-04 decision. |

**Installation:** No new packages required. All work uses existing `@anthropic-ai/sdk` at 0.80.0.

---

## Architecture Patterns

### Recommended Project Structure

```
bigpanda-app/
├── lib/
│   ├── settings-core.ts          # Extend AppSettings with mcp_servers[]
│   ├── settings.ts               # Re-exports (unchanged)
│   ├── skill-orchestrator.ts     # Add mcpServers param to SkillRunParams
│   └── mcp-config.ts             # MCPClientPool — singleton config registry
├── worker/
│   └── jobs/
│       └── customer-project-tracker.ts  # New scheduled handler (SKILL-10)
├── skills/
│   └── customer-project-tracker.md     # SKILL.md for SKILL-10
└── app/
    ├── settings/
    │   └── page.tsx              # Add "MCP Servers" tab
    └── api/
        └── settings/
            └── route.ts          # Extend to read/write mcp_servers
```

### Pattern 1: Remote MCP via `beta.messages.stream()`

**What:** Pass `mcp_servers` and `tools` arrays to the existing stream call. Anthropic's infrastructure connects to the remote MCP server, calls `list_tools`, and injects tool results into the conversation.

**When to use:** Any skill that needs live data from Glean, Gmail, or Slack.

**Example:**
```typescript
// Source: https://platform.claude.com/docs/en/agents-and-tools/mcp-connector
// Replace stream() call in skill-orchestrator.ts

const stream = this.client.beta.messages.stream(
  {
    model: MODEL,
    max_tokens: 8192,
    system: systemPrompt,
    messages,
    mcp_servers: mcpServers.map(s => ({
      type: 'url' as const,
      url: s.url,
      name: s.name,
      authorization_token: s.token,
    })),
    tools: mcpServers.map(s => ({
      type: 'mcp_toolset' as const,
      mcp_server_name: s.name,
      // Allowlist only the tools declared in settings
      ...(s.allowed_tools?.length
        ? {
            default_config: { enabled: false },
            configs: Object.fromEntries(
              s.allowed_tools.map(t => [t, { enabled: true }])
            ),
          }
        : {}),
    })),
  },
  {
    headers: { 'anthropic-beta': 'mcp-client-2025-11-20' },
  }
);
```

**CRITICAL:** When `mcpServers` is empty or undefined, the stream call must fall back to the existing non-MCP path (no `mcp_servers` key, no beta header). The existing `messages.stream()` call must not be changed for skills that don't use MCP.

### Pattern 2: AppSettings Extension

**What:** Add `mcp_servers` array to `AppSettings`. Each entry has name, url, token, and optional allowed_tools.

**Example:**
```typescript
// In settings-core.ts — extend AppSettings interface
export interface MCPServerConfig {
  name: string;           // e.g. "glean", "slack", "gmail"
  url: string;            // e.g. "https://acme-be.glean.com/mcp/default"
  token: string;          // bearer token or OAuth access token
  allowed_tools?: string[]; // optional allowlist; empty = all tools enabled
  enabled: boolean;       // can disable without removing
}

export interface AppSettings {
  workspace_path: string;
  skill_path: string;
  schedule: { ... };
  mcp_servers: MCPServerConfig[];  // NEW — defaults to []
}

export const DEFAULTS: AppSettings = {
  // existing fields unchanged
  mcp_servers: [],
};
```

**writeSettings safety:** The existing `delete safe['api_key']` pattern must NOT delete `mcp_servers` — tokens are intentionally stored there. However, if a future version needs stricter security, tokens could be stored separately.

### Pattern 3: MCPClientPool Singleton

**What:** A lightweight registry that reads `settings.mcp_servers`, indexed by name. Skills call `MCPClientPool.getInstance().getServersForSkill(skillName)` to get the configured servers for that skill.

```typescript
// bigpanda-app/lib/mcp-config.ts
import { readSettings, MCPServerConfig } from './settings-core';

// Skill-to-server mapping: which MCP servers each skill may use
const SKILL_MCP_MAP: Record<string, string[]> = {
  'customer-project-tracker': ['gmail', 'slack'],
  'morning-briefing':         ['glean', 'gmail', 'slack'],
  'context-updater':          ['gmail', 'glean'],
  'weekly-customer-status':   ['glean', 'gmail'],
};

export class MCPClientPool {
  private static instance: MCPClientPool | null = null;
  private constructor() {}

  static getInstance(): MCPClientPool {
    if (!MCPClientPool.instance) MCPClientPool.instance = new MCPClientPool();
    return MCPClientPool.instance;
  }

  async getServersForSkill(skillName: string): Promise<MCPServerConfig[]> {
    const settings = await readSettings();
    const serverNames = SKILL_MCP_MAP[skillName] ?? [];
    return settings.mcp_servers.filter(
      s => s.enabled && serverNames.includes(s.name)
    );
  }
}
```

**ROADMAP note:** REQUIREMENTS.md Out-of-Scope explicitly states "Separate MCP server processes" are out of scope. MCPClientPool is a config registry, NOT a process manager. It does not spawn processes. The Anthropic API handles MCP connectivity.

### Pattern 4: SkillOrchestrator Extension

**What:** Add optional `mcpServers` to `SkillRunParams`. If present and non-empty, use `beta.messages.stream()` with the beta header; otherwise use the existing `messages.stream()` unchanged.

```typescript
export interface SkillRunParams {
  skillName: string;
  projectId: number;
  runId: number;
  input?: Record<string, string>;
  skillsDir?: string;
  mcpServers?: MCPServerConfig[];  // NEW — optional
}
```

Inside `run()`, branch on `params.mcpServers?.length`:

```typescript
// EXISTING path (no MCP)
const stream = this.client.messages.stream({ model, max_tokens, system, messages });

// NEW path (with MCP) — only when mcpServers provided
const stream = this.client.beta.messages.stream(
  { model, max_tokens, system, messages, mcp_servers: [...], tools: [...] },
  { headers: { 'anthropic-beta': 'mcp-client-2025-11-20' } }
);
```

The `stream.on('text', ...)` handler and chunk-writing logic are identical for both paths — no downstream changes needed.

### Pattern 5: Settings UI — MCP Servers Tab

**What:** New "MCP Servers" tab in `app/settings/page.tsx` using existing Radix Tabs pattern. Displays a table of configured servers; allows add/edit/delete via inline form or modal.

**Structure:**
```tsx
// Extends existing Tabs.List in settings/page.tsx
<Tabs.Trigger value="mcp-servers">MCP Servers</Tabs.Trigger>

<Tabs.Content value="mcp-servers">
  {/* Table of configured servers */}
  {/* "Add Server" button → inline form: name, url, token (masked), allowed_tools */}
  {/* Per-row: Enable/Disable toggle, Edit, Delete */}
</Tabs.Content>
```

**Token masking:** Display token as `••••••••[last4]` — never expose full token in UI. Store + retrieve full token via API.

**API route extension:** `app/api/settings/route.ts` already handles `readSettings`/`writeSettings`. The PATCH handler accepts `mcp_servers` array in the body; the existing `writeSettings` merges it. No new route needed.

### Anti-Patterns to Avoid

- **Don't spawn MCP server processes.** The `mcp_servers` API param has Anthropic connect to the remote HTTP endpoint. No `@modelcontextprotocol/sdk` StdioClientTransport needed.
- **Don't share the Anthropic client between MCP and non-MCP calls.** The same singleton client works for both; the difference is which method is called.
- **Don't call `beta.messages.stream()` for all skills.** The beta path should only activate when `mcpServers` are configured. Existing skills must not regress.
- **Don't store tokens in .env or DB.** `settings.json` at `~/.bigpanda-app/settings.json` is the correct location — consistent with existing SET-04 decision.
- **Don't use `mcp-client-2025-04-04`.** That version is deprecated. Use `mcp-client-2025-11-20`.

---

## MCP Server Reference

### Glean MCP Server (HIGH confidence)

| Property | Value |
|----------|-------|
| URL format | `https://{instance}-be.glean.com/mcp/{server-name}` |
| Example | `https://bigpanda-be.glean.com/mcp/default` |
| Auth method | Bearer token (user-scoped Client API token) preferred for non-OAuth clients |
| Auth via Anthropic API | `authorization_token` field in `mcp_servers` entry |
| Required scopes | MCP, AGENT, SEARCH, CHAT, DOCUMENTS, TOOLS, ENTITIES |
| Key tools available | `search` (company-wide), `chat`, `read_document`, `code_search`, `people_search`, `gmail_search` |
| Transport | SSE + Streamable HTTP (both supported) |
| Token acquisition | Glean admin provisions user-scoped token; OAuth DCR for supported clients |

**For Customer Project Tracker:** Use `search` tool with query `"customer:{name} site:{channel}"` or similar. Glean indexes Gmail, Slack, Drive — one server may suffice for multiple data sources if Glean indexes them.

**Source:** [Glean MCP Developer Guide](https://developers.glean.com/guides/mcp), [Glean MCP Admin Setup](https://docs.glean.com/administration/platform/mcp/about)

### Slack MCP Server (HIGH confidence)

| Property | Value |
|----------|-------|
| URL | `https://mcp.slack.com/mcp` |
| Auth method | Confidential OAuth 2.0 (user tokens) |
| Transport | Streamable HTTP only (NOT SSE) |
| Authorization endpoint | `https://slack.com/oauth/v2_user/authorize` |
| Token endpoint | `https://slack.com/api/oauth.v2.user.access` |
| Key tools | `search_messages`, `list_channels`, `get_channel_history`, `get_thread_history`, `post_message` |
| Required scopes | `search:read.public`, `search:read.private`, `channels:history`, `chat:write`, `users:read` |
| Restriction | Apps must be directory-published or internal; unlisted apps blocked |

**For Customer Project Tracker:** Use `search_messages` with query `"customer:{name} after:{7-days-ago}"`. The user must complete the Slack OAuth flow to get a user token before configuring in settings.

**Source:** [Slack MCP Server Docs](https://docs.slack.dev/ai/slack-mcp-server/)

### Gmail MCP Server (MEDIUM confidence)

| Property | Value |
|----------|-------|
| Official Google MCP | Remote MCP at `https://gmail.googleapis.com/mcp` (announced Dec 2025) |
| Auth method | Google OAuth 2.0 |
| Practical alternative | Glean's `gmail_search` tool (if Glean already indexes Gmail) |
| Community servers | Multiple (GongRzhe, freysa, n8n) — vary in stability |

**Recommendation:** For Phase 6, use Glean's `gmail_search` tool for Gmail access rather than a separate Gmail MCP server. Glean already indexes Gmail if the organization has connected it, and a single Glean token covers both search and Gmail access. This avoids the complexity of a separate Gmail OAuth flow.

If Glean does not index Gmail, the official Google MCP (announced December 2025) is the correct fallback — but its exact endpoint and token format need verification against live documentation at implementation time.

**Source:** [Google Cloud Blog MCP Announcement](https://cloud.google.com/blog/products/ai-machine-learning/announcing-official-mcp-support-for-google-services), [Glean Gmail Search Tool](https://docs.glean.com/administration/platform/mcp/about)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP connection lifecycle | Custom HTTP SSE client, reconnect logic | `mcp_servers` param in `beta.messages.stream()` | Anthropic handles connection, `list_tools`, tool execution, and reconnects |
| Tool result injection into conversation | Manual multi-turn loop with `tool_use`/`tool_result` messages | Same — Anthropic handles multi-turn internally when `mcp_servers` used | `mcp_tool_use` and `mcp_tool_result` blocks appear in the single response stream |
| MCP process spawning | Child process manager, stdio pipes | Not needed — all three servers (Glean, Slack, Gmail) have remote HTTP endpoints | REQUIREMENTS.md Out-of-Scope: "Separate MCP server processes" |
| Token storage encryption | Custom encryption layer | `settings.json` at `~/.bigpanda-app/` | Single-user local app; file system permissions are sufficient; established pattern |
| Risk heat map query | Complex client-side aggregation | Drizzle `groupBy` on risks table with `status != 'resolved' AND project archived = false` | Pure SQL; no MCP; no new library needed |

**Key insight:** The Anthropic MCP Connector (`mcp_servers` API param) eliminates the need for an MCP client SDK. The common mistake is reaching for `@modelcontextprotocol/sdk` for remote servers — that package is for stdio/local servers. Remote HTTP MCP servers need only a URL and bearer token in the `mcp_servers` array.

---

## Common Pitfalls

### Pitfall 1: Using Deprecated Beta Header
**What goes wrong:** Code works initially with `mcp-client-2025-04-04` but then breaks — or never works with the new toolset structure — because the v1 API is deprecated.
**Why it happens:** Most Stack Overflow answers and older examples still show `mcp-client-2025-04-04`.
**How to avoid:** Always use `mcp-client-2025-11-20`. In this version, tool configuration lives in the `tools` array as `mcp_toolset` objects, NOT in `mcp_servers[].tool_configuration`.
**Warning signs:** If you see `tool_configuration` in `mcp_servers`, that's the deprecated pattern.

### Pitfall 2: Calling `beta.messages.stream()` for Non-MCP Skills
**What goes wrong:** All skill runs switch to the beta path, causing latency increase and potential instability for skills that don't need MCP.
**Why it happens:** Putting the MCP check in the wrong place or making the beta path the default.
**How to avoid:** Branch explicitly: `if (params.mcpServers?.length) { beta path } else { existing path }`. The existing 5 wired skills must not change behavior.

### Pitfall 3: MCP Server Not Reachable from Anthropic's Infrastructure
**What goes wrong:** `beta.messages.stream()` with `mcp_servers` fails with a connection error even though the token is valid.
**Why it happens:** Some MCP servers require the Anthropic API IP ranges to be allowlisted, or the Slack/Glean MCP servers require specific OAuth scopes or app registration.
**How to avoid:** Test connectivity with `curl` to the MCP server endpoint before wiring into the skill. For Slack, the app must be directory-published. For Glean, the admin must enable MCP servers in the admin console.

### Pitfall 4: Token Acquisition Is a Manual Step
**What goes wrong:** Phase 6 is planned as if token management is automatic, but each MCP server requires the user to manually perform an OAuth flow or request a token from an admin.
**Why it happens:** The settings UI implies "paste token here" but the user hasn't been told where to get the token.
**How to avoid:** In the Settings UI MCP tab, include per-server instructions: where to get the token, what scopes to request, and a validation button that tests the connection.

### Pitfall 5: `mcp_tool_use` Blocks Not Handled in Chunk Streaming
**What goes wrong:** The stream produces `mcp_tool_use` and `mcp_tool_result` content blocks, but the existing `stream.on('text', ...)` handler only processes `text_delta` events — tool use events are silently dropped.
**Why it happens:** The existing orchestrator only listens for text output.
**How to avoid:** For MCP skills, also listen for `content_block_start` events where `block.type === 'mcp_tool_use'` to log tool calls for debugging. The final text answer from Claude is still delivered as `text_delta` events — Claude processes tool results internally before producing the text response.

### Pitfall 6: DASH-04 and DASH-05 Blocked on MCP
**What goes wrong:** Treating the Risk Heat Map and Cross-Account Watch List as dependent on MCP infrastructure, delaying them.
**Why it happens:** All three requirements are in Phase 6, but only SKILL-10 uses MCP.
**How to avoid:** DASH-04 and DASH-05 are pure PostgreSQL aggregation — they can be built in an early wave, independent of MCP configuration. Plan them separately.

### Pitfall 7: Glean URL is Instance-Specific
**What goes wrong:** Hard-coding `bigpanda-be.glean.com` in code rather than making it user-configurable.
**Why it happens:** The Glean URL format is documented but the actual instance name varies per organization.
**How to avoid:** Store the full URL in `settings.json` under `mcp_servers[].url`. The Settings UI prompts the user to enter their instance URL (e.g., `https://bigpanda-be.glean.com/mcp/default`).

---

## Code Examples

### Full SkillOrchestrator MCP Extension

```typescript
// Source: https://platform.claude.com/docs/en/agents-and-tools/mcp-connector (TypeScript example)
// In bigpanda-app/lib/skill-orchestrator.ts

import type { MCPServerConfig } from './settings-core';

// Extended params interface
export interface SkillRunParams {
  skillName: string;
  projectId: number;
  runId: number;
  input?: Record<string, string>;
  skillsDir?: string;
  mcpServers?: MCPServerConfig[];   // NEW
}

// Inside run() method — replace the single stream() call with branching:
const useMCP = (params.mcpServers?.length ?? 0) > 0;

const stream = useMCP
  ? this.client.beta.messages.stream(
      {
        model: MODEL,
        max_tokens: 8192,
        system: systemPrompt,
        messages,
        mcp_servers: params.mcpServers!.map(s => ({
          type: 'url' as const,
          url: s.url,
          name: s.name,
          authorization_token: s.token,
        })),
        tools: params.mcpServers!.map(s => ({
          type: 'mcp_toolset' as const,
          mcp_server_name: s.name,
          ...(s.allowed_tools?.length
            ? {
                default_config: { enabled: false },
                configs: Object.fromEntries(
                  s.allowed_tools.map(t => [t, { enabled: true }])
                ),
              }
            : {}),
        })),
      },
      { headers: { 'anthropic-beta': 'mcp-client-2025-11-20' } }
    )
  : this.client.messages.stream({
      model: MODEL,
      max_tokens: 8192,
      system: systemPrompt,
      messages,
    });

// stream.on('text', ...) handler is identical for both paths
```

### MCPClientPool Usage in Job Handler

```typescript
// In worker/jobs/customer-project-tracker.ts
import { MCPClientPool } from '../../lib/mcp-config';

export default async function customerProjectTrackerJob(job: Job) {
  const mcpServers = await MCPClientPool.getInstance().getServersForSkill(
    'customer-project-tracker'
  );

  // mcpServers is [] if none configured — skill runs but without live data
  await orchestrator.run({
    skillName: 'customer-project-tracker',
    projectId: project.id,
    runId: runRow.id,
    skillsDir: SKILLS_DIR,
    mcpServers,  // pass through to orchestrator
  });
}
```

### AppSettings MCP Extension

```typescript
// Source: existing settings-core.ts pattern + new interface
export interface MCPServerConfig {
  name: string;
  url: string;
  token: string;
  allowed_tools?: string[];
  enabled: boolean;
}

// Add to AppSettings:
mcp_servers: MCPServerConfig[];

// Add to DEFAULTS:
mcp_servers: [],

// writeSettings already deep-merges; no change needed for schedule.
// mcp_servers is replaced wholesale (not merged) — simpler for array management.
```

### DASH-04 Risk Heat Map Query Pattern

```typescript
// Pure Drizzle — no MCP needed
// Groups risks by (probability, impact) across all active (non-archived) projects
const heatMapData = await db
  .select({
    probability: risks.probability,
    impact: risks.impact,
    count: sql<number>`count(*)`,
  })
  .from(risks)
  .innerJoin(projects, eq(risks.project_id, projects.id))
  .where(and(
    ne(projects.status, 'archived'),
    ne(risks.status, 'resolved')
  ))
  .groupBy(risks.probability, risks.impact);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `mcp-client-2025-04-04` with `tool_configuration` inside `mcp_servers` | `mcp-client-2025-11-20` with `tools` array and `mcp_toolset` objects | November 2025 | Tool allowlisting/denylisting is now more flexible; deprecated pattern must not be used |
| Separate `@modelcontextprotocol/sdk` client for remote servers | `mcp_servers` param in Anthropic API (API handles connection) | April 2025 (GA November 2025) | No MCP SDK package needed for remote HTTP servers |
| stdio MCP servers (local processes) | Remote HTTP (Streamable HTTP / SSE) MCP servers | 2025 | Remote servers are the standard; local stdio only for development/testing |

**Deprecated/outdated:**
- `mcp-client-2025-04-04` beta header: replaced by `mcp-client-2025-11-20`
- `tool_configuration.allowed_tools` inside `mcp_servers[]`: replaced by `tools[].configs` with per-tool `enabled` flags
- `@modelcontextprotocol/sdk` StdioClientTransport for remote servers: use `mcp_servers` API param instead

---

## Skill-to-MCP Server Mapping

| Skill | MCP Servers | Key Tools Used | Notes |
|-------|-------------|----------------|-------|
| `customer-project-tracker` (SKILL-10) | `gmail` (via Glean), `slack` | `search` (Glean), `search_messages` (Slack) | Primary Phase 6 skill; sweeps last 7 days |
| `morning-briefing` (SKILL-11, already wired) | `glean` | `search` for calendar context | Optional enhancement — not required for Phase 6 |
| `context-updater` (SKILL-12, already wired) | `gmail` (via Glean) | `gmail_search` | Optional enhancement |
| `weekly-customer-status` (SKILL-03, already wired) | `glean` | `search` | Optional enhancement |

**Phase 6 minimum viable scope:** Only wire SKILL-10 with Gmail + Slack MCP. The other skills are enhancements that can be added without new infrastructure — same MCPClientPool, same Settings UI.

---

## Security Model

This is a local single-user app. The threat model is:

1. **Token at rest:** `settings.json` at `~/.bigpanda-app/settings.json` — same location as other settings. File permissions (600 recommended) are the security boundary.
2. **Token in transit:** Always sent over HTTPS to Anthropic API; Anthropic forwards to MCP server over HTTPS.
3. **Token in UI:** Masked display (`••••••[last4]`) in the Settings MCP tab.
4. **Token leakage via logs:** Ensure logs do not print `authorization_token` values. Orchestrator logs skill name and token count — do not log the MCP server config object directly.
5. **API key vs MCP token distinction:** Anthropic API key is stored separately (outside settings.json per SET-04). MCP tokens ARE stored in settings.json — this is intentional and acceptable for a single-user local app.

**Acceptable risk:** Single-user local app with no external authentication boundary. Storing tokens in settings.json is consistent with the existing decision to store schedule configs and paths there.

---

## Open Questions

1. **Does Glean index Gmail/Slack at BigPanda's instance?**
   - What we know: Glean Remote MCP server has `gmail_search` and search tools; Glean indexes connected data sources.
   - What's unclear: Whether BigPanda's Glean instance has Gmail and Slack connected.
   - Recommendation: The Settings UI should let the user configure separate Gmail and Slack MCP server entries. If Glean indexes them, a single Glean server suffices and the separate entries are left empty.

2. **Does `beta.messages.stream()` with `mcp_servers` work exactly like `messages.stream()`?**
   - What we know: The SDK example in `examples/mcp.ts` uses async iteration (`for await (const event of stream)`). The existing orchestrator uses `stream.on('text', ...)` event listener pattern.
   - What's unclear: Whether `BetaMessageStream` exposes the same `.on('text', ...)` interface as `MessageStream`.
   - Recommendation: During Wave 0/1 testing, verify the event interface. If `.on('text', ...)` is not available on `BetaMessageStream`, switch to `for await (const chunk of stream)` with `chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta'` extraction.

3. **What is the exact Glean instance URL for BigPanda?**
   - What we know: URL format is `https://{instance}-be.glean.com/mcp/default`.
   - What's unclear: The exact instance name.
   - Recommendation: Make this user-configurable in Settings. Do not hard-code it.

4. **Does the Slack MCP server require a published Slack app?**
   - What we know: Slack MCP docs say "Apps must be directory-published or internal; unlisted apps prohibited."
   - What's unclear: Whether an internal app (not published to Slack Marketplace) qualifies.
   - Recommendation: "Internal apps" should work. The user creates a Slack app in their workspace, adds required scopes, and generates a user token. This is documented in Slack's MCP OAuth setup.

---

## Validation Architecture

`nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright (E2E) + Node.js built-in test runner (unit) |
| E2E Config file | `playwright.config.ts` at project root |
| Quick run command | `npx playwright test tests/e2e/phase6.spec.ts --grep "SKILL-10"` |
| Full suite command | `npx playwright test tests/e2e/phase6.spec.ts` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SKILL-10 | Customer Project Tracker runs, produces report, updates actions | E2E (assert-if-present) | `npx playwright test tests/e2e/phase6.spec.ts --grep "SKILL-10"` | Wave 0 |
| SKILL-10 | MCPClientPool returns empty array when no servers configured | unit | `node --test tests/mcp-config.test.ts` | Wave 0 |
| SKILL-10 | SkillOrchestrator uses non-beta path when mcpServers is empty | unit | `node --test tests/orchestrator-mcp.test.ts` | Wave 0 |
| DASH-04 | Risk Heat Map renders with probability/impact grid | E2E | `npx playwright test tests/e2e/phase6.spec.ts --grep "DASH-04"` | Wave 0 |
| DASH-05 | Cross-Account Watch List shows items from multiple projects | E2E | `npx playwright test tests/e2e/phase6.spec.ts --grep "DASH-05"` | Wave 0 |
| MCP-UI | Settings MCP Servers tab renders | E2E | `npx playwright test tests/e2e/phase6.spec.ts --grep "MCP"` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx playwright test tests/e2e/phase6.spec.ts --grep "SKILL-10" --headed=false`
- **Per wave merge:** `npx playwright test tests/e2e/phase6.spec.ts`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/e2e/phase6.spec.ts` — Playwright stubs for SKILL-10, DASH-04, DASH-05, MCP Settings UI (assert-if-present pattern)
- [ ] `tests/mcp-config.test.ts` — Unit tests for MCPClientPool (getServersForSkill with empty settings, with populated settings)
- [ ] `tests/orchestrator-mcp.test.ts` — Unit tests verifying non-beta path taken when mcpServers is empty

---

## Sources

### Primary (HIGH confidence)

- [Anthropic MCP Connector Official Docs](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) — complete API shape, beta header, mcp_servers/tools structure, allowlist/denylist patterns, TypeScript examples
- [Slack MCP Server Docs](https://docs.slack.dev/ai/slack-mcp-server/) — URL, OAuth endpoints, available tools, scopes
- [Glean MCP Developer Guide](https://developers.glean.com/guides/mcp) — URL format, bearer token auth, tools list
- [Glean MCP Admin Setup](https://docs.glean.com/administration/platform/mcp/about) — admin setup, OAuth vs bearer token decision

### Secondary (MEDIUM confidence)

- [Glean Configure MCP Server CLI](https://github.com/gleanwork/configure-mcp-server) — confirms URL format, token vs OAuth usage pattern
- [Anthropic SDK TypeScript GitHub](https://github.com/anthropics/anthropic-sdk-typescript) — `examples/mcp.ts` streaming example (confirms `for await` async iteration pattern)
- [Google MCP Announcement Blog](https://cloud.google.com/blog/products/ai-machine-learning/announcing-official-mcp-support-for-google-services) — Gmail MCP exists officially; endpoint details require runtime verification

### Tertiary (LOW confidence — needs validation at implementation time)

- Gmail MCP exact URL and token format — announced Dec 2025 but endpoint not definitively documented in public sources at time of research
- `BetaMessageStream.on('text', ...)` interface compatibility with `MessageStream.on('text', ...)` — code inspection of SDK source recommended before implementation

---

## Metadata

**Confidence breakdown:**

- Anthropic SDK MCP API shape: HIGH — verified from official docs (mcp-client-2025-11-20, mcp_servers + tools structure, TypeScript types)
- Glean MCP server URL/auth: HIGH — verified from Glean developer docs
- Slack MCP server URL/auth: HIGH — verified from official Slack docs
- Gmail MCP server: MEDIUM — Google announced official support Dec 2025; exact endpoint/token details need runtime verification; Glean gmail_search is a reliable alternative
- Settings extension pattern: HIGH — follows established settings-core.ts pattern exactly
- MCPClientPool architecture: HIGH — design is straightforward singleton config registry
- BetaMessageStream.on() API: MEDIUM — streaming behavior confirmed but exact event emitter API compatibility with existing `.on('text', ...)` pattern needs SDK source verification

**Research date:** 2026-03-24
**Valid until:** 2026-05-01 (MCP connector is in beta and changes actively; re-verify beta header before implementation)
