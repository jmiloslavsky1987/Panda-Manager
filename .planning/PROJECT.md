# BigPanda AI Project Management App

## What This Is

An AI-native project management platform purpose-built for BigPanda's Professional Services delivery team. It replaces the current workflow of manually running individual Cowork skills by delivering a unified, persistent application where every customer project lives, every action is tracked, every communication is synthesized automatically, and every deliverable can be generated in one click from a live database. Supports n active customer accounts with full lifecycle management (add, close, archive).

## Core Value

Every PS delivery intelligence the team has built — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.

## Requirements

### Validated

(None yet — ship to validate)

### Active

#### Data Foundation
- [ ] PostgreSQL database implementing the full schema from the briefing (projects, workstreams, actions, risks, milestones, artifacts, history, stakeholders, tasks, plan_templates, outputs, knowledge_base)
- [ ] Migration scripts to import existing customer context docs (YAML → DB) and PA3_Action_Tracker.xlsx
- [ ] Context doc export: DB → YAML frontmatter Markdown (round-trip fidelity with Cowork skills)
- [ ] Multi-account architecture: add new projects, close completed ones, archive read-only

#### Dashboard
- [ ] Today's Briefing panel (morning-briefing skill output, stored in DB, refreshable on demand)
- [ ] Project Health cards — all active accounts showing auto-derived RAG status + one-line summary + open high-priority action count
- [ ] Auto health scoring derived from overdue actions, stalled milestones, and unresolved high risks
- [ ] Cross-project Risk Heat Map (probability × impact matrix across all active accounts)
- [ ] Cross-Account Watch List (escalated/time-sensitive items across customers)
- [ ] Recent Activity Feed (last 7 days: skill runs, file outputs, history entries)
- [ ] Quick Action Bar (one-click: Run Tracker, Generate Briefing, Weekly Status Draft per account)
- [ ] In-app notification badge for overdue actions, approaching go-live dates, new tracker results
- [ ] Drafts Inbox — unified queue of all AI-generated drafts (emails, Slack) pending review before send

#### Project Workspace (per account)
- [ ] Overview tab — workstream progress bars, milestone timeline, auto-derived health status
- [ ] Actions tab — filterable action tracker, inline editing (complete, add notes, change owner), syncs to PA3_Action_Tracker.xlsx
- [ ] Risks tab — risk register with append-only mitigation log, severity/status editing
- [ ] Milestones tab — milestone tracker with action links and completion history
- [ ] Teams tab — team onboarding status table (ADR + Biggy tracks) with onboarding velocity view (time-in-phase, stall detection)
- [ ] Architecture tab — Before BigPanda state and integration status documentation
- [ ] Decisions tab — append-only key decisions and alignments, searchable
- [ ] Engagement History tab — append-only history entries, add from notes/transcripts
- [ ] Stakeholders tab — BigPanda and customer contacts roster

#### Skill Launcher (15 skills)
- [ ] Weekly Customer Status — generate customer-facing email from project context
- [ ] Meeting Summary — paste notes → .docx + optional .mermaid diagram
- [ ] ELT External Status — 5-slide .pptx (confidence-framed, partnership tone)
- [ ] ELT Internal Status — internal .pptx (direct, surfaces blockers)
- [ ] Team Engagement Map — self-contained HTML with business outcomes, ADR/Biggy flows, team status
- [ ] Workflow Diagram — before/after HTML with two tabs
- [ ] Biggy Weekly Briefing — .docx + email draft + Slack draft
- [ ] Customer Project Tracker — Gmail/Slack/Gong sweep, updates DB and action tracker
- [ ] Morning Briefing — per-meeting intelligence from calendar + context
- [ ] Context Updater — paste notes → apply 14 update steps → write to DB → export context doc
- [ ] Handoff Doc Generator — structured handoff/coverage doc from project context (open actions, risks, key decisions, key contacts)
- [ ] XLSX, DOCX, PPTX core skills (callable internally by other skills)

#### Output Library
- [ ] All generated files registered in outputs table with customer, type, date, filename
- [ ] Filter by account, skill/type, date range
- [ ] HTML files render inline; .docx/.pptx open via system app
- [ ] Regenerate: re-run generating skill, archive old file

#### Project Plan & Task Builder
- [ ] Task creation with title, description, owner, due date, priority, type, linked milestone
- [ ] Phase Board (Kanban) — workstream cards per delivery phase
- [ ] Task Board (Trello-style) — scoped to phase/workstream; To Do / In Progress / Blocked / Done
- [ ] Gantt Timeline — milestones and workstreams with dependency lines and status color-coding
- [ ] Team swimlane view — tasks by team, current status, upcoming due dates
- [ ] Task dependencies with blocker chain visualization
- [ ] Bulk operations (reassign, reschedule, move phase)
- [ ] Task templates: Biggy Activation, ADR Onboarding, Team Kickoff
- [ ] Progress rollup: task completion → workstream percent_complete → project health
- [ ] Excel plan import (KAISER_Biggy_Project_Plan format) and export
- [ ] AI-assisted plan generation from context and weekly sprint summary

#### Cross-Project Knowledge Base
- [ ] Shared lessons-learned layer spanning all accounts
- [ ] Capture patterns, solutions, and customer-handling notes that apply across projects
- [ ] Searchable and linkable to specific risks or engagement history entries

#### Search
- [ ] Full-text search across actions, risks, decisions, engagement history, stakeholders, artifacts, tasks, knowledge base
- [ ] Filter by account, date range, data type
- [ ] Results show matching record in context (which project, which section, which date)

#### Scheduled Intelligence
- [ ] Daily 8am: Morning Briefing background job (result stored in DB, surfaced in dashboard)
- [ ] Daily 8am: Cross-account health check (flag status changes, approaching due dates)
- [ ] Daily 9am: Overnight Slack + Gmail sweep
- [ ] Monday 7am: Full Customer Project Tracker run (all active accounts)
- [ ] Thursday 4pm: Weekly Status Draft generation for all active accounts
- [ ] Friday 9am: Biggy Weekly Briefing generation

#### Settings
- [ ] Workspace path (default: ~/Documents/BigPanda Projects/)
- [ ] Skill file location (default: ~/.claude/get-shit-done/)
- [ ] Schedule times (configurable for each job)
- [ ] Anthropic API key (stored securely)

### Out of Scope

- Customer-facing read-only portal — external access adds auth complexity; email updates sufficient for v1
- QBR deck generator — external ELT deck covers the need
- JWT/SSO auth — single-user initially; add when expanding to full PS team
- Hardcoded customer list — app is fully data-driven; Kaiser/AMEX/Merck are initial seed data only

## Context

This is a full rewrite of a previous Claude Code project assistant build (8 phases completed, React/Vite/Express/Google Drive architecture). The new architecture is Next.js 14 + PostgreSQL. The 14 Cowork skills (SKILL.md files at ~/.claude/get-shit-done/skills/) are the canonical feature specification — skill prompts must not be rewritten or simplified. SKILL.md files are read from disk at runtime (not bundled). All data model patterns (archive-on-replace, dual-write atomicity, append-only history, source tracing, ID conventions) are proven in the existing skill ecosystem and must be preserved. The PA3_Action_Tracker.xlsx row format (Customer | ID | Description | Owner | Due | Status | Last Updated | Notes) is contractual — Cowork skills depend on it exactly.

## Constraints

- **Tech Stack**: Next.js 14+ / React / Tailwind CSS / Node.js / PostgreSQL — as specified in briefing
- **Skill Fidelity**: SKILL.md files read from disk at runtime; prompts must not be modified
- **Cowork Compatibility**: Exported context docs and action tracker must be readable by all Cowork skills without modification
- **ID Conventions**: Action IDs: A-[CUSTOMER]-NNN, Risk IDs: R-[CUSTOMER]-NNN, Milestone IDs: M-[CUSTOMER]-NNN — globally unique, never reused
- **Append-only**: Engagement History and Key Decisions are never modified, only added to
- **Source Tracing**: Every action, risk, artifact, and decision must carry source_trace (origin file, date, verified vs. inferred)
- **Tone Separation**: Customer-facing outputs are calm/partnership-framed; internal outputs are direct/analytical — never expose internal severity in external outputs
- **No Invented Data**: AI agents must never invent percentages, dates, or facts — all numbers from DB

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Full rewrite (not evolution of existing app) | Next.js + PostgreSQL is a fundamentally different architecture from React/Vite/Express/Drive | — Pending |
| SKILL.md files read from disk at runtime | Always current, no bundling drift, compatible with Cowork updates | — Pending |
| Auto-derive health scoring (not manual) | Removes human inconsistency; flags disagreement between data signals and gut feel | — Pending |
| n-account architecture (not hardcoded 3) | Business will grow; new PS engagements must be addable without code changes | — Pending |
| Closed projects → archive (read-only) | Lessons learned and engagement history must remain searchable after project close | — Pending |

---
*Last updated: 2026-03-18 after initialization*
