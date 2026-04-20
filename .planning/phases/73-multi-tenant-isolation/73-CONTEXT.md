# Phase 73: Multi-Tenant Isolation - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Enforce project ownership at all API/UI layers; prevent cross-user state bleed. The `requireProjectRole()` foundation (Phase 58) is already applied to all 50+ `app/api/projects/[projectId]/` routes. This phase closes the remaining gaps: cross-project portfolio routes that return all-user data, unscoped project routes that lack membership checks, and invite onboarding clean state.

</domain>

<decisions>
## Implementation Decisions

### Cross-project portfolio routes
- `GET /api/projects` — calls `getActiveProjects()` without `userId`; `getActiveProjects()` already supports `opts.userId` filtering (membership subquery path already written) — just needs to be invoked with the session user's ID and role
- `GET /api/dashboard/watch-list` — add membership join/filter so it only returns risks from projects the user belongs to
- `GET /api/drafts` — filter to projects the user is a member of
- Global admin exception: admins (`resolveRole(session) === 'admin'`) continue to see all projects — existing short-circuit behavior is intentional

### Unscoped project routes (projectId as query param, not path param)
- `GET /api/artifacts?projectId=X` — upgrade from `requireSession()` to `requireProjectRole(projectId)` — same fix as project-scoped routes
- `GET /api/tasks?projectId=N` — same upgrade
- Pattern: any route that accepts `projectId` as a param (query or body) and touches project data must call `requireProjectRole()` before querying

### Redis cache key namespacing
- Current pattern `weekly_focus:${projectId}` is project-scoped and sufficient — membership is enforced at the API layer (`requireProjectRole()` on the weekly-focus route), so cache keys cannot be read cross-user without first bypassing the route guard
- No key format changes needed

### BullMQ job isolation
- Jobs carry `projectId` in job data; results are written to `skill_runs` table scoped by `project_id` — no cross-project bleed path exists in the job flow
- Single `scheduled-jobs` queue is fine — isolation is at the data level, not the queue level
- No changes needed to BullMQ configuration

### Unauthorized access response
- Keep existing 403 JSON response: `{ error: 'Forbidden: not a member of this project' }` — consistent with the established pattern across all project-scoped routes; no redirect or friendly-page needed for API routes

### Invite onboarding empty state (TENANT-05)
- Fixing `getActiveProjects()` to filter by `userId` is the core fix — a newly invited user with one project membership will see exactly that project; a brand-new user with no memberships sees an empty portfolio
- No special "first login" flow needed; correct data filtering produces the clean empty state

### Claude's Discretion
- Whether to extract a shared `requireProjectMembership()` helper for the query-param pattern, or inline the check in each affected route
- Whether to add a lightweight integration test confirming 403 on cross-user project access
- Whether any other query-param routes beyond `/api/artifacts` and `/api/tasks` need the same upgrade (researcher should audit `app/api/ingestion/`, `app/api/drafts/[id]/`, `app/api/artifacts/[id]/`)

</decisions>

<specifics>
## Specific Ideas

No specific references — standard security correctness work. The fix approach is consistent: pass user identity into any query that spans project boundaries, and upgrade `requireSession()` to `requireProjectRole()` on routes that accept a projectId param.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `requireProjectRole(projectId, minRole)` in `lib/auth-server.ts` — already the correct primitive; use this everywhere, don't reinvent
- `getActiveProjects(opts)` in `lib/queries.ts` — already has the membership-filter branch (`opts.userId` + `opts.isGlobalAdmin`); just needs to be called with session context rather than no args
- `resolveRole(session)` in `lib/auth-utils.ts` — use to distinguish global admin from regular user when deciding whether to pass userId to `getActiveProjects()`

### Established Patterns
- All `app/api/projects/[projectId]/` routes already follow the pattern: call `requireProjectRole(projectId)` at the top, return on `redirectResponse`
- `requireSession()` is the session-only gate; `requireProjectRole()` is the membership gate — the distinction is correct and consistent; the gaps are routes that should use the latter but currently use the former

### Integration Points
- `GET /api/projects` is called by the portfolio/home page (`app/page.tsx`) — fixing this route fixes the portfolio listing for all users
- `GET /api/dashboard/watch-list` is called by the Dashboard tab — filtered results mean the tab becomes user-specific
- `GET /api/drafts` is called by the Drafts Inbox — filtered results scope it to the user's projects
- `app/api/ingestion/` routes and `app/api/artifacts/[id]/` likely have the same `requireSession()`-only pattern — researcher should verify

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 73-multi-tenant-isolation*
*Context gathered: 2026-04-20*
