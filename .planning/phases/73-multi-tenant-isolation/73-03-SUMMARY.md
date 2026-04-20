---
phase: 73-multi-tenant-isolation
plan: "03"
subsystem: auth
tags: [auth, security, tenant-isolation, rbac]
dependency_graph:
  requires: [73-01, 73-02]
  provides: [route-level-project-membership-enforcement]
  affects: [artifacts-routes, tasks-routes, ingestion-routes]
tech_stack:
  added: []
  patterns: [requireProjectRole-query-param-pattern, requireProjectRole-formdata-pattern]
key_files:
  created: [tests/auth/query-param-403.test.ts]
  modified:
    - app/api/artifacts/route.ts
    - app/api/tasks/route.ts
    - app/api/ingestion/upload/route.ts
    - app/api/ingestion/extract/route.ts
decisions:
  - Parse request data (query params, body, formData) BEFORE auth check to extract projectId
  - Replace requireSession() with requireProjectRole(projectId) for all project-scoped routes
  - Auth check order: extract projectId → validate format → requireProjectRole → query/mutate
metrics:
  duration_seconds: 251
  tasks_completed: 2
  files_modified: 5
  test_coverage: 6 new tests (all GREEN)
  completed_at: "2026-04-20T17:02:18Z"
---

# Phase 73 Plan 03: Query-Param Route Authorization Summary

Upgraded 4 project-scoped route handlers from `requireSession()` to `requireProjectRole(projectId)`, closing TENANT-02 authorization gaps. Any authenticated user who is not a project member now receives 403 instead of data.

## Objective

Close TENANT-02 authorization gaps by upgrading 4 route handlers (artifacts GET/POST, tasks GET/POST, ingestion upload/extract) from authentication-only (`requireSession()`) to project-membership authorization (`requireProjectRole(projectId)`).

**Before:** Any authenticated user could read any project's artifacts/tasks and trigger ingestion for any project.

**After:** Only project members (or global admins) can access project data and operations.

## Implementation

### Task 1: Upgrade artifacts and tasks routes

**TDD Flow:**
1. **RED:** Created `tests/auth/query-param-403.test.ts` with 6 failing tests verifying `requireProjectRole()` calls
2. **GREEN:** Upgraded `app/api/artifacts/route.ts` and `app/api/tasks/route.ts`
   - GET handlers: Extract `projectId` from query params BEFORE auth check, then call `requireProjectRole(projectId)`
   - POST handlers: Parse request body, extract `project_id`, then call `requireProjectRole(project_id)`
   - Replaced `import { requireSession }` with `import { requireProjectRole }`

**Pattern applied (query-param routes):**
```typescript
// BEFORE (authentication only):
const { session, redirectResponse } = await requireSession();
if (redirectResponse) return redirectResponse;
const projectId = parseInt(req.nextUrl.searchParams.get('projectId') ?? '', 10);

// AFTER (project-membership authorization):
const projectId = parseInt(req.nextUrl.searchParams.get('projectId') ?? '', 10);
if (isNaN(projectId)) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
const { session, redirectResponse } = await requireProjectRole(projectId);
if (redirectResponse) return redirectResponse;
```

**Pattern applied (POST routes with body):**
```typescript
// BEFORE:
const { session, redirectResponse } = await requireSession();
if (redirectResponse) return redirectResponse;
const parsed = schema.safeParse(await req.json());

// AFTER:
const parsed = schema.safeParse(await req.json());
if (!parsed.success) return NextResponse.json({ error: ... }, { status: 422 });
const { project_id } = parsed.data;
const { session, redirectResponse } = await requireProjectRole(project_id);
if (redirectResponse) return redirectResponse;
```

**Commits:**
- `f1f0482`: RED phase — 6 failing tests
- `d2202f0`: GREEN phase — artifacts and tasks routes upgraded (4 of 6 tests pass)

### Task 2: Upgrade ingestion routes

**Routes upgraded:**
1. **`app/api/ingestion/upload/route.ts`** — Extracts `project_id` from multipart formData before auth check
2. **`app/api/ingestion/extract/route.ts`** — Parses JSON body to get `projectId` before auth check

**Pattern applied (formData routes):**
```typescript
// BEFORE:
const { session, redirectResponse } = await requireSession();
if (redirectResponse) return redirectResponse;
const formData = await request.formData();
const projectIdRaw = formData.get('project_id');

// AFTER:
const formData = await request.formData();
const projectIdRaw = formData.get('project_id');
// ... validate projectId ...
const { redirectResponse } = await requireProjectRole(projectId);
if (redirectResponse) return redirectResponse;
```

**Commits:**
- `f475d93`: GREEN phase — ingestion routes upgraded (all 6 tests pass)

## Verification

**Test results:**
- `tests/auth/query-param-403.test.ts`: 6 of 6 tests GREEN
  - GET /api/artifacts?projectId=X calls requireProjectRole ✓
  - POST /api/artifacts calls requireProjectRole ✓
  - GET /api/tasks?projectId=N calls requireProjectRole ✓
  - POST /api/tasks calls requireProjectRole ✓
  - POST /api/ingestion/upload calls requireProjectRole ✓
  - POST /api/ingestion/extract calls requireProjectRole ✓

**Full test suite:**
- 716 tests passing (no regressions in auth or API tests)
- Build passes with no TypeScript errors

## Deviations from Plan

None — plan executed exactly as written.

## Security Impact

**TENANT-02 gaps closed:**
1. ✅ GET /api/artifacts?projectId=X returns 403 for non-members (was: returned all artifacts)
2. ✅ POST /api/artifacts returns 403 for non-members (was: allowed creation in any project)
3. ✅ GET /api/tasks?projectId=N returns 403 for non-members (was: returned all tasks)
4. ✅ POST /api/tasks returns 403 for non-members (was: allowed creation in any project)
5. ✅ POST /api/ingestion/upload returns 403 for non-members (was: allowed upload to any project)
6. ✅ POST /api/ingestion/extract returns 403 for non-members (was: allowed triggering extraction for any project)

**Global admin behavior preserved:** `resolveRole(session)` returns 'admin' for global admins → short-circuit in `requireProjectRole()` → no project_members lookup required.

## Technical Debt

None introduced.

## Key Learnings

1. **Parse before authorize:** Extracting `projectId` from query params, body, or formData BEFORE the auth check is safe (read-only operation) and required for project-scoped authorization
2. **Test mock discipline:** Vitest `vi.mock()` must be at top level, not inside test blocks. The linter simplified the test but required manual fix for BullMQ Queue constructor mock
3. **Consistent pattern:** The same "extract projectId → validate → requireProjectRole → proceed" pattern works across query-param, JSON body, and formData routes

## Next Steps

Phase 73 continues with:
- **73-04:** Upgrade remaining routes (risks, actions, milestones, etc.) to requireProjectRole
- **73-05:** Test and document complete tenant isolation across all layers

## Self-Check: PASSED

**Files created:**
```bash
FOUND: tests/auth/query-param-403.test.ts
```

**Files modified:**
```bash
FOUND: app/api/artifacts/route.ts
FOUND: app/api/tasks/route.ts
FOUND: app/api/ingestion/upload/route.ts
FOUND: app/api/ingestion/extract/route.ts
```

**Commits:**
```bash
FOUND: f1f0482 (test(73-03): add failing test for requireProjectRole)
FOUND: d2202f0 (feat(73-03): upgrade artifacts and tasks routes)
FOUND: f475d93 (feat(73-03): upgrade ingestion routes)
```

All claims verified.
