---
phase: 58-per-project-rbac
plan: 04
subsystem: auth
tags: [rbac, project-members, next-auth, drizzle, shadcn-ui]

# Dependency graph
requires:
  - phase: 58-01
    provides: requireProjectRole helper, projectMembers table, projectMemberRoleEnum
provides:
  - Members CRUD API at /api/projects/[projectId]/members (GET/POST/PATCH/DELETE)
  - MembersTab component with add/change-role/remove actions
  - projectRole field on GET /api/projects/[projectId] response
  - Zero-admin guard preventing last admin removal
affects: [59-project-lifecycle, 64-editable-prompts, 65-project-scoped-scheduling]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin-only action visibility via isProjectAdmin prop pattern"
    - "DeleteConfirmDialog integration for destructive actions"
    - "Inline role Select for role management in tables"
    - "Zero-admin guard pattern for membership operations"

key-files:
  created:
    - bigpanda-app/app/api/projects/[projectId]/members/route.ts
    - bigpanda-app/components/workspace/MembersTab.tsx
    - bigpanda-app/app/customer/[id]/members/page.tsx
  modified:
    - bigpanda-app/app/api/projects/[projectId]/route.ts
    - bigpanda-app/components/WorkspaceTabs.tsx

key-decisions:
  - "Used Dialog onOpenChange instead of Button onClick for loadUsers to avoid race condition with DialogTrigger"
  - "Implemented zero-admin guard at API level (not just UI) for security"
  - "Global admins short-circuit to full access without checking project_members table"

patterns-established:
  - "Pattern 1: Admin action gates use isProjectAdmin prop derived from session + projectMembers lookup"
  - "Pattern 2: Zero-admin guard checks admin count before role change/removal to prevent lockout"
  - "Pattern 3: Audit log for all membership mutations (add, change role, remove)"

requirements-completed: [AUTH-02, AUTH-03, AUTH-04]

# Metrics
duration: 20min
completed: 2026-04-14
---

# Phase 58 Plan 04: Members Management UI Summary

**Members CRUD API with zero-admin guard, shadcn-ui Members tab with inline role management, and project-level admin action gating**

## Performance

- **Duration:** 20 min (2 min initial + 18 min continuation after human checkpoint)
- **Started:** 2026-04-13T23:38:41-07:00
- **Completed:** 2026-04-14T09:48:52-07:00
- **Tasks:** 3 (2 auto, 1 human-verify checkpoint)
- **Files modified:** 5

## Accomplishments
- Members CRUD API with GET (any member), POST/PATCH/DELETE (admin-only) at /api/projects/[projectId]/members
- Zero-admin guard prevents demoting or removing the last project admin
- MembersTab component with shadcn/ui Table, Badge, Select, Dialog, and DeleteConfirmDialog
- projectRole field added to GET /api/projects/[projectId] response for UI-level role gating
- Members sub-tab entry added to Admin tab in WorkspaceTabs (4th entry)

## Task Commits

Each task was committed atomically:

1. **Task 1: Members CRUD API + projectRole on GET** - `e8ab38d` (feat)
   - Created /api/projects/[projectId]/members/route.ts with GET/POST/PATCH/DELETE
   - Added projectRole to GET /api/projects/[projectId] response
   - Zero-admin guard in PATCH and DELETE handlers
   - Audit logging for all membership changes

2. **Task 2: MembersTab UI component + WorkspaceTabs wiring** - `1d0f2d5` (feat)
   - Created MembersTab.tsx with add/change-role/remove UI
   - Created /customer/[id]/members/page.tsx to render MembersTab
   - Added Members entry to Admin tab children in WorkspaceTabs.tsx

3. **Task 3: Fix Members UI bugs after human verification** - `4277eaa` (fix)
   - Moved loadUsers() from Button onClick to Dialog onOpenChange to fix Add Member button
   - Improved error handling to show specific API errors instead of generic "Network error"
   - Added try-catch around error JSON parsing to handle non-JSON responses

## Files Created/Modified
- `bigpanda-app/app/api/projects/[projectId]/members/route.ts` - Members CRUD API with JOIN to users table
- `bigpanda-app/app/api/projects/[projectId]/route.ts` - Added projectRole field to GET response
- `bigpanda-app/components/workspace/MembersTab.tsx` - Members management UI with shadcn components
- `bigpanda-app/app/customer/[id]/members/page.tsx` - Server component that renders MembersTab with isProjectAdmin prop
- `bigpanda-app/components/WorkspaceTabs.tsx` - Added Members sub-tab to Admin tab children

## Decisions Made
1. **Dialog onOpenChange pattern**: Used Dialog's onOpenChange handler instead of Button onClick to trigger loadUsers(). This avoids race conditions with DialogTrigger's automatic dialog opening behavior.

2. **Zero-admin guard at API level**: Implemented the zero-admin guard in the API handlers (PATCH and DELETE) rather than just the UI. This ensures security even if the UI is bypassed.

3. **Global admin short-circuit**: requireProjectRole checks resolveRole(session) === 'admin' first, allowing global admins full access without checking project_members. This simplifies admin workflows without compromising security.

4. **Error handling robustness**: Added nested try-catch in error response parsing to handle both JSON and non-JSON error responses gracefully, with console logging for debugging.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Add Member dialog not opening on button click**
- **Found during:** Task 3 (Human verification checkpoint)
- **Issue:** Button onClick handler inside DialogTrigger wasn't firing reliably due to DialogTrigger intercepting click events
- **Fix:** Moved loadUsers() call from Button onClick to Dialog onOpenChange handler, triggered when dialog state changes to open
- **Files modified:** bigpanda-app/components/workspace/MembersTab.tsx
- **Verification:** Dialog opens correctly and user list loads
- **Committed in:** 4277eaa (Task 3 commit)

**2. [Rule 1 - Bug] Generic "Network error" displayed for API errors**
- **Found during:** Task 3 (Human verification checkpoint)
- **Issue:** When API returned 403 or other errors, error JSON parsing could fail if response wasn't JSON, causing generic "Network error" message instead of specific error
- **Fix:** Added nested try-catch around error JSON parsing. If JSON parsing fails, construct error message from status code and statusText. Added console.error for debugging.
- **Files modified:** bigpanda-app/components/workspace/MembersTab.tsx
- **Verification:** Error messages now show specific API errors or "Error 403: Forbidden" format
- **Committed in:** 4277eaa (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both bugs discovered during human verification checkpoint. Fixes were necessary for correct functionality. No scope creep.

## Issues Encountered

**Human verification checkpoint findings:**
- User reported "network error loading members" — root cause was inadequate error handling when API returned 403 (user not a project member)
- User reported "Add Member button does nothing" — root cause was onClick handler race condition with DialogTrigger

**Resolution:**
- Improved error handling to show specific API error messages
- Refactored dialog opening to use onOpenChange pattern
- Both issues resolved in Task 3 fix commit

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Members management fully functional for project admins
- Zero-admin guard prevents lockout scenarios
- AUTH-02, AUTH-03, AUTH-04 requirements complete
- Ready for Phase 59 (Project Lifecycle) and Phase 65 (Project-Scoped Scheduling)
- Blocks Phase 64 (Editable Prompts UI) — admin-only RBAC now available

## Self-Check: PASSED

**Files created:**
- FOUND: bigpanda-app/app/api/projects/[projectId]/members/route.ts
- FOUND: bigpanda-app/components/workspace/MembersTab.tsx
- FOUND: bigpanda-app/app/customer/[id]/members/page.tsx

**Files modified:**
- FOUND: bigpanda-app/app/api/projects/[projectId]/route.ts (projectRole field added)
- FOUND: bigpanda-app/components/WorkspaceTabs.tsx (members entry added)

**Commits:**
- FOUND: e8ab38d (Task 1)
- FOUND: 1d0f2d5 (Task 2)
- FOUND: 4277eaa (Task 3 fix)

---
*Phase: 58-per-project-rbac*
*Completed: 2026-04-14*
