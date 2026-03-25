---
phase: 08-cross-project-features-+-polish
plan: "02"
subsystem: database
tags: [postgres, fts, tsvector, gin-index, triggers, drizzle, knowledge-base]

# Dependency graph
requires:
  - phase: 08-01
    provides: Wave 0 E2E stubs for SRCH-01, KB-01/02/03 (failing baseline)
provides:
  - PostgreSQL FTS infrastructure: tsvector columns + GIN indexes on 8 tables
  - Auto-update triggers keeping search_vec current on INSERT/UPDATE
  - Backfill UPDATE statements for existing rows
  - knowledge_base link columns: linked_risk_id, linked_history_id, linked_date
  - KnowledgeBaseEntry and KnowledgeBaseInsert TypeScript types
affects:
  - 08-03 (FTS search API will query search_vec via raw SQL)
  - 08-04 (KB UI will use linked_risk_id, linked_history_id FKs for display)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Per-table trigger function pattern (tsvector_update_{table}) for FTS maintenance
    - GIN index naming convention: idx_{table}_search_vec
    - search_vec kept DB-only (not in Drizzle schema) to avoid PgVectorType inference issues

key-files:
  created:
    - bigpanda-app/db/migrations/0008_fts_and_kb.sql
  modified:
    - bigpanda-app/db/schema.ts

key-decisions:
  - "search_vec (tsvector) intentionally excluded from Drizzle schema — managed by trigger, queried via raw SQL; adding it causes PgVectorType inference issues"
  - "Per-table trigger functions (not a generic shared function) — simpler to maintain and extend per-table field lists"
  - "Backfill UPDATE statements included in migration — ensures existing rows are searchable on first migrate run"

patterns-established:
  - "Per-table trigger function: CREATE OR REPLACE FUNCTION tsvector_update_{table}() — one function per table with explicit field list"
  - "GIN index naming: idx_{table}_search_vec — consistent across all 8 tables"
  - "KB link columns as nullable INTEGER FKs — allows partial linkage (risk-only, history-only, or date-only)"

requirements-completed: [SRCH-01, KB-02, KB-03]

# Metrics
duration: 2min
completed: "2026-03-25"
---

# Phase 08 Plan 02: FTS Infrastructure + KB Linkability Summary

**PostgreSQL FTS infrastructure via tsvector/GIN/triggers on 8 tables, plus knowledge_base FK link columns for risk and engagement history cross-referencing**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-25T02:17:13Z
- **Completed:** 2026-03-25T02:18:23Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments

- Migration 0008_fts_and_kb.sql written with all 5 sections: KB link columns, tsvector columns (8 tables), GIN indexes (8), trigger functions (8), backfill UPDATEs (8)
- knowledgeBase Drizzle schema extended with linked_risk_id, linked_history_id, linked_date FK columns
- KnowledgeBaseEntry and KnowledgeBaseInsert types exported from schema.ts
- No new TypeScript errors introduced (pre-existing Redis/js-yaml errors are unchanged pre-existing issues)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write migration 0008 — FTS columns, GIN indexes, update triggers, KB link columns** - `ed8189e` (feat)
2. **Task 2: Update schema.ts with KB link columns and search_vec** - `d728255` (feat)

**Plan metadata:** (final docs commit below)

## Files Created/Modified

- `bigpanda-app/db/migrations/0008_fts_and_kb.sql` — Full migration: KB link columns, tsvector columns on 8 tables, 8 GIN indexes, 8 trigger functions, 8 backfill UPDATEs
- `bigpanda-app/db/schema.ts` — knowledgeBase table extended with linked_risk_id/linked_history_id/linked_date + type exports

## Decisions Made

- search_vec (tsvector) excluded from Drizzle schema: it is a computed column managed entirely by PostgreSQL triggers. Adding it to Drizzle causes PgVectorType inference errors. The FTS search API (plan 08-03) will query it via raw SQL.
- Per-table trigger functions chosen over a single shared function for maintainability — each table has its own field list, making it easy to adjust what is indexed per table without complex conditionals.
- Backfill statements included inline in migration so existing data becomes searchable immediately after `drizzle-kit migrate` runs.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Migration will be applied when user runs `cd bigpanda-app && DATABASE_URL=postgresql://localhost:5432/bigpanda_app npx drizzle-kit migrate`.

## Next Phase Readiness

- Migration 0008 ready to apply — adds all FTS infrastructure needed by plan 08-03 (search API)
- KB link columns ready — plan 08-04 (KB UI) can use linked_risk_id and linked_history_id for display
- search_vec columns will be auto-populated on INSERT/UPDATE via triggers; existing rows need the migration backfill to run

---
*Phase: 08-cross-project-features-+-polish*
*Completed: 2026-03-25*
