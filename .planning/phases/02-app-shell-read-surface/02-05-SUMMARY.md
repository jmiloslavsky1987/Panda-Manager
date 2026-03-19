---
phase: 02-app-shell-read-surface
plan: 05
subsystem: ui
tags: [nextjs, react, rsc, shadcn, tailwind, postgresql, drizzle]

# Dependency graph
requires:
  - phase: 02-app-shell-read-surface/02-04
    provides: workspace layout shell (layout.tsx, WorkspaceTabs, ProjectHeader, getProjectWithHealth)
  - phase: 01-data-foundation/01-02
    provides: Drizzle schema, getWorkspaceData() query function
provides:
  - Overview tab RSC: health banner, workstreams by track, milestone summary, go-live target
  - Actions tab RSC: full action table with status filter (searchParams), overdue detection, 50-row pagination
  - Risks tab RSC: severity-sorted risk register, unresolved high/critical highlighting, mitigation preview
  - Milestones tab RSC: incomplete-first sort, overdue detection, status badges
  - Teams tab RSC: workstreams by track, 14-day stall detection, amber stall badge
affects:
  - 02-06 (parallel Wave 3 plan — same workspace data shape)
  - Phase 3 (Action Manager writes to the same actions table displayed here)

# Tech tracking
tech-stack:
  added: [shadcn Table component (components/ui/table.tsx)]
  patterns:
    - RSC async params pattern for Next.js 15+ (params: Promise<{ id: string }>)
    - searchParams as Promise type for RSC filter pages (Next.js 15+)
    - Client-side filter state via URL searchParams (no client component needed)
    - Severity sort order via constant record (SEVERITY_ORDER)
    - Stall detection via date arithmetic on last_updated text field

key-files:
  created:
    - bigpanda-app/app/customer/[id]/overview/page.tsx
    - bigpanda-app/app/customer/[id]/actions/page.tsx
    - bigpanda-app/app/customer/[id]/risks/page.tsx
    - bigpanda-app/app/customer/[id]/milestones/page.tsx
    - bigpanda-app/app/customer/[id]/teams/page.tsx
    - bigpanda-app/components/ui/table.tsx
  modified: []

key-decisions:
  - "searchParams typed as Promise<{ status?: string }> in ActionsPage — required for Next.js 15 RSC compatibility"
  - "Overdue detection uses regex guard (^\\d{4}-\\d{2}-\\d{2}) before Date parsing — safely skips TBD/N/A strings"
  - "Milestone sort uses target ?? date fallback — schema has both fields, target is primary"
  - "Teams page focuses on workstream velocity only — stakeholder management deferred to Stakeholders tab (02-06)"
  - "WorkstreamTable extracted as internal RSC sub-component in teams/page.tsx — avoids prop drilling without needing 'use client'"

patterns-established:
  - "All tab pages: async RSC with getWorkspaceData() — no client fetching, no useEffect"
  - "Date guards: regex test before new Date() parse to handle TEXT date fields safely"
  - "Severity/status coloring via Record<string, string> lookup with fallback"
  - "Highlight rows via conditional className (bg-red-50, bg-orange-50) — not separate components"

requirements-completed: [WORK-01, WORK-03, WORK-04, WORK-05]

# Metrics
duration: 3min
completed: 2026-03-19
---

# Phase 2 Plan 05: Workspace Tab Pages (Overview, Actions, Risks, Milestones, Teams) Summary

**Five RSC workspace tab pages delivering live PostgreSQL data: health-aware Overview, filterable Actions table with overdue detection, severity-sorted Risk register, date-sorted Milestones tracker, and Track-grouped Teams velocity board with 14-day stall detection.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-19T21:41:00Z
- **Completed:** 2026-03-19T21:43:26Z
- **Tasks:** 2/2
- **Files modified:** 6 (5 pages + 1 shadcn Table component)

## Accomplishments

- Overview RSC: health banner (green/yellow/red) with signal breakdown, workstreams grouped ADR→Biggy by colored dot state indicator, top-5 recent milestones by date with link to milestones tab, go-live target at top
- Actions RSC: shadcn Table with all actions, URL searchParams status filter (All/Open/In Progress/Completed/Cancelled), overdue row highlighting (bg-red-50 + Overdue badge), 50-row pagination with count display
- Risks RSC: severity-sorted table (critical→high→medium→low), unresolved high/critical rows highlighted bg-orange-50, mitigation truncated at 150 chars, append-only info callout
- Milestones RSC: incomplete-first sort by target/date, past-dated non-completed milestones get red Overdue badge
- Teams RSC: workstreams split by track with stall detection (last_updated > 14 days + not complete = amber "Stalled 14+ days" badge), stall rule described at top

## Task Commits

Each task was committed atomically:

1. **Task 1: Overview tab and Actions tab** - `186ca74` (feat)
2. **Task 2: Risks, Milestones, and Teams tabs** - `bbc7b4e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `bigpanda-app/app/customer/[id]/overview/page.tsx` - Overview RSC: health, workstreams, milestone summary
- `bigpanda-app/app/customer/[id]/actions/page.tsx` - Actions RSC: table with filter, overdue, pagination
- `bigpanda-app/app/customer/[id]/risks/page.tsx` - Risks RSC: severity-sorted register with mitigation
- `bigpanda-app/app/customer/[id]/milestones/page.tsx` - Milestones RSC: overdue detection, incomplete-first sort
- `bigpanda-app/app/customer/[id]/teams/page.tsx` - Teams RSC: track grouping, 14-day stall detection
- `bigpanda-app/components/ui/table.tsx` - shadcn Table component (installed via npx shadcn@latest add table)

## Decisions Made

- `searchParams` typed as `Promise<{ status?: string }>` in ActionsPage — Next.js 15+ RSC requirement
- Overdue detection uses regex guard (`/^\d{4}-\d{2}-\d{2}/`) before `new Date()` parsing to safely skip TBD/N/A TEXT date fields
- Milestone sort uses `target ?? date` fallback — schema has both fields, target is the primary one
- Teams page focuses on workstream velocity only; stakeholder details belong in the Stakeholders tab (02-06)
- `WorkstreamTable` extracted as internal RSC sub-component in teams/page.tsx

## Deviations from Plan

None - plan executed exactly as written. shadcn Table installation was pre-specified in the plan's action block.

## Issues Encountered

None. Pre-existing TypeScript errors in `lib/settings.ts` and `app/api/settings/route.ts` (from 01-03) remain unchanged and are out of scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 5 tab pages ready; routes `/customer/:id/overview`, `/customer/:id/actions`, `/customer/:id/risks`, `/customer/:id/milestones`, `/customer/:id/teams` are live
- Wave 3 parallel plan 02-06 (Architecture, Decisions, History, Stakeholders tabs) can proceed independently
- Phase 3 Action Manager will write to the same actions table rendered in the Actions tab

---
*Phase: 02-app-shell-read-surface*
*Completed: 2026-03-19*
