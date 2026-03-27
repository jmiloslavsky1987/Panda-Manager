---
phase: 22-source-badges-+-audit-log
plan: 01
subsystem: testing
tags: [vitest, tdd, audit-log, source-badge, testing-library, jsdom, red-tests]

# Dependency graph
requires:
  - phase: 17-schema-extensions
    provides: audit_log table and source/source_artifact_id columns on all entity tables
  - phase: 18-document-ingestion
    provides: ingestion write path setting source='ingestion' and source_artifact_id
  - phase: 19.1-source-integrations
    provides: discovery approval setting source='discovery'
provides:
  - RED failing tests for writeAuditLog() helper contract (5 tests)
  - RED failing tests for SourceBadge label derivation contract (5 tests)
  - SourceBadge.tsx Wave 0 stub (throws — placeholder so Vite import-analysis resolves)
  - @testing-library/react + jsdom installed for component testing
affects:
  - 22-02 (SourceBadge implementation — must make source-badge tests GREEN)
  - 22-02 (lib/audit.ts implementation — must make audit-helper tests GREEN)

# Tech tracking
tech-stack:
  added:
    - "@testing-library/react (component rendering in vitest)"
    - "@testing-library/jest-dom (toBeInTheDocument matcher)"
    - "jsdom (DOM environment for vitest via @vitest-environment docblock)"
  patterns:
    - "Lazy dynamic import in node-environment tests to allow per-test failures when module absent"
    - "Wave 0 throw-stub in components so Vite import-analysis resolves but tests fail individually"
    - "@vitest-environment jsdom docblock for per-file environment override"

key-files:
  created:
    - bigpanda-app/tests/audit/audit-helper.test.ts
    - bigpanda-app/tests/audit/source-badge.test.tsx
    - bigpanda-app/components/SourceBadge.tsx
  modified:
    - bigpanda-app/package.json
    - bigpanda-app/package-lock.json

key-decisions:
  - "SourceBadge Wave 0 stub throws instead of returning undefined — Vite's import-analysis resolves imports at transform time (not runtime), so vi.mock and dynamic imports cannot defer resolution; a real (throwing) stub is the only way to get 5 individually-failing tests in jsdom environment"
  - "audit-helper uses lazy async import helper inside each test — node environment resolves modules at runtime so try/catch works; dynamic import catches module-not-found and returns undefined, then expect(fn).toBeTypeOf('function') fails clearly per test"
  - "Installed @testing-library/react + jsdom as devDependencies — required for SourceBadge rendering tests; previously absent from project"

patterns-established:
  - "TDD Wave 0 stubs: use throwing stub file for Vite/jsdom component tests; use lazy dynamic import helper for node-env server-side tests"
  - "Per-file jsdom environment: add // @vitest-environment jsdom docblock + .tsx extension for component test files"

requirements-completed:
  - AUDIT-01
  - AUDIT-02
  - AUDIT-03

# Metrics
duration: 4min
completed: 2026-03-27
---

# Phase 22 Plan 01: TDD Wave 0 — Audit Helper + SourceBadge RED Tests Summary

**10 RED failing tests (5 audit-helper + 5 source-badge) defining the writeAuditLog() and SourceBadge contracts that Wave 1 implementation must satisfy**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-27T10:20:18Z
- **Completed:** 2026-03-27T10:24:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- 5 RED tests in `tests/audit/audit-helper.test.ts` covering writeAuditLog() field mapping (update, create, delete, numeric entity_id, null entity_id)
- 5 RED tests in `tests/audit/source-badge.test.tsx` covering Manual / Ingested / Discovered label derivation including null-safety paths
- Installed @testing-library/react, @testing-library/jest-dom, jsdom for component test support

## Task Commits

Each task was committed atomically:

1. **Task 1: Write RED tests for writeAuditLog() helper** - `163bd99` (test)
2. **Task 2: Write RED tests for SourceBadge label derivation** - `d53bf1e` (test)

**Plan metadata:** (docs commit — see below)

_Note: TDD Wave 0 — both commits are RED test commits. GREEN commits come in Plan 22-02._

## Files Created/Modified
- `bigpanda-app/tests/audit/audit-helper.test.ts` — 5 it() blocks for writeAuditLog(); lazy import pattern for per-test failures in node env
- `bigpanda-app/tests/audit/source-badge.test.tsx` — 5 it() blocks for SourceBadge labels; jsdom env, @testing-library/react render
- `bigpanda-app/components/SourceBadge.tsx` — Wave 0 stub: exports SourceBadge that throws "not yet implemented" so Vite resolves import but tests fail individually
- `bigpanda-app/package.json` — Added @testing-library/react, @testing-library/jest-dom, jsdom devDependencies
- `bigpanda-app/package-lock.json` — Lock file updated

## Decisions Made
- **Wave 0 SourceBadge stub strategy:** Vite's `import-analysis` plugin resolves all imports at transform time (before test runtime), making dynamic `import()` try/catch and `vi.mock()` insufficient to defer resolution of a non-existent module. Solution: create a minimal throwing stub so the module exists for Vite but throws on render, making each test fail individually.
- **Lazy import for audit helper:** Node environment resolves modules at runtime; wrapping `import('@/lib/audit')` in async try/catch inside a helper function lets each test fail at the `expect(fn).toBeTypeOf('function')` assertion rather than at suite load time.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing @testing-library/react + jsdom**
- **Found during:** Task 2 (SourceBadge test setup)
- **Issue:** Plan specified `@testing-library/react` + `render`/`screen` but these packages were absent from the project
- **Fix:** `npm install -D @testing-library/react @testing-library/jest-dom jsdom`
- **Files modified:** package.json, package-lock.json
- **Verification:** Import resolves; `render()` and `screen.getByText()` work in jsdom env
- **Committed in:** d53bf1e (Task 2 commit)

**2. [Rule 3 - Blocking] Created SourceBadge Wave 0 throwing stub**
- **Found during:** Task 2 (SourceBadge test execution)
- **Issue:** Vite import-analysis resolves imports at transform time; without the file existing, the entire test suite fails at load with "Failed to resolve import" — no individual test failures
- **Fix:** Created `components/SourceBadge.tsx` stub that exports SourceBadge throwing "not yet implemented"; all 5 render() calls fail with this error
- **Files modified:** bigpanda-app/components/SourceBadge.tsx (created)
- **Verification:** `npx vitest run tests/audit/source-badge.test.tsx` shows "5 failed (5)" not "no tests"
- **Committed in:** d53bf1e (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for RED tests to show 5 individual failures per file. No scope creep — stub and test deps are minimal and temporary.

## Issues Encountered
- Vite's jsdom environment (used via `@vitest-environment jsdom` docblock) performs static import resolution at transform time, unlike node environment which resolves at runtime. This required the stub approach for SourceBadge rather than the lazy-import approach used for the audit helper.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 22-02 (Wave 1: lib/audit.ts + SourceBadge implementation) can begin immediately
- Both test contracts are fully defined; implementation must turn all 10 RED tests GREEN
- SourceBadge.tsx stub must be replaced with real implementation in Plan 22-02

## Self-Check: PASSED

- FOUND: bigpanda-app/tests/audit/audit-helper.test.ts
- FOUND: bigpanda-app/tests/audit/source-badge.test.tsx
- FOUND: bigpanda-app/components/SourceBadge.tsx
- FOUND: .planning/phases/22-source-badges-+-audit-log/22-01-SUMMARY.md
- FOUND: commits 163bd99 and d53bf1e

---
*Phase: 22-source-badges-+-audit-log*
*Completed: 2026-03-27*
