---
phase: 34-overview-tab-metrics-health-dashboard
plan: 01
subsystem: testing-infrastructure
tags: [test-setup, tdd, recharts, wave-0]
completed: 2026-04-03T04:42:26Z
duration: 145s
executor_model: sonnet

dependencies:
  requires: []
  provides:
    - recharts-vitest-mock
    - phase-34-test-stubs
  affects:
    - bigpanda-app/tests/overview/
    - bigpanda-app/tests/api/

tech_stack:
  added:
    - recharts: 3.8.1
    - react-is: 19.x
  patterns:
    - wave-0-stub-pattern
    - tdd-red-phase
    - vitest-alias-mocking

key_files:
  created:
    - bigpanda-app/tests/__mocks__/recharts.ts
    - bigpanda-app/tests/overview/metrics-health.test.ts
    - bigpanda-app/tests/api/overview-metrics.test.ts
    - bigpanda-app/tests/overview/timeline-replacement.test.ts
  modified:
    - bigpanda-app/package.json
    - bigpanda-app/vitest.config.ts

decisions:
  - recharts-3.8.1-installed: Recharts chosen for Phase 34 metrics visualization
  - vitest-alias-mock-pattern: Mock all Recharts components to prevent ResizeObserver errors in node test environment
  - wave-0-stub-all-requirements: Created 19 RED test stubs covering METR-01, HLTH-01, TMLN-01, and health-formula
  - responsive-container-pass-through: ResponsiveContainer mock passes children through (wraps chart components)

metrics:
  tasks_completed: 2
  commits: 2
  test_files_created: 3
  test_stubs_created: 19
  recharts_components_mocked: 12
---

# Phase 34 Plan 01: Test Infrastructure and RED Stubs

**One-liner:** Recharts 3.8.1 installed with Vitest mock, 19 failing RED test stubs created for METR-01/HLTH-01/TMLN-01 requirements

## Objective

Establish the test contract for Phase 34 by installing Recharts, creating a Vitest-compatible mock, and writing failing RED test stubs for all metrics and health dashboard requirements.

## Tasks Completed

### Task 1: Install Recharts and add vitest alias (Commit: a0eeb7a)

**Files:**
- bigpanda-app/package.json
- bigpanda-app/package-lock.json
- bigpanda-app/vitest.config.ts
- bigpanda-app/tests/__mocks__/recharts.ts

**Implementation:**
- Installed `recharts@3.8.1` and `react-is` peer dependency via npm
- Created `tests/__mocks__/recharts.ts` with 12 component stubs (BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ComposedChart)
- Added recharts alias to vitest.config.ts test section
- Mock prevents ResizeObserver and getBoundingClientRect errors in node test environment
- ResponsiveContainer passes children through (renders as `children as any`) since it wraps other chart components

**Verification:**
- `node -e "require('./node_modules/recharts/package.json')"` confirmed installation
- vitest.config.ts alias block includes recharts mapping

### Task 2: Write RED test stubs for METR-01, HLTH-01, TMLN-01 (Commit: b895e10)

**Files:**
- bigpanda-app/tests/overview/metrics-health.test.ts (14 stubs)
- bigpanda-app/tests/api/overview-metrics.test.ts (5 stubs)
- bigpanda-app/tests/overview/timeline-replacement.test.ts (1 stub)

**Implementation:**
- Applied Wave 0 stub pattern: `const x: any = undefined; expect(x).toBeDefined()`
- metrics-health.test.ts covers:
  - METR-01: OverviewMetrics component (3 tests for progress rings, risk donut, hours bar chart)
  - HLTH-01: HealthDashboard component (3 tests for overall badge, per-track badges, blocker count)
  - health-formula: computeOverallHealth logic (5 tests for red/yellow/green health states)
  - TMLN-01: MilestoneTimeline component (2 tests for rendering and positioning)
- overview-metrics.test.ts covers:
  - API aggregation endpoint (5 tests for stepCounts, riskCounts, integrationCounts, milestoneOnTrack, error handling)
- timeline-replacement.test.ts covers:
  - TMLN-01 old section removal (1 test verifying old inline HTML pattern is gone)

**Verification:**
- All 19 tests fail RED with "expected undefined to be defined" error
- Full test suite run confirms zero regressions (7 failed test files with 31 failures are pre-existing in scheduler-map, ingestion, wizard)
- No previously passing tests broken

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria

- [x] Recharts in package.json dependencies
- [x] vitest.config.ts has recharts alias
- [x] 3 new test files exist with failing RED stubs covering METR-01, HLTH-01, TMLN-01
- [x] Recharts mock stubs all 12 components used in Phase 34
- [x] Zero test regressions in existing suite

## Test Results

**New test files (all RED as expected):**
- tests/overview/metrics-health.test.ts: 14 failures
- tests/api/overview-metrics.test.ts: 5 failures
- tests/overview/timeline-replacement.test.ts: 1 failure

**Total:** 19 RED failures

**Full test suite baseline:**
- Test Files: 7 failed | 85 passed | 13 skipped (105)
- Tests: 31 failed | 419 passed | 67 todo (517)
- Pre-existing failures in: scheduler-map, ingestion, wizard (unrelated to Phase 34 changes)

## Next Steps

Plan 34-02 will:
1. Create the aggregation API endpoint `/api/projects/[projectId]/overview-metrics`
2. Implement server-side queries for stepCounts, riskCounts, integrationCounts, milestoneOnTrack
3. Apply GREEN phase to API test stubs (5 tests in overview-metrics.test.ts)

## Commits

- a0eeb7a: chore(34-01): install Recharts and add vitest alias
- b895e10: test(34-01): add failing RED test stubs for METR-01, HLTH-01, TMLN-01

## Self-Check: PASSED

**Files exist:**
- [x] bigpanda-app/tests/__mocks__/recharts.ts
- [x] bigpanda-app/tests/overview/metrics-health.test.ts
- [x] bigpanda-app/tests/api/overview-metrics.test.ts
- [x] bigpanda-app/tests/overview/timeline-replacement.test.ts

**Commits exist:**
- [x] a0eeb7a (Task 1: Recharts install and vitest alias)
- [x] b895e10 (Task 2: RED test stubs)

**Verification:**
```bash
# Files
ls -l bigpanda-app/tests/__mocks__/recharts.ts
ls -l bigpanda-app/tests/overview/metrics-health.test.ts
ls -l bigpanda-app/tests/api/overview-metrics.test.ts
ls -l bigpanda-app/tests/overview/timeline-replacement.test.ts

# Commits
git log --oneline --all | grep -E 'a0eeb7a|b895e10'
```
