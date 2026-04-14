---
phase: 58-per-project-rbac
plan: 01
subsystem: auth
tags: [rbac, security, foundation, tdd]
dependency_graph:
  requires: [AUTH-02]
  provides: [requireProjectRole, project_members_table]
  affects: [all_route_handlers]
tech_stack:
  added: [project_member_role_enum, project_members_table]
  patterns: [global_admin_short_circuit, per_project_membership]
key_files:
  created:
    - bigpanda-app/db/migrations/0032_project_members.sql
    - bigpanda-app/lib/__tests__/require-project-role.test.ts
  modified:
    - bigpanda-app/db/schema.ts
    - bigpanda-app/lib/auth-server.ts
decisions:
  - Global admins (resolveRole returns 'admin') bypass project_members queries entirely
  - Bootstrap migration seeds all existing users as Admin on all existing projects (no access loss on deploy)
  - project_members uses unique constraint on (project_id, user_id) to prevent duplicate memberships
  - Default project role is 'user' when not specified in requireProjectRole calls
metrics:
  duration_seconds: 244
  tasks_completed: 1
  tests_added: 7
  commits: 2
  completed_at: "2026-04-14T06:34:14Z"
requirements_completed:
  - AUTH-03
  - AUTH-04
  - AUTH-05
---

# Phase 58 Plan 01: requireProjectRole() + project_members schema Summary

**One-liner:** TDD implementation of requireProjectRole() auth wrapper with project_members DB table and bootstrap migration seeding all users as admins

## Overview

Created the RBAC foundation that all downstream plans depend on: the `project_members` table, migration with bootstrap seed, and the `requireProjectRole()` function. Followed strict TDD cycle (RED → GREEN) with 7 tests covering all auth/role check branches.

## What Was Built

### Core Artifacts

1. **project_members Table**
   - Schema: `project_id`, `user_id`, `role` enum (admin/user), `created_at`
   - Unique constraint on (project_id, user_id)
   - Cascade deletes on both project and user removal
   - Added to `bigpanda-app/db/schema.ts` after projects table

2. **requireProjectRole() Function**
   - Location: `bigpanda-app/lib/auth-server.ts`
   - Signature: `requireProjectRole(projectId: number, minRole?: 'admin' | 'user'): Promise<ProjectRoleResult>`
   - Returns: `{ session, redirectResponse: null, projectRole }` on success or `{ session: null, redirectResponse, projectRole: null }` on failure
   - Global admin short-circuit: if `resolveRole(session) === 'admin'`, returns immediately without DB query

3. **Migration 0032**
   - Creates `project_member_role` enum type
   - Creates `project_members` table with proper constraints
   - Bootstrap INSERT: seeds all existing users as Admin on all existing projects via CROSS JOIN
   - Ensures zero access loss on deploy

4. **Unit Tests**
   - 7 test cases covering all branches
   - Tests: unauthenticated → 401, global admin short-circuit, admin member, user member, insufficient role → 403, non-member → 403, default minRole
   - All GREEN with proper mocking of auth.api.getSession, resolveRole, and db

## Key Decisions

| Decision | Rationale | Impact |
|----------|-----------|---------|
| Global admin short-circuit | Admins need access to all projects without explicit membership | Simplifies admin UX, reduces DB queries for admin users |
| Bootstrap all users as Admin | Prevent lockouts on deploy | Every existing user retains full access to existing projects |
| Unique constraint on (project_id, user_id) | Prevent duplicate memberships | Enforces data integrity at DB level |
| Default minRole='user' | Most routes only need basic membership check | Simpler route handler code |

## Deviations from Plan

None - plan executed exactly as written.

## Test Results

```
✓ lib/__tests__/require-project-role.test.ts (7 tests)
  ✓ returns 401 for unauthenticated requests
  ✓ short-circuits for global admins without querying project_members
  ✓ returns admin projectRole for members with admin role when minRole is user
  ✓ returns user projectRole for members with user role when minRole is user
  ✓ returns 403 for user-role members when minRole is admin
  ✓ returns 403 for non-members
  ✓ defaults minRole to user when not specified
```

Full test suite: 149 passed, 4 expected RED stubs (portfolio), no regressions.

## Commits

- `14cf7bc` - test(58-01): add failing tests for requireProjectRole (RED phase)
- `e035b25` - feat(58-01): implement requireProjectRole and project_members schema (GREEN phase)

## Files Modified

### Created
- `bigpanda-app/db/migrations/0032_project_members.sql` (20 lines) - DDL + bootstrap seed
- `bigpanda-app/lib/__tests__/require-project-role.test.ts` (210 lines) - Unit tests

### Modified
- `bigpanda-app/db/schema.ts` (+20 lines) - Added projectMemberRoleEnum, projectMembers table
- `bigpanda-app/lib/auth-server.ts` (+62 lines) - Added requireProjectRole function + ProjectRoleResult type

## Success Criteria Verification

- [x] `lib/__tests__/require-project-role.test.ts` passes 7 tests GREEN
- [x] `requireProjectRole` exported from `lib/auth-server.ts` with correct TypeScript types
- [x] `projectMembers` table exported from `db/schema.ts`
- [x] `db/migrations/0032_project_members.sql` contains CREATE TABLE + bootstrap INSERT
- [x] Full test suite still passing (no regressions)

## Blockers

None.

## Next Steps

Plan 58-02 will migrate all 40+ route handlers to use `requireProjectRole()` instead of `requireSession()`, enforcing per-project access control across the entire API surface.

---

**Duration:** 244 seconds (4 minutes)
**Completed:** 2026-04-14T06:34:14Z
**Type:** TDD foundation (RED → GREEN)

## Self-Check: PASSED

All files and commits verified:
- ✓ bigpanda-app/db/migrations/0032_project_members.sql
- ✓ bigpanda-app/lib/__tests__/require-project-role.test.ts
- ✓ Commit 14cf7bc (RED phase)
- ✓ Commit e035b25 (GREEN phase)
