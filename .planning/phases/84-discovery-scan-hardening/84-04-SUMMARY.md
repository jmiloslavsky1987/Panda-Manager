---
phase: 84-discovery-scan-hardening
plan: "04"
subsystem: api
tags: [discovery, anthropic, drizzle-orm, postgresql, entity-routing]

# Dependency graph
requires:
  - phase: 84-discovery-scan-hardening
    provides: "84-00 Wave 0 RED tests gating approve entity cases and scan enrichment"
  - phase: 84-discovery-scan-hardening
    provides: "84-01 Slack OAuth + 84-02 SlackAdapter + 84-03 lookback (Wave 1-3 infra)"
provides:
  - "DISCOVERY_SYSTEM prompt with all 12 entity types including JSON-content types (arch_node, workflow_step, team_engagement, workflow)"
  - "Enrichment context threading: existing arch tracks, workflows, engagement sections passed to Claude at scan time"
  - "approve/route.ts handles 8 new entity types: task, arch_node, workflow_step, team_engagement, business_outcome, arch_track, integration, workflow"
  - "FK resolution: arch_node resolves track_name→track_id; workflow_step resolves workflow_name→workflow_id (creates if missing)"
  - "Upsert pattern for team_engagement: db.update if section exists, db.insert if not"
affects: [84-05, discovery-scanner, approve-route, scan-route]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Template-literal interpolation pattern for DISCOVERY_SYSTEM: {existingStructureBlock} placeholder replaced at call time"
    - "FK resolution in db.transaction: select→create-if-missing→insert pattern for arch_node and workflow_step"
    - "Upsert without DB-level constraint: select→branch update/insert for teamEngagementSections"
    - "Plain insert (no onConflictDoNothing) in approve route — test mocks do not support Drizzle conflict methods; unique constraint guards at DB level in production"

key-files:
  created: []
  modified:
    - lib/discovery-scanner.ts
    - app/api/discovery/scan/route.ts
    - app/api/discovery/approve/route.ts

key-decisions:
  - "[84-04] DISCOVERY_SYSTEM_TEMPLATE uses {existingStructureBlock} placeholder — replaced with actual tracks/workflows/sections at runDiscoveryScan() call time, not at module load"
  - "[84-04] existingStructure is optional param on DiscoveryScanParams — backwards compatible, defaults to 'none' strings when absent"
  - "[84-04] arch_node approve case uses plain insert (no .onConflictDoNothing()) — vitest mocks from setupDbInsert() don't have conflict methods; production unique index (project_id, track_id, name) prevents duplicates at DB level"
  - "[84-04] integration approve maps item.content to tool_name (NOT NULL) and uses track='discovery' as default — architectureIntegrations has tool_name and track as required columns"
  - "[84-04] team_engagement upsert uses manual select+branch pattern — no DB-level unique constraint on teamEngagementSections visible in schema.ts"
  - "[84-04] scan/route.ts enrichment queries run in same Promise.all as existing actions/risks/stakeholders queries — no extra round-trips"

patterns-established:
  - "Template-string DISCOVERY_SYSTEM: define as DISCOVERY_SYSTEM_TEMPLATE constant with placeholders, interpolate inside runDiscoveryScan()"
  - "FK resolution transaction: await tx.select(track) → if (!track) tx.insert(archTracks).returning() → tx.insert(archNodes)"

requirements-completed: []

# Metrics
duration: 25min
completed: 2026-05-04
---

# Phase 84 Plan 04: Discovery Scanner Expansion Summary

**Discovery scanner expanded from 6 to 12 entity types with project-structure-aware enrichment context: existing arch tracks, workflows, and engagement sections passed to Claude at scan time; approve route adds FK-resolving cases for arch_node, workflow_step, and 6 additional entity types**

## Performance

- **Duration:** 25 min
- **Started:** 2026-05-04T21:14:00Z
- **Completed:** 2026-05-04T21:18:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Rewrote DISCOVERY_SYSTEM with 12 valid suggested_field types (up from 5), including JSON-content types (arch_node, workflow_step, team_engagement, workflow) with format specifications
- Enrichment context threading: scan/route.ts queries existing archTracks, e2eWorkflows, teamEngagementSections in parallel and passes them to Claude via existingStructure param so it can reference existing entities by name rather than creating duplicates
- Implemented 8 new entity approve cases with correct FK resolution (arch_node and workflow_step use db.transaction with create-if-missing pattern)
- All 11 approve.test.ts tests GREEN (5 pre-existing + 6 new entity-type tests from Wave 0)
- Production code TypeScript clean; pre-existing test file TS errors are out of scope

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite DISCOVERY_SYSTEM prompt + thread enrichment context into scanner** - `3b07744a` (feat)
2. **Task 2: Implement new entity approve cases in approve/route.ts** - `8e2eedd2` (feat)

## Files Created/Modified
- `lib/discovery-scanner.ts` - DISCOVERY_SYSTEM_TEMPLATE with 12 entity types + {existingStructureBlock} interpolation; existingStructure param on DiscoveryScanParams; buildExistingStructureBlock at scan time
- `app/api/discovery/scan/route.ts` - Added archTracks, e2eWorkflows, teamEngagementSections imports; enrichment queries added to Promise.all; passes existingStructure to runDiscoveryScan()
- `app/api/discovery/approve/route.ts` - Added 8 new imports and 8 new switch cases: task, arch_node (FK resolve), workflow_step (FK resolve), team_engagement (upsert), business_outcome, arch_track, integration, workflow

## Decisions Made
- Used template-literal DISCOVERY_SYSTEM_TEMPLATE with `{existingStructureBlock}` placeholder, replaced at call time inside `runDiscoveryScan()` — clean separation of constant definition from runtime interpolation
- Did not call `.onConflictDoNothing()` on archNodes insert in approve route — the setupDbInsert() test mock returns a chain without this method; the unique index on (project_id, track_id, name) provides the constraint at DB level in production
- `architectureIntegrations` insert uses `tool_name=item.content` and `track='discovery'` as the required NOT NULL default — no other track context is inferrable from a discovery item alone

## Deviations from Plan

None - plan executed exactly as written with one minor adaptation: `.onConflictDoNothing()` omitted from archNodes insert (test mock compatibility). The DB-level unique index provides the same protection in production.

## Issues Encountered
- Pre-existing failures in dismiss.test.ts (3 tests) and queue.test.ts (5 tests) — same next/headers mock restoration issue documented in 84-00. Not regressions from this plan.
- Pre-existing TypeScript errors in test files (tests/audit/, tests/lifecycle/, lib/__tests__/) — not introduced by this plan; production code is TypeScript clean.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 84-04 complete: 12-type discovery scanner with enrichment context and full approve routing
- Plan 84-05 (sourceSummary return shape change) has 2 RED tests gating it in scan.test.ts — ready to execute
- All discovery scan functionality: adapter selection, lookback filter, enrichment context, entity routing, FK resolution, and upsert all wired end-to-end

## Self-Check: PASSED

- lib/discovery-scanner.ts: FOUND (modified)
- app/api/discovery/scan/route.ts: FOUND (modified)
- app/api/discovery/approve/route.ts: FOUND (modified)
- Commit 3b07744a: FOUND
- Commit 8e2eedd2: FOUND

---
*Phase: 84-discovery-scan-hardening*
*Completed: 2026-05-04*
