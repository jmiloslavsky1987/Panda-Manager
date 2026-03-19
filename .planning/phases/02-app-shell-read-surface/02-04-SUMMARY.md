---
phase: 02-app-shell-read-surface
plan: 04
subsystem: ui
tags: [next.js, react, tailwind, shadcn, app-router, workspace-layout]

# Dependency graph
requires:
  - phase: 02-02
    provides: "getProjectById, ProjectWithHealth type, query layer foundations"
provides:
  - "app/customer/[id] route with redirect to /overview"
  - "WorkspaceLayout RSC — fetches project with health, renders header + tab bar + placeholder FAB"
  - "ProjectHeader component — customer name, RAG health badge, go-live date"
  - "WorkspaceTabs client component — 9 tabs with usePathname() active-state detection, sticky nav"
  - "getProjectWithHealth() query function added to lib/queries.ts"
affects: [02-05, 02-06, 02-07, phase-3, phase-4]

# Tech tracking
tech-stack:
  added: []
  patterns: [RSC layout pattern, client component for pathname-driven active state, shadcn Badge with className RAG override]

key-files:
  created:
    - bigpanda-app/app/customer/[id]/layout.tsx
    - bigpanda-app/app/customer/[id]/page.tsx
    - bigpanda-app/components/WorkspaceTabs.tsx
    - bigpanda-app/components/ProjectHeader.tsx
  modified:
    - bigpanda-app/lib/queries.ts

key-decisions:
  - "getProjectWithHealth() added to queries.ts — getProjectById returns Project (no health), layout needs ProjectWithHealth; thin wrapper using existing private computeHealth()"
  - "data-testid='add-notes-btn-placeholder' (not 'add-notes-btn') — plan 02-06 removes this FAB entirely and replaces it with AddNotesModal owning the final testid"
  - "WorkspaceTabs uses whitespace-nowrap to prevent tab label wrapping on narrow viewports"

patterns-established:
  - "RSC layout pattern: async WorkspaceLayout awaits params, fetches data, passes to RSC + client child components"
  - "Active tab detection: usePathname().endsWith('/' + segment) — matches exact segment regardless of query params"
  - "RAG badge override: shadcn Badge with className prop to inject bg-*/text-*/border-* Tailwind classes"

requirements-completed: [WORK-01]

# Metrics
duration: 8min
completed: 2026-03-19
---

# Phase 2 Plan 4: Customer Workspace Layout Summary

**Sticky 9-tab workspace shell for /customer/[id] — RSC layout with ProjectHeader (RAG badge), client WorkspaceTabs (usePathname active detection), and /overview redirect**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-19T21:38:17Z
- **Completed:** 2026-03-19T21:46:00Z
- **Tasks:** 1/1
- **Files modified:** 5

## Accomplishments

- Customer workspace route structure created: `/customer/[id]` redirects to `/customer/[id]/overview`
- WorkspaceLayout RSC fetches project with computed RAG health and renders header + sticky tab bar + placeholder FAB
- 9-tab navigation renders all workspace tabs with pathname-driven active highlighting and sticky positioning
- ProjectHeader renders customer name, RAG-colored health badge (Healthy/At Risk/Critical), and go-live date

## Task Commits

1. **Task 1: Create workspace layout with project header and tab bar** - `82e165e` (feat)

**Plan metadata:** (docs commit — follows this summary)

## Files Created/Modified

- `bigpanda-app/app/customer/[id]/layout.tsx` - RSC workspace layout: fetches ProjectWithHealth, renders header + tabs + FAB placeholder
- `bigpanda-app/app/customer/[id]/page.tsx` - Redirect from /customer/[id] to /customer/[id]/overview
- `bigpanda-app/components/WorkspaceTabs.tsx` - Client component: 9 tab links with usePathname() active detection, sticky nav
- `bigpanda-app/components/ProjectHeader.tsx` - RSC: customer name, RAG health badge, go-live date
- `bigpanda-app/lib/queries.ts` - Added getProjectWithHealth() — thin wrapper combining getProjectById + computeHealth

## Decisions Made

- **getProjectWithHealth() added to queries.ts:** `getProjectById` returns plain `Project` (no health fields). The workspace layout requires `ProjectWithHealth`. Rather than duplicate the health computation inside the layout, a thin `getProjectWithHealth()` function was added to queries.ts combining the existing `getProjectById` and private `computeHealth` helpers. This keeps health logic centralized.
- **Placeholder FAB testid:** Used `data-testid="add-notes-btn-placeholder"` not `"add-notes-btn"` — plan 02-06 replaces this element entirely with `<AddNotesModal>` which owns `"add-notes-btn"`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added getProjectWithHealth() to queries.ts**
- **Found during:** Task 1 (layout implementation)
- **Issue:** Layout needs `ProjectWithHealth` but `getProjectById` returns `Project`. No single-project-with-health query existed. Without it, the layout cannot pass the correct type to ProjectHeader.
- **Fix:** Added `getProjectWithHealth(projectId: number): Promise<ProjectWithHealth>` to `lib/queries.ts` using existing `getProjectById` + `computeHealth`.
- **Files modified:** `bigpanda-app/lib/queries.ts`
- **Verification:** TypeScript reports no errors in workspace layout files; layout compiles correctly with ProjectHeader.
- **Committed in:** `82e165e` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical functionality)
**Impact on plan:** Auto-fix essential for type correctness. The plan referenced `ProjectWithHealth` throughout but did not specify how to obtain it for a single project. No scope creep.

## Issues Encountered

None — TypeScript clean on all new files. Three pre-existing errors in lib/settings.ts and lib/yaml-export.ts remain deferred per STATE.md.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Workspace shell is ready for plans 02-05 and 02-06 to slot tab page content into
- All 9 tab routes (`/customer/[id]/overview` through `/customer/[id]/stakeholders`) will render children via this layout
- ProjectHeader and WorkspaceTabs are independently importable for any future tab page needs

---
*Phase: 02-app-shell-read-surface*
*Completed: 2026-03-19*

## Self-Check: PASSED

- FOUND: bigpanda-app/app/customer/[id]/layout.tsx
- FOUND: bigpanda-app/app/customer/[id]/page.tsx
- FOUND: bigpanda-app/components/WorkspaceTabs.tsx
- FOUND: bigpanda-app/components/ProjectHeader.tsx
- FOUND: commit 82e165e
