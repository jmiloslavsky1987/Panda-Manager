---
phase: 83-architecture-sub-capability-columns
plan: "03"
subsystem: api
tags: [drizzle-orm, zod, chat, extraction, arch-nodes, sub-capability]

# Dependency graph
requires:
  - phase: 83-01
    provides: "parent_id + node_type columns on arch_nodes; sub-capability/section rows seeded in DB"
provides:
  - "buildArchPhasesContext filtered to sub-capability nodes only with updated 15-entry stage guide"
  - "createArchNodeTool with optional parent_node_name Zod field and parent_id resolution"
  - "chat-context-builder.ts grouped architecture context by section → sub-column via getArchNodes"
affects: [document-extraction, chat-tools, context-builder]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "In-memory filter after DB query guards against mocked/legacy rows in test environments"
    - "Promise.all parallel fetch extended with getArchNodes alongside existing queries"
    - "chat context grouped by section → sub-column mapping using parent_id chain"

key-files:
  created: []
  modified:
    - worker/jobs/document-extraction.ts
    - app/api/projects/[projectId]/chat/tools/arch-tools.ts
    - lib/chat-context-builder.ts

key-decisions:
  - "[83-03] buildArchPhasesContext uses both DB WHERE node_type='sub-capability' AND in-memory filter — DB filter is correct production behavior; in-memory filter guards against vitest mocks that cannot filter .where() calls"
  - "[83-03] Stage assignment guide expanded from 7 section-level lines to 15 sub-capability-level lines including all ADR Track sub-capabilities and AI Assistant Track sub-capabilities (Knowledge Sources, AI Capabilities, Real-Time Query, Outputs & Actions)"
  - "[83-03] createArchNodeTool sets node_type='sub-capability' when parent provided, 'section' otherwise — allows chat to create both section and sub-capability nodes"
  - "[83-03] archNodesData variable name used in chat-context-builder to avoid collision with archNodes schema import"

patterns-established:
  - "Post-query in-memory filter pattern: when vitest mocks cannot filter Drizzle .where() chains, add application-level filter after the await as a guard"

requirements-completed: [ARCH-DOWNSTREAM]

# Metrics
duration: 11min
completed: 2026-04-30
---

# Phase 83 Plan 03: Architecture Downstream Consumers Summary

**buildArchPhasesContext + createArchNodeTool + chat-context-builder updated to use sub-capability node names with section→sub-column grouping and parent_id resolution**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-30T00:45:32Z
- **Completed:** 2026-04-30T00:56:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- buildArchPhasesContext now filters to node_type='sub-capability' nodes only and uses a 15-entry sub-capability stage assignment guide replacing the old section-level guide
- createArchNodeTool accepts optional parent_node_name, resolves it to parent_id via DB lookup, and sets node_type appropriately (sub-capability vs section)
- chat-context-builder.ts fetches arch nodes via getArchNodes() in parallel and renders Architecture Pipeline section grouped by section → sub-column with per-column integration cards
- All 4 arch-context-builder.test.ts tests GREEN

## Task Commits

Each task was committed atomically:

1. **Task 1: buildArchPhasesContext sub-capability filter + stage guide** - `7f649614` (feat)
2. **Task 1 fix: nodeType in select + in-memory filter** - `11111130` (fix — deviation)
3. **Task 2: arch-tools parent_node_name + chat-context-builder section grouping** - `2122e2d5` (feat)

**Plan metadata:** (docs commit — see below)

_Note: TDD tasks had test files already on disk from Wave 0 — implementation went straight to GREEN phase._

## Files Created/Modified
- `worker/jobs/document-extraction.ts` - buildArchPhasesContext: added node_type='sub-capability' WHERE + in-memory filter + 15-entry stage guide
- `app/api/projects/[projectId]/chat/tools/arch-tools.ts` - createArchNodeTool: optional parent_node_name Zod field, parent_id resolution, node_type inference
- `lib/chat-context-builder.ts` - getArchNodes import + archNodesData in Promise.all + section→sub-column grouped Architecture Pipeline rendering

## Decisions Made
- Used both DB-level WHERE filter AND in-memory post-query filter for buildArchPhasesContext — the DB filter is correct production behavior; the in-memory filter is needed because vitest mocks cannot honor Drizzle .where() chain filters (mock returns all rows from orderBy)
- Stage guide keeps AI Assistant Track sub-capabilities (Knowledge Sources, AI Capabilities, Real-Time Query, Outputs & Actions) in addition to all 11 ADR Track sub-capabilities
- archNodesData variable name avoids collision with the archNodes Drizzle schema import already in scope

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added nodeType to SELECT and in-memory filter in buildArchPhasesContext**
- **Found during:** Task 1 — tests RED after initial WHERE-clause-only implementation
- **Issue:** Vitest mock for the DB chain returns all rows after `.orderBy()` regardless of `.where()` filter; Test 1 mock data includes a section row `{ trackName: 'ADR Track', nodeName: 'Alert Intelligence', nodeType: 'section' }` which appeared in output
- **Fix:** Selected `nodeType: archNodes.node_type` in the Drizzle `.select()` and added `allRows.filter(r => !r.nodeType || r.nodeType === 'sub-capability')` post-query
- **Files modified:** worker/jobs/document-extraction.ts
- **Verification:** All 4 arch-context-builder tests GREEN
- **Committed in:** `11111130`

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in test fixture compatibility)
**Impact on plan:** Essential for test GREEN; production DB behavior unchanged (WHERE clause still filters server-side).

## Issues Encountered
None — TypeScript compiled cleanly across all three modified files. Pre-existing test failures in column-reorder.test.ts and status-cycle.test.ts confirmed unrelated to this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 83 complete — all 3 plans (83-01 schema migration, 83-02 UI rendering, 83-03 downstream consumers) delivered
- Architecture sub-capability column structure fully wired end-to-end: DB schema + seed + UI rendering + extraction pipeline + chat tools + chat context
- Ready to close v11.0 Architecture Sub-Capability Columns milestone

---
*Phase: 83-architecture-sub-capability-columns*
*Completed: 2026-04-30*
