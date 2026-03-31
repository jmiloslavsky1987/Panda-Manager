---
phase: 28-interactive-visuals
plan: "01"
subsystem: testing-infrastructure
tags: [wave-0, tdd, red-stubs, package-installation, vitest-mock]
status: complete
completed_at: "2026-03-31T16:49:28Z"

dependencies:
  requires: []
  provides:
    - "@xyflow/react@12.10.2 installed and importable via vitest alias mock"
    - "@dagrejs/dagre@3.0.0 installed and importable in node env"
    - "tests/__mocks__/react-flow.ts mock for DOM APIs"
    - "10 RED test stubs across 4 visual test files"
  affects:
    - bigpanda-app/vitest.config.ts
    - bigpanda-app/tests/visuals/*

tech_stack:
  added:
    - "@xyflow/react@12.10.2 - React Flow graph rendering library"
    - "@dagrejs/dagre@3.0.0 - Dagre layout algorithm for graph auto-positioning"
  patterns:
    - "Vitest alias mocking for DOM-dependent libraries"
    - "Wave 0 RED stub pattern: const target: any = undefined; expect(target).toBeDefined()"

key_files:
  created:
    - bigpanda-app/tests/__mocks__/react-flow.ts: "Mock for @xyflow/react — stubs ResizeObserver and DOM measurement APIs"
    - bigpanda-app/tests/visuals/engagement-graph.test.ts: "3 RED stubs for VIS-01 engagement graph tests"
    - bigpanda-app/tests/visuals/node-detail-drawer.test.ts: "2 RED stubs for VIS-01 drawer tests"
    - bigpanda-app/tests/visuals/arch-graph.test.ts: "3 RED stubs for VIS-02 architecture graph tests"
    - bigpanda-app/tests/visuals/dagre-layout.test.ts: "2 RED stubs for VIS-02 layout tests"
    - bigpanda-app/tests/visuals/package-import.test.ts: "2 GREEN tests verifying package imports"
  modified:
    - bigpanda-app/package.json: "Added @xyflow/react and @dagrejs/dagre dependencies"
    - bigpanda-app/vitest.config.ts: "Added @xyflow/react alias mapping to react-flow mock"

decisions:
  - title: "React Flow requires vitest alias mock"
    rationale: "React Flow uses ResizeObserver and getBoundingClientRect which are unavailable in Node.js test environment. Mock prevents import errors while allowing logic tests to run."
    alternatives: ["jsdom environment (heavy, slower)", "skip React Flow in unit tests"]
    chosen: "Vitest alias mock"

  - title: "Dagre runs natively in Node.js without mocking"
    rationale: "Dagre is pure JavaScript with no DOM dependencies. Can be imported directly in vitest node environment."
    alternatives: ["Mock dagre anyway for consistency"]
    chosen: "No mock needed"

metrics:
  duration_seconds: 481
  tasks_completed: 2
  files_created: 6
  files_modified: 2
  commits: 3
  tests_added: 12
  tests_passing: 2
  tests_red_stubs: 10
---

# Phase 28 Plan 01: Package Installation and Test Infrastructure Summary

**One-liner:** Installed React Flow 12.10.2 and dagre 3.0.0 with vitest DOM mock; scaffolded 10 RED test stubs across 4 visual component test files for VIS-01 and VIS-02.

## Objective

Install React Flow and dagre packages, create the vitest alias mock for @xyflow/react, and scaffold all Wave 0 test stubs as RED failing assertions to enable TDD workflow for subsequent implementation plans.

## Tasks Completed

### Task 1: Install packages and add React Flow vitest alias mock (TDD)

**Status:** Complete ✓
**Commits:** 9504417 (RED), f31573f (GREEN)

**RED Phase:**
- Created `tests/visuals/package-import.test.ts` with 2 failing stubs
- Verified RED state: 2 tests failing

**GREEN Phase:**
- Installed `@xyflow/react@12.10.2` and `@dagrejs/dagre@3.0.0`
- Created `tests/__mocks__/react-flow.ts` with vi.fn() stubs for:
  - ReactFlow, Background, Controls, Handle components
  - useNodesState, useEdgesState hooks
  - applyNodeChanges, applyEdgeChanges functions
  - Position and MarkerType enums
  - Node and Edge type definitions
- Updated `vitest.config.ts` to add alias: `'@xyflow/react': path.resolve(__dirname, 'tests/__mocks__/react-flow.ts')`
- Updated test to import packages and verify functionality
- Verified GREEN state: 2 tests passing

**Verification:**
```bash
cd bigpanda-app && node -e "require('@dagrejs/dagre'); console.log('dagre ok')"
# Output: dagre ok

npm test -- tests/visuals/package-import.test.ts --run
# Output: Test Files 1 passed (1), Tests 2 passed (2)
```

### Task 2: Scaffold Wave 0 RED test stubs for all 4 visual test files (TDD)

**Status:** Complete ✓
**Commit:** 5a6547f (RED only - Wave 0 scaffolding)

**RED Phase:**
- Created `tests/visuals/engagement-graph.test.ts` with 3 RED stubs:
  - Renders node for each team from e2e workflows
  - Renders node for each stakeholder
  - Shows empty state message
- Created `tests/visuals/node-detail-drawer.test.ts` with 2 RED stubs:
  - Renders node label, type, and data fields
  - Calls onClose when X button clicked
- Created `tests/visuals/arch-graph.test.ts` with 3 RED stubs:
  - Includes BigPanda center node
  - Renders one node per architecture integration
  - Opens drawer when integration node clicked
- Created `tests/visuals/dagre-layout.test.ts` with 2 RED stubs:
  - Returns nodes with numeric x,y positions
  - Returns all input nodes (no drops)
- Verified RED state: 10 tests failing across 4 files

**Note:** No GREEN phase for this task - Wave 0 scaffolding is meant to stay RED. Actual implementation happens in plans 28-02 through 28-05.

**Verification:**
```bash
npm test -- tests/visuals/ --run 2>&1 | grep "Test Files"
# Output: Test Files  4 failed | 1 passed (5)
# Output: Tests  10 failed | 2 passed (12)
```

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Success Criteria Met

- [x] @xyflow/react@12.10.2 and @dagrejs/dagre@3.0.0 appear in package.json dependencies
- [x] `tests/__mocks__/react-flow.ts` exists with vi.fn() stubs
- [x] vitest.config.ts alias block includes `@xyflow/react` mapping
- [x] `npm test -- tests/visuals/ --run` shows 10 tests FAILING (RED baseline confirmed)
- [x] Package import test passes (2 tests GREEN verifying packages work)
- [x] Full test suite is stable (no regression from alias or install)

## Testing

**Test Coverage:**
- Package imports: 2 tests GREEN (verify packages installed and importable)
- Visual components: 10 tests RED (Wave 0 stubs ready for implementation)

**Test Files:**
- `tests/visuals/package-import.test.ts` - GREEN (2/2 passing)
- `tests/visuals/engagement-graph.test.ts` - RED (0/3 passing)
- `tests/visuals/node-detail-drawer.test.ts` - RED (0/2 passing)
- `tests/visuals/arch-graph.test.ts` - RED (0/3 passing)
- `tests/visuals/dagre-layout.test.ts` - RED (0/2 passing)

## Next Steps

Wave 0 test infrastructure is complete. Ready to proceed with implementation plans:
- **28-02-PLAN.md**: Implement engagement graph visualization (VIS-01)
- **28-03-PLAN.md**: Implement node detail drawer (VIS-01)
- **28-04-PLAN.md**: Implement architecture graph visualization (VIS-02)
- **28-05-PLAN.md**: Implement dagre layout helper (VIS-02)

Each subsequent plan will turn RED stubs GREEN by implementing the actual components.

## Self-Check

Verifying created files exist:

```bash
# Files created
[ -f "bigpanda-app/tests/__mocks__/react-flow.ts" ] && echo "FOUND: react-flow.ts" || echo "MISSING: react-flow.ts"
# FOUND: react-flow.ts

[ -f "bigpanda-app/tests/visuals/engagement-graph.test.ts" ] && echo "FOUND: engagement-graph.test.ts" || echo "MISSING: engagement-graph.test.ts"
# FOUND: engagement-graph.test.ts

[ -f "bigpanda-app/tests/visuals/node-detail-drawer.test.ts" ] && echo "FOUND: node-detail-drawer.test.ts" || echo "MISSING: node-detail-drawer.test.ts"
# FOUND: node-detail-drawer.test.ts

[ -f "bigpanda-app/tests/visuals/arch-graph.test.ts" ] && echo "FOUND: arch-graph.test.ts" || echo "MISSING: arch-graph.test.ts"
# FOUND: arch-graph.test.ts

[ -f "bigpanda-app/tests/visuals/dagre-layout.test.ts" ] && echo "FOUND: dagre-layout.test.ts" || echo "MISSING: dagre-layout.test.ts"
# FOUND: dagre-layout.test.ts

[ -f "bigpanda-app/tests/visuals/package-import.test.ts" ] && echo "FOUND: package-import.test.ts" || echo "MISSING: package-import.test.ts"
# FOUND: package-import.test.ts
```

Verifying commits exist:

```bash
git log --oneline --all | grep -q "9504417" && echo "FOUND: 9504417" || echo "MISSING: 9504417"
# FOUND: 9504417

git log --oneline --all | grep -q "f31573f" && echo "FOUND: f31573f" || echo "MISSING: f31573f"
# FOUND: f31573f

git log --oneline --all | grep -q "5a6547f" && echo "FOUND: 5a6547f" || echo "MISSING: 5a6547f"
# FOUND: 5a6547f
```

## Self-Check: PASSED

All created files exist. All commits are present in git history.
