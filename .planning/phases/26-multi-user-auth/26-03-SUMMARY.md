---
phase: 26-multi-user-auth
plan: "03"
subsystem: auth
tags: [better-auth, next-js, cve-2025-29927, session, middleware, route-handler]

# Dependency graph
requires:
  - phase: 26-02
    provides: requireSession() in lib/auth-server.ts, auth instance in lib/auth.ts

provides:
  - proxy.ts — UX redirect layer using getSessionCookie (CVE-2025-29927 defense layer 1)
  - app/api/auth/[...all]/route.ts — better-auth handler mounted at /api/auth
  - requireSession() guard in all 86 existing route handlers (defense layer 2)

affects:
  - 26-04 (login page — all API routes now protected)
  - 26-05 (user management — settings/users/* routes protected)
  - all future route handlers must include requireSession()

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "proxy.ts (Next.js 16) — getSessionCookie for UX redirect, NOT security boundary"
    - "requireSession() at top of every route handler — actual security boundary (CVE-2025-29927)"
    - "Defense-in-depth: proxy is UX layer; route handler check is security layer"

key-files:
  created:
    - bigpanda-app/proxy.ts
    - bigpanda-app/app/api/auth/[...all]/route.ts
  modified:
    - "bigpanda-app/app/api/**/*.ts (86 files) — requireSession() added to every handler"
    - bigpanda-app/tests/auth/proxy.test.ts
    - bigpanda-app/tests/auth/cve-2025-29927.test.ts
    - "bigpanda-app/tests/{wizard,audit,discovery,ingestion,scheduler}/*.test.ts — auth mocks added"

key-decisions:
  - "proxy.ts pattern (not middleware.ts) — Next.js 16 convention; middleware.ts is Next.js 13/14"
  - "getSessionCookie() in proxy for UX only — NOT security boundary; route handlers are"
  - "requireSession() inserted at VERY TOP of every handler body before any other logic"
  - "OAuth callbacks still guarded — OAuth tokens are per-app not per-user in v3.0"
  - "17 test files needed auth mocks added — vi.resetAllMocks() in some beforeEach required extra care"

patterns-established:
  - "Every new route handler must add: const { session, redirectResponse } = await requireSession(); if (redirectResponse) return redirectResponse; at the top"
  - "Test files importing route handlers must mock next/headers and @/lib/auth (auth.api.getSession)"

requirements-completed:
  - AUTH-05

# Metrics
duration: 12min
completed: 2026-03-31
---

# Phase 26 Plan 03: Route Handler Auth Guards Summary

**better-auth handler mounted at /api/auth, proxy.ts UX redirect layer created, and requireSession() added to all 86 existing route handlers — CVE-2025-29927 defense-in-depth complete**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-31T01:25:49Z
- **Completed:** 2026-03-31T01:37:31Z
- **Tasks:** 2
- **Files modified:** 91 (86 route handlers + 5 test/config files)

## Accomplishments

- Created `proxy.ts` (Next.js 16 convention) with `getSessionCookie()` UX redirect for unauthenticated requests
- Mounted better-auth handler at `/api/auth/[...all]` using `toNextJsHandler`
- Added `requireSession()` to all 86 route handlers — no unguarded endpoint remains
- proxy.test.ts, cve-2025-29927.test.ts, require-session.test.ts all GREEN (9 tests)
- Fixed 17 test files that import route handlers — added `next/headers` + `@/lib/auth` mocks

## Task Commits

Each task was committed atomically:

1. **Task 1: Create auth catch-all route and proxy.ts** - `c21870a` (feat)
2. **Task 2: Add requireSession() to all 86 route handlers** - `6344cee` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified

- `bigpanda-app/proxy.ts` — UX redirect layer using getSessionCookie; redirects to /login when no session cookie; excludes /login, /setup, /api/auth, /_next, /favicon.ico
- `bigpanda-app/app/api/auth/[...all]/route.ts` — mounts better-auth handler via toNextJsHandler
- `bigpanda-app/app/api/**/*.ts` (86 files) — requireSession() added to every exported GET/POST/PUT/PATCH/DELETE function
- `bigpanda-app/tests/auth/proxy.test.ts` — updated from RED stub to GREEN with real assertions
- `bigpanda-app/tests/auth/cve-2025-29927.test.ts` — updated from RED stub to GREEN; verifies 401 returned even with x-middleware-subrequest header
- `bigpanda-app/tests/{wizard,audit,discovery,ingestion,scheduler}/*.test.ts` (17 files) — added next/headers + @/lib/auth mocks so tests can exercise route handler logic

## Decisions Made

- `proxy.ts` file name (not `middleware.ts`) — Next.js 16 convention; middleware.ts naming is deprecated in Next.js 16
- `getSessionCookie()` only in proxy — it's an edge-safe cookie existence check, NOT cryptographic validation; the actual security boundary is `requireSession()` in route handlers
- OAuth callback routes (`/api/oauth/gmail/callback`, `/api/oauth/calendar/callback`) still get `requireSession()` — OAuth tokens are per-app not per-user in v3.0, so user must be authenticated to configure OAuth
- For test files using `vi.resetAllMocks()` in beforeEach, added `import { auth as authMock }` and `vi.mocked(authMock.api.getSession).mockResolvedValue(...)` after reset to restore session mock

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added auth mocks to 17 test files**
- **Found during:** Task 2 (after requireSession was added to all handlers)
- **Issue:** All tests importing route handlers directly broke because `next/headers` throws "outside request scope" without a mock, and `@/lib/auth` mock wasn't present to return a valid session
- **Fix:** Added `vi.mock('next/headers', ...)` and `vi.mock('@/lib/auth', ...)` to 17 test files; for tests using `vi.resetAllMocks()` in beforeEach, added `import { auth as authMock }` and restoration of getSession mock
- **Files modified:** 17 test files across tests/wizard/, tests/audit/, tests/discovery/, tests/ingestion/, tests/scheduler/, app/api/__tests__/
- **Verification:** Previously-passing tests resume passing
- **Committed in:** 6344cee

**2. [Rule 1 - Bug] Fixed broken multi-line import in discovery/approve/route.ts**
- **Found during:** Task 2 verification
- **Issue:** The script that inserted `import { requireSession }` placed it inside an existing multi-line `import {` block, creating syntax error
- **Fix:** Moved `import { requireSession }` line to correct position (after last single-line import, before multi-line import block)
- **Files modified:** `bigpanda-app/app/api/discovery/approve/route.ts`
- **Verification:** File compiles; tests pass
- **Committed in:** 6344cee

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both fixes necessary for tests to work and code to compile. No scope creep.

## Issues Encountered

- Script-based import insertion had an edge case: files with multi-line imports (e.g., `import {\n  foo,\n  bar\n}`) had the `requireSession` import injected INSIDE the multi-line block. Fixed in discovery/approve/route.ts (only affected file).
- `vi.resetAllMocks()` in some beforeEach callbacks cleared the `getSession` mock return value — required `import { auth as authMock }` at module level and explicit mock restoration after reset.

## Pre-Existing Failures Documented

The following test failures existed BEFORE this plan and remain unchanged (different error paths only):
- `tests/scheduler-map.test.ts` (6 tests) — `JOB_SCHEDULE_MAP` export missing from worker/scheduler.ts
- `tests/discovery/approve.test.ts` (4 tests) — `db.transaction` missing from test mock (pre-Phase 22 test)
- `tests/ingestion/write.test.ts` (5 tests) — same db.transaction mock issue
- `tests/ingestion/dedup.test.ts` (1 test) — same db.transaction mock issue

See `.planning/phases/26-multi-user-auth/deferred-items.md` for details.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 86 route handlers are guarded with `requireSession()` — AUTH-05 server-side complete
- `proxy.ts` provides UX redirect for unauthenticated users
- `app/api/auth/[...all]/route.ts` is ready to receive login/logout requests
- Plan 26-04 can proceed: login page, setup page, and session cookie flow

---
*Phase: 26-multi-user-auth*
*Completed: 2026-03-31*
