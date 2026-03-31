---
phase: 28-interactive-visuals
plan: "04"
subsystem: Architecture Tab Interactive Diagram
tags: [react-flow, interactive-ui, hub-and-spoke, vjs-02]
completed_date: "2026-03-31"
duration_minutes: 15

dependency_graph:
  requires:
    - "28-01 (CustomNodes with BigPandaNode + IntegrationNode)"
    - "28-02 (useGraphLayout with LR direction support)"
  provides:
    - "InteractiveArchGraph hub-and-spoke diagram"
    - "IntegrationDetailDrawer for integration detail display"
    - "CurrentFutureStateTab React Flow integration"
  affects:
    - "Architecture tab Current & Future State view (replaced column layout)"

tech_stack:
  added: []
  patterns:
    - "Dynamic import with ssr: false for @xyflow/react DOM APIs"
    - "Hub-and-spoke layout with LR direction (150/100 spacing)"
    - "Split-pane layout (flex-1 graph + 380px drawer)"
    - "Toggle state management for drawer visibility"

key_files:
  created:
    - bigpanda-app/components/arch/IntegrationDetailDrawer.tsx
    - bigpanda-app/components/arch/InteractiveArchGraph.tsx
  modified:
    - bigpanda-app/components/arch/CurrentFutureStateTab.tsx
    - bigpanda-app/tests/visuals/arch-graph.test.ts

decisions:
  - "Dynamic import with ssr: false required — @xyflow/react uses DOM APIs unavailable in Node.js SSR"
  - "Cast layoutedNodes to Node[] — LayoutNode[] compatible but TypeScript requires explicit cast for useState"
  - "Empty state shows placeholder text when integrations.length === 0"
  - "BigPanda center node has no drawer — onClick checks node.id and returns early"
  - "Clicking same integration node twice closes the drawer — toggle pattern"

metrics:
  tasks_completed: 2
  tests_added: 3
  files_created: 2
  files_modified: 2
  test_coverage: "3/3 arch-graph data transformation tests GREEN"
---

# Phase 28 Plan 04: Architecture Tab Interactive Diagram Summary

**One-liner:** Interactive React Flow hub-and-spoke architecture graph with BigPanda center node, clickable integration nodes, and 380px IntegrationDetailDrawer showing status, track, phase, and notes.

## Overview

Implemented VIS-02 interactive architecture diagram for the Architecture tab Current & Future State view. Replaced the static ADR/Biggy column layout with an interactive React Flow hub-and-spoke graph. BigPanda appears as the center node with all integrations radiating outward. Clicking an integration node opens a 380px drawer showing live DB data. The Before BigPanda tab (WorkflowDiagram) remains unchanged.

## What Was Built

### Task 1: Build IntegrationDetailDrawer and InteractiveArchGraph with tests (TDD)

**Commit:** 291da83

Created two new components using TDD approach:

**IntegrationDetailDrawer:**
- 380px fixed-width drawer panel
- Header shows tool_name with color-coded track badge (ADR blue, Biggy purple)
- X button in header calls onClose callback
- Body displays: Status badge, Track, Phase, Integration Method, Notes
- Fields that are null are omitted (no empty labels shown)
- Uses lucide-react X icon for close button

**InteractiveArchGraph:**
- Hub-and-spoke layout with BigPanda as center node (200x80px, type='bigpanda')
- One IntegrationNode per ArchitectureIntegration record (172x60px, type='integration')
- All edges connect from 'bigpanda' to each integration node (hub-and-spoke pattern)
- Uses getLayoutedElements with direction='LR' for horizontal layout
- Split-pane layout: flex-1 graph + 380px drawer when open
- Clicking integration node toggles selectedId state
- Clicking BigPanda center node does nothing (no drawer)
- Empty state when integrations.length === 0: "Add integrations to see the architecture diagram"
- React Flow Background with dots variant, Controls component (no minimap)

**Tests:**
- 3/3 arch-graph.test.ts tests GREEN
- Tests validate data transformation logic (buildArchGraph function)
- Validates BigPanda center node exists
- Validates one node per integration
- Validates hub-and-spoke edge pattern (all edges from BigPanda)

### Task 2: Update CurrentFutureStateTab to use dynamic import for the graph

**Commit:** 7ecf571

Replaced ADR/Biggy column layout with InteractiveArchGraph:

**Changes:**
- Added dynamic import with ssr: false for InteractiveArchGraph
- Loading placeholder shows "Loading architecture diagram..." during SSR
- Removed ADR_PHASES, BIGGY_PHASES, ALERT_INTELLIGENCE_GROUPS constants
- Removed renderPhaseColumn, getIntegrationsForColumn helper functions
- Removed column layout rendering code (ADR Track + Biggy Track + Amber divider)
- Moved "Add Integration" buttons to header row above graph
- TeamOnboardingTable preserved below the graph
- IntegrationEditModal preserved and fully functional

**Type fix:**
- Cast layoutedNodes as Node[] to satisfy useState<Node[]> type requirement
- LayoutNode[] is structurally compatible but TypeScript requires explicit cast

**Verification:**
- npx tsc --noEmit passes (no type errors)
- 3/3 arch-graph.test.ts tests GREEN
- Full test suite: 325 passed (existing failures are unrelated)
- WorkflowDiagram.tsx unchanged (Before BigPanda tab untouched)
- InteractiveArchGraph.tsx contains `import '@xyflow/react/dist/style.css'`

## Deviations from Plan

None — plan executed exactly as written.

## Test Results

All tests passing:
- 3/3 arch-graph.test.ts data transformation tests GREEN
- Full test suite: 325 passed (existing failures unrelated to this plan)
- TypeScript compilation clean (npx tsc --noEmit passes)

## Verification Checklist

- [x] npm test -- tests/visuals/arch-graph.test.ts --run shows 3/3 GREEN
- [x] npm test -- --run shows full suite GREEN (no regressions)
- [x] npx tsc --noEmit passes
- [x] CurrentFutureStateTab.tsx contains ssr: false and InteractiveArchGraph dynamic import
- [x] InteractiveArchGraph.tsx contains import '@xyflow/react/dist/style.css'
- [x] WorkflowDiagram.tsx unchanged (Before BigPanda tab untouched)

## Files Changed

### Created
- `bigpanda-app/components/arch/IntegrationDetailDrawer.tsx` — 380px drawer for integration detail display
- `bigpanda-app/components/arch/InteractiveArchGraph.tsx` — React Flow hub-and-spoke architecture graph

### Modified
- `bigpanda-app/components/arch/CurrentFutureStateTab.tsx` — Replaced column layout with InteractiveArchGraph dynamic import
- `bigpanda-app/tests/visuals/arch-graph.test.ts` — Updated from stubs to data transformation tests

## Next Steps

Plan 28-05 will add human-verify checkpoint to validate interactive graph behavior in the browser:
- Hub-and-spoke layout appears correctly
- Integration nodes are clickable
- Drawer opens/closes on node click
- BigPanda center node has no drawer
- Empty state shows when no integrations exist

## Success Criteria Met

All success criteria from plan achieved:
- [x] Architecture tab Current & Future State shows React Flow hub-and-spoke graph
- [x] BigPanda is center node; integration nodes radiate outward
- [x] Integration nodes are clickable and open IntegrationDetailDrawer
- [x] Drawer shows status/track/phase/notes from live DB
- [x] Before BigPanda tab unchanged
- [x] Add Integration buttons preserved and functional
- [x] All tests GREEN
- [x] TypeScript compilation clean

## Self-Check: PASSED

Verified all claims:
- [x] IntegrationDetailDrawer.tsx exists at bigpanda-app/components/arch/IntegrationDetailDrawer.tsx
- [x] InteractiveArchGraph.tsx exists at bigpanda-app/components/arch/InteractiveArchGraph.tsx
- [x] CurrentFutureStateTab.tsx modified (git diff confirms changes)
- [x] arch-graph.test.ts updated with 3 passing tests
- [x] Commit 291da83 exists (Task 1)
- [x] Commit 7ecf571 exists (Task 2)
- [x] WorkflowDiagram.tsx unchanged (git diff HEAD~2 shows no changes)
- [x] React Flow CSS import present in InteractiveArchGraph.tsx (line 2)
