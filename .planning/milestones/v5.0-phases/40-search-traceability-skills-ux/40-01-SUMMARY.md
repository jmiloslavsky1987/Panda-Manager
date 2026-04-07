---
phase: 40-search-traceability-skills-ux
plan: 01
subsystem: testing
tags: [tdd, wave-0, nyquist, test-scaffolds]
dependencies:
  requires: []
  provides: [test-contracts-srch-01, test-contracts-srch-02, test-contracts-artf-01, test-contracts-hist-01, test-contracts-skls-01, test-contracts-skls-02]
  affects: [phase-40-wave-1-plans]
tech_stack:
  added: []
  patterns: [vitest-jsdom-environment, next-navigation-mocks, fake-timers, user-event]
key_files:
  created:
    - bigpanda-app/tests/search/global-search.test.tsx
    - bigpanda-app/tests/search/decisions-filter.test.tsx
    - bigpanda-app/tests/artifacts/extracted-entities.test.tsx
    - bigpanda-app/tests/history/audit-log-feed.test.tsx
    - bigpanda-app/tests/skills/job-progress.test.tsx
    - bigpanda-app/tests/skills/job-cancel.test.ts
  modified: []
decisions:
  - "Test directory structure: tests/search/, tests/artifacts/, tests/history/, tests/skills/ (consistent with existing test organization)"
  - "Used vi.useFakeTimers() for debounce and polling tests (matches Phase 37 timer test patterns)"
  - "Mocked next/navigation with standard pattern for all jsdom tests (consistency)"
  - "Job cancel test uses node environment (API route test, no DOM needed)"
  - "computeAuditDiff tested as pure function (testable before HistoryPage exists)"
metrics:
  duration_seconds: 182
  completed_at: "2026-04-07T03:02:35Z"
  test_files_created: 6
  test_cases_created: 27
  commits: 2
---

# Phase 40 Plan 01: Wave 0 Test Scaffolds Summary

**One-liner:** Six failing test scaffolds created for global search, decisions filtering, artifact entities, audit history, and skills progress/cancellation — all RED as expected per Nyquist TDD.

## What Was Done

Created six test files covering all Phase 40 requirements before any implementation work begins. This follows the Nyquist TDD pattern established in Phase 37 — tests written RED first provide concrete pass/fail targets for Wave 1 implementation plans.

### Test Coverage

**SRCH-01 (Global Search Bar):**
- `tests/search/global-search.test.tsx` — 6 test cases
- Covers: render, no-fetch for 1-char queries, debounce behavior (300ms), result grouping by section, navigation on click, Escape key close

**SRCH-02 (Decisions Filter):**
- `tests/search/decisions-filter.test.tsx` — 5 test cases
- Covers: render all without filter, text filter (`q` param), `from` date filter, `to` date filter, combined filters

**ARTF-01 (Extracted Entities):**
- `tests/artifacts/extracted-entities.test.tsx` — 5 test cases
- Covers: two-tab modal (Details + Extracted Entities), entity grouping with counts, navigation links to correct tabs, modal close on link click, all entity types displayed

**HIST-01 (Unified History Feed):**
- `tests/history/audit-log-feed.test.tsx` — 8 test cases
- Covers: `computeAuditDiff` pure function (Created message, changed fields, multiple changes, null handling), HistoryPage feed merge (placeholder tests for integration)

**SKLS-01 (Job Progress):**
- `tests/skills/job-progress.test.tsx` — 6 test cases
- Covers: elapsed timer display, time increment each second, polling auto-stop on completed/failed states

**SKLS-02 (Job Cancellation):**
- `tests/skills/job-cancel.test.ts` — 5 test cases
- Covers: cancel endpoint returns 200 with success, DB update to 'cancelled', queue.remove() call, queue.close() in finally block, error handling

### Test Status

All 6 test files fail RED as expected:
- `tests/search/` — 2 files, both fail on import (GlobalSearchBar, DecisionsTableClient not implemented)
- `tests/artifacts/` — 1 file, fails on import (ArtifactEditModal missing Extracted Entities tab)
- `tests/history/` — 1 file, computeAuditDiff fails on import, HistoryPage placeholder tests fail
- `tests/skills/` — 2 files, fail on import (SkillsTabClient missing timer, cancel route doesn't exist)

**Verification:**
```bash
cd bigpanda-app && npm test -- --run tests/search/ tests/artifacts/ tests/history/ tests/skills/
# Result: Test Files 6 failed (6), Tests 10 failed (10)
```

## Deviations from Plan

None — plan executed exactly as written. All test files created with meaningful assertions that fail because the implementation does not yet exist.

## Technical Notes

### Test Patterns Used

**jsdom Environment:**
- All component tests have `// @vitest-environment jsdom` header
- Required for render(), screen, and user interaction tests

**Next.js Navigation Mocks:**
```typescript
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn(() => null), toString: vi.fn(() => '') }),
}))
```
Standard pattern used across all jsdom tests for consistency.

**Fake Timers:**
- Used `vi.useFakeTimers()` for debounce tests (global-search.test.tsx)
- Used for polling and elapsed timer tests (job-progress.test.tsx)
- Pattern matches Phase 37 timer tests (consistent approach)

**User Events:**
- Used `@testing-library/user-event` for typing and clicks
- `{ delay: null }` setup for tests without timing concerns
- More realistic than `fireEvent` for user interactions

### API Test Pattern (job-cancel.test.ts)

Node environment (no jsdom needed) with mocked dependencies:
- `@/lib/db` — mocked with chainable methods (update().set().where())
- `bullmq` — mocked Queue class with remove() and close() methods
- Imported route handler directly: `POST from @/app/api/skills/runs/[runId]/cancel/route`

This test will fail until the route file is created.

### Pure Function Tests (computeAuditDiff)

Tested `computeAuditDiff` as a standalone pure function before the HistoryPage component exists. This allows:
1. Implementing the diff logic independently
2. Testing edge cases (null values, multiple changes) without DOM complexity
3. Placeholder tests for HistoryPage integration (to be fleshed out during implementation)

## Commits

1. **33a7716** — `test(40-01): add failing tests for global search and decisions filter (SRCH-01, SRCH-02)`
   - Created tests/search/ directory
   - Added global-search.test.tsx (6 tests)
   - Added decisions-filter.test.tsx (5 tests)

2. **66b9916** — `test(40-01): add failing tests for artifacts, history, and skills (ARTF-01, HIST-01, SKLS-01, SKLS-02)`
   - Created tests/artifacts/, tests/history/, tests/skills/ directories
   - Added extracted-entities.test.tsx (5 tests)
   - Added audit-log-feed.test.tsx (8 tests)
   - Added job-progress.test.tsx (6 tests)
   - Added job-cancel.test.ts (5 tests)

## Next Steps (Wave 1)

The following plans can now implement features to make these tests GREEN:

1. **40-02** — Global Search Bar (SRCH-01): Implement GlobalSearchBar component with debounce, result grouping, and navigation
2. **40-03** — Decisions Filter (SRCH-02): Implement DecisionsTableClient with URL param filtering
3. **40-04** — Extracted Entities (ARTF-01): Add Extracted Entities tab to ArtifactEditModal with reverse lookup
4. **40-05** — Audit History Feed (HIST-01): Implement computeAuditDiff and HistoryPage unified feed
5. **40-06** — Skills Progress & Cancel (SKLS-01, SKLS-02): Add elapsed timer to SkillsTabClient and implement cancel route

Each Wave 1 plan should run its relevant test subset to confirm GREEN status before completion.

## Self-Check: PASSED

All 6 test files verified present:
- bigpanda-app/tests/search/global-search.test.tsx ✓
- bigpanda-app/tests/search/decisions-filter.test.tsx ✓
- bigpanda-app/tests/artifacts/extracted-entities.test.tsx ✓
- bigpanda-app/tests/history/audit-log-feed.test.tsx ✓
- bigpanda-app/tests/skills/job-progress.test.tsx ✓
- bigpanda-app/tests/skills/job-cancel.test.ts ✓

All commits verified present:
- 33a7716 (Task 1: search tests) ✓
- 66b9916 (Task 2: artifacts/history/skills tests) ✓
