---
phase: 75-schema-quick-wins-admin
plan: 05
subsystem: ui
tags: [next.js, react, drizzle-orm, zod, admin, settings, wbs, active-tracks]

# Dependency graph
requires:
  - phase: 75-schema-quick-wins-admin/75-01
    provides: active_tracks JSONB column on projects table (migration 0038)

provides:
  - ProjectSettingsForm client component with name, go-live, description, and ADR/Biggy track toggles
  - PATCH /api/projects/[projectId]/settings route with admin role gate and zod validation
  - Settings page wired to show ProjectSettingsForm above DangerZoneSection for all users (read-only for non-admins)
  - WbsTree active_tracks prop filtering — disabled track tabs hidden, expandedIds reset on change
  - WBS page fetches project and passes activeTracks to WbsTree (ADMIN-04 activation link)

affects: [76-pickers-risk-fields, 77-intelligence-gantt, wbs, settings]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Component fetches project → passes isAdmin + project to Client Island form"
    - "Client Island fires PATCH + router.refresh() on save"
    - "activeTracks prop as render-layer filter only — pipelines and skill context always receive full data"
    - "useEffect watching activeTracks prop to reset expandedIds (prevents stale hidden rows)"

key-files:
  created:
    - app/api/projects/[projectId]/settings/route.ts
    - components/ProjectSettingsForm.tsx
  modified:
    - app/customer/[id]/settings/page.tsx
    - components/WbsTree.tsx
    - app/customer/[id]/wbs/page.tsx

key-decisions:
  - "Non-admin sees read-only form (all fields disabled, no Save button) rather than access-denied page — removed early return for non-admins in settings page"
  - "Track filtering is render-layer only — skill context, extraction pipelines, and Gantt baselines always receive full WBS dataset"
  - "WBS page wraps getProjectWithHealth in .catch(() => null) so missing project degrades gracefully to showing both tracks"
  - "visibleTracks computed from activeTracks prop each render; useEffect resets expandedIds + activeTrack on prop change to prevent stale Set revealing hidden rows"

patterns-established:
  - "activeTracks prop pattern: optional { adr: boolean; biggy: boolean } defaulting to both enabled"
  - "visibleTracks array derived from activeTracks for conditional tab rendering"

requirements-completed: [ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04]

# Metrics
duration: 10min
completed: 2026-04-22
---

# Phase 75 Plan 05: Admin Settings Form + Active Tracks WBS Filter Summary

**ProjectSettingsForm with name/go-live/description/track toggles, PATCH /settings route with admin gate, and active_tracks render-layer filter in WbsTree wired through from the WBS page**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-22T20:15:00Z
- **Completed:** 2026-04-22T20:24:40Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Admin settings form with four field groups (name, go-live date, description, ADR/Biggy track toggles) — reads project from DB, patches via PATCH /api/projects/[projectId]/settings
- Non-admin users see all fields disabled with no Save button (read-only mode) instead of an access-denied page
- WbsTree now accepts optional activeTracks prop; disabled tracks have their tab buttons hidden; expandedIds and activeTrack reset via useEffect when prop changes (prevents stale hidden rows)
- WBS page now fetches project and passes active_tracks as activeTracks to WbsTree — the missing link that activates ADMIN-04

## Task Commits

Each task was committed atomically:

1. **Task 1: Create /api/projects/[projectId]/settings PATCH route and ProjectSettingsForm component** - `41927c16` (feat)
2. **Task 2: Wire settings page, add active_tracks filter to WbsTree, update WBS page caller** - `b3b65c45` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `app/api/projects/[projectId]/settings/route.ts` - PATCH handler with requireProjectRole('admin') gate, zod validation, Drizzle update
- `components/ProjectSettingsForm.tsx` - Client component with name/go-live/description inputs and ADR/Biggy checkboxes; isAdmin controls edit/read-only mode
- `app/customer/[id]/settings/page.tsx` - Now renders ProjectSettingsForm above DangerZoneSection; non-admin early return removed (form handles read-only)
- `components/WbsTree.tsx` - Added activeTracks prop, visibleTracks computed array, conditional tab rendering, useEffect for expandedIds reset, "all tracks disabled" fallback
- `app/customer/[id]/wbs/page.tsx` - Now fetches project via getProjectWithHealth and passes activeTracks={activeTracks} to WbsTree

## Decisions Made

- Non-admin sees read-only form rather than an access-denied page — better UX and allows non-admins to see current settings without edits
- Track filtering is render-layer only — skill context, extraction pipelines, and Gantt baselines always receive full WBS dataset regardless of active_tracks setting
- WBS page wraps getProjectWithHealth in .catch(() => null) so a missing project degrades gracefully (shows both tracks) rather than crashing the WBS page
- visibleTracks recomputed each render from activeTracks prop; separate useEffect resets expandedIds + activeTrack when prop changes to prevent stale Set revealing hidden rows

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript errors in test files (`__tests__/lifecycle/` and `tests/audit/`) were out of scope and pre-dated this plan — no new source file errors introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ADMIN-01 through ADMIN-04 complete — project name, go-live date, description, and active track toggles all persist via the new PATCH route
- Phase 75 fully complete — all 5 plans done
- Phase 76 (Pickers & Risk Fields) can proceed: owner/dependency/milestone FK pickers and risk structured fields; also fixes tasks-bulk multi-tenant security gap

---
*Phase: 75-schema-quick-wins-admin*
*Completed: 2026-04-22*
