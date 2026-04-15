---
gsd_state_version: 1.0
milestone: v7.0
milestone_name: — Governance & Operational Maturity
status: executing
last_updated: "2026-04-15T20:11:42.000Z"
last_activity: 2026-04-15 — Completed 65-03-PLAN.md (Project-scoped scheduler UI integration)
progress:
  total_phases: 12
  completed_phases: 7
  total_plans: 29
  completed_plans: 29
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-13 after v7.0 milestone start)

**Core value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.
**Current focus:** Phase 65 (Project-Scoped Scheduling) — Plan 3 of 4 complete (Project-scoped scheduler UI integration)

## Current Position

Phase: 65 of 69 (Project-Scoped Scheduling) — IN PROGRESS
Plan: 4 of 4 in current phase
Status: In Progress — 65-03-PLAN.md complete (Project-scoped scheduler UI integration)
Last activity: 2026-04-15 — Completed 65-03-PLAN.md (Project-scoped scheduler UI integration)

Progress: [██████████] 100% (232 of 233 plans complete in milestone)

## Milestone History

- **v1.0** — Foundation + Read/Write Surface + Skills + MCP + Cross-Project (Phases 1–16, 63 plans, complete 2026-03-26)
- **v2.0** — AI Ingestion & Enhanced Operations (Phases 17–25, 63 plans, complete 2026-03-30)
- **v3.0** — Collaboration & Intelligence (Phases 26–30, 26 plans, complete 2026-04-01)
- **v4.0** — Infrastructure & UX Foundations (Phases 31–35 complete; Phase 36 deferred, complete 2026-04-03)
- **v5.0** — Workspace UX Overhaul (Phases 37–42, 29 plans, complete 2026-04-07)
- **v6.0** — Dashboard, Navigation & Intelligence (Phases 43–57, 45 plans, complete 2026-04-14)
- **v7.0** — Governance & Operational Maturity (Phases 58–69, in progress)

## Tech Stack

- Next.js 16 (Turbopack), PostgreSQL, Redis/BullMQ, better-auth, Drizzle ORM, Vercel AI SDK, @xyflow/react, @anthropic-ai/sdk, Recharts
- ~69,606 LOC TypeScript (v6.0 shipped)
- 148 test files passing; 4 intentional RED portfolio stubs (to be resolved in v7.0 Phase 69)
- Production build clean

## Established Patterns

- requireSession() at Route Handler level (CVE-2025-29927 defense-in-depth)
- CustomEvent (metrics:invalidate) for cross-tab sync
- Client-side filtering: Server Component passes full data, Client island filters in-memory via URL params
- BullMQ background jobs + polling for long-running operations
- Advisory lock + Redis cache for scheduled jobs (7-day TTL pattern)
- React Flow with dynamic import + ssr:false for diagram components
- Wave 0 RED stubs → Wave 1 implementation → human verification gate (TDD contract)
- 4-pass extraction pipeline: Pass 0 pre-analysis + Passes 1/2/3 by entity group
- Synthesis-first extraction: document type classification + transcript-mode conditional instructions
- Gap-closure phases after milestone audit (Phases 54–57 pattern)

## Known Tech Debt Entering v7.0

- 4 portfolio RED TDD stubs never driven to GREEN (`__tests__/portfolio/`) — in scope for v7.0 (Phase 69: TEST-01)
- WBS and Portfolio UX human verification pending (performance at 100+ nodes, filter panel, drag-drop)
- Nyquist validation incomplete: 9/16 v6.0 phases at `nyquist_compliant: false` (draft status)
- Empty state CTA onClick handlers are `() => {}` placeholders (wiring to creation modals deferred)

## v7.0 Roadmap Summary

**12 phases (58–69) covering 43 requirements across 13 categories:**

- **Phase 58:** Per-Project RBAC (AUTH-02–05) — foundation, blocks others
- **Phase 59:** Project Lifecycle Management (PROJ-01–04, AUTH-01, PORTF-01–02) — archive/delete/restore
- **Phase 60:** Health Dashboard Redesign (HLTH-01–02) — auto-derived executive metrics
- **Phase 61:** Ingestion Edit & Move (INGEST-01, 02, 05) — correction workflow
- **Phase 62:** Ingestion Consolidation (INGEST-03, 04) — scan + completeness
- **Phase 63:** Skills Design Standard (SKILL-01, 02, 04) — foundation for editing
- **Phase 64:** Editable Prompts UI (SKILL-03a, 03b) — admin control, blocked by Phase 58 + 63
- **Phase 65:** Project-Scoped Scheduling (SCHED-01–05) — blocked by Phase 58
- **Phase 66:** Overview Tracks Redesign (OVRVW-01–05) — static/dynamic tracks
- **Phase 67:** Delivery Tab Cleanup (DLVRY-05–10, TEAM-01–02) — polish
- **Phase 68:** Gantt Bi-directional Sync (DLVRY-01–04) — date integrity
- **Phase 69:** Knowledge Base + Outputs + Testing (KB-01, OUT-01, TEST-01) — cleanup

**Critical dependencies:**
- Phase 64 blocked by Phase 63 (Design Standard required before prompt editing)
- Phase 64 blocked by Phase 58 (admin-only RBAC)
- Phase 65 blocked by Phase 58 (RBAC required for admin enforcement)

**Critical risks flagged by research:**
- RBAC migration incompleteness (40+ route handlers): Partial migration creates security holes
- Soft-delete cascade blind spots: 57+ phases of FK evolution requires careful audit
- Gantt bi-directional sync race conditions: Advisory locks required for Phase 68

**Next action:** Execute Phase 64-04 (Wire up save button to PATCH endpoint)

## Recent Decisions

### Phase 63-01: Skills Design Standard
- **YAML front-matter schema with 6 required fields** (label, description, input_required, input_label, schedulable, error_behavior) — Locked user decision from phase research; provides runtime metadata for Skills tab dynamic rendering
- **Front-matter block must be first line of file** (opening --- at line 1) — Parser simplicity and consistency
- **error_behavior enum with "retry" and "fail" values** — Gives skill authors control over retry semantics

### Phase 63-02: Skills Tab Server Refactor
- **SkillMeta type in types/skills.ts for shared import** — Both server and client components need the type definition
- **Manual YAML parsing (no yaml library dependency)** — Simple key-value parsing sufficient for 6-field schema, avoids dependency bloat
- **All skills runnable (Fix required badge informational only)** — Non-compliant skills remain functional during migration, admin can fix without breaking user workflows
- **Exclude context-updater from Skills tab** — Backend processing skill per CONTEXT.md scope definition, not a documentation skill

### Phase 63-04: Human Verification Gate
- **Handoff Doc Generator is valid and kept in catalog** — User confirmed it's a functional skill, not a mistake
- **Table rendering gap is a follow-up item, not a blocker** — Skill execution works correctly; markdown table formatting in UI is a display enhancement for future phase

### Phase 64-01: TDD RED Stubs for Editable Prompts
- **Settings round-trip tests use Partial<AppSettings> as any cast for RED phase** — Validates persistence layer before adding TypeScript types; writeSettings already handles unknown fields via object spread
- **Admin guard tests left as .todo stubs** — RBAC admin enforcement depends on Phase 58 (Per-Project RBAC) implementation; stubs define contract for future wiring
- **Body extraction regex pattern deferred to GREEN phase** — Todo stubs document edge cases without implementation; regex will be added when driving stubs to GREEN

### Phase 64-02: Backend Implementation for Editable Prompts
- **Inline validation in prompt route to avoid Server Component import** — parseSkillMeta lives in Server Component and cannot be imported into route handler; implemented inline validateSkillDesignStandard() with same validation logic
- **Body trimStart() normalization in PATCH** — Always normalizes body with trimStart() before reconstruction to ensure consistent spacing after front-matter block
- **Audit log not in DB transaction** — File write and audit log insert are separate operations; file system operations are not transactional with PostgreSQL
- **Backup naming with .bak extension** — Uses ${filePath}.${Date.now()}.bak pattern; .bak files excluded from Skills tab (loader filters .md only)
- **Next.js 15 async params pattern** — GET and PATCH handlers use params: Promise<{ skillName: string }> and await params for Next.js 15+ compatibility

### Phase 64-03: CodeMirror Editor & Prompt Modal
- **Used @uiw/react-codemirror wrapper with uncontrolled mode (useRef buffering) to avoid cursor jump issues** — Wrapper provides cleaner React integration; useRef buffering prevents re-render cursor jumps from controlled mode
- **CSS resize:vertical on editor container for native browser resize handle** — Native browser resize UX, simpler than custom drag handlers
- **Dynamic import with ssr:false for CodeMirrorEditor** — Prevents SSR issues with CodeMirror's browser-only APIs (document, DOM manipulation)

### Phase 64-04: Wire Editable Prompts UI
- **Server-side admin resolution in skills/page.tsx using same pattern as layout.tsx** — Ensures isAdmin prop is correctly resolved before rendering client island; reuses established resolveRole + projectMembers query pattern
- **Edit button conditionally rendered when promptEditingEnabled && isAdmin && !isRunning** — Clean three-condition check prevents edit access during skill execution; UX concern to avoid confusion
- **Settings page Skills tab rendered unconditionally (server-side 403 guard is security boundary)** — Client-side rendering of admin-only controls is UI convenience per plan guidance; /api/settings POST handler enforces admin-only access
- **Test files updated with new required props (Rule 3 deviation)** — Extended SkillsTabClientProps interface broke 7 test render calls; added mockSkills array and updated all calls to fix blocking TypeScript errors

### Phase 64-05: Build Verification + Human Verification Gate
- **Human verification confirmed all 8 verification steps passing** — Settings toggle persistence, Edit button visibility (admin-only, toggle-gated), modal rendering with locked front-matter and CodeMirror editor, resize handle, full-screen toggle, successful save with persistence and backup, validation failure with inline error, and audit log entry all verified in browser
- **Modal state reset pattern prevents unsaved edits from leaking across open/close cycles** — Bug discovered during verification: editor state (editorContent, editorHeight, isFullScreen) persisted across modal close/open; fixed by resetting state in onClose handler to discard unsaved edits on Cancel

### Phase 65-01: Schema and API Foundation for Project-Scoped Scheduling
- **ON DELETE SET NULL for project_id FK** — If a project is deleted, its jobs become global (project_id = NULL) rather than being cascade-deleted or blocking deletion; preserves work and allows jobs to continue running
- **Global view filters to IS NULL, not all jobs** — GET /api/jobs with no projectId param returns only jobs with project_id IS NULL; separates global and project-scoped jobs cleanly; prevents project jobs from appearing in global scheduler
- **NotificationBadge removed from Scheduler sidebar link** — Scheduler failure notifications will be per-project in future phases; global badge no longer fits the scoping model; removed badge and associated query to avoid UX confusion during transition

### Phase 65-02: Project-Scoped Jobs API & Wizard Integration
- **Exported CreateJobSchema from global jobs route for reuse** — Project-scoped route imports schema to ensure validation consistency; avoids schema drift between global and project routes
- **Project route forces project_id to route param** — Security boundary: caller cannot override project_id via request body; always set to numericId from URL param for RBAC enforcement
- **Auto-inject projectId into skill_params_json at server side** — BullMQ worker receives project context without client-side knowledge; server-side injection pattern ensures workers have correct project scope
- **hideScope prop pattern for JobSkillStep** — Cleaner than passing projectId down; encapsulates conditional UI rendering in child component

### Phase 65-03: Project-Scoped Scheduler UI Integration
- **ProjectSchedulerSection as local component in SkillsTabClient** — Scope encapsulation; not a separate file since it's tightly coupled to Skills tab context
- **Controlled/uncontrolled expandedId pattern** — Allows URL state management in project context (controlled mode with useSearchParams) while preserving standalone table behavior (uncontrolled mode for global scheduler)
- **readOnly mode hides all action controls** — Non-admin users see jobs and run history but cannot Create/Edit/Delete/Toggle/Trigger; cleaner than per-button conditionals

---
*Last updated: 2026-04-15*
*Milestone: v7.0 — Governance & Operational Maturity*
