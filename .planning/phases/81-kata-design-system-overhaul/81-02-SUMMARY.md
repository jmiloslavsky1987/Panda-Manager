---
phase: 81-kata-design-system-overhaul
plan: "02"
subsystem: ui
tags: [command-rail, sidebar, page-bar, context-api, dark-mode, kata-tokens, material-symbols, tailwind4]

# Dependency graph
requires:
  - phase: 81-01
    provides: kata-tokens.css two-layer token architecture, Icon.tsx, ThemeProvider.tsx, data-theme=dark CSS isolation block

provides:
  - "components/Sidebar.tsx rebuilt as 240px dark Command Rail with data-theme=dark, ⌘K pill, top nav, project list, user footer"
  - "components/PageBarContext.tsx with PageBarProvider, usePageBar, PageBarContext exports"
  - "components/PageBar.tsx 44px top bar with breadcrumb, ctaSlot, and theme toggle"
  - "app/layout.tsx wired with PageBarProvider wrapping main, PageBar rendered in main, HeaderBar/GlobalProjectSearchBar removed"
  - "SidebarProjectItem.tsx updated with Kata token RAG dots and JBM font for go-live dates"
  - "SidebarUserIsland.tsx with LogOut lucide replaced by <Icon name='logout' />"

affects: [81-03, 81-04, 81-05, 81-06, 81-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PageBarContext pattern: title + ctaSlot injected by page-level components; consumed by PageBar client component"
    - "Suppression pattern: PageBar reads usePathname() and returns null on /login, /setup, /customer/ routes — same logic as removed HeaderBar"
    - "Theme toggle: toggles document.documentElement.classList.toggle('dark') + localStorage.setItem('kata-theme') in PageBar — kata-theme remains the single source of truth"
    - "Command Rail isolation: data-theme=dark on <aside> provides pure-CSS dark rail independent of html.dark page toggle"
    - "Kata token RAG dots in SidebarProjectItem use --kata-status-green/amber/red CSS vars via inline style"
    - "JBM font for go-live date via fontFamily: var(--font-mono) inline style"

key-files:
  created:
    - "components/PageBarContext.tsx"
    - "components/PageBar.tsx"
  modified:
    - "components/Sidebar.tsx"
    - "components/SidebarProjectItem.tsx"
    - "components/SidebarUserIsland.tsx"
    - "app/layout.tsx"

key-decisions:
  - "[81-02] PageBarProvider placed outside AppChrome to avoid server/client boundary issues — PageBarProvider is a client component, AppChrome handles server Sidebar composition separately"
  - "[81-02] PageBar theme toggle uses MutationObserver on html.classList to keep isDark state in sync with external theme changes (e.g. ThemeProvider)"
  - "[81-02] body className reduced from 'h-full flex bg-zinc-50' to 'h-full flex' — background now controlled by Kata tokens via bg-background Tailwind alias"
  - "[81-02] Additional nav links (Knowledge Base, Outputs, Settings, Scheduler, Time Tracking) preserved with data-testid attributes, migrated to <Icon> components"

patterns-established:
  - "Pattern: usePageBar() hook for page-level title/CTA injection into top bar"
  - "Pattern: ctaSlot ReactNode for flexible right-side CTA composition without prop drilling"

requirements-completed: [KDS-03, KDS-04, KDS-08]

# Metrics
duration: 5min
completed: 2026-04-29
---

# Phase 81 Plan 02: Command Rail and PageBar Summary

**Sidebar rebuilt as 240px dark Command Rail (data-theme=dark) with ⌘K pill; new PageBarContext/PageBar 44px top bar wired into layout replacing HeaderBar**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-29T03:33:45Z
- **Completed:** 2026-04-29T03:39:00Z
- **Tasks:** 2
- **Files modified/created:** 6 (PageBarContext.tsx, PageBar.tsx, Sidebar.tsx, SidebarProjectItem.tsx, SidebarUserIsland.tsx, layout.tsx)

## Accomplishments
- Created `components/PageBarContext.tsx` with `PageBarProvider`, `usePageBar`, and `PageBarContext` exports — provides title + ctaSlot injection pattern for all pages
- Created `components/PageBar.tsx` — 44px top bar reading context for breadcrumb/ctaSlot, theme toggle with MutationObserver sync, suppression via usePathname for login/setup/customer routes
- Rebuilt `components/Sidebar.tsx` as 240px dark Command Rail: `data-theme="dark"` on `<aside>`, ⌘K search pill, top nav (Portfolio/Today/Daily Prep), project list with RAG dots, additional nav links, user footer — all lucide icons replaced with `<Icon>`
- Updated `components/SidebarProjectItem.tsx` with Kata token RAG dots (`--kata-status-green/amber/red`) and JBM `font-mono` for go-live dates
- Updated `components/SidebarUserIsland.tsx` replacing lucide `LogOut` with `<Icon name="logout" />`
- Updated `app/layout.tsx`: PageBarProvider wraps main, PageBar renders in main, HeaderBar and GlobalProjectSearchBar removed, `bg-zinc-50` removed from body (Kata tokens handle background)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PageBarContext.tsx and PageBar.tsx** - `eb938b67` (feat(81-02): add PageBarContext and PageBar components)
2. **Task 2: Rebuild Sidebar.tsx as Command Rail + update layout.tsx chrome** - `53af1cb5` (feat(81-02): rebuild Sidebar as Command Rail and wire PageBar into layout)

## Files Created/Modified
- `components/PageBarContext.tsx` - React Context with PageBarProvider/usePageBar exports and title+ctaSlot state
- `components/PageBar.tsx` - 44px top bar with breadcrumb, ctaSlot, theme toggle; suppresses on /login/setup/customer routes
- `components/Sidebar.tsx` - 240px dark Command Rail with data-theme=dark, ⌘K pill, top nav, project list, nav links, user footer
- `components/SidebarProjectItem.tsx` - Kata token RAG dots via --kata-status-* CSS vars, JBM font for go-live dates
- `components/SidebarUserIsland.tsx` - LogOut lucide icon replaced with <Icon name="logout" />
- `app/layout.tsx` - PageBarProvider wrapping main, PageBar in main, HeaderBar/GlobalProjectSearchBar removed, bg-zinc-50 removed

## Decisions Made
- `PageBarProvider` placed outside `AppChrome` wrapper to maintain clean server/client boundary separation — `AppChrome` handles async server `Sidebar` composition; `PageBarProvider` is purely client context
- `PageBar` theme toggle uses `MutationObserver` on `html.classList` to keep `isDark` local state in sync with any external theme changes (e.g. ThemeProvider initial load, flash-prevention script)
- `body className` simplified from `"h-full flex bg-zinc-50"` to `"h-full flex"` — background now fully controlled by Kata tokens via `@theme inline bg-background` alias in globals.css
- Additional nav links (Knowledge Base, Outputs, Settings, Scheduler, Time Tracking) preserved with all `data-testid` attributes, icons migrated from lucide to `<Icon>` using Material Symbols names

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- git stash (used to verify pre-existing build error) caused a brief state disruption; stash pop restored working tree correctly and all my changes remained intact
- Pre-existing TypeScript error in `ProjectWizard.tsx` (`Cannot find name 'Check'`) was present in an older committed version but the current working tree already has `<Icon name="check" />` — build passes cleanly with current files

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Command Rail chrome complete. Plans 81-03 (lucide migration), 81-04 (Portfolio page), and 81-05 (customer pages) can all consume the new chrome
- PageBarContext pattern ready for page-level title/CTA injection in Plans 81-04 and 81-05
- command-rail.test.ts (4/4 GREEN), page-bar.test.ts (4/4 GREEN), sidebar-daily-prep.test.ts (2/2 GREEN)
- Production build clean

## Self-Check: PASSED

- FOUND: components/PageBarContext.tsx
- FOUND: components/PageBar.tsx
- FOUND: components/Sidebar.tsx (rebuilt with data-theme=dark, ⌘K pill)
- FOUND: components/SidebarProjectItem.tsx (Kata token RAG dots)
- FOUND: components/SidebarUserIsland.tsx (Icon logout)
- FOUND: app/layout.tsx (PageBarProvider wrap, PageBar in main, HeaderBar removed)
- FOUND commit: eb938b67 (feat(81-02): add PageBarContext and PageBar components)
- FOUND commit: 53af1cb5 (feat(81-02): rebuild Sidebar as Command Rail and wire PageBar into layout)
- Tests: command-rail 4/4 GREEN, page-bar 4/4 GREEN, sidebar-daily-prep 2/2 GREEN
- Build: compiled successfully in 9.5s

---
*Phase: 81-kata-design-system-overhaul*
*Completed: 2026-04-29*
