---
phase: 20-project-initiation-wizard
plan: "01"
subsystem: database-schema, test-infrastructure, query-layer
tags: [tdd, schema-migration, drizzle, vitest, wizard, draft-status]
dependency_graph:
  requires: []
  provides:
    - bigpanda-app/tests/wizard/ (8 failing test stubs — Wave 0 RED)
    - bigpanda-app/db/migrations/0016_wizard_schema.sql (draft enum + 3 project columns)
    - bigpanda-app/db/schema.ts (projectStatusEnum with draft, projects with description/start_date/end_date)
    - bigpanda-app/lib/queries.ts (getActiveProjects and searchAllRecords include draft projects)
  affects:
    - Dashboard (draft projects now visible)
    - Search (draft project records included in FTS results)
tech_stack:
  added: []
  patterns:
    - TDD Red Phase (Wave 0 test stubs before implementation)
    - Drizzle ALTER TYPE + ALTER TABLE targeted migration (not full rebuild)
    - inArray(['active', 'draft']) pattern for multi-status queries
key_files:
  created:
    - bigpanda-app/tests/wizard/create-project.test.ts
    - bigpanda-app/tests/wizard/schema-wizard.test.ts
    - bigpanda-app/tests/wizard/checklist-match.test.ts
    - bigpanda-app/tests/wizard/multi-file-accumulation.test.ts
    - bigpanda-app/tests/wizard/manual-entry.test.ts
    - bigpanda-app/tests/wizard/launch.test.ts
    - bigpanda-app/tests/wizard/completeness.test.ts
    - bigpanda-app/tests/wizard/completeness-banner.test.ts
    - bigpanda-app/db/migrations/0016_wizard_schema.sql
    - bigpanda-app/db/migrations/meta/_journal.json
  modified:
    - bigpanda-app/db/schema.ts
    - bigpanda-app/lib/queries.ts
decisions:
  - "Named migration 0016_wizard_schema.sql (not 0002 as planned) because 0002-0015 already exist from prior phases"
  - "Drizzle generate produced full-schema rebuild (meta only had 0001_initial); deleted it, wrote targeted ALTER migration manually"
  - "Search FTS arms updated to include draft (not just dashboard) — draft projects should appear in search once they have data"
  - "computeHealth safe for draft projects: all counts default to 0 via ?? 0; no division-by-zero risk"
metrics:
  duration: "~4 minutes"
  completed_date: "2026-03-26"
  tasks_completed: 3
  files_created: 10
  files_modified: 2
---

# Phase 20 Plan 01: Wave 0 Test Stubs + DB Foundation Summary

**One-liner:** TDD Wave 0 stubs for wizard (8 RED test files), Drizzle migration adding `draft` enum and 3 project columns, and query-layer fix to surface draft projects in Dashboard and FTS search.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Wave 0 — Create all failing test stubs | 0933742 | bigpanda-app/tests/wizard/ (8 files) |
| 2 | Schema migration — draft status + project fields | 2ea4ead | db/schema.ts, db/migrations/0016_wizard_schema.sql |
| 3 | Fix dashboard query to include draft projects | 045be3e | lib/queries.ts |

## Verification Results

- `npx vitest run tests/wizard/` — 8 test files recognized; 2 GREEN (schema-wizard, multi-file-accumulation), 6 RED as expected
- `npx vitest run` (full suite) — 127 tests passing, 0 regressions across 28 test files
- `npx drizzle-kit migrate` — migration applied successfully (exit 0)
- DB confirmed: `enum_range(NULL::project_status)` = `{active,archived,closed,draft}`
- DB confirmed: `\d projects` shows `description`, `start_date`, `end_date` columns

## Success Criteria Check

- [x] All 8 test stubs exist in `bigpanda-app/tests/wizard/` and are recognized by vitest
- [x] `bigpanda-app/db/schema.ts` reflects `'draft'` status and 3 new project columns
- [x] Migration applied: DB accepts INSERT with status 'draft' without error
- [x] `getActiveProjects()` returns draft projects alongside active projects
- [x] Full vitest suite passes with no new failures

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migration file naming conflict**
- **Found during:** Task 2
- **Issue:** Plan specifies `0002_wizard_schema.sql` but migrations 0002–0015 already exist from prior phases
- **Fix:** Named migration `0016_wizard_schema.sql` to follow sequential naming; updated `meta/_journal.json` to reference new name
- **Files modified:** db/migrations/0016_wizard_schema.sql, db/migrations/meta/_journal.json
- **Commit:** 2ea4ead

**2. [Rule 1 - Bug] Drizzle generate produced full-schema rebuild instead of targeted ALTER**
- **Found during:** Task 2
- **Issue:** Drizzle meta only tracked `0001_initial`; running `drizzle-kit generate` produced a complete schema recreation script rather than incremental ALTERs
- **Fix:** Deleted generated file, wrote targeted migration manually with `ALTER TYPE ... ADD VALUE 'draft'` and three `ALTER TABLE ... ADD COLUMN` statements
- **Files modified:** db/migrations/0016_wizard_schema.sql (manual)
- **Commit:** 2ea4ead

**3. [Rule 2 - Missing functionality] FTS search arms also updated for draft**
- **Found during:** Task 3
- **Issue:** Plan only mentioned `getActiveProjects()` and raw SQL in `getDashboardData()`, but `searchAllRecords()` contains 11 UNION arms all filtering `p.status = 'active'`
- **Fix:** Updated all 11 search arms to `p.status IN ('active', 'draft')` — draft projects should be findable once they have entity data
- **Files modified:** lib/queries.ts
- **Commit:** 045be3e

## Self-Check: PASSED
