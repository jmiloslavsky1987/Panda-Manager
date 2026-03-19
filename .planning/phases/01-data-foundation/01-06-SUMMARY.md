---
phase: 01-data-foundation
plan: "06"
subsystem: database
tags: [exceljs, postgres, drizzle, migration, xlsx, typescript]

# Dependency graph
requires:
  - phase: 01-05
    provides: YAML context doc migration (runMigration), project/workstream/risk rows in DB, migrate-local.ts skeleton

provides:
  - importXlsx() exported function in bigpanda-app/scripts/migrate-local.ts
  - All 5 PA3_Action_Tracker.xlsx sheets imported as DB supplement
  - actions table rows: source=xlsx_open, xlsx_completed, xlsx_questions; type=question for Q-NNN IDs
  - risks table rows: source=xlsx_risks
  - workstreams rows updated with current_status/lead/last_updated from Workstream Notes sheet
  - Idempotent two-phase migration: runMigration() then importXlsx()

affects:
  - Phase 2 (app shell reads actions/risks from DB)
  - Phase 3 (write surface updates actions/risks)
  - Phase 5 (AI reports use DB-backed action + risk context)

# Tech tracking
tech-stack:
  added: [exceljs (workbook.xlsx.readFile, getWorksheet by name)]
  patterns:
    - Dynamic header-to-column-index map built from row 2 (resilient to column reordering)
    - YAML-wins idempotency pattern: skip insert if (project_id, external_id) exists
    - Customer name normalized to UPPERCASE before project lookup (Kaiser → KAISER)
    - Workstream Notes: UPDATE only — never insert new workstream rows from xlsx
    - Date/due cells coerced with Date instanceof check → ISO string (ExcelJS returns Date objects)

key-files:
  modified:
    - bigpanda-app/scripts/migrate-local.ts — importXlsx() added; entry point updated to call both phases
    - tests/migration.test.ts — 8 xlsx-specific assertions added (DB-gated, ECONNREFUSED until PostgreSQL)

key-decisions:
  - "Q-NNN IDs (Open Questions sheet) stored in actions table with type='question' — resolves planning_context decision"
  - "importXlsx() exported from migrate-local.ts so test runner can import it independently"
  - "Workstream Notes sheet: UPDATE only (no insert) — worksheet data supplements YAML-sourced workstream rows"
  - "ExcelJS date cells return Date objects — cellStr() helper coerces via instanceof check before String()"
  - "All xlsx tests remain RED until PostgreSQL installed — ECONNREFUSED expected, documented not treated as failure"

requirements-completed: [DATA-04]

# Metrics
duration: 4min
completed: 2026-03-19
---

# Phase 1 Plan 06: xlsx Supplement Import Summary

**ExcelJS-based two-phase migration: YAML import (Plan 05) followed by xlsx supplement across all 5 PA3_Action_Tracker sheets, with YAML-wins idempotency by (project_id, external_id)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-19T14:33:46Z
- **Completed:** 2026-03-19T14:37:31Z
- **Tasks:** 1/1
- **Files modified:** 2

## Accomplishments

- `importXlsx()` function added to migrate-local.ts and exported for test access
- All 5 xlsx sheets handled by name: Open Actions, Open Risks, Open Questions, Workstream Notes, Completed
- YAML-wins deduplication: existing rows by (project_id, external_id) are never overwritten
- Q-NNN IDs from Open Questions sheet stored as `actions` rows with `type='question'`
- Entry point updated to run `runMigration()` then `importXlsx()` sequentially

## Task Commits

1. **Task 1: Add xlsx import section to migration script** - `34070d0` (feat)

**Plan metadata:** pending final commit (docs)

## Files Created/Modified

- `bigpanda-app/scripts/migrate-local.ts` — Added ExcelJS import, `importXlsx()` function with all 5 sheet handlers, updated entry point to two-phase migration
- `tests/migration.test.ts` — Added `describe('migration script (Plan 01-06: xlsx supplement)')` with 8 assertions; before() hook calls `importXlsx()` before assertions run

## Decisions Made

- **Q-NNN IDs as actions with type='question':** Resolves the "planner decision" from RESEARCH.md Finding 1 Sheet 3 — Open Questions stored in the actions table with `type='question'`, making them queryable alongside actions without a separate table.
- **importXlsx() exported:** Necessary for the test `before()` hook to call `importXlsx()` independently of `runMigration()` (tests structure each migration phase in its own describe block with its own before hook).
- **Workstream Notes: UPDATE only:** Workstream rows are seeded from YAML (Plan 05). The xlsx Workstream Notes sheet provides enrichment data (current_status, lead, last_updated) but should never create net-new workstream rows — matching is by LOWER(name) within the same project.
- **ExcelJS Date coercion in cellStr():** ExcelJS parses Excel date serial numbers into JavaScript Date objects. The `cellStr()` helper detects `instanceof Date` and converts to ISO date string, preventing `[object Object]` stored in TEXT columns.

## Deviations from Plan

None — plan executed exactly as written. The plan's implementation pseudocode was followed structurally; all five sheets implemented as specified.

## Issues Encountered

- ExcelJS date cells: plan did not mention that ExcelJS returns `Date` objects for date-format cells. Added `instanceof Date` check in `cellStr()` helper to convert to ISO string. Not a deviation — correctness requirement discovered during implementation.

## User Setup Required

None — no external service configuration required. The migration script runs once PostgreSQL is installed:

```bash
cd bigpanda-app
DATABASE_URL=postgresql://localhost:5432/bigpanda_app npx tsx scripts/migrate-local.ts
```

This runs both phases: YAML context doc import, then xlsx supplement import.

## Next Phase Readiness

- Phase 1 (Data Foundation) is fully complete — all 6 plans executed
- Database schema, migration scripts, YAML export utilities, and DataService are all implemented
- Phase 2 (App Shell + Read Surface) can begin — requires PostgreSQL installed and migration run
- Pre-requisite reminder: install PostgreSQL, create `bigpanda_test` and `bigpanda_app` databases, run drizzle-kit migrate

---
*Phase: 01-data-foundation*
*Completed: 2026-03-19*
