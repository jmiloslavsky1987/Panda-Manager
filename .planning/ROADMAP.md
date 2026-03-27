# Roadmap: BigPanda AI Project Management App

## Overview

This is a full rewrite of a working 8-phase local app — switching from Google Drive + React/Vite/Express to PostgreSQL + Next.js 14 App Router, while extending the system to include 15 AI skills, 6 scheduled background jobs, a full 9-tab project workspace, cross-project intelligence, and a Project Plan & Task Builder. The build is strictly sequential for Phases 1–5 (each phase is blocked on its predecessor), then Phases 6 and 7 can overlap, with Phase 8 closing out cross-project features that need accumulated data to be useful. Every phase delivers a complete, independently verifiable capability — not a horizontal technical layer.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Data Foundation** - PostgreSQL schema, migrations, YAML round-trip, DataService, RLS, append-only triggers, singleton pool, Settings (completed 2026-03-19)
- [x] **Phase 2: App Shell + Read Surface** - Next.js scaffold, Dashboard, all 9 workspace tabs (read-only), RSC data loading (completed 2026-03-19)
- [x] **Phase 3: Write Surface + Plan Builder** - Inline CRUD on all workspace tabs, PA3 xlsx dual-write, Project Plan & Task Builder (completed 2026-03-20)
- [x] **Phase 4: Job Infrastructure** - BullMQ worker process, JobService, Redis, cron schedule registration, job status UI (completed 2026-03-20)
- [x] **Phase 5: Skill Engine** - SkillOrchestrator, token budget guard, SSE streaming, Drafts Inbox, Output Library, first 5 skills wired (completed 2026-03-23)
- [x] **Phase 5.1: Onboarding Dashboard** [INSERTED] - Replace Overview tab with dynamic onboarding status dashboard; new onboarding_phases, onboarding_steps, integrations tables; YAML round-trip (completed 2026-03-23)
- [x] **Phase 5.2: Time Tracking** [INSERTED] - 12th workspace tab; time_entries table; add/edit/delete entries; CSV export (completed 2026-03-23)
- [x] **Phase 6: MCP Integrations** - MCPClientPool, Slack/Gmail/Glean/Drive connections, Customer Project Tracker fully wired (completed 2026-03-24)
- [x] **Phase 7: File Generation + Remaining Skills** - FileGenerationService (.docx/.pptx/.xlsx/.html), 11 remaining skills wired (completed 2026-03-24)
- [x] **Phase 8: Cross-Project Features + Polish** - FTS, risk heat map, cross-account watch list, Knowledge Base, Drafts send/discard flow (completed 2026-03-25)
- [x] **Phase 9: MCP Injection Fix** - Wire MCPClientPool into all 4 skill job handlers; closes INT-MCP-01 from v1.0 audit (completed 2026-03-25)
- [x] **Phase 10: FTS Expansion + Code Polish** - FTS coverage for 4 missing tables, skill path setting wired, /skills/custom link fixed; closes INT-FTS-01/INT-SET-01/INT-UI-01 (completed 2026-03-25)
- [x] **Phase 11: Health Score Wire** - workstream.percent_complete feeds computeHealth(); closes PLAN-09 gap (completed 2026-03-25)
- [x] **Phase 12: Complete Workspace Write Surface** - Artifacts tab, Decisions write UI, Architecture inline edit, Teams percent_complete edit (completed 2026-03-25)
- [x] **Phase 13: Skill UX + Draft Polish** - Contextual skill launch buttons, draft editing, search date filter, plan template library (completed 2026-03-25)
- [x] **Phase 14: Time + Project Analytics** - Time entry rollup, action velocity, risk trends, capacity planning view (completed 2026-03-25)
- [x] **Phase 15: Scheduler + UI Fixes** - Fix morning-briefing/weekly-customer-status scheduler registration, apply resolveSkillsDir() to 3 handlers, fix search filter for 4 new FTS tables (YAML export deferred to future phase) (completed 2026-03-26)
- [x] **Phase 16: Verification Retrofit** - Retroactive VERIFICATION.md for phases 01, 04, 05, 05.2, 06; closes 31 orphaned requirements (completed 2026-03-26)

### v2.0 — AI Ingestion & Enhanced Operations

- [ ] **Phase 17: Schema Extensions** - 8 new DB tables (discovery_items, audit_log, business_outcomes, e2e_workflows, focus_areas, architecture_integrations, before_state, team_onboarding_status); extend time_entries, artifacts, scheduled_jobs (2/3 plans complete)
- [x] **Phase 18: Document Ingestion** - File upload (PDF/DOCX/PPTX/XLSX/MD/TXT), Claude extraction, structured preview, approve/edit/reject per item, conflict detection, source attribution, incremental dedup (completed 2026-03-26)
- [ ] **Phase 19: External Discovery Scan** - Manual + scheduled MCP scan (Slack/Gmail/Glean/Gong), Claude analysis, Review Queue UI, approve/dismiss flow, conflict diff view, dismissal history
- [x] **Phase 20: Project Initiation Wizard** - Guided new-project wizard (7 steps): project creation, collateral upload + ingestion pipeline, extraction preview, manual fill, time tracking config, completeness score, launch (completed 2026-03-27)
- [ ] **Phase 21: Teams Tab + Architecture Tab** - Full DB-powered 5-section Team Engagement Map view; full DB-powered 2-tab Workflow Diagram; inline edit for all sections; skill exports updated to read from DB
- [ ] **Phase 22: Source Badges + Audit Log** - Source attribution badges on all workspace tab records (Manual/Ingested/Discovered); audit_log writes on all data mutations; deletion confirmation dialog
- [ ] **Phase 23: Time Tracking Advanced** - Approval workflow, Google Calendar OAuth import, admin config (capacity/categories/exemptions), bulk operations, submission reminders, export with audit fields
- [ ] **Phase 24: Scheduler Enhanced** - Create Job wizard (all 12 skills), configurable frequency/timezone/skill-params, enable/disable, run history log, failure notifications, Scheduler sidebar link

## Phase Details

### Phase 1: Data Foundation
**Goal**: The PostgreSQL database exists with all domain tables, enforced data integrity rules, seed data imported from existing context docs, and a YAML export utility that is round-trip safe with Cowork skills — every subsequent phase builds on this foundation with confidence.
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, SET-01, SET-02, SET-03, SET-04
**Success Criteria** (what must be TRUE):
  1. All three existing customer context docs are importable via migration script and their data is queryable in PostgreSQL with source tracing preserved
  2. Exporting any project back to YAML produces a file that is byte-for-byte stable on re-import (round-trip test passes with js-yaml settings: sortKeys: false, lineWidth: -1, JSON_SCHEMA)
  3. Any attempted UPDATE or DELETE on engagement_history or key_decisions raises a PostgreSQL exception — not an application error, a DB-level rejection
  4. Opening the app with two active projects never returns rows from project B when querying project A (RLS enforced; missing project_id filter is an empty result, not wrong data)
  5. Settings UI reads and writes workspace path, skill file path, schedule times, and API key without touching code or .env
**Plans**: 6 plans

Plans:
- [x] 01-01-PLAN.md — Wave 0: Test scaffolding (all test stubs + tsx install)
- [x] 01-02-PLAN.md — Wave 1: Next.js scaffold, Drizzle schema (13 tables), singleton pool, append-only triggers, RLS (migration pending PostgreSQL setup)
- [x] 01-03-PLAN.md — Wave 1: Settings service (lib/settings.ts) and API route
- [x] 01-04-PLAN.md — Wave 2: YAML export utility and DataService outputs idempotency
- [x] 01-05-PLAN.md — Wave 3: Migration script — YAML import (KAISER, AMEX, Merck stub)
- [x] 01-06-PLAN.md — Wave 4: Migration script — xlsx supplement (all 5 sheets)

### Phase 2: App Shell + Read Surface
**Goal**: The Next.js app is running with a working Dashboard showing auto-derived health for all active projects, and all 9 workspace tabs render live data from PostgreSQL — the daily driver is usable for read-only work before any write surface exists.
**Depends on**: Phase 1
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-06, DASH-07, DASH-08, WORK-01, WORK-03, WORK-04, WORK-05, WORK-06, WORK-07, WORK-08, WORK-09
**Success Criteria** (what must be TRUE):
  1. Dashboard shows a health card per active project with auto-derived RAG status (overdue actions + stalled milestones + unresolved high risks) — no manual RAG entry required
  2. Navigating to any of the 9 workspace tabs (Overview, Actions, Risks, Milestones, Teams, Architecture, Decisions, Engagement History, Stakeholders) displays live data from PostgreSQL with no console errors
  3. Recent Activity Feed on the Dashboard shows skill runs, file outputs, and history entries from the last 7 days
  4. In-app notification badge appears for overdue actions and approaching go-live dates (within 14 days)
  5. Quick Action Bar buttons are visible and correctly scoped per active account (buttons are present; they do not yet fire skills)
**Plans**: 7 plans

Plans:
- [x] 02-01-PLAN.md — Wave 0: Playwright E2E test stubs for all Phase 2 behaviors (completed 2026-03-19)
- [x] 02-02-PLAN.md — Wave 1: shadcn/ui install + app shell (layout, sidebar, DB query library)
- [x] 02-03-PLAN.md — Wave 2: Dashboard page — health cards, activity feed, quick actions, notification badge
- [x] 02-04-PLAN.md — Wave 2: Workspace layout — project header, 9-tab navigation bar, redirect
- [x] 02-05-PLAN.md — Wave 3: Workspace tabs group A — Overview, Actions, Risks, Milestones, Teams
- [x] 02-06-PLAN.md — Wave 3: Workspace tabs group B — Architecture, Decisions, History, Stakeholders + Add Notes modal
- [x] 02-07-PLAN.md — Wave 4: Human verification checkpoint

### Phase 3: Write Surface + Plan Builder
**Goal**: All workspace tabs support inline editing with optimistic UI, every action save atomically syncs to PA3_Action_Tracker.xlsx, and the Project Plan & Task Builder (Phase Board, Task Board, Gantt, swimlane, templates, Excel import/export) is fully operational.
**Depends on**: Phase 2
**Requirements**: WORK-02, PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05, PLAN-06, PLAN-07, PLAN-08, PLAN-09, PLAN-10, PLAN-11
**Success Criteria** (what must be TRUE):
  1. Completing, editing, or adding notes to any action in the Actions tab immediately reflects in both the database and the PA3_Action_Tracker.xlsx file — opening the xlsx in Excel shows the updated row
  2. Adding a new risk, mitigation entry, stakeholder, or engagement history entry from the workspace UI persists to PostgreSQL; engagement_history and key_decisions are append-only (no edit/delete option in UI)
  3. A task created in the Task Builder appears on the Phase Board (Kanban) and Gantt Timeline; dragging a card between phases updates its phase assignment
  4. Importing a .xlsx project plan (KAISER_Biggy_Project_Plan format) populates tasks, and exporting produces a file with matching column headers
  5. Task completion rolls up to workstream percent_complete and the project health score updates accordingly
**Plans**: 9 plans

Plans:
- [x] 03-01-PLAN.md — Wave 0: E2E test stubs for all Phase 3 behaviors (RED baseline)
- [x] 03-02-PLAN.md — Wave 0: Schema migration (4 columns) + queries.ts update + package installs
- [x] 03-03-PLAN.md — Wave 1: Action editing modal + PATCH /api/actions/:id + xlsx dual-write (WORK-02)
- [x] 03-04-PLAN.md — Wave 1: Risk/Milestone/Stakeholder edit modals + API routes
- [x] 03-05-PLAN.md — Wave 2: Plan Builder tab shell — WorkspaceTabs 10th tab, nested layout, PlanTabs nav
- [x] 03-06-PLAN.md — Wave 2: Phase Board + Task Board + task CRUD + bulk ops + import/export
- [x] 03-07-PLAN.md — Wave 3: Gantt Timeline — frappe-gantt wrapper, task mapping, dependency arrows
- [x] 03-08-PLAN.md — Wave 3: Swimlane view — workstream rows, percent_complete bars, drag-to-update-status
- [x] 03-09-PLAN.md — Wave 4: E2E green pass + human verification checkpoint

### Phase 4: Job Infrastructure
**Goal**: A dedicated BullMQ worker process runs persistently alongside Next.js, all 6 scheduled jobs are registered with correct cron schedules and advisory locking, and job status is queryable from the UI — the scheduled intelligence platform is ready for skills to be wired in Phase 5.
**Depends on**: Phase 3
**Requirements**: SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05, SCHED-06, SCHED-07, SCHED-08
**Success Criteria** (what must be TRUE):
  1. Running `npm run dev` starts both the Next.js server and the BullMQ worker process; restarting Next.js does not kill the worker and does not cause duplicate job registrations
  2. All 6 scheduled jobs appear in a job status UI panel with their next-run time and last-run status (pending/running/completed/failed)
  3. Manually triggering a no-op test job from the UI produces a completed job record in the database with correct timestamps
  4. Schedule times for all 6 jobs are configurable in Settings and take effect without a code deploy or server restart
  5. Two jobs scheduled to overlap cannot run simultaneously — the second job logs "skipped: advisory lock held" rather than starting a concurrent run
**Plans**: 5 plans

Plans:
- [ ] 04-01-PLAN.md — Wave 1: E2E test stubs for all Phase 4 behaviors (RED baseline)
- [ ] 04-02-PLAN.md — Wave 2: Package installs + settings-core.ts + Redis connection + lock IDs + job_runs schema + migration
- [ ] 04-03-PLAN.md — Wave 3: BullMQ worker entry point + scheduler registration + 6 no-op job handlers
- [ ] 04-04-PLAN.md — Wave 3: /settings Jobs tab UI + API routes + Sidebar Settings link (parallel with 04-03)
- [ ] 04-05-PLAN.md — Wave 4: E2E green pass + human verification checkpoint

### Phase 5: Skill Engine
**Goal**: The SkillOrchestrator is operational and cleanly separated from Route Handlers, streaming skills to the browser via SSE with a token budget guard in place, a Drafts Inbox gating all outbound AI content, and the five highest-value skills (Weekly Customer Status, Meeting Summary, Morning Briefing, Context Updater, Handoff Doc Generator) fully wired and producing correct output.
**Depends on**: Phase 4
**Requirements**: SKILL-01, SKILL-02, SKILL-03, SKILL-04, SKILL-11, SKILL-12, SKILL-13, SKILL-14, DASH-09, OUT-01, OUT-02, OUT-03, OUT-04
**Success Criteria** (what must be TRUE):
  1. Running any skill from the Skill Launcher streams output to the browser in real-time; navigating away mid-stream and returning shows the completed output retrieved from the database (no duplicate run triggered)
  2. The token budget guard logs estimated input token count before every Claude call and truncates context if over the budget threshold — no single skill call can silently consume more than the configured token ceiling
  3. SKILL.md files are read from disk at invocation time; changing a SKILL.md file takes effect on the next skill run without restarting the app; missing SKILL.md files disable the skill in the UI with a human-readable error
  4. All AI-generated emails and Slack drafts appear in the Drafts Inbox before any external action — no AI content bypasses this queue
  5. The Output Library shows all generated skill outputs filterable by account, skill type, and date range; HTML outputs render inline; .docx and .pptx show open-with-system-app links
**Plans**: 6 plans

Plans:
- [x] 05-01-PLAN.md — Wave 0: SDK install + DB schema (skill_runs, skill_run_chunks, drafts) + migration SQL + SKILL.md stubs + E2E stubs
- [x] 05-02-PLAN.md — Wave 1: SkillOrchestrator + skill-context assembler + BullMQ skill-run handler + dispatch map
- [x] 05-03-PLAN.md — Wave 2: Skills tab UI (11th tab) + skill run page (SSE) + trigger API + SSE stream API
- [x] 05-04-PLAN.md — Wave 2: Drafts Inbox on Dashboard + Output Library page + outputs API + sidebar link (parallel with 05-03)
- [x] 05-05-PLAN.md — Wave 3: Wire 5 skill handlers + getSkillRuns query + getLatestMorningBriefing query
- [x] 05-06-PLAN.md — Wave 4: E2E green pass + human verification checkpoint

### Phase 5.1: Onboarding Dashboard [INSERTED]
**Goal**: The Overview tab is replaced with a dynamic onboarding status dashboard matching the Vanguard ADR/IA design — showing onboarding phases/steps with filter/search, integration tracker, risks, milestones, and executive summary, all drawn from live PostgreSQL data and fully editable in-app, with YAML round-trip sync.
**Depends on**: Phase 5
**Requirements**: OVER-01, OVER-02, OVER-03, OVER-04
**Success Criteria** (what must be TRUE):
  1. Navigating to any customer Overview tab shows the onboarding dashboard with phases/steps, integration tracker, risk cards, milestone timeline, and progress ring — all data live from PostgreSQL, not hardcoded
  2. Clicking a step's status badge cycles it (not-started → in-progress → complete → blocked); the change persists to DB immediately; an update note can be appended
  3. Integration tracker cards show the 4-stage pipeline bar correctly for each tool; status and notes are editable inline
  4. Running the migration script against a context doc that has `onboarding_phases` and `integrations` YAML sections imports the data; saving an edit in-app writes back to the YAML file
**Plans**: 6 plans

Plans:
- [ ] 05.1-01-PLAN.md — Wave 0: E2E test stubs for all Phase 5.1 behaviors (RED baseline)
- [ ] 05.1-02-PLAN.md — Wave 1: DB schema (3 new tables + 2 enums) + migration SQL 0005
- [ ] 05.1-03-PLAN.md — Wave 2: Onboarding + integrations API routes (GET + PATCH)
- [ ] 05.1-04-PLAN.md — Wave 2: OnboardingDashboard client component + replace overview page (parallel with 03)
- [ ] 05.1-05-PLAN.md — Wave 3: YAML import script + yaml-export POST route (OVER-04)
- [ ] 05.1-06-PLAN.md — Wave 4: E2E green pass + human verification checkpoint

### Phase 5.2: Time Tracking [INSERTED]
**Goal**: Every customer workspace has a dedicated Time tab for logging hours against a project; entries are viewable, editable, and exportable as CSV.
**Depends on**: Phase 5 (can be built in parallel with 5.1)
**Requirements**: TIME-01, TIME-02, TIME-03
**Success Criteria** (what must be TRUE):
  1. The Time tab (12th workspace tab) shows a table of all time entries for the project with total hours displayed in the header
  2. Clicking "Log Time" opens a modal; submitting with date, hours (decimal accepted), and description creates a new entry immediately visible in the table
  3. Entries can be edited and deleted; exporting produces a valid CSV file with columns: date, hours, description, project name
**Plans**: 5 plans

Plans:
- [ ] 05.2-01-PLAN.md — Wave 0: Playwright E2E stubs for TIME-01, TIME-02, TIME-03 (RED baseline)
- [ ] 05.2-02-PLAN.md — Wave 1: DB schema (timeEntries table) + migration SQL 0006
- [ ] 05.2-03-PLAN.md — Wave 2: API routes — GET/POST time-entries + PATCH/DELETE time-entries/[entryId]
- [ ] 05.2-04-PLAN.md — Wave 2: WorkspaceTabs 12th tab + RSC page + TimeTab client component + TimeEntryModal (parallel with 03)
- [ ] 05.2-05-PLAN.md — Wave 3: E2E green pass + human verification checkpoint

### Phase 6: MCP Integrations
**Goal**: MCPClientPool is initialized once at server startup with Slack, Gmail, Glean, and Drive connections, and the Customer Project Tracker skill performs live sweeps of Gmail and Slack for the last 7 days, updates the actions table, and syncs to PA3_Action_Tracker.xlsx — the highest-value scheduled job is fully operational.
**Depends on**: Phase 5
**Requirements**: SKILL-10, DASH-04, DASH-05
**Success Criteria** (what must be TRUE):
  1. Running Customer Project Tracker for one account fetches real Gmail threads and Slack messages from the last 7 days and produces a structured report with new/updated actions written to the database
  2. MCPClientPool is a single shared instance — running Customer Project Tracker for all active accounts sequentially does not create a new MCP client connection per account
  3. The cross-project Risk Heat Map on the Dashboard displays risks from all active accounts on a probability-by-impact matrix with no data from archived projects leaking in
  4. The Cross-Account Watch List on the Dashboard shows escalated and time-sensitive items that span multiple active customer accounts
**Plans**: 7 plans

Plans:
- [ ] 06-01-PLAN.md — Wave 0: E2E test stubs for all Phase 6 behaviors (RED baseline)
- [ ] 06-02-PLAN.md — Wave 1: DASH-04 Risk Heat Map + DASH-05 Cross-Account Watch List (parallel)
- [ ] 06-03-PLAN.md — Wave 1: Settings schema + MCPClientPool config registry (parallel with 02)
- [ ] 06-04-PLAN.md — Wave 2: Settings UI MCP Servers tab + mcp-test endpoint
- [ ] 06-05-PLAN.md — Wave 3: SkillOrchestrator MCP extension (beta.messages.stream branch)
- [ ] 06-06-PLAN.md — Wave 4: SKILL-10 Customer Project Tracker — SKILL.md + handler + registration
- [ ] 06-07-PLAN.md — Wave 5: E2E activation + human verification checkpoint

### Phase 7: File Generation + Remaining Skills
**Goal**: FileGenerationService produces Office-compatible .docx, .pptx, .xlsx, and self-contained .html files, and all 10 remaining AI skills (ELT External/Internal Status, Team Engagement Map, Workflow Diagram, Meeting Summary, Handoff Doc Generator, and AI-assisted plan generation) are wired and producing files that open without corruption in Microsoft Office. *(Note: SKILL-09 Biggy Weekly Briefing deferred to v2.)*
**Depends on**: Phase 5 (can overlap with Phase 6)
**Requirements**: SKILL-05, SKILL-06, SKILL-07, SKILL-08, PLAN-12, PLAN-13
**Success Criteria** (what must be TRUE):
  1. Running ELT External Status for any account produces a .pptx file that opens without a corruption dialog in Microsoft PowerPoint and uses confidence-framed, partnership-tone language with no internal severity language
  2. Running Meeting Summary produces a .docx that opens without corruption in Microsoft Word and registers a new entry in the account's engagement history
  3. ~~Biggy Weekly Briefing produces three outputs in one run~~ *(SKILL-09 deferred to v2)*
  4. AI-assisted plan generation proposes a task list for the next 2 weeks scoped to the current phase and open blockers — proposed tasks require human approval before committing to the database
  5. Regenerating any output archives the old file and registers the new one in the Output Library; the old file remains accessible under an "archived" filter
**Plans**: 7 plans

Plans:
- [ ] 07-01-PLAN.md — Wave 0: E2E Playwright stubs + vitest install + vitest unit stubs
- [ ] 07-02-PLAN.md — Wave 1: FileGenerationService (lib/file-gen/types, pptx, html, index)
- [ ] 07-03-PLAN.md — Wave 1: 4 SKILL.md files + WIRED_SKILLS update + "Open in app" button (parallel)
- [ ] 07-04-PLAN.md — Wave 2: skill-run.ts FILE_SKILLS extension + docx install
- [ ] 07-05-PLAN.md — Wave 3: PLAN-12 generate-plan API + AiPlanPanel + board page
- [ ] 07-06-PLAN.md — Wave 3: PLAN-13 sprint-summary API + SprintSummaryPanel + migration 0007 (parallel)
- [ ] 07-07-PLAN.md — Wave 4: E2E activation + human verification checkpoint

### Phase 8: Cross-Project Features + Polish
**Goal**: Full-text search spans all structured records across all projects, the Knowledge Base is searchable and linkable, and all cross-project dashboard panels are live with data — the app functions as a complete portfolio-level intelligence layer.
**Depends on**: Phases 6 and 7
**Requirements**: KB-01, KB-02, KB-03, SRCH-01, SRCH-02, SRCH-03
**Success Criteria** (what must be TRUE):
  1. Searching for any term from the global search bar returns matching records from actions, risks, decisions, engagement history, stakeholders, tasks, and knowledge base across all projects — each result shows which project and section it came from
  2. Search results are filterable by account, date range, and data type — filtering by account returns only that account's records
  3. Knowledge Base entries can be created, linked to a specific risk or engagement history entry, and carry source_trace (which project, which event, date captured); entries from archived projects remain searchable
  4. Knowledge Base entries appear in global search results and are linkable from risk and engagement history records
**Plans**: 7 plans

Plans:
- [ ] 08-01-PLAN.md — Wave 1: E2E test stubs for all Phase 8 behaviors (RED baseline)
- [ ] 08-02-PLAN.md — Wave 2: DB migration 0008 — FTS tsvector columns, GIN indexes, triggers, KB link columns
- [ ] 08-03-PLAN.md — Wave 3: Search API (GET /api/search) + searchAllRecords() query function (parallel)
- [ ] 08-04-PLAN.md — Wave 3: Knowledge Base API (GET/POST /api/knowledge-base + PATCH/DELETE /[id]) (parallel)
- [ ] 08-05-PLAN.md — Wave 4: Search UI — SearchBar in layout + /search results page with filter panel (parallel)
- [ ] 08-06-PLAN.md — Wave 4: Knowledge Base UI — /knowledge-base page + AddKbEntryModal + KnowledgeBaseEntry card (parallel)
- [ ] 08-07-PLAN.md — Wave 5: E2E activation + human verification checkpoint

### Phase 9: MCP Injection Fix
**Goal**: All three MCP-dependent skill job handlers (morning-briefing, context-updater, weekly-customer-status) and the generic skill-run handler correctly inject MCP servers before invoking the orchestrator — no skill silently runs without its declared MCP context.
**Depends on**: Phase 8
**Requirements**: SKILL-01, SKILL-03, SKILL-04, SKILL-11, SKILL-12
**Gap Closure**: Closes INT-MCP-01, FLOW-MCP-01, FLOW-MCP-02 from v1.0 audit
**Success Criteria** (what must be TRUE):
  1. Morning Briefing, Context Updater, and Weekly Customer Status job handlers all call `MCPClientPool.getServersForSkill(skillName)` before `orchestrator.run()` — confirmed by code inspection and test
  2. The generic `skill-run.ts` handler (UI-triggered) also injects MCP servers when the skill has a declared mapping in `SKILL_MCP_MAP`
  3. Skills without MCP mappings are unaffected — no regression on skills that run without MCP
  4. MCP injection matches the pattern already working in `customer-project-tracker.ts`
**Plans**: 2 plans

Plans:
- [x] 09-01-PLAN.md — Wave 1: Test scaffold (mcp-injection.test.ts — RED baseline for SKILL-01/03/04/11/12 + non-MCP regression)
- [x] 09-02-PLAN.md — Wave 2: Fix all 4 handlers (add MCPClientPool import + getServersForSkill call) + human verification checkpoint

### Phase 10: FTS Expansion + Code Polish
**Goal**: Full-text search covers all 12 project-scoped tables including Phase 5.1 and 5.2 additions; the skill file path setting is actually honored; and the orphaned /skills/custom navigation link is fixed.
**Depends on**: Phase 8
**Requirements**: SRCH-01, SET-02
**Gap Closure**: Closes INT-FTS-01, INT-SET-01, INT-UI-01, FLOW-SRCH-01 from v1.0 audit
**Success Criteria** (what must be TRUE):
  1. Searching for a term that appears in an onboarding step owner or integration note returns results from those tables in the global search page
  2. Searching for a time entry description returns that entry in search results
  3. skill-run.ts reads the SKILL.md file path from `settings.skill_files_path` when set, falling back to the default path when not configured
  4. Clicking the /skills/custom link no longer returns a 404 — link is removed or redirected
**Plans**: 2 plans

Plans:
- [ ] 10-01-PLAN.md — Wave 1: Migration 0009 (search_vec + GIN + trigger for 4 tables) + searchAllRecords() UNION ALL arms + SET-02 skill path fix + /skills/custom link fix
- [ ] 10-02-PLAN.md — Wave 2: E2E green pass + human verification checkpoint

### Phase 11: Health Score Wire
**Goal**: Task completion in the Plan Builder propagates all the way to the Dashboard health card — completing tasks in a workstream lowers the health risk score when workstreams fall behind, making the health card a true reflection of delivery progress.
**Depends on**: Phase 8
**Requirements**: PLAN-09
**Gap Closure**: Closes PLAN-09 gap confirmed in Phase 03 VERIFICATION.md
**Success Criteria** (what must be TRUE):
  1. A workstream with 0% completion on active tasks contributes a negative signal to computeHealth() — the health score for a project with no task progress is lower than one with 100% complete workstreams
  2. The Dashboard health card RAG status reflects task progress within 1 reload of completing tasks
  3. No regression on existing health signals (overdue actions, stalled milestones, high risks still factor in)
**Plans**: 1 plan

Plans:
- [ ] 11-01-PLAN.md — Wave 1: Wire workstreams.percent_complete into computeHealth() + update health card test

### Phase 12: Complete Workspace Write Surface
**Goal**: Every workspace tab that was built read-only in Phase 2 now has a working write surface — Artifacts get their own tab, Decisions can be appended to, Architecture can be edited inline, and Teams shows editable workstream progress.
**Depends on**: Phase 3
**Requirements**: (new capability — no existing REQ-IDs; extends WORK-* coverage)
**Success Criteria** (what must be TRUE):
  1. Artifacts tab lists all project artifacts (X-NNN format) with name, status, owner, and linked milestone; new artifacts can be created and edited
  2. Decisions tab has an "Add Decision" button that opens a modal and appends a new key_decision record — the decision appears in the append-only timeline immediately
  3. Architecture tab allows inline editing of workstream state, lead name, and description — saves persist to DB
  4. Teams tab shows workstream.percent_complete as an editable progress bar; updating it saves to DB and triggers a health score recalculation
  5. All "available in Phase 3" placeholder banners are removed
**Plans**: 4 plans

Plans:
- [x] 12-01-PLAN.md — Wave 0: E2E test stubs for all Phase 12 behaviors (RED baseline) (completed 2026-03-25)
- [ ] 12-02-PLAN.md — Wave 1: Artifacts tab — DB API routes + ArtifactEditModal + 13th workspace tab
- [ ] 12-03-PLAN.md — Wave 2: Decisions "Add Decision" modal + Architecture inline edit + Teams percent_complete edit + stale banner cleanup
- [ ] 12-04-PLAN.md — Wave 3: E2E green pass + human verification checkpoint

### Phase 13: Skill UX + Draft Polish
**Goal**: Skills are launchable directly from the workspace context where they're most relevant, drafts are editable before sending, the search date filter works, and the plan template library is accessible in the PhaseBoard.
**Depends on**: Phase 5, Phase 8
**Requirements**: (new capability — improves usability of SKILL-03/04/05/06/07/08/12/13, DASH-09, SRCH-01/02)
**Success Criteria** (what must be TRUE):
  1. "Generate Meeting Summary" button on the History tab opens the skill launcher pre-scoped to that project; "Create Handoff Doc" button on Stakeholders tab does the same
  2. Selecting a draft in the Drafts Inbox shows an Edit modal — the user can modify subject, body, and recipient before sending or dismissing
  3. The date range filter on the /search page filters results to entries created within the selected range
  4. A "Templates" button in PhaseBoard opens a modal listing saved plan_templates; selecting one instantiates its tasks into the current project
**Plans**: 4 plans

Plans:
- [x] 13-01-PLAN.md — Wave 0: E2E test stubs (11 RED stubs covering all Phase 13 behaviors) (completed 2026-03-25)
- [ ] 13-02-PLAN.md — Wave 1: Skill launch buttons (History + Stakeholders) + search date filter fix
- [ ] 13-03-PLAN.md — Wave 1: DraftEditModal + DraftsInbox refactor + PATCH extension + TemplatePicker Dialog upgrade
- [ ] 13-04-PLAN.md — Wave 2: E2E green pass + human verification checkpoint

### Phase 14: Time + Project Analytics
**Goal**: Time entries are summarized by week and month in the Time tab, the Dashboard gains an action velocity chart and risk trend indicator, and a capacity planning view shows hours logged vs. weekly target — turning captured data into actionable intelligence.
**Depends on**: Phase 5.2, Phase 8
**Requirements**: (new capability — extends TIME-01/02/03 and DASH-02/03 coverage)
**Success Criteria** (what must be TRUE):
  1. Time tab header shows total hours for the project plus a weekly summary table (sum by week for the last 8 weeks)
  2. Dashboard shows an "Action Velocity" mini-chart: actions completed per week over the last 4 weeks, with a trend indicator (up/down/flat)
  3. Dashboard or per-project Overview shows open risk count trend (last 4 weeks) — indicating whether risk exposure is growing or shrinking
  4. Time tab includes a capacity planning row: configurable weekly hour target vs. actual hours logged, showing over/under allocation per week
**Plans**: 5 plans

Plans:
- [x] 14-01-PLAN.md — Wave 0: E2E test stubs for all Phase 14 success criteria (completed 2026-03-25)
- [ ] 14-02-PLAN.md — Wave 1: DB migration (weekly_hour_target) + computeProjectAnalytics() foundation
- [ ] 14-03-PLAN.md — Wave 2: Time tab weekly summary + capacity planning (API + UI)
- [ ] 14-04-PLAN.md — Wave 2: HealthCard velocity chart + risk trend indicator (UI only)
- [ ] 14-05-PLAN.md — Wave 3: E2E green pass + human verification checkpoint

### Phase 15: Scheduler + UI Fixes
**Goal**: All scheduled jobs fire on their intended cron schedule, skill path resolution is consistent across all job handlers, and the search filter covers all 12 FTS tables — closing 3 of the 4 integration gaps found by the v1.0 audit. (YAML export UI gap deferred to a future phase.)
**Depends on**: Phase 14
**Requirements**: SCHED-01, SCHED-03, SET-02, SKILL-03, SKILL-11, SKILL-14, SRCH-02, SRCH-03
**Deferred**: DATA-05, OVER-04 (YAML round-trip export UI) — moved to a future dedicated phase
**Gap Closure**: Closes integration gaps from v1.0-MILESTONE-AUDIT.md: scheduler gap, skill path inconsistency, search filter gap
**Success Criteria** (what must be TRUE):
  1. `morning-briefing` and `weekly-customer-status` are present in `JOB_SCHEDULE_MAP` in `scheduler.ts` and fire at their configured times; phantom entries `action-sync` and `weekly-briefing` removed
  2. `morning-briefing.ts`, `weekly-customer-status.ts`, and `context-updater.ts` use `resolveSkillsDir(settings.skill_path)` instead of a hardcoded `__dirname`-relative path
  3. The search filter TYPE_OPTIONS includes all 12 FTS tables: adds `onboarding_steps`, `onboarding_phases`, `integrations`, `time_entries`
**Plans**: 3 plans

Plans:
- [x] 15-01-PLAN.md — Wave 0: Failing test scaffolds (scheduler-map.test.ts + search-type-options.test.ts)
- [x] 15-02-PLAN.md — Wave 1: Scheduler registration fix + resolveSkillsDir() in 3 handlers + search TYPE_OPTIONS update
- [x] 15-03-PLAN.md — Wave 2: Full suite GREEN + human verification checkpoint

### Phase 16: Verification Retrofit
**Goal**: Phases 01, 04, 05, 05.2, and 06 each have a VERIFICATION.md produced by gsd-verifier — closing 31 orphaned requirements that were implemented but never formally verified.
**Depends on**: Phase 15
**Requirements**: DATA-01..08, SET-01/03/04, SCHED-01..08, SKILL-02/10/14, OUT-01..04, TIME-01..03, DASH-04/05
**Gap Closure**: Closes 31 orphaned requirements from v1.0-MILESTONE-AUDIT.md (5 unverified phases)
**Success Criteria** (what must be TRUE):
  1. `phases/01-data-foundation/01-VERIFICATION.md` exists with status passed or human_needed and covers DATA-01..08, SET-01/03/04
  2. `phases/04-job-infrastructure/04-VERIFICATION.md` exists covering SCHED-01..08
  3. `phases/05-skill-engine/05-VERIFICATION.md` exists covering SKILL-02/14, OUT-01..04
  4. `phases/05.2-time-tracking/05.2-VERIFICATION.md` exists covering TIME-01..03
  5. `phases/06-mcp-integrations/06-VERIFICATION.md` exists covering SKILL-10, DASH-04/05
**Plans**: 5 plans (one retroactive verification run per unverified phase)

Plans:
- [ ] 16-01-PLAN.md — Verify Phase 01: Data Foundation (DATA-01..08, SET-01/03/04)
- [ ] 16-02-PLAN.md — Verify Phase 04: Job Infrastructure (SCHED-01..08)
- [ ] 16-03-PLAN.md — Verify Phase 05: Skill Engine (SKILL-02/14, OUT-01..04)
- [ ] 16-04-PLAN.md — Verify Phase 05.2: Time Tracking (TIME-01..03)
- [ ] 16-05-PLAN.md — Verify Phase 06: MCP Integrations (SKILL-10, DASH-04/05)

---

## v2.0 Phase Details

### Phase 17: Schema Extensions
**Goal**: All new v2.0 database tables exist and all extended columns are in place — every subsequent v2.0 phase builds on a schema that will not change under it.
**Depends on**: Phase 16
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05, SCHEMA-06, SCHEMA-07, SCHEMA-08, SCHEMA-09, SCHEMA-10, SCHEMA-11
**Success Criteria** (what must be TRUE):
  1. The `discovery_items` table exists with all specified columns and accepts inserts with status values pending/approved/dismissed; the `audit_log` table exists and accepts inserts with before_json/after_json as valid JSONB
  2. `time_entries` rows have the submitted_on, approved_on, rejected_on, and locked columns; `artifacts` rows have ingestion_status and ingestion_log_json; `scheduled_jobs` rows have last_run_outcome, run_history_json, timezone, and skill_params_json
  3. The five new project-scoped tables (business_outcomes, e2e_workflows with workflow_steps, focus_areas, architecture_integrations, before_state, team_onboarding_status) all exist and accept seed rows scoped to a project_id without foreign-key violations
  4. A migration rollback followed by re-apply leaves the DB in identical state — no data corruption or duplicate column errors
**Plans**: 3 plans

Plans:
- [ ] 17-01-PLAN.md — Wave 0: Vitest test scaffold (RED — verifies all 15 new schema.ts exports)
- [ ] 17-02-PLAN.md — Wave 1: SQL migration 0011_v2_schema.sql (5 enums, 9 tables, 2 ALTER TABLE, RLS)
- [ ] 17-03-PLAN.md — Wave 1: Drizzle schema.ts update (5 enums + 10 tables, turns tests GREEN)

### Phase 18: Document Ingestion
**Goal**: Users can upload any supported document into a project, Claude extracts structured data across all entity types, and after reviewing a grouped preview the user's approved items land in the correct DB tables with full source attribution — no data is written without explicit human confirmation.
**Depends on**: Phase 17
**Requirements**: ING-01, ING-02, ING-03, ING-04, ING-05, ING-06, ING-07, ING-08, ING-09, ING-10, ING-11, ING-12
**Success Criteria** (what must be TRUE):
  1. Dragging a PDF, DOCX, PPTX, XLSX, MD, or TXT file onto the Artifacts tab uploads it, stores it on disk, and creates an Artifact record with ingestion_status: pending — files over 50 MB are rejected with a clear error message before upload completes
  2. After upload, Claude's extraction results appear as a structured preview grouped by destination tab (Actions, Risks, Decisions, etc.) with a confidence indicator and source text excerpt per item — no DB writes have occurred yet
  3. Approving all items in the preview (individually or in bulk) writes them to the correct tables with source attribution showing the filename and upload timestamp; rejected items are not written
  4. Re-uploading a document that was previously ingested triggers the preview flow again and only surfaces items not already present in the DB — no re-presentation of already-ingested data
  5. When an extracted item conflicts with an existing record, a merge/replace/skip prompt appears before any write — no silent overwrites
**Plans**: 6 plans

Plans:
- [x] 18-01-PLAN.md — Wave 0: Test scaffolds (all 12 ING stubs) + migration 0012 (source_artifact_id + ingested_at on entity tables)
- [x] 18-02-PLAN.md — Wave 1: Upload API (/api/ingestion/upload) + document-extractor lib
- [x] 18-03-PLAN.md — Wave 1: Extract API (/api/ingestion/extract) — Claude extraction with SSE streaming + dedup filter
- [x] 18-04-PLAN.md — Wave 2: Approve API (/api/ingestion/approve) — conflict detection + source attribution writes + ingestion log
- [x] 18-05-PLAN.md — Wave 3: Ingestion UI components (IngestionModal, Stepper, ExtractionPreview, ItemRow, EditForm)
- [x] 18-06-PLAN.md — Wave 4: ArtifactsDropZone wired onto Artifacts tab + human verification checkpoint

### Phase 19: External Discovery Scan
**Goal**: Users can trigger a scan across any combination of Slack, Gmail, Glean, and Gong for a project; Claude analyzes the results and surfaces structured findings in a Review Queue where each item can be approved or dismissed; approved items land in the DB with source attribution.
**Depends on**: Phase 17 (can be built in parallel with Phase 18 after Phase 17 is complete)
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07, DISC-08, DISC-09, DISC-10, DISC-11, DISC-12, DISC-13, DISC-14, DISC-15, DISC-16, DISC-17
**Success Criteria** (what must be TRUE):
  1. Clicking "Scan for Updates" on a project runs the configured sources (Slack/Gmail/Glean/Gong) and completes without error; an in-app notification appears when items are pending review
  2. The Review Queue page shows each pending item with: source tool, date found, source excerpt, suggested destination tab/field, and Claude's extracted value — items remain in the queue until explicitly acted upon
  3. Approving a queue item writes it to the correct DB table (e.g., an extracted action goes to the actions table) with source attribution showing the source tool and scan timestamp
  4. Dismissing a queue item sets its status to dismissed and it moves to dismissal history — it does not reappear in the active queue on the next scan
  5. When a discovered item conflicts with an existing record, a side-by-side diff view is shown before the merge/replace/skip prompt — no silent overwrites
**Plans**: 6 plans

Plans:
- [ ] 19-01-PLAN.md — Wave 1: RED test stubs (5 files) + migration 0013 (source_excerpt + scan_id on discovery_items)
- [ ] 19-02-PLAN.md — Wave 2: lib/discovery-scanner.ts + POST /api/discovery/scan SSE route
- [ ] 19-03-PLAN.md — Wave 2: Queue/Approve/Dismiss/History API routes
- [ ] 19-04-PLAN.md — Wave 3: Review Queue page + QueueItemRow + DiffView components + WorkspaceTabs tab
- [ ] 19-05-PLAN.md — Wave 3: ScanForUpdatesButton wired to layout + scan-config API + discovery-scan worker job
- [ ] 19-06-PLAN.md — Wave 4: Full test suite pass + human verification checkpoint

### Phase 19.1: Source Integrations (INSERTED)

**Goal:** Team members can connect the discovery scanner to real data sources — Slack, Gong, and Glean via shared org-level credentials stored in app Settings, and Gmail via per-user OAuth with guided setup instructions. MCP remains available as an alternate backend when configured in settings.json.
**Requirements**: SRC-01, SRC-02, SRC-03, SRC-04, SRC-05, SRC-06, SRC-07, SRC-08, SRC-09
**Depends on:** Phase 19
**Plans:** 8/8 plans complete

**Success Criteria** (what must be TRUE):
- Slack bot token, Gong API key, and Glean API token are configurable in Settings UI (shared org-level)
- Gmail connect uses per-user OAuth with clear setup instructions in the UI
- Discovery scanner uses direct REST API calls when credentials are configured (no MCP required)
- MCP remains fully functional as alternate backend when settings.json is configured
- Settings UI shows connection status (connected/not connected) for each source
- Users without credentials see actionable setup instructions, not silent failures
- Discovery scanner asks Claude to cross-reference new items against existing project data; likely duplicates are flagged and rendered in a collapsed section in the review queue

Plans:
- [ ] 19.1-01-PLAN.md — Wave 0: SourceAdapter interface + RED test stubs + DB migration + AppSettings extension
- [ ] 19.1-02-PLAN.md — Wave 1: SlackAdapter + GongAdapter (GREEN tests)
- [ ] 19.1-03-PLAN.md — Wave 1: GleanAdapter + MCPAdapter (GREEN tests)
- [ ] 19.1-04-PLAN.md — Wave 1: Gmail OAuth routes + GmailAdapter
- [ ] 19.1-05-PLAN.md — Wave 2: resolveAdapter factory + scanner refactor + source-credentials API
- [ ] 19.1-06-PLAN.md — Wave 2: Settings UI Source Connections panel
- [ ] 19.1-08-PLAN.md — Wave 2: Claude dedup analysis — project context + likely_duplicate flag + queue UI
- [ ] 19.1-07-PLAN.md — Wave 3: Full test suite + human verification checkpoint

### Phase 20: Project Initiation Wizard
**Goal**: New projects are created through a guided multi-step wizard that ingests collateral documents, extracts data via the ingestion pipeline, and computes a completeness score — replacing direct DB seeding as the primary new-project flow.
**Depends on**: Phase 18 (wizard uses the ingestion pipeline)
**Requirements**: WIZ-01, WIZ-02, WIZ-03, WIZ-04, WIZ-05, WIZ-06, WIZ-07, WIZ-08, WIZ-09
**Success Criteria** (what must be TRUE):
  1. Clicking "New Project" on the Dashboard opens the wizard; completing step 1 (project name, customer, dates, description) creates the Project record and initializes all tab data structures in the DB — the project appears in the Dashboard immediately
  2. Uploading collateral files in the wizard (SOW, Kickoff Deck, etc.) triggers the ingestion pipeline for each file and presents a combined extraction preview grouped by destination tab; no data is written until the user approves
  3. The wizard's manual-entry step allows adding actions, risks, stakeholders, and other items via inline forms for items not captured in uploaded documents
  4. Clicking "Launch Project" on the completeness summary step sets project status to Active and navigates to the project Overview tab
  5. The Project Completeness Score (0–100%) is visible on the Overview tab; projects below 60% show a banner identifying which tabs have no populated records
**Plans**: 6 plans

Plans:
- [ ] 20-01-PLAN.md — Wave 1: Test scaffolds + DB schema migration (draft status, project fields) + dashboard query fix
- [ ] 20-02-PLAN.md — Wave 2: POST /api/projects (create) + PATCH /api/projects/[projectId] (status update)
- [ ] 20-03-PLAN.md — Wave 3: ProjectWizard container + BasicInfoStep + CollateralUploadStep
- [ ] 20-04-PLAN.md — Wave 4: AiPreviewStep + ManualEntryStep + LaunchStep + Dashboard wire
- [ ] 20-05-PLAN.md — Wave 3 (parallel): Completeness score API + Overview tab display
- [ ] 20-06-PLAN.md — Wave 5: Human verification checkpoint

### Phase 21: Teams Tab + Architecture Tab
**Goal**: The Teams tab renders a rich, DB-powered 5-section Team Engagement Map view and the Architecture tab renders a rich, DB-powered 2-tab Workflow Diagram — both fully editable inline, with their respective skills updated to export from DB rather than static data.
**Depends on**: Phase 17
**Requirements**: TEAMS-01, TEAMS-02, TEAMS-03, TEAMS-04, TEAMS-05, TEAMS-06, TEAMS-07, TEAMS-08, TEAMS-09, TEAMS-10, TEAMS-11, ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05, ARCH-06, ARCH-07, ARCH-08, ARCH-09, ARCH-10, ARCH-11, ARCH-12
**Success Criteria** (what must be TRUE):
  1. The Teams tab renders all 5 sections (Business Value & Outcomes, Architecture, End-to-End Workflows, Teams & Engagement Status, Top Focus Areas) with real DB data; any section with insufficient data shows a yellow warning banner — no generic placeholder copy appears
  2. The Architecture tab renders the Before BigPanda tab (5-phase flow + customer-specific pain point cards) and the Current & Future State tab (ADR Track + Biggy AI Track with full-width amber divider + Team Onboarding Status table) — all content sourced from DB, not hardcoded
  3. Users can add and edit business outcomes, E2E workflow steps, focus areas, team card data, integration nodes, before-state data, and team onboarding rows directly within the Teams and Architecture tabs; saves persist immediately with optimistic UI
  4. Running the team-engagement-map skill generates a self-contained HTML export of the 5-section view using live DB data; running the workflow-diagram skill generates a self-contained HTML export of the 2-tab diagram using live DB data
  5. Design tokens are applied consistently — ADR blue (#1e40af), Biggy purple (#6d28d9), E2E green (#065f46), and all status pill colors (Live/In Progress/Pilot/Planned) match the specified hex values in both the tab view and skill exports
**Plans**: 6 plans

Plans:
- [ ] 21-01-PLAN.md — Wave 1: API routes + queries for Teams tab data (business-outcomes, e2e-workflows+steps, focus-areas)
- [ ] 21-02-PLAN.md — Wave 1: API routes + queries for Architecture tab data (architecture-integrations, before-state, team-onboarding-status)
- [ ] 21-03-PLAN.md — Wave 2: Teams tab rebuild — 5-section Team Engagement Map with design tokens + inline editing
- [ ] 21-04-PLAN.md — Wave 2: Architecture tab rebuild — 2-tab Workflow Diagram with inline editing
- [ ] 21-05-PLAN.md — Wave 3: Skill system prompts + skill-context.ts update for team-engagement-map + workflow-diagram
- [ ] 21-06-PLAN.md — Wave 4: Human verification checkpoint

### Phase 22: Source Badges + Audit Log
**Goal**: Every workspace record displays where it came from (Manual, Ingested, or Discovered), every data mutation is written to the audit log, and deletions require explicit confirmation — the full data provenance trail is complete.
**Depends on**: Phase 17, Phase 18, Phase 19 (badges are only meaningful after ingestion and discovery are operational)
**Requirements**: AUDIT-01, AUDIT-02, AUDIT-03
**Success Criteria** (what must be TRUE):
  1. Every record on the Actions, Risks, Decisions, Milestones, Stakeholders, Engagement History, and Artifacts tabs shows a source badge — "Manual" for user-entered records, "Ingested — [filename]" for document-ingested records, "Discovered — [source tool]" for discovery-approved records
  2. Creating, editing, or deleting any workspace record produces a corresponding row in audit_log with the correct entity_type, entity_id, action, actor_id, before_json, after_json, and timestamp — verifiable by querying audit_log directly
  3. Attempting to delete any workspace record opens a confirmation dialog; confirming the deletion writes the delete event to audit_log before the record is removed
**Plans**: TBD

### Phase 23: Time Tracking Advanced
**Goal**: The Time tab gains an approval workflow, Google Calendar import, and admin configuration — transforming basic time logging into a team-grade time management system with submission reminders, locked entries, and bulk operations.
**Depends on**: Phase 17 (requires extended time_entries schema from SCHEMA-03)
**Requirements**: TTADV-01, TTADV-02, TTADV-03, TTADV-04, TTADV-05, TTADV-06, TTADV-07, TTADV-08, TTADV-09, TTADV-10, TTADV-11, TTADV-12, TTADV-13, TTADV-14, TTADV-15, TTADV-16, TTADV-17, TTADV-18, TTADV-19
**Success Criteria** (what must be TRUE):
  1. A user can submit their timesheet for the current week; the approver can approve or reject individual entries and approve in bulk; approved entries are locked and cannot be edited without an explicit approver override
  2. Authenticating with Google Calendar via OAuth and importing the current week's events creates draft time entries on the correct event dates; each imported event is auto-matched to a project by attendee comparison; the user can override any match or mark an event as non-project activity
  3. Admin can configure weekly capacity, working days, submission due date, custom categories, project restrictions, and exempt users from Settings > Time Tracking — all settings persist and take effect immediately
  4. Submission reminder notifications are sent before the due date and again when overdue (exempt users excluded); approval and rejection notifications reach the submitting user with a summary
  5. The time entry table supports grouping by project, team member, status, or phase with billable/non-billable subtotals; export to CSV and Excel includes audit fields (submitted/approved/rejected on/by)
**Plans**: TBD

### Phase 24: Scheduler Enhanced
**Goal**: The Scheduler page is a full self-service job management UI — users can create, configure, enable/disable, and manually trigger any of the 12 skills as scheduled jobs, with run history logs and failure notifications built in.
**Depends on**: Phase 17 (requires extended scheduled_jobs schema from SCHEMA-05)
**Requirements**: SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05, SCHED-06, SCHED-07, SCHED-08, SCHED-09, SCHED-10, SCHED-11, SCHED-12
**Success Criteria** (what must be TRUE):
  1. Opening the Scheduler page (accessible from the sidebar) shows all configured jobs with their last run timestamp, last run outcome (success/failure/partial), and next run time — jobs created, edited, or deleted here are reflected immediately without a server restart
  2. The Create Job wizard guides through skill selection, scope (global/per-project), frequency (once/daily/weekly/bi-weekly/monthly/custom cron), time with timezone, and skill-specific parameters; all 12 skills are available in the skill picker
  3. Disabling a job retains its config and run history but stops it from running; manually triggering a job fires it immediately regardless of its next scheduled time
  4. Each job's run history shows per-run timestamp, outcome, duration, and links to output artifacts or error messages; failed runs generate an in-app notification with an error summary
**Plans**: TBD

---

## Progress

**Execution Order:**
v1.0 phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 5.1 → 5.2 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16
v2.0 phases execute: 17 → 18/19 (parallel) → 20 → 21 → 22 → 23/24 (parallel)
Phases 18 and 19 can run in parallel after Phase 17. Phases 23 and 24 are independent of each other.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Foundation | 6/6 | Complete   | 2026-03-19 |
| 2. App Shell + Read Surface | 7/7 | Complete   | 2026-03-19 |
| 3. Write Surface + Plan Builder | 9/9 | Complete   | 2026-03-20 |
| 4. Job Infrastructure | 5/5 | Complete   | 2026-03-20 |
| 5. Skill Engine | 6/6 | Complete   | 2026-03-23 |
| 5.1 Onboarding Dashboard [INSERTED] | 8/8 | Complete   | 2026-03-23 |
| 5.2 Time Tracking [INSERTED] | 5/5 | Complete   | 2026-03-23 |
| 6. MCP Integrations | 7/7 | Complete   | 2026-03-24 |
| 7. File Generation + Remaining Skills | 7/7 | Complete   | 2026-03-24 |
| 8. Cross-Project Features + Polish | 7/7 | Complete   | 2026-03-25 |
| 9. MCP Injection Fix | 2/2 | Complete   | 2026-03-25 |
| 10. FTS Expansion + Code Polish | 2/2 | Complete    | 2026-03-25 |
| 11. Health Score Wire | 1/1 | Complete    | 2026-03-25 |
| 12. Complete Workspace Write Surface | 4/4 | Complete    | 2026-03-25 |
| 13. Skill UX + Draft Polish | 4/4 | Complete    | 2026-03-25 |
| 14. Time + Project Analytics | 5/5 | Complete    | 2026-03-25 |
| 15. Scheduler + UI Fixes | 3/3 | Complete    | 2026-03-26 |
| 16. Verification Retrofit | 5/5 | Complete    | 2026-03-26 |
| 17. Schema Extensions | 3/3 | Complete    | 2026-03-26 |
| 18. Document Ingestion | 5/6 | In Progress|  |
| 19. External Discovery Scan | 5/6 | In Progress|  |
| 20. Project Initiation Wizard | 6/6 | Complete    | 2026-03-27 |
| 21. Teams Tab + Architecture Tab | 5/7 | In Progress|  |
| 22. Source Badges + Audit Log | 0/TBD | Not started | - |
| 23. Time Tracking Advanced | 0/TBD | Not started | - |
| 24. Scheduler Enhanced | 0/TBD | Not started | - |

---

## Coverage

**Requirement-to-phase mapping (all v1 requirements):**

| Requirement | Phase |
|-------------|-------|
| DATA-01 | Phase 1 |
| DATA-02 | Phase 1 |
| DATA-03 | Phase 1 |
| DATA-04 | Phase 1 |
| DATA-05 | Phase 1 |
| DATA-06 | Phase 1 |
| DATA-07 | Phase 1 |
| DATA-08 | Phase 1 |
| SET-01 | Phase 1 |
| SET-02 | Phase 1 |
| SET-03 | Phase 1 |
| SET-04 | Phase 1 |
| DASH-01 | Phase 2 |
| DASH-02 | Phase 2 |
| DASH-03 | Phase 2 |
| DASH-06 | Phase 2 |
| DASH-07 | Phase 2 |
| DASH-08 | Phase 2 |
| WORK-01 | Phase 2 |
| WORK-03 | Phase 2 |
| WORK-04 | Phase 2 |
| WORK-05 | Phase 2 |
| WORK-06 | Phase 2 |
| WORK-07 | Phase 2 |
| WORK-08 | Phase 2 |
| WORK-09 | Phase 2 |
| WORK-02 | Phase 3 |
| PLAN-01 | Phase 3 |
| PLAN-02 | Phase 3 |
| PLAN-03 | Phase 3 |
| PLAN-04 | Phase 3 |
| PLAN-05 | Phase 3 |
| PLAN-06 | Phase 3 |
| PLAN-07 | Phase 3 |
| PLAN-08 | Phase 3 |
| PLAN-09 | Phase 3 |
| PLAN-10 | Phase 3 |
| PLAN-11 | Phase 3 |
| SCHED-01 | Phase 4 |
| SCHED-02 | Phase 4 |
| SCHED-03 | Phase 4 |
| SCHED-04 | Phase 4 |
| SCHED-05 | Phase 4 |
| SCHED-06 | Phase 4 |
| SCHED-07 | Phase 4 |
| SCHED-08 | Phase 4 |
| SKILL-01 | Phase 5 |
| SKILL-02 | Phase 5 |
| SKILL-03 | Phase 5 |
| SKILL-04 | Phase 5 |
| SKILL-11 | Phase 5 |
| SKILL-12 | Phase 5 |
| SKILL-13 | Phase 5 |
| SKILL-14 | Phase 5 |
| DASH-09 | Phase 5 |
| OUT-01 | Phase 5 |
| OUT-02 | Phase 5 |
| OUT-03 | Phase 5 |
| OUT-04 | Phase 5 |
| SKILL-10 | Phase 6 |
| DASH-04 | Phase 6 |
| DASH-05 | Phase 6 |
| SKILL-05 | Phase 7 |
| SKILL-06 | Phase 7 |
| SKILL-07 | Phase 7 |
| SKILL-08 | Phase 7 |
| SKILL-09 | Phase 7 |
| PLAN-12 | Phase 7 |
| PLAN-13 | Phase 7 |
| OVER-01 | Phase 5.1 |
| OVER-02 | Phase 5.1 |
| OVER-03 | Phase 5.1 |
| OVER-04 | Phase 5.1 |
| TIME-01 | Phase 5.2 |
| TIME-02 | Phase 5.2 |
| TIME-03 | Phase 5.2 |
| KB-01 | Phase 8 |
| KB-02 | Phase 8 |
| KB-03 | Phase 8 |
| SRCH-01 | Phase 8 |
| SRCH-02 | Phase 8 |
| SRCH-03 | Phase 8 |

| SKILL-01 | Phase 9 |
| SKILL-03 | Phase 9 |
| SKILL-04 | Phase 9 |
| SKILL-11 | Phase 9 |
| SKILL-12 | Phase 9 |
| SRCH-01 | Phase 10 |
| SET-02 | Phase 10 |
| PLAN-09 | Phase 11 |
| SKILL-09 | v2 (deferred) |

**Total mapped: 81 v1 requirements across 14 phases** (SKILL-09 moved to v2)

> Added OVER-01–04 (Onboarding Dashboard, Phase 5.1) and TIME-01–03 (Time Tracking, Phase 5.2) on 2026-03-23. Total was 75; now 82.

**v2.0 requirement-to-phase mapping:**

| Requirement | Phase |
|-------------|-------|
| SCHEMA-01 | Phase 17 |
| SCHEMA-02 | Phase 17 |
| SCHEMA-03 | Phase 17 |
| SCHEMA-04 | Phase 17 |
| SCHEMA-05 | Phase 17 |
| SCHEMA-06 | Phase 17 |
| SCHEMA-07 | Phase 17 |
| SCHEMA-08 | Phase 17 |
| SCHEMA-09 | Phase 17 |
| SCHEMA-10 | Phase 17 |
| SCHEMA-11 | Phase 17 |
| ING-01 | Phase 18 |
| ING-02 | Phase 18 |
| ING-03 | Phase 18 |
| ING-04 | Phase 18 |
| ING-05 | Phase 18 |
| ING-06 | Phase 18 |
| ING-07 | Phase 18 |
| ING-08 | Phase 18 |
| ING-09 | Phase 18 |
| ING-10 | Phase 18 |
| ING-11 | Phase 18 |
| ING-12 | Phase 18 |
| DISC-01 | Phase 19 |
| DISC-02 | Phase 19 |
| DISC-03 | Phase 19 |
| DISC-04 | Phase 19 |
| DISC-05 | Phase 19 |
| DISC-06 | Phase 19 |
| DISC-07 | Phase 19 |
| DISC-08 | Phase 19 |
| DISC-09 | Phase 19 |
| DISC-10 | Phase 19 |
| DISC-11 | Phase 19 |
| DISC-12 | Phase 19 |
| DISC-13 | Phase 19 |
| DISC-14 | Phase 19 |
| DISC-15 | Phase 19 |
| DISC-16 | Phase 19 |
| DISC-17 | Phase 19 |
| WIZ-01 | Phase 20 |
| WIZ-02 | Phase 20 |
| WIZ-03 | Phase 20 |
| WIZ-04 | Phase 20 |
| WIZ-05 | Phase 20 |
| WIZ-06 | Phase 20 |
| WIZ-07 | Phase 20 |
| WIZ-08 | Phase 20 |
| WIZ-09 | Phase 20 |
| TEAMS-01 | Phase 21 |
| TEAMS-02 | Phase 21 |
| TEAMS-03 | Phase 21 |
| TEAMS-04 | Phase 21 |
| TEAMS-05 | Phase 21 |
| TEAMS-06 | Phase 21 |
| TEAMS-07 | Phase 21 |
| TEAMS-08 | Phase 21 |
| TEAMS-09 | Phase 21 |
| TEAMS-10 | Phase 21 |
| TEAMS-11 | Phase 21 |
| ARCH-01 | Phase 21 |
| ARCH-02 | Phase 21 |
| ARCH-03 | Phase 21 |
| ARCH-04 | Phase 21 |
| ARCH-05 | Phase 21 |
| ARCH-06 | Phase 21 |
| ARCH-07 | Phase 21 |
| ARCH-08 | Phase 21 |
| ARCH-09 | Phase 21 |
| ARCH-10 | Phase 21 |
| ARCH-11 | Phase 21 |
| ARCH-12 | Phase 21 |
| AUDIT-01 | Phase 22 |
| AUDIT-02 | Phase 22 |
| AUDIT-03 | Phase 22 |
| TTADV-01 | Phase 23 |
| TTADV-02 | Phase 23 |
| TTADV-03 | Phase 23 |
| TTADV-04 | Phase 23 |
| TTADV-05 | Phase 23 |
| TTADV-06 | Phase 23 |
| TTADV-07 | Phase 23 |
| TTADV-08 | Phase 23 |
| TTADV-09 | Phase 23 |
| TTADV-10 | Phase 23 |
| TTADV-11 | Phase 23 |
| TTADV-12 | Phase 23 |
| TTADV-13 | Phase 23 |
| TTADV-14 | Phase 23 |
| TTADV-15 | Phase 23 |
| TTADV-16 | Phase 23 |
| TTADV-17 | Phase 23 |
| TTADV-18 | Phase 23 |
| TTADV-19 | Phase 23 |
| SCHED-01 | Phase 24 |
| SCHED-02 | Phase 24 |
| SCHED-03 | Phase 24 |
| SCHED-04 | Phase 24 |
| SCHED-05 | Phase 24 |
| SCHED-06 | Phase 24 |
| SCHED-07 | Phase 24 |
| SCHED-08 | Phase 24 |
| SCHED-09 | Phase 24 |
| SCHED-10 | Phase 24 |
| SCHED-11 | Phase 24 |
| SCHED-12 | Phase 24 |

**v2.0 coverage: 96/96 requirements mapped across Phases 17–24**

---

## Research Flags (for plan-phase)

| Phase | Research Required | Reason |
|-------|-------------------|--------|
| Phase 4 | YES — before planning | BullMQ v5 RepeatableJob cron API syntax may have changed in major version; verify before writing any job registration code |
| Phase 5 | YES — before planning | Anthropic SDK 0.78.x streaming + tool_use multi-turn pattern; verify buildSkillContext() context assembly against current SDK docs |
| Phase 6 | YES — before planning | MCP SDK current API is LOW confidence; connection lifecycle and stdio vs HTTP transport preference must be verified in 2026 before any Phase 6 code |
| Phase 7 | YES — spike at start | Generate test .pptx and .docx and open in actual Microsoft Office before writing generation logic; known failure mode |
| Phase 18 | YES — before planning | Anthropic SDK file upload / document extraction API: verify multimodal document input format for PDF/DOCX/PPTX in current SDK version |
| Phase 19 | No — MCP connectors already proven in Phase 6 | Discovery scan uses existing MCPClientPool; new logic is Claude analysis + Review Queue UI |
| Phase 23 | YES — before planning | Google Calendar OAuth flow in Next.js 14 App Router: verify google-auth-library or next-auth approach for calendar read scope |
| Phase 1, 2, 3, 8 | No — skip research | Standard patterns; existing codebase provides ground-truth versions |

---

*Roadmap created: 2026-03-18*
*Requirements sourced from: .planning/REQUIREMENTS.md (defined 2026-03-18)*
*Phase 1 planned: 2026-03-18 — 6 plans across 5 waves*
*Phase 2 planned: 2026-03-19 — 7 plans across 5 waves (Wave 0–4)*
*Phase 5 planned: 2026-03-20 — 6 plans across 5 waves (Wave 0–4)*
*Phase 5.2 planned: 2026-03-23 — 5 plans across 4 waves (Wave 0–3)*
*Phases 9–14 added: 2026-03-24 — gap closure phases from v1.0 audit + high-value feature additions; SKILL-09 moved to v2*
*v2.0 Phases 17–24 added: 2026-03-25 — AI Ingestion & Enhanced Operations milestone; 96/96 requirements mapped*
