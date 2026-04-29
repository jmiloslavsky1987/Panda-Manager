---
phase: 81-kata-design-system-overhaul
plan: "04"
subsystem: ui
tags: [portfolio-dashboard, kata-design-system, hero-stats, briefing-strip, project-grid, drizzle-orm, react-server-components]

# Dependency graph
requires:
  - phase: 81-02
    provides: "PageBarContext, usePageBar() hook, PageBar component wired into layout"
  - phase: 81-03
    provides: "Icon component; lucide-react fully removed from all 22 tracked files"
provides:
  - "PortfolioHeroStats: JBM 64px project count, RAG breakdown (green/yellow/red), week metrics stat band"
  - "PortfolioBriefingStrip: 3-column computed briefing cards with expandedId toggle; no AI calls"
  - "PortfolioProjectGrid: 2-column health-accented card grid with 3px left accent border + progress bar"
  - "PageBarTitleSetter: thin client island for injecting title+CTA into PageBarContext from server pages"
  - "getPortfolioBriefingData() and getPortfolioWeekMetrics() exported from lib/queries.ts"
  - "app/page.tsx rebuilt to KDS-05 spec; old PortfolioSummaryChips/PortfolioTableClient/PortfolioExceptionsPanel removed from page"
affects: [81-05, 81-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PageBarTitleSetter pattern: thin 'use client' island that calls usePageBar().setTitle() in useEffect — enables server pages to inject titles into global PageBar"
    - "PortfolioBriefingStrip expandedId toggle: useState<string|null>(null) + toggle fn — same pattern as DailyPrepCard and Outputs Library"
    - "getPortfolioBriefingData/getPortfolioWeekMetrics: RBAC-scoped via projectMembers subquery when userId present + !isGlobalAdmin; wrapped in try/catch with graceful zero/empty fallback"
    - "accessibleProjectIds computed once at function top, then threaded into each sub-query — avoids re-fetching project members per query"

key-files:
  created:
    - "components/PortfolioHeroStats.tsx — hero stat band server component"
    - "components/PortfolioBriefingStrip.tsx — 3-column briefing strip client component"
    - "components/PortfolioProjectGrid.tsx — 2-column project grid server component"
    - "components/PageBarTitleSetter.tsx — thin client island for PageBar title injection"
  modified:
    - "lib/queries.ts — added getPortfolioWeekMetrics, getPortfolioBriefingData, and 5 exported interfaces"
    - "app/page.tsx — full rebuild to KDS-05 spec; removed old portfolio components from page"

key-decisions:
  - "[81-04] PageBarTitleSetter is a separate component from WorkspacePageBarConfigurator — portfolio page uses global PageBar; workspace pages suppress it and render their own bar"
  - "[81-04] getPortfolioBriefingData uses raw sql`` for multi-table queries needing conditional array injection (accessibleProjectIds) — Drizzle inArray() not usable when list may be null (global admin)"
  - "[81-04] Icon component lacks style prop — color overrides wrapped in parent <span style> rather than adding style to Icon API"
  - "[81-04] needsAttention uses 'red-health' derived from open critical risks (same formula as computeHealth) — consistent with existing RAG computation"

patterns-established:
  - "Pattern: server pages use <PageBarTitleSetter title='...' ctaSlot={...} /> as first child to inject into global PageBar"
  - "Pattern: portfolio query functions take opts?: ProjectQueryOpts — same optional interface as getPortfolioData and getActiveProjects"

requirements-completed: [KDS-05]

# Metrics
duration: 5min
completed: 2026-04-29
---

# Phase 81 Plan 04: Portfolio Dashboard Rebuild (KDS-05) Summary

**Portfolio Dashboard rebuilt with JBM 64px hero stat band, 3-column DB-computed briefing strip (no AI calls), and 2-column health-accented project grid with 3px RAG accent borders and progress bars**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-29T03:48:16Z
- **Completed:** 2026-04-29T03:53:25Z
- **Tasks:** 2
- **Files modified:** 6 (2 modified, 4 created)

## Accomplishments

- Added `getPortfolioWeekMetrics` and `getPortfolioBriefingData` to lib/queries.ts — both RBAC-scoped, all sub-queries in try/catch with graceful zero/empty fallback
- Created PortfolioHeroStats (server), PortfolioBriefingStrip (client), PortfolioProjectGrid (server), PageBarTitleSetter (client)
- Rebuilt app/page.tsx: parallel Promise.all fetch, removed PortfolioSummaryChips/PortfolioTableClient/PortfolioExceptionsPanel from page
- portfolio-layout.test.ts: all 3 tests GREEN; production build clean (9.4s)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add getPortfolioBriefingData and getPortfolioWeekMetrics to lib/queries.ts** - `28e1e845` (feat(81-04))
2. **Task 2: Create portfolio component trio and rebuild app/page.tsx** - `3606efc6` (feat(81-04))

**Plan metadata:** (docs commit pending state update)

## Files Created/Modified

- `lib/queries.ts` — +274 lines: getPortfolioWeekMetrics, getPortfolioBriefingData + 5 exported interfaces (PortfolioWeekMetrics, ProjectGoLive, RiskEntry, AttentionProject, PortfolioBriefingData)
- `components/PortfolioHeroStats.tsx` — server component; JBM 64px count, RAGGroup, WeekStat sub-components; uses `--kata-status-green/amber/red` CSS vars
- `components/PortfolioBriefingStrip.tsx` — `'use client'`; expandedId toggle pattern; BriefingCard sub-component with icon + count badge + expand/collapse
- `components/PortfolioProjectGrid.tsx` — server component; ProjectCard with 3px left accent border, HealthBadge, StatChip, h-[3px] progress bar; Link to /customer/{id}/overview
- `components/PageBarTitleSetter.tsx` — `'use client'`; thin island calling usePageBar().setTitle + setCtaSlot in useEffect; renders null
- `app/page.tsx` — parallel fetch of projects/briefingData/weekMetrics; imports PortfolioHeroStats, PortfolioBriefingStrip, PortfolioProjectGrid, PageBarTitleSetter; `export const dynamic = 'force-dynamic'`

## Decisions Made

- PageBarTitleSetter is a separate component from WorkspacePageBarConfigurator — portfolio page uses the global PageBar (which renders on non-/customer/ routes); workspace suppresses global PageBar and renders its own bar
- Icon component has no `style` prop — color overrides wrapped in parent `<span style>` wrappers rather than extending Icon's API in this plan
- getPortfolioBriefingData needsAttention uses open `critical` severity risks to detect red health (consistent with computeHealth formula)
- accessibleProjectIds computed once at function start, reused across all three sub-queries to avoid redundant projectMembers joins

## Deviations from Plan

**1. [Rule 1 - Bug] Icon component lacks `style` prop — PortfolioBriefingStrip build error**
- **Found during:** Task 2 (PortfolioBriefingStrip creation)
- **Issue:** `<Icon ... style={{ color: ... }}>` passed a prop that doesn't exist on IconProps — TypeScript build error
- **Fix:** Wrapped Icon in `<span style={{ color: '...' }}>` instead; color set on parent span
- **Files modified:** components/PortfolioBriefingStrip.tsx
- **Verification:** Build passed cleanly after fix
- **Committed in:** 3606efc6 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - build-time type error on undeclared prop)
**Impact on plan:** Minor fix, no scope change. Icon API untouched per plan scope.

## Issues Encountered

- None beyond the Icon style prop fix above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- KDS-05 (Portfolio Dashboard rebuild) requirement complete
- PortfolioHeroStats, PortfolioBriefingStrip, PortfolioProjectGrid components available for any future layout changes
- PageBarTitleSetter pattern ready for other server pages (Plan 81-05, 81-06) that need to inject titles into the global PageBar
- Old component files (PortfolioSummaryChips, PortfolioTableClient, PortfolioExceptionsPanel) remain in codebase but unused on the portfolio page — can be removed in a cleanup pass

## Self-Check: PASSED

- FOUND: /Users/jmiloslavsky/Documents/Panda-Manager/components/PortfolioHeroStats.tsx
- FOUND: /Users/jmiloslavsky/Documents/Panda-Manager/components/PortfolioBriefingStrip.tsx
- FOUND: /Users/jmiloslavsky/Documents/Panda-Manager/components/PortfolioProjectGrid.tsx
- FOUND: /Users/jmiloslavsky/Documents/Panda-Manager/components/PageBarTitleSetter.tsx
- FOUND: lib/queries.ts exports getPortfolioWeekMetrics and getPortfolioBriefingData
- FOUND: app/page.tsx contains PortfolioHeroStats, PortfolioBriefingStrip, PortfolioProjectGrid
- FOUND commit: 28e1e845 (Task 1)
- FOUND commit: 3606efc6 (Task 2)
- Tests: portfolio-layout 3/3 GREEN
- Build: compiled successfully in 9.4s

---
*Phase: 81-kata-design-system-overhaul*
*Completed: 2026-04-29*
