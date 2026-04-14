---
phase: 45-database-schema-foundation
plan: 01
subsystem: database
tags: [drizzle-orm, postgresql, schema-migration, wbs, architecture, team-engagement]

# Dependency graph
requires:
  - phase: 44-navigation-parity
    provides: Navigation structure and tab organization for new features
provides:
  - Database tables for WBS (work breakdown structure) with hierarchical parent-child relationships
  - Team Engagement sections table for structured project documentation
  - Architecture tracks and nodes tables for system component tracking
  - Project dependencies join table for cross-project relationships
  - TypeScript types and enums for all new entities
  - Migration 0028 with all DDL and indexes
affects: [46-context-extraction, 47-wbs-ui, 48-architecture-team-engagement, 49-portfolio-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Self-referencing foreign key using AnyPgColumn cast for hierarchical wbs_items
    - Enum-first approach - CREATE TYPE in migration before table creation
    - IF NOT EXISTS guards on all CREATE statements for idempotent migrations
    - Composite indexes for common query patterns (project_id + track, track_id + project_id)

key-files:
  created:
    - bigpanda-app/db/migrations/0028_wbs_team_arch_schema.sql
    - bigpanda-app/tests/schema/wbs-items.test.ts
    - bigpanda-app/tests/schema/project-dependencies.test.ts
    - bigpanda-app/tests/seeding/wbs-templates.test.ts
    - bigpanda-app/tests/seeding/team-engagement.test.ts
    - bigpanda-app/tests/seeding/architecture.test.ts
    - bigpanda-app/tests/queries/wbs-queries.test.ts
  modified:
    - bigpanda-app/db/schema.ts

key-decisions:
  - Self-referencing wbs_items.parent_id uses AnyPgColumn cast for type compatibility with Drizzle ORM
  - WBS track stored as text enum ('ADR'|'Biggy') rather than pgEnum for flexibility
  - Architecture node status uses dedicated arch_node_status enum (planned/in_progress/live) separate from WBS status
  - Team Engagement sections use display_order for manual reordering capability
  - All new tables include source_trace column for distinguishing template vs manual vs AI-extracted data

patterns-established:
  - v6.0 enum section in schema.ts (after v2.0 enums, before tables)
  - v6.0 tables section at end of schema.ts with detailed comments per table
  - Test directory structure: tests/schema/ (table structure), tests/seeding/ (seed data), tests/queries/ (query functions)
  - RED test scaffolds first (TDD Wave 0), then schema implementation to turn GREEN

requirements-completed: [WBS-01, WBS-02]

# Metrics
duration: 3min
completed: 2026-04-08
---

# Phase 45 Plan 01: Database Schema Foundation Summary

**Seven new PostgreSQL tables for WBS, Team Engagement, and Architecture with hierarchical relationships, status enums, and composite indexes**

## Performance

- **Duration:** 3 minutes
- **Started:** 2026-04-08T07:57:53Z
- **Completed:** 2026-04-08T08:01:47Z
- **Tasks:** 2
- **Files modified:** 8 (1 modified + 7 created)

## Accomplishments
- wbs_items table with self-referencing parent_id for 3-level hierarchy (ADR: 10+25, Biggy: 5+9)
- Team Engagement sections table with 5 pre-defined sections (Business Outcomes, Architecture, E2E Workflows, Teams & Engagement, Top Focus Areas)
- Architecture tracks and nodes tables for Before/Current and Future system diagrams
- Project dependencies join table for cross-project relationship tracking
- Migration 0028 with all DDL, enums, indexes, and exec_action_required column addition to projects table
- 6 RED test scaffolds covering schema structure, seeding counts, and query patterns
- Schema tests GREEN (wbs-items.test.ts, project-dependencies.test.ts pass)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 - RED test scaffolds** - `b87b9bb` (test)
2. **Task 2: Drizzle schema and migration 0028** - `5fc292f` (feat)

## Files Created/Modified

Created:
- `bigpanda-app/db/migrations/0028_wbs_team_arch_schema.sql` - DDL for all 7 new tables, 2 enums, exec_action_required column, and 5 indexes
- `bigpanda-app/tests/schema/wbs-items.test.ts` - Schema validation for wbs_items table structure and wbsItemStatusEnum values
- `bigpanda-app/tests/schema/project-dependencies.test.ts` - Schema validation for project_dependencies join table
- `bigpanda-app/tests/seeding/wbs-templates.test.ts` - Validates ADR (10+25) and Biggy (5+9) template item counts
- `bigpanda-app/tests/seeding/team-engagement.test.ts` - Validates 5 engagement section names
- `bigpanda-app/tests/seeding/architecture.test.ts` - Validates ADR Track (5 nodes) and AI Assistant Track (5 nodes)
- `bigpanda-app/tests/queries/wbs-queries.test.ts` - RED test scaffold for getWbsItems query function (implementation in Plan 02)

Modified:
- `bigpanda-app/db/schema.ts` - Added v6.0 enums (wbsItemStatusEnum, archNodeStatusEnum), exec_action_required column to projects, and 7 new v6.0 tables with TypeScript type exports

## Decisions Made

- Self-referencing foreign key pattern: Used `references((): AnyPgColumn => wbsItems.id)` for wbs_items.parent_id to satisfy Drizzle's type system for self-referencing FKs
- WBS track as text field: Stored as TEXT ('ADR'|'Biggy') rather than pgEnum to allow future track additions without migrations
- Architecture node status enum: Created dedicated arch_node_status enum (planned/in_progress/live) separate from wbs_item_status to reflect different lifecycle semantics
- Enum-first migration structure: CREATE TYPE statements in DO blocks before ALTER/CREATE TABLE to avoid dependency errors
- Composite indexes: idx_wbs_items_project_track (project_id, track) and idx_arch_nodes_track (track_id, project_id) for common filter patterns

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Schema compilation clean. Tests behave as expected (schema tests GREEN, seeding/query tests RED pending implementation in Plan 02).

## Next Phase Readiness

- Phase 46 (Context Extraction): wbs_items, teamEngagementSections, archNodes, archTracks tables ready for AI extraction routing
- Phase 47 (WBS UI): wbs_items table ready for hierarchical tree rendering
- Phase 48 (Architecture & Team Engagement): archTracks/archNodes/teamEngagementSections ready for tab UI
- Phase 49 (Portfolio Dashboard): projectDependencies and exec_action_required column ready for cross-project views

**Database ready for seeding logic implementation in Plan 02.**

## Self-Check: PASSED

All files verified:
- bigpanda-app/db/migrations/0028_wbs_team_arch_schema.sql ✓
- bigpanda-app/tests/schema/wbs-items.test.ts ✓
- bigpanda-app/tests/schema/project-dependencies.test.ts ✓
- bigpanda-app/tests/seeding/wbs-templates.test.ts ✓
- bigpanda-app/tests/seeding/team-engagement.test.ts ✓
- bigpanda-app/tests/seeding/architecture.test.ts ✓
- bigpanda-app/tests/queries/wbs-queries.test.ts ✓
- bigpanda-app/db/schema.ts (modified) ✓

All commits verified:
- b87b9bb (Task 1: RED test scaffolds) ✓
- 5fc292f (Task 2: Schema and migration) ✓

---
*Phase: 45-database-schema-foundation*
*Completed: 2026-04-08*
