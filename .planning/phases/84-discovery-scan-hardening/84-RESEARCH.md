# Phase 84: Discovery Scan Hardening — Research

**Researched:** 2026-05-04
**Domain:** Slack OAuth, Gmail scan, entity routing, SSE feedback, scan config
**Confidence:** HIGH (all findings verified against live codebase)

## Summary

This phase is almost entirely a codebase modification exercise — not a greenfield build. The pipeline from adapter to queue to approve/dismiss is fully operational. The existing Gmail adapter works correctly; the only Gmail gap was a missing `GOOGLE_REDIRECT_URI` env var (fixed pre-phase). The Slack adapter needs a full rewrite from `conversations.history` (bot token + channel IDs) to `search.messages` (user OAuth token, no channel config needed), plus a new OAuth flow that mirrors the existing Gmail OAuth pattern exactly. Every pattern needed is present in the codebase and just needs to be copied/adapted.

The three other areas — timeframe selector UI, expanded entity types with FK resolution, and per-source SSE status breakdown — are all additive changes with clear insertion points. The planner should treat each as a self-contained task touching known files. No new DB migrations are needed. The `user_source_tokens` table already carries a `UNIQUE (user_id, source)` constraint that supports `onConflictDoUpdate` for Slack the same way Gmail uses it.

**Primary recommendation:** Execute this as 5 focused plans: (1) Slack OAuth infrastructure, (2) SlackAdapter rewrite + resolveAdapter update, (3) ScanForUpdatesButton timeframe UI + scan-config route extension, (4) Expanded entity types + context-aware enrichment (scanner + approve route), (5) Per-source SSE status breakdown + ReviewQueue display.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Slack: Switch to `search.messages` with user OAuth token (`xoxp-`), `search:read` user scope
- Slack user token stored in `user_source_tokens` with `source: 'slack'`, `user_id='default'`
- Settings UI: Replace bot token form with "Authorize with Slack" OAuth button (Gmail pattern)
- `search.messages` query includes project name + `after:YYYY-MM-DD` date filter in query string
- Gmail: No changes needed (fixed pre-phase via `GOOGLE_REDIRECT_URI`)
- Scan timeframe: dropdown in ScanForUpdatesButton, `'7d'|'14d'|'1m'|'3m'`, default `'7d'`
- Timeframe persisted in scan-config alongside sources
- Entity types expanded from 6 to ~12 types per the table in CONTEXT.md decisions
- FK-dependent types (`arch_node`, `workflow_step`) store JSON in `content` field at scan time, resolved at approve time
- Context-aware enrichment: load arch tracks, workflows, engagement sections before Claude call
- Per-source SSE `complete` event: `{ type: 'complete', sourceSummary: { gmail: { fetched: N, skipped: false }, slack: { skipped: true, reason: 'no credentials' } } }`
- CSRF cookie for Slack OAuth: `oauth_slack_state`
- Gong and Glean adapters: untouched
- `user_id='default'` pattern for token storage retained (single user)

### Claude's Discretion
- Exact wording of per-source breakdown display in toast vs summary panel
- Exact approach to `lookback` -> ms conversion helper
- Whether to add `discovery_source` field to new entity inserts (follow existing pattern)

### Deferred Ideas (OUT OF SCOPE)
- Gong adapter testing
- Glean adapter testing
- Per-user credential isolation (Phase 85)
- Scan result quality tuning
- Scheduled automatic scans
</user_constraints>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Next.js | 16 | App framework, API routes, SSE | All routes use App Router |
| Drizzle ORM | current | DB queries + transactions | `db.transaction()` pattern for atomic inserts |
| Zod | current | Request body validation | All route schemas use `.safeParse()` |
| `googleapis` | current | Google OAuth client + Gmail API | Only used in GmailAdapter |
| `@anthropic-ai/sdk` | current | Claude streaming messages | `messages.stream()` + `.on('text')` |
| `jsonrepair` | current | Claude JSON output repair | Already in `discovery-scanner.ts` |
| Sonner | current | Toast notifications | Already used in ScanForUpdatesButton |

### No New Dependencies Required
All capabilities needed for this phase are provided by existing project dependencies. Slack OAuth is plain `fetch()` calls — no Slack SDK needed. The `xoxp-` token is used as a Bearer header in standard HTTP calls.

**Installation:** none required.

## Architecture Patterns

### Existing Patterns to Follow

#### OAuth Flow (Gmail → copy for Slack)
The Gmail OAuth flow is the exact template for Slack:

```
app/api/oauth/gmail/route.ts          → GET: redirect to Google consent
app/api/oauth/gmail/callback/route.ts → GET: exchange code, store in user_source_tokens
app/api/oauth/gmail/status/route.ts   → GET: connected?, DELETE: disconnect
```

New Slack files:
```
app/api/oauth/slack/route.ts
app/api/oauth/slack/callback/route.ts
app/api/oauth/slack/status/route.ts
```

#### Slack OAuth Initiation Pattern
```typescript
// Source: app/api/oauth/gmail/route.ts (verified)
// Copy exactly, substituting:
//   - GOOGLE_CLIENT_ID → SLACK_CLIENT_ID
//   - GOOGLE_CLIENT_SECRET → SLACK_CLIENT_SECRET
//   - GOOGLE_REDIRECT_URI → SLACK_REDIRECT_URI
//   - oauth_state cookie → oauth_slack_state cookie
//   - googleapis auth.generateAuthUrl → manual URL construction:

const state = crypto.randomUUID();
const params = new URLSearchParams({
  client_id: process.env.SLACK_CLIENT_ID!,
  scope: '',           // bot scopes (empty)
  user_scope: 'search:read',
  redirect_uri: process.env.SLACK_REDIRECT_URI!,
  state,
});
const authUrl = `https://slack.com/oauth/v2/authorize?${params}`;
```

Note: Slack OAuth v2 uses `user_scope` for user token scopes, distinct from `scope` (bot scopes).

#### Slack Callback Token Exchange Pattern
```typescript
// Source: Slack OAuth v2 docs / verified pattern
// Slack token exchange endpoint: POST https://slack.com/api/oauth.v2.access
// Response has: authed_user.access_token (xoxp-), authed_user.scope
// No refresh_token for Slack user tokens — they don't expire (unless revoked)
// Store access_token as both access_token AND refresh_token in user_source_tokens
// (refresh_token column is NOT NULL — use access_token value as placeholder)
```

#### Slack search.messages Pattern
```typescript
// Source: https://docs.slack.dev/reference/methods/search.messages (verified 2026-05-04)
// No 'oldest' param — use query modifier: after:YYYY-MM-DD
// Response: data.messages.matches[].text, data.messages.matches[].channel.name, .permalink

const since = new Date(params.since);
const dateStr = `${since.getFullYear()}-${String(since.getMonth()+1).padStart(2,'0')}-${String(since.getDate()).padStart(2,'0')}`;
const searchQuery = `${query} after:${dateStr}`;

const resp = await fetch(
  `https://slack.com/api/search.messages?query=${encodeURIComponent(searchQuery)}&sort=timestamp&sort_dir=desc&count=20`,
  { headers: { Authorization: `Bearer ${this.token.access_token}` } }
);
const data = await resp.json();
// data.messages.matches[].text
// data.messages.matches[].channel.name
// data.messages.matches[].permalink
```

#### resolveAdapter Slack Branch Update
```typescript
// Current: orgCredentials.slack?.token → new SlackAdapter({ token, channels })
// New priority order for Slack:
//   1. userToken (DB, source='slack') → new SlackAdapter(userToken)  [PRIMARY — OAuth path]
//   2. orgCredentials.slack?.token → new SlackAdapter({ token, channels })  [LEGACY bot token]
//   3. MCP fallback
if (source === 'slack') {
  if (userToken) return new SlackAdapter(userToken);  // user OAuth path
  if (orgCredentials.slack?.token) {
    return new SlackAdapter({ token: orgCredentials.slack.token, channels: orgCredentials.slack.channels ?? [] });
  }
}
```

SlackAdapter constructor must accept union type: `UserSourceToken | { token: string; channels: string[] }`.

#### Scan-Config Route Extension (lookback)
```typescript
// Current ProjectScanConfig: { projectId, sources, updatedAt }
// New: { projectId, sources, lookback: '7d'|'14d'|'1m'|'3m', updatedAt }
// PostBodySchema: add z.enum(['7d','14d','1m','3m']).optional()
// GET response: include lookback (default '7d' if absent)
```

#### ScanForUpdatesButton Lookback UI
```typescript
// Add alongside existing sources dropdown:
type Lookback = '7d' | '14d' | '1m' | '3m'
const LOOKBACK_OPTIONS: Array<{ value: Lookback; label: string }> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
  { value: '1m', label: 'Last month' },
  { value: '3m', label: 'Last 3 months' },
]
function lookbackToMs(lb: Lookback): number {
  if (lb === '7d') return 7 * 24 * 60 * 60 * 1000;
  if (lb === '14d') return 14 * 24 * 60 * 60 * 1000;
  if (lb === '1m') return 30 * 24 * 60 * 60 * 1000;
  return 90 * 24 * 60 * 60 * 1000;
}
// POST body to /api/discovery/scan: add since = new Date(Date.now() - lookbackToMs(lookback)).toISOString()
```

#### Per-source SSE sourceSummary Pattern
```typescript
// scan/route.ts: track per-source outcome during scan
const sourceSummary: Record<string, { fetched: number; skipped: boolean; reason?: string }> = {};

// For each source, before calling runDiscoveryScan:
const adapter = resolveAdapter(source, ...);
if (!adapter) {
  sourceSummary[source] = { fetched: 0, skipped: true, reason: 'no credentials' };
} else {
  // after fetchContent:
  sourceSummary[source] = { fetched: resultLength, skipped: false };
}

// In complete event:
sendEvent({ type: 'complete', itemCount, newItems, skippedDups, sourceSummary });
```

Note: `runDiscoveryScan()` currently encapsulates all adapter calls internally. To support per-source summary, the scan route needs to either: (a) move per-source fetch logic up to the route level, or (b) have `runDiscoveryScan()` return `sourceSummary` alongside items. Option (b) is cleaner — extend `DiscoveryScanResult` type.

#### New Entity Types — approve/route.ts switch Cases
```typescript
// For tasks:
case 'task':
  await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(tasks).values({
      project_id: projectId,
      title: item.content,
      description: '',
      status: 'open',
      source: 'discovery',
      discovery_source,
      created_at: createdAt,
    }).returning();
    await tx.insert(auditLog).values({ ... });
  });
  break;

// For arch_node (FK resolution):
case 'arch_node':
  await db.transaction(async (tx) => {
    const { name, track_name } = JSON.parse(item.content);
    let [track] = await tx.select({ id: archTracks.id })
      .from(archTracks)
      .where(and(eq(archTracks.project_id, projectId), eq(archTracks.name, track_name)));
    if (!track) {
      const [newTrack] = await tx.insert(archTracks).values({
        project_id: projectId, name: track_name, display_order: 0,
      }).returning();
      track = newTrack;
    }
    await tx.insert(archNodes).values({
      project_id: projectId,
      track_id: track.id,
      name,
      display_order: 999,
      node_type: 'sub-capability',
      source_trace: 'discovery',
    });
  });
  break;

// For workflow_step (FK resolution):
case 'workflow_step':
  await db.transaction(async (tx) => {
    const { label, workflow_name } = JSON.parse(item.content);
    let [workflow] = await tx.select({ id: e2eWorkflows.id })
      .from(e2eWorkflows)
      .where(and(eq(e2eWorkflows.project_id, projectId), eq(e2eWorkflows.workflow_name, workflow_name)));
    if (!workflow) {
      const [newWf] = await tx.insert(e2eWorkflows).values({
        project_id: projectId, team_name: 'Unknown', workflow_name,
        source: 'discovery',
      }).returning();
      workflow = newWf;
    }
    await tx.insert(workflowSteps).values({
      workflow_id: workflow.id,
      label,
      position: 0,
      discovery_source,
    });
  });
  break;
```

#### team_engagement_sections upsert logic
```typescript
case 'team_engagement':
  const { name, content: sectionContent } = JSON.parse(item.content);
  const [existing] = await db.select({ id: teamEngagementSections.id })
    .from(teamEngagementSections)
    .where(and(eq(teamEngagementSections.project_id, projectId), eq(teamEngagementSections.name, name)));
  if (existing) {
    await db.update(teamEngagementSections)
      .set({ content: sectionContent, updated_at: new Date() })
      .where(eq(teamEngagementSections.id, existing.id));
  } else {
    await db.insert(teamEngagementSections).values({
      project_id: projectId, name, content: sectionContent, display_order: 0,
    });
  }
  break;
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slack date filtering | Custom timestamp range param | `after:YYYY-MM-DD` in query string | `search.messages` has no `oldest` param — docs confirmed |
| Slack token refresh | Refresh flow | None needed | Slack user tokens don't expire; store once |
| DB conflict handling | Manual check + insert | `onConflictDoUpdate` with `[user_id, source]` target | Unique constraint already exists in migrations |
| JSON repair for Claude | Custom parser | `jsonrepair` (already in discovery-scanner.ts) | Handles truncated/malformed JSON from streaming |
| CSRF protection | Custom token system | `crypto.randomUUID()` + HttpOnly cookie | Gmail pattern already proven; copy exactly |

## Common Pitfalls

### Pitfall 1: Slack OAuth v2 `user_scope` vs `scope`
**What goes wrong:** Using `scope=search:read` instead of `user_scope=search:read` results in a bot token scope, not a user token scope. The response will return a bot token without `xoxp-` prefix.
**Why it happens:** Slack OAuth v2 has separate `scope` (bot) and `user_scope` (user) parameters.
**How to avoid:** Use `user_scope` in the authorization URL. Verify the callback response contains `authed_user.access_token` (not top-level `access_token`).
**Warning signs:** Token starts with `xoxb-` instead of `xoxp-`; `search.messages` returns `missing_scope`.

### Pitfall 2: Slack refresh_token NOT NULL constraint
**What goes wrong:** `user_source_tokens.refresh_token` is `NOT NULL` in schema. Slack user tokens have no refresh_token concept.
**Why it happens:** Schema designed for Google OAuth which provides refresh tokens.
**How to avoid:** Store the `access_token` value in both `access_token` and `refresh_token` columns. The `refresh_token` column is a VARCHAR, no format constraint.

### Pitfall 3: arch_nodes unique index violation on approve
**What goes wrong:** `arch_nodes_project_track_name_idx` on `(project_id, track_id, name)` — approving an `arch_node` for an already-existing node name + track throws unique violation.
**Why it happens:** The unique constraint prevents duplicate sub-capability nodes.
**How to avoid:** Use `onConflictDoNothing()` or check for existence before insert in the approve route's `arch_node` case. Or use `onConflictDoUpdate` to update `notes`/`status` if already present.

### Pitfall 4: tasks.status is plain text, not an enum
**What goes wrong:** Using an incorrect status enum value like `'open'` when inserting tasks.
**Why it happens:** `tasks.status` is `text` (default `'todo'`), not a pgEnum. Per STATE.md note [82-01]: "tasks table has no external_id and status is plain text."
**How to avoid:** Use `'todo'` as the default status for discovery-created tasks, or `'open'` if that's the desired initial state. Both are valid since it's plain text.
**Warning signs:** Insert succeeds (no enum violation) but filtering by status fails downstream.

### Pitfall 5: runDiscoveryScan() returns items but loses per-source metadata
**What goes wrong:** To generate `sourceSummary` in the `complete` SSE event, the scan route needs to know how many items each source fetched and whether each was skipped. Currently `runDiscoveryScan()` internally iterates sources and returns only `DiscoveryItem[]`.
**Why it happens:** The scanner abstraction was designed before per-source SSE feedback was a requirement.
**How to avoid:** Extend `runDiscoveryScan()` return type to `{ items: DiscoveryItem[]; sourceSummary: Record<string, {...}> }` rather than moving adapter logic to the route handler.

### Pitfall 6: tasks table has no `discovery_source` column
**What goes wrong:** Attempting to insert `discovery_source` into `tasks` will fail — schema does not include this column on `tasks`.
**Why it happens:** `discovery_source` column was added selectively to certain tables. Verify schema before inserting.
**How to avoid:** Check schema for each new entity type before writing insert values. `tasks` has `source` text column but no `discovery_source`. Use `source: 'discovery'` and omit `discovery_source`.

### Pitfall 7: archNodes insert requires track_id (integer), not track_name
**What goes wrong:** `archNodes.track_id` is a NOT NULL FK. Claude's output carries `track_name` (string), not the numeric `track_id`.
**Why it happens:** FK resolution must happen at approve time, not scan time.
**How to avoid:** At approve time, query `archTracks` by `(project_id, name)` to get `track_id`. If not found, create the track first. This is the explicitly decided pattern from CONTEXT.md.

## Code Examples

Verified patterns from live codebase:

### Gmail OAuth initiation (source: `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/oauth/gmail/route.ts`)
```typescript
const state = crypto.randomUUID();
const response = NextResponse.redirect(authUrl, { status: 302 });
response.cookies.set('oauth_state', state, {
  httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600,
});
```

### onConflictDoUpdate for token upsert (source: gmail callback route — verified)
```typescript
await db.insert(userSourceTokens)
  .values({ user_id: 'default', source: 'slack', access_token: token, refresh_token: token, ... })
  .onConflictDoUpdate({
    target: [userSourceTokens.user_id, userSourceTokens.source],
    set: { access_token: token, refresh_token: token, updated_at: new Date() },
  });
```

### Scan route existingProjectSummary construction (source: `app/api/discovery/scan/route.ts` lines 126-145)
```typescript
const [existingActions, existingRisks, existingStakeholders] = await Promise.all([...]);
// extend with:
const [existingTracks, existingWorkflows, existingEngagementSections] = await Promise.all([
  db.select({ id: archTracks.id, name: archTracks.name }).from(archTracks).where(eq(archTracks.project_id, projectId)),
  db.select({ id: e2eWorkflows.id, team_name: e2eWorkflows.team_name, workflow_name: e2eWorkflows.workflow_name }).from(e2eWorkflows).where(eq(e2eWorkflows.project_id, projectId)),
  db.select({ id: teamEngagementSections.id, name: teamEngagementSections.name }).from(teamEngagementSections).where(eq(teamEngagementSections.project_id, projectId)),
]);
```

### Slack search.messages fetch (verified: docs.slack.dev/reference/methods/search.messages)
```typescript
const resp = await fetch(
  `https://slack.com/api/search.messages?` + new URLSearchParams({
    query: `${projectName} after:${dateStr}`,
    sort: 'timestamp',
    sort_dir: 'desc',
    count: '20',
  }),
  { headers: { Authorization: `Bearer ${this.token}` } }
);
const data = await resp.json() as {
  ok: boolean;
  messages?: {
    matches: Array<{ text: string; channel: { name: string }; permalink: string }>;
  };
};
```

### SSE sourceSummary extended return (new pattern)
```typescript
// lib/discovery-scanner.ts — extend return type
export interface DiscoveryScanResult {
  items: DiscoveryItem[];
  sourceSummary: Record<string, { fetched: number; skipped: boolean; reason?: string }>;
}
// scan/route.ts complete event:
sendEvent({ type: 'complete', itemCount, newItems, skippedDups, sourceSummary: result.sourceSummary });
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts) |
| Config file | vitest.config.ts |
| Quick run command | `cd /Users/jmiloslavsky/Documents/Panda-Manager && npx vitest run tests/discovery/` |
| Full suite command | `cd /Users/jmiloslavsky/Documents/Panda-Manager && npx vitest run` |

### Phase Requirements → Test Map

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| Slack OAuth routes initiate + callback + status | unit | `npx vitest run tests/discovery/` | Wave 0 gap |
| SlackAdapter search.messages with user token | unit | `npx vitest run tests/discovery/` | Wave 0 gap |
| resolveAdapter uses userToken for Slack before org creds | unit | `npx vitest run lib/__tests__/` | Wave 0 gap |
| scan-config GET/POST includes lookback field | unit | `npx vitest run tests/discovery/` | Wave 0 gap |
| ScanForUpdatesButton sends `since` in scan POST body | component | manual browser verification | Wave 0 gap |
| approve route handles task/arch_node/workflow_step/team_engagement | unit | `npx vitest run tests/discovery/approve.test.ts` | Needs extension (file exists) |
| runDiscoveryScan returns sourceSummary | unit | `npx vitest run tests/discovery/scan.test.ts` | Needs extension (file exists) |
| complete SSE event includes sourceSummary | integration | manual SSE stream inspection | Wave 0 gap |
| arch_node approve resolves track FK correctly | unit | `npx vitest run tests/discovery/approve.test.ts` | Needs extension (file exists) |
| workflow_step approve resolves workflow FK correctly | unit | `npx vitest run tests/discovery/approve.test.ts` | Needs extension (file exists) |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/discovery/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/discovery/slack-oauth.test.ts` — covers Slack OAuth route behavior (initiate, callback, status)
- [ ] `lib/__tests__/slack-adapter.test.ts` — covers new search.messages based SlackAdapter
- [ ] `tests/discovery/scan-config.test.ts` — covers lookback field in GET/POST
- [ ] Extensions to `tests/discovery/approve.test.ts` — task, arch_node, workflow_step, team_engagement, business_outcome cases
- [ ] Extensions to `tests/discovery/scan.test.ts` — sourceSummary in return value

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Slack bot token + channel IDs | Slack user OAuth token (xoxp-) | No channel config required; searches workspace-wide |
| `conversations.history` (per channel) | `search.messages` (full workspace) | Broader discovery; finds relevant messages without knowing channels |
| 6 entity types in scanner | ~12 entity types | Better coverage of project structure |
| No project context in Claude prompt | Load existing tracks/workflows/sections before call | Reduces orphan records; Claude can suggest updates not just creates |
| Silent "0 items" feedback | Per-source SSE breakdown | User understands WHY scan returned 0 (no creds? no matches?) |

## Open Questions

1. **Slack app — bot scopes required?**
   - What we know: `user_scope: search:read` is required for the user token. The CONTEXT.md instructions say to leave `scope` empty.
   - What's unclear: Whether Slack OAuth v2 requires at least one bot scope even if only user token is needed.
   - Recommendation: In the authorize URL, set `scope=''` (empty bot scopes) and `user_scope=search:read`. Slack allows this combination.

2. **`discovery_source` on new tables**
   - What we know: Not all tables have a `discovery_source` column (e.g., `tasks`). Tables like `actions`, `risks`, `stakeholders`, `e2eWorkflows` do have it.
   - What's unclear: Whether `teamEngagementSections`, `archTracks`, `archNodes`, `workflowSteps`, `businessOutcomes` have it.
   - Recommendation: Check schema per-table before insert. For tables without `discovery_source`, use only `source: 'discovery'` and omit the field.

3. **`businessOutcomes` required fields**
   - What we know: Schema has `title` (NOT NULL) and `track` (NOT NULL).
   - What's unclear: What value to use for `track` when Claude suggests a business_outcome without explicit track context.
   - Recommendation: Default to `'discovery'` or `'general'` for the `track` field when not inferrable from content.

## Sources

### Primary (HIGH confidence)
- Live codebase read — `lib/source-adapters/slack-adapter.ts`, `gmail-adapter.ts`, `index.ts` — full file review
- Live codebase read — `lib/discovery-scanner.ts` — full file review
- Live codebase read — `app/api/discovery/scan/route.ts`, `approve/route.ts`, `scan-config/route.ts` — full file review
- Live codebase read — `app/api/oauth/gmail/route.ts`, `callback/route.ts`, `status/route.ts` — full file review
- Live codebase read — `db/schema.ts` — all relevant table definitions
- Live codebase read — `components/ScanForUpdatesButton.tsx`, `ReviewQueue.tsx`, `QueueItemRow.tsx` — full file review
- Live migration — `db/migrations/0001_initial.sql` — UNIQUE constraint on `user_source_tokens(user_id, source)` confirmed

### Secondary (MEDIUM confidence)
- `https://docs.slack.dev/reference/methods/search.messages` — `search.messages` API reference, fetched 2026-05-04
  - Confirmed: no `oldest` param; `after:YYYY-MM-DD` query syntax is the date filter
  - Confirmed: `user_scope: search:read` required; user token authentication
  - Confirmed: response shape `messages.matches[].text/.channel.name/.permalink`
  - Note: method is marked "legacy" but remains the standard for user-token workspace search

### Tertiary (LOW confidence)
- Slack OAuth v2 `user_scope` vs `scope` behavior — based on known Slack OAuth patterns; should be verified when creating the Slack app configuration

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all from live codebase review
- Architecture patterns: HIGH — all patterns verified in live files; Slack API verified at docs.slack.dev
- Pitfalls: HIGH — derived from direct schema inspection and STATE.md carry-forward notes
- Slack OAuth v2 user_scope detail: MEDIUM — verified against docs.slack.dev but Slack app config not yet tested

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (stable APIs, but Slack docs may evolve)
