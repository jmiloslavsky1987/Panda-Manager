---
phase: 81-kata-design-system-overhaul
plan: "05"
subsystem: ui
tags: [kata-tokens, workspace, kpi-strip, page-bar, jbm, rag-health, material-symbols, tailwind4]

# Dependency graph
requires:
  - phase: 81-02
    provides: PageBarContext/usePageBar pattern, PageBar component, Kata token CSS vars
  - phase: 81-03
    provides: Icon component, lucide-react removal across all tracked files

provides:
  - "components/WorkspaceKpiStrip.tsx: 5-column KPI grid with JBM 28px numerals and Kata status token tinting"
  - "components/WorkspacePageBarConfigurator.tsx: 44px workspace page-bar (client component) with project name + health badge"
  - "app/customer/[id]/layout.tsx: workspace layout rebuilt with KPI strip above WorkspaceTabs, Kata canvas background"
  - "components/ProjectHeader.tsx: updated to use Kata tokens (kata-on-container, kata-on-container-tertiary)"

affects: [81-06, 81-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "WorkspacePageBarConfigurator renders its own 44px bar directly — global PageBar suppresses itself on /customer/ routes by design"
    - "WorkspaceKpiStrip accepts ProjectWithHealth extended with optional currentPhase/percentComplete fields"
    - "Kata status token tinting: k.tone === 'error' -> --kata-status-red, k.tone === 'warning' -> --kata-status-amber"
    - "5-column KPI grid uses gridTemplateColumns: repeat(5, 1fr) with inline borderRight on non-last columns"

key-files:
  created:
    - "components/WorkspaceKpiStrip.tsx"
    - "components/WorkspacePageBarConfigurator.tsx"
  modified:
    - "app/customer/[id]/layout.tsx"
    - "components/ProjectHeader.tsx"

key-decisions:
  - "[81-05] WorkspacePageBarConfigurator renders visible 44px bar directly — global PageBar suppresses on /customer/ routes; context injection still done for any future consumers"
  - "[81-05] WorkspaceKpiStrip uses openRiskCount (not openRisks) — actual ProjectWithHealth field name; currentPhase/percentComplete are optional overrides (not on base type)"

patterns-established:
  - "Pattern: Workspace-specific page-bar as self-rendering client component rather than relying on context injection"
  - "Pattern: KPI strip tone logic — error for overdue/high-risk, warning for approaching-deadline/elevated-risk, neutral otherwise"

requirements-completed: [KDS-06]

# Metrics
duration: 2min
completed: 2026-04-29
---

# Phase 81 Plan 05: Project Workspace KPI Strip and Page-Bar Summary

**44px workspace page-bar with RAG health badge and 5-column JBM 28px KPI strip (Phase, Progress, Days to Go-Live, Open Risks, Velocity) with Kata status token tinting for risky values**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-29T03:48:46Z
- **Completed:** 2026-04-29T03:51:37Z
- **Tasks:** 2
- **Files modified/created:** 4 (WorkspaceKpiStrip.tsx, WorkspacePageBarConfigurator.tsx, layout.tsx, ProjectHeader.tsx)

## Accomplishments
- Created `components/WorkspaceKpiStrip.tsx` — 5-column KPI grid with JBM 28px numerals; tones: Days to Go-Live (error if overdue, warning if <30d), Open Risks (error if highRisks>0, warning if openRisks>3), Velocity (neutral)
- Created `components/WorkspacePageBarConfigurator.tsx` — renders visible 44px page-bar with project name + health badge + ctaSlot; also injects PageBarContext for any context consumers
- Rebuilt `app/customer/[id]/layout.tsx` — removed old header div, added WorkspacePageBarConfigurator + WorkspaceKpiStrip above WorkspaceTabs; Kata canvas background on root div; loading fallback page-bar
- Updated `components/ProjectHeader.tsx` — replaced `text-zinc-900` and `text-zinc-500` with `var(--kata-on-container)` and `var(--kata-on-container-tertiary)` inline styles

## Task Commits

Each task was committed atomically:

1. **Task 1: Create WorkspaceKpiStrip component** - `46ace860` (feat(81-05): create WorkspaceKpiStrip component)
2. **Task 2: Rebuild workspace layout with KPI strip and page-bar wiring** - `18277221` (feat(81-05): rebuild workspace layout with KPI strip and page-bar)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `components/WorkspaceKpiStrip.tsx` - 5-column KPI grid, JBM 28px, Kata status token tinting, server component
- `components/WorkspacePageBarConfigurator.tsx` - 44px workspace page-bar + PageBarContext injection, client component
- `app/customer/[id]/layout.tsx` - workspace layout rebuilt; old header replaced; KPI strip above tabs; Kata canvas background
- `components/ProjectHeader.tsx` - zinc color classes replaced with Kata token inline styles

## Decisions Made
- `WorkspacePageBarConfigurator` renders its own visible 44px bar rather than relying purely on PageBarContext injection — the global `PageBar` suppresses itself on `/customer/` routes by design (Plan 81-02), so a self-rendering approach is required for workspace pages
- `WorkspaceKpiStrip` uses `openRiskCount` (the actual `ProjectWithHealth` field) rather than the plan-specified `openRisks` alias — field name discrepancy between the plan interface spec and the actual lib/queries.ts type
- `currentPhase` and `percentComplete` are optional overrides on the KPI strip props — these fields exist on `PortfolioProject` (getPortfolioData) but not on the base `ProjectWithHealth` from `getProjectWithHealth()`; defaults to '—' / null when not provided

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] WorkspacePageBarConfigurator renders visible bar directly**
- **Found during:** Task 2 (workspace layout rebuild)
- **Issue:** Plan specifies `WorkspacePageBarConfigurator` injecting into PageBarContext for the global PageBar to display, but PageBar.tsx suppresses itself on all `/customer/` routes by design (Plan 81-02 decision). Pure context injection would produce no visible page-bar on workspace pages.
- **Fix:** Made `WorkspacePageBarConfigurator` render its own 44px bar with project name + health badge, while also injecting into context for any future consumers.
- **Files modified:** `components/WorkspacePageBarConfigurator.tsx`
- **Verification:** Build clean; workspace routes compile correctly
- **Committed in:** 18277221 (Task 2 commit)

**2. [Rule 1 - Bug] Adapted field names to actual ProjectWithHealth type**
- **Found during:** Task 1 (WorkspaceKpiStrip creation)
- **Issue:** Plan interface spec uses `openRisks`, `currentPhase`, `percentComplete` but actual `ProjectWithHealth` type has `openRiskCount`; `currentPhase`/`percentComplete` are only on `PortfolioProject`.
- **Fix:** Used `openRiskCount` directly; made `currentPhase`/`percentComplete` optional props defaulting to '—'/null.
- **Files modified:** `components/WorkspaceKpiStrip.tsx`
- **Verification:** TypeScript build clean; workspace-kpi.test.ts 2/2 GREEN
- **Committed in:** 46ace860 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — adapting to actual codebase state vs plan assumptions)
**Impact on plan:** Both fixes necessary for correctness. KPI strip renders correctly with actual data shape. Page-bar is visible in workspace routes. No scope creep.

## Issues Encountered
- None beyond the two auto-fixed deviations above

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Workspace layout rebuilt to Kata spec: 44px page-bar + KPI strip + WorkspaceTabs
- workspace-kpi.test.ts 2/2 GREEN; production build clean; all workspace routes compile
- Plans 81-06 and 81-07 can proceed — workspace chrome is complete

## Self-Check: PASSED

- FOUND: components/WorkspaceKpiStrip.tsx (contains gridTemplateColumns, repeat(5))
- FOUND: components/WorkspacePageBarConfigurator.tsx (renders 44px bar + context injection)
- FOUND: app/customer/[id]/layout.tsx (uses WorkspaceKpiStrip, WorkspacePageBarConfigurator)
- FOUND: components/ProjectHeader.tsx (kata-on-container tokens)
- FOUND commit: 46ace860 (feat(81-05): create WorkspaceKpiStrip component)
- FOUND commit: 18277221 (feat(81-05): rebuild workspace layout with KPI strip and page-bar)
- Tests: workspace-kpi 2/2 GREEN
- Build: compiled successfully (exit 0)

---
*Phase: 81-kata-design-system-overhaul*
*Completed: 2026-04-29*
