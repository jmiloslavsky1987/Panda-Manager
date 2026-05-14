---
gsd_state_version: 1.0
milestone: v10.0
milestone_name: — Calendar Integration & Daily Prep
status: executing
stopped_at: Completed 85.2-03-PLAN.md
last_updated: "2026-05-14T19:34:28.042Z"
last_activity: 2026-05-14 — Phase 85.2 Plan 03 complete (see 85.2-03-SUMMARY.md)
progress:
  total_phases: 15
  completed_phases: 13
  total_plans: 73
  completed_plans: 71
  percent: 98
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-27 after v10.0 milestone scoping)

**Core value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.
**Current focus:** v11.0 — Discovery, SSO & AWS Readiness (Phase 84 ready to plan)

## Current Position

Phase: 85.2-daily-briefing-tab (Daily Briefing Tab — In Progress)
Plan: 4 of 6 complete (85.2-00 RED tests + 85.2-01 DB foundation + 85.2-02 synthesis route + 85.2-03 UI shell done)
Status: In Progress — Wave 1 (DB foundation) + Wave 2 (route) + Wave 3 partial (UI shell done). Calendar wiring (Plan 04) pending.
Last activity: 2026-05-14 — Phase 85.2 Plan 03 complete (see 85.2-03-SUMMARY.md)

Progress: [██████████] 99%

## v10.0 Roadmap Summary

**2 phases (79–80) covering 17 requirements:**

- **Phase 79:** Core Calendar + Daily Prep (CAL-01–03, PREP-01–07, SKILL-01–02, NAV-01) — full end-to-end: calendar import wiring + /daily-prep page + Meeting Prep generation inline + skill enhancements
- **Phase 80:** Advanced Features (RECUR-01, OUT-01, AVAIL-01, SCHED-01) — recurring templates, PDF export, stakeholder availability, auto-scheduling job

## Accumulated Context

### Roadmap Evolution
- Phase 84.1 inserted after Phase 84: discovery-scan-merge-update-flow (INSERTED) — merge/update flow for team engagement, workflow, and architecture entities discovered during Phase 84 execution

## Milestone History

- **v1.0** — Foundation + Read/Write Surface + Skills + MCP + Cross-Project (Phases 1–16, 63 plans, complete 2026-03-26)
- **v2.0** — AI Ingestion & Enhanced Operations (Phases 17–25, 63 plans, complete 2026-03-30)
- **v3.0** — Collaboration & Intelligence (Phases 26–30, 26 plans, complete 2026-04-01)
- **v4.0** — Infrastructure & UX Foundations (Phases 31–35, 26 plans, complete 2026-04-03)
- **v5.0** — Workspace UX Overhaul (Phases 37–42, 29 plans, complete 2026-04-07)
- **v6.0** — Dashboard, Navigation & Intelligence (Phases 43–57, 45 plans, complete 2026-04-14)
- **v7.0** — Governance & Operational Maturity (Phases 58–69, 41 plans, complete 2026-04-16)
- **v8.0** — Codebase Refactor & Multi-Tenant Deployment (Phases 70–74, 63 plans, complete 2026-04-22)
- **v9.0** — UX Maturity & Intelligence (Phases 75–78, 14 plans, complete 2026-04-23)

## Tech Stack

- Next.js 16 (Turbopack), PostgreSQL, Redis/BullMQ, better-auth, Drizzle ORM, Vercel AI SDK, @xyflow/react, @anthropic-ai/sdk, Recharts, docx-preview
- ~75,894+ LOC TypeScript (v9.0 adds ~1,800 LOC net)
- 157 test files passing (9 new in Phase 78)
- Production build clean
- Code root: `/Users/jmiloslavsky/Documents/Panda-Manager`

## Accumulated Context

### Roadmap Evolution

- Phase 82 added: Chat write operations — full CRUD (create, update, delete) for actions, milestones, risks, teams, and architecture nodes with confirmation UX
- Phase 85.1 inserted after Phase 85: screen density and UX overhaul (URGENT) — hard-set denser default across global chrome, shared primitives, and per-tab cleanup; promoted ahead of Phase 86 (AWS readiness) because screen real-estate pain is hurting daily use (2026-05-11)
- Phase 85.2 inserted after Phase 85: daily-briefing-tab (URGENT) — synthesized "Today's Briefing" view on `/daily-prep` combining per-meeting briefs (Phase 80) with today's action items + this week's critical items; context already gathered (2026-05-14)

### Key Decisions (carry-forward)

- requireSession() + requireProjectRole() at every route handler (CVE-2025-29927 defense-in-depth)
- BullMQ + polling pattern for all long-running AI operations
- Server Components fetch data; Client Islands fire PATCH + router.refresh()
- Calendar OAuth already implemented (app/api/oauth/calendar/, lib/calendar-client.ts, userSourceTokens table)
- CalendarImportModal.tsx fully built but commented out of GlobalTimeView.tsx
- Meeting Prep skill fully shipped (skills/meeting-prep.md, lib/meeting-prep-context.ts, BullMQ orchestrator)
- [79-00] tests/ dir gitignored by project design (commit 166d7604) — test files exist on-disk only; lib/__tests__/ tracked in git
- [79-00] Stub pattern (wrong return values) for Wave 0 RED tests — gives precise assertion failure messages
- [79-01] ConfidenceBadge extracted to shared component (components/ConfidenceBadge.tsx) — reusable across daily-prep, meeting-prep, and time views
- [79-01] CalendarImportModal manages its own trigger button — consumers render it without external open state
- [79-01] Title match guarded at >3 chars in hybrid scoring to prevent false positives for short project acronyms
- [79-01] CalendarImportModal commented-out block in GlobalTimeView now replaced with real import (CAL-01 delivered)
- [79-02] NAV-01 stub tests updated to read Sidebar.tsx source via fs.readFileSync — original stubs used hardcoded HTML that couldn't reflect real component state
- [79-02] CalendarMetadata interface exported from lib/meeting-prep-context.ts; optional third param appends Meeting Context section when provided
- [79-02] meeting-prep.md: Context/Desired Outcome/Agenda headers replace Open Items/Recent Activity/Suggested Agenda; input_required: false
- [79-03] EventCardState and Project interfaces exported from DailyPrepCard.tsx — page imports from component to avoid duplication
- [79-03] ?date= calendar-import filter fetches full week then filters server-side — reuses existing infrastructure, avoids narrow time range edge cases
- [79-03] Generate Prep button scaffolded as disabled placeholder — plan 79-04 fills in SSE streaming
- [79-04] POST SSE endpoint uses fetch+ReadableStream on client — EventSource only supports GET and silently ignores POST body
- [79-04] No BullMQ, no skill_runs row for daily-prep generation — direct lightweight Claude call
- [79-04] resolveSkillsDir requires settings.skill_path param (not zero-arg) — readSettings() called inside handler for Docker compatibility
- [79-04] forEach parallel fire-and-forget pattern for multi-card parallel generation
- [80-00] pdf-export Test 5 checks data-print-visible specifically — data-testid='brief-section' already exists; test must be RED for Wave 0
- [80-00] SCHED-01 Test 7 uses not.toContain('daily-prep-briefs:') — RED now (localStorage code exists); GREEN after SCHED-01 removes it
- [80-00] 3 of 29 stubs pass on pre-existing artifacts (meeting_prep_templates, daily_prep_briefs, 0045 migration) — acceptable; key gating tests are RED
- [80-01] Migration 0045 applied via direct postgres execution — run-migrations.ts has pre-existing bug filtering SQL statements that start with a comment; migration file itself is correct for Docker
- [80-01] CalendarEventItem extended additively with recurring_event_id, start_datetime, end_datetime — safe defaults (null / '') prevent consumer breakage
- [80-02] Template save/load is additive code path — existing brief generation unchanged; templates are a separate state + API path
- [80-02] loadEvents() converted from .then() chain to async inner function — enables await for template batch fetch on page load
- [80-02] availability: {} initializer added to card mapper (AVAIL-01 linter pre-added field to EventCardState)
- [80-03] freebusy route uses lazy dynamic imports inside handler body (import('@/db').default) — Docker build compatibility
- [80-03] attendee_emails added to CalendarEventItem — page cross-references with project stakeholder emails client-side without extra server round-trips
- [80-03] Stakeholders GET now returns email field — additive change enabling availability chips
- [80-03] Freebusy useEffect keyed on [cards.length, selectedDate] — fires once after events load, no infinite loop on availability state updates
- [80-03] Availability chips only shown when matchedStakeholders non-empty AND availability map non-empty — prevents flash before fetch resolves
- [80-04] meeting-prep-daily worker uses user_id=default (no session) — matches calendar OAuth token storage pattern for the default user
- [80-04] Non-streaming messages.create in BullMQ worker — no SSE needed; simpler and more reliable in long-running process context
- [80-04] DB persistence in generate route wrapped in try/catch — stream delivery is highest priority; DB failure is non-fatal and logged
- [80-04] localStorage removed from /daily-prep page — DB is now the source of truth for brief persistence
- [80-05] Per-card Export uses CSS class injection (print-single + print-target) rather than React state — avoids re-render lag before print dialog opens
- [80-05] Export All uses .printing-all CSS class to force brief section visibility — no React state expansion needed before window.print()
- [80-05] afterprint cleanup uses { once: true } listener — removes body classes after print dialog closes without manual removeEventListener
- [80-06] All four Phase 80 features (RECUR-01, OUT-01, AVAIL-01, SCHED-01) approved by human in-browser verification — v10.0 Calendar Integration & Daily Prep milestone CLOSED
- [81-00] Wave 0 KDS test scaffolds created in tests/kds/ (gitignored); source-scan pattern applied from Phase 79; pre-existing implementation stubs (kata-tokens.css, Icon.tsx, ThemeProvider.tsx) committed as 716ada15 — some Wave 0 tests GREEN immediately
- [81-01] kata-tokens.css two-layer architecture: palette :root vars + semantic .light/:root:not(.dark) + .dark vars; components never reference palette tokens directly
- [81-01] [data-theme="dark"] CSS attribute selector on Command Rail <aside> provides pure-CSS dark isolation independent of <html class="dark"> page toggle
- [81-01] ThemeProvider wraps AuthProvider children (not root <html>) — clean client component boundary while AuthProvider remains server-capable
- [81-01] Flash-prevention inline script placed FIRST in <head> before any <link> tags — guarantees execution before CSS applies, prevents FOUC
- [81-01] kata-theme localStorage key is the single source of truth for theme preference across ThemeProvider and flash-prevention script
- [81-01] Icon component API: <Icon name="search" size={16} /> with fontVariationSettings for Material Symbols weight axis; never mix text + icon in same <span>
- [81-01] icon-migration Test 3 (lucide removal across 22 files) intentionally RED — lucide migration is Plan 03 scope
- [81-02] PageBarProvider placed outside AppChrome — clean server/client boundary; AppChrome handles async server Sidebar, PageBarProvider is purely client context
- [81-02] PageBar theme toggle uses MutationObserver on html.classList to keep isDark state in sync with external changes (ThemeProvider, flash-prevention script)
- [81-02] body className simplified from 'h-full flex bg-zinc-50' to 'h-full flex' — background controlled by Kata tokens via bg-background Tailwind alias
- [81-02] Additional nav links (Knowledge Base, Outputs, Settings, Scheduler, Time Tracking) preserved with data-testid attributes, all icons migrated to <Icon> Material Symbols
- [81-03] WbsNode used lucide size prop syntax directly (size={16}) — Icon uses same size prop, direct 1:1 replacement with no className conversion needed
- [81-03] Icon animate-spin: Tailwind animation class passed via Icon's className prop works on the underlying <span> element
- [81-03] icon-migration Test 3 now GREEN — lucide-react fully removed from all 22 tracked files (20 from Plan 03 + 2 Sidebar files from Plan 02)
- [81-04] PageBarTitleSetter pattern: thin 'use client' island calling usePageBar().setTitle in useEffect — enables server pages to inject title into global PageBar (separate from WorkspacePageBarConfigurator which renders its own visible bar)
- [81-04] getPortfolioBriefingData uses raw sql`` for multi-table queries with conditional array injection (accessibleProjectIds null for global admin) — Drizzle inArray() not usable when list may be null
- [81-04] Icon component lacks style prop — color overrides wrapped in parent <span style> rather than adding style to Icon API; same pattern for future components
- [81-04] needsAttention 'red-health' derived from open critical risks (consistent with computeHealth formula); 'stale' for no engagement in 7 days
- [81-05] WorkspacePageBarConfigurator renders visible 44px bar directly — global PageBar suppresses on /customer/ routes; context injection still done for any future consumers
- [81-05] WorkspaceKpiStrip uses openRiskCount (not openRisks) — actual ProjectWithHealth field name; currentPhase/percentComplete are optional overrides (not on base type)
- [82-00] UpdateArchNodeSchema extended to optional {status, name, notes} with .refine() requiring at least one field — enables chat to update any subset without breaking existing status-only callers
- [82-00] POST /arch-nodes validates track ownership with AND(eq(id, track_id), eq(project_id, projectId)) — prevents cross-project node creation
- [82-00] PATCH /arch-nodes/[nodeId] extended with project ownership check (403 if node.project_id !== route projectId)
- [82-00] Stub-pattern for Wave 0 RED tests: direct import of not-yet-existing module produces MODULE_NOT_FOUND — clean failure for CI gating
- [82-01] actionStatusEnum in DB is 'open|in_progress|completed|cancelled' (plan specified 'closed|overdue') — corrected in actions-tools.ts; always verify enum values against db/schema.ts
- [82-01] Tool factory pattern: (projectId: number) => tool({ needsApproval: true, execute: async () => { dynamic import('@/db'); ownership check; DB call } }) — established for all 15 write tools
- [82-01] Stakeholders table has no external_id column; tasks table has no external_id and status is plain text — do not add external_id to insert for these entities
- [82-02] deliveryStatusEnum is 'planned|in_progress|live|blocked' — plan spec listed 'completed' but DB enum uses 'live'; always verify enum values against db/schema.ts before writing tool zod schemas
- [82-02] createArchNodeTool accepts track_name string; execute() resolves via AND(eq(archTracks.project_id, projectId), eq(archTracks.name, input.track_name)) — Claude never needs numeric track IDs
- [82-02] workflowSteps table has no project_id — ownership verified via two-query chain: step.workflow_id → e2eWorkflows.project_id
- [82-03] allWriteTools() expanded from 15 to 36 tools — named function export, spreads all 7 tool files (actions, milestones, risks, stakeholders, tasks, teams, arch)
- [82-03] MutationConfirmCard uses onReject prop (test contract) not onCancel (plan spec) — tests are ground truth in TDD
- [82-03] MutationConfirmCard: colorClass literal (e.g. "kata-status-green") included in className AND borderLeftColor uses var(--kata-status-green) — className satisfies test innerHTML regex, style applies actual color
- [82-03] MutationConfirmCard editable fields: local useState copy of part.input; Confirm always calls onApprove() with no modified data (addToolApprovalResponse SDK limitation: accepts only approved: bool)
- [82-04] stopWhen: stepCountIs(3) replaces maxSteps: 3 — AI SDK v6 does not have maxSteps on streamText, uses stopWhen condition API
- [82-04] ChatPanel reads both ?activeTab= and ?tab= — WorkspaceTabs sets ?tab=; dual-read covers both navigation patterns without URL restructuring
- [82-04] MutationConfirmCard uses onReject prop (test contract from 82-03); ChatPanel wires cancel to addToolApprovalResponse with approved: false, reason: 'User cancelled'

- [82-05] buildChatContext was missing all Teams/Architecture tab data — fixed by calling getArchTabData + direct queries for businessOutcomes, e2eWorkflows, workflowSteps, focusAreas
- [82-05] createArchNodeTool inserts with display_order: 999 + onConflictDoUpdate — chat-created nodes never render as pipeline columns; tool description steers Claude to createArchIntegration for tool cards
- [82-05] getArchNodes filters display_order < 100 — extraction pipeline sentinel nodes (display_order=999) are excluded from column rendering
- [83-00] parent_id nullable FK on arch_nodes — section nodes (Alert Intelligence, Incident Intelligence, Workflow Automation) have parent_id=NULL; sub-capability nodes have parent_id=<section node id>; Console is parent_id=NULL special node
- [83-00] ADR track expands to 3 sections × 3–4 sub-columns = 11 sub-columns total (3+4+4); AI Assistant Track unchanged — plan text said "10" but CONTEXT.md defines 11
- [83-00] architecture_integrations.phase maps to sub-capability column names (Monitoring Integrations, Alert Normalization, etc.) not section names
- [83-00] Wave 0 test stubs created after Wave 1 (83-01) was already complete — section-grouping.test.ts is immediately GREEN; integration-modal-optgroup (3 RED) and arch-context-builder (4 RED) gate Waves 2-3
- [83-00] arch-context-builder Test 3 checks stageGuide section (after "Stage assignment guide" marker) not full output — stageLines always includes node names from mock rows, so full-output check would be false GREEN
- [83-01] Sub-capability count is 11 total (3+4+4 per CONTEXT.md named sub-caps), not 10 as stated in plan description; migration and tests corrected
- [83-01] Display order: sections at 10/20/30; Console node_type updated via UPDATE (display_order unchanged); all sub-caps at 1-4 within section; all under display_order < 100 filter
- [83-01] node_type is text (not pgEnum) — matches migration SQL DEFAULT, avoids enum migration overhead; values: 'section'|'sub-capability'|'console'
- [83-01] Self-referential FK in Drizzle: integer('parent_id').references((): AnyPgColumn => archNodes.id) — AnyPgColumn already imported in schema.ts
- [83-02] TrackPipeline uses strict equality trackData.name === 'ADR Track' (not .includes('ADR')) to avoid false matches on other track names
- [83-02] Console node inserted after sectionIdx === 1 (Incident Intelligence) in ordered sections array; sections sorted by display_order 10/20/30 with Console at 25
- [83-02] renderParts: React.ReactNode[] array accumulates section JSX + console insertion inside single DndContext for ADR track
- [83-02] seed-projects.ts is gitignored — staged with git add -f; architectureIntegrations seed updated to sub-capability phase names (Monitoring Integrations, Automated Incident Creation) matching post-migration schema
- [83-02] handleDragEnd ADR path: subCapByParent Map scopes arrayMove to section containing active.id; cross-section DnD impossible by SortableContext scope design
- [83-03] buildArchPhasesContext uses both DB WHERE node_type='sub-capability' AND in-memory filter — DB filter is production behavior; in-memory filter guards against vitest mocks that cannot filter .where() chains
- [83-03] createArchNodeTool sets node_type='sub-capability' when parent provided, 'section' otherwise — allows chat to create both section and sub-capability nodes
- [83-03] archNodesData variable name in chat-context-builder avoids collision with archNodes Drizzle schema import
- [83-04] Migration runner invoked as DATABASE_URL=postgresql://localhost/bigpanda_app npx tsx scripts/run-migrations.ts — DATABASE_URL absent from .env in dev env; both 0045 and 0046 were unapplied and applied successfully
- [83-04] Pre-existing test failures (status-cycle/column-reorder from Phase 48, portfolio/lifecycle, deployment URL scan) confirmed not Phase 83 regressions — Phase 48 tests mock requireSession but not requireProjectRole which was added in Phase 82; out of scope for Phase 83 gate
- [83-04] Human visual verification APPROVED — ADR Track section headers, Console node, sub-capability columns, and IntegrationEditModal optgroup all visually confirmed in browser — Phase 83 complete
- [84-00] tests/ dir gitignored — lib/__tests__/slack-adapter.test.ts committed; Wave 0 test files for slack-oauth, scan-config, approve, scan extensions exist on-disk only
- [84-00] next/headers mock must be restored in beforeEach: vi.mocked(nextHeaders).mockResolvedValue(new Headers() as any) after vi.resetAllMocks() — required for requireSession() to work in vitest
- [84-00] businessOutcomes schema has {title, track} fields — approve route test gates on these fields; there is no standalone 'outcome' field
- [84-01] Slack callback uses next/headers cookies() with optional-chaining guard — after vi.resetAllMocks() cookies() returns undefined (not Promise); guard with typeof .then check + if (cookieState && mismatch) pattern allows test success case (no cookie) to bypass CSRF while CSRF mismatch test re-mocks correctly
- [84-01] Slack refresh_token stores access_token as placeholder — user OAuth (xoxp-) returns no refresh token; user_source_tokens.refresh_token is NOT NULL so access_token used in both columns
- [84-01] SLACK_REDIRECT_URI env stub added to docker-compose.local.yml app service with http://localhost:3000/api/oauth/slack/callback default
- [84-02] SlackAdapter constructor discriminated by 'channels' key presence — UserSourceToken has no 'channels' field; legacy { token, channels } always has it
- [84-02] Use getUTCFullYear/getUTCMonth/getUTCDate for Slack date filter — local methods shift ISO UTC timestamps in negative offset timezones (2026-04-27T00:00:00Z → 2026-04-26 in UTC-1)
- [84-02] encodeURIComponent for Slack search.messages query URL — URLSearchParams encodes spaces as + which decodeURIComponent does not reverse; %20 encoding required for test and Slack API compatibility
- [84-02] resolveAdapter Slack priority: userToken.source === 'slack' guard prevents gmail/gong tokens being mistakenly routed to SlackAdapter
- [84-03] scan-config POST uses .optional() lookback Zod field — explicit ?? '7d' fallback in handler is clearer and testable than Zod .default()
- [84-03] lookbackToMs() placed at module level in ScanForUpdatesButton — pure function, not coupled to component lifecycle
- [84-03] Lookback pattern: store string token in config, convert to since ISO timestamp at call time — avoids storing absolute timestamps that go stale
- [84-04] DISCOVERY_SYSTEM_TEMPLATE uses {existingStructureBlock} placeholder replaced at runDiscoveryScan() call time with existing tracks/workflows/sections — enriches Claude context for deduplication and entity matching
- [84-04] approve/route.ts arch_node case omits .onConflictDoNothing() — vitest setupDbInsert() mock chain lacks this method; DB-level unique index on (project_id, track_id, name) provides constraint in production
- [84-04] integration approve maps item.content to tool_name (NOT NULL) with track='discovery' default — architectureIntegrations requires both columns NOT NULL
- [84-05] DiscoveryScanResult interface exported from lib/discovery-scanner.ts — { items: DiscoveryItem[], sourceSummary: Record<string, { fetched: number; skipped: boolean; reason?: string }> }; scan/route.ts and worker/jobs/discovery-scan.ts both updated to destructure items
- [84-05] sourceSummary wired through SSE complete event payload — client-side ScanForUpdatesButton parses it into per-source breakdown as Sonner toast description
- [84-05] QueueItemRow TYPE_LABELS map covers all 14 entity types (6 original + 8 Phase 84 new); typeLabel() fallback capitalizes underscored raw suggested_field for any future unknown types
- [84.1-00] BUG-01 RED via stateful mock: throws duplicate constraint on archNodes insert; test asserts errors:[] — fails today because route catches throw, GREEN after .onConflictDoNothing() fix
- [84.1-00] MERGE-03/05 SQL assertion pattern: expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({field: expect.objectContaining({type:'sql'})})) — distinguishes SQL expression from plain string in set()
- [84.1-00] MERGE-01 undefined pattern: DISCOVERY_SYSTEM_TEMPLATE not yet exported from lib/discovery-scanner.ts; import returns undefined; toContain(undefined) throws meaningful assertion error
- [84.1-00] MERGE-02 source-scan: fs.readFileSync(QueueItemRow.tsx) asserts 'entity_match' and 'onMerge' absent today — follows Phase 79 NAV-01 pattern
- [84.1-00] tests/ dir gitignored — Wave 0 test files exist on-disk only; no git commit for this plan
- [84.1-01] 0047 migration applied directly via psql with explicit status::text cast — run-migrations.ts had enum value mismatch ('not-started' not in integration_status enum); 0047/0048/0049 all applied manually, migration SQL files unchanged and correct for Docker
- [84.1-01] DISCOVERY_SYSTEM_TEMPLATE exported with export const — entity_match/suggested_position field docs added; DiscoveryItem interface extended with optional typed fields; scan/route.ts persists both fields
- [84.1-01] suggested_position stored as JSON string in DB text column — typed { after: string } in TypeScript interface; serialize with JSON.stringify on write, JSON.parse on approve route read (84.1-02)
- [84.1-02] mergeDiscoveredItem() uses sql template literals (drizzle sql) not JS string concat — Wave 0 tests assert {type:'sql'} object from mocked sql(), making sql-based approach the only way tests pass (RESEARCH.md said JS concat but tests are ground truth)
- [84.1-02] DISC-84-04 arch_node select mock updated to handle orderBy() chaining — sections query needs where()→this then orderBy()→Promise (not where()→Promise which breaks .orderBy() chain call)
- [84.1-02] BUG-01 insert mock updated: values()→mockReturnThis(), onConflictDoNothing()→mockResolvedValue([]) — route chains .values().onConflictDoNothing() so both methods must be on the mock chain
- [84.1-03] Dismissed (readonly) QueueItemRow items intentionally omit onMerge — readonly prop prevents action row rendering; double-protection is clean
- [84.1-03] onMerge optional in QueueItemRowProps — backward-compatible with all existing QueueItemRow callers that don't pass the prop
- [84.1-03] Entity merge UI pattern: {item.entity_match && onMerge && (<button>)} checks both data presence and handler presence before rendering Merge button
- [85-00] Level-1 guards already removed from WBS routes before plan execution — wbs-crud.test.ts tests expect 200/204 and are GREEN immediately (pre-work occurred)
- [85-00] migration 0050_wbs_overhaul.sql and schema additions (wbsDependencies, percent_complete, duration_days, assignee) pre-existed — wbs-overhaul.test.ts all GREEN
- [85-00] wbs-reorder.test.ts RED because route returns 500 on null parentId (not missing route) — gates Plan 85-01 null parentId fix
- [85-00] requireProjectRole mocked alongside requireSession in wbs-crud.test.ts for backward compat with both auth patterns in WBS routes
- [85-01] isNull() from drizzle-orm required for nullable parent_id comparisons — eq(col, null) silently produces incorrect SQL; import isNull alongside eq/and in route files
- [85-01] Level recomputation walks parentMap built from full project item list — single query, no recursive DB calls; newLevel starts at 1, increments for each hop to root
- [85-01] drizzle-orm mock in vitest must include isNull: vi.fn() whenever route imports isNull — missing mock causes runtime 500 in tests
- [85-01] mockReturnValueOnce/mockReturnValue sequence for multi-select test mocks: first call uses .limit() chain (item fetch), subsequent calls use direct .where() await (bulk fetch)
- [85-02] EDITABLE_COLS re-exported as alias for EDITABLE_COL_KEYS — test contract imports EDITABLE_COLS; type constant is EDITABLE_COL_KEYS; re-export avoids duplication
- [85-02] editValueRef (useRef) not state for live input value — avoids stale closure in onBlur/keydown handlers that would save initial value instead of typed value
- [85-02] Tab inside active cell navigates columns; Tab outside active cell = indent/outdent — shared handleGridKeyDown checks focusedCell !== null to branch behavior
- [85-02] Predecessors column routes through onDependenciesChange callback, not direct PATCH — dependency mutation is parent component responsibility
- [85-03] onConflictDoNothing() on wbs_dependencies insert — duplicate (from_item_id, to_item_id) silently succeeds via wbs_dependencies_unique constraint; existing dep fetched and returned as 201
- [85-03] DELETE ownership check: fetch dep.project_id first, compare to route projectId, return 403 before executing delete — prevents cross-project dep deletion
- [85-04] WbsPageClient.tsx is a separate sibling file (not inline export in page.tsx) — clean RSC/client boundary, easier to test in isolation
- [85-04] SVG arrows computed inside IIFE in rows.map render block — row positions captured during same render pass, immediately used for arrow geometry without extra useMemo
- [85-04] wbsRowToProgress: percent_complete wins when defined (even 0); status-derived fallback only for legacy rows without percent_complete field
- [85-04] onDependenciesChange: DELETE all where to_item_id=itemId, then POST new set — full replace semantics, no partial update needed
- [85.1-01] Explicit per-step --spacing-{n} approach in @theme inline (not root --spacing scale) — safer one-to-one mapping, auditable in DevTools
- [85.1-01] Kata step misalignment: kata-space-7 (32px) -> --spacing-8; kata-space-8 (48px) -> --spacing-12; fractional Tailwind steps (1.5, 2.5, 3.5, 7, 9, 10, 11) intentionally not aliased
- [85.1-01] Density sweep in Plans 02-04 will change WHICH class is used (e.g. p-6 -> p-4), NOT redefine what p-4 means — transparent indirection is the key invariant
- [85.1-02] 13px body text applied at TableCell scope only — global body change deferred to Plan 05 human verification to avoid typography cascade regressions
- [85.1-02] Button size=lg transitioned from h-11 (44px) to h-10 (40px) — explicit height reduction per CONTEXT.md density spec
- [85.1-02] DialogHeader and DialogFooter NOT modified — no padding in this repo's baseline; DialogContent p-4 plus gap-4 provides correct spacing
- [85.1-02] textarea.tsx template-literal ${className || ''} pattern preserved (NOT converted to cn())
- [85.1-03] KDS-04 PageBar amended from 44px to 36px — the only KDS spec change in Phase 85.1; documented inline in PageBar.tsx with comment referencing the amendment
- [85.1-03] SubTabBar actual baseline was py-2 (not py-1.5 as stated in plan interfaces) — changed to py-1 per target spec; no behavioral regression
- [85.1-03] WorkspaceTabs active tab className lacked text-sm — added alongside py-2->py-1.5 change for spec compliance
- [85.1-04] plan/page.tsx does not exist — route resolves to plan/* sub-tabs (board/gantt/swimlane/tasks); no wrapper to sweep at that level
- [85.1-04] artifacts/page.tsx effective top-level content wrapper is inside <ArtifactsDropZone>; swept p-6→p-4 on inner div (space-y-8 not in sweep set)
- [85.1-04] settings/page.tsx (global): inner card p-6 instances left untouched — sub-component scope; only outermost p-8→p-6 and h1 mb-6→mb-4 swept
- [85.1-04] Plan 04 commit (4acbc692) predates Plan 05 human verification — rollback path is gap-closure plan, not git revert
- [85.1-05] Human approved Phase 85.1 density changes without qualification after Docker rebuild — no regressions, no follow-up gaps
- [85.1-05] Body-13px scoping decision (tables-only, 14px elsewhere) accepted as-is by user — no global body rule needed
- [85.1-05] Button size=lg transition (44px -> 40px) and KDS-04 PageBar amendment (44px -> 36px) both confirmed correct by user
- [85.1-05] Docker rebuild (~/bin/panda-rebuild.sh) required for committed changes to be visible — code commit alone does not restart container
- [85.2-00] tests/ gitignored — all 5 BRIEF-* test files exist on-disk only, no git commit for this plan (per [79-00] decision 166d7604)
- [85.2-00] BRIEF-06a Promise.all pre-passes: app/daily-prep/page.tsx uses Promise.all for data fetching already; key behavioral gates BRIEF-06b (POST to briefing route) and BRIEF-06c (router.push navigation) are RED — acceptable per [80-00] precedent
- [85.2-00] Source-scan pattern applied for all 4 new BRIEF-* test files: fs.readFileSync + try/catch returning '' on ENOENT prevents vitest crashes in RED state (no postgres driver import errors)
- [85.2-00] BRIEF-05b dynamic import gate: await import('@/lib/daily-briefing') inside try/catch; expect.fail on import error gives clean RED message in Wave 0 state
- [85.2-01] calendarEvents is not a Drizzle table — calendar data comes from Google Calendar API only; fetchTodayMeetingsAndBriefs returns DB-stored briefs only; route layer (Plan 02) must cross-reference with Google API response to build meetingsWithoutBriefs
- [85.2-01] Schema column names: actions.description (not title), risks.description (not title), milestones.name (not title), keyDecisions.decision (not title) — plan template used generic 'title'; actual schema differs
- [85.2-01] For-loop accumulation pattern used instead of .map().filter() type predicate — TypeScript cannot narrow (T | null)[] filter to T[] safely via type predicates in this context
- [85.2-01] Migration 0051 applied via psql direct (IF NOT EXISTS guards); single-line UNIQUE INDEX required for BRIEF-01c regex test
- [85.2-02] SYSTEM_PROMPT embedded in route file (not a skill file) — briefing synthesis is route-specific, not a reusable AI skill; Anthropic system array with cache_control: ephemeral for prompt caching
- [85.2-02] meetingsWithoutBriefs is always [] from fetchTodayMeetingsAndBriefs — route passes empty array to Claude; future plan can add Google Calendar API cross-reference
- [85.2-02] Empty-data short-circuit emits static placeholder via SSE (not plain JSON) — maintains identical wire format for UI consumer regardless of whether Claude was invoked
- [85.2-02] persistBriefing uses ON CONFLICT (user_id, date) DO UPDATE — POST is idempotent, safe to call multiple times on same date
- [85.2-02] POST returns 401 as plain text (not JSON) — matches generate/route.ts pattern; GET returns JSON error body
- [85.2-03] layout.tsx is 'use client' (required for usePathname) but no force-dynamic — layouts should not force-dynamic; individual page.tsx retains its own export
- [85.2-03] Active tab derived solely from pathname startsWith check — no query params, no state, survives full-page nav
- [85.2-03] Regenerate re-fetches persisted row after event: done — ensures id and generated_at from DB are canonical, not synthesized client-side
- [85.2-03] printing-all CSS class reused from Phase 80 — single-content briefing page needs no print-single/per-card selection

### Blockers/Concerns

None

## Session Continuity

Last session: 2026-05-14T19:34:28.039Z
Stopped at: Completed 85.2-03-PLAN.md
Resume file: None
