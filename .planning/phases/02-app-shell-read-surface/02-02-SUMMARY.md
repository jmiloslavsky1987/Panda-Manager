---
phase: 02-app-shell-read-surface
plan: 02
subsystem: ui
tags: [shadcn, tailwind, react, nextjs, drizzle, sidebar, rsc]

# Dependency graph
requires:
  - phase: 01-data-foundation
    provides: Drizzle schema + db pool — projects, actions, risks, milestones, workstreams, engagementHistory, keyDecisions, stakeholders, artifacts, outputs tables
  - phase: 02-01
    provides: Next.js 16 + Tailwind v4 app skeleton
provides:
  - shadcn/ui component library (badge, card, tabs, dialog, button, separator) at components/ui/
  - lib/utils.ts cn() helper
  - lib/queries.ts — all Phase 2 server-side DB query functions
  - Sidebar RSC with RAG dots and project list
  - SidebarProjectItem RSC with health dot + customer name + go-live date
  - Root layout with fixed dark sidebar + light main content area
affects:
  - 02-03 (dashboard page — uses getDashboardData, shadcn Card/Badge)
  - 02-04 (customer overview — uses getWorkspaceData, getProjectById)
  - 02-05 through 02-07 (workspace tabs — all use getWorkspaceData)

# Tech tracking
tech-stack:
  added:
    - shadcn/ui 4.1.0 (Radix style, RSC mode)
    - class-variance-authority (shadcn peer dep)
    - clsx (shadcn peer dep)
    - tailwind-merge (shadcn peer dep)
    - lucide-react (icon library)
    - @radix-ui/react-dialog
    - @radix-ui/react-separator
    - @radix-ui/react-slot
    - @radix-ui/react-tabs
  patterns:
    - RSC query pattern: async Server Components call DB query functions directly (no API layer)
    - RAG scoring: score = overdueActions + stalledMilestones + highRisks; >=2 red, 1 yellow, 0 green
    - Stalled milestone proxy: created_at + 14 days (no last_updated column on milestones)
    - Overdue action filter: regex ^\d{4}-\d{2}-\d{2} to exclude TBD/N/A strings before date comparison
    - No server-only import (same policy as db/index.ts, see STATE.md 2026-03-19 01-02)

key-files:
  created:
    - bigpanda-app/lib/queries.ts
    - bigpanda-app/lib/utils.ts
    - bigpanda-app/components/Sidebar.tsx
    - bigpanda-app/components/SidebarProjectItem.tsx
    - bigpanda-app/components/ui/badge.tsx
    - bigpanda-app/components/ui/button.tsx
    - bigpanda-app/components/ui/card.tsx
    - bigpanda-app/components/ui/dialog.tsx
    - bigpanda-app/components/ui/separator.tsx
    - bigpanda-app/components/ui/tabs.tsx
    - bigpanda-app/components.json
  modified:
    - bigpanda-app/app/layout.tsx
    - bigpanda-app/app/globals.css
    - bigpanda-app/package.json

key-decisions:
  - "shadcn/ui initialized via components.json (non-interactive) to avoid --yes flag prompt issue with Radix/Base selector"
  - "lib/utils.ts added manually (shadcn init did not create it when using --yes without interactive mode)"
  - "Stalled milestone heuristic uses created_at as proxy — milestones table has no last_updated column"
  - "Overdue actions: regex filter on due field to skip TBD/N/A before date comparison"
  - "Dev server ready, npm run build fails on pre-existing Phase 1 settings route error (deferred, not new)"

patterns-established:
  - "RSC data pattern: async component calls query function directly, no useState/useEffect"
  - "RAG dot: inline-block w-2 h-2 rounded-full mapped from health string"
  - "Sidebar layout: fixed left-0 w-60 zinc-900 with ml-60 main content area"

requirements-completed: [DASH-02, DASH-03, WORK-01]

# Metrics
duration: 3min
completed: 2026-03-19
---

# Phase 2 Plan 02: App Shell + Query Library Summary

**shadcn/ui installed with 6 components, dark sidebar RSC with RAG health dots, and full DB query library (getActiveProjects, getDashboardData, getWorkspaceData, getProjectById) using Drizzle ORM**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-19T21:30:42Z
- **Completed:** 2026-03-19T21:33:42Z
- **Tasks:** 2/2
- **Files modified:** 13

## Accomplishments

- Installed shadcn/ui (Radix style) with badge, card, tabs, dialog, button, separator + all utility peer deps
- Created `lib/queries.ts` with 4 exported async functions — RAG scoring, parallel workspace queries, RLS session variable, recent activity union
- Built Sidebar RSC (zinc-900 fixed sidebar, BigPanda PS header, Dashboard link, project list) and SidebarProjectItem RSC (RAG dot + customer name + go-live date)
- Rewrote root layout: system-ui font, fixed sidebar + ml-60 main content, metadata updated to "BigPanda PS"

## Task Commits

Each task was committed atomically:

1. **Task 1: Install shadcn/ui and create the DB query library** - `1edc716` (feat)
2. **Task 2: Rewrite root layout with sidebar + content shell** - `872b923` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `bigpanda-app/lib/queries.ts` - All Phase 2 server-side DB query functions with TypeScript interfaces
- `bigpanda-app/lib/utils.ts` - shadcn cn() utility helper
- `bigpanda-app/components/Sidebar.tsx` - RSC sidebar: fixed dark, project list with health dots
- `bigpanda-app/components/SidebarProjectItem.tsx` - RSC project row: RAG dot + customer + go-live date
- `bigpanda-app/components/ui/` - 6 shadcn components: badge, button, card, dialog, separator, tabs
- `bigpanda-app/components.json` - shadcn configuration
- `bigpanda-app/app/layout.tsx` - Root layout rewrite: Sidebar + main content area
- `bigpanda-app/app/globals.css` - system-ui font, sidebar CSS vars, removed Geist

## Decisions Made

- shadcn/ui initialized via `components.json` written manually then `npx shadcn@latest add` (non-interactive) — the `--yes` flag alone does not skip the Radix/Base selector prompt
- `lib/utils.ts` created manually because shadcn `add` without full `init` flow did not generate it
- Stalled milestone heuristic: uses `created_at` as proxy for last activity (milestones table has no `last_updated` column)
- Overdue action filter: regex `^\d{4}-\d{2}-\d{2}` on `due` text field to exclude TBD/N/A strings before date comparison

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added lib/utils.ts and installed shadcn peer dependencies manually**
- **Found during:** Task 1 (shadcn/ui installation)
- **Issue:** shadcn components import `@/lib/utils` (cn helper) but shadcn `add` without full interactive init did not create it; also `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` were not in package.json
- **Fix:** Ran `npm install class-variance-authority clsx tailwind-merge lucide-react`; wrote `lib/utils.ts` with `cn()` function
- **Files modified:** bigpanda-app/lib/utils.ts, bigpanda-app/package.json
- **Verification:** TypeScript reports no errors in components or queries.ts
- **Committed in:** 1edc716 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — missing shadcn peer deps and utils file)
**Impact on plan:** Necessary for shadcn components to compile. No scope creep.

## Issues Encountered

- `npm run build` (production Turbopack build) fails on pre-existing Phase 1 settings route error (`../../lib/settings` module resolution). This is NOT new — documented in STATE.md deferred items. Dev server (`npm run dev`) starts cleanly and serves 200 at localhost:3000.

## User Setup Required

None - no external service configuration required. Dev server runs immediately.

## Next Phase Readiness

- shadcn/ui and all utility packages installed — Phase 2 plans 02-03 through 02-07 can import Badge, Card, Tabs, Dialog, Button directly
- `lib/queries.ts` is the single source of truth for Phase 2 data fetching — all plans should import from here, not write new DB queries
- Root layout with sidebar is live — any page route added will automatically get the sidebar
- The pre-existing settings route build error must be resolved before the app is production-deployable (deferred to later phase)

---
*Phase: 02-app-shell-read-surface*
*Completed: 2026-03-19*
