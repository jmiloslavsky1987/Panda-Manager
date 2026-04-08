---
phase: 48-architecture-team-engagement
plan: "03"
subsystem: architecture-visualization
tags: [frontend, architecture-tab, database-integration, dnd, status-management]
requirements: [ARCH-01, ARCH-02, ARCH-03]
dependency_graph:
  requires:
    - 48-01-PLAN.md (arch node API routes)
    - getArchNodes query function
  provides:
    - DB-driven architecture column rendering
    - Status badge cycling UI
    - Column drag-reorder functionality
  affects:
    - InteractiveArchGraph (complete rewrite)
    - Architecture page prop chain
tech_stack:
  added:
    - "@dnd-kit/core" (drag and drop)
    - "@dnd-kit/sortable" (sortable lists)
    - "@radix-ui/react-tooltip" (tooltips)
  patterns:
    - Optimistic UI updates with rollback
    - Local state management for drag operations
    - Status cycle state machine (planned→in_progress→live)
key_files:
  created: []
  modified:
    - bigpanda-app/app/customer/[id]/architecture/page.tsx
    - bigpanda-app/components/arch/WorkflowDiagram.tsx
    - bigpanda-app/components/arch/CurrentFutureStateTab.tsx
    - bigpanda-app/components/arch/InteractiveArchGraph.tsx
    - bigpanda-app/tests/arch/arch-nodes-wiring.test.ts
decisions:
  - "Removed hardcoded ADR_PHASES and BIGGY_PHASES arrays — replaced with DB-driven arch_nodes"
  - "Status badge cycles through 3 states (planned→in_progress→live→planned) via click handler"
  - "Drag handle (⠿) positioned next to column headers for reorder UX"
  - "Notes tooltip uses Radix UI Tooltip with conditional rendering (only if notes present)"
  - "Optimistic updates for both status changes and reorder operations with automatic rollback on failure"
  - "Empty state check now includes archData.nodes.length for more accurate detection"
metrics:
  duration_seconds: 271
  tasks_completed: 2
  files_modified: 5
  tests_passing: 8
  commit_hash: e493a84
  completed_date: "2026-04-08"
---

# Phase 48 Plan 03: Architecture Node Wiring Summary

DB-driven architecture diagram with status badges and column drag-reorder using @dnd-kit

## One-Liner

InteractiveArchGraph now renders columns from arch_nodes DB data with clickable status badges (planned/in_progress/live cycling) and drag-reorder functionality, eliminating hardcoded phase arrays.

## What Was Built

**Task 1: Architecture page + WorkflowDiagram prop chain**
- Architecture page now calls both `getArchTabData` and `getArchNodes` in parallel via Promise.all
- WorkflowDiagram.tsx accepts `tracks` and `nodes` props and forwards them through the component chain
- CurrentFutureStateTab.tsx receives and passes tracks/nodes to InteractiveArchGraph
- Empty state detection updated to include `archData.nodes.length === 0` check

**Task 2: InteractiveArchGraph DB-driven rendering**
- Removed hardcoded `ADR_PHASES` and `BIGGY_PHASES` constant arrays
- TrackPipeline component now accepts `trackData: ArchTrack` and `nodes: ArchNode[]` instead of hardcoded phase strings
- Columns render dynamically from `arch_nodes` table sorted by `display_order`
- Track pills in header derived from `tracks` array with dynamic color assignment

**Status Badge Functionality:**
- Each column header displays a status badge showing current node status
- Badge colors: planned (zinc), in_progress (blue), live (green)
- Click handler cycles status: planned → in_progress → live → planned
- Optimistic UI update with `router.refresh()` and rollback on failure
- PATCH request to `/api/projects/[projectId]/arch-nodes/[nodeId]`

**Notes Tooltip:**
- Column headers wrapped in Radix UI Tooltip component
- Conditional rendering: only shows tooltip if `node.notes` has content
- Displays on hover with dark background and arrow pointer

**Drag-Reorder Functionality:**
- Implemented using @dnd-kit/core and @dnd-kit/sortable
- SortablePhaseColumn wrapper with useSortable hook
- Drag handle (⠿ character) positioned next to column header
- DndContext wraps each TrackPipeline with horizontal list sorting strategy
- Drag-end handler uses arrayMove to reorder nodes optimistically
- PATCH request to `/api/projects/[projectId]/arch-nodes/reorder`
- Rollback to original prop on failure with toast error notification

**Test Updates:**
- Removed RED stub assertions from arch-nodes-wiring.test.ts
- Both tests now pass GREEN validating getArchNodes integration
- Full arch test suite passes (8 tests across 3 files)

## Deviations from Plan

None — plan executed exactly as written. All specified functionality implemented including status badges, tooltips, and drag-reorder.

## Technical Decisions

1. **Optimistic UI Pattern**: Both status updates and reorder operations use optimistic local state updates with automatic rollback on API failure. This provides instant feedback while maintaining data consistency.

2. **Drag Handle Positioning**: Placed drag handle (⠿) as a separate element next to the column rather than making the entire column draggable. This prevents conflicts between card click handlers and drag interactions.

3. **Status Cycle State Machine**: Implemented as a simple object mapping rather than a switch statement for clarity: `{ planned: 'in_progress', in_progress: 'live', live: 'planned' }`.

4. **Console Column Special Case**: Console columns identified by `node.name === 'Console'` to preserve special rendering with panda/robot icons. ConsoleNode component still uses track.name for ADR vs Biggy detection.

5. **Sensors Configuration**: Used PointerSensor with 8px activation constraint to prevent accidental drags during scrolling. This provides better UX on horizontally scrollable diagrams.

6. **Track Pills Dynamic Colors**: Track pill colors assigned by checking if `track.name.includes('ADR')` or `track.name.includes('Biggy')` rather than hardcoding by index. This maintains flexibility if track names change.

## Key Files

**Modified:**
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/app/customer/[id]/architecture/page.tsx` — Added getArchNodes fetch, passes tracks/nodes props
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/components/arch/WorkflowDiagram.tsx` — Accepts and forwards tracks/nodes props
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/components/arch/CurrentFutureStateTab.tsx` — Passes tracks/nodes to InteractiveArchGraph
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/components/arch/InteractiveArchGraph.tsx` — Complete rewrite: DB-driven columns, status badges, drag-reorder
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/tests/arch/arch-nodes-wiring.test.ts` — Removed RED stubs, tests now pass GREEN

## Requirements Satisfied

- **ARCH-01**: Architecture diagram now renders from arch_nodes DB data (two-tab design with wired data)
- **ARCH-02**: Status badges visible per column with click-to-cycle functionality (planned/in_progress/live)
- **ARCH-03**: TeamOnboardingTable rendering unchanged — no modifications to team engagement display

## Verification Results

**TypeScript Compilation:**
- No new TypeScript errors introduced
- Pre-existing errors in wbs/page.tsx and audit tests remain (out of scope)

**Test Suite:**
- arch-nodes-wiring.test.ts: 2/2 tests passing ✓
- Full arch test suite: 8/8 tests passing ✓
- Tests validate getArchNodes integration and schema fields

**Functionality Verified:**
- Columns render from DB-driven arch_nodes data
- Status badges display with correct colors per status
- Drag handles visible on column headers
- Integration cards and ConsoleNode unchanged
- TeamOnboardingTable unaffected (ARCH-03 requirement)

## Performance Notes

- Optimistic updates provide instant feedback (no loading states needed)
- Local state management (`localNodes`) prevents unnecessary re-fetches
- `router.refresh()` called only after successful API responses
- DndContext sensors configured with 8px activation constraint to prevent scroll conflicts

## Dependencies

**Requires (from Phase 48 Plan 01):**
- `/api/projects/[projectId]/arch-nodes/[nodeId]` (PATCH for status updates)
- `/api/projects/[projectId]/arch-nodes/reorder` (PATCH for display_order changes)
- `getArchNodes(projectId)` query function from lib/queries.ts

**Provides:**
- Complete DB-driven architecture visualization
- User-editable status indicators per node
- User-controlled column ordering within tracks

**Affects:**
- Architecture tab UX now fully dynamic (no hardcoded content)
- Project-specific architecture configurations possible via DB seeding
- Future track/node additions supported without code changes

## Self-Check: PASSED

**Files created:** None (all modifications)

**Files modified (verified present):**
- FOUND: bigpanda-app/app/customer/[id]/architecture/page.tsx
- FOUND: bigpanda-app/components/arch/WorkflowDiagram.tsx
- FOUND: bigpanda-app/components/arch/CurrentFutureStateTab.tsx
- FOUND: bigpanda-app/components/arch/InteractiveArchGraph.tsx
- FOUND: bigpanda-app/tests/arch/arch-nodes-wiring.test.ts

**Commits verified:**
- FOUND: e493a84 (feat(48-03): wire arch_nodes DB data into InteractiveArchGraph)

All claimed work verified present on disk and in git history.
