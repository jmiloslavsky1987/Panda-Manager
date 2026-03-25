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
- [ ] **Phase 5.2: Time Tracking** [INSERTED] - 12th workspace tab; time_entries table; add/edit/delete entries; CSV export
- [ ] **Phase 6: MCP Integrations** - MCPClientPool, Slack/Gmail/Glean/Drive connections, Customer Project Tracker fully wired
- [x] **Phase 7: File Generation + Remaining Skills** - FileGenerationService (.docx/.pptx/.xlsx/.html), 11 remaining skills wired (completed 2026-03-24)
- [x] **Phase 8: Cross-Project Features + Polish** - FTS, risk heat map, cross-account watch list, Knowledge Base, Drafts send/discard flow (completed 2026-03-25)
- [ ] **Phase 9: MCP Injection Fix** - Wire MCPClientPool into all 4 skill job handlers; closes INT-MCP-01 from v1.0 audit
- [ ] **Phase 10: FTS Expansion + Code Polish** - FTS coverage for 4 missing tables, skill path setting wired, /skills/custom link fixed; closes INT-FTS-01/INT-SET-01/INT-UI-01
- [ ] **Phase 11: Health Score Wire** - workstream.percent_complete feeds computeHealth(); closes PLAN-09 gap
- [ ] **Phase 12: Complete Workspace Write Surface** - Artifacts tab, Decisions write UI, Architecture inline edit, Teams percent_complete edit
- [ ] **Phase 13: Skill UX + Draft Polish** - Contextual skill launch buttons, draft editing, search date filter, plan template library
- [ ] **Phase 14: Time + Project Analytics** - Time entry rollup, action velocity, risk trends, capacity planning view

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

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 5.1 → 5.2 → 6 → 7 → 8
Phases 5.1 and 5.2 can run in parallel. Phases 6 and 7 can overlap after Phase 5.2 is stable.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Foundation | 6/6 | Complete   | 2026-03-19 |
| 2. App Shell + Read Surface | 7/7 | Complete   | 2026-03-19 |
| 3. Write Surface + Plan Builder | 9/9 | Complete   | 2026-03-20 |
| 4. Job Infrastructure | 5/5 | Complete   | 2026-03-20 |
| 5. Skill Engine | 6/6 | Complete   | 2026-03-23 |
| 5.1 Onboarding Dashboard [INSERTED] | 8/8 | Complete   | 2026-03-23 |
| 5.2 Time Tracking [INSERTED] | 2/5 | In Progress|  |
| 6. MCP Integrations | 5/7 | In Progress|  |
| 7. File Generation + Remaining Skills | 7/7 | Complete   | 2026-03-24 |
| 8. Cross-Project Features + Polish | 7/7 | Complete   | 2026-03-25 |
| 9. MCP Injection Fix | 0/2 | Pending | |
| 10. FTS Expansion + Code Polish | 0/2 | Pending | |
| 11. Health Score Wire | 0/1 | Pending | |
| 12. Complete Workspace Write Surface | 0/4 | Pending | |
| 13. Skill UX + Draft Polish | 0/3 | Pending | |
| 14. Time + Project Analytics | 0/3 | Pending | |

---

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
- [ ] 09-01-PLAN.md — Wave 1: Add MCPClientPool.getServersForSkill() to morning-briefing.ts, context-updater.ts, weekly-customer-status.ts, skill-run.ts
- [ ] 09-02-PLAN.md — Wave 2: E2E/unit test confirming injection + human verification checkpoint

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
- [ ] 12-01-PLAN.md — Wave 0: E2E test stubs for all Phase 12 behaviors (RED baseline)
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
**Plans**: 3 plans

Plans:
- [ ] 13-01-PLAN.md — Wave 1: Contextual skill launch buttons on History tab, Stakeholders tab, and Dashboard quick actions
- [ ] 13-02-PLAN.md — Wave 2: Draft editing modal + search date filter implementation + plan template library UI
- [ ] 13-03-PLAN.md — Wave 3: E2E green pass + human verification checkpoint

### Phase 14: Time + Project Analytics
**Goal**: Time entries are summarized by week and month in the Time tab, the Dashboard gains an action velocity chart and risk trend indicator, and a capacity planning view shows hours logged vs. weekly target — turning captured data into actionable intelligence.
**Depends on**: Phase 5.2, Phase 8
**Requirements**: (new capability — extends TIME-01/02/03 and DASH-02/03 coverage)
**Success Criteria** (what must be TRUE):
  1. Time tab header shows total hours for the project plus a weekly summary table (sum by week for the last 8 weeks)
  2. Dashboard shows an "Action Velocity" mini-chart: actions completed per week over the last 4 weeks, with a trend indicator (up/down/flat)
  3. Dashboard or per-project Overview shows open risk count trend (last 4 weeks) — indicating whether risk exposure is growing or shrinking
  4. Time tab includes a capacity planning row: configurable weekly hour target vs. actual hours logged, showing over/under allocation per week
**Plans**: 3 plans

Plans:
- [ ] 14-01-PLAN.md — Wave 1: Time tab weekly rollup + capacity planning (DB aggregation queries + UI)
- [ ] 14-02-PLAN.md — Wave 2: Action velocity chart + risk trend indicator on Dashboard
- [ ] 14-03-PLAN.md — Wave 3: E2E green pass + human verification checkpoint

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

---

## Research Flags (for plan-phase)

| Phase | Research Required | Reason |
|-------|-------------------|--------|
| Phase 4 | YES — before planning | BullMQ v5 RepeatableJob cron API syntax may have changed in major version; verify before writing any job registration code |
| Phase 5 | YES — before planning | Anthropic SDK 0.78.x streaming + tool_use multi-turn pattern; verify buildSkillContext() context assembly against current SDK docs |
| Phase 6 | YES — before planning | MCP SDK current API is LOW confidence; connection lifecycle and stdio vs HTTP transport preference must be verified in 2026 before any Phase 6 code |
| Phase 7 | YES — spike at start | Generate test .pptx and .docx and open in actual Microsoft Office before writing generation logic; known failure mode |
| Phase 1, 2, 3, 8 | No — skip research | Standard patterns; existing codebase provides ground-truth versions |

---

*Roadmap created: 2026-03-18*
*Requirements sourced from: .planning/REQUIREMENTS.md (defined 2026-03-18)*
*Phase 1 planned: 2026-03-18 — 6 plans across 5 waves*
*Phase 2 planned: 2026-03-19 — 7 plans across 5 waves (Wave 0–4)*
*Phase 5 planned: 2026-03-20 — 6 plans across 5 waves (Wave 0–4)*
*Phase 5.2 planned: 2026-03-23 — 5 plans across 4 waves (Wave 0–3)*
*Phases 9–14 added: 2026-03-24 — gap closure phases from v1.0 audit + high-value feature additions; SKILL-09 moved to v2*
