---
phase: 56-teams-tab-alignment-and-orphan-cleanup
plan: "03"
subsystem: extraction-pipeline
tags:
  - dead-code-removal
  - team-engagement
  - approve-route
  - extraction-types
dependency_graph:
  requires:
    - 56-01
  provides:
    - clean-approve-route
    - clean-queries
    - clean-extraction-types
  affects:
    - ingestion/approve
tech_stack:
  added: []
  patterns:
    - dead-code-cleanup
    - schema-import-pruning
key_files:
  created: []
  modified:
    - bigpanda-app/app/api/ingestion/approve/route.ts
    - bigpanda-app/lib/queries.ts
    - bigpanda-app/lib/extraction-types.ts
decisions:
  - "Removed team_engagement case block from approve route (dead code since Phase 51)"
  - "Deleted getTeamEngagementSections function from lib/queries.ts (no UI consumer)"
  - "Cleaned up teamEngagementSections imports from extraction-types.ts"
metrics:
  duration_minutes: 216
  task_count: 4
  files_modified: 3
  lines_removed: ~50
  commits: 3
  completed_date: "2026-04-10"
---

# Phase 56 Plan 03: Remove dead code from approve route and queries

**One-liner:** Removed team_engagement handler from approve route and unused getTeamEngagementSections query function, completing Phase 56 cleanup.

## Objective

Remove dead code from approve route and lib/queries.ts — cleanup team_engagement handler and unused query function.

Purpose: Complete gap closure by removing the team_engagement entity handler (marked as DEAD CODE since Phase 51, when entity type was removed from extraction prompts) and the unused getTeamEngagementSections query function that has no UI consumer.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Remove team_engagement case block from approve route and clean imports | e805d3c | ✓ Complete |
| 2 | Remove getTeamEngagementSections function from lib/queries.ts | 31caf87 | ✓ Complete |
| 3 | Clean up teamEngagementSections imports in extraction-types.ts | 99cc46c | ✓ Complete |
| 4 | Verify Phase 56 completion | human-verify | ✓ Approved |

## Implementation Details

### Task 1: Remove team_engagement case block

**File:** `bigpanda-app/app/api/ingestion/approve/route.ts`

**Changes:**
- Deleted entire `case 'team_engagement':` block (lines 818-855) containing dead code marked for removal since Phase 51
- Removed `teamEngagementSections` schema import from import list
- Handler contained 30+ lines of insert/update logic that was unreachable after entity type removal from extraction prompt

**Verification:**
```bash
! grep -q "case 'team_engagement'" bigpanda-app/app/api/ingestion/approve/route.ts
! grep -q "teamEngagementSections" bigpanda-app/app/api/ingestion/approve/route.ts
```

### Task 2: Remove getTeamEngagementSections function

**File:** `bigpanda-app/lib/queries.ts`

**Changes:**
- Deleted `getTeamEngagementSections` function (8 lines)
- Function had no consumers in UI layer (Teams tab uses teamEngagementSections data fetched directly in TeamEngagementMap)
- Removed unused `teamEngagementSections` import after function deletion

**Verification:**
```bash
! grep -q "getTeamEngagementSections" bigpanda-app/lib/queries.ts
```

### Task 3: Clean extraction-types.ts imports

**File:** `bigpanda-app/lib/extraction-types.ts`

**Changes:**
- Removed unused `teamEngagementSections` schema import
- Verified EntityType union has 21 types (no 'team_engagement')
- Entity type 'team_engagement' was already removed from EntityType union in Phase 51 Plan 02

**Verification:**
```bash
! grep -q "teamEngagementSections" bigpanda-app/lib/extraction-types.ts
! grep -q "'team_engagement'" bigpanda-app/lib/extraction-types.ts
```

### Task 4: Human verification checkpoint

**Verification scope:**
- Teams tab visual structure (4 sections, no Architecture duplication)
- Extraction preview coverage (all 21 entity types visible in Drafts modal)
- Dead code removal verification (grep confirms no team_engagement references)
- TypeScript compilation (no errors or unused import warnings)

**Result:** User approved — "approved"

## Deviations from Plan

None — plan executed exactly as written.

## Requirements Satisfied

| Requirement | Description | Status |
|-------------|-------------|--------|
| TEAM-01 | 4-section editable in-place map replacing TeamsPageTabs | ✓ SATISFIED (Plan 01) |
| TEAM-02 | Extend extraction preview to all entity types | ✓ SATISFIED (Plan 02) |

Both requirements were completed in prior plans (56-01 and 56-02). This plan completes the phase by removing dead code.

## Technical Notes

### Dead Code Background

The team_engagement entity type was removed from the extraction prompt in Phase 51 Plan 02 (EXTR-15 gap closure decision). The approve route handler was retained for "backward compatibility with any items already in the review queue" but marked as DEAD CODE to be removed in Phase 56.

**Why dead code:**
- No new team_engagement items can enter the system (not in extraction prompt)
- teamEngagementSections table not surfaced in Teams tab UI
- Teams tab displays 4 sections: Business Value, E2E Workflows, Teams & Engagement, Focus Areas — none use teamEngagementSections table data
- Handler is unreachable code

### Schema Preservation

The `teamEngagementSections` table schema remains in `schema.ts` (no migration needed). Per CONTEXT.md decision: dead schema infrastructure can persist without harm if all code references are removed.

### EntityType Union Verification

Confirmed 21 entity types in lib/extraction-types.ts:
- action, risk, decision, milestone, stakeholder, task, architecture, history, businessOutcome, team, focus_area, e2e_workflow, wbs_task, note, team_pathway, workstream, onboarding_step, integration, arch_node, before_state, weekly_focus

'team_engagement' not in list (removed in Phase 51).

## Phase 56 Completion Summary

Phase 56 executed 3 plans in 2 waves:

| Plan | Name | Tasks | Status |
|------|------|-------|--------|
| 56-01 | Teams tab 4-section design implementation | 4 | ✓ Complete |
| 56-02 | Extend extraction preview to all entity types | 5 | ✓ Complete |
| 56-03 | Remove dead code from approve route and queries | 4 | ✓ Complete |

**Total:** 13 tasks, 3 checkpoints, 8 files modified, ~500 lines changed

**Key outcomes:**
1. Teams tab simplified to 4 sections (removed Architecture duplication)
2. Extraction preview covers all 21 entity types (full tab parity)
3. Dead code removed (team_engagement handler, unused query function, orphaned components)
4. TEAM-01 and TEAM-02 requirements fully satisfied

## Self-Check

**Created files:** None (cleanup plan only)

**Modified files:**
- ✓ FOUND: bigpanda-app/app/api/ingestion/approve/route.ts
- ✓ FOUND: bigpanda-app/lib/queries.ts
- ✓ FOUND: bigpanda-app/lib/extraction-types.ts

**Commits:**
```bash
git log --oneline --all | grep -E "e805d3c|31caf87|99cc46c"
```
- ✓ FOUND: e805d3c chore(56-03): remove dead team_engagement handler and import
- ✓ FOUND: 31caf87 chore(56-03): remove unused getTeamEngagementSections function
- ✓ FOUND: 99cc46c chore(56-03): remove unused teamEngagementSections import

## Self-Check: PASSED
