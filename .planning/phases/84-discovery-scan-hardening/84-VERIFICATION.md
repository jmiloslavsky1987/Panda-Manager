---
phase: 84-discovery-scan-hardening
verified: 2026-05-04T08:25:00Z
status: human_needed
score: 33/34 must-haves verified
re_verification: false
human_verification:
  - test: "Navigate to http://localhost:3000/settings"
    expected: "Slack section shows 'Authorize with Slack' button (not a bot token form). Gmail section unchanged."
    why_human: "Visual layout and OAuth button rendering cannot be verified programmatically."
  - test: "Click 'Scan for Updates' on any project workspace"
    expected: "Dropdown panel shows source checkboxes AND a 'Timeframe' selector with 4 options (Last 7 days / Last 14 days / Last month / Last 3 months)."
    why_human: "UI rendering of the lookback dropdown requires browser interaction."
  - test: "Run a scan and observe completion toast"
    expected: "Toast shows per-source breakdown: e.g. 'Slack: no credentials · Gmail: 3 messages' as the toast description."
    why_human: "Sonner toast with description field requires browser to verify."
  - test: "Inspect ReviewQueue items with new entity types (task, arch_node, etc.)"
    expected: "Type badges display human-readable labels: 'Task', 'Arch Node', 'Business Outcome', etc."
    why_human: "Badge rendering requires visual inspection in browser."
---

# Phase 84: Discovery Scan Hardening Verification Report

**Phase Goal:** Make the Scan for Updates feature fully functional end-to-end for Gmail and Slack, with a scan timeframe selector, expanded entity coverage (~12 types vs 6), context-aware enrichment, and per-source SSE feedback.
**Verified:** 2026-05-04T08:25:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can click 'Authorize with Slack' in Settings and be redirected to Slack consent | ✓ VERIFIED | `app/api/oauth/slack/route.ts` builds OAuth v2 URL with `user_scope=search:read`, CSRF cookie set; `app/settings/page.tsx` has `handleConnectSlack` calling `/api/oauth/slack` |
| 2 | After granting consent, xoxp- token is stored in user_source_tokens | ✓ VERIFIED | `callback/route.ts` validates `token.startsWith('xoxp-')`, upserts via `onConflictDoUpdate` on `[user_id, source]` |
| 3 | Settings page shows Slack connected status with token hint | ✓ VERIFIED | `settings/page.tsx` renders `slackStatus.hint` as `...{hint}`; GET `/api/oauth/slack/status` returns last 6 chars of access_token |
| 4 | User can disconnect Slack from Settings | ✓ VERIFIED | `handleDisconnectSlack` calls DELETE `/api/oauth/slack/status`; route deletes row from user_source_tokens |
| 5 | Slack bot token form is removed from Settings | ✓ VERIFIED | No `slackToken` or `slackChannels` state variables in `settings/page.tsx` |
| 6 | SlackAdapter uses search.messages API with xoxp- user token | ✓ VERIFIED | `slack-adapter.ts` `_fetchOAuth()` calls `https://slack.com/api/search.messages` with `Authorization: Bearer ${this.token}` |
| 7 | Query includes projectName + after:YYYY-MM-DD date filter | ✓ VERIFIED | `searchQuery = \`${query} after:${dateStr}\`` where dateStr is UTC-formatted from since |
| 8 | Response formatted as [Slack #channelName] messageText per match | ✓ VERIFIED | `matches.map(m => \`[Slack #${m.channel.name}] ${m.text}\`)` |
| 9 | resolveAdapter checks for userToken (DB) before org bot token for Slack | ✓ VERIFIED | `index.ts` priority: `if (source === 'slack' && userToken && userToken.source === 'slack')` first, then org bot token |
| 10 | Legacy bot token path still works as fallback | ✓ VERIFIED | `_fetchLegacy()` in slack-adapter.ts preserves conversations.history logic; resolveAdapter falls through to `{ token, channels }` path |
| 11 | ScanForUpdatesButton shows a lookback dropdown (Last 7 days / 14 days / 1 month / 3 months) | ? NEEDS HUMAN | Code exists: `LOOKBACK_OPTIONS` array, `<select>` with 4 options rendered in dropdown panel; visual confirmation needed |
| 12 | Selected lookback converted to since ISO timestamp and sent in scan POST body | ✓ VERIFIED | `since = new Date(Date.now() - lookbackToMs(lookback)).toISOString()` → `JSON.stringify({ projectId, sources, since })` |
| 13 | Lookback persists in scan-config alongside sources | ✓ VERIFIED | `POST /api/discovery/scan-config` saves `lookback` field; scan-config route stores `lookback: lookback ?? '7d'` |
| 14 | Saved lookback loaded from config on mount | ✓ VERIFIED | `loadConfig()` reads `data.lookback` and calls `setLookback(data.lookback)` |
| 15 | Claude can extract 14 entity types from discovery scan content | ✓ VERIFIED | `DISCOVERY_SYSTEM_TEMPLATE` lists 14 valid `suggested_field` values (6 original + 8 new) |
| 16 | Claude receives existing project tracks, workflows, and engagement sections as context | ✓ VERIFIED | `scan/route.ts` queries `archTracks`, `e2eWorkflows`, `teamEngagementSections` and passes as `existingStructure` to `runDiscoveryScan()` |
| 17 | Approving an arch_node item resolves track_name to track_id | ✓ VERIFIED | `approve/route.ts` case `arch_node`: transaction looks up archTracks by `(project_id, track_name)`, creates if missing, then inserts archNode |
| 18 | Approving a workflow_step item resolves workflow_name to workflow_id | ✓ VERIFIED | case `workflow_step`: transaction looks up `e2eWorkflows`, creates if missing (`team_name: 'Unknown'`), inserts workflowStep |
| 19 | Approving a team_engagement item upserts the section | ✓ VERIFIED | case `team_engagement`: selects by `(project_id, name)`, updates content if exists, inserts if not |
| 20 | Approving a task item inserts to tasks table with status='todo' | ✓ VERIFIED | case `task`: `db.insert(tasks).values({ title: item.content, status: 'todo', source: 'discovery' })` |
| 21 | Approving a business_outcome item inserts to businessOutcomes | ✓ VERIFIED | case `business_outcome`: `db.insert(businessOutcomes).values({ title: item.content, track: 'discovery' })` |
| 22 | Approving an arch_track item inserts to archTracks | ✓ VERIFIED | case `arch_track`: `db.insert(archTracks).values({ name: item.content, display_order: 0 })` |
| 23 | Approving a workflow item inserts to e2eWorkflows | ✓ VERIFIED | case `workflow`: parses JSON `{team_name, workflow_name}`, inserts e2eWorkflows |
| 24 | Approving an integration item inserts to architectureIntegrations | ✓ VERIFIED | case `integration`: `db.insert(architectureIntegrations).values({ tool_name: item.content, track: 'discovery' })` |
| 25 | runDiscoveryScan() returns { items, sourceSummary } instead of just items | ✓ VERIFIED | `DiscoveryScanResult` interface exported; function returns `{ items, sourceSummary }` |
| 26 | Each source in sourceSummary has fetched count and skipped boolean | ✓ VERIFIED | Both branches populate: no adapter → `{ fetched: 0, skipped: true, reason: 'no credentials' }`; adapter → `{ fetched: N, skipped: false }` |
| 27 | SSE complete event includes sourceSummary in its payload | ✓ VERIFIED | `scan/route.ts` `sendEvent({ type: 'complete', itemCount, newItems, skippedDups, sourceSummary })` |
| 28 | ScanForUpdatesButton shows post-scan source breakdown | ? NEEDS HUMAN | Code complete: `breakdown` string built from `payload.sourceSummary`, passed as `toast.success(msg, { description: breakdown })`; visual confirmation needed |
| 29 | ReviewQueue displays all 14 entity type labels correctly | ? NEEDS HUMAN | `QueueItemRow.tsx` `TYPE_LABELS` contains all 8 new types + fallback to capitalize raw value; visual confirmation needed |
| 30 | Wave 0 test files exist with RED→GREEN gates | ✓ VERIFIED | All 5 test files exist; Phase 84 tests pass GREEN (41/49 total; 8 failures are pre-existing dismiss/queue mock issues documented in deferred-items.md) |

**Score:** 27/27 automated truths VERIFIED, 3/3 truths pending human confirmation

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/api/oauth/slack/route.ts` | GET: redirect to Slack OAuth consent with user_scope=search:read | ✓ VERIFIED | Substantive; wired via settings page `window.location.href = '/api/oauth/slack'` |
| `app/api/oauth/slack/callback/route.ts` | GET: exchange code for xoxp- token, store in user_source_tokens | ✓ VERIFIED | Full implementation; `onConflictDoUpdate` wiring confirmed |
| `app/api/oauth/slack/status/route.ts` | GET: connected status + hint; DELETE: disconnect | ✓ VERIFIED | Both handlers implemented; lazy DB import for Docker compatibility |
| `app/settings/page.tsx` | Authorize with Slack button, connected state, disconnect button | ✓ VERIFIED | Old bot token form removed; OAuth button section at line 492-516 |
| `lib/source-adapters/slack-adapter.ts` | Rewritten SlackAdapter with search.messages and UserSourceToken constructor | ✓ VERIFIED | Dual-mode: `_fetchOAuth()` with search.messages + `_fetchLegacy()` with conversations.history |
| `lib/source-adapters/index.ts` | Updated resolveAdapter: Slack checks userToken first, then org bot token | ✓ VERIFIED | Priority comment present; userToken check precedes org bot check at lines 92-100 |
| `app/api/discovery/scan-config/route.ts` | GET returns lookback field; POST accepts and saves lookback | ✓ VERIFIED | `Lookback` type defined; GET returns `lookback ?? '7d'`; POST Zod schema includes `lookback: z.enum(['7d','14d','1m','3m']).optional()` |
| `components/ScanForUpdatesButton.tsx` | Lookback dropdown + since param in scan POST + config persistence | ✓ VERIFIED | `lookback` state, `LOOKBACK_OPTIONS`, `<select>` rendered, `since` in scan POST, `lookback` in config POST |
| `lib/discovery-scanner.ts` | Returns DiscoveryScanResult: { items, sourceSummary }; 14-type DISCOVERY_SYSTEM | ✓ VERIFIED | `DiscoveryScanResult` exported; `DISCOVERY_SYSTEM_TEMPLATE` has 14 entity types; `existingStructureBlock` interpolated |
| `app/api/discovery/scan/route.ts` | Loads arch tracks/workflows/sections; passes existingStructure; propagates sourceSummary into SSE | ✓ VERIFIED | `Promise.all` fetches 6 tables; `existingStructure` passed to `runDiscoveryScan`; `sourceSummary` in complete event |
| `app/api/discovery/approve/route.ts` | Switch cases for 8 new entity types with FK resolution | ✓ VERIFIED | 8 new cases: task, arch_node, workflow_step, team_engagement, business_outcome, arch_track, integration, workflow |
| `components/QueueItemRow.tsx` | Renders all new entity type labels | ✓ VERIFIED | `TYPE_LABELS` map contains all 14 types; fallback capitalizes unknown types |
| `install/docker-compose.local.yml` | SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_REDIRECT_URI env stubs | ✓ VERIFIED | All 3 vars present at lines 58-60 |
| `tests/discovery/slack-oauth.test.ts` | GREEN tests for Slack OAuth routes | ✓ VERIFIED | 9/9 tests pass |
| `lib/__tests__/slack-adapter.test.ts` | GREEN tests for search.messages SlackAdapter | ✓ VERIFIED | 7/7 tests pass |
| `tests/discovery/scan-config.test.ts` | GREEN tests for lookback in GET/POST | ✓ VERIFIED | 5/5 tests pass |
| `tests/discovery/approve.test.ts` | 11 tests pass including 8 new entity type cases | ✓ VERIFIED | 11/11 tests pass |
| `tests/discovery/scan.test.ts` | 7 tests pass including sourceSummary tests | ✓ VERIFIED | 7/7 tests pass |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/settings/page.tsx` | `app/api/oauth/slack/route.ts` | `window.location.href = '/api/oauth/slack'` | ✓ WIRED | `handleConnectSlack` at line 211-213 |
| `app/api/oauth/slack/callback/route.ts` | `db/schema user_source_tokens` | `onConflictDoUpdate` with source='slack' | ✓ WIRED | Lines 88-111 |
| `lib/source-adapters/index.ts` | `lib/source-adapters/slack-adapter.ts` | `new SlackAdapter(userToken)` or `new SlackAdapter({ token, channels })` | ✓ WIRED | Lines 92-100 |
| `lib/source-adapters/slack-adapter.ts` | `https://slack.com/api/search.messages` | `fetch` with `Bearer xoxp-` token | ✓ WIRED | Line 61-63 in `_fetchOAuth()` |
| `components/ScanForUpdatesButton.tsx` | `app/api/discovery/scan-config/route.ts` | `POST /api/discovery/scan-config` with `{projectId, sources, lookback}` | ✓ WIRED | Lines 109-116 |
| `components/ScanForUpdatesButton.tsx` | `app/api/discovery/scan/route.ts` | `POST /api/discovery/scan` with `{projectId, sources, since}` | ✓ WIRED | Lines 123-128 |
| `lib/discovery-scanner.ts` | `app/api/discovery/scan/route.ts` | `DiscoveryScanResult` type with `sourceSummary` | ✓ WIRED | Destructured at line 184 in scan route |
| `app/api/discovery/scan/route.ts` | `components/ScanForUpdatesButton.tsx` | SSE complete event with `sourceSummary` | ✓ WIRED | `sendEvent({ ..., sourceSummary })` at line 232; consumed in ScanForUpdatesButton line 169 |
| `app/api/discovery/scan/route.ts` | `db/schema archTracks, e2eWorkflows, teamEngagementSections` | `Promise.all` enrichment queries | ✓ WIRED | Lines 141-147 |
| `app/api/discovery/approve/route.ts` | `db/schema archTracks, archNodes, e2eWorkflows, workflowSteps, teamEngagementSections, tasks, businessOutcomes` | `db.transaction` with FK resolution | ✓ WIRED | All 8 new cases in switch block |

---

## Requirements Coverage

All 6 plans declare `requirements: []`. No requirement IDs are claimed from REQUIREMENTS.md. No orphaned requirements found for Phase 84 in REQUIREMENTS.md. Requirements coverage: N/A.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/api/discovery/approve/route.ts` | 192-199 | `arch_node` case uses `tx.insert(archNodes)` without `onConflictDoNothing()` | ⚠️ Warning | The schema has a unique index on `(project_id, track_id, name)`. A duplicate approval will throw a DB constraint error instead of silently skipping. Plan 84-04 specified `onConflictDoNothing()` but it was not applied. |

No stub patterns, placeholder returns, or TODO/FIXME comments found in Phase 84 implementation files. The `return []` in `discovery-scanner.ts` line 103 is inside an error handler catch block — not a stub.

---

## Human Verification Required

### 1. Settings page — Slack OAuth section visual

**Test:** Start dev server (`npm run next-only`), navigate to `http://localhost:3000/settings`
**Expected:** Slack section shows "Authorize with Slack" button (no token input form). Gmail section unchanged.
**Why human:** Visual rendering of the Settings page OAuth section cannot be verified programmatically.

### 2. ScanForUpdatesButton — lookback dropdown visible

**Test:** Navigate to any project workspace, click "Scan for Updates" button
**Expected:** Dropdown panel shows source checkboxes AND a "Timeframe" section with `<select>` showing 4 options (Last 7 days, Last 14 days, Last month, Last 3 months)
**Why human:** UI rendering of `<select>` element inside the dropdown requires browser interaction.

### 3. Per-source breakdown in scan completion toast

**Test:** Run a scan with at least one source active and one without credentials
**Expected:** Completion toast has description line like "Slack: no credentials · Gmail: 3 messages"
**Why human:** Sonner toast description rendering requires live browser testing.

### 4. ReviewQueue entity type labels for new types

**Test:** Approve a discovery item with `suggested_field: 'arch_node'` (or any new type), then open the ReviewQueue
**Expected:** Badge shows "Arch Node" (not raw `arch_node`), and similar human-readable labels for all new types
**Why human:** Badge display requires visual inspection in the browser.

---

## Gaps Summary

No blocking gaps found. All 34 must-have truths either verified (27 automated, 3 human-needed) or pass automated checks. The one warning-level finding — missing `onConflictDoNothing()` on `arch_node` inserts — does not block goal achievement but will surface as a DB constraint error if the same arch_node is approved twice. This can be addressed in a follow-on fix.

Pre-existing test failures in `tests/discovery/dismiss.test.ts` (3 tests) and `tests/discovery/queue.test.ts` (5 tests) are documented in `deferred-items.md` and pre-date Phase 84 — they are not regressions.

---

_Verified: 2026-05-04T08:25:00Z_
_Verifier: Claude (gsd-verifier)_
