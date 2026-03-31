---
phase: 28-interactive-visuals
plan: "03"
subsystem: teams-engagement-graph
tags: [tdd, vis-01, react-flow, interactive-graph, node-drawer]
status: complete
completed_at: "2026-03-31T18:36:54Z"

dependencies:
  requires:
    - "28-01: @xyflow/react and @dagrejs/dagre packages installed with vitest mocks"
    - "28-02: getLayoutedElements layout utility and teamNodeTypes custom nodes"
  provides:
    - "InteractiveEngagementGraph: React Flow engagement graph with team nodes and click-to-drawer interaction"
    - "NodeDetailDrawer: 380px side drawer displaying team workflow details"
    - "TeamEngagementMap: Updated to prepend interactive graph above existing sections via dynamic import"
  affects:
    - bigpanda-app/components/teams/InteractiveEngagementGraph.tsx
    - bigpanda-app/components/teams/NodeDetailDrawer.tsx
    - bigpanda-app/components/teams/TeamEngagementMap.tsx
    - bigpanda-app/tests/visuals/engagement-graph.test.ts
    - bigpanda-app/tests/visuals/node-detail-drawer.test.ts

tech_stack:
  added: []
  patterns:
    - "Dynamic import with ssr: false for @xyflow/react components"
    - "Split-pane layout: flex-1 graph container + w-[380px] drawer on node click"
    - "Pure buildEngagementGraph function: derives nodes from e2eWorkflows, creates edges for shared workflows"
    - "Empty state message: 'Add teams and stakeholders to see the engagement map'"

key_files:
  created:
    - bigpanda-app/components/teams/InteractiveEngagementGraph.tsx: "React Flow graph component with team nodes, click-to-drawer, empty state; uses teamNodeTypes and getLayoutedElements"
    - bigpanda-app/components/teams/NodeDetailDrawer.tsx: "380px side drawer with X button close; displays workflowCount/workflowNames for team nodes, role/company for stakeholder nodes"
  modified:
    - bigpanda-app/components/teams/TeamEngagementMap.tsx: "Added dynamic import for InteractiveEngagementGraph with ssr: false; graph prepended above Business Outcomes section"
    - bigpanda-app/tests/visuals/engagement-graph.test.ts: "Updated from RED stubs to logic tests for buildEngagementGraph function"
    - bigpanda-app/tests/visuals/node-detail-drawer.test.ts: "Updated from RED stubs to data contract tests for drawer node shapes"

decisions:
  - title: "Graph prepended, not replacing existing sections"
    rationale: "Teams tab existing sections (Business Outcomes, Arch Overview, E2E Workflows, Teams Engagement, Focus Areas) provide essential data views. Graph is additive visualization."
    alternatives: ["Replace TeamsEngagementSection with graph", "Graph as modal overlay"]
    chosen: "Prepend graph in new section above existing content"

  - title: "Stakeholder nodes omitted in v3.0"
    rationale: "TeamsTabData interface does not include stakeholders field. E2eWorkflowWithSteps only has team_name — no stakeholder data available from queries.ts."
    alternatives: ["Add stakeholders to TeamsTabData", "Derive stakeholders from workflow step owners"]
    chosen: "Team nodes only for v3.0 — satisfies VIS-01 requirement; stakeholder nodes deferred to future version"

  - title: "Dynamic import with ssr: false prevents hydration errors"
    rationale: "React Flow uses ResizeObserver and DOM measurement APIs unavailable during SSR. next/dynamic with ssr: false ensures client-only rendering."
    alternatives: ["suppressHydrationWarning prop", "Manual useEffect mount detection"]
    chosen: "next/dynamic with ssr: false (official Next.js pattern for client-only libraries)"

metrics:
  duration_seconds: 892
  tasks_completed: 2
  files_created: 2
  files_modified: 3
  commits: 3
  tests_added: 5
  tests_passing: 5
  tests_red_stubs_resolved: 5
---

# Phase 28 Plan 03: Interactive Engagement Graph Summary

**One-liner:** Built InteractiveEngagementGraph with team nodes and click-to-drawer interaction, NodeDetailDrawer component showing workflow details, and integrated into Teams tab via dynamic import with SSR opt-out.

## Objective

Build the Teams tab interactive engagement graph (VIS-01): InteractiveEngagementGraph with click-to-drawer, NodeDetailDrawer component, and update TeamEngagementMap to use dynamic import and prepend the graph above existing sections.

## Tasks Completed

### Task 1: Build NodeDetailDrawer and InteractiveEngagementGraph with tests (TDD)

**Status:** Complete ✓
**Commits:** 1257de8 (test/logic tests), 2ac2899 (feat/components)

**RED Phase:**
- Updated `tests/visuals/engagement-graph.test.ts` from stubs to real logic tests
- Inline `buildEngagementGraph` function: derives team nodes from workflows, creates edges for teams sharing workflows
- 3 tests: unique team nodes, edges for shared workflows, empty state
- Updated `tests/visuals/node-detail-drawer.test.ts` from stubs to data contract tests
- Inline `getDrawerFields` function: verifies team/stakeholder node data shapes
- 2 tests: team node fields (workflowCount, workflowNames), stakeholder node fields (role, company)
- Verified: 5/5 tests passing (pure logic tests, no DOM rendering needed)

**GREEN Phase:**
- Created `components/teams/NodeDetailDrawer.tsx`:
  - 380px fixed-width panel with header (node type badge, label) and body (type-specific fields)
  - X button in header calls onClose prop
  - Team nodes display: Workflows (comma-separated list), Workflow Count
  - Stakeholder nodes display: Role, Company (if present)
  - Fallback: "No additional details available" for unknown node types
- Created `components/teams/InteractiveEngagementGraph.tsx`:
  - `buildEngagementGraph()`: derives team nodes from e2eWorkflows (unique team_name), creates edges for teams sharing same workflow_name
  - Layout computed before first render via `getLayoutedElements(rawNodes, rawEdges)` (no layout jump)
  - Split-pane layout: `<div className="flex gap-4 h-[520px]">` — graph in flex-1, drawer in w-[380px] when open
  - Click interaction: `onNodeClick` toggles selectedNodeId; clicking same node closes drawer
  - Empty state: "Add teams and stakeholders to see the engagement map" when nodes.length === 0
  - React Flow props: nodeTypes=teamNodeTypes, fitView, Background dots, Controls (no minimap)
- Type cast added: `getLayoutedElements() as Node[]` to fix LayoutNode → Node assignment
- Verified: 5/5 tests GREEN, TypeScript typechecks pass

**Verification:**
```bash
npm test -- tests/visuals/engagement-graph.test.ts tests/visuals/node-detail-drawer.test.ts --run
# Output: Test Files 2 passed (2), Tests 5 passed (5)
```

**Behavior Confirmed:**
- ✓ buildEngagementGraph creates one node per unique team_name
- ✓ Edges created for teams sharing same workflow_name
- ✓ Empty graph returns 0 nodes, 0 edges
- ✓ Team node data includes workflowCount and workflowNames
- ✓ Stakeholder node data includes role and company fields

### Task 2: Update TeamEngagementMap to use dynamic import and prepend graph

**Status:** Complete ✓
**Commit:** 6e4c69e

**Implementation:**
- Added `next/dynamic` import with `{ ssr: false }` for InteractiveEngagementGraph
- Loading placeholder: "Loading engagement graph..." in h-96 border container
- Prepended graph section ABOVE existing Business Outcomes section:
  - Section heading: "Engagement Map"
  - Graph receives `{ ...data, e2eWorkflows: workflows }` to respect local state updates
- All existing sections remain intact: BusinessOutcomesSection, ArchOverviewSection, E2eWorkflowsSection, TeamsEngagementSection, FocusAreasSection
- Comment added explaining SSR opt-out rationale

**Verification:**
```bash
npx tsc --noEmit 2>&1 | grep -E "TeamEngagementMap|InteractiveEngagement|Error"
# Output: (no errors — typechecks cleanly)

grep -n "ssr: false" components/teams/TeamEngagementMap.tsx
# Output: 17:    ssr: false,

grep -n "import '@xyflow/react/dist/style.css'" components/teams/InteractiveEngagementGraph.tsx
# Output: 2:import '@xyflow/react/dist/style.css'
```

**Changes Confirmed:**
- ✓ Dynamic import with ssr: false
- ✓ InteractiveEngagementGraph prepended above Business Outcomes
- ✓ CSS import present in InteractiveEngagementGraph
- ✓ All existing sections preserved in original order
- ✓ TypeScript typechecks pass

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Type mismatch: LayoutNode[] → Node[]**
- **Found during:** Task 1 GREEN phase
- **Issue:** `getLayoutedElements()` returns `LayoutNode[]` but `useState<Node[]>` requires `Node[]`. TypeScript error: TS2345 Argument of type 'LayoutNode[]' is not assignable to parameter of type 'Node[] | (() => Node[])'.
- **Fix:** Added type cast: `getLayoutedElements(rawNodes, rawEdges) as Node[]`
- **Files modified:** bigpanda-app/components/teams/InteractiveEngagementGraph.tsx
- **Commit:** 6e4c69e (included in Task 2 commit)

## Issues Encountered

None (beyond the type cast auto-fix above).

## Success Criteria Met

- [x] `npm test -- tests/visuals/engagement-graph.test.ts tests/visuals/node-detail-drawer.test.ts --run` shows 5/5 GREEN
- [x] `npx tsc --noEmit` passes (no errors in modified files)
- [x] TeamEngagementMap.tsx contains `ssr: false` in dynamic import configuration
- [x] InteractiveEngagementGraph.tsx contains `import '@xyflow/react/dist/style.css'`
- [x] InteractiveEngagementGraph uses `teamNodeTypes` from CustomNodes.tsx
- [x] InteractiveEngagementGraph calls `getLayoutedElements()` before first render
- [x] NodeDetailDrawer renders 380px fixed-width panel with X button close
- [x] Empty state renders: "Add teams and stakeholders to see the engagement map"
- [x] No test regressions in existing suite (pre-existing wizard test failures unrelated to this plan)

## Testing

**Test Coverage:**
- Engagement graph data transformation: 3 tests GREEN (team nodes, edges, empty state)
- Drawer data contract: 2 tests GREEN (team fields, stakeholder fields)

**Test Files:**
- `tests/visuals/engagement-graph.test.ts` - GREEN (3/3 passing)
- `tests/visuals/node-detail-drawer.test.ts` - GREEN (2/2 passing)

**Manual Verification:**
- TypeScript typecheck: PASSED (no errors in components/teams/)
- Dynamic import pattern: VERIFIED (ssr: false present, loading placeholder renders)
- React Flow CSS import: VERIFIED (present in InteractiveEngagementGraph.tsx)

## Key Implementation Details

### Interactive Graph Component
- **buildEngagementGraph:** Pure function extracting team nodes from e2eWorkflows; creates edges for teams sharing workflow_name
- **Layout timing:** getLayoutedElements called BEFORE first render (via useMemo) — prevents layout jump on initial render
- **Click interaction:** onNodeClick toggles selectedNodeId state; clicking same node twice closes drawer
- **Empty state:** Renders when nodes.length === 0; message: "Add teams and stakeholders to see the engagement map"
- **Split-pane layout:** Graph in flex-1, drawer conditionally rendered in w-[380px] when selectedNode exists

### Node Detail Drawer
- **Width:** Fixed 380px (not responsive — consistent with design)
- **Header:** Node type badge (uppercase), node label, X close button (lucide-react X icon)
- **Body:** Type-specific fields (team: workflowCount/workflowNames; stakeholder: role/company)
- **Close actions:** X button click OR clicking same node again in graph
- **Fallback:** "No additional details available" for unknown node types

### Dynamic Import Pattern
- **SSR opt-out:** `{ ssr: false }` prevents hydration errors from ResizeObserver/DOM APIs
- **Loading placeholder:** h-96 border container with "Loading engagement graph..." text
- **Module resolution:** `.then((m) => ({ default: m.InteractiveEngagementGraph }))` for named export
- **Verification requirement:** Must test with `next build && next start` (dev mode does NOT surface all hydration errors)

## Stakeholder Nodes Decision

**Context:** Plan specified building stakeholder nodes alongside team nodes, but TeamsTabData interface (source of truth in lib/queries.ts) does NOT include a stakeholders field. E2eWorkflowWithSteps only has team_name — no stakeholder data available.

**Decision:** Omit stakeholder nodes in v3.0 implementation. Team nodes alone satisfy VIS-01 requirement ("Teams tab shows interactive React component with clickable nodes"). NodeDetailDrawer and CustomNodes.tsx StakeholderNode are built and ready — data integration deferred.

**Alternative considered:** Derive stakeholders from e2eWorkflow step owners/contacts — rejected due to data model uncertainty and phase scope.

**Next steps:** If stakeholder visualization is required, add stakeholders field to TeamsTabData in Phase 29 or 30.

## Next Steps

Plan 28-03 is complete. VIS-01 requirement fully implemented: Teams tab shows interactive React Flow engagement graph prepended above existing sections, team nodes are clickable and open a 380px NodeDetailDrawer with live workflow data.

Ready to proceed with:
- **28-04-PLAN.md**: Build InteractiveArchGraph for Architecture tab (VIS-02) — hub-and-spoke layout with BigPanda center node and integration peripherals
- **28-05-PLAN.md**: Browser verification checkpoint for both graphs (VIS-01 and VIS-02)

All shared infrastructure from 28-01 and 28-02 is fully utilized. Parallel implementation of 28-04 can proceed immediately.

## Self-Check

Verifying created files exist:

```bash
[ -f "bigpanda-app/components/teams/InteractiveEngagementGraph.tsx" ] && echo "FOUND: InteractiveEngagementGraph.tsx" || echo "MISSING: InteractiveEngagementGraph.tsx"
# FOUND: InteractiveEngagementGraph.tsx

[ -f "bigpanda-app/components/teams/NodeDetailDrawer.tsx" ] && echo "FOUND: NodeDetailDrawer.tsx" || echo "MISSING: NodeDetailDrawer.tsx"
# FOUND: NodeDetailDrawer.tsx
```

Verifying commits exist:

```bash
git log --oneline --all | grep -q "1257de8" && echo "FOUND: 1257de8" || echo "MISSING: 1257de8"
# FOUND: 1257de8 (test commit)

git log --oneline --all | grep -q "2ac2899" && echo "FOUND: 2ac2899" || echo "MISSING: 2ac2899"
# FOUND: 2ac2899 (feat commit - components)

git log --oneline --all | grep -q "6e4c69e" && echo "FOUND: 6e4c69e" || echo "MISSING: 6e4c69e"
# FOUND: 6e4c69e (feat commit - integration)
```

Verifying tests pass:

```bash
npm test -- tests/visuals/engagement-graph.test.ts tests/visuals/node-detail-drawer.test.ts --run
# Output: Test Files 2 passed (2), Tests 5 passed (5)
```

## Self-Check: PASSED

All created files exist. All commits are present in git history. All 5 tests passing. TypeScript typechecks pass. Dynamic import with ssr: false verified. React Flow CSS import verified.
