---
phase: 83-architecture-sub-capability-columns
plan: "02"
subsystem: ui
tags: [react, dnd-kit, sortable, arch-diagram, optgroup, select, seed-script]

# Dependency graph
requires:
  - phase: 83-01
    provides: DB migration 0046 adding parent_id and node_type to arch_nodes; ArchNode TypeScript type with hierarchy fields; existing projects migrated to section + sub-capability structure

provides:
  - "InteractiveArchGraph.tsx ADR Track renders 3 colored SectionHeader components (Alert Intelligence blue, Incident Intelligence amber, Workflow Automation green) with per-section SortableContext for sub-capability columns"
  - "Console node rendered between Incident Intelligence and Workflow Automation sections using ConsoleNode component"
  - "AI Assistant Track rendering unchanged (flat SortableContext)"
  - "IntegrationEditModal.tsx ADR phase picker replaced with <optgroup> grouped select covering all 11 sub-capability names"
  - "app/api/projects/route.ts new project seeds 3 section nodes + Console + 11 sub-capability nodes in ADR Track"
  - "scripts/seed-projects.ts mirrors route.ts new structure with sub-capability phase names in architectureIntegrations"

affects:
  - 83-03 (arch-context-builder and document-extraction downstream consumers)
  - 83-04 (chat tools parent_node_name resolution)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TrackPipeline branches on isADR (trackData.name === 'ADR Track') to choose grouped vs flat rendering"
    - "Per-section SortableContext: each section's sub-capabilities in their own SortableContext; DndContext wraps all sections for the track"
    - "handleDragEnd ADR path: find activeSection via subCapByParent Map, scope arrayMove to section nodes only"
    - "React.ReactNode[] array for dynamic section render parts (renderParts pattern)"
    - "route.ts multi-step section seed: .returning({ id }) per section node, then bulk sub-capability insert with parent_id"

key-files:
  created: []
  modified:
    - components/arch/InteractiveArchGraph.tsx
    - components/arch/IntegrationEditModal.tsx
    - app/api/projects/route.ts
    - scripts/seed-projects.ts

key-decisions:
  - "[83-02] TrackPipeline uses strict equality trackData.name === 'ADR Track' (not .includes('ADR')) to avoid false matches"
  - "[83-02] Console node rendered after Incident Intelligence section (sectionIdx === 1) using index position in ordered sections array"
  - "[83-02] renderParts: React.ReactNode[] array accumulates section JSX + console insertion; rendered inside single DndContext"
  - "[83-02] seed-projects.ts was gitignored — staged with git add -f to include in commit"
  - "[83-02] architectureIntegrations in seed-projects.ts updated to use sub-capability phase names (Monitoring Integrations, Automated Incident Creation) matching post-migration structure"
  - "[83-02] Sub-capability count is 11 (3+4+4) per CONTEXT.md — plan text said '10' but actual named sub-capabilities are 11"

patterns-established:
  - "SectionHeader pattern: separate component with color prop referencing var(--kata-status-{color}) for both borderLeftColor and text color"
  - "ADR-branch pattern: isADR guard in TrackPipeline separates grouped and flat rendering paths cleanly"

requirements-completed:
  - ARCH-RENDER
  - ARCH-SEED

# Metrics
duration: 4min
completed: 2026-04-30
---

# Phase 83 Plan 02: ADR Track Rendering Overhaul + IntegrationEditModal Optgroups + Seed Updates Summary

**ADR Track now renders 3 colored section headers (SectionHeader component) with per-section DnD-sortable sub-capability columns, IntegrationEditModal uses native `<optgroup>` for grouped ADR phase picker, and both seed locations insert 3 sections + Console + 11 sub-capabilities for new projects**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-30T00:38:28Z
- **Completed:** 2026-04-30T00:42:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `SectionHeader` component with Kata CSS token colors (`var(--kata-status-blue/amber/green)`) and left-border design
- `TrackPipeline` branches on `isADR`: ADR track renders sections with per-section `SortableContext`; AI Assistant Track continues with flat rendering unchanged
- `handleDragEnd` updated for ADR track: scopes `arrayMove` to the section containing `active.id` using `subCapByParent` Map; cross-section DnD is impossible by design (each SortableContext is scoped)
- `IntegrationEditModal`: `ADR_PHASES` constant removed; phase picker uses `<optgroup>` for ADR track with 11 sub-capability options across 3 groups
- `route.ts`: New project creation inserts section nodes with `.returning({id})` then bulk-inserts 11 sub-capability nodes with `parent_id` references
- `seed-projects.ts`: Mirrors route.ts structure; seed integrations updated to sub-capability phase names
- integration-modal-optgroup.test.ts: 4/4 GREEN; section-grouping.test.ts: 5/5 GREEN

## Task Commits

1. **Task 1: InteractiveArchGraph.tsx — SectionHeader + grouped ADR Track rendering** - `34019ba6` (feat)
2. **Task 2: IntegrationEditModal optgroups + route.ts + seed-projects.ts new structure** - `2899733a` (feat)

## Files Created/Modified

- `/Users/jmiloslavsky/Documents/Panda-Manager/components/arch/InteractiveArchGraph.tsx` — Added `sectionColor()`, `SectionHeader` component; TrackPipeline ADR branch with per-section SortableContext; updated handleDragEnd for section-scoped DnD
- `/Users/jmiloslavsky/Documents/Panda-Manager/components/arch/IntegrationEditModal.tsx` — Removed `ADR_PHASES`; optgroup JSX for ADR phase picker; default phase 'Monitoring Integrations'; handleTrackChange updated
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/projects/route.ts` — 4-node flat ADR seed replaced with 3-section + Console + 11 sub-capability multi-step insert
- `/Users/jmiloslavsky/Documents/Panda-Manager/scripts/seed-projects.ts` — Same ADR structure update; architectureIntegrations phase values updated to sub-capability names

## Decisions Made

- TrackPipeline uses strict `trackData.name === 'ADR Track'` (not `.includes('ADR')`) for the ADR branch to avoid accidental matches on other track names.
- Console node is inserted after `sectionIdx === 1` (Incident Intelligence) in the ordered sections array — this works correctly because sections are sorted by display_order (10/20/30) and Console is at display_order 25.
- `renderParts: React.ReactNode[]` array pattern chosen to cleanly interleave section JSX and Console node insertion inside a single `DndContext`.
- `seed-projects.ts` was in `.gitignore` — forced add (`git add -f`) to include in commit, consistent with existing behavior (it was already partially committed).
- ADR integration seed phase values updated from section names to sub-capability names to match post-migration `architecture_integrations.phase` schema.

## Deviations from Plan

None - plan executed exactly as written. The 11 sub-capability count (vs plan's stated "10") was already corrected in 83-01 and carried forward consistently.

## Issues Encountered

- `scripts/seed-projects.ts` is gitignored — required `git add -f` to stage. This is existing project behavior (the file was already present on-disk from prior seeding work). Not a new issue introduced by this plan.

## User Setup Required

None - no external service configuration required. Changes take effect on next application startup/deployment. Existing projects already have the correct DB structure from migration 0046 (83-01). New projects created via POST /api/projects will receive the new 3-section + sub-capability structure.

## Next Phase Readiness

- ADR Track renders correctly with SectionHeader + sub-capability columns
- IntegrationEditModal phase picker shows 11 sub-capability options in 3 optgroups
- New projects seed correctly with full hierarchy
- Ready for Phase 83 Plan 03: arch-context-builder.ts sub-capability filter + document-extraction.ts stage assignment guide update (arch-context-builder tests currently RED — Wave 3 gate)

## Self-Check

- FOUND: `/Users/jmiloslavsky/Documents/Panda-Manager/components/arch/InteractiveArchGraph.tsx` (SectionHeader component present)
- FOUND: `/Users/jmiloslavsky/Documents/Panda-Manager/components/arch/IntegrationEditModal.tsx` (ADR_PHASES removed, optgroups present)
- FOUND: `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/projects/route.ts` (section node inserts present)
- FOUND: `/Users/jmiloslavsky/Documents/Panda-Manager/scripts/seed-projects.ts` (section node inserts present)

## Self-Check: PASSED

---
*Phase: 83-architecture-sub-capability-columns*
*Completed: 2026-04-30*
