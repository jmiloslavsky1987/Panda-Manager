---
phase: 22-source-badges-+-audit-log
plan: 02
subsystem: database
tags: [drizzle, postgresql, migration, audit-log, source-badge, react, testing-library, vitest, tdd]

# Dependency graph
requires:
  - phase: 22-01
    provides: RED failing tests for writeAuditLog() and SourceBadge contracts
  - phase: 17-schema-extensions
    provides: audit_log table and source/source_artifact_id columns on entity tables
  - phase: 19.1-source-integrations
    provides: discovery approve route setting source='discovery' on entity inserts
provides:
  - writeAuditLog() helper (lib/audit.ts) — Drizzle insert into audit_log, used by all API routes
  - SourceBadge component (components/SourceBadge.tsx) — Manual/Ingested/Discovered badges with color coding
  - DeleteConfirmDialog component (components/DeleteConfirmDialog.tsx) — Dialog-based delete confirmation wrapper
  - Migration 0017: discovery_source TEXT column on 12 entity tables (idempotent ADD COLUMN IF NOT EXISTS)
  - Discovery approve route propagates discovery_source (capitalized tool name) on entity inserts
affects:
  - 22-03 (consumes writeAuditLog() and SourceBadge in entity list views)
  - 22-04 (consumes DeleteConfirmDialog for delete operations)
  - any future API route that writes entity creates/updates/deletes

# Tech tracking
tech-stack:
  added:
    - "@testing-library/jest-dom/matchers — extended into Vitest via expect.extend() in setup-jest-dom.ts"
    - "cleanup() from @testing-library/react wired to afterEach() in setup-jest-dom.ts"
  patterns:
    - "vitest.config.ts setupFiles: global jest-dom + cleanup setup across all test files"
    - "tests/vitest.d.ts: extends Vitest Assertion with jest-dom types via import '@testing-library/jest-dom/vitest'"
    - "capitalizeSource() helper: normalizes discovery tool names from lowercase (slack) to display (Slack)"

key-files:
  created:
    - bigpanda-app/db/migrations/0017_discovery_source_column.sql
    - bigpanda-app/lib/audit.ts
    - bigpanda-app/components/DeleteConfirmDialog.tsx
    - bigpanda-app/tests/setup-jest-dom.ts
    - bigpanda-app/tests/vitest.d.ts
  modified:
    - bigpanda-app/db/schema.ts
    - bigpanda-app/components/SourceBadge.tsx
    - bigpanda-app/app/api/discovery/approve/route.ts
    - bigpanda-app/vitest.config.ts
    - bigpanda-app/components/teams/BusinessOutcomesSection.tsx
    - bigpanda-app/components/teams/E2eWorkflowsSection.tsx
    - bigpanda-app/components/teams/FocusAreasSection.tsx

key-decisions:
  - "jest-dom setup via expect.extend(matchers) not import '@testing-library/jest-dom' — with globals: false, jest-dom's direct import fails because it calls expect as a global; explicit extend is required"
  - "cleanup() in afterEach() in setupFiles — @testing-library/react auto-cleanup only fires when test globals are available; with globals: false we must wire it manually or renders bleed across tests"
  - "discovery_source capitalization in approve route: lowercase tool names (slack, gmail) from discovery_items.source capitalized to display form (Slack, Gmail) for SourceBadge labels"
  - "workflow_steps gets discovery_source even though it has no source column — future proofing; step-level discovery attribution may be needed"

patterns-established:
  - "setup-jest-dom.ts: place jest-dom extend + cleanup in setupFiles, not in individual test files — one place to maintain"
  - "vitest.d.ts: import '@testing-library/jest-dom/vitest' in tests/ directory for TypeScript Assertion augmentation"

requirements-completed:
  - AUDIT-01
  - AUDIT-02
  - AUDIT-03

# Metrics
duration: 6min
completed: 2026-03-27
---

# Phase 22 Plan 02: Shared Infrastructure Implementation Summary

**Drizzle migration adding discovery_source to 12 entity tables, writeAuditLog() helper, SourceBadge with Manual/Ingested/Discovered variants, and DeleteConfirmDialog — all 10 TDD tests turned GREEN**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-27T17:26:35Z
- **Completed:** 2026-03-27T17:32:57Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- Migration 0017 adds `discovery_source TEXT` to 12 entity tables (idempotent, applied to local DB)
- `lib/audit.ts` writeAuditLog() inserts into audit_log table — all 5 audit-helper tests GREEN
- `components/SourceBadge.tsx` stub replaced with real implementation — all 5 source-badge tests GREEN
- `components/DeleteConfirmDialog.tsx` Dialog-based delete confirmation with entityLabel/onConfirm/trigger props
- Discovery approve route now propagates capitalized discovery_source to entity inserts

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration — add discovery_source column to entity tables** - `2763965` (feat)
2. **Task 2: Implement writeAuditLog() helper and SourceBadge component** - `0d7e617` (feat)
3. **Task 3: Implement DeleteConfirmDialog component** - `a541d10` (feat)

## Files Created/Modified
- `bigpanda-app/db/migrations/0017_discovery_source_column.sql` — idempotent ALTER TABLE for 12 entity tables
- `bigpanda-app/db/schema.ts` — discovery_source: text('discovery_source') added to all 12 Drizzle table definitions
- `bigpanda-app/lib/audit.ts` — writeAuditLog() helper: inserts into audit_log with field mapping
- `bigpanda-app/components/SourceBadge.tsx` — replaced stub: Manual (grey outline) / Ingested—filename (blue) / Discovered—tool (purple) badges
- `bigpanda-app/components/DeleteConfirmDialog.tsx` — Dialog wrapper with deleting state, Cancel + destructive Delete buttons
- `bigpanda-app/app/api/discovery/approve/route.ts` — capitalizeSource() helper + discovery_source propagated on all 6 entity insert paths
- `bigpanda-app/tests/setup-jest-dom.ts` — global jest-dom setup: expect.extend(matchers) + afterEach cleanup()
- `bigpanda-app/tests/vitest.d.ts` — TypeScript declaration: import '@testing-library/jest-dom/vitest'
- `bigpanda-app/vitest.config.ts` — added setupFiles: ['./tests/setup-jest-dom.ts']
- `bigpanda-app/components/teams/BusinessOutcomesSection.tsx` — discovery_source: null added to optimistic object
- `bigpanda-app/components/teams/E2eWorkflowsSection.tsx` — discovery_source: null added to optimistic objects (workflow + step)
- `bigpanda-app/components/teams/FocusAreasSection.tsx` — discovery_source: null added to optimistic object

## Decisions Made
- **jest-dom setup**: Used `expect.extend(matchers)` from `@testing-library/jest-dom/matchers` rather than `import '@testing-library/jest-dom'` — the latter calls `expect` as a global which fails with `globals: false` in vitest config
- **cleanup() wiring**: Manually added `afterEach(() => cleanup())` in setupFiles — @testing-library/react's auto-cleanup requires test globals; without it, rendered DOM bleeds between tests causing "Found multiple elements" errors
- **discovery_source capitalization**: Tool names from `discovery_items.source` are lowercase (slack, gmail) but display as proper nouns (Slack, Gmail) — capitalize on write in approve route rather than on read in SourceBadge

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] jest-dom matchers not registered in vitest**
- **Found during:** Task 2 (running source-badge tests after implementation)
- **Issue:** Tests used `toBeInTheDocument()` but vitest reported "Invalid Chai property: toBeInTheDocument" — `@testing-library/jest-dom` was installed but never wired into vitest
- **Fix:** Created `tests/setup-jest-dom.ts` with `expect.extend(matchers)`, added to `vitest.config.ts` setupFiles
- **Files modified:** bigpanda-app/tests/setup-jest-dom.ts (created), bigpanda-app/vitest.config.ts
- **Verification:** Tests run without "Invalid Chai property" error
- **Committed in:** 0d7e617 (Task 2 commit)

**2. [Rule 1 - Bug] DOM bleeding between source-badge tests**
- **Found during:** Task 2 (after jest-dom fix, 2/5 tests still failing)
- **Issue:** Test 4 (discovery null source) failed with "Found multiple elements with /Discovered/" — test 3's rendered DOM was still present when test 4 ran
- **Fix:** Added `afterEach(() => cleanup())` to setup-jest-dom.ts — @testing-library/react auto-cleanup requires test globals
- **Files modified:** bigpanda-app/tests/setup-jest-dom.ts
- **Verification:** All 5 source-badge tests pass independently; test 4 finds exactly one "Discovered" element
- **Committed in:** 0d7e617 (Task 2 commit)

**3. [Rule 1 - Bug] TypeScript type errors from schema discovery_source addition**
- **Found during:** Task 3 (TypeScript check after adding discovery_source to schema)
- **Issue:** Optimistic update objects in BusinessOutcomesSection, E2eWorkflowsSection, FocusAreasSection missing required `discovery_source` field from updated Drizzle inferred type
- **Fix:** Added `discovery_source: null` to all 4 affected optimistic objects (3 files)
- **Files modified:** components/teams/BusinessOutcomesSection.tsx, E2eWorkflowsSection.tsx, FocusAreasSection.tsx
- **Verification:** `npx tsc --noEmit` shows no errors on these files
- **Committed in:** a541d10 (Task 3 commit)

**4. [Rule 3 - Blocking] Vitest TypeScript types missing jest-dom Assertion augmentation**
- **Found during:** Task 3 (TypeScript check on tests)
- **Issue:** `error TS2339: Property 'toBeInTheDocument' does not exist on type 'Assertion<HTMLElement>'`
- **Fix:** Created `tests/vitest.d.ts` importing `'@testing-library/jest-dom/vitest'` which declares module augmentation
- **Files modified:** bigpanda-app/tests/vitest.d.ts (created)
- **Verification:** TypeScript no longer reports errors on jest-dom matcher calls
- **Committed in:** a541d10 (Task 3 commit)

---

**Total deviations:** 4 auto-fixed (2 blocking, 2 bug)
**Impact on plan:** All auto-fixes necessary for tests to pass and TypeScript to compile. No scope creep — all fixes are direct consequences of the task implementations.

## Issues Encountered
- `globals: false` in vitest.config.ts is non-standard — it means @testing-library/react's auto-cleanup and jest-dom's auto-register don't fire. Required explicit wiring in setupFiles. This pattern is now established for future component test files.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 22-03 can begin immediately: SourceBadge and writeAuditLog() are ready for consumption in entity list views
- Plan 22-04 can begin immediately: DeleteConfirmDialog is ready for wrapping delete buttons
- Both components follow the established 'use client' pattern for the bigpanda-app Next.js setup

## Self-Check: PASSED

- FOUND: bigpanda-app/db/migrations/0017_discovery_source_column.sql
- FOUND: bigpanda-app/lib/audit.ts
- FOUND: bigpanda-app/components/SourceBadge.tsx (real implementation, stub replaced)
- FOUND: bigpanda-app/components/DeleteConfirmDialog.tsx
- FOUND: .planning/phases/22-source-badges-+-audit-log/22-02-SUMMARY.md
- FOUND: commits 2763965, 0d7e617, a541d10

---
*Phase: 22-source-badges-+-audit-log*
*Completed: 2026-03-27*
