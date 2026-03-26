---
phase: 17-schema-extensions
plan: 03
subsystem: database
tags: [drizzle, postgres, schema, enums, pgTable, tdd, vitest]

# Dependency graph
requires:
  - phase: 17-02
    provides: SQL migration 0011_v2_schema.sql establishing DB tables for v2.0 entities
provides:
  - discoveryItemStatusEnum, ingestionStatusEnum, jobRunOutcomeEnum, deliveryStatusEnum, integrationTrackStatusEnum exported from db/schema.ts
  - discoveryItems, auditLog, businessOutcomes, e2eWorkflows, workflowSteps, focusAreas, architectureIntegrations, beforeState, teamOnboardingStatus, scheduledJobs pgTable exports
  - timeEntries extended with submission/approval/lock columns
  - artifacts extended with ingestion_status and ingestion_log_json columns
  - TypeScript types for all v2.0 entities (via Drizzle $inferSelect/$inferInsert)
affects: [18-document-ingestion, 19-external-discovery, 20-project-initiation, 21-teams-architecture, 22-audit-log, 23-time-tracking-advanced, 24-scheduler-enhanced]

# Tech tracking
tech-stack:
  added: []
  patterns: [TDD RED-GREEN pattern with Vitest for schema additions, v2.0 enums declared before first-use tables to preserve JS const temporal dead zone correctness]

key-files:
  created: []
  modified:
    - bigpanda-app/db/schema.ts

key-decisions:
  - "v2.0 enums (discoveryItemStatusEnum, ingestionStatusEnum, etc.) placed in the top enums section before tables rather than appended at end — artifacts table references ingestionStatusEnum which requires prior declaration"

patterns-established:
  - "Append-only schema extension: never reorder or modify existing definitions, only add new enums before tables and new tables at end"
  - "v2.0 section comments (v2.0 Enums, v2.0 Tables) separate new additions from existing schema for readability"

requirements-completed: [SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05, SCHEMA-06, SCHEMA-07, SCHEMA-08, SCHEMA-09, SCHEMA-10, SCHEMA-11]

# Metrics
duration: 6min
completed: 2026-03-26
---

# Phase 17 Plan 03: Schema Extensions Summary

**5 new pgEnums and 10 new pgTables added to schema.ts with timeEntries/artifacts extensions, turning all 15 RED TDD tests GREEN**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-26T04:54:24Z
- **Completed:** 2026-03-26T04:55:52Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added 5 new pgEnum exports: discoveryItemStatusEnum, ingestionStatusEnum, jobRunOutcomeEnum, deliveryStatusEnum, integrationTrackStatusEnum
- Added 10 new pgTable exports: discoveryItems, auditLog, businessOutcomes, e2eWorkflows, workflowSteps, focusAreas, architectureIntegrations, beforeState, teamOnboardingStatus, scheduledJobs
- Extended timeEntries with 7 new columns (submitted_on/by, approved_on/by, rejected_on/by, locked)
- Extended artifacts with ingestion_status and ingestion_log_json columns
- All 28 Vitest tests pass (15 new + 13 pre-existing), no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add new enums and tables to schema.ts** - `e86ac65` (feat)

**Plan metadata:** _(to be added with docs commit)_

## Files Created/Modified
- `bigpanda-app/db/schema.ts` - Added 5 enums + 10 tables + 2 table extensions (154 lines added)

## Decisions Made
- v2.0 enums placed in the top enums section (after existing outputStatusEnum) rather than appended at file end — the `artifacts` table references `ingestionStatusEnum`, and JavaScript `const` declarations are not hoisted; placing them after their use would cause a ReferenceError at runtime. This is a correctness fix, not a style choice.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Relocated v2.0 enum declarations before first use**
- **Found during:** Task 1 (Add new enums and tables to schema.ts)
- **Issue:** Plan specified appending enums at end of file in a "v2.0 Enums" section after the TimeEntry types. However, the `artifacts` table (line 149) references `ingestionStatusEnum`. Since `const` declarations are not hoisted in JS/TS, placing the enum after `artifacts` would cause a temporal dead zone ReferenceError.
- **Fix:** Placed all 5 v2.0 enums in the existing enums section (immediately after `outputStatusEnum`) before any table definitions. Removed duplicate enum block from end-of-file position.
- **Files modified:** bigpanda-app/db/schema.ts
- **Verification:** `npx vitest run tests/schema-v2.test.ts` — 15/15 pass; `npx tsc --noEmit` — no new errors
- **Committed in:** e86ac65 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug, declaration order correctness)
**Impact on plan:** Fix was essential for correct JS execution semantics. All new exports are present as specified; only placement within the file differs from the action description.

## Issues Encountered
- Pre-existing TypeScript errors in `app/api/jobs/trigger/route.ts`, `app/api/skills/[skillName]/run/route.ts`, and `worker/index.ts` (ioredis/bullmq version incompatibility). These are unrelated to this plan and out of scope per deviation rules.

## Next Phase Readiness
- schema.ts now exports all 15 v2.0 symbols required by phases 18-24
- Phases 18 (Document Ingestion) and 19 (External Discovery) can now proceed in parallel
- All downstream phases have TypeScript types available via Drizzle $inferSelect/$inferInsert

---
*Phase: 17-schema-extensions*
*Completed: 2026-03-26*
