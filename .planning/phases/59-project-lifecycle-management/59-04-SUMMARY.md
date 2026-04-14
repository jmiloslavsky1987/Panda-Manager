---
phase: 59-project-lifecycle-management
plan: 04
subsystem: ui
tags: [react, next.js, client-components, workspace-ui, lifecycle]

# Dependency graph
requires:
  - phase: 59-02
    provides: Project lifecycle API (PATCH archive/restore, DELETE with pre-flight checks)
provides:
  - ArchivedBanner component (amber banner with admin-only Restore button)
  - DangerZoneSection component (Archive + Delete Permanently buttons with admin guards)
  - Settings sub-tab in Admin tab group
  - Workspace layout injection of ArchivedBanner for archived projects
affects: [59-05, workspace-ui, admin-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client island components with admin role props from server"
    - "DeleteConfirmDialog reuse pattern for destructive actions"
    - "Layout-level isProjectAdmin resolution copied from members/page.tsx"

key-files:
  created:
    - bigpanda-app/components/ArchivedBanner.tsx
    - bigpanda-app/components/workspace/DangerZoneSection.tsx
    - bigpanda-app/app/customer/[id]/settings/page.tsx
  modified:
    - bigpanda-app/app/customer/[id]/layout.tsx
    - bigpanda-app/components/WorkspaceTabs.tsx

key-decisions:
  - "ArchivedBanner uses router.push('/') after restore to trigger sidebar rerender"
  - "Delete Permanently button disabled with tooltip when project not archived"
  - "Settings page returns no-access message for non-admins instead of null render"

patterns-established:
  - "Pattern: Server resolves isProjectAdmin, passes to client island via props"
  - "Pattern: Admin-only sections use isProjectAdmin prop for conditional rendering"
  - "Pattern: Destructive actions use DeleteConfirmDialog with async onConfirm"

requirements-completed: [PROJ-01, PROJ-02, PROJ-03, PROJ-04]

# Metrics
duration: 3min
completed: 2026-04-14
---

# Phase 59 Plan 04: Workspace Lifecycle UI Summary

**Amber archived banner, admin-only Restore button, Settings sub-tab with Danger Zone section for Archive/Delete actions**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-14T18:49:09Z
- **Completed:** 2026-04-14T18:52:03Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Admins can archive/delete/restore projects from workspace Settings tab
- All users see clear archived state via amber banner
- Restore action only visible to admins when project is archived
- Delete Permanently only available when project is already archived

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ArchivedBanner.tsx and DangerZoneSection.tsx client components** - `b2648f3` (feat)
2. **Task 2: Wire layout.tsx (ArchivedBanner injection), add settings/page.tsx, and update WorkspaceTabs** - `6eb2499` (feat)

## Files Created/Modified
- `bigpanda-app/components/ArchivedBanner.tsx` - Client island: amber banner with conditional Restore button for admins
- `bigpanda-app/components/workspace/DangerZoneSection.tsx` - Client island: Archive + Delete Permanently buttons with admin guards
- `bigpanda-app/app/customer/[id]/settings/page.tsx` - Server page: resolves isProjectAdmin, renders DangerZoneSection
- `bigpanda-app/app/customer/[id]/layout.tsx` - Server layout: resolves isProjectAdmin, injects ArchivedBanner when project.status === 'archived'
- `bigpanda-app/components/WorkspaceTabs.tsx` - TAB_GROUPS admin group gets 'settings' sub-tab added

## Decisions Made
- **ArchivedBanner navigation:** Used `router.push('/')` after restore to trigger sidebar rerender and avoid stale UI state
- **Delete Permanently guard:** Button is disabled with tooltip "Archive the project first" when project is not archived, enforcing two-step deletion
- **Settings page access:** Returns "no access" message for non-admins instead of null render for better UX

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Workspace UI complete for lifecycle management
- Ready for Plan 05 (Sidebar archived section integration)
- All lifecycle requirements (PROJ-01 through PROJ-04) now complete

---
*Phase: 59-project-lifecycle-management*
*Completed: 2026-04-14*

## Self-Check: PASSED

All files created and commits verified.
