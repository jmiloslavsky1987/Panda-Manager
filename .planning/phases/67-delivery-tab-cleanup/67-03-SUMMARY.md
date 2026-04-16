---
phase: 67-delivery-tab-cleanup
plan: "03"
subsystem: delivery-navigation
tags: [ui-cleanup, wbs-integration, de-duplication]
completed: 2026-04-16T14:41:19Z
requirements:
  - DLVRY-05
  - DLVRY-06

dependency_graph:
  requires: []
  provides:
    - Generate Plan on Task Board with de-duplication
    - WBS tree integration for generated tasks
  affects:
    - WorkspaceTabs (Delivery sub-tabs)
    - Task Board page UX
    - ai-plan-generator skill output schema

tech_stack:
  added: []
  patterns:
    - Case-insensitive substring matching for de-duplication
    - Non-blocking WBS commit pattern (graceful degradation)
    - Server component data passing to client island props

key_files:
  created: []
  modified:
    - bigpanda-app/components/WorkspaceTabs.tsx
    - bigpanda-app/components/AiPlanPanel.tsx
    - bigpanda-app/app/customer/[id]/tasks/page.tsx
    - bigpanda-app/skills/ai-plan-generator.md
  deleted:
    - bigpanda-app/app/customer/[id]/plan/page.tsx
    - bigpanda-app/components/PlanTabs.tsx

decisions: []

metrics:
  duration_seconds: 187
  tasks_completed: 2
  commits: 2
---

# Phase 67 Plan 03: Delivery Tab Cleanup - Generate Plan Migration Summary

**One-liner:** Removed Plan sub-tab from Delivery navigation; migrated AiPlanPanel (Generate Plan) to Task Board with task de-duplication and automatic WBS tree commit

## What Was Built

### Task 1: Remove Plan Tab from Navigation
- Removed `{ id: 'plan', label: 'Plan', segment: 'plan' }` entry from WorkspaceTabs Delivery children array
- Deleted `/app/customer/[id]/plan/page.tsx` route (contained PhaseBoard, SprintSummaryPanel, and AiPlanPanel - only AiPlanPanel migrated)
- Deleted `PlanTabs.tsx` component (Plan-tab-only navigation, no longer needed)
- WBS is now the first sub-tab under Delivery
- Cleared Next.js build cache to remove stale validator.ts references

### Task 2: Migrate AiPlanPanel with Enhancements
**Skill Prompt Update (ai-plan-generator.md):**
- Extended JSON output schema to include `track` ("ADR" | "Biggy") and `wbs_phase` (level-2 WBS parent name) fields
- Preserved all existing prompt instructions and focus areas

**AiPlanPanel Component Enhancements:**
- Added `existingTasks: { title: string }[]` prop to AiPlanPanelProps
- Extended ProposedTask interface with `track?: 'ADR' | 'Biggy'` and `wbs_phase?: string`
- Implemented `isDuplicate()` helper with case-insensitive substring matching (bidirectional: `existing.includes(proposed)` OR `proposed.includes(existing)`)
- Updated `handleGenerate()` to default-select only non-duplicate tasks (duplicates shown but unchecked)
- Enhanced task rendering: duplicates shown greyed-out (`opacity-60`, different border color) with "Already exists" italic badge; description hidden for duplicates
- Extended `handleCommit()` with WBS tree integration:
  - Fetches full WBS tree once before task commit loop
  - After each successful task insert, checks if task has `track` and `wbs_phase`
  - Finds level-2 WBS parent by matching `track` and `wbs_phase` (case-insensitive)
  - If parent found: POSTs level-3 WBS item with task title as name
  - If parent not found: skips WBS insert (does NOT create level-2 items dynamically)
  - WBS fetch and insert failures are non-blocking (wrapped in try/catch, continue on error)
- Changed success toast message from "committed to plan" to "committed to Task Board"

**Task Board Page Integration:**
- Converted `tasks/page.tsx` to render AiPlanPanel above TaskBoard
- Passed `existingTasks={tasks.map(t => ({ title: t.title }))}` from server component to AiPlanPanel client island
- AiPlanPanel is a 'use client' component imported directly (no dynamic import needed)

## Deviations from Plan

### Auto-fixed Issues
**1. [Rule 3 - Blocking Issue] Cleared Next.js build cache**
- **Found during:** Task 1 verification
- **Issue:** After deleting `plan/page.tsx`, TypeScript reported error in `.next/types/validator.ts(188,39): Cannot find module '../../app/customer/[id]/plan/page.js'`
- **Fix:** Ran `rm -rf .next` to clear stale build cache and regenerate types
- **Files modified:** `.next/` directory (deleted and regenerated)
- **Commit:** Included in e4ca004 (Task 1 commit)

No other deviations - plan executed as written.

## Verification Results

### Automated Verification
- **TypeScript compilation:** Clean (only pre-existing test file errors out of scope)
- **Plan tab removal:** Confirmed absent from WorkspaceTabs.tsx Delivery children array
- **File deletions:** Confirmed `plan/page.tsx` and `PlanTabs.tsx` deleted, no import errors
- **AiPlanPanel migration:** Confirmed imported and rendered in `tasks/page.tsx` with `existingTasks` prop
- **Skill schema update:** Confirmed `track` and `wbs_phase` fields present in ai-plan-generator.md output schema
- **WBS commit logic:** Confirmed WBS fetch and POST present in AiPlanPanel handleCommit
- **De-duplication logic:** Confirmed isDuplicate helper and greyed-out rendering for duplicates

### Manual Verification Required
- Visual confirmation: Navigate to Task Board page and verify AiPlanPanel appears above task table
- Functional testing: Click "Generate plan" button, verify proposed tasks appear
- De-duplication testing: Create a task with title "Platform Setup", generate plan, verify any task with "Platform" or "Setup" in title is marked as duplicate
- WBS commit testing: Generate plan, commit tasks with `track` and `wbs_phase`, verify level-3 WBS items created under correct level-2 parents

## Requirements Satisfied

**DLVRY-05: Generate Plan Button on Task Board**
- Plan tab removed from Delivery navigation (WorkspaceTabs.tsx)
- AiPlanPanel (Generate Plan button and proposed task list) migrated to Task Board page above task table
- De-duplication implemented: case-insensitive substring matching against existing tasks
- Duplicate tasks shown greyed-out with "Already exists" badge, unchecked by default

**DLVRY-06: WBS Alignment with Generated Plan**
- ai-plan-generator skill outputs `track` and `wbs_phase` fields per task
- Committed tasks written to both tasks table AND WBS tree as level-3 items
- WBS commit finds level-2 parent by matching `track` and `wbs_phase` (case-insensitive)
- WBS operations are non-blocking (failures don't stop task commits)

## Known Limitations

1. **Level-2 WBS parents must pre-exist:** If a generated task has `wbs_phase` that doesn't match any level-2 WBS item (by name and track), the task is committed to the tasks table but NOT to the WBS tree. The component does not create level-2 WBS items dynamically (per CONTEXT.md Claude's Discretion).

2. **De-duplication is fuzzy, not exact:** The substring matching algorithm may produce false positives (e.g., "Platform" matches "Platform Setup" and "Platform Migration"). This is by design for better coverage, but users can manually re-check false-positive duplicates if needed.

3. **WBS failures are silent:** If WBS tree fetch fails or WBS POST fails, the user only sees the tasks commit success toast. WBS errors are logged to console but not surfaced in UI. This is acceptable for MVP as task commits are the primary operation.

## Next Steps

1. **Human verification:** Test Generate Plan flow in browser (see Manual Verification Required section above)
2. **Monitor false-positive duplicates:** Gather user feedback on de-duplication accuracy; consider refining matching algorithm if too many false positives
3. **WBS parent name standardization:** Ensure level-2 WBS item names match expected `wbs_phase` values in skill output (e.g., "Platform Config" vs "Platform Configuration")
4. **Future enhancement:** Add UI indicator when WBS commit fails (e.g., badge or tooltip on committed tasks showing WBS sync status)

## Commits

| Commit | Message | Files Changed |
|--------|---------|---------------|
| e4ca004 | refactor(67-03): remove Plan tab from Delivery navigation | WorkspaceTabs.tsx, plan/page.tsx (deleted), PlanTabs.tsx (deleted) |
| a40c516 | feat(67-03): migrate AiPlanPanel to Task Board with de-dup and WBS commit | tasks/page.tsx, AiPlanPanel.tsx, ai-plan-generator.md |

## Self-Check

Verifying claims before state updates.

**Created files:**
- None (plan only modified/deleted files)

**Modified files:**
```bash
# Checking modified files exist
[ -f "/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/components/WorkspaceTabs.tsx" ] && echo "FOUND: WorkspaceTabs.tsx" || echo "MISSING: WorkspaceTabs.tsx"
[ -f "/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/components/AiPlanPanel.tsx" ] && echo "FOUND: AiPlanPanel.tsx" || echo "MISSING: AiPlanPanel.tsx"
[ -f "/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/app/customer/[id]/tasks/page.tsx" ] && echo "FOUND: tasks/page.tsx" || echo "MISSING: tasks/page.tsx"
[ -f "/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/skills/ai-plan-generator.md" ] && echo "FOUND: ai-plan-generator.md" || echo "MISSING: ai-plan-generator.md"
```

**Deleted files:**
```bash
# Checking deleted files are gone
[ ! -f "/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/app/customer/[id]/plan/page.tsx" ] && echo "CONFIRMED DELETED: plan/page.tsx" || echo "ERROR: plan/page.tsx still exists"
[ ! -f "/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/components/PlanTabs.tsx" ] && echo "CONFIRMED DELETED: PlanTabs.tsx" || echo "ERROR: PlanTabs.tsx still exists"
```

**Commits:**
```bash
# Checking commits exist
git log --all | grep -q "e4ca004" && echo "FOUND: e4ca004" || echo "MISSING: e4ca004"
git log --all | grep -q "a40c516" && echo "FOUND: a40c516" || echo "MISSING: a40c516"
```

**Results:**
- FOUND: WorkspaceTabs.tsx
- FOUND: AiPlanPanel.tsx
- FOUND: tasks/page.tsx
- FOUND: ai-plan-generator.md
- CONFIRMED DELETED: plan/page.tsx
- CONFIRMED DELETED: PlanTabs.tsx
- FOUND: e4ca004
- FOUND: a40c516

## Self-Check: PASSED
