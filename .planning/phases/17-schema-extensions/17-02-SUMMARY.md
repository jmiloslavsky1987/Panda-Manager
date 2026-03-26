---
phase: 17-schema-extensions
plan: 02
subsystem: database
tags: [postgres, sql, migrations, rls, enums, ddl]

# Dependency graph
requires:
  - phase: 17-01
    provides: Wave 0 TDD RED test scaffold for schema additions

provides:
  - 0011_v2_schema.sql migration: 5 new enums, 9 new tables, 2 ALTER TABLE extensions
  - RLS policies on all 8 project-scoped v2.0 tables
  - discovery_items table for AI-discovered content items
  - audit_log table (no RLS) for system-wide action history
  - business_outcomes table for tracking delivery status by track
  - e2e_workflows + workflow_steps tables (parent/child with CASCADE)
  - focus_areas table for strategic priority tracking
  - architecture_integrations table for tool/track/phase mapping
  - before_state table for customer pre-BigPanda situation data
  - team_onboarding_status table with 5 dimension status columns
  - scheduled_jobs table (no RLS) for configurable skill scheduler
  - time_entries extended with 7 approval workflow columns
  - artifacts extended with 2 ingestion pipeline columns
affects: [18-document-ingestion, 19-external-discovery-scan, 20-project-initiation-wizard, 21-teams-arch-tabs, 22-source-badges-audit-log, 23-time-tracking-advanced, 24-scheduler-enhanced]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Idempotent enum creation: DO $$ BEGIN CREATE TYPE ... EXCEPTION WHEN duplicate_object THEN null; END $$"
    - "Project-scoped RLS: ENABLE + FORCE + DROP POLICY IF EXISTS + CREATE POLICY using app.current_project_id"
    - "Child-table RLS via subquery JOIN to parent table project_id"
    - "ALTER TABLE with IF NOT EXISTS for idempotent column additions"

key-files:
  created:
    - bigpanda-app/db/migrations/0011_v2_schema.sql
  modified: []

key-decisions:
  - "Migration numbered 0011 (not 0006 per CONTEXT.md) — 0006-0010 were added by prior phases"
  - "scheduled_jobs is a CREATE TABLE (new table), not ALTER TABLE — CONTEXT.md noted ALTER but PLAN.md correctly specifies CREATE"
  - "workflow_steps RLS uses subquery EXISTS pattern (not direct project_id) since it has no project_id FK, only workflow_id"
  - "audit_log and scheduled_jobs explicitly excluded from RLS — system-wide tables per design"

patterns-established:
  - "New enum types always wrapped in idempotent DO $$ BEGIN...EXCEPTION block"
  - "Project-scoped tables always get source TEXT NOT NULL DEFAULT 'manual' column"
  - "All new tables get created_at TIMESTAMP NOT NULL DEFAULT NOW()"
  - "CREATE TABLE order respects FK dependencies: e2e_workflows before workflow_steps"

requirements-completed: [SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05, SCHEMA-06, SCHEMA-07, SCHEMA-08, SCHEMA-09, SCHEMA-10, SCHEMA-11]

# Metrics
duration: 7min
completed: 2026-03-26
---

# Phase 17 Plan 02: Schema Extensions Migration Summary

**Atomic DDL migration creating 5 PostgreSQL enums, 9 new tables with RLS, and extending time_entries + artifacts for all v2.0 phases**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-26T04:51:21Z
- **Completed:** 2026-03-26T04:58:00Z
- **Tasks:** 1/1
- **Files modified:** 1

## Accomplishments

- Created `0011_v2_schema.sql` with all 11 SCHEMA requirements in a single atomic DDL file
- 8 project-scoped tables all have ENABLE + FORCE ROW LEVEL SECURITY with `project_isolation` policies
- `workflow_steps` uses a subquery EXISTS RLS pattern since it has no direct `project_id` (only `workflow_id` FK)
- `audit_log` and `scheduled_jobs` intentionally excluded from RLS (system-wide tables)
- All ALTER TABLE statements use `IF NOT EXISTS` for idempotent re-application

## Task Commits

1. **Task 1: Write 0011_v2_schema.sql — enums + new tables + RLS** - `259bd7c` (feat)

## Files Created/Modified

- `bigpanda-app/db/migrations/0011_v2_schema.sql` - Atomic DDL migration: 5 enums, 9 CREATE TABLE, 2 ALTER TABLE, 8 RLS policy blocks, 10 indexes

## Decisions Made

- Migration numbered `0011` — CONTEXT.md referenced `0006` but migrations 0006–0010 were added by prior phases; correct sequencing verified by listing migrations directory.
- `scheduled_jobs` is a `CREATE TABLE` (new table, not ALTER) — CONTEXT.md mentioned ALTER TABLE for scheduled_jobs columns but PLAN.md correctly specifies CREATE TABLE for the full table; followed PLAN.md.
- `workflow_steps` RLS uses a subquery `EXISTS (SELECT 1 FROM e2e_workflows w WHERE w.id = workflow_steps.workflow_id AND w.project_id = ...)` since the table has no `project_id` column of its own.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Migration must be applied manually:

```bash
psql $DATABASE_URL -f bigpanda-app/db/migrations/0011_v2_schema.sql
```

Post-apply verification:

```bash
psql $DATABASE_URL -c "\dt" | grep -E "discovery_items|audit_log|business_outcomes|e2e_workflows|workflow_steps|focus_areas|architecture_integrations|before_state|team_onboarding_status|scheduled_jobs"
psql $DATABASE_URL -c "\d time_entries" | grep -E "submitted_on|submitted_by|approved_on|approved_by|rejected_on|rejected_by|locked"
psql $DATABASE_URL -c "\d artifacts" | grep -E "ingestion_status|ingestion_log_json"
```

## Next Phase Readiness

- All 9 v2.0 tables are defined and ready for Phase 18–24 feature work
- Phases 18 (Document Ingestion) and 19 (External Discovery Scan) can start in parallel after this migration is applied
- TDD tests from Phase 17-01 (15 failing tests) will turn GREEN once Drizzle schema.ts is updated in Phase 17-03

---
*Phase: 17-schema-extensions*
*Completed: 2026-03-26*
