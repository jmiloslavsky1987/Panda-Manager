---
phase: 18-document-ingestion
plan: 01
subsystem: testing
tags: [vitest, drizzle, postgres, tdd, ingestion, migration]

# Dependency graph
requires:
  - phase: 17-schema-extensions
    provides: v2.0 schema tables (business_outcomes, e2e_workflows, focus_areas, architecture_integrations) and artifacts table with ingestion_status enum

provides:
  - 6 RED test stub files covering all 12 ING requirements (Wave 0 TDD baseline)
  - Migration 0012 adding source_artifact_id + ingested_at to 11 entity tables
  - Drizzle schema.ts updated with source attribution columns on all entity tables

affects:
  - 18-02 through 18-06 (all subsequent ingestion plans implement against these stubs)
  - 22-source-badges-audit-log (source_artifact_id columns are the FK these badges will query)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 RED stub pattern: expect(false, 'stub').toBe(true) in every test body — tests fail without needing imports of not-yet-existing modules"
    - "Forward reference via AnyPgColumn for FK columns on tables defined before their referenced table"

key-files:
  created:
    - bigpanda-app/tests/ingestion/upload.test.ts
    - bigpanda-app/tests/ingestion/validation.test.ts
    - bigpanda-app/tests/ingestion/extractor.test.ts
    - bigpanda-app/tests/ingestion/preview.test.ts
    - bigpanda-app/tests/ingestion/dedup.test.ts
    - bigpanda-app/tests/ingestion/write.test.ts
    - bigpanda-app/db/migrations/0012_ingestion_source_attribution.sql
  modified:
    - bigpanda-app/db/schema.ts

key-decisions:
  - "Wave 0 stub pattern uses expect(false, 'stub').toBe(true) — no module imports needed, tests fail RED immediately without depending on production code that doesn't exist yet"
  - "AnyPgColumn forward reference used for actions, risks, milestones (defined before artifacts) to avoid circular dependency compile errors"
  - "key_decisions and engagement_history tables receive source attribution columns despite being append-only — ADD COLUMN does not violate append-only enforcement (no UPDATE/DELETE)"

patterns-established:
  - "Wave 0 TDD baseline: 6 test files × 28 stubs, all RED before any implementation begins"
  - "Source attribution pattern: every entity table has source_artifact_id (FK nullable SET NULL) + ingested_at (TIMESTAMP nullable)"

requirements-completed:
  - ING-01
  - ING-02
  - ING-03
  - ING-04
  - ING-05
  - ING-06
  - ING-07
  - ING-08
  - ING-09
  - ING-10
  - ING-11
  - ING-12

# Metrics
duration: 3min
completed: 2026-03-26
---

# Phase 18 Plan 01: Document Ingestion Wave 0 Summary

**6 RED Vitest stub files (28 tests, 0 passing) + migration 0012 adding source_artifact_id + ingested_at to 11 entity tables via 22 ALTER TABLE statements**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-26T06:23:11Z
- **Completed:** 2026-03-26T06:25:44Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Created `bigpanda-app/tests/ingestion/` with 6 test files covering all 12 ING requirements — all 28 stubs fail RED immediately
- Created migration `0012_ingestion_source_attribution.sql` with 22 ALTER TABLE statements (source_artifact_id + ingested_at on 11 entity tables)
- Updated `schema.ts` Drizzle definitions for all 11 entity tables with the new optional attribution columns

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing test stubs for all 6 test files** - `ca1bf5a` (test)
2. **Task 2: Migration 0012 — source_artifact_id + ingested_at on entity tables** - `f07811f` (feat)

**Plan metadata:** (docs commit — see final commit)

## Files Created/Modified

- `bigpanda-app/tests/ingestion/upload.test.ts` - ING-01, ING-03 upload route stubs (3 tests)
- `bigpanda-app/tests/ingestion/validation.test.ts` - ING-02 file validation stubs (3 tests)
- `bigpanda-app/tests/ingestion/extractor.test.ts` - ING-04 extraction output shape stubs (5 tests)
- `bigpanda-app/tests/ingestion/preview.test.ts` - ING-05/06/07 preview UI state stubs (7 tests)
- `bigpanda-app/tests/ingestion/dedup.test.ts` - ING-08/11/12 dedup and conflict stubs (5 tests)
- `bigpanda-app/tests/ingestion/write.test.ts` - ING-09/10 source attribution write stubs (5 tests)
- `bigpanda-app/db/migrations/0012_ingestion_source_attribution.sql` - 22 ALTER TABLE statements for all 11 entity tables
- `bigpanda-app/db/schema.ts` - Added source_artifact_id + ingested_at to actions, risks, milestones, key_decisions, engagement_history, stakeholders, tasks, business_outcomes, focus_areas, architecture_integrations, e2e_workflows

## Decisions Made

- **Wave 0 stub pattern:** Using `expect(false, 'stub').toBe(true)` as the single assertion in every test ensures RED state without importing non-existent production modules. Consistent with the pattern established in Phase 17.
- **AnyPgColumn forward reference:** `actions`, `risks`, and `milestones` are defined before `artifacts` in schema.ts. Using `(): AnyPgColumn => artifacts.id` prevents TypeScript circular reference errors.
- **Append-only tables receive columns:** `key_decisions` and `engagement_history` have append-only triggers on UPDATE/DELETE, but `ADD COLUMN` is an ALTER DDL operation — no trigger conflict. The new columns will be nullable for all existing rows.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript errors in `app/api/jobs/trigger/route.ts`, `app/api/skills/*/run/route.ts`, and `worker/index.ts` (ioredis/bullmq version mismatch) are out of scope. These existed before this plan and no `schema.ts` errors were introduced.

## User Setup Required

None — migration 0012 runs automatically with the existing migration runner. No manual DB steps required.

## Next Phase Readiness

- All 12 ING requirement stubs are RED and committed — Waves 1–4 plans (18-02 through 18-06) can immediately begin going GREEN
- Migration 0012 must be applied to the DB before any ingestion write tests can pass (`npm run db:migrate` or equivalent)
- `source_artifact_id` FK is available on all entity tables for ING-09 source attribution writes

---
*Phase: 18-document-ingestion*
*Completed: 2026-03-26*

## Self-Check: PASSED

- FOUND: bigpanda-app/tests/ingestion/upload.test.ts
- FOUND: bigpanda-app/tests/ingestion/validation.test.ts
- FOUND: bigpanda-app/tests/ingestion/extractor.test.ts
- FOUND: bigpanda-app/tests/ingestion/preview.test.ts
- FOUND: bigpanda-app/tests/ingestion/dedup.test.ts
- FOUND: bigpanda-app/tests/ingestion/write.test.ts
- FOUND: bigpanda-app/db/migrations/0012_ingestion_source_attribution.sql
- FOUND: .planning/phases/18-document-ingestion/18-01-SUMMARY.md
- FOUND commit ca1bf5a: test(18-01): add RED stub tests for all 12 ING requirements
- FOUND commit f07811f: feat(18-01): migration 0012 + schema source attribution columns
