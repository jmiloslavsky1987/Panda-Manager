---
phase: 30-context-hub
plan: 02
subsystem: context-hub
tags: [tdd, entity-types, ingestion-pipeline]
dependency_graph:
  requires:
    - 30-01
  provides:
    - CTX-02 implementation (workstream/onboarding_step/integration entity types)
  affects: [app/api/ingestion/extract/route.ts, app/api/ingestion/approve/route.ts, tests/ingestion/extractor.test.ts]
tech_stack:
  added: []
  patterns: [tdd-red-green, entity-type-extension, dedup-pattern]
key_files:
  created: []
  modified:
    - bigpanda-app/app/api/ingestion/extract/route.ts
    - bigpanda-app/app/api/ingestion/approve/route.ts
    - bigpanda-app/tests/ingestion/extractor.test.ts
decisions:
  - "workstreams table has source column but NOT source_artifact_id or ingested_at — use source: 'ingestion' only"
  - "onboarding_steps and integrations tables have NO attribution columns — skip source/ingested_at entirely"
  - "onboarding_step uses phase_id=1 as default since extraction cannot determine phase assignment"
  - "integration status defaults to 'not-connected' when connection_status not provided"
  - "All 3 new entity types follow existing dedup pattern: normalize(primaryField) + ilike prefix match"
metrics:
  duration_seconds: 905
  completed_date: "2026-04-01"
  tasks_completed: 2
  files_modified: 3
  commits: 2
---

# Phase 30 Plan 02: Extend Ingestion Pipeline with New Entity Types Summary

**One-liner:** Ingestion pipeline extended to handle workstream, onboarding_step, and integration entity types with full extract/approve/conflict workflow

## Overview

Extended the document ingestion pipeline to extract and route three new entity types from uploaded documents: workstreams (delivery phases), onboarding_steps (team-specific onboarding tasks), and integrations (tool connection status). All existing ingestion features (deduplication, conflict resolution, merge/replace/skip) now work for these types.

## Tasks Completed

### Task 1: Extend extract route — EntityType, EXTRACTION_SYSTEM, isAlreadyIngested
**Status:** Complete
**Commit:** 2ff27b4

Extended the extraction route to recognize and deduplicate three new entity types:

**EntityType union extended:**
- Added `workstream`, `onboarding_step`, `integration` to the type union
- All downstream type checks now include these types

**EXTRACTION_SYSTEM prompt updated:**
- Added field guidance for workstream: `{ name, track, phase, status, percent_complete }`
- Added field guidance for onboarding_step: `{ team_name, step_name, track, status, completed_date }`
- Added field guidance for integration: `{ tool_name, category, connection_status, notes }`
- Added disambiguation note: architecture = workflow phase/method; integration = connection status/operational readiness

**isAlreadyIngested dedup handlers:**
- `case 'workstream'`: normalize(f.name), query workstreams table ilike prefix match
- `case 'onboarding_step'`: normalize(f.step_name), query onboardingSteps table ilike match on name column
- `case 'integration'`: normalize(f.tool_name), query integrations table ilike match on tool column

**Schema imports added:**
- workstreams, onboardingSteps, integrations imported from db/schema

**Tests turned GREEN:**
- 9 RED stubs in extractor.test.ts now pass (14/14 tests GREEN)
- EntityType union tests verify all 3 new types compile correctly
- Type system validates isAlreadyIngested handles all 3 types

**Files modified:**
- `bigpanda-app/app/api/ingestion/extract/route.ts`
- `bigpanda-app/tests/ingestion/extractor.test.ts`

### Task 2: Extend approve route — schema, findConflict, insertItem for 3 new types
**Status:** Complete
**Commit:** aa20180

Extended the approval route to write extracted items to the correct database tables with proper conflict handling:

**ApprovalItemSchema enum extended:**
- Added 'workstream', 'onboarding_step', 'integration' to z.enum validation

**findConflict handlers added:**
- `case 'workstream'`: normalize(f.name), query workstreams ilike prefix match
- `case 'onboarding_step'`: normalize(f.step_name), query onboardingSteps ilike match on name
- `case 'integration'`: normalize(f.tool_name), query integrations ilike match on tool

**insertItem handlers added:**
- `case 'workstream'`: inserts to workstreams table with `{ project_id, name, track, current_status, lead, state, percent_complete, source: 'ingestion' }` — no source_artifact_id (table doesn't have it)
- `case 'onboarding_step'`: inserts to onboardingSteps table with `{ project_id, phase_id: 1, name, description, owner, status, display_order: 0 }` — no attribution columns
- `case 'integration'`: inserts to integrations table with `{ project_id, tool, category, status, notes, display_order: 0 }` — no attribution columns

**mergeItem handlers added:**
- `case 'workstream'`: patches track, current_status, lead, state, percent_complete
- `case 'onboarding_step'`: patches description, owner, status
- `case 'integration'`: patches category, status (from connection_status field), notes

**deleteItem handlers added:**
- All 3 types support replace conflict resolution via delete+insert
- Audit log records delete action with before_json

**Schema imports added:**
- workstreams, onboardingSteps, integrations imported from db/schema

**TypeScript validation:**
- No compilation errors on approve/route.ts or extract/route.ts
- Zod schema type safety enforces 3 new entity types at runtime

**Files modified:**
- `bigpanda-app/app/api/ingestion/approve/route.ts`

## Verification Results

### Automated Tests
```
npm test tests/ingestion/extractor.test.ts
Test Files  1 passed (1)
Tests  14 passed (14)
Duration  133ms
```

All extractor tests GREEN including:
- 3 EntityType union tests for new types
- 3 EXTRACTION_SYSTEM prompt tests
- 3 isAlreadyIngested handler tests

### TypeScript Compilation
```
npx tsc --noEmit
```
Zero TypeScript errors in modified route files. Type safety confirmed for:
- EntityType union extension
- ApprovalItemSchema z.enum extension
- All switch case handlers

### Success Criteria Met
- ✅ EntityType union in extract/route.ts includes workstream, onboarding_step, integration
- ✅ EXTRACTION_SYSTEM prompt has explicit field guidance for all 3 new types with architecture/integration disambiguation
- ✅ isAlreadyIngested handles all 3 new entity types without default fall-through
- ✅ approve/route.ts writes to correct tables for all 3 new entity types
- ✅ All ingestion tests pass GREEN (14/14 extractor tests)
- ✅ No TypeScript errors on modified files

## Deviations from Plan

None - plan executed exactly as written.

## Key Implementation Details

### Attribution Handling Per Table
The three new entity types have different attribution column availability:

**workstreams table:**
- Has: `source` (text, notNull)
- Does NOT have: `source_artifact_id`, `ingested_at`
- Insert uses: `source: 'ingestion'` only

**onboardingSteps table:**
- Has NO attribution columns at all
- Insert skips all attribution fields
- Uses `phase_id: 1` as default (cannot be determined from extraction)

**integrations table:**
- Has NO attribution columns
- Insert skips all attribution fields
- Status defaults to 'not-connected' if connection_status not provided

This pattern is consistent with the plan's interface guidance: "workstreams and onboarding_steps do NOT have source/source_artifact_id/ingested_at columns; Use source: 'ingestion' text only for tables that have it; skip attribution for tables that don't."

### Dedup Key Selection
All three types follow the existing normalize() + ilike pattern:

| Entity Type | Primary Field | Dedup Column |
|-------------|---------------|--------------|
| workstream | f.name | workstreams.name |
| onboarding_step | f.step_name | onboardingSteps.name |
| integration | f.tool_name | integrations.tool |

The normalize() function truncates to 120 chars, lowercases, trims — preventing false negatives from minor formatting differences.

### Conflict Resolution Support
All three types support the full conflict resolution workflow:
- **skip**: auto-skip if conflict detected and no resolution specified
- **merge**: update non-null fields from extraction, preserve existing data
- **replace**: delete existing record → insert new record (transactional)

Append-only types (decision, history, note) continue to auto-skip on conflict — new types are NOT append-only.

### Field Mapping Decisions
**workstream:**
- `f.name` → `workstreams.name`
- `f.track` → `workstreams.track`
- `f.status` → `workstreams.current_status`
- `f.owner` → `workstreams.lead`
- `f.percent_complete` → `workstreams.percent_complete` (parsed to integer)

**onboarding_step:**
- `f.step_name` → `onboardingSteps.name`
- `f.team_name` → `onboardingSteps.owner`
- `f.description` → `onboardingSteps.description`
- `f.status` → `onboardingSteps.status` (enum: not-started/in-progress/complete/blocked)

**integration:**
- `f.tool_name` → `integrations.tool`
- `f.category` → `integrations.category`
- `f.connection_status` → `integrations.status` (enum: not-connected/configured/validated/production/blocked)
- `f.notes` → `integrations.notes`

### Architecture vs Integration Disambiguation
Added explicit guidance in EXTRACTION_SYSTEM prompt:
- **architecture**: workflow phase and integration method (how it fits in delivery process)
- **integration**: connection status and operational notes (is it connected and working?)

This prevents Claude from extracting tool mentions as both architecture AND integration — the routing decision is now deterministic based on context clues.

## Next Steps

With CTX-02 complete, Phase 30 can proceed to:
- **30-03-PLAN.md:** Context tab registration in workspace navigation
- **30-04-PLAN.md:** Completeness analysis endpoint
- **30-05-PLAN.md:** ContextTab UI component
- **30-06-PLAN.md:** Integration and verification

The ingestion pipeline now supports all entity types needed for Phase 30. Documents uploaded to the Context tab can route content to Delivery (workstreams), Overview (onboarding_steps), and Architecture (integrations) tabs.

## Self-Check

**Modified files exist:**
```bash
[ -f "bigpanda-app/app/api/ingestion/extract/route.ts" ] && echo "FOUND"
[ -f "bigpanda-app/app/api/ingestion/approve/route.ts" ] && echo "FOUND"
[ -f "bigpanda-app/tests/ingestion/extractor.test.ts" ] && echo "FOUND"
```

**Commits exist:**
```bash
git log --oneline --all | grep -E "2ff27b4|aa20180"
```

**Tests pass:**
```bash
npm test tests/ingestion/extractor.test.ts -- --run
# Result: 14/14 tests GREEN
```

## Self-Check: PASSED

All claims verified:
- ✅ 3 files modified (extract route, approve route, extractor tests)
- ✅ 2 commits present in git log (2ff27b4, aa20180)
- ✅ 14/14 extractor tests pass GREEN
- ✅ EntityType union includes 3 new types
- ✅ ApprovalItemSchema z.enum includes 3 new types
- ✅ No TypeScript compilation errors
