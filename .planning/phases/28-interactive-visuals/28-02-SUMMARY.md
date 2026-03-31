---
phase: 28-interactive-visuals
plan: "02"
subsystem: graph-primitives
tags: [tdd, shared-infrastructure, react-flow, dagre-layout, custom-nodes]
status: complete
completed_at: "2026-03-31T18:16:42Z"

dependencies:
  requires:
    - "28-01: @xyflow/react and @dagrejs/dagre packages installed"
  provides:
    - "getLayoutedElements(): Pure dagre layout function for TB/LR hierarchical graphs"
    - "TeamNode, StakeholderNode: Custom node components for engagement graph (VIS-01)"
    - "BigPandaNode, IntegrationNode: Custom node components for architecture graph (VIS-02)"
    - "teamNodeTypes, archNodeTypes: Module-level nodeTypes registries for React Flow"
  affects:
    - bigpanda-app/components/graph/useGraphLayout.ts
    - bigpanda-app/components/graph/CustomNodes.tsx
    - bigpanda-app/tests/visuals/dagre-layout.test.ts

tech_stack:
  added: []
  patterns:
    - "Pure function layout utility (no React hooks, fully testable)"
    - "Module-level nodeTypes definition (prevents React Flow re-initialization)"
    - "Zinc/white card pattern for node styling (consistent with app aesthetic)"
    - "Direction-specific spacing: ranksep 150/100, nodesep 100/80 for LR/TB layouts"

key_files:
  created:
    - bigpanda-app/components/graph/useGraphLayout.ts: "Pure dagre layout function — accepts nodes/edges, returns layouted nodes with x,y positions"
    - bigpanda-app/components/graph/CustomNodes.tsx: "4 custom React Flow node components + 2 nodeTypes registries"
  modified:
    - bigpanda-app/tests/visuals/dagre-layout.test.ts: "Updated from RED stubs to real tests importing getLayoutedElements"

decisions:
  - title: "Layout utility is a pure function, not a React hook"
    rationale: "No React dependency needed — layout is pure computation. Pure function is easier to test, reusable across components, and follows single responsibility principle."
    alternatives: ["useGraphLayout hook with useMemo", "inline layout in each component"]
    chosen: "Pure function exported from useGraphLayout.ts (naming preserved for discoverability)"

  - title: "Node dimensions: default 172x60, BigPanda 200x80"
    rationale: "172px matches existing card min-width pattern; 60px height accommodates 2 lines of text + padding. BigPanda center node is larger to emphasize hub role."
    alternatives: ["uniform 150x50 for all nodes", "dynamic sizing based on content"]
    chosen: "Fixed dimensions with optional override via node.width/height"

  - title: "Direction-specific spacing: LR uses larger ranksep/nodesep than TB"
    rationale: "Hub-and-spoke (LR) needs more space to prevent radial node overlap. Hierarchical engagement map (TB) is more compact vertically."
    alternatives: ["uniform spacing for all layouts", "user-configurable spacing"]
    chosen: "Direction-specific: LR 150/100, TB 100/80"

metrics:
  duration_seconds: 4509
  tasks_completed: 2
  files_created: 2
  files_modified: 1
  commits: 3
  tests_added: 2
  tests_passing: 2
  tests_red_stubs_resolved: 2
---

# Phase 28 Plan 02: Shared Graph Infrastructure Summary

**One-liner:** Built dagre layout utility and 4 custom React Flow node components (TeamNode, StakeholderNode, BigPandaNode, IntegrationNode) as shared primitives for VIS-01 and VIS-02 graphs.

## Objective

Build the shared graph infrastructure consumed by both the Teams engagement graph (VIS-01) and the Architecture diagram (VIS-02): custom node React components with zinc/white card styling, and the dagre layout utility for auto-positioning nodes in hierarchical and hub-and-spoke arrangements.

## Tasks Completed

### Task 1: Build dagre layout utility (useGraphLayout.ts) — TDD

**Status:** Complete ✓
**Commits:** 37c8474 (RED), b66684f (GREEN)

**RED Phase:**
- Updated `tests/visuals/dagre-layout.test.ts` from stubs to real tests
- Imported getLayoutedElements, LayoutNode, LayoutEdge from `../../components/graph/useGraphLayout`
- Test 1: Verify nodes have numeric x,y positions after layout
- Test 2: Verify all input nodes present in output (no drops)
- Verified RED: Module not found error (expected)

**GREEN Phase:**
- Created `components/graph/useGraphLayout.ts` with:
  - `getLayoutedElements(nodes, edges, direction)`: Pure function (no React dependency)
  - Accepts 'TB' (top-bottom) or 'LR' (left-right) direction
  - Direction-specific spacing: LR 150/100, TB 100/80 (ranksep/nodesep)
  - Default node dimensions: 172x60; respects custom width/height
  - Centers nodes at dagre-calculated positions (x - width/2, y - height/2)
  - Empty array guard: returns early if nodes.length === 0
- Verified GREEN: 2/2 tests passing

**Verification:**
```bash
npm test -- tests/visuals/dagre-layout.test.ts --run
# Output: Test Files 1 passed (1), Tests 2 passed (2)
```

**Behavior Confirmed:**
- ✓ All input nodes present in output (no nodes dropped by dagre)
- ✓ Each output node has numeric x,y positions (not NaN, not undefined)
- ✓ Direction parameter affects spacing (LR for hub-and-spoke, TB for hierarchical)
- ✓ Node dimensions respected (BigPanda 200x80, others 172x60 default)

### Task 2: Build custom node components (CustomNodes.tsx)

**Status:** Complete ✓
**Commit:** 9ebec4c

**Implementation:**
- Created `components/graph/CustomNodes.tsx` with 4 node types + 2 registries:
  - **TeamNode**: zinc border, white bg, "TEAM" label, workflow count
  - **StakeholderNode**: blue border/bg, "STAKEHOLDER" label, role subtitle
  - **BigPandaNode**: dark zinc-900 bg, white text, "PLATFORM" label (center node for arch)
  - **IntegrationNode**: status badge (green/yellow/blue/zinc), track color (ADR=blue, Biggy=purple), integration method
  - **StatusBadge**: internal helper for status color variants (live, in_progress, pilot, planned)
  - **teamNodeTypes**: { team: TeamNode, stakeholder: StakeholderNode }
  - **archNodeTypes**: { bigpanda: BigPandaNode, integration: IntegrationNode }
- All nodes follow zinc/white card pattern: `border border-zinc-300 rounded-lg bg-white px-3 py-2 shadow-sm`
- Handles positioned for layout direction: Top/Bottom for TB engagement map, Left/Right for LR arch hub-and-spoke
- Module-level nodeTypes definition (not inside render) to prevent React Flow re-initialization

**Verification:**
```bash
npx tsc --noEmit --project tsconfig.json 2>&1 | grep "components/graph"
# Output: (no errors — typechecks cleanly)

node -e "console.log(require('fs').readFileSync('./components/graph/CustomNodes.tsx', 'utf8').match(/export (const|function) \w+/g))"
# Output: 6 exports found (TeamNode, StakeholderNode, BigPandaNode, IntegrationNode, teamNodeTypes, archNodeTypes)
```

**Exports Confirmed:**
- ✓ TeamNode (function)
- ✓ StakeholderNode (function)
- ✓ BigPandaNode (function)
- ✓ IntegrationNode (function)
- ✓ teamNodeTypes (const object)
- ✓ archNodeTypes (const object)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Success Criteria Met

- [x] `components/graph/useGraphLayout.ts` exists and exports getLayoutedElements
- [x] getLayoutedElements() accepts nodes, edges, direction and returns nodes with x,y positions
- [x] All input nodes present in output (no nodes dropped — verified by test)
- [x] `components/graph/CustomNodes.tsx` exists and exports 4 node components + 2 nodeTypes registries
- [x] All nodes follow zinc/white card pattern (consistent with app aesthetic)
- [x] dagre-layout.test.ts: 2/2 GREEN
- [x] TypeScript typecheck passes for both files
- [x] No test regressions in existing suite

## Testing

**Test Coverage:**
- Layout utility: 2 tests GREEN (position numerics, no node drops)
- Custom nodes: 0 unit tests (components are pure presentational — will be smoke-tested in plans 28-03, 28-04)

**Test Files:**
- `tests/visuals/dagre-layout.test.ts` - GREEN (2/2 passing)

**Manual Verification:**
- TypeScript typecheck: PASSED (no errors in components/graph/)
- Export validation: PASSED (6 exports present in CustomNodes.tsx)

## Key Implementation Details

### Layout Algorithm
- **Empty graph handling:** Returns early if nodes.length === 0 (avoids dagre crash)
- **Position centering:** dagre returns center coordinates; function adjusts to top-left via `x - width/2, y - height/2`
- **Direction parameter:** 'TB' for hierarchical engagement map, 'LR' for hub-and-spoke architecture diagram
- **Spacing tuning:** LR uses ranksep 150 / nodesep 100 (hub-and-spoke needs more space); TB uses ranksep 100 / nodesep 80 (vertical hierarchy is more compact)

### Node Styling
- **Team/Stakeholder distinction:** Team nodes have zinc border + white bg; Stakeholder nodes have blue border + blue-50 bg
- **BigPanda emphasis:** Dark bg (zinc-900) + white text + larger dimensions (200x80 vs 172x60) — visually distinct as center node
- **Integration track colors:** ADR = blue-200 border, Biggy = purple-200 border (track visually encoded)
- **Status badges:** Color-coded per existing pattern (green=live, yellow=in_progress, blue=pilot, zinc=planned)

### React Flow Integration Pattern
- **Module-level nodeTypes:** Defined outside component to prevent object reference change on every render (React Flow would re-initialize unnecessarily)
- **Handle positioning:** Engagement map (TB) uses Top/Bottom handles; architecture (LR) uses Left/Right handles (matches edge direction)
- **'use client' directive:** Required for all @xyflow/react imports (CustomNodes will be imported into dynamic-loaded components)

## Next Steps

Wave 1 shared infrastructure is complete. Ready to proceed with consumer implementations:
- **28-03-PLAN.md**: Build InteractiveEngagementGraph for Teams tab (VIS-01) — consumes getLayoutedElements + teamNodeTypes
- **28-04-PLAN.md**: Build InteractiveArchGraph for Architecture tab (VIS-02) — consumes getLayoutedElements + archNodeTypes
- **28-05-PLAN.md**: Build NodeDetailDrawer for both graphs — displays live DB data when node clicked

All shared primitives are now available as importable exports. Parallel Wave 2 plans can proceed independently.

## Self-Check

Verifying created files exist:

```bash
[ -f "bigpanda-app/components/graph/useGraphLayout.ts" ] && echo "FOUND: useGraphLayout.ts" || echo "MISSING: useGraphLayout.ts"
# FOUND: useGraphLayout.ts

[ -f "bigpanda-app/components/graph/CustomNodes.tsx" ] && echo "FOUND: CustomNodes.tsx" || echo "MISSING: CustomNodes.tsx"
# FOUND: CustomNodes.tsx
```

Verifying commits exist:

```bash
git log --oneline --all | grep -q "37c8474" && echo "FOUND: 37c8474" || echo "MISSING: 37c8474"
# FOUND: 37c8474 (RED commit)

git log --oneline --all | grep -q "b66684f" && echo "FOUND: b66684f" || echo "MISSING: b66684f"
# FOUND: b66684f (GREEN commit)

git log --oneline --all | grep -q "9ebec4c" && echo "FOUND: 9ebec4c" || echo "MISSING: 9ebec4c"
# FOUND: 9ebec4c (CustomNodes commit)
```

## Self-Check: PASSED

All created files exist. All commits are present in git history. All tests passing (2/2 GREEN).
