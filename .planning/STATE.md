---
gsd_state_version: 1.0
milestone: v6.0
milestone_name: — Dashboard, Navigation & Intelligence
status: completed
stopped_at: Completed 51-04-PLAN.md
last_updated: "2026-04-09T22:39:45.679Z"
last_activity: 2026-04-09 — Phase 51 Plan 04 complete (Per-entity approval feedback with UI display)
progress:
  total_phases: 10
  completed_phases: 10
  total_plans: 26
  completed_plans: 26
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-07)

**Core value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.
**Current focus:** v6.0 Phase 44 (Navigation & Parity)

## Current Position

Phase: 51 (Extraction Intelligence Overhaul) — Plan 04/04 complete
Status: Phase 51 complete
Last activity: 2026-04-09 — Phase 51 Plan 04 complete (Per-entity approval feedback with UI display)

Progress: [██████████] 100% (26/26 plans in current milestone complete)

## Milestone History

- **v1.0** — Foundation + Read/Write Surface + Skills + MCP + Cross-Project (Phases 1–16, 63 plans, complete 2026-03-26)
- **v2.0** — AI Ingestion & Enhanced Operations (Phases 17–25, 63 plans, complete 2026-03-30)
- **v3.0** — Collaboration & Intelligence (Phases 26–30, 26 plans, complete 2026-04-01)
- **v4.0** — Infrastructure & UX Foundations (Phases 31–35 complete; Phase 36 deferred, complete 2026-04-03)
- **v5.0** — Workspace UX Overhaul (Phases 37–42, 29 plans, complete 2026-04-07)
- **v6.0** — Dashboard, Navigation & Intelligence (Phases 43–49, 10 plans estimated, in progress)

## v6.0 Phase Structure

| Phase | Focus | Requirements | Plans |
|-------|-------|--------------|-------|
| 43 | Skills Portability | SKILL-01 | 1 |
| 44 | Navigation & Parity | NAV-01–05, RISK-01–02, MILE-01–02 | 2 |
| 45 | Database Schema Foundation | WBS-01–02 | 1 |
| 46 | Context Upload Extraction Expansion | WBS-03, TEAM-02, ARCH-04 | 1 |
| 47 | Work Breakdown Structure | WBS-04–05 | 2 |
| 48 | Architecture & Team Engagement | ARCH-01–03, TEAM-01, TEAM-03–04 | 2 |
| 49 | Portfolio Dashboard | DASH-01–06 | 1 |
| 50 | Extraction Intelligence | GAP-1 through GAP-6 | 3 |
| 51 | Extraction Intelligence Overhaul | GAP-A through GAP-J | 4 |

**Coverage:** 25/25 requirements mapped ✓

## Accumulated Context

**Tech Stack:**
- Next.js 16 (Turbopack), PostgreSQL, Redis/BullMQ, better-auth, Drizzle ORM, Vercel AI SDK, @xyflow/react, Recharts
- 51 phases complete, ~43,500 LOC TypeScript, ~370 passing tests
- 6 pre-existing test failures (mock setup issues, deferred past v6.0)

**Established Patterns:**
- requireSession() at Route Handler level (CVE-2025-29927 defense-in-depth)
- CustomEvent (metrics:invalidate) for cross-tab sync
- Client-side filtering: Server Component passes full data, Client island filters in-memory
- BullMQ background jobs + polling for long-running operations
- Advisory lock + Redis cache for scheduled jobs (7-day TTL pattern)
- React Flow with dynamic import + ssr:false for diagram components

**v6.0 Key Decisions:**
- Phase ordering: Skills first (quick win) → Navigation + Parity (structural) → Schema → Extraction → Features → Portfolio (aggregates all)
- WBS templates: ADR (13 sections, 3 levels) + Biggy (6 sections, 3 levels) seeded on project creation
- Architecture tab enhances existing Phase 21/28 work (two-tab Before/Current & Future with status tracking)
- Team Engagement consolidates existing tables into 5-section structured report
- **Phase 43:** resolveSkillsDir() extracted to lib/ for shared Next.js/BullMQ access
- **Phase 43:** skill-run.ts re-exports resolveSkillsDir for backward compatibility
- **Phase 43:** customer-project-tracker resolves settings once before loop for efficiency
- **Phase 44 Plan 01:** Intel tab removed entirely — Decisions moved to Delivery, Engagement History to Admin
- **Phase 44 Plan 01:** Plan layout dissolved — board content now renders directly at /plan route
- **Phase 44 Plan 01:** Old /plan/* sub-routes redirect for backward compatibility
- **Phase 44 Plan 01:** Wave 0 test stubs created for bulk-update APIs (RED now, GREEN after Plans 02/03)
- **Phase 44 Plan 02:** Filter bar inline (not collapsible) for Risks table — matches Actions UX pattern
- **Phase 44 Plan 02:** Bulk update API pattern established for risks (Zod validation + inArray)
- **Phase 44 Plan 02:** Date filtering uses created_at.toISOString().split('T')[0] for string comparison
- **Phase 45 Plan 01:** Self-referencing wbs_items.parent_id uses AnyPgColumn cast for Drizzle type compatibility
- **Phase 45 Plan 01:** WBS track stored as text ('ADR'|'Biggy') rather than pgEnum for flexibility
- **Phase 45 Plan 01:** Architecture node status uses dedicated arch_node_status enum separate from WBS status
- **Phase 46 Plan 01:** Wave 0 TDD approach: created test scaffolds first (3 extraction + 3 dedup tests) before implementation
- **Phase 46 Plan 01:** Entity field design: wbs_task uses track+parent_section_name+level for hierarchical routing, team_engagement uses section_name enum for 5-section validation, arch_node uses track+node_name for capability classification
- **Phase 46 Plan 01:** Disambiguation rules added to prompt: wbs_task vs task (hierarchical WBS items vs generic tasks), team_engagement vs team (section content vs team metadata)
- **Phase 46 Plan 02:** WBS parent matching uses ilike with wildcard on both sides for abbreviated parent names
- **Phase 46 Plan 02:** Team Engagement content append uses '\n\n---\n\n' separator to visually distinguish entries
- **Phase 46 Plan 02:** Architecture node upsert uses onConflictDoUpdate on (project_id, track_id, name) composite key
- **Phase 47 Plan 01:** Wave 0 TDD approach: Created 24 RED test stubs before implementation
- **Phase 47 Plan 01:** BFS traversal for deleteWbsSubtree: single-batch delete after collecting all descendant IDs
- **Phase 47 Plan 01:** Level 1 protection: API enforces Level 1 nodes cannot be deleted, renamed, or reparented (403)
- **Phase 47 Plan 02:** Set-based expand/collapse state for O(1) lookup at 100+ node scale
- **Phase 47 Plan 02:** React.memo() on WbsNode to prevent cascade re-renders in recursive tree
- **Phase 47 Plan 02:** Inline status select (not modal) for frequent status changes — faster UX
- **Phase 47 Plan 02:** Delete dialog shows descendant count to inform user of subtree impact
- **Phase 47 Plan 03:** Synchronous AI call (no BullMQ) for immediate modal preview — simpler flow than background job polling
- **Phase 47 Plan 03:** Level 1 enforcement in buildWbsProposals filters (not just prompt) — defense-in-depth against hallucination
- **Phase 47 Plan 03:** Case-insensitive dedup using Set<lowercase> for name matching — prevents near-duplicate proposals
- **Phase 48 Plan 01:** Gap-close/gap-open/place pattern from Phase 47 used for arch node display_order reordering
- **Phase 48 Plan 01:** Wave 0 test stubs for Plan 03 created before implementation (arch-nodes-wiring.test.ts remains RED)
- **Phase 48 Plan 02:** Architecture section explicitly excluded from TeamEngagementOverview per CONTEXT.md locked decision
- **Phase 48 Plan 02:** Defensive WarnBanner pattern uses !data.X || data.X.length === 0 for undefined handling
- **Phase 48 Plan 02:** Source inspection tests pattern for components (pre-existing test environment limitations)
- **Phase 48 Plan 02:** Client island pattern: server RSC fetches data → TeamsPageTabs client manages sub-tab state

- **Phase 48.1:** `group` is a PostgreSQL reserved keyword — renamed to `integration_group` to avoid query failures
- **Phase 48.1:** Map reduce pattern for E2E workflow team grouping (team_name → [workflows]) with side-by-side rendering
- **Phase 48.1:** TeamOnboardingTable owns its own state in TeamEngagementMap (optimistic updates)
- **Phase 48.1:** Dashed-border group boxes: ungrouped integrations above, grouped integrations inside box with bold uppercase label
- **Phase 48.1:** Phase-aware column header colors via phaseHeaderStyle() — Blue/Amber/Green by phase semantic group

- **Phase 49 Plan 00:** Wave 0 TDD approach: Created 35 RED test stubs (6+8+11+10) before Wave 1 implementation
- **Phase 49 Plan 00:** Vitest framework confirmed from package.json — using Vitest syntax for all portfolio tests
- **Phase 49 Plan 00:** Portfolio test directory created at __tests__/portfolio/ for Phase 49 isolation

- **Phase 49 Plan 01:** Promise.all() pattern for parallel per-project enrichment queries (Phase 34 pattern)
- **Phase 49 Plan 01:** Owner from first ADR workstream with non-null lead, tracks displayed as joined string
- **Phase 49 Plan 01:** Risk level thresholds: 0 highRisks = None, 1-2 = Medium, 3+ = High
- **Phase 49 Plan 01:** Dependency status from blocked tasks: any non-completed task with blocked_by FK = Blocked
- **Phase 49 Plan 01:** Collapsible filter panel (not inline) with active filter count badge for cleaner table header

- **Phase 49 Plan 02:** Health summary uses stat chips only (no Recharts) for fast render and zero extra dependencies
- **Phase 49 Plan 02:** Exceptions panel positioned below table — keeps critical table data above fold, exceptions are secondary anomaly surface
- **Phase 49 Plan 02:** Full dashboard replacement — removed all old widgets (Morning Briefing, Risk Heat Map, Watch List, HealthCards, Quick Actions, Activity Feed, Drafts Inbox)
- **Phase 49 Plan 02:** Exception panel defaults to expanded if exceptions exist, collapsed if empty
- **Phase 49 Plan 02:** Overdue milestone detection uses nextMilestoneDate < today comparison with date normalization

- **Phase 50 Plan 01:** Wave 0 TDD approach: Create RED test stubs before implementation to document gaps (Gaps 1-5)
- **Phase 50 Plan 01:** Mock infrastructure limitation: Can't verify specific table names in Vitest mocks — verified via code inspection
- **Phase 50 Plan 01:** Source-only attribution for teamOnboardingStatus: Uses source='ingestion' field only (no source_artifact_id/ingested_at per schema)
- **Phase 50 Plan 01:** coerceTrackStatus maps 4 status values (live/in_progress/pilot/planned) with flexible input synonyms
- **Phase 50 Plan 02:** Composite key dedup for e2e_workflow: both workflow_name AND team_name with ilike prefix match
- **Phase 50 Plan 02:** JSON parse fallback for e2e_workflow steps: malformed JSON defaults to empty array (never blocks parent insert)
- **Phase 50 Plan 02:** Full attribution for focusAreas and e2eWorkflows: source='ingestion' + source_artifact_id + ingested_at
- **Phase 50 Plan 02:** workflowSteps has no attribution columns — inherits lineage via workflow_id FK to parent e2eWorkflows row
- **Phase 50 Plan 03:** wbs_task description field added to insertItem (was in prompt but not written to DB)
- **Phase 50 Plan 03:** onboarding_step schema limitation documented: track and completed_date in prompt but not in DB schema (prompt-only hints for extraction)
- **Phase 50 Plan 03:** Field coverage verification methodology established (prompt → insertItem → schema trace)

- **Phase 51 Plan 01:** Wave 0 TDD approach: Created RED test stubs for Gaps E and G before Wave 1 implementation
- **Phase 51 Plan 01:** Coercer testing strategy: Direct import of coercers module functions for unit testing (coercers.ts created in Plan 51-03 as blocking dependency)
- **Phase 51 Plan 01:** Redis mock pattern: Mock @/worker/connection.createApiRedisConnection() with set/quit/connect methods
- **Phase 51 Plan 01:** weekly_focus TTL: 7 days (604800 seconds) for Redis keys storing focus bullets
- **Phase 51 Plan 02:** team_engagement removed from EXTRACTION_SYSTEM entityType union (Gap D: dead-end table with no viable handler)
- **Phase 51 Plan 02:** team_pathway, before_state, weekly_focus added to EXTRACTION_SYSTEM entityType union (Gaps H/A/G)
- **Phase 51 Plan 02:** Expanded disambiguation section with 5 new rules: architecture vs arch_node vs integration (three-way), task vs wbs_task (explicit examples), team vs stakeholder (explicit rule), workstream disambiguation (Gap I), arch_node track name constraint (Gap J)
- **Phase 51 Plan 02:** Status coercion guidance added to wbs_task and arch_node entity type descriptions in EXTRACTION_SYSTEM prompt
- **Phase 51 Plan 02:** coercers.ts module verified GREEN (pre-existing from Plan 51-03 blocking dependency pattern) with 13/13 tests passing
- **Phase 51 Plan 03:** wbs_task orphan fallback to Level 1 when parent_section_name match fails (Gap B: prevents orphan rejections)
- **Phase 51 Plan 03:** arch_node with unknown track skips gracefully via skipEntity error pattern (Gap C: no crash on track validation failure)
- **Phase 51 Plan 03:** weekly_focus Redis handler writes focus bullets with 7-day TTL (Gap G: weekly_focus.ts verified)
- **Phase 51 Plan 04:** Per-entity response structure uses Record<string, number> for written/skipped counts (not flat integers)
- **Phase 51 Plan 04:** Errors array accumulates instead of throwing to preserve batch resilience
- **Phase 51 Plan 04:** IngestionModal 'done' stage displays entity-type breakdown with color-coded sections (written/skipped/errors)

### Roadmap Evolution

- Phase 50 added: Extraction Intelligence — Full-spectrum prompt rewrite and semantic post-classifier to surface all entity types from any document across every project tab
- Phase 48.1 inserted after Phase 48: Architecture diagram group rendering, TeamOnboardingTable relocation, and extraction prompt coverage (URGENT)
- Phase 51 added: Extraction Intelligence Overhaul — Full Tab Coverage (Gaps A–J: before_state entity, wbs orphan fallback, arch_node graceful degradation, team_engagement dead-end fix, prompt disambiguation + status coercers, per-entity write feedback, weekly_focus extraction, team_pathway verification, workstream disambiguation, arch_node track guidance)

## Blockers/Concerns

**Research-flagged risks:**
- ~~Phase 44: Navigation restructure may break external links (add redirects for /intel, /phase-board old URLs)~~ ✓ MITIGATED in Plan 01 (redirects added for all /plan/* routes)
- Phase 46: AI extraction prompt expansion could degrade existing entity routing accuracy (monitor 80%+ baseline)
- Phase 47: Deep tree rendering performance (100+ nodes) — use Set-based state + React.memo()
- Phase 47: Generate Plan gap-fill hallucinations — validate stakeholder names against DB
- Phase 49: N+1 query explosion in portfolio dashboard — single aggregation query or parallel Promise.all()

**Technical debt from v5.0:**
- Empty state CTA onClick handlers are () => {} placeholders
- ~~Skills execution path resolution uses hardcoded paths~~ ✓ RESOLVED in Phase 43

## Session Continuity

Last session: 2026-04-09T22:14:35.195Z
Stopped at: Completed 51-04-PLAN.md
Resume file: None
Next action: v6.0 milestone complete — all 10 phases and 26 plans executed successfully
