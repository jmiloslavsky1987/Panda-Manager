# Phase 84: Discovery Scan Hardening — Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the Scan for Updates feature fully functional end-to-end for Gmail and Slack, with a scan timeframe selector. Gong and Glean are deferred (no admin credentials available for testing). The existing pipeline (adapters → Claude analysis → queue → approve/dismiss) is structurally complete; this phase fixes the credential gaps, reworks the Slack search model, adds a timeframe selector UI, and validates the full flow works locally.

</domain>

<decisions>
## Implementation Decisions

### Slack: Switch from channel-history to workspace search
- Current model: `conversations.history` per explicit channel ID — user must specify channel IDs
- New model: `search.messages` API — searches across all channels the user has access to, no channel config needed
- **Auth change required:** `search.messages` requires a **user token** (`xoxp-`) not a bot token (`xoxb-`)
- User token obtained via Slack OAuth (user scope: `search:read`) — user authorizes via OAuth flow, not bot install
- Store Slack user token in `user_source_tokens` DB table (same pattern as Gmail) keyed to `user_id='default'`
- Settings UI: replace "Bot Token + Channel IDs" form with an "Authorize with Slack" OAuth button (like Gmail)
- Slack app config: add `search:read` user scope, add redirect URI, enable OAuth flow
- Query strategy: search for `projectName` keyword — same `_query` param the adapter already receives
- `search.messages` returns messages + channel context, no need to know channel IDs upfront

### Gmail: Already structurally correct — env var was the only blocker
- `GOOGLE_REDIRECT_URI` was missing from Docker env — fixed in this session (pre-phase)
- Gmail adapter uses `googleapis` auth client with auto-refresh — no changes needed
- Gmail searches by project name + date filter — working pattern

### Scan Timeframe Selector
- Add a "lookback" parameter to the scan: 1 week (default), 2 weeks, 1 month, 3 months
- UI: dropdown in the ScanForUpdatesButton component alongside the source selector
- API: scan route already accepts `since` param (ISO timestamp) — just need to wire the UI to pass it
- Store selected timeframe in scan-config (alongside sources) so it persists per project
- Default: 7 days (current hardcoded behavior)

### Expand entity coverage + context-aware enrichment
Current scanner extracts 6 types (`action`, `risk`, `decision`, `milestone`, `stakeholder`, `history`).
Target: ~12 types, with the scanner loading existing project entities as context so Claude can match against what already exists rather than creating orphan records.

#### New entity types to add

| `suggested_field` | Target table | Notes |
|---|---|---|
| `task` | `tasks` | `title`, `description`, `status='open'` |
| `team_engagement` | `team_engagement_sections` | `name` + `content`. If section name matches existing, update content; else create new |
| `arch_track` | `arch_tracks` | `name` only — suggest new tracks. No FK dependency |
| `arch_node` | `arch_nodes` | `name`, `track_name` (resolved to `track_id` at approve time using existing tracks) |
| `workflow` | `e2eWorkflows` | `team_name`, `workflow_name` |
| `workflow_step` | `workflowSteps` | `label`, `workflow_name` (resolved to `workflow_id` at approve time) |
| `business_outcome` | `business_outcomes` | `outcome` text |
| `integration` | `architecture_integrations` | `name`, `description` |
| Retain `history` | `engagementHistory` | catch-all for anything that doesn't fit above |

#### FK resolution at approve time (critical)
`arch_node` and `workflow_step` have FK dependencies. The `DiscoveryItem.content` field must carry enough info to resolve them:
- Store as JSON string in `content`: `{"name": "Alert Correlation", "track_name": "Alert Intelligence"}`
- At approve (`app/api/discovery/approve/route.ts`), parse the JSON, look up `archTracks` by `(project_id, name)` to get `track_id`, then insert
- If track not found: create the track first, then insert the node
- Same pattern for `workflow_step` → look up `e2eWorkflows` by `(project_id, workflow_name)`

#### Context-aware enrichment — load existing project structure into prompt
The scanner should load existing project entities BEFORE calling Claude, so Claude can:
- Match email content to existing arch tracks/nodes (update status) rather than creating duplicates
- Identify workflow steps that fill gaps in existing workflows
- Recognize team engagement section names that already exist and suggest updates

New entities to load in `app/api/discovery/scan/route.ts` (alongside existing actions/risks/stakeholders):
```ts
const [existingTracks, existingWorkflows, existingEngagementSections] = await Promise.all([
  db.select({ id: archTracks.id, name: archTracks.name }).from(archTracks).where(eq(archTracks.project_id, projectId)),
  db.select({ id: e2eWorkflows.id, team_name: e2eWorkflows.team_name, workflow_name: e2eWorkflows.workflow_name }).from(e2eWorkflows).where(eq(e2eWorkflows.project_id, projectId)),
  db.select({ id: teamEngagementSections.id, name: teamEngagementSections.name }).from(teamEngagementSections).where(eq(teamEngagementSections.project_id, projectId)),
]);
```
Include these in `existingProjectSummary` passed to `runDiscoveryScan()`.

#### Updated Claude system prompt
`DISCOVERY_SYSTEM` must be rewritten to:
1. List all valid `suggested_field` values with a one-line description of each
2. For FK-dependent types (`arch_node`, `workflow_step`), instruct Claude to output structured JSON in `content` with the parent name included
3. Show Claude the existing project structure (tracks, workflows, sections) so it can reference them by name
4. Instruct Claude to prefer enriching/updating existing items over creating new ones when the content maps to something already present

Changes required:
1. `lib/discovery-scanner.ts` — Rewrite `DISCOVERY_SYSTEM`, thread enrichment context into prompt
2. `app/api/discovery/scan/route.ts` — Load arch tracks, workflows, engagement sections; add to `existingProjectSummary`
3. `app/api/discovery/approve/route.ts` — Add `switch` cases for all new types with FK resolution logic
4. `components/ReviewQueue.tsx` — Display all type labels; allow reclassify before approve

### Scan returning 0 immediately — root cause and UX fix
- The scan is not broken — it correctly returns 0 when Gmail finds no emails matching the project name in the last 7 days
- Silent failure looks broken: "no new items found" toast is shown but user has no insight into WHY (no emails matched? wrong project name? sources skipped?)
- Fix: Add per-source status to the SSE `complete` event: `{ type: 'complete', sourceSummary: { gmail: { fetched: N, skipped: false }, slack: { skipped: true, reason: 'no credentials' } } }`
- Show this breakdown in the toast or a post-scan summary panel in the Review Queue

### What NOT to change in this phase
- Gong and Glean adapters: untouched (no credentials to test)
- Per-user credential isolation: deferred to Phase 85
- The `user_id='default'` pattern for token storage is acceptable for now (single active user)

### Slack OAuth App Setup (instructions for user)
1. Go to api.slack.com/apps → select existing app or create new
2. Under "OAuth & Permissions" → "User Token Scopes" → add `search:read`
3. Under "OAuth & Permissions" → "Redirect URLs" → add `http://localhost:3000/api/oauth/slack/callback`
4. Under "Basic Information" → copy Client ID and Client Secret
5. Add to Docker env: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_REDIRECT_URI=http://localhost:3000/api/oauth/slack/callback`
6. User clicks "Authorize with Slack" in Settings → gets `xoxp-` user token stored in DB

</decisions>

<code_context>
## Existing Code Insights

### What exists and works
- `lib/source-adapters/slack-adapter.ts`: Uses `conversations.history` — will be rewritten to use `search.messages` with user token
- `lib/source-adapters/gmail-adapter.ts`: Fully working once `GOOGLE_REDIRECT_URI` env var is set (fixed pre-phase)
- `lib/source-adapters/index.ts`: `resolveAdapter()` factory — needs Slack branch updated to use `UserSourceToken` from DB (same as Gmail path) when no org bot token present
- `lib/discovery-scanner.ts`: `runDiscoveryScan()` — `since` param already threaded through; no changes needed
- `app/api/discovery/scan/route.ts`: Accepts `since` from request body — already there; need to verify it's wired from UI
- `components/ScanForUpdatesButton.tsx`: Source selector dropdown — add timeframe dropdown here
- `app/api/settings/source-credentials/route.ts`: Stores org-level creds — Slack bot token can stay as optional fallback; new Slack OAuth path is separate
- `app/api/oauth/gmail/route.ts` + `callback/route.ts`: Working pattern to copy for Slack OAuth
- `app/api/oauth/gmail/status/route.ts`: Status + disconnect — copy pattern for Slack
- `db/schema.ts`: `user_source_tokens` table already supports any `source` value — Slack tokens fit here with `source: 'slack'`

### New files needed
- `app/api/oauth/slack/route.ts` — initiate Slack OAuth (user scope)
- `app/api/oauth/slack/callback/route.ts` — exchange code for xoxp- token, store in user_source_tokens
- `app/api/oauth/slack/status/route.ts` — GET connected status, DELETE to disconnect

### Settings UI changes
- `app/settings/page.tsx`: Replace Slack bot token + channel ID form with OAuth button (same pattern as Gmail section)
- Add `slackStatus` state (connected bool + email/name hint) fetched from `/api/oauth/slack/status`
- Remove `slackToken`, `slackChannels`, `slackSaving`, `slackSaved` state
- Add `slackDisconnecting` state

### SlackAdapter rewrite
- Constructor takes `UserSourceToken` (same as GmailAdapter)
- `fetchContent(query, since)` calls `search.messages` with `query=projectName` and `oldest` filter
- Endpoint: `GET https://slack.com/api/search.messages?query=<query>&oldest=<unix_ts>&count=20`
- Auth header: `Bearer <xoxp-token>`
- Response: `data.messages.matches[].text` + `data.messages.matches[].channel.name`
- Format: `[Slack #channelName] message text`

### resolveAdapter update
- Slack branch: check `userToken` (DB) first if source==='slack', fall back to org bot token, fall back to MCP
- This means Slack now supports both paths: OAuth user token (new) and bot token (existing/legacy)

### Scan route `since` wiring audit
- Need to verify `app/api/discovery/scan/route.ts` reads `since` from request body and passes to scanner
- If missing, add it — otherwise just wire from UI

### ScanForUpdatesButton timeframe UI
- Add `lookback` state: `'7d' | '14d' | '1m' | '3m'` default `'7d'`
- Convert to `since` ISO date before POST: `new Date(Date.now() - lookbackMs).toISOString()`
- Persist `lookback` in scan-config alongside sources (POST to `/api/discovery/scan-config`)
- Load saved `lookback` from scan-config on mount
- After scan completes, show per-source breakdown so user knows which sources contributed results and which were skipped (credentials missing)

### Review Queue location (confirmed working)
- Already lives at `/customer/{id}/queue` — Admin → Review Queue subtab in WorkspaceTabs.tsx
- `ScanForUpdatesButton` already redirects there on completion
- No routing changes needed — just ensure the queue UI shows the expanded entity types properly

</code_context>

<specifics>
## Specific Implementation Notes

- Slack `search.messages` API docs: `https://api.slack.com/methods/search.messages` — query param is freetext search, `sort=timestamp`, `sort_dir=desc`, `count=20`
- The `oldest` filter isn't a direct param on search.messages — use the query string: append `after:<YYYY-MM-DD>` to the search query (same as Gmail pattern). E.g. query = `"BigPanda" after:2026-04-27`
- Slack date filter in search query format: `after:YYYY-MM-DD`
- Token hint for settings display: show last 6 chars of xoxp- token (same masking as Gmail shows email)
- CSRF state cookie for Slack OAuth: use `oauth_slack_state` cookie name (distinct from `oauth_state` for Gmail and `oauth_calendar_state` for calendar)

</specifics>

<deferred>
## Deferred

- Gong adapter testing — no admin credentials
- Glean adapter testing — no admin credentials
- Per-user credential isolation (each PM has their own Gmail/Slack tokens) — Phase 85
- Scan result quality tuning / prompt improvements — can iterate post-launch
- Scheduled automatic scans — Phase 85 or later

</deferred>

---

*Phase: 84-discovery-scan-hardening*
*Context gathered: 2026-05-04*
