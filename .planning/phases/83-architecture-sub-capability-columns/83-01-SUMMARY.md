---
phase: 83-architecture-sub-capability-columns
plan: "01"
subsystem: database
tags: [drizzle-orm, postgresql, migration, arch-nodes, parent-id, node-type, tdd]

# Dependency graph
requires:
  - phase: 83-00
    provides: Wave 0 test scaffolds and ADR architecture research for section-grouping structure
provides:
  - "DB migration 0046 adding parent_id (nullable FK) and node_type to arch_nodes table"
  - "ArchNode TypeScript type with parent_id and node_type fields via $inferSelect"
  - "Existing project data migration: section nodes (AI/II/WA), 11 sub-capability nodes per project, Console node_type='console'"
  - "architecture_integrations.phase remapped from section names to sub-capability names"
affects:
  - 83-02 (rendering overhaul in InteractiveArchGraph.tsx)
  - 83-03 (seed script updates for new project creation)
  - 83-04 (downstream consumers: extraction pipeline, chat tools, context builder)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Self-referential FK in Drizzle: integer('parent_id').references((): AnyPgColumn => archNodes.id)"
    - "PL/pgSQL DO $$ block with STRICT RETURNING...INTO for single-row safety in migration loops"
    - "Display order spacing (10/20/30 for sections, 1-4 for sub-caps) for correct visual ordering under display_order < 100 filter"

key-files:
  created:
    - db/migrations/0046_arch_nodes_parent_id.sql
  modified:
    - db/schema.ts

key-decisions:
  - "[83-01] Sub-capability count is 11 total (3+4+4), not 10 as stated in plan description — plan body lists 11 named sub-capabilities matching CONTEXT.md"
  - "[83-01] Display order for sections: 10 (Alert Intelligence), 20 (Incident Intelligence), 30 (Workflow Automation); Console stays at existing display_order (UPDATE only changes node_type). All under 100 filter threshold."
  - "[83-01] node_type is text column (not pgEnum) — matches migration SQL and allows 'section'|'sub-capability'|'console' without enum migration overhead"
  - "[83-01] AnyPgColumn import was already present in schema.ts (used by actions.source_artifact_id) — no new import needed"

patterns-established:
  - "Self-referential FK pattern: integer('col').references((): AnyPgColumn => sameTable.id) — same as wbsItems.parent_id"

requirements-completed:
  - ARCH-SCHEMA

# Metrics
duration: 7min
completed: 2026-04-30
---

# Phase 83 Plan 01: Migration 0046 — arch_nodes parent_id + node_type Summary

**SQL migration 0046 adds parent_id (nullable self-FK) and node_type to arch_nodes; Drizzle schema updated giving ArchNode TypeScript type automatic hierarchy fields; existing projects migrated to 3-section + 11-sub-capability + Console structure**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-04-30T00:21:00Z
- **Completed:** 2026-04-30T00:28:01Z
- **Tasks:** 2
- **Files modified:** 2 (+ test file on disk, gitignored)

## Accomplishments

- Created `db/migrations/0046_arch_nodes_parent_id.sql` with ALTER TABLE statements, PL/pgSQL block for existing project migration, and architecture_integrations phase remapping
- Updated `db/schema.ts` archNodes table definition with `parent_id` (nullable self-FK via AnyPgColumn) and `node_type` (text NOT NULL DEFAULT 'sub-capability')
- section-grouping.test.ts: 5/5 GREEN; arch-nodes-wiring.test.ts: 2/2 GREEN
- TypeScript: no new errors in source files; ArchNode type automatically gains parent_id and node_type via $inferSelect

## Task Commits

1. **Task 1: Migration 0046 — ADD COLUMN parent_id + node_type + existing project data migration** - `d4677ce4` (feat)
2. **Task 2: schema.ts — add parent_id and node_type to archNodes table definition** - `48e3390b` (feat)

## Files Created/Modified

- `/Users/jmiloslavsky/Documents/Panda-Manager/db/migrations/0046_arch_nodes_parent_id.sql` - Schema migration: ALTER TABLE + PL/pgSQL existing project migration + phase remapping
- `/Users/jmiloslavsky/Documents/Panda-Manager/db/schema.ts` - archNodes table definition: added parent_id and node_type columns

## Decisions Made

- Sub-capability count corrected to 11 (3+4+4): plan description said "10" but the named sub-capabilities in the plan body and CONTEXT.md list 11 (Alert Intelligence: 3, Incident Intelligence: 4, Workflow Automation: 4). The correct count is 11.
- Display order 10/20/30 for section nodes and 1-4 for sub-capability nodes within each section. Console node_type updated via UPDATE (display_order unchanged). All values safely under the existing `display_order < 100` query filter.
- node_type implemented as plain text (not pgEnum) — matches migration SQL default value and avoids enum type migration overhead.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected sub-capability count from 10 to 11 in tests**
- **Found during:** Task 1 TDD RED phase
- **Issue:** Plan stated "10 sub-capability nodes" but lists 11 named sub-capabilities (Alert Intelligence: 3, Incident Intelligence: 4, Workflow Automation: 4 = 11 total)
- **Fix:** Updated test assertion from `toHaveLength(10)` to `toHaveLength(11)` to match actual named sub-capabilities in CONTEXT.md
- **Files modified:** tests/arch/section-grouping.test.ts (gitignored, on-disk only)
- **Verification:** 5/5 tests GREEN
- **Committed in:** Not committed (gitignored test file)

**2. [Rule 1 - Bug] Updated section-grouping test mocks to include post-migration node shape**
- **Found during:** Task 2 verification
- **Issue:** The section-grouping.test.ts on disk was updated to a version that uses mocks without node_type/parent_id (pre-schema shape). After schema.ts was updated, the tests correctly asserted the new fields — but the mock data needed to return the new fields too.
- **Fix:** Updated `makeNode` helper in test file to include `parent_id: null` and `node_type: 'section'` defaults; updated each test's mock data to return appropriate node_type/parent_id values
- **Files modified:** tests/arch/section-grouping.test.ts (gitignored, on-disk only)
- **Verification:** 5/5 tests GREEN after fix
- **Committed in:** Not committed (gitignored test file)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - test mock corrections)
**Impact on plan:** Both corrections required for correct test GREEN state. No scope creep. Migration SQL and schema.ts changes match plan specification exactly.

## Issues Encountered

- Pre-existing test failures in `tests/arch/column-reorder.test.ts` and `tests/arch/status-cycle.test.ts` (6 failures) — confirmed pre-existing before this plan's changes, unrelated to schema changes, out of scope.

## User Setup Required

None - no external service configuration required.

The migration `0046_arch_nodes_parent_id.sql` will be applied automatically by `run-migrations.ts` on next deployment/startup.

## Next Phase Readiness

- arch_nodes table has parent_id and node_type columns with correct constraints
- ArchNode TypeScript type includes parent_id and node_type fields
- Existing projects will have section nodes + 11 sub-capability nodes after migration runs
- Ready for Phase 83 Plan 02: InteractiveArchGraph.tsx rendering overhaul (section headers + grouped sub-columns)
- Ready for Phase 83 Plan 03: Seed script updates for new project creation

---
*Phase: 83-architecture-sub-capability-columns*
*Completed: 2026-04-30*
