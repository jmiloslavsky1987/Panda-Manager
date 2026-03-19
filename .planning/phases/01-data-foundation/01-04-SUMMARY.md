---
phase: 01-data-foundation
plan: 04
subsystem: yaml-service
tags: [yaml, js-yaml, round-trip, data-service, drizzle-orm, outputs, idempotency, typescript]

# Dependency graph
requires:
  - phase: "01-02"
    provides: "Drizzle schema (outputs table, all domain tables)"
provides:
  - "lib/yaml-export.ts: serializeProjectToYaml(), parseYaml(), buildYamlDocument(), REQUIRED_TOP_LEVEL_KEYS"
  - "bigpanda-app/lib/data-service.ts: createOutputRecord(), updateOutputStatus(), getProjectForExport()"
  - "Round-trip stable YAML export with exact Cowork-compatible settings"
  - "Outputs idempotency pattern: unique constraint on idempotency_key, status='running' on insert"
affects: [01-05, 01-06, 02-app-shell-read-surface, 03-write-surface]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "js-yaml dump: sortKeys=false, lineWidth=-1, noRefs=true (NEVER change)"
    - "js-yaml parse: JSON_SCHEMA to prevent yes/no boolean coercion"
    - "buildYamlDocument: REQUIRED_TOP_LEVEL_KEYS order enforced, empty arrays for missing keys"
    - "Idempotency gate: DB unique constraint on outputs.idempotency_key (not application-level check)"
    - "RLS scoping: SET LOCAL app.current_project_id in transaction for per-project queries"
    - "Parallel section fetch: Promise.all for 8 section queries in getProjectForExport"
    - "server-only omitted from root lib/ (test compat) — bigpanda-app/lib/ version will include it"

key-files:
  created:
    - lib/yaml-export.ts
    - bigpanda-app/lib/data-service.ts
    - .planning/phases/01-data-foundation/deferred-items.md
  modified:
    - tests/yaml-roundtrip.test.ts

key-decisions:
  - "server-only import omitted from lib/yaml-export.ts — same pattern as db/index.ts for test runner compat"
  - "buildYamlDocument takes two args (project, sections) not one flat object — matches production API"
  - "js-yaml installed in bigpanda-app/node_modules only; root tests use NODE_PATH=./bigpanda-app/node_modules"
  - "outputs.test.ts remains RED (ECONNREFUSED) — requires PostgreSQL; that is the pre-established constraint"

patterns-established:
  - "YAML export: always emit empty arrays for missing section keys (never omit)"
  - "YAML key mapping: overall_status → status, engagement_history rows → history"
  - "Test runner invocation: NODE_PATH=./bigpanda-app/node_modules npx tsx --test"

requirements-completed: [DATA-05, DATA-07]

# Metrics
duration: 15min
completed: 2026-03-19
---

# Phase 1 Plan 04: YAML Export Utility + DataService Summary

**YAML round-trip utility with exact Cowork-compatible settings and outputs idempotency DataService methods implemented, 6/6 yaml-roundtrip tests GREEN**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-19T03:18:00Z
- **Completed:** 2026-03-19T03:33:11Z
- **Tasks:** 2 of 2
- **Files modified:** 4 (2 created, 1 updated, 1 new test infrastructure)

## Accomplishments

- Implemented `lib/yaml-export.ts` with REQUIRED_TOP_LEVEL_KEYS constant, parseYaml (JSON_SCHEMA), serializeProjectToYaml (exact dump settings), and buildYamlDocument (two-arg, all 9 keys guaranteed)
- All 6 yaml-roundtrip tests pass: frontmatter, all required keys, empty array fallback, round-trip fidelity, boolean non-coercion, key order
- Implemented `bigpanda-app/lib/data-service.ts` with createOutputRecord (status='running'), updateOutputStatus, and getProjectForExport
- getProjectForExport wraps all 8 parallel section queries in a transaction with RLS scoping
- Updated Wave 0 yaml-roundtrip.test.ts stub to match actual two-arg interface (per TDD RED protocol)

## Task Commits

1. **Task 1 (RED): Update yaml-roundtrip test to correct interface** - `64062ea` (test)
2. **Task 1 (GREEN): Implement YAML export utility** - `93618e5` (feat)
3. **Task 2 (GREEN): Implement DataService** - `2899886` (feat)

## Files Created/Modified

- `lib/yaml-export.ts` — REQUIRED_TOP_LEVEL_KEYS, parseYaml, serializeProjectToYaml, buildYamlDocument, ProjectSections type
- `bigpanda-app/lib/data-service.ts` — createOutputRecord, updateOutputStatus, getProjectForExport, OutputRecord + ProjectExportData types
- `tests/yaml-roundtrip.test.ts` — updated from single-arg stub to correct two-arg interface with 6 test cases
- `.planning/phases/01-data-foundation/deferred-items.md` — pre-existing TS errors from 01-03 logged

## Decisions Made

- **server-only omitted**: The `import 'server-only'` is omitted from `lib/yaml-export.ts` for the same reason as `db/index.ts` — the next/compiled version throws unconditionally in Node.js test context. The production `bigpanda-app/lib/` counterpart (used by Phase 2+ Next.js routes) will include the guard.
- **Two-arg buildYamlDocument**: The plan spec defines `buildYamlDocument(project, sections)`. The Wave 0 stub used a single flat-object call. Updated the test stub to use the correct interface during the TDD RED step.
- **NODE_PATH workaround**: js-yaml is installed in bigpanda-app/node_modules but not at project root (npm install fails due to a pre-existing invalid esbuild semver in package-lock.json). Tests run with `NODE_PATH=./bigpanda-app/node_modules npx tsx --test`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Wave 0 test stub used incorrect single-arg buildYamlDocument interface**
- **Found during:** Task 1 (TDD RED phase)
- **Issue:** The Wave 0 stub called `buildYamlDocument(sampleProject)` with one flat arg, but the plan spec defines two args `(project, sections)`. The stub was also missing several correct test cases.
- **Fix:** Updated yaml-roundtrip.test.ts with 6 test cases matching the actual two-arg interface
- **Files modified:** tests/yaml-roundtrip.test.ts
- **Commit:** 64062ea

**2. [Rule 3 - Blocking] js-yaml not installed at project root**
- **Found during:** Task 1 (GREEN implementation)
- **Issue:** `lib/yaml-export.ts` imports js-yaml but it's only in `bigpanda-app/node_modules`. `npm install` fails with `Invalid Version` error due to pre-existing invalid esbuild semver in package-lock.json — this is a pre-existing root-level package-lock corruption, not caused by this plan.
- **Fix:** Use `NODE_PATH=./bigpanda-app/node_modules npx tsx --test` as the test runner command
- **Files modified:** None (runner invocation only)
- **Note:** Deferred the package-lock corruption to deferred-items.md

## Issues Encountered

- **PostgreSQL not running**: outputs.test.ts tests fail with ECONNREFUSED — pre-existing constraint documented in 01-02. outputs.test.ts tests the DB schema directly and requires PostgreSQL to pass.
- **Pre-existing TypeScript errors in settings.ts**: Two TS errors from Plan 01-03 (`TS2307`, `TS2352`) — logged to deferred-items.md, not fixed (out of scope for this plan).
- **npm install blocked**: Invalid semver for `node_modules/esbuild/node_modules/@esbuild/win32-ia32` in package-lock.json causes `npm install` to fail. Pre-existing issue, not caused by this plan.

## User Setup Required

To make outputs.test.ts pass:
1. Install and start PostgreSQL (see 01-02 SUMMARY for full steps)
2. Create databases: `createdb bigpanda_test && createdb bigpanda_app`
3. Apply migration: `cd bigpanda-app && DATABASE_URL=postgresql://localhost:5432/bigpanda_test npx drizzle-kit migrate`
4. Run tests: `NODE_PATH=./bigpanda-app/node_modules npx tsx --test tests/yaml-roundtrip.test.ts tests/outputs.test.ts`

## Next Phase Readiness

- **01-05 (Migration script)**: yaml-export.ts and data-service.ts are ready. Migration script can use `buildYamlDocument` and `createOutputRecord`. Still blocked on PostgreSQL startup.
- **01-06 (Final validation)**: Will need PostgreSQL running for all 8 test files to pass.

## Self-Check

Files present:
- FOUND: lib/yaml-export.ts
- FOUND: bigpanda-app/lib/data-service.ts
- FOUND: tests/yaml-roundtrip.test.ts (updated)

Commits:
- FOUND: 64062ea (test — yaml-roundtrip stub update)
- FOUND: 93618e5 (feat — yaml-export.ts)
- FOUND: 2899886 (feat — data-service.ts)

Test results: yaml-roundtrip 6/6 PASS, outputs 0/2 (ECONNREFUSED — expected)

## Self-Check: PASSED

---
*Phase: 01-data-foundation*
*Completed: 2026-03-19*
