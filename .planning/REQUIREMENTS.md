# Requirements: BigPanda AI Project Management App

**Defined:** 2026-03-18
**Core Value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.

## v1 Requirements

### Data Foundation

- [x] **DATA-01**: Database schema implements all tables from briefing (projects, workstreams, actions, risks, milestones, artifacts, history, stakeholders, tasks, plan_templates, outputs, knowledge_base) with PostgreSQL RLS enforced at DB layer
- [x] **DATA-02**: Append-only tables (engagement_history, key_decisions) are enforced by DB trigger — not application convention
- [x] **DATA-03**: Migration script imports all three existing customer context docs (YAML frontmatter → DB) with source tracing preserved
- [x] **DATA-04**: Migration script imports PA3_Action_Tracker.xlsx (two-sheet format) into actions table
- [x] **DATA-05**: Context doc export: DB → YAML frontmatter Markdown with exact js-yaml settings (sortKeys: false, lineWidth: -1, JSON_SCHEMA) — round-trip fidelity with Cowork skills
- [x] **DATA-06**: Multi-account architecture: user can add new projects, close completed ones (archived as read-only), with no hardcoded customer names anywhere in the codebase
- [x] **DATA-07**: Idempotency key and status field on outputs table (created immediately as 'running') to prevent duplicate skill runs on SSE reconnect
- [x] **DATA-08**: PostgreSQL connection pool implemented as singleton — no per-request pool creation

### Dashboard

- [x] **DASH-01**: Today's Briefing panel displays stored morning-briefing result; refreshable on demand
- [x] **DASH-02**: Project Health cards for all active accounts showing auto-derived RAG status, one-line summary, and open high-priority action count
- [x] **DASH-03**: Health score auto-derived from data signals: overdue actions, stalled milestones (no progress in 14+ days), and unresolved high-severity risks — no manual RAG entry required
- [x] **DASH-04**: Cross-project Risk Heat Map (probability × impact matrix) across all active accounts visible on dashboard
- [x] **DASH-05**: Cross-Account Watch List showing escalated or time-sensitive items spanning multiple customers
- [x] **DASH-06**: Recent Activity Feed showing last 7 days of skill runs, file outputs, and history entries across all projects
- [x] **DASH-07**: Quick Action Bar with one-click buttons: Run Tracker, Generate Briefing, Weekly Status Draft (per active account)
- [x] **DASH-08**: In-app notification badge for overdue actions, approaching go-live dates (within 14 days), and new tracker results
- [x] **DASH-09**: Drafts Inbox — unified queue of all AI-generated drafts (emails, Slack messages) pending review before send; no AI content reaches external parties without passing through this queue

### Project Workspace

- [x] **WORK-01**: Overview tab — workstream progress bars (ADR and Biggy tracks), milestone timeline, auto-derived health status, go-live target *(superseded by OVER-01 in Phase 5.1 — original implementation complete, replaced by onboarding dashboard)*
- [x] **WORK-02**: Actions tab — filterable by status/owner/due date, inline editing (complete, add notes, change owner), every save syncs to PA3_Action_Tracker.xlsx atomically (dual-write)
- [x] **WORK-03**: Risks tab — risk register with append-only mitigation log, inline severity/status editing, full mitigation history visible per risk
- [x] **WORK-04**: Milestones tab — milestone tracker with action links, status indicators, completion history
- [x] **WORK-05**: Teams tab — team onboarding status table (ADR + Biggy tracks) with onboarding velocity view showing time-in-phase and stall detection (team in same phase 14+ days with no logged activity)
- [x] **WORK-06**: Architecture tab — Before BigPanda state documentation and current integration status summary, editable inline
- [x] **WORK-07**: Decisions tab — append-only key decisions and alignments, searchable, never deletable
- [x] **WORK-08**: Engagement History tab — append-only history entries with date/source, add new entries from pasted notes or transcripts
- [x] **WORK-09**: Stakeholders tab — BigPanda and customer contacts roster with add/edit for name, role, email, Slack ID, notes

### Onboarding Dashboard

- [x] **OVER-01**: Overview tab replaced with a dynamic onboarding status dashboard — shows onboarding phases/steps with filter/search controls, integration tracker, risks & blockers, milestone timeline, executive summary, and animated progress ring (% of steps complete); all data drawn live from PostgreSQL
- [x] **OVER-02**: Onboarding phases and steps editable in-app — step status (not-started / in-progress / complete / blocked), owner, and append-only update notes per step; phases themselves are static labels (not added/deleted frequently)
- [x] **OVER-03**: Integration tracker — per-customer list of tools with 4-stage pipeline (Not Connected → Configured → Validated → Production) plus blocked state; tool name, category, status, and notes editable in-app
- [x] **OVER-04**: `onboarding_phases` and `integrations` YAML sections imported by migration script when present in context doc; in-app status/owner/notes edits written back to the project YAML context doc on save

### Time Tracking

- [x] **TIME-01**: Time tab (12th workspace tab) — time log for the project showing entries table (date, hours, description), total hours in header, filterable by date range
- [x] **TIME-02**: Add, edit, and delete time entries — entry fields: date (defaults to today), hours (decimal, e.g. 1.5), free-text description
- [x] **TIME-03**: Export time entries for a project as CSV with columns: date, hours, description, project name

### Skill Launcher

- [x] **SKILL-01**: SkillOrchestrator service cleanly separated from HTTP Route Handlers — same code path for manual (SSE) and BullMQ-worker (scheduled) invocations
- [x] **SKILL-02**: Token budget guard in context assembly — estimates token count before Claude call, truncates or summarizes low-priority context sections if over budget
- [x] **SKILL-03**: Weekly Customer Status — select account → generate customer-facing email from DB context; copy to clipboard or save as file; optionally creates Gmail draft
- [x] **SKILL-04**: Meeting Summary — paste notes/transcript + select account → generate .docx + optional .mermaid diagram; registers entry in engagement history
- [x] **SKILL-05**: ELT External Status — select account + month → generate 5-slide .pptx (confidence-framed, partnership tone, no internal severity language)
- [x] **SKILL-06**: ELT Internal Status — select account + date → generate internal .pptx (direct tone, surfaces blockers)
- [x] **SKILL-07**: Team Engagement Map — select account → generate self-contained HTML (business outcomes, ADR/Biggy flows, team status table)
- [x] **SKILL-08**: Workflow Diagram — select account → generate before/after HTML with two tabs
- ~~**SKILL-09**: Biggy Weekly Briefing~~ *(moved to v2 — see v2 Requirements)*
- [x] **SKILL-10**: Customer Project Tracker — run for one account or all active; sweeps Gmail/Slack/Gong for last 7 days; updates actions table and PA3_Action_Tracker.xlsx; shows structured report
- [x] **SKILL-11**: Morning Briefing — fetch today's calendar via Glean, synthesize per-meeting context, store result in DB, display in Dashboard Briefing panel
- [x] **SKILL-12**: Context Updater — paste notes/transcript + select account → apply all 14 update steps → write to DB → export updated context doc to file; registers in engagement history
- [x] **SKILL-13**: Handoff Doc Generator — select account → generate structured handoff/coverage doc covering open actions, risks, key decisions, key contacts, and current workstream status
- [x] **SKILL-14**: SKILL.md files read from disk at runtime (skill_path configurable in settings); prompts never modified or simplified in code

### Output Library

- [x] **OUT-01**: All generated files registered in outputs table with account, skill/type, filename, filepath, created_at
- [x] **OUT-02**: Output Library view filterable by account, skill type, and date range
- [x] **OUT-03**: HTML output files render inline in the app; .docx and .pptx open via system default app
- [x] **OUT-04**: Regenerate action re-runs the generating skill with same or updated context; old file archived, new one registered

### Project Plan & Task Builder

- [x] **PLAN-01**: Task creation with title, description, owner, due date, priority (high/medium/low), type (technical/organizational/customer-facing), linked milestone
- [x] **PLAN-02**: Phase Board — Kanban-style with columns per delivery phase; workstream cards draggable between phases
- [x] **PLAN-03**: Task Board — scoped to phase/workstream; columns: To Do / In Progress / Blocked / Done
- [x] **PLAN-04**: Gantt Timeline — milestones and workstreams across configurable date range; color-coded by status; milestone dependency lines
- [x] **PLAN-05**: Team swimlane view — tasks organized by team with current status and upcoming due dates
- [x] **PLAN-06**: Task dependencies — mark task as blocked by another; dependency chains visualized in Gantt and Task Board
- [x] **PLAN-07**: Bulk operations — select multiple tasks, reassign owner, change due date, move to different phase
- [x] **PLAN-08**: Task templates — one-click instantiation for Biggy Activation, ADR Onboarding, Team Kickoff workstreams
- [ ] **PLAN-09**: Progress rollup — task completion → workstream percent_complete → project health score automatically
- [x] **PLAN-10**: Excel plan import from .xlsx (KAISER_Biggy_Project_Plan format) mapping columns to task schema
- [x] **PLAN-11**: Plan export to .xlsx in the same format as the Kaiser plan
- [x] **PLAN-12**: AI-assisted plan generation — given current project context, generates suggested task list for next 2 weeks scoped to current phase and open blockers
- [x] **PLAN-13**: Weekly sprint summary — plain-English summary of last week's completions, this week's due tasks, and at-risk items

### Cross-Project Knowledge Base

- [x] **KB-01**: Shared knowledge base spanning all accounts — capture patterns, solutions, and customer-handling notes that apply across projects
- [x] **KB-02**: Knowledge base entries are searchable and linkable to specific risks or engagement history entries
- [x] **KB-03**: Knowledge base entries carry source_trace (which project, which event, date captured)

### Search

- [ ] **SRCH-01**: Full-text search using PostgreSQL tsvector/tsquery across actions, risks, decisions, engagement history, stakeholders, artifacts, tasks, and knowledge base
- [x] **SRCH-02**: Search filterable by account, date range, and data type
- [x] **SRCH-03**: Search results show matching record in full context (which project, which section, which date)

### Scheduled Intelligence

- [x] **SCHED-01**: BullMQ worker process as dedicated process alongside Next.js app — not in-process cron; persists across restarts; no duplicate firing on multi-instance deploy
- [x] **SCHED-02**: Daily 8am: Morning Briefing background job — result stored in DB, surfaced in dashboard
- [x] **SCHED-03**: Daily 8am: Cross-account health check — flag status changes, approaching due dates, overdue actions
- [x] **SCHED-04**: Daily 9am: Overnight Slack + Gmail sweep for customer messages
- [x] **SCHED-05**: Monday 7am: Full Customer Project Tracker run for all active accounts
- [x] **SCHED-06**: Thursday 4pm: Weekly Status Draft generation for all active accounts; creates Gmail drafts; notifies dashboard
- [x] **SCHED-07**: Friday 9am: Biggy Weekly Briefing generation; stores in Output Library
- [x] **SCHED-08**: All schedule times configurable via Settings; jobs have queryable status (pending/running/completed/failed) visible in UI

### Settings

- [x] **SET-01**: Workspace path configuration (default: ~/Documents/BigPanda Projects/) — where output files are saved
- [ ] **SET-02**: Skill file location configuration (default: ~/.claude/get-shit-done/) — where SKILL.md files are read from
- [x] **SET-03**: Schedule time configuration for each background job
- [x] **SET-04**: Anthropic API key stored securely (not in .env committed to git; system keychain or local secrets file)

## v2 Requirements

### Deferred from v1

- **SKILL-09**: Biggy Weekly Briefing — select modules → generate .docx + email draft + Slack draft (three outputs in one run); deferred from Phase 7 — no SKILL.md, no handler, not in WIRED_SKILLS

### Team Expansion

- **TEAM-01**: JWT-based auth for multi-user access (when expanding beyond Josh to full PS team)
- **TEAM-02**: Per-user notification preferences
- **TEAM-03**: Collaborative editing with conflict resolution on shared project records

### Enhanced Intelligence

- **AI-01**: QBR deck generator (quarterly retrospective, value-realization focused)
- **AI-02**: Automated prompt injection detection layer for external content processed by skills
- **AI-03**: Skill performance benchmarking and quality scoring

### Integrations

- **INT-01**: Webhook triggers — new Slack message in customer channel triggers lightweight context update
- **INT-02**: Calendar write-back — create follow-up meeting from within the app

## Out of Scope

| Feature | Reason |
|---------|--------|
| Customer-facing read-only portal | External access adds auth/hosting complexity; email updates sufficient for v1 |
| QBR deck generator | External ELT deck covers the need; defer to v2 |
| JWT/SSO auth | Single-user initially; add when expanding to team |
| Real-time collaborative editing | Single-user; adds WebSocket complexity with no immediate benefit |
| Mobile app | Web-first; localhost deployment model makes mobile impractical |
| Hardcoded customer list | App is fully data-driven; Kaiser/AMEX/Merck are initial seed data only |
| Separate MCP server processes | Anthropic SDK tools array IS the MCP protocol — no extra processes needed |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Complete |
| DATA-05 | Phase 1 | Complete |
| DATA-06 | Phase 1 | Complete |
| DATA-07 | Phase 1 | Complete |
| DATA-08 | Phase 1 | Complete |
| SET-01 | Phase 1 | Complete |
| SET-02 | Phase 10 | Pending |
| SET-03 | Phase 1 | Complete |
| SET-04 | Phase 1 | Complete |
| DASH-01 | Phase 2 | Complete |
| DASH-02 | Phase 2 | Complete |
| DASH-03 | Phase 2 | Complete |
| DASH-06 | Phase 2 | Complete |
| DASH-07 | Phase 2 | Complete |
| DASH-08 | Phase 2 | Complete |
| WORK-01 | Phase 2 | Complete |
| WORK-03 | Phase 2 | Complete |
| WORK-04 | Phase 2 | Complete |
| WORK-05 | Phase 2 | Complete |
| WORK-06 | Phase 2 | Complete |
| WORK-07 | Phase 2 | Complete |
| WORK-08 | Phase 2 | Complete |
| WORK-09 | Phase 2 | Complete |
| WORK-02 | Phase 3 | Complete |
| PLAN-01 | Phase 3 | Complete |
| PLAN-02 | Phase 3 | Complete |
| PLAN-03 | Phase 3 | Complete |
| PLAN-04 | Phase 3 | Complete |
| PLAN-05 | Phase 3 | Complete |
| PLAN-06 | Phase 3 | Complete |
| PLAN-07 | Phase 3 | Complete |
| PLAN-08 | Phase 3 | Complete |
| PLAN-09 | Phase 11 | Pending |
| PLAN-10 | Phase 3 | Complete |
| PLAN-11 | Phase 3 | Complete |
| SCHED-01 | Phase 4 | Complete |
| SCHED-02 | Phase 4 | Complete |
| SCHED-03 | Phase 4 | Complete |
| SCHED-04 | Phase 4 | Complete |
| SCHED-05 | Phase 4 | Complete |
| SCHED-06 | Phase 4 | Complete |
| SCHED-07 | Phase 4 | Complete |
| SCHED-08 | Phase 4 | Complete |
| SKILL-01 | Phase 9 | Complete |
| SKILL-02 | Phase 5 | Complete |
| SKILL-03 | Phase 9 | Complete |
| SKILL-04 | Phase 9 | Complete |
| SKILL-11 | Phase 9 | Complete |
| SKILL-12 | Phase 9 | Complete |
| SKILL-13 | Phase 5 | Complete |
| SKILL-14 | Phase 5 | Complete |
| DASH-09 | Phase 5 | Complete |
| OUT-01 | Phase 5 | Complete |
| OUT-02 | Phase 5 | Complete |
| OUT-03 | Phase 5 | Complete |
| OUT-04 | Phase 5 | Complete |
| OVER-01 | Phase 5.1 | Complete |
| OVER-02 | Phase 5.1 | Complete |
| OVER-03 | Phase 5.1 | Complete |
| OVER-04 | Phase 5.1 | Complete |
| TIME-01 | Phase 5.2 | Complete |
| TIME-02 | Phase 5.2 | Complete |
| TIME-03 | Phase 5.2 | Complete |
| SKILL-10 | Phase 6 | Complete |
| DASH-04 | Phase 6 | Complete |
| DASH-05 | Phase 6 | Complete |
| SKILL-05 | Phase 7 | Complete |
| SKILL-06 | Phase 7 | Complete |
| SKILL-07 | Phase 7 | Complete |
| SKILL-08 | Phase 7 | Complete |
| SKILL-09 | v2 | Deferred |
| PLAN-12 | Phase 7 | Complete |
| PLAN-13 | Phase 7 | Complete |
| KB-01 | Phase 8 | Complete |
| KB-02 | Phase 8 | Complete |
| KB-03 | Phase 8 | Complete |
| SRCH-01 | Phase 10 | Pending |
| SRCH-02 | Phase 8 | Complete |
| SRCH-03 | Phase 8 | Complete |

**Coverage:**
- v1 requirements enumerated: 81 (DATA:8, DASH:9, WORK:9, OVER:4, TIME:3, SKILL:13, OUT:4, PLAN:13, KB:3, SRCH:3, SCHED:8, SET:4) — SKILL-09 moved to v2
- Mapped to phases: 81
- Unmapped: 0

> Note: Added OVER-01–04 (Onboarding Dashboard) and TIME-01–03 (Time Tracking) on 2026-03-23. WORK-01 marked superseded by OVER-01 — original implementation remains complete, replaced in Phase 5.1.

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-24 — SKILL-09 moved to v2; PLAN-09/SET-02/SKILL-01/03/04/11/12/SRCH-01 reset to Pending and reassigned to gap closure phases 9–11*
