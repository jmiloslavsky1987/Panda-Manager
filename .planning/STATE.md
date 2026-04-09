---
gsd_state_version: 1.0
milestone: v6.0
milestone_name: — Dashboard, Navigation & Intelligence
status: completed
stopped_at: Completed 49-04-PLAN.md
last_updated: "2026-04-09T03:33:25.669Z"
last_activity: 2026-04-09 — Phase 49 Plan 04 complete (Fixed duplicate exception rows for blocked projects)
progress:
  total_phases: 9
  completed_phases: 8
  total_plans: 19
  completed_plans: 19
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-07)

**Core value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.
**Current focus:** v6.0 Phase 44 (Navigation & Parity)

## Current Position

Phase: 49 (Portfolio Dashboard) — Phase complete
Status: Phase 49 complete
Last activity: 2026-04-09 — Phase 49 Plan 04 complete (Fixed duplicate exception rows for blocked projects)

Progress: [██████████] 100% (223/223 plans in project complete)

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

**Coverage:** 25/25 requirements mapped ✓

## Accumulated Context

**Tech Stack:**
- Next.js 16 (Turbopack), PostgreSQL, Redis/BullMQ, better-auth, Drizzle ORM, Vercel AI SDK, @xyflow/react, Recharts
- 42 phases complete, ~42,385 LOC TypeScript, ~370 passing tests
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

### Roadmap Evolution

- Phase 50 added: Extraction Intelligence — Full-spectrum prompt rewrite and semantic post-classifier to surface all entity types from any document across every project tab
- Phase 48.1 inserted after Phase 48: Architecture diagram group rendering, TeamOnboardingTable relocation, and extraction prompt coverage (URGENT)

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

Last session: 2026-04-09T03:27:39.190Z
Stopped at: Completed 49-04-PLAN.md
Resume file: None
Next action: Phase 48.1 complete — proceed to Phase 49 (Portfolio Dashboard)
