---
phase: 45-database-schema-foundation
plan: 02
subsystem: data-access
tags: [seeding, queries, wbs, team-engagement, architecture]
dependency_graph:
  requires: [45-01]
  provides: [wbs-seeding, team-engagement-seeding, arch-seeding, wbs-queries]
  affects: [project-creation, phase-47, phase-48]
tech_stack:
  added: []
  patterns: [atomic-seeding, hierarchical-wbs, flatMap-for-children]
key_files:
  created: []
  modified:
    - bigpanda-app/app/api/projects/route.ts
    - bigpanda-app/lib/queries.ts
decisions:
  - "WBS seeding uses returning() to capture parent IDs before inserting children"
  - "Architecture nodes seeded with status='planned' as default state"
  - "Team engagement sections initialized with empty content strings"
  - "flatMap pattern used to build level-2 WBS rows from parent-child relationships"
metrics:
  duration_seconds: 210
  tasks_completed: 2
  tests_passing: 14
  files_modified: 2
  commits: 2
  completed_at: "2026-04-08T08:08:35Z"
---

# Phase 45 Plan 02: Project Creation Seeding & Query Functions Summary

**One-liner:** Atomic seeding of WBS templates (35 ADR + 14 Biggy items), team engagement sections, and architecture tracks/nodes on project creation with typed query functions for downstream feature phases.

## What Was Built

Extended `app/api/projects/route.ts` POST handler with complete template seeding inside the existing transaction block. Added 4 new query functions to `lib/queries.ts` with full TypeScript type exports for Phase 47 (WBS UI) and Phase 48 (Architecture + Team Engagement UI).

### Task 1: WBS, Team Engagement, and Architecture Seeding

**Commit:** `c2e1909`

**Files Modified:**
- `bigpanda-app/app/api/projects/route.ts`

**Implementation:**
- **ADR WBS:** 10 level-1 parent items + 25 level-2 child items (35 total)
  - Level-1 sections: Discovery & Kickoff, Solution Design, Alert Source Integration, Alert Enrichment & Normalization, Platform Configuration, Correlation, Routing & Escalation, Teams & Training, UAT & Go-Live Preparation, Go-Live
  - Level-2 child items distributed across 8 parent sections (Solution Design has 3 children, Platform Configuration has 7, etc.)
  - Used `returning({ id, name })` to capture parent IDs before inserting children
  - Applied flatMap pattern to build child rows with correct parent_id references

- **Biggy WBS:** 5 level-1 parent items + 9 level-2 child items (14 total)
  - Level-1 sections: Discovery & Kickoff, Integrations, Workflow, Teams & Training, Deploy
  - Level-2 child items distributed across 3 parent sections (Integrations: 3, Workflow: 3, Teams & Training: 3)
  - Same returning() + flatMap pattern as ADR track

- **Team Engagement Sections:** 5 rows with empty content
  - Business Outcomes, Architecture, E2E Workflows, Teams & Engagement, Top Focus Areas
  - All initialized with `content: ''` and sequential display_order (1-5)

- **Architecture Tracks & Nodes:**
  - ADR Track with 5 nodes: Event Ingest, Alert Intelligence, Incident Intelligence, Console, Workflow Automation
  - AI Assistant Track with 5 nodes: Knowledge Sources, Real-Time Query, AI Capabilities, Console, Outputs & Actions
  - All nodes default to `status: 'planned'`
  - Both tracks and nodes marked with `source_trace: 'template'`

**All seeding happens atomically** inside the existing `db.transaction` block, after existing onboarding phase seeding and before the final `return inserted`. No breaking changes to existing seeding logic.

### Task 2: Query Functions

**Commit:** `65be68c`

**Files Modified:**
- `bigpanda-app/lib/queries.ts`

**Implementation:**
Added 4 new query functions with TypeScript type exports:

1. **`getWbsItems(projectId: number, track: string): Promise<WbsItem[]>`**
   - Filters by project_id and track ('ADR' | 'Biggy')
   - Orders by level ASC, then display_order ASC (hierarchical rendering order)
   - Used by Phase 47 WBS UI to fetch and render task structures

2. **`getTeamEngagementSections(projectId: number): Promise<TeamEngagementSection[]>`**
   - Filters by project_id
   - Orders by display_order ASC
   - Used by Phase 48 Team Engagement UI to render 5-section report

3. **`getArchNodes(projectId: number): Promise<{ tracks: ArchTrack[]; nodes: ArchNode[] }>`**
   - Returns both tracks and nodes in a single call
   - Tracks ordered by display_order, nodes ordered by display_order
   - Used by Phase 48 Architecture UI to render track flow diagrams

4. **`getArchTeamStatus(projectId: number): Promise<ArchTeamStatus[]>`**
   - Filters by project_id
   - Used by Phase 48 Architecture Team Status section

**Type Exports Added:**
```typescript
export type WbsItem = typeof wbsItems.$inferSelect;
export type TeamEngagementSection = typeof teamEngagementSections.$inferSelect;
export type ArchTrack = typeof archTracks.$inferSelect;
export type ArchNode = typeof archNodes.$inferSelect;
export type ArchTeamStatus = typeof archTeamStatus.$inferSelect;
```

All functions follow existing `lib/queries.ts` patterns: typed return values, Drizzle ORM select() chains, explicit ordering.

## Verification Results

### Targeted Test Suites (All GREEN)
- **tests/schema/** — 2 passed (schema validation for new tables)
- **tests/seeding/** — 8 passed (wbs-templates, team-engagement, architecture)
- **tests/queries/** — 4 passed (wbs-queries)
- **Total:** 14 tests passing, 0 failures in targeted suites

### Full Test Suite
- **Test Files:** 115 passed, 8 failed
- **Tests:** 589 passed, 17 failed
- **Pre-existing failures:** 17 failures are pre-existing (mock setup issues, deferred past v6.0)
- **No new regressions** introduced by this plan

### TypeScript Compilation
- 6 pre-existing errors in `tests/audit/` files (mock setup issues)
- **No new TypeScript errors** introduced by this plan

### Manual Verification
Not applicable — this is a pure data layer plan. UI verification will happen in Phase 47/48 when these queries are consumed by React components.

## Deviations from Plan

None — plan executed exactly as written. No auto-fixes, no blocking issues, no architectural changes required.

## Technical Decisions

1. **WBS parent-child linking strategy:** Used `returning({ id, name })` on level-1 insert to capture parent IDs, then built level-2 rows with flatMap pattern. This is safer than hardcoding IDs and ensures correct references even if seeding order changes.

2. **flatMap for hierarchical data:** Applied functional programming pattern to build child rows from parent-child relationship arrays. Cleaner than nested loops and self-documenting (each parent-child group is explicit).

3. **Architecture node status default:** Used `status: 'planned'` for all seeded nodes rather than mixing states. Projects start in "all planned" state; Phase 48 UI will allow users to promote nodes to 'in_progress' or 'live'.

4. **Query function ordering:** Level-first ordering for WBS (`orderBy(asc(level), asc(display_order))`) ensures parents always render before children, critical for tree-building in Phase 47 UI.

## Dependencies Satisfied

**Requires:**
- Phase 45-01: Schema tables (wbsItems, teamEngagementSections, archTracks, archNodes, archTeamStatus) ✓ Available

**Provides:**
- WBS template seeding on project creation → Consumed by Phase 47 WBS UI
- Team engagement section seeding → Consumed by Phase 48 Team Engagement UI
- Architecture track/node seeding → Consumed by Phase 48 Architecture UI
- 4 typed query functions → Imported by Phase 47/48 RSC pages

**Affects:**
- `app/api/projects/route.ts` POST handler — now seeds 4 additional table types (WBS, team engagement, architecture) beyond existing onboarding phases
- Future project creation requests will automatically receive full template structures (49 WBS items + 5 sections + 2 tracks + 10 nodes per project)

## Downstream Impact

**Phase 47 (WBS UI):**
- `getWbsItems()` provides data source for hierarchical task tree rendering
- Level + display_order sorting ensures correct parent-child ordering for tree algorithms

**Phase 48 (Architecture & Team Engagement UI):**
- `getTeamEngagementSections()` provides 5-section structure for report rendering
- `getArchNodes()` provides track + node data for React Flow diagrams
- `getArchTeamStatus()` provides team capability data for status tables

**New Projects:**
- Every project creation now seeds 49 WBS items (35 ADR + 14 Biggy)
- Every project creation now seeds 5 team engagement sections
- Every project creation now seeds 2 architecture tracks + 10 nodes
- All seeding happens atomically (rollback on any failure)

## What's Next

**Phase 46 (Context Upload Extraction Expansion):**
- AI extraction prompts will now route entities to WBS items (using track field)
- Extraction will populate team engagement sections and architecture nodes from documents

**Phase 47 (WBS UI):**
- Consume `getWbsItems()` in RSC to render ADR and Biggy task trees
- Implement task status toggling (not_started → in_progress → complete)
- Add "Generate Plan" action (AI fills gaps in template structure)

**Phase 48 (Architecture & Team Engagement UI):**
- Consume `getTeamEngagementSections()` to render 5-section report with inline editing
- Consume `getArchNodes()` to render React Flow track diagrams
- Implement node status promotion (planned → in_progress → live)

## Self-Check: PASSED

**Created files:** None (plan only modified existing files)

**Modified files verified:**
```bash
# Check route.ts exists and contains new seeding code
[ -f "bigpanda-app/app/api/projects/route.ts" ] && echo "FOUND: route.ts"
grep -q "wbsItems" bigpanda-app/app/api/projects/route.ts && echo "FOUND: WBS seeding"
grep -q "teamEngagementSections" bigpanda-app/app/api/projects/route.ts && echo "FOUND: Team engagement seeding"
grep -q "archTracks" bigpanda-app/app/api/projects/route.ts && echo "FOUND: Architecture seeding"

# Check queries.ts contains new functions
[ -f "bigpanda-app/lib/queries.ts" ] && echo "FOUND: queries.ts"
grep -q "getWbsItems" bigpanda-app/lib/queries.ts && echo "FOUND: getWbsItems"
grep -q "getTeamEngagementSections" bigpanda-app/lib/queries.ts && echo "FOUND: getTeamEngagementSections"
grep -q "getArchNodes" bigpanda-app/lib/queries.ts && echo "FOUND: getArchNodes"
grep -q "getArchTeamStatus" bigpanda-app/lib/queries.ts && echo "FOUND: getArchTeamStatus"
```

**Commits verified:**
```bash
# Verify Task 1 commit exists
git log --oneline --all | grep -q "c2e1909" && echo "FOUND: Task 1 commit (c2e1909)"

# Verify Task 2 commit exists
git log --oneline --all | grep -q "65be68c" && echo "FOUND: Task 2 commit (65be68c)"
```

All checks passed. Plan execution complete.
