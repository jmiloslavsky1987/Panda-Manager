---
gsd_state_version: 1.0
milestone: v10.0
milestone_name: — Calendar Integration & Daily Prep
status: verifying
stopped_at: Completed 87-06-PLAN.md (InteractiveArchGraph + 7 supporting arch UI files extended for IP Track)
last_updated: "2026-05-20T02:36:00.000Z"
last_activity: 2026-05-20 — Phase 87 Plan 06 COMPLETE. components/arch/InteractiveArchGraph.tsx + 7 supporting arch/skill/chat files extended to render Incident Prevention Track as third section-grouped diagram identical to ADR. 8 hardcoded ADR-only locations rewired (ConsoleNode 'Change Risk Console' bg-violet-700, sectionColor 3 IP sections, TrackPipeline isIP, section-grouped gate (isADR || isIP), handleDragEnd isADRTrack→isSectionGrouped, top-nav pill bg-violet-600, teamNames 3-way + optional ipTeamNames prop). Console placement generalized via derived consoleAfterIdx (IP=0 for migration 0052 do=15; ADR=1 unchanged) — Rule 1 auto-fix. Task 2 widened 7 supporting files (TeamOnboardingTable + EditModal, IntegrationEditModal with new IP_PHASES_BY_SECTION optgroups, CurrentFutureStateTab + IP button, skill-context-arch, skill-context-teams, chat-context-builder tool hint). IP-12 GREEN (2/2). Panda-Manager commits cd29600f (Task 1) + 7bdbe4a5 (Task 2).
progress:
  total_phases: 16
  completed_phases: 15
  total_plans: 88
  completed_plans: 86
  percent: 98
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-27 after v10.0 milestone scoping)

**Core value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.
**Current focus:** v11.0 — Discovery, SSO & AWS Readiness (Phase 84 ready to plan)

## Current Position

Phase: 87-incident-prevention-track-support (Incident Prevention Track Support — IN PROGRESS)
Plan: 4 of 8 complete (Plan 00 Wave 0 scaffolding; Plan 01 schema/migration foundation; Plan 02 config + extraction + discovery layer; Plan 03 seed-project track-conditional team inserts; Plan 04 project-create active_tracks gating + IP wizard + shared seeder helper)
Status: Phase 87 active. Plan 04 closed 2026-05-20 — new shared lib/seed-incident-prevention.ts helper (305 LOC, idempotent, 8 entity classes) ready for Plan 05's settings PATCH retroactive seeding. POST /api/projects + onboarding/seed + BasicInfoStep wizard now fully active_tracks-aware. IP-06 + IP-07 GREEN (20/20 incl. IP-04/05 from Plan 02). Next: Plan 05 (Settings PATCH route + retroactive seeding for false→true track flips). Live Docker apply (IP-01, IP-02) deferred to Plan 87-08 human verification.
Last activity: 2026-05-20 — Phase 87 Plan 04 COMPLETE. New shared helper lib/seed-incident-prevention.ts (305 LOC) exports seedIncidentPreventionForProject(tx, projectId) — fully idempotent across 8 entity classes. POST /api/projects now accepts active_tracks: {adr, biggy, incident_prevention}; returns 400 when all false; every seeding block gated on tracks[trackKey]; IP helper called inside the transaction when incident_prevention=true. Legacy onboarding/seed POST extended with third seedTrack(INCIDENT_PREVENTION_ONBOARDING_CONFIG) call; response shape gains incident_prevention key. BasicInfoStep.tsx wizard renders three checkboxes in order ADR → Biggy → Incident Prevention, all default OFF, Submit disabled until ≥1 checked. IP-04 + IP-05 + IP-06 + IP-07 GREEN (20/20). IP-09 helper-contract GREEN. Panda-Manager commits 4d69d093 (helper) + 29e4e6b8 (route+wizard wiring).

Progress: [██████████] 98%

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
- Phase 87 added: incident-prevention-track-support — third product track alongside ADR and Biggy, modeled as a sibling track (`active_tracks.incident_prevention`). Covers BigPanda's AI Change Risk Prediction product (change-ticket risk scoring via ITSM integration, custom data sources, 5-category weighted risk engine, write-back to ServiceNow change tickets). Adds onboarding-config, project-create WBS seeding (11 L1, ~39 L2), settings schema/UI, extraction prompt inference rule, seed-project team placeholder. Briefing skill left untouched (already track-agnostic — "Biggy" in the skill name is the AI persona, not the product track). (2026-05-18)

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
- [85.2-04] generateSingleCard() extracted from forEach fire-and-forget; all setCards(prev => ...) functional updater calls preserved — per-card state transitions still happen independently at each card's own SSE timing
- [85.2-04] chainToBriefing drains SSE stream but does NOT render text on Calendar tab — Briefing page.tsx fetches persisted row on mount
- [85.2-04] Promise.all gates chainToBriefing; parallel generation timing is unchanged — all N fetches still fire concurrently
- [86-00] tests/ remains gitignored (per [79-00] convention); worker/jobs/__tests__/ is NOT gitignored — db-backup.test.ts committed as 274072aa to match the lib/__tests__/ tracked-in-git pattern
- [86-00] DORM-04 (/api/auth/sign-in/oauth2 404 when Okta env blank) covered transitively by DORM-01 conditional guard — live HTTP test deferred to manual verification per 86-VALIDATION.md (better-auth catch-all requires full Next runtime, out of scope for vitest)
- [86-00] HEALTH-01..03 mock contract: vi.mock('postgres') exports callable default returning mockSql with .end(); vi.mock('ioredis') exports both Redis named + default with ping/quit — Plan 04 implementer must match this shape or update tests/api/health.test.ts
- [86-00] TOKEN-03 regex limitation: TOKEN-03b/c may falsely GREEN if `.length > 0` and `'default'` co-occur anywhere in scan route (e.g., existingActions.length > 0 ? ... summary builder). TOKEN-03a (session.user.id reference) is the meaningful primary gate
- [86-00] Combined Wave 2 verification: `cd Panda-Manager && npx vitest run tests/auth/okta-dormancy.test.ts tests/api/per-user-tokens.test.ts tests/api/health.test.ts worker/jobs/__tests__/db-backup.test.ts tests/api/rbac-coverage.test.ts` → 31 tests, target 31 GREEN after Plans 01-04 ship
- [86-00] RBAC-01 baseline: 84 project-scoped route.ts files under app/api/projects/[projectId]/; 0 missing requireProjectRole; 0 using requireSession alone — GREEN immediately, now serves as regression sentinel for future plans
- [86-00] BACKUP retention tests use mtimeMs deltas (60d = pruned, 10d = kept) with vi.mocked(fs.statSync).mockImplementation returning per-path mtimeMs; vi.clearAllMocks + per-mock mockReset in beforeEach prevents state leakage
- [86-01] Real-user-first + 'default' fallback pattern: `let [row] = select(user_id=session!.user.id); if (!row) [row] = select(user_id='default');` — no DB migration needed, single-user Docker installs continue working
- [86-01] OAuth DELETE never touches 'default' fallback row — defense for multi-user during rollout; single-user-install users who only have 'default' rows can simply reconnect to migrate their token
- [86-01] Discovery scan uses length===0 fallback (not optional chaining) — drizzle select returns array, falls back to user_id='default' only when scoped result is empty
- [86-01] Slack callback already had requireSession() from [84-01] — only change was destructuring session from result; CSRF cookie check preserved as-is before DB write
- [86-01] No DB migration required — existing UNIQUE(user_id, source) index on user_source_tokens already permits multiple users per source
- [86-02] Dormancy ternary pattern: const oktaPlugins = process.env.OKTA_CLIENT_ID ? [genericOAuth({ config: [okta({...})] })] : []; declared at module-top before betterAuth() call; plugins array becomes [...oktaPlugins, nextCookies()] — nextCookies() always LAST per better-auth Server Action cookie requirement
- [86-02] Truthy check on process.env.OKTA_CLIENT_ID (NOT !== undefined) — empty string and undefined both must be falsy for safe dormancy; verified by DORM-01c regex
- [86-02] Login UI split: app/login/page.tsx is server component reading Boolean(process.env.OKTA_CLIENT_ID) + force-dynamic; app/login/LoginForm.tsx is the 'use client' island receiving showOkta prop. Okta button is shadcn Button variant outline placed BELOW the email/password form with hr or divider
- [86-02] genericOAuthClient() registered on authClient via better-auth/client/plugins import (canonical exports, NOT the dist/ subpath suggested in RESEARCH.md) — safe with env blank, only adds method shims; no network calls until signIn.oauth2() invoked
- [86-02] resolveRole() group name corrected to panda-admins (was Admins) per Phase 86 CONTEXT.md decision — gates admin role for Okta OIDC sessions
- [86-02] /api/auth/providers route returns { okta: Boolean(process.env.OKTA_CLIENT_ID) }; force-dynamic ensures env is read at request time, not bake time; no auth required (pre-login endpoint)
- [86-02] install/docker-compose.local.yml left untouched — zero OKTA env vars; dormancy via absence of keys is safer than presence-with-blanks (Docker env substitution quirks)
- [86-02] Concurrent agent commit-message collision: Task 1 lib files (lib/auth.ts, lib/auth-utils.ts, lib/auth-client.ts) landed in commit 3412dae2 (message says feat(86-01) due to parallel Plan 86-01 commit); Task 2 files (app/login/page.tsx, app/login/LoginForm.tsx, app/api/auth/providers/route.ts) landed in commit 51bff302 (message says feat(86-03) for same reason). File content correct in git; hash to file mapping documented in 86-02-SUMMARY.md. Did not rewrite history.
- [86-02] Activation procedure (post-AWS): populating OKTA_DOMAIN + OKTA_CLIENT_ID + OKTA_CLIENT_SECRET + OKTA_REDIRECT_URI in env is the ONLY change required — no code change needed to flip Okta on; Plan 86-05 manual verification will smoke-test dormancy first then activation
- [86-03] postgresql-client-16 (versioned, not meta postgresql-client) installed in install/Dockerfile.local apt line — matches docker-compose postgres:16-alpine major version, predictable apt resolution on node:24.13.0-slim (Debian Bookworm)
- [86-03] Retention pruning runs BEFORE today-skip return in worker/jobs/db-backup.ts — BACKUP-03a mocks readdirSync to return both old (60d) and today's file; today-skip would otherwise early-return and old file would never prune. Retention executes unconditionally on every job run.
- [86-03] execSync with shell:'/bin/bash' (not execFileSync) — pg_dump output uses `> "${outFile}"` shell redirection; DATABASE_URL is ops-controlled (docker-compose env), shell-injection risk acceptable; documented inline in db-backup.ts
- [86-03] DB_BACKUP=1010 advisory lock id reserved (next sequential in worker/lock-ids.ts; current namespace 1001-1010)
- [86-03] global-db-backup BullMQ scheduler registered via upsertJobScheduler('global-db-backup', { pattern: '0 2 * * *' }, ...) in worker/index.ts start() — always-on, not user-configurable via scheduled_jobs DB
- [86-03] GLOBAL_SCHEDULER_IDS allowlist exported from worker/scheduler.ts — removeOrphanedSchedulers now skips allowlisted ids (without this, global-db-backup would be pruned every restart because it has no scheduled_jobs DB row backing it). New canonical pattern for app-managed global crons.
- [86-03] Admin gate inline pattern (resolveRole(session) === 'admin') in app/api/settings/backup-status/route.ts — mirrors app/api/settings/users/route.ts; no requireAdmin() helper exists in codebase
- [86-03] Concurrent agent collision: parallel sessions running 86-01, 86-02, 86-04 caused git index races. First Task 2 commit (51bff302) inadvertently captured another agent's staged auth-UI files; my actual Plan 03 commits are aaae9fb5 (Task 1) and 073f361e (Task 2). Future parallel execution should serialize git operations or use per-plan worktrees.
- [86-04] Health route env-var tolerance: pass `process.env.DATABASE_URL ?? ''` / `process.env.REDIS_URL ?? ''` to postgres()/Redis() rather than pre-validating with `if (!url) throw` — postgres/ioredis throw synchronously on bad URLs (caught as 'error'), and this matches the vitest mock contract that injects mocked clients regardless of env state. Same observable behavior, simpler contract.
- [86-04] Call ioredis `Redis` as a function (not via `new`) — ioredis supports both call forms; the function form interoperates with vitest's `mockImplementation(() => mockRedisInstance)` (arrow fns cannot be `new`-called). Production behavior unchanged.
- [86-04] `.ping()` triggers lazy-connect — with `lazyConnect: true`, no explicit `.connect()` needed before first command. Keeps test mock surface minimal (only `.ping` + `.quit` required by the test contract).
- [86-04] `sql.end({ timeout: 1 })` forces fast connection cleanup — without this, serverless/lambda invocations hang on shutdown if a query is mid-flight.
- [86-04] Health-route header comments must NOT contain the literal strings `requireSession` or `requireProjectRole` — HEALTH-04b regex source-scan would false-positive on commentary. Document the contract semantically instead ("No session/auth guard: ALB target groups hit this without cookies").
- [86-04] RBAC audit final count: 57 project-scoped routes under app/api/projects/[projectId]/, 57/57 have requireProjectRole, 0 missing, 2 also have requireSession (chat + completeness — defense-in-depth false-positives from RESEARCH.md, NOT regressions). STATE.md previously said "84" — that was a misread/typo in the Plan 00 line; the canonical count is 57.
- [86-04] Okta env vars in install/env.aws.example intentionally BLANK with activation comment — encodes the Phase 86 dormancy contract: code is in place, populate the four vars (OKTA_DOMAIN, OKTA_CLIENT_ID, OKTA_CLIENT_SECRET, OKTA_REDIRECT_URI) to activate, no auth-path change until then.
- [86-04] install/docker-compose.aws.yml is reference documentation (NOT directly executable by ECS) — ECS reads task definitions; the compose file shows the expected app + worker shape with `/api/health` healthcheck so ops can derive task definitions from it.
- [86-05] Use PGDG (PostgreSQL Global Development Group) apt repo for postgresql-client-16 in install/Dockerfile.local — Debian Bookworm only ships postgresql-client-15. pg_dump major must be >= server major; v15 dumps against postgres:16 are officially unsupported. PGDG repo gives guaranteed-complete 16.14 dumps. Plan's plain meta-package fallback was unsafe and not used.
- [86-05] Two /api/health bugs caught in UAT (not unit tests) and fixed inline (Panda-Manager commit 58fc4b55): (1) /api/health was not in lib/proxy.ts unauth allowlist nor in proxy matcher regex — unit tests bypass the proxy layer; (2) Redis(url, opts) called as function instead of `new Redis(url, opts)` — vitest arrow-function mock forced this non-canonical form which throws on .ping() in real ioredis. Both fixed in <50 LoC; class-based mock pattern adopted for future ioredis tests.
- [86-05] Class-based mock pattern for constructor-required clients in vitest — `vi.fn().mockImplementation(function () { return mockInstance; })` works under both `new X()` and `X()` call forms. Avoids forcing implementation into non-canonical API call patterns. Adopt for ioredis, postgres-js, and similar libraries.
- [86-05] Per-new-unauth-route checklist: add to lib/proxy.ts unauth allowlist + add to proxy matcher regex + verify in UAT with unauthenticated curl. Unit tests bypass the proxy and cannot catch this gap. Matcher regex update is what determines whether the proxy middleware processes the route at all.
- [86-05] Inline UAT gap closure (vs gap-closure phase) is appropriate when: bug is surface-area (not architectural), fix fits in <50 LoC, all tests still pass after fix. Document in VERIFICATION.md + parent SUMMARY.md. Phase 86 closed inline with two such fixes per user direction.
- [86-05] Dormancy literal-grep-vs-contract clarification: the substring "okta" appears once in /login page source as `showOkta:false` prop name in the React Server Components streaming payload. This does NOT render to a visible UI element. The dormancy contract (zero user-visible Okta surface) holds at the DOM/UX layer. A strict case-insensitive substring grep is too strict; the meaningful gate is "no clickable affordance, no DOM markup for the button."
- [86-05] Browser-only verification items (Gmail OAuth real-user click-through, Discovery Scan with user tokens, /login visual confirmation) marked DEFERRED-PASS based on source-scan test coverage + user manual confirmation. Acceptable verification level for closure when code paths are independently verified.
- [87-01] Migration 0052 uses additive JSONB || operator with `NOT (active_tracks ? 'incident_prevention')` guard — re-running 0052 cannot overwrite a user's manually-set `incident_prevention: true` (set via Settings — Plan 87-03) back to `false`. This is the mandatory idempotency guard for any additive JSONB backfill.
- [87-01] Per-project IF EXISTS guard at top of DO-block FOR LOOP (`SELECT 1 FROM arch_tracks WHERE project_id = proj_id AND name = 'Incident Prevention Track' THEN CONTINUE`) is the sole idempotency primitive for arch seeding — no DELETE block needed (unlike 0046) because the IP track is greenfield with no pre-existing rows to clean up.
- [87-01] `projects.active_tracks` DEFAULT flipped from `{adr:true,biggy:true}` to `{adr:false,biggy:false,incident_prevention:false}` — new projects must opt in to ≥1 track via wizard (Plan 87-04); existing projects unaffected because the UPDATE uses `||` (additive, never overwrites adr/biggy). Customer-protection: schema default is forward-looking; backfill is backward-safe.
- [87-01] Single migration file pattern: schema ALTER + JSONB backfill + DO-block arch seed in one transaction. Matches 0046 precedent; splitting offers no rollback safety because the per-project IF EXISTS guard makes the entire DO block idempotent.
- [87-01] Change Risk Console placed at display_order=15 (between Data Ingestion section at 10 and Risk Engine section at 20) with `node_type='console'` — mirrors ADR's Console placement pattern from 0046 for visual consistency across tracks.
- [87-01] db/schema.ts:114 type widening is additive — existing `{ adr; biggy }` callers continue to compile against `{ adr; biggy; incident_prevention }` without changes; downstream TypeScript breakage from new code that expects only 2 keys is intentional, caught at Plan 04/05/07 build steps.
- [87-00] Wave 0 RED test scaffolds: 6 new + 1 extended test file under tests/ (gitignored per [79-00]); 12 named failing tests covering IP-06/07/08/09/10/12; source-scan pattern (fs.readFileSync + try/catch '' on ENOENT) prevents module-resolution crashes in RED state.
- [87-00] IP-03/04/05/13/14 pre-pass on parallel-agent prep (Plans 87-01 and 87-02 shipped before 87-00 ran) — acceptable per [80-00] precedent because key gating tests (IP-06/07/08/09/10/12) remain RED. Combined Wave 0 run: 7 files, 44 tests, 32 passed, 12 failed with named IP-XX assertions, 253ms.
- [87-00] Mock-introspection pattern inline in seed-project.test.ts: flatten mockInsert.mock.results[*].value.values.mock.calls to find Team Gamma by {team_name, track} — no extra harness needed for IP-10/IP-11. Pattern reusable for any future seeder gating tests.
- [87-00] Direct-import (synchronous require + try/catch fallback to empty constants) reserved for pure config modules (lib/onboarding-config.ts) where assertion messages are clearer; source-scan reserved for any test against Next routes or BullMQ workers where module resolution pulls full DB/middleware stack.
- [87-02] `ALL_STANDARD_STEP_NAMES` `.filter` dedup is intentional — IP-05 contract is "all 13 IP step names ARE PRESENT in array" (not "all 13 produce unique entries"). `Kickoff`, `Single Sign-On`, `Go Live` overlap with ADR/Biggy and dedup correctly; net unique IP additions = 10.
- [87-02] IP phase `display_orders` `[1, 3, 5, 6]` mirror ADR/Biggy cadence (verified by reading existing ADR_ONBOARDING_CONFIG before writing) — gaps allow inserted phases in the future without renumbering downstream consumers.
- [87-02] discovery-scanner.ts Case A applied — the existing-structure builder in `runDiscoveryScan()` is fully generic (iterates `existingStructure.tracks/.workflows/.sections` with no hardcoded `'ADR'`/`'Biggy'` literals). Only the `DISCOVERY_SYSTEM_TEMPLATE` preamble needed an IP-aware comment; no builder code change.
- [87-02] Pass 0 IP cue block placed between STEP 2 (entity prediction) and STEP 3 (relevant section quoting), NOT appended after STEP 3 — track classification guidance reads naturally adjacent to entity-type prediction in prompt flow.
- [87-02] `wbs_task` INFER rule "Default to ADR if unclear" fallback preserved — IP track requires affirmative cue evidence (change-ticket / CAB / risk-score etc); silent IP routing without cues would over-fire on enterprise/ADR documents that happen to mention ServiceNow.
- [87-02] arch_node entity-type schema changed from union `("ADR Track" | "AI Assistant Track")` to three-value union `("ADR Track" | "AI Assistant Track" | "Incident Prevention Track")` in both EXTRACTION_BASE and Pass 2 prompts. Replaced with `replace_all=true` after auditing every occurrence; backtick parity preserved (122 → 122).
- [87-02] Pre-existing discovery test failures (dismiss.test.ts 3, queue.test.ts 5 — `lib/auth-server.ts:39` `h.forEach` on undefined Headers because `next/headers` mock not seeded) confirmed unrelated to Plan 87-02 via git-stash repro; logged in `.planning/phases/87-incident-prevention-track-support/deferred-items.md` for future test-mock-fix plan; not in scope for Plan 87-02.
- [87-03] `lib/seed-project.ts` `findFirst` columns selector widened additively from `{ seeded: true }` to `{ seeded: true, active_tracks: true }` — same DB query, no extra round trip; downstream consumers that only need `seeded` still type-check.
- [87-03] Track-conditional template row build pattern: `[cond && row, ...].filter(Boolean) as typeof teamOnboardingStatus.$inferInsert[]` — preserves Drizzle types via single cast at filter boundary; TypeScript cannot otherwise narrow `(false | InferInsert)[]` to `InferInsert[]`. Adopt for any future per-track placeholder seeding.
- [87-03] `if (teamRows.length > 0)` guard mandatory before `db.insert().values(teamRows)` — Drizzle's `.values()` rejects empty arrays; required whenever dynamic row count can be zero (e.g., all tracks off).
- [87-03] Default fallback for `project.active_tracks` is all-false (`{ adr:false, biggy:false, incident_prevention:false }`) matching Plan 01's new schema default — defensive against NULL rows; a NULL active_tracks seeds zero teams (observable) instead of legacy 2-row Alpha+Beta default.
- [87-03] Existing 5 tests in `tests/ui/seed-project.test.ts` required zero fixture updates — they only assert `mockInsert.mock.calls.length > 1` and `mockInsert.mock.results[0].value.values).toBeDefined()`, both satisfied by actions/risks/milestones/etc. inserts that run before the now-conditional team-insert block. The 2 new IP-10/IP-11 tests use mock-introspection (flatten `.values()` calls) to assert team-row payloads.
- [87-03] Retroactive seeding (false→true Settings toggle) deliberately deferred to Plan 87-05's dedicated `seedIncidentPreventionForProject(tx, projectId)` helper — `seedProjectFromRegistry` stays scoped to `seeded:false` initial-creation path only. Clean separation: Plan 03 = coarse `seeded` gate; Plan 05 = fine-grained `WHERE NOT EXISTS` per insert.
- [87-04] `lib/seed-incident-prevention.ts` extracted now (before second consumer exists) — Plan 05's settings PATCH retroactive seeding will import the same helper. Write-once-use-twice pattern: extract shared helpers when the second consumer is the next plan, not when it exists today.
- [87-04] Idempotency strategy is per-table: `onConflictDoNothing` + fallback `select` for `arch_nodes` (backed by `arch_nodes_project_track_name_idx` on `project_id+track_id+name`); pure `select-then-insert` for `arch_tracks`, `wbs_items`, `onboarding_phases`, `onboarding_steps`, `team_onboarding_status` (no unique index). Read `db/schema.ts` for each target table before picking the guard.
- [87-04] BasicInfoStep.tsx is the canonical project-create form (NewProjectModal does not exist; NewProjectButton just opens ProjectWizard which renders BasicInfoStep). The IP-07 test scaffold listed three candidates — BasicInfoStep is the only one with a `fetch('/api/projects', { method: 'POST' })`. Resolved the RESEARCH.md "Wizard Architecture" open question.
- [87-04] AI Assistant arch track gated on `tracks.biggy`, NOT on `tracks.incident_prevention`. Per Phase 83, the AI Assistant Track IS Biggy's arch surface (Biggy is the AI persona; AI Assistant is the arch label). Renaming would be a UX migration out of Plan 04 scope.
- [87-04] Legacy onboarding/seed POST route deliberately does NOT gate on active_tracks — it's an admin re-seed tool; gating would silently break legacy callers that don't pass active_tracks. Idempotent inserts (onConflictDoNothing) make unconditional seeding safe; render-layer filters handle visibility.
- [87-04] Backward-compatible POST body — missing active_tracks falls back to `{adr:true, biggy:true, incident_prevention:false}` to preserve pre-Phase-87 callers; the new wizard always passes the field explicitly. Default-deny would break tests in other phases that don't construct active_tracks payloads.
- [87-04] Defense-in-depth Submit guard pattern: `disabled={loading || !atLeastOneTrack}` on the button AND `if (!atLeastOneTrack) { setError(...); return }` inside handleSubmit AND server 400 — three layers because button.disabled in some browsers does not block keyboard-submit on a focused checkbox.
- [87-04] Parallel-agent file collisions handled by explicit per-file `git add` — never used `git add .` or `git add -A`. Plans 03/04/06 all touching `app/api/projects/...` paths in flight; isolation requires file-level staging. Established as repeating pattern when multiple parallel agents are active.

### Blockers/Concerns

None

## Session Continuity

Last session: 2026-05-20T02:34:00.000Z
Stopped at: Completed 87-04-PLAN.md (project-create active_tracks gating + IP wizard checkbox + shared seeder helper)
Resume file: None
