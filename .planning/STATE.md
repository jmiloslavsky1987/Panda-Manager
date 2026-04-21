---
gsd_state_version: 1.0
milestone: v8.0
milestone_name: Codebase Refactor & Multi-Tenant Deployment
current_plan: 7 of 7
status: completed
stopped_at: Completed 73.1-07-PLAN.md
last_updated: "2026-04-21T02:10:31.368Z"
last_activity: "2026-04-21 — Plan 73.1-07 complete: Direct intent extraction pre-pass (Pass 0.5) detects explicit lifecycle instructions"
progress:
  total_phases: 18
  completed_phases: 13
  total_plans: 59
  completed_plans: 56
  percent: 98
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-16 after v7.0 milestone close)

**Core value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.
**Current focus:** v8.0 Phase 72 — Feature Unification (ready to plan)

## Current Position

Phase: 73.1 of 75 — IN PROGRESS (Entity Lifecycle Management)
Current Plan: 7 of 7
Status: Plans 73.1-01, 73.1-02, 73.1-03, 73.1-04, and 73.1-07 complete. Plan 73.1-05 and 73.1-06 pending.
Last activity: 2026-04-21 — Plan 73.1-07 complete: Direct intent extraction pre-pass (Pass 0.5) detects explicit lifecycle instructions

Progress: [██████████] 98% (257 of 261 plans complete in v8.0)

## Milestone History

- **v1.0** — Foundation + Read/Write Surface + Skills + MCP + Cross-Project (Phases 1–16, 63 plans, complete 2026-03-26)
- **v2.0** — AI Ingestion & Enhanced Operations (Phases 17–25, 63 plans, complete 2026-03-30)
- **v3.0** — Collaboration & Intelligence (Phases 26–30, 26 plans, complete 2026-04-01)
- **v4.0** — Infrastructure & UX Foundations (Phases 31–35 complete; Phase 36 deferred, complete 2026-04-03)
- **v5.0** — Workspace UX Overhaul (Phases 37–42, 29 plans, complete 2026-04-07)
- **v6.0** — Dashboard, Navigation & Intelligence (Phases 43–57, 45 plans, complete 2026-04-14)
- **v7.0** — Governance & Operational Maturity (Phases 58–69, 41 plans, complete 2026-04-16)

## Tech Stack

- Next.js 16 (Turbopack), PostgreSQL, Redis/BullMQ, better-auth, Drizzle ORM, Vercel AI SDK, @xyflow/react, @anthropic-ai/sdk, Recharts
- ~75,894 LOC TypeScript (v7.0 shipped)
- 148 test files passing
- Production build clean

## v8.0 Roadmap Summary

**5 phases (70–74) covering 11 requirements:**

- **Phase 70:** AI Usage Audit (RFCTR-01) — written report, no code changes; user review gate ✅
- **Phase 71:** Feature Consistency Audit (RFCTR-03) — written report, no code changes; user review gate ✅
- **Phase 72:** Feature Unification (RFCTR-04) — eliminate duplicates; blocked by Phase 71 ✅
- **Phase 73:** Multi-Tenant Isolation (TENANT-01–05) — isolation airtight at all layers
- **Phase 74:** Deployment Readiness (DEPLOY-01–02) — env-var config + deployment guide; blocked by Phase 73

**Critical dependencies:**
- Phase 72 blocked by Phase 71 (consistency audit required before unification)
- Phase 74 blocked by Phase 73 (multi-tenant correctness required before deployment)

## Established Patterns

- requireSession() + requireProjectRole() at Route Handler level (CVE-2025-29927 defense-in-depth)
- CustomEvent (metrics:invalidate) for cross-tab sync
- Client-side filtering: Server Component passes full data, Client island filters in-memory via URL params
- BullMQ background jobs + polling for long-running operations
- Advisory lock + Redis cache for scheduled jobs (7-day TTL pattern)
- React Flow with dynamic import + ssr:false for diagram components
- Wave 0 RED stubs → Wave 1 implementation → human verification gate (TDD contract)
- 4-pass extraction pipeline: Pass 0 pre-analysis + Passes 1/2/3 by entity group

## Known Tech Debt Entering v8.0

- Nyquist validation incomplete: most v7.0 phases at nyquist_compliant: false (draft status)
- Empty state CTA onClick handlers are () => {} placeholders (wiring to creation modals deferred)
- INGEST-02: Move approved ingested item to different section — deferred from v7.0
- 4 portfolio RED TDD stubs remain (TEST-01 dropped from v7.0 scope)

## Recent Decisions (v8.0)

**Phase 70 (AI Usage Audit):**
- Classification framework: deterministic vs genuine AI vs borderline using governing question "Could this be replaced with deterministic logic and still produce correct, consistent results?"
- Identified weekly-focus.ts as deterministic - generates priority bullets from structured data
- All 15 skills classified as genuine AI - require synthesis or unstructured content processing
- 91% of Claude API calls (21 of 23) are genuine AI and correctly architected

**Phase 71 (Feature Consistency Audit):**
- Decisions table is intentionally append-only (no edit modal) - correct design for audit trail compliance
- Workstreams intentionally lack bulk actions - progress slider UX is domain-appropriate for workstream tracking
- SearchBar vs GlobalSearchBar are distinct components with different scopes (should be renamed for clarity)
- Dual-mode editing (modal + inline) is intentional and correct UX pattern for Actions/Risks/Milestones
- Missing DB enums for Risks/Milestones status is HIGH priority data integrity risk for Phase 72

**Phase 72 (Feature Unification):**
- Risk status invalid values normalized to NULL (un-triaged state) during migration - preserves data fidelity
- Milestone status invalid values normalized to 'not_started' (default state) - prevents null-handling edge cases in UI
- Forward-only migration with data normalization before ALTER COLUMN - ensures no data loss
- Component naming pattern: intentional-scope comments added to clarify distinct behaviors (GlobalProjectSearchBar for all-projects, WorkspaceSearchBar for single-workspace, TeamMetadataEditModal for project metadata)
- Enum parity test pattern: bidirectional containment checks + length verification ensures exact match between UI constants and DB enums
- Human verification approved - all 13 Phase 71 audit findings resolved (9 code changes, 4 documented as intentional)

**Phase 73 (Multi-Tenant Isolation):**
- Parse body before auth in approve route - projectId comes from request body, must be extracted before calling requireProjectRole (minimal change, maintains API contract)
- Lookup artifact.project_id before auth in PATCH - artifact ID is in path but projectId is not; DB lookup required to get project context before membership check
- Cache isolation has two layers: READ (requireProjectRole at route) and WRITE (project-scoped keys in worker) - both necessary for airtight isolation
- Single BullMQ queue with data-level isolation is sufficient - job payload is project-scoped, results have project_id FK, cache keys are project-namespaced

**Phase 73.1 (Entity Lifecycle Management):**
- Use pg_trgm extension for fuzzy entity matching in Pass 5 change detection - provides similarity scoring and index support
- Store proposed changes in extraction_jobs table (not separate table) - 1:1 relationship with job, simpler cleanup, aligns with staged_items_json pattern
- DELETE handlers do not call updateXlsxRow() - hard delete from DB is correct, xlsx is archival/export not source of truth
- Upgrade all entity PATCH handlers to requireProjectRole simultaneously with DELETE addition - ensures consistent auth pattern across all entity operations
- Pass 5 runs on allRawItems (before dedup filtering) for comprehensive change detection - dedup would filter out updates/closures as already-ingested
- Confidence threshold 0.6 filters out low-confidence matches - balances false positives vs missed updates
- Top 3 candidates per query balances precision vs recall - enough context for Claude to disambiguate, avoids diminishing returns
- Pass 5 failure is non-fatal (try/catch, logs warning) - extraction pipeline completes even if change detection fails
- Pass 0.5 runs after Pass 0 pre-analysis but before Pass 1 entity extraction - detects explicit lifecycle instructions early
- DirectIntentItem results converted to ExtractionItem format for Pass 5 compatibility - preserves intent in _direct_intent field
- Direct intent items prepended to allRawItems array - participates in change detection alongside standard extraction
- Confidence set to 0.85 for direct instructions - high confidence for explicit text like "close action X"

## Accumulated Context

### Roadmap Evolution
- Phase 73.1 inserted after Phase 73: Entity Lifecycle Management (URGENT)

## Session Continuity

Last session: 2026-04-21T02:10:31.364Z
Stopped at: Completed 73.1-07-PLAN.md
Resume file: None
