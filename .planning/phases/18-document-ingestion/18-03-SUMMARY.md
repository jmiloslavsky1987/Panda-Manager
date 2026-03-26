---
phase: 18-document-ingestion
plan: 03
subsystem: api
tags: [vitest, drizzle, postgres, anthropic, sse, tdd, ingestion, extraction, claude]

# Dependency graph
requires:
  - phase: 18-document-ingestion/18-01
    provides: Wave 0 RED test stubs (extractor.test.ts, dedup.test.ts) and document-extractor.ts lib
  - phase: 17-schema-extensions
    provides: ingestion_status enum on artifacts table, source_artifact_id + ingested_at on all entity tables

provides:
  - POST /api/ingestion/extract route that reads artifact from DB, loads file from disk, calls Claude claude-sonnet-4-6, streams SSE progress, returns ExtractionItem[] JSON, deduplicates against DB
  - ExtractionItem interface and EntityType union exported from route.ts
  - isAlreadyIngested(item, projectId) function covering all 10 entity types for ING-12 dedup

affects:
  - 18-04 (approve route reads ExtractionItem[] produced by this route)
  - 18-05 (preview UI consumes SSE events from this route)
  - 22-source-badges-audit-log (source_artifact_id dedup queries prove the FK is query-able)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SSE streaming route with ReadableStream + export const dynamic = 'force-dynamic' (existing pattern, re-applied for extraction)"
    - "Accumulate full Claude streaming text before JSON.parse — never parse mid-stream (pitfall 3 avoidance)"
    - "isAlreadyIngested: normalize().slice(0,120) + ilike() prefix match per entity type for deterministic dedup"
    - "vi.mock with inline vi.fn() factories (not top-level variables) to avoid hoisting errors in Vitest"

key-files:
  created:
    - bigpanda-app/app/api/ingestion/extract/route.ts
  modified:
    - bigpanda-app/tests/ingestion/extractor.test.ts
    - bigpanda-app/tests/ingestion/dedup.test.ts

key-decisions:
  - "Run vitest from bigpanda-app/ directory (not project root) — @/ alias resolves to bigpanda-app/ per vitest.config.ts __dirname"
  - "vi.mock factory variables must use inline vi.fn() — cannot reference top-level const before initialization due to hoisting"
  - "isAlreadyIngested exported from route.ts (not a separate lib) — dedup is tightly coupled to extraction logic and the route owns the entityType→table mapping"
  - "team entityType maps to focus_areas table (team_name → title) — focus_areas is the closest semantic fit in the v2.0 schema"

patterns-established:
  - "Extraction dedup: normalize = .toLowerCase().trim().slice(0,120); match via ilike prefix on entity-specific key field"
  - "SSE event shape: { type: 'progress', message } during work; { type: 'complete', items, filteredCount } on success; { type: 'error', message } on failure"

requirements-completed:
  - ING-04
  - ING-12

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 18 Plan 03: Document Extraction API Summary

**POST /api/ingestion/extract: Claude-powered SSE extraction route with 10-entityType EXTRACTION_SYSTEM prompt and isAlreadyIngested dedup covering all entity tables**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-26T06:32:58Z
- **Completed:** 2026-03-26T06:36:47Z
- **Tasks:** 1 (TDD: RED + GREEN commits)
- **Files modified:** 3

## Accomplishments

- Created `bigpanda-app/app/api/ingestion/extract/route.ts` with full SSE streaming POST handler
- EXTRACTION_SYSTEM prompt covers all 10 entityType values with per-type field guidance
- `isAlreadyIngested(item, projectId)` queries 10 entity tables using normalize+ilike prefix match
- `extractor.test.ts` and `dedup.test.ts` both GREEN: 10/10 tests passing

## Task Commits

Each task was committed atomically:

1. **RED: add failing test stubs for extractor shape and dedup** - `651e881` (test)
2. **GREEN: implement /api/ingestion/extract route** - `9f07933` (feat)

**Plan metadata:** (docs commit — see final commit)

## Files Created/Modified

- `bigpanda-app/app/api/ingestion/extract/route.ts` — POST handler: reads artifact, loads file, calls Claude claude-sonnet-4-6, SSE streams, deduplicates, returns ExtractionItem[]
- `bigpanda-app/tests/ingestion/extractor.test.ts` — ING-04 shape assertions using mocked Anthropic SDK
- `bigpanda-app/tests/ingestion/dedup.test.ts` — ING-12 isAlreadyIngested true/false assertions using mocked DB

## Decisions Made

- **Vitest run directory:** Must run from `bigpanda-app/` not project root — the `@/` alias in vitest.config.ts uses `__dirname` which is `bigpanda-app/`, so `@/app/...` resolves correctly only when CWD is `bigpanda-app/`
- **vi.mock hoisting:** Cannot reference top-level `const mockFn = vi.fn()` inside `vi.mock()` factory — hoisting moves `vi.mock()` above variable declarations; solution is to use inline `vi.fn()` in the factory and access via `vi.mocked(db.select)` in test bodies
- **isAlreadyIngested placement:** Exported from route.ts rather than a separate lib to keep the entityType→table mapping co-located with the extraction handler
- **team→focus_areas mapping:** The `team` entityType (team_name, track, ingest_status) maps to `focus_areas` table (title = team_name) — closest semantic match in v2.0 schema

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vitest @/ alias resolution requires running from bigpanda-app/**

- **Found during:** Task 1 GREEN phase (test run after route creation)
- **Issue:** `Cannot find package '@/app/api/ingestion/extract/route'` when running vitest from project root — `@/` alias resolves relative to vitest.config.ts location (bigpanda-app/)
- **Fix:** Changed test run commands to `cd bigpanda-app && npx vitest run ...` instead of running from project root with `bigpanda-app/tests/...` paths
- **Files modified:** None (test commands only)
- **Verification:** All 10 tests GREEN when running from bigpanda-app/
- **Committed in:** 9f07933

**2. [Rule 3 - Blocking] vi.mock hoisting caused "Cannot access before initialization"**

- **Found during:** Task 1 GREEN phase (first test run from correct directory)
- **Issue:** dedup.test.ts used top-level `const mockWhere = vi.fn()` inside `vi.mock('@/db', ...)` factory — Vitest hoists vi.mock to top of file, but `const` declarations aren't hoisted
- **Fix:** Replaced factory references with inline `vi.fn()` definitions; moved per-test mock configuration into individual test bodies using `vi.mocked(db.select).mockReturnValue(...)`
- **Files modified:** bigpanda-app/tests/ingestion/dedup.test.ts
- **Verification:** All 5 dedup tests GREEN
- **Committed in:** 9f07933

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking test run issues)
**Impact on plan:** Both fixes were necessary to get tests passing. No scope creep.

## Issues Encountered

- Pre-existing TypeScript error in `lib/yaml-export.ts` (`Cannot find module 'js-yaml'`) — out of scope, existed before this plan. `npx tsc --noEmit` output has 0 new errors from this plan's code.

## User Setup Required

None — no external service configuration required beyond `ANTHROPIC_API_KEY` (already in use by existing skill routes).

## Next Phase Readiness

- `/api/ingestion/extract` is ready for 18-04 (approve route) and 18-05 (preview UI)
- `ExtractionItem` and `isAlreadyIngested` are exported and typed — 18-04 approve route can import them directly
- SSE event shapes (`progress`, `complete`, `error`) are established for 18-05 client to consume
- Route does NOT write to entity tables — all writes deferred to 18-04 (correct per plan spec)

---
*Phase: 18-document-ingestion*
*Completed: 2026-03-26*

## Self-Check: PASSED

- FOUND: bigpanda-app/app/api/ingestion/extract/route.ts
- FOUND: bigpanda-app/tests/ingestion/extractor.test.ts
- FOUND: bigpanda-app/tests/ingestion/dedup.test.ts
- FOUND: .planning/phases/18-document-ingestion/18-03-SUMMARY.md
- FOUND commit 651e881: test(18-03): add RED test stubs for extractor shape and isAlreadyIngested dedup
- FOUND commit 9f07933: feat(18-03): implement /api/ingestion/extract route with Claude extraction and dedup
