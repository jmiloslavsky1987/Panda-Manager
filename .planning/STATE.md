---
gsd_state_version: 1.0
milestone: v9.0
milestone_name: — UX Maturity & Intelligence
status: executing
stopped_at: Completed 75-schema-quick-wins-admin/75-03-PLAN.md
last_updated: "2026-04-22T20:30:00.000Z"
last_activity: "2026-04-22 — 75-03 complete: DroppableColumn fixes empty-column dnd-kit drop targets; DELETE /api/tasks-bulk + BulkToolbar Delete Selected button"
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 5
  completed_plans: 3
  percent: 60
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22 after v9.0 milestone start)

**Core value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.
**Current focus:** v9.0 — UX Maturity & Intelligence (Phase 75 ready to plan)

## Current Position

Phase: 75 of 78 (Schema + Quick Wins + Admin)
Plan: 3 of 5 complete
Status: In Progress
Last activity: 2026-04-22 — 75-03 complete: DroppableColumn fixes empty-column dnd-kit drop targets; DELETE /api/tasks-bulk + BulkToolbar Delete Selected button

Progress: [███░░░░░░░] 60%

## Milestone History

- **v1.0** — Foundation + Read/Write Surface + Skills + MCP + Cross-Project (Phases 1–16, 63 plans, complete 2026-03-26)
- **v2.0** — AI Ingestion & Enhanced Operations (Phases 17–25, 63 plans, complete 2026-03-30)
- **v3.0** — Collaboration & Intelligence (Phases 26–30, 26 plans, complete 2026-04-01)
- **v4.0** — Infrastructure & UX Foundations (Phases 31–35, 26 plans, complete 2026-04-03)
- **v5.0** — Workspace UX Overhaul (Phases 37–42, 29 plans, complete 2026-04-07)
- **v6.0** — Dashboard, Navigation & Intelligence (Phases 43–57, 45 plans, complete 2026-04-14)
- **v7.0** — Governance & Operational Maturity (Phases 58–69, 41 plans, complete 2026-04-16)
- **v8.0** — Codebase Refactor & Multi-Tenant Deployment (Phases 70–74, 63 plans, complete 2026-04-22)

## Tech Stack

- Next.js 16 (Turbopack), PostgreSQL, Redis/BullMQ, better-auth, Drizzle ORM, Vercel AI SDK, @xyflow/react, @anthropic-ai/sdk, Recharts
- ~75,894 LOC TypeScript (v8.0 shipped)
- 148 test files passing
- Production build clean
- Code root: `/Users/jmiloslavsky/Documents/Panda-Manager`

## v9.0 Roadmap Summary

**4 phases (75–78) covering 33 requirements:**

- **Phase 75:** Schema + Quick Wins + Admin (MILE-01/02, TASK-01–05, ADMIN-01–04) — all 5 DB migrations + fix broken basics + admin settings form including active tracks toggle
- **Phase 76:** Pickers & Risk Fields (PICK-01–05, RISK-01–04) — FK-based owner/dependency/milestone pickers; risk structured fields with computed score; closes tasks-bulk multi-tenant security gap
- **Phase 77:** Intelligence & Gantt (HLTH-01–03, GANTT-01–04) — per-project exceptions panel with auto-computed health status + deep-links; Gantt phase date aggregation from tasks + baseline ghost bars
- **Phase 78:** AI & Content (SKILL-01–04, OUT-01–02) — Meeting Prep skill via existing BullMQ/skill infrastructure; inline output with copy button; Outputs Library inline preview + XSS hardening

## Accumulated Context

### Decisions (v8.0 carry-forward)

- requireSession() + requireProjectRole() at every route handler (CVE-2025-29927 defense-in-depth)
- Server Components fetch data as props; Client Islands fire PATCH + router.refresh()
- BullMQ + polling pattern for all long-running AI operations
- Code root migrated: `bigpanda-app/...` paths now resolve to `../Panda-Manager/...`

### v9.0 Architecture Decisions

- ADMIN-04 (active tracks toggle) moved to Phase 75 — co-located with admin settings form (ADMIN-01–03) and the active_tracks JSONB migration; avoids a separate phase for a single requirement
- Track filtering is render-layer only — skill context, extraction pipelines, and Gantt baselines always receive the full WBS dataset regardless of active_tracks setting
- Risk Score computed via pure function (lib/risk-score.ts), never stored as a DB column
- tasks-bulk multi-tenant security gap fixed in Phase 76 (same phase as bulk action UI extension)
- XSS hardening (rehype-sanitize) applied to all react-markdown instances in Phase 78 (same phase as Outputs Library preview — the new surface that introduces risk)

### Security Flags for v9.0

- tasks-bulk multi-tenant gap: confirmed in app/api/tasks-bulk/route.ts — fix in Phase 76
- react-markdown XSS gap: ChatMessage.tsx renders without rehype-sanitize — fix in Phase 78
- Meeting Prep prompt injection risk: escape user-controlled strings before interpolation — enforce in Phase 78

### v9.0 Phase 75 Decisions

- Applied 0038–0042 migrations via psql directly and seeded _migrations tracking table (DB was previously managed by drizzle-kit with __drizzle_migrations, not _migrations)
- chat_messages migration uses CREATE TABLE IF NOT EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS for safe handling of both fresh and existing DB states
- owner_id FK columns are nullable (ON DELETE SET NULL) so existing rows are unaffected
- (75-02) milestone_status enum rebuilt via DROP+CREATE (column was already TEXT — prior setup did not create a typed enum); values: on_track/at_risk/complete/missed
- (75-02) coerceMilestoneStatus maps blocked/stuck/at-risk → at_risk, missed/overdue/late → missed, completed/done → complete, all else → on_track
- (75-02) overdueMilestones computed in getPortfolioData from existing milestoneData fetch (no extra DB query)
- (75-03) DroppableColumn placed inside SortableContext so SortableContext owns sort logic while DroppableColumn provides droppable identity for empty-column resolution via over.id
- (75-03) tasks-bulk DELETE uses first task's project_id for requireProjectRole; full per-task validation deferred to Phase 76's multi-tenant gap fix
- (75-03) No delete confirmation dialog in BulkToolbar per design intent

### Blockers/Concerns

- Migration number confirmed: 0037 was highest before Phase 75; 0038–0042 applied cleanly
- Owner picker dual-write: audit all tables with owner text column against db/schema.ts before writing PATCH handlers in Phase 76 (known candidates: tasks, actions, risks, milestones, artifacts, wbs_items)
- docx-preview SSR: validate dynamic import + ssr:false is compatible with Outputs Library page before Phase 78 implementation
- Active tracks filter: WBS expandedIds must be reset in useEffect when active_tracks config changes (stale Set can reveal hidden rows)

## Session Continuity

Last session: 2026-04-22T20:30:00.000Z
Stopped at: Completed 75-schema-quick-wins-admin/75-03-PLAN.md
Resume file: None
