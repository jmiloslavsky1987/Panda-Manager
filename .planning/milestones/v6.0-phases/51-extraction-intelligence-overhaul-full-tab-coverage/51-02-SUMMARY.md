---
phase: 51-extraction-intelligence-overhaul-full-tab-coverage
plan: 02
subsystem: extraction-intelligence
tags: [prompt-engineering, entity-type-union, disambiguation-rules, status-coercers, gap-closure]
dependency_graph:
  requires: [51-01]
  provides: [prompt-gaps-D-E-H-I-J-closed, coercers-module-verified]
  affects: [document-extraction, ingestion-approve]
tech_stack:
  added: []
  patterns: [tdd-wave-0-red-stubs, prompt-guidance-expansion, status-coercion]
key_files:
  created: []
  modified:
    - bigpanda-app/worker/jobs/document-extraction.ts
decisions:
  - "Remove team_engagement from entityType union (Gap D) — dead-end table with no viable handler"
  - "Add team_pathway to entityType union (Gap H) — handler exists but was missing from prompt"
  - "Add before_state and weekly_focus to entityType union (Gaps A/G shared with Plan 03)"
  - "Expand disambiguation section with 5 new rules covering architecture vs arch_node vs integration (three-way), task vs wbs_task (explicit examples), team vs stakeholder (explicit rule), workstream disambiguation (Gap I), and arch_node track name constraint (Gap J)"
  - "coercers.ts already existed from Plan 51-03 (blocking dependency pattern) — verified GREEN, no changes needed"
metrics:
  duration_minutes: 3
  tasks_completed: 2
  files_modified: 1
  commits: 1
  tests_added: 0
  tests_passing: 13
completed_date: "2026-04-09"
---

# Phase 51 Plan 02: EXTRACTION_SYSTEM Prompt Overhaul & Status Coercers Summary

**One-liner:** Overhauled EXTRACTION_SYSTEM prompt with Gap D/E/H/I/J fixes (removed team_engagement, added team_pathway/before_state/weekly_focus, expanded disambiguation rules) and verified status coercers module (already created in Plan 51-03).

## What Was Built

### Task 1: EXTRACTION_SYSTEM Prompt Overhaul (✓ Complete)
**Commit:** `34ee256`

Updated `document-extraction.ts` EXTRACTION_SYSTEM prompt with 6 critical changes:

1. **EntityType union updates:**
   - REMOVED `team_engagement` (Gap D: routes to dead-end table with no viable handler)
   - ADDED `team_pathway` (Gap H: handler exists in approve/route.ts but was missing from prompt)
   - ADDED `before_state` (Gap A: new entity type for Before State tab, shared with Plan 03)
   - ADDED `weekly_focus` (Gap G: new entity type for weekly focus bullets, shared with Plan 03)

2. **New entity guidance added:**
   - `team_pathway`: Named delivery pathway with team_name, route_description (joined by ' → '), status, notes
   - `before_state`: Current state before BigPanda adoption with aggregation_hub_name, alert_to_ticket_problem, pain_points
   - `weekly_focus`: This week's focus priorities with bullets (JSON array of strings)

3. **Disambiguation section expansion (Gap E):**
   - **architecture vs arch_node vs integration** (three-way disambiguation):
     - architecture = tool's ROLE in delivery workflow (phase, integration method)
     - arch_node = capability NODE in "ADR Track" or "AI Assistant Track" diagram
     - integration = operational CONNECTION STATUS (live/pilot/planned/not-connected)
   - **task vs wbs_task** (explicit examples):
     - task = generic action item with owner, status, phase
     - wbs_task = hierarchical WBS item with track, parent section, level
     - Rule: WBS structure mentions → wbs_task; otherwise → task
   - **team vs stakeholder** (explicit rule):
     - team = TEAM (group) with onboarding status across capability tracks
     - stakeholder = NAMED INDIVIDUAL with role, email, account
   - **workstream disambiguation (Gap I)**:
     - workstream = named DELIVERY TRACK with owner and percent_complete
     - Do NOT extract individual tasks as workstreams
   - **team_engagement deprecation notice**:
     - DO NOT use this entity type — use businessOutcome, e2e_workflow, team, focus_area instead

4. **wbs_task guidance update:**
   - Added status coercion note: normalize variants ("done"/"finished" → "complete", "in progress"/"ongoing" → "in_progress", "not started"/"todo" → "not_started")

5. **arch_node guidance update (Gap J):**
   - Enforced track constraint: ONLY "ADR Track" | "AI Assistant Track" are valid
   - If track name is different, skip this entity entirely

6. **TypeScript EntityType union update:**
   - Removed 'team_engagement' from union
   - Added 'before_state' and 'weekly_focus' to union
   - Note: 'team_pathway' was already in the union (no duplicate added)

### Task 2: Status Coercers Module Verification (✓ Complete)
**Status:** Already existed from Plan 51-03 (blocking dependency pattern)

The `coercers.ts` module was pre-created in Plan 51-03 as a blocking dependency for parallel Wave 1 execution. Verified:

- **coerceWbsItemStatus:** Coerces raw status strings to `not_started | in_progress | complete`
  - Maps variants: "done"/"finished" → "complete", "in progress"/"ongoing" → "in_progress", "not started"/"todo" → "not_started"
  - Returns null for invalid values like "blocked"

- **coerceArchNodeStatus:** Coerces raw status strings to `planned | in_progress | live`
  - Maps variants: "production"/"active" → "live", "in progress"/"ongoing" → "in_progress", "scheduled" → "planned"
  - Returns null for unknown values

- **Test coverage:** 13/13 tests GREEN (status-coercers.test.ts)
  - 7 tests for coerceWbsItemStatus (exact match, case insensitive, synonyms, null handling)
  - 6 tests for coerceArchNodeStatus (exact match, synonyms, null handling, unknown values)

## Deviations from Plan

None — plan executed exactly as written. Task 2 was pre-completed in Plan 51-03 as a blocking dependency (intentional design pattern for parallel execution).

## Verification Results

### Prompt Content Checks
✓ `before_state` appears 3 times in document-extraction.ts (entityType union, guidance, TypeScript type)
✓ `team_engagement` removed from entityType union (only appears in deprecation notice)
✓ `team_pathway` present in prompt
✓ Disambiguation section contains all 5 Gap rules (D, E, H, I, J)
✓ arch_node guidance explicitly states only "ADR Track" and "AI Assistant Track" are valid

### Test Results
✓ status-coercers.test.ts GREEN (13/13 tests pass)
✓ Full test suite runs with no new regressions (662 passing, 62 expected failures from pre-existing + weekly_focus stubs)
✓ TypeScript compiles without errors

## Integration Points

### Downstream Dependencies (Plan 03)
- **approve/route.ts:** Will import `coerceWbsItemStatus` and `coerceArchNodeStatus` from coercers.ts in wbs_task and arch_node handlers
- **Entity handlers:** Plan 03 will create handlers for `before_state` and `weekly_focus` entity types
- **Prompt verification:** Plan 03 will verify full extraction flow end-to-end with all Gap fixes

### Upstream Dependencies (Plan 01)
- **Schema updates:** Leverages schema changes from Plan 01 (arch_node_status enum, wbs_item status values)
- **Test stubs:** Validated against Wave 0 test stubs created in Plan 01

## Files Modified

| File | Lines Changed | Purpose |
|------|---------------|---------|
| `bigpanda-app/worker/jobs/document-extraction.ts` | +27 / -11 | EXTRACTION_SYSTEM prompt overhaul with Gap D/E/H/I/J fixes |

## Self-Check: PASSED

### Created Files
N/A (coercers.ts already existed from Plan 51-03)

### Modified Files
✓ FOUND: bigpanda-app/worker/jobs/document-extraction.ts (committed in 34ee256)

### Commits
✓ FOUND: 34ee256 (feat(51-02): overhaul EXTRACTION_SYSTEM prompt with Gap D/E/H/I/J fixes)

### Test Coverage
✓ status-coercers.test.ts: 13/13 tests pass
✓ No new test failures introduced

## Success Criteria Met

- [x] document-extraction.ts EXTRACTION_SYSTEM updated: team_engagement removed, team_pathway/before_state/weekly_focus added, expanded disambiguation section present, arch_node track constraint enforced
- [x] coercers.ts exported functions coerceWbsItemStatus and coerceArchNodeStatus exist and follow coercer pattern (pre-existing from Plan 51-03)
- [x] status-coercers.test.ts GREEN (13/13 tests pass)
- [x] Full test suite passes with no regressions
- [x] All 6 required changes to document-extraction.ts verified present
- [x] EntityType TypeScript union matches prompt string union
- [x] Disambiguation section contains all 5 Gap rules

## Next Steps

Proceed to **Plan 51-03** to:
1. Create `before_state` handler in approve/route.ts
2. Create `weekly_focus` handler in approve/route.ts
3. Wire coerceWbsItemStatus into wbs_task handler
4. Wire coerceArchNodeStatus into arch_node handler
5. Update team_pathway handler with status coercion
6. Verify end-to-end extraction flow with all Gap fixes
