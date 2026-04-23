---
gsd_state_version: 1.0
milestone: v9.0
milestone_name: — UX Maturity & Intelligence
status: completed
stopped_at: Completed 78-ai-content 78-02-PLAN.md
last_updated: "2026-04-23T20:13:40.972Z"
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 14
  completed_plans: 14
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22 after v9.0 milestone start)

**Core value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.
**Current focus:** v9.0 — UX Maturity & Intelligence (Phase 77 ready to plan)

## Current Position

Phase: 78 of 78 (AI & Content) — COMPLETE
Plan: 78-02 complete (Outputs Library inline previews + XSS hardening). All plans complete.
Status: v9.0 milestone COMPLETE — all phases shipped

Progress: [██████████] 100%

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

- Next.js 16 (Turbopack), PostgreSQL, Redis/BullMQ, better-auth, Drizzle ORM, Vercel AI SDK, @xyflow/react, @anthropic-ai/sdk, Recharts, docx-preview
- ~75,894 LOC TypeScript (v8.0 shipped)
- 157 test files passing (9 new in Phase 78)
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

- tasks-bulk multi-tenant gap: RESOLVED in 76-04 — POST /api/tasks-bulk now enforces requireProjectRole before update
- react-markdown XSS gap: RESOLVED in 78-02 — ChatMessage.tsx and all Outputs Library ReactMarkdown now use rehype-sanitize
- Meeting Prep prompt injection risk: RESOLVED in 78-01 — user-controlled strings escaped before interpolation in meeting-prep context builder

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
- (75-04) No DnD in Week view — omitted for simplicity per design intent
- (75-04) STATUS_BADGE_COLORS at module level (not inline) for potential reuse by future components
- (75-04) isIsoDate regex routes TBD/blank/non-ISO due strings to Unscheduled group
- (75-05) Non-admin sees read-only settings form (fields disabled, no Save button) instead of access-denied page
- (75-05) WbsTree activeTracks prop filter is render-layer only — pipelines and skill context receive full WBS dataset
- (75-05) WBS page wraps getProjectWithHealth in .catch(() => null) so missing project degrades to showing both tracks
- (75-05) visibleTracks recomputed each render; useEffect resets expandedIds + activeTrack on activeTracks prop change

### v9.0 Phase 77 Decisions (77-01)

- (77-01) Exceptions API returns full array; cap at 10 enforced in ExceptionsPanel component only (not API layer)
- (77-01) Stale detection uses created_at for tasks/actions/risks — tasks have no updated_at; last_updated on actions/risks is unreliable TEXT field
- (77-01) Milestones excluded from stale check (no updated_at column per schema)
- (77-01) actions stale: status != 'closed' (actionStatusEnum: open/in_progress/completed/cancelled — 'closed' not in enum but safe as catch-all)
- (77-01) risks stale: NOT IN ('closed', 'resolved', 'mitigated', 'accepted') — 'closed' included defensively

### v9.0 Phase 77 Decisions (77-02)

- (77-02) activeBaselineSnapshot stored in GanttChart state but not yet consumed — Plan 03 will read it for ghost bar rendering
- (77-02) Snapshot captures t.start/t.end directly (not drag-in-flight dragOverride state) — baseline reflects saved DB state
- (77-02) Compare dropdown hidden when no baselines exist — cleaner first-time UX, no empty dropdown shown
- (77-02) baselineId route returns 404 when baseline not found OR belongs to different project (prevents cross-project access)

### v9.0 Phase 77 Decisions (77-03)

- (77-03) Ghost bars use color.bar at 0.3 opacity for visual consistency with the current bar
- (77-03) WBS ghost span computed from min baseline start + max baseline end across all child tasks with snapshot entries
- (77-03) Variance sign: daysBetween(baselineEnd, currentEnd) — positive = behind schedule = red; negative = ahead = green
- (77-03) WBS aggregate variance uses max baseline spanEnd vs current spanEnd (consistent with span bar logic)
- (77-03) Section-header rows include w-14 spacer div for Variance column alignment — no value shown in separator rows

### v9.0 Phase 76 Decisions

- (76-01) OwnerCell datalist preserved for native browser autocomplete UX while tracking stakeholder by id internally
- (76-01) Blur handler resolves: empty->null, case-insensitive match->existing FK, no match->POST auto-create
- (76-01) risks PATCH schema owner_id excluded from 76-01 — handled by 76-03 to avoid parallel file conflict
- (76-01) Dual-write: both owner text and owner_id sent on save for backwards compatibility with display consumers
- (76-03) computeRiskScore returns N/A result when either likelihood or impact is null/undefined/invalid — avoids misleading scores for partially-configured risks
- (76-03) Risk Score is computed via IIFE in table cell JSX; no separate component needed for single-use render pattern
- (76-03) owner_id + owner added to risks PATCH schema in 76-03 (deferred from 76-01 to avoid parallel file conflict)
- (76-02) Left join milestones in getTasksForProject for milestone_name — avoids TaskBoard prop drilling; TaskWithBlockedStatus extends Task with is_blocked + milestone_name
- (76-02) Tasks API uses ?projectId=N (camelCase); milestones fetched via /api/projects/{id}/milestones returning {milestones:[...]}
- (76-02) Blocked-by is single-select only — PICK-03 multi-select text superseded by locked CONTEXT.md decision
- (76-02) blockedPhases Set<string> computed in WbsTree useMemo; propagated to WbsNode via prop for recursive blocked badge rendering
- (76-04) POST /api/tasks-bulk uses first task's project_id to gate entire batch via requireProjectRole — mirrors DELETE handler pattern
- (76-04) Update wrapped in transaction with SET LOCAL app.current_project_id for DB-level RLS enforcement
- (76-04) 404 returned when task_ids[0] not found (previously fell through to 500)

### v9.0 Phase 78 Decisions (78-01)

- (78-01) skills/meeting-prep.md force-added via `git add -f` — `/skills/` is root-anchored gitignored; plan requires file in version control
- (78-01) params.input?.notes used for optional meeting notes (input_required:false → SkillsTabClient sends undefined; Record<string,string> key is 'notes' by convention)
- (78-01) stripMarkdown lives in lib/strip-markdown.ts (not inline in page.tsx) for testability without DOM dependency
- (78-01) rehype-sanitize applied to SkillRunPage ReactMarkdown; ChatMessage.tsx hardening deferred to 78-02

### v9.0 Phase 78 Decisions (78-02)

- (78-02) docx-preview: dynamic import inside useEffect only (never at module level) — SSR-safe per locked CONTEXT.md decision
- (78-02) PPTX outputs show slide count badge + Download link; no inline render — per locked CONTEXT.md decision
- (78-02) getOutputType extracted to lib/output-utils.ts (no use client) — isolates pure logic from Client Component for Vitest safety
- (78-02) Slide count fetch is non-blocking — errors silently swallowed; badge only appears when count is known
- (78-02) rehype-sanitize applied to all ReactMarkdown instances — closes confirmed XSS gap from STATE.md security flags

### Blockers/Concerns

- Migration number confirmed: 0037 was highest before Phase 75; 0038–0042 applied cleanly
- Owner picker dual-write: audit all tables with owner text column against db/schema.ts before writing PATCH handlers in Phase 76 (known candidates: tasks, actions, risks, milestones, artifacts, wbs_items)
- docx-preview SSR: validate dynamic import + ssr:false is compatible with Outputs Library page before Phase 78 implementation
- Active tracks filter: RESOLVED in 75-05 — WBS expandedIds reset via useEffect when active_tracks config changes

## Session Continuity

Last session: 2026-04-23T16:33:19.428Z
Stopped at: Completed 78-ai-content 78-02-PLAN.md
Resume file: None
