# Requirements: BigPanda AI Project Management App

**Defined:** 2026-03-18
**Core Value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.

## v1 Requirements

### Data Foundation

- [ ] **DATA-01**: Database schema implements all tables from briefing (projects, workstreams, actions, risks, milestones, artifacts, history, stakeholders, tasks, plan_templates, outputs, knowledge_base) with PostgreSQL RLS enforced at DB layer
- [ ] **DATA-02**: Append-only tables (engagement_history, key_decisions) are enforced by DB trigger — not application convention
- [ ] **DATA-03**: Migration script imports all three existing customer context docs (YAML frontmatter → DB) with source tracing preserved
- [ ] **DATA-04**: Migration script imports PA3_Action_Tracker.xlsx (two-sheet format) into actions table
- [ ] **DATA-05**: Context doc export: DB → YAML frontmatter Markdown with exact js-yaml settings (sortKeys: false, lineWidth: -1, JSON_SCHEMA) — round-trip fidelity with Cowork skills
- [ ] **DATA-06**: Multi-account architecture: user can add new projects, close completed ones (archived as read-only), with no hardcoded customer names anywhere in the codebase
- [ ] **DATA-07**: Idempotency key and status field on outputs table (created immediately as 'running') to prevent duplicate skill runs on SSE reconnect
- [ ] **DATA-08**: PostgreSQL connection pool implemented as singleton — no per-request pool creation

### Dashboard

- [ ] **DASH-01**: Today's Briefing panel displays stored morning-briefing result; refreshable on demand
- [ ] **DASH-02**: Project Health cards for all active accounts showing auto-derived RAG status, one-line summary, and open high-priority action count
- [ ] **DASH-03**: Health score auto-derived from data signals: overdue actions, stalled milestones (no progress in 14+ days), and unresolved high-severity risks — no manual RAG entry required
- [ ] **DASH-04**: Cross-project Risk Heat Map (probability × impact matrix) across all active accounts visible on dashboard
- [ ] **DASH-05**: Cross-Account Watch List showing escalated or time-sensitive items spanning multiple customers
- [ ] **DASH-06**: Recent Activity Feed showing last 7 days of skill runs, file outputs, and history entries across all projects
- [ ] **DASH-07**: Quick Action Bar with one-click buttons: Run Tracker, Generate Briefing, Weekly Status Draft (per active account)
- [ ] **DASH-08**: In-app notification badge for overdue actions, approaching go-live dates (within 14 days), and new tracker results
- [ ] **DASH-09**: Drafts Inbox — unified queue of all AI-generated drafts (emails, Slack messages) pending review before send; no AI content reaches external parties without passing through this queue

### Project Workspace

- [ ] **WORK-01**: Overview tab — workstream progress bars (ADR and Biggy tracks), milestone timeline, auto-derived health status, go-live target
- [ ] **WORK-02**: Actions tab — filterable by status/owner/due date, inline editing (complete, add notes, change owner), every save syncs to PA3_Action_Tracker.xlsx atomically (dual-write)
- [ ] **WORK-03**: Risks tab — risk register with append-only mitigation log, inline severity/status editing, full mitigation history visible per risk
- [ ] **WORK-04**: Milestones tab — milestone tracker with action links, status indicators, completion history
- [ ] **WORK-05**: Teams tab — team onboarding status table (ADR + Biggy tracks) with onboarding velocity view showing time-in-phase and stall detection (team in same phase 14+ days with no logged activity)
- [ ] **WORK-06**: Architecture tab — Before BigPanda state documentation and current integration status summary, editable inline
- [ ] **WORK-07**: Decisions tab — append-only key decisions and alignments, searchable, never deletable
- [ ] **WORK-08**: Engagement History tab — append-only history entries with date/source, add new entries from pasted notes or transcripts
- [ ] **WORK-09**: Stakeholders tab — BigPanda and customer contacts roster with add/edit for name, role, email, Slack ID, notes

### Skill Launcher

- [ ] **SKILL-01**: SkillOrchestrator service cleanly separated from HTTP Route Handlers — same code path for manual (SSE) and BullMQ-worker (scheduled) invocations
- [ ] **SKILL-02**: Token budget guard in context assembly — estimates token count before Claude call, truncates or summarizes low-priority context sections if over budget
- [ ] **SKILL-03**: Weekly Customer Status — select account → generate customer-facing email from DB context; copy to clipboard or save as file; optionally creates Gmail draft
- [ ] **SKILL-04**: Meeting Summary — paste notes/transcript + select account → generate .docx + optional .mermaid diagram; registers entry in engagement history
- [ ] **SKILL-05**: ELT External Status — select account + month → generate 5-slide .pptx (confidence-framed, partnership tone, no internal severity language)
- [ ] **SKILL-06**: ELT Internal Status — select account + date → generate internal .pptx (direct tone, surfaces blockers)
- [ ] **SKILL-07**: Team Engagement Map — select account → generate self-contained HTML (business outcomes, ADR/Biggy flows, team status table)
- [ ] **SKILL-08**: Workflow Diagram — select account → generate before/after HTML with two tabs
- [ ] **SKILL-09**: Biggy Weekly Briefing — select modules → generate .docx + email draft + Slack draft (three outputs in one run)
- [ ] **SKILL-10**: Customer Project Tracker — run for one account or all active; sweeps Gmail/Slack/Gong for last 7 days; updates actions table and PA3_Action_Tracker.xlsx; shows structured report
- [ ] **SKILL-11**: Morning Briefing — fetch today's calendar via Glean, synthesize per-meeting context, store result in DB, display in Dashboard Briefing panel
- [ ] **SKILL-12**: Context Updater — paste notes/transcript + select account → apply all 14 update steps → write to DB → export updated context doc to file; registers in engagement history
- [ ] **SKILL-13**: Handoff Doc Generator — select account → generate structured handoff/coverage doc covering open actions, risks, key decisions, key contacts, and current workstream status
- [ ] **SKILL-14**: SKILL.md files read from disk at runtime (skill_path configurable in settings); prompts never modified or simplified in code

### Output Library

- [ ] **OUT-01**: All generated files registered in outputs table with account, skill/type, filename, filepath, created_at
- [ ] **OUT-02**: Output Library view filterable by account, skill type, and date range
- [ ] **OUT-03**: HTML output files render inline in the app; .docx and .pptx open via system default app
- [ ] **OUT-04**: Regenerate action re-runs the generating skill with same or updated context; old file archived, new one registered

### Project Plan & Task Builder

- [ ] **PLAN-01**: Task creation with title, description, owner, due date, priority (high/medium/low), type (technical/organizational/customer-facing), linked milestone
- [ ] **PLAN-02**: Phase Board — Kanban-style with columns per delivery phase; workstream cards draggable between phases
- [ ] **PLAN-03**: Task Board — scoped to phase/workstream; columns: To Do / In Progress / Blocked / Done
- [ ] **PLAN-04**: Gantt Timeline — milestones and workstreams across configurable date range; color-coded by status; milestone dependency lines
- [ ] **PLAN-05**: Team swimlane view — tasks organized by team with current status and upcoming due dates
- [ ] **PLAN-06**: Task dependencies — mark task as blocked by another; dependency chains visualized in Gantt and Task Board
- [ ] **PLAN-07**: Bulk operations — select multiple tasks, reassign owner, change due date, move to different phase
- [ ] **PLAN-08**: Task templates — one-click instantiation for Biggy Activation, ADR Onboarding, Team Kickoff workstreams
- [ ] **PLAN-09**: Progress rollup — task completion → workstream percent_complete → project health score automatically
- [ ] **PLAN-10**: Excel plan import from .xlsx (KAISER_Biggy_Project_Plan format) mapping columns to task schema
- [ ] **PLAN-11**: Plan export to .xlsx in the same format as the Kaiser plan
- [ ] **PLAN-12**: AI-assisted plan generation — given current project context, generates suggested task list for next 2 weeks scoped to current phase and open blockers
- [ ] **PLAN-13**: Weekly sprint summary — plain-English summary of last week's completions, this week's due tasks, and at-risk items

### Cross-Project Knowledge Base

- [ ] **KB-01**: Shared knowledge base spanning all accounts — capture patterns, solutions, and customer-handling notes that apply across projects
- [ ] **KB-02**: Knowledge base entries are searchable and linkable to specific risks or engagement history entries
- [ ] **KB-03**: Knowledge base entries carry source_trace (which project, which event, date captured)

### Search

- [ ] **SRCH-01**: Full-text search using PostgreSQL tsvector/tsquery across actions, risks, decisions, engagement history, stakeholders, artifacts, tasks, and knowledge base
- [ ] **SRCH-02**: Search filterable by account, date range, and data type
- [ ] **SRCH-03**: Search results show matching record in full context (which project, which section, which date)

### Scheduled Intelligence

- [ ] **SCHED-01**: BullMQ worker process as dedicated process alongside Next.js app — not in-process cron; persists across restarts; no duplicate firing on multi-instance deploy
- [ ] **SCHED-02**: Daily 8am: Morning Briefing background job — result stored in DB, surfaced in dashboard
- [ ] **SCHED-03**: Daily 8am: Cross-account health check — flag status changes, approaching due dates, overdue actions
- [ ] **SCHED-04**: Daily 9am: Overnight Slack + Gmail sweep for customer messages
- [ ] **SCHED-05**: Monday 7am: Full Customer Project Tracker run for all active accounts
- [ ] **SCHED-06**: Thursday 4pm: Weekly Status Draft generation for all active accounts; creates Gmail drafts; notifies dashboard
- [ ] **SCHED-07**: Friday 9am: Biggy Weekly Briefing generation; stores in Output Library
- [ ] **SCHED-08**: All schedule times configurable via Settings; jobs have queryable status (pending/running/completed/failed) visible in UI

### Settings

- [ ] **SET-01**: Workspace path configuration (default: ~/Documents/BigPanda Projects/) — where output files are saved
- [ ] **SET-02**: Skill file location configuration (default: ~/.claude/get-shit-done/) — where SKILL.md files are read from
- [ ] **SET-03**: Schedule time configuration for each background job
- [ ] **SET-04**: Anthropic API key stored securely (not in .env committed to git; system keychain or local secrets file)

## v2 Requirements

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
| DATA-01 through DATA-08 | Phase 1 | Pending |
| DASH-01 through DASH-09 | Phase 2 | Pending |
| WORK-01 through WORK-09 | Phase 2 | Pending |
| SKILL-01 through SKILL-02 | Phase 4 | Pending |
| SKILL-03 through SKILL-14 | Phase 5 | Pending |
| OUT-01 through OUT-04 | Phase 5 | Pending |
| SCHED-01 through SCHED-08 | Phase 4 | Pending |
| SET-01 through SET-04 | Phase 1 | Pending |
| PLAN-01 through PLAN-13 | Phase 6 | Pending |
| KB-01 through KB-03 | Phase 7 | Pending |
| SRCH-01 through SRCH-03 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 69 total
- Mapped to phases: 69
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 after initial definition*
