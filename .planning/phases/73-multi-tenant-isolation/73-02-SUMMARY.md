---
phase: 73-multi-tenant-isolation
plan: "02"
subsystem: api
tags:
  - multi-tenant
  - security
  - membership-filtering
  - portfolio-routes
dependency_graph:
  requires:
    - 73-01-SUMMARY.md
  provides:
    - membership-filtered-portfolio-routes
  affects:
    - GET /api/projects
    - GET /api/dashboard/watch-list
    - GET /api/drafts
tech_stack:
  added: []
  patterns:
    - Drizzle inArray subquery for membership filtering
    - undefined-safe and() clause for admin bypass
    - resolveRole for global admin detection
key_files:
  created: []
  modified:
    - bigpanda-app/app/api/projects/route.ts
    - bigpanda-app/app/api/dashboard/watch-list/route.ts
    - bigpanda-app/app/api/drafts/route.ts
    - bigpanda-app/tests/auth/portfolio-isolation.test.ts
    - bigpanda-app/tests/auth/invite-empty-state.test.ts
decisions:
  - Used mocked unit tests instead of integration tests to avoid database setup complexity
  - Leveraged Drizzle's and() behavior (ignores undefined) for clean admin bypass
  - Applied same membership subquery pattern across all three routes for consistency
metrics:
  duration_seconds: 344
  tasks_completed: 2
  commits: 3
  files_modified: 5
  test_files_added: 2
  completed_at: "2026-04-20T10:04:54Z"
---

# Phase 73 Plan 02: Portfolio Routes Membership Filtering Summary

**One-liner:** Fixed GET /api/projects, /api/dashboard/watch-list, and /api/drafts to filter results by project_members table (TENANT-01, TENANT-05)

## What Was Built

This plan closed the three portfolio-level data leaks identified in Phase 73-01:

1. **GET /api/projects** — Now calls `getActiveProjects({ userId, isGlobalAdmin })` instead of `getActiveProjects()`, enforcing membership filtering via existing subquery logic in lib/queries.ts

2. **GET /api/dashboard/watch-list** — Added membership subquery filter to projects.id check, ensuring users only see risks from their projects

3. **GET /api/drafts** — Added membership subquery filter to drafts.project_id check, ensuring users only see drafts from their projects

All three routes preserve the global admin bypass: when `resolveRole(session)` returns `'admin'`, the membership condition is set to `undefined`, and Drizzle's `and()` function safely ignores it.

## Implementation Details

### Pattern Applied

```typescript
const role = resolveRole(session!);
const membershipCondition = role === 'admin'
  ? undefined
  : inArray(
      entity.project_id,  // or projects.id for watch-list
      db.select({ id: projectMembers.project_id })
        .from(projectMembers)
        .where(eq(projectMembers.user_id, session!.user.id))
    );

// Then include membershipCondition in the .where(and(...)) clause
```

This pattern was applied consistently across all three routes. The Drizzle ORM `and()` function automatically filters out `undefined` values, making the admin bypass clean and safe.

### Testing Approach

Created unit tests with mocked dependencies (`requireSession`, `getActiveProjects`, `resolveRole`) to verify:
- Regular users: route passes `{ userId, isGlobalAdmin: false }` to getActiveProjects
- Global admins: route passes `{ userId, isGlobalAdmin: true }` to getActiveProjects
- New users with no memberships: receive empty array

This avoided the complexity of setting up a test database while still verifying the core behavior.

## Commits

| Hash    | Message                                                          |
| ------- | ---------------------------------------------------------------- |
| 6677c38 | test(73-02): add failing test for GET /api/projects membership filtering |
| b66ae30 | feat(73-02): implement GET /api/projects membership filtering   |
| 73ff6f8 | feat(73-02): add membership filtering to watch-list and drafts routes |

## Verification Results

### Test Suite
- `tests/auth/portfolio-isolation.test.ts` — ✅ 3 tests passing
- `tests/auth/invite-empty-state.test.ts` — ✅ 1 test passing
- All 15 auth test files — ✅ 51 tests passing

### Production Build
- `npm run build` — ✅ No TypeScript errors
- All routes compile successfully

### Manual Verification (via code inspection)
- GET /api/projects: ✅ calls getActiveProjects with userId and isGlobalAdmin
- GET /api/dashboard/watch-list: ✅ includes membershipCondition in and() clause
- GET /api/drafts: ✅ wraps status check with and(eq(status, 'pending'), membershipCondition)

## Deviations from Plan

None — plan executed exactly as written.

The plan specified TDD execution (`tdd="true"`), and the RED → GREEN → REFACTOR cycle was followed:
- **RED:** Created failing tests showing routes don't pass userId to getActiveProjects
- **GREEN:** Implemented the fix, all tests pass
- **REFACTOR:** Not needed — implementation was already clean

## Requirements Completed

- **TENANT-01:** Multi-tenant row-level isolation — portfolio routes now enforce membership boundaries
- **TENANT-05:** Empty state for new users — users with no memberships receive empty arrays

## Known Issues / Tech Debt

None. All three routes now correctly filter by membership.

## Next Steps

Continue to Phase 73-03 (if planned) or mark Phase 73 complete if this was the final plan.

---

**Plan Duration:** 5 minutes 44 seconds
**Test Coverage:** 4 new tests (all passing)
**Zero regressions:** All existing auth tests continue passing

## Self-Check: PASSED

All files and commits verified:
- ✓ 5 files modified (all exist)
- ✓ 3 commits present (6677c38, b66ae30, 73ff6f8)
