# Phase 73: Multi-Tenant Isolation - Research

**Researched:** 2026-04-20
**Domain:** Multi-tenant security, access control enforcement, data isolation
**Confidence:** HIGH

## Summary

Phase 73 closes multi-tenant isolation gaps in an app that already has strong per-project RBAC (`requireProjectRole()`) on 50+ project-scoped routes. The gaps are: (1) cross-project portfolio routes that return all-user data without filtering, (2) unscoped routes accepting `projectId` as query param but only checking session, and (3) invite onboarding empty state.

The fix is straightforward: pass user identity into queries that span project boundaries (`getActiveProjects()` already supports `opts.userId` filtering—just needs to be invoked), and upgrade `requireSession()` to `requireProjectRole(projectId)` on query-param routes. Redis cache and BullMQ job isolation are already correct at the data level—membership is enforced at API entry points, so cache keys cannot be read cross-user without first bypassing route guards.

**Primary recommendation:** Enforce membership filtering at the query layer for cross-project routes, and upgrade authorization from session-only to project-membership checks on all routes accepting `projectId` as a parameter.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Cross-project portfolio routes:**
- `GET /api/projects` — calls `getActiveProjects()` without `userId`; `getActiveProjects()` already supports `opts.userId` filtering (membership subquery path already written) — just needs to be invoked with the session user's ID and role
- `GET /api/dashboard/watch-list` — add membership join/filter so it only returns risks from projects the user belongs to
- `GET /api/drafts` — filter to projects the user is a member of
- Global admin exception: admins (`resolveRole(session) === 'admin'`) continue to see all projects — existing short-circuit behavior is intentional

**Unscoped project routes (projectId as query param, not path param):**
- `GET /api/artifacts?projectId=X` — upgrade from `requireSession()` to `requireProjectRole(projectId)` — same fix as project-scoped routes
- `GET /api/tasks?projectId=N` — same upgrade
- Pattern: any route that accepts `projectId` as a param (query or body) and touches project data must call `requireProjectRole()` before querying

**Redis cache key namespacing:**
- Current pattern `weekly_focus:${projectId}` is project-scoped and sufficient — membership is enforced at the API layer (`requireProjectRole()` on the weekly-focus route), so cache keys cannot be read cross-user without first bypassing the route guard
- No key format changes needed

**BullMQ job isolation:**
- Jobs carry `projectId` in job data; results are written to `skill_runs` table scoped by `project_id` — no cross-project bleed path exists in the job flow
- Single `scheduled-jobs` queue is fine — isolation is at the data level, not the queue level
- No changes needed to BullMQ configuration

**Unauthorized access response:**
- Keep existing 403 JSON response: `{ error: 'Forbidden: not a member of this project' }` — consistent with the established pattern across all project-scoped routes; no redirect or friendly-page needed for API routes

**Invite onboarding empty state (TENANT-05):**
- Fixing `getActiveProjects()` to filter by `userId` is the core fix — a newly invited user with one project membership will see exactly that project; a brand-new user with no memberships sees an empty portfolio
- No special "first login" flow needed; correct data filtering produces the clean empty state

### Claude's Discretion

- Whether to extract a shared `requireProjectMembership()` helper for the query-param pattern, or inline the check in each affected route
- Whether to add a lightweight integration test confirming 403 on cross-user project access
- Whether any other query-param routes beyond `/api/artifacts` and `/api/tasks` need the same upgrade (researcher should audit `app/api/ingestion/`, `app/api/drafts/[id]/`, `app/api/artifacts/[id]/`)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TENANT-01 | A user can only see and access projects they have been explicitly added to — enforced at both API and UI layer | `getActiveProjects(opts.userId)` membership subquery pattern; `requireProjectRole()` enforcement; `project_members` junction table |
| TENANT-02 | A user cannot access another user's project by guessing or manipulating a project ID in the URL or API call (returns 403) | `requireProjectRole()` returns 403 when membership check fails; existing pattern on 50+ routes; query-param routes need upgrade |
| TENANT-03 | AI outputs, Redis cache entries, and BullMQ job state cannot cross user or project boundaries | Redis keys are project-scoped (`weekly_focus:${projectId}`); `skill_runs` table has `project_id` column; membership enforced at API layer prevents cross-user cache reads |
| TENANT-04 | BullMQ jobs are scoped strictly to their project; job results appear only in the originating project's context | Jobs carry `projectId` in data; results written to `skill_runs.project_id`; single queue with data-level isolation is sufficient |
| TENANT-05 | New user receives an email invite, creates an account, and sees a clean empty state on first login — no other users' projects, history, or data visible | Fixing `getActiveProjects()` to filter by `userId` produces empty portfolio for new users with no memberships; no special first-login flow needed |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-auth | 1.1.x | Session + role + invite flow | Already integrated in Phase 58; handles credentials, sessions, email invites |
| Drizzle ORM | Latest | Type-safe SQL query builder | Project standard; all queries use Drizzle; supports subqueries for membership filtering |
| PostgreSQL | 14+ | Relational database | Project standard; `project_members` junction table already exists |
| Redis | 7.2.4 | Cache + BullMQ backing store | Project standard for caching and job queue; isolated via local binary `tools/redis/` |
| BullMQ | Latest | Background job queue | Project standard for skills and scheduled jobs; single `scheduled-jobs` queue with data-level isolation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.1.x | Test runner | Already configured; use for integration tests verifying 403 on cross-user access |
| zod | Latest | Request validation | Already integrated; validate `projectId` params before auth checks |

### Alternatives Considered

None — this is not a greenfield architecture decision; the stack is fixed and the authorization primitives (`requireSession()`, `requireProjectRole()`, `resolveRole()`) are already established.

**Installation:**

No new dependencies required — all primitives already exist.

## Architecture Patterns

### Recommended Project Structure

No structural changes — all fixes are in existing route handlers and query functions.

```
app/api/
├── projects/route.ts                    # Cross-project portfolio — needs userId filter
├── dashboard/watch-list/route.ts        # Cross-project risks — needs membership join
├── drafts/route.ts                      # Cross-project drafts — needs membership filter
├── artifacts/route.ts                   # Query-param route — needs requireProjectRole()
├── tasks/route.ts                       # Query-param route — needs requireProjectRole()
└── ingestion/
    ├── upload/route.ts                  # Query-param route — needs requireProjectRole()
    ├── extract/route.ts                 # Query-param route — needs requireProjectRole()
    └── approve/route.ts                 # Query-param route — needs requireProjectRole()

lib/
├── auth-server.ts                       # requireSession(), requireProjectRole() — reuse as-is
├── auth-utils.ts                        # resolveRole() — reuse as-is
└── queries.ts                           # getActiveProjects(opts) — invoke with userId
```

### Pattern 1: Cross-Project Query Filtering (Portfolio Routes)

**What:** Routes that return data spanning multiple projects must filter results to only projects the user is a member of.

**When to use:** Any route that queries across projects (e.g., portfolio listing, dashboard watch list, drafts inbox).

**Example:**

```typescript
// app/api/projects/route.ts — BEFORE (returns all projects)
export async function GET(req: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const activeProjects = await getActiveProjects(); // ❌ No user filter
  return NextResponse.json({ projects: activeProjects });
}

// app/api/projects/route.ts — AFTER (filters to user's projects)
export async function GET(req: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const role = resolveRole(session);
  const activeProjects = await getActiveProjects({
    userId: session.user.id,
    isGlobalAdmin: role === 'admin',
  }); // ✅ Membership filter applied
  return NextResponse.json({ projects: activeProjects });
}
```

**Source:** Existing `getActiveProjects()` implementation in `lib/queries.ts` lines 280-316

### Pattern 2: Query-Param Route Authorization Upgrade

**What:** Routes accepting `projectId` as a query param (not path param) must enforce project membership, not just session presence.

**When to use:** Any route where `projectId` comes from `req.nextUrl.searchParams` or request body, not from `[projectId]` path segment.

**Example:**

```typescript
// app/api/artifacts/route.ts — BEFORE (session-only)
export async function GET(req: NextRequest) {
  const { session, redirectResponse } = await requireSession(); // ❌ Only checks session
  if (redirectResponse) return redirectResponse;

  const projectId = parseInt(req.nextUrl.searchParams.get('projectId') ?? '', 10);
  if (isNaN(projectId)) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const rows = await db.select().from(artifacts).where(eq(artifacts.project_id, projectId));
  return NextResponse.json(rows);
}

// app/api/artifacts/route.ts — AFTER (membership check)
export async function GET(req: NextRequest) {
  const projectId = parseInt(req.nextUrl.searchParams.get('projectId') ?? '', 10);
  if (isNaN(projectId)) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const { session, redirectResponse } = await requireProjectRole(projectId); // ✅ Membership check
  if (redirectResponse) return redirectResponse;

  const rows = await db.select().from(artifacts).where(eq(artifacts.project_id, projectId));
  return NextResponse.json(rows);
}
```

**Source:** Pattern established in `lib/auth-server.ts` lines 42-97

### Pattern 3: Membership Subquery for Cross-Project Joins

**What:** Use Drizzle subquery with `inArray()` to filter results to projects the user is a member of, avoiding M:N join row multiplication.

**When to use:** Cross-project dashboard routes (watch list, drafts inbox) where you can't call a helper that already does the filtering.

**Example:**

```typescript
// app/api/dashboard/watch-list/route.ts — BEFORE (all active projects)
export async function GET() {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const rows = await db
    .select({ /* fields */ })
    .from(risks)
    .innerJoin(projects, eq(risks.project_id, projects.id))
    .where(and(
      eq(projects.status, 'active'),
      inArray(risks.severity, ['high', 'critical']),
      /* ... */
    ));
  return NextResponse.json({ items: rows });
}

// app/api/dashboard/watch-list/route.ts — AFTER (membership filter)
export async function GET() {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const role = resolveRole(session);
  const membershipFilter = role === 'admin'
    ? undefined // Global admin sees all
    : inArray(
        projects.id,
        db.select({ id: projectMembers.project_id })
          .from(projectMembers)
          .where(eq(projectMembers.user_id, session.user.id))
      );

  const rows = await db
    .select({ /* fields */ })
    .from(risks)
    .innerJoin(projects, eq(risks.project_id, projects.id))
    .where(and(
      eq(projects.status, 'active'),
      membershipFilter, // ✅ User can only see risks from their projects
      inArray(risks.severity, ['high', 'critical']),
      /* ... */
    ));
  return NextResponse.json({ items: rows });
}
```

**Source:** Pattern from `getActiveProjects()` in `lib/queries.ts` lines 289-304

### Pattern 4: Redis Cache Key Project-Scoping (Already Correct)

**What:** Redis cache keys include `projectId` as namespace; membership is enforced at the API route that reads the cache.

**When to use:** Any cached data that is project-specific (e.g., weekly focus, computed health).

**Example:**

```typescript
// worker/jobs/weekly-focus.ts — Cache write (project-scoped key)
await redis.setex(`weekly_focus:${project.id}`, TTL_7_DAYS, JSON.stringify(bullets));

// app/api/projects/[projectId]/weekly-focus/route.ts — Cache read (membership enforced at route)
export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const numericId = parseInt(projectId, 10);
  if (isNaN(numericId)) return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });

  // Membership check — user cannot reach cache read without passing this gate
  const { redirectResponse } = await requireProjectRole(numericId);
  if (redirectResponse) return redirectResponse;

  // Now safe to read cache — user has proven membership
  const raw = await redis.get(`weekly_focus:${numericId}`);
  return NextResponse.json({ bullets: raw ? JSON.parse(raw) : null });
}
```

**Why this is sufficient:** Cache keys are not user-scoped because users don't have isolated caches—they have shared access to project caches based on membership. The security boundary is at the route handler, not the cache key.

**Source:** `worker/jobs/weekly-focus.ts` line 200, `app/api/projects/[projectId]/weekly-focus/route.ts` line 26

### Pattern 5: BullMQ Job Data Isolation (Already Correct)

**What:** BullMQ jobs carry `projectId` in job data; results are written to `skill_runs` table scoped by `project_id`.

**When to use:** All background jobs (skills, document extraction, scheduled jobs).

**Example:**

```typescript
// worker/jobs/weekly-focus.ts — Job data includes projectId
export async function weeklyFocusJob(job: Job<{ projectId: number; triggeredBy: string }>) {
  const { projectId } = job.data;

  // Insert run record scoped to project
  const [run] = await db.insert(skillRuns).values({
    run_id: randomUUID(),
    project_id: projectId, // ✅ Results scoped to originating project
    skill_name: 'weekly-focus',
    status: 'running',
    started_at: new Date(),
  }).returning({ id: skillRuns.id });

  // Compute focus bullets for this project only
  const bullets = await computeFocusBullets(projectId);

  // Cache scoped to project
  await redis.setex(`weekly_focus:${projectId}`, TTL_7_DAYS, JSON.stringify(bullets));
}
```

**Why single queue is safe:** Jobs in a shared queue do not cross-contaminate because:
1. Each job's `data` payload is isolated
2. Results are written to DB rows with `project_id` foreign key
3. Cache keys are project-namespaced
4. UI reads results via routes protected by `requireProjectRole()`

**Source:** `worker/jobs/weekly-focus.ts` lines 48-205, `db/schema.ts` lines 382-394 (`skill_runs` table)

### Anti-Patterns to Avoid

- **Don't assume session presence = project access:** `requireSession()` only proves authentication, not authorization. Always call `requireProjectRole(projectId)` if the route touches project data.
- **Don't filter client-side:** Never return all-user data to the client and rely on UI filtering. This is a data leak—unauthorized users can inspect network responses.
- **Don't namespace cache keys by user:** Redis cache is not user-isolated—it's project-isolated. Membership determines which project caches a user can read (enforced at API layer).
- **Don't create separate BullMQ queues per project:** Queue isolation is unnecessary overhead. Data-level isolation (job payload + DB foreign keys + route guards) is sufficient and simpler.
- **Don't return 404 for unauthorized access:** Return 403 when the resource exists but the user lacks permission. 404 is a data leak (confirms resource doesn't exist); 403 is correct (user not authorized).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Row-level security (RLS) | PostgreSQL RLS policies | Application-layer checks (`requireProjectRole()`) | RLS adds complexity (policies per table, role-switching) and breaks Drizzle's type safety. App-layer checks are explicit, testable, and debuggable. |
| User-scoped Redis namespaces | Custom key prefix logic per user | Project-scoped keys (`${entity}:${projectId}`) + route guards | Users don't have isolated caches—they share project caches based on membership. Namespacing by user creates cache duplication and invalidation nightmares. |
| Per-project BullMQ queues | Dynamic queue creation per project | Single `scheduled-jobs` queue + data-level isolation | Queue-per-project is operational overhead (monitoring, scaling). Data isolation (job payload + DB foreign keys) is simpler and equally secure. |
| Global admin role bypass logic | Complex permission trees | Simple `resolveRole(session) === 'admin'` short-circuit | Global admin is all-or-nothing—they see all projects. Granular admin permissions are out of scope (documented in REQUIREMENTS.md as post-launch consideration). |
| Custom 403 error handling | Per-route error responses | Consistent `NextResponse.json({ error: 'Forbidden: not a member of this project' }, { status: 403 })` | Consistency across 50+ routes is more important than custom messaging. Standardized response simplifies client error handling. |

**Key insight:** Multi-tenant isolation at the application layer (route guards + query filters) is simpler, more explicit, and easier to audit than database-layer policies or infrastructure-layer isolation (separate queues/caches). The tradeoff is diligence—every route accepting `projectId` must call `requireProjectRole()`.

## Common Pitfalls

### Pitfall 1: Forgetting to Filter Cross-Project Queries

**What goes wrong:** Routes like `GET /api/projects` return all users' projects; newly invited users see a portfolio full of unrelated projects.

**Why it happens:** The route calls `requireSession()` (proves authentication) but not `requireProjectRole()` (proves authorization). The helper function `getActiveProjects()` has membership filtering logic (`opts.userId`) but the route doesn't invoke it.

**How to avoid:**
1. Establish a rule: if a route queries across projects, it MUST filter by user membership
2. Pass `userId` and `isGlobalAdmin` to any helper that supports membership filtering
3. If no helper exists, use the membership subquery pattern from `getActiveProjects()`

**Warning signs:**
- Portfolio page shows projects the logged-in user didn't create
- Dashboard watch list shows risks from unrelated projects
- Drafts inbox shows drafts from other users' projects

**Example fix:**
```typescript
// BEFORE: returns all projects
const activeProjects = await getActiveProjects();

// AFTER: filters to user's projects
const role = resolveRole(session);
const activeProjects = await getActiveProjects({
  userId: session.user.id,
  isGlobalAdmin: role === 'admin',
});
```

### Pitfall 2: Query-Param Routes Using Session-Only Checks

**What goes wrong:** Routes accepting `projectId` as a query param (e.g., `GET /api/artifacts?projectId=123`) allow any authenticated user to access any project by changing the number in the URL.

**Why it happens:** Path-param routes (`/api/projects/[projectId]/...`) naturally call `requireProjectRole(projectId)` because `projectId` is explicit in the route structure. Query-param routes look like session-only routes and developers forget to upgrade the auth check.

**How to avoid:**
1. Extract `projectId` from query params BEFORE calling auth helper
2. Call `requireProjectRole(projectId)` instead of `requireSession()`
3. Audit all routes with `?projectId=` or body `{ projectId: ... }` for this pattern

**Warning signs:**
- User can access `/api/artifacts?projectId=999` for a project they're not a member of
- 401 (session missing) but never 403 (membership denied) in logs
- Integration test with wrong `projectId` returns data instead of 403

**Example fix:**
```typescript
// BEFORE: session-only check
export async function GET(req: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const projectId = parseInt(req.nextUrl.searchParams.get('projectId') ?? '', 10);
  // ❌ User can read any project's artifacts

// AFTER: membership check
export async function GET(req: NextRequest) {
  const projectId = parseInt(req.nextUrl.searchParams.get('projectId') ?? '', 10);
  if (isNaN(projectId)) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const { session, redirectResponse } = await requireProjectRole(projectId);
  if (redirectResponse) return redirectResponse; // ✅ 403 if not a member
```

### Pitfall 3: Confusing Cache Namespacing with Authorization

**What goes wrong:** Developer tries to add user ID to Redis cache keys (`weekly_focus:${userId}:${projectId}`) thinking it's needed for isolation, breaking cache sharing across project members.

**Why it happens:** Misunderstanding the security model—cache isolation is not per-user, it's per-project. Users share project caches based on membership. Authorization happens at the API route (via `requireProjectRole()`), not at the cache key.

**How to avoid:**
1. Keep cache keys project-scoped only: `${entity}:${projectId}`
2. Enforce membership at the route that reads/writes the cache
3. Document why user-scoping is wrong: cache duplication, invalidation complexity, no security gain

**Warning signs:**
- Cache keys include user IDs
- Cache miss rate increases after switching to user-scoped keys
- Team members see different "weekly focus" for the same project

**Correct pattern:**
```typescript
// Cache write (no user ID in key)
await redis.setex(`weekly_focus:${projectId}`, TTL, JSON.stringify(data));

// Cache read (membership enforced at route, not key)
const { redirectResponse } = await requireProjectRole(projectId);
if (redirectResponse) return redirectResponse; // ✅ User proved membership
const cached = await redis.get(`weekly_focus:${projectId}`);
```

### Pitfall 4: Returning 404 Instead of 403 for Unauthorized Access

**What goes wrong:** Route returns `NextResponse.json({ error: 'Not found' }, { status: 404 })` when user lacks permission, leaking information (confirms resource doesn't exist vs. user can't access it).

**Why it happens:** Developer follows "secure by default" thinking (don't reveal resource existence) but violates REST semantics. 403 is correct when resource exists but user is unauthorized.

**How to avoid:**
1. Use 403 when membership check fails and you know the project exists
2. Use 404 only when the resource genuinely doesn't exist (e.g., invalid project ID in DB)
3. Distinguish authentication (401) from authorization (403) from not-found (404)

**Warning signs:**
- User sees "Not found" when trying to access a project that exists
- Integration test expects 403 but gets 404
- Logs show `requireProjectRole()` returning 403 but route handler converts to 404

**Correct pattern:**
```typescript
// requireProjectRole() already returns 403 with correct message
const { redirectResponse } = await requireProjectRole(projectId);
if (redirectResponse) return redirectResponse; // ✅ 403 JSON response

// Don't do this:
if (redirectResponse) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 }); // ❌ Wrong status
}
```

### Pitfall 5: Forgetting Global Admin Short-Circuit

**What goes wrong:** Global admins (`resolveRole(session) === 'admin'`) get filtered out of cross-project queries and can't see all projects, breaking their admin dashboard.

**Why it happens:** Developer adds membership filtering but forgets the global admin exception documented in STATE.md (Phase 58 decision).

**How to avoid:**
1. Always check `resolveRole(session) === 'admin'` before applying membership filters
2. Pass `isGlobalAdmin` flag to helper functions that support it
3. Global admin bypasses `project_members` checks in `requireProjectRole()` (line 60-62 of `auth-server.ts`)

**Warning signs:**
- Admin user sees empty portfolio
- Admin can access individual projects but not portfolio listing
- Membership filter logic doesn't check role

**Correct pattern:**
```typescript
const role = resolveRole(session);
const activeProjects = await getActiveProjects({
  userId: session.user.id,
  isGlobalAdmin: role === 'admin', // ✅ Admin sees all
});
```

## Code Examples

Verified patterns from official sources:

### Cross-Project Query with Membership Filter

```typescript
// Source: lib/queries.ts lines 280-316
export async function getActiveProjects(opts?: ProjectQueryOpts): Promise<ProjectWithHealth[]> {
  let activeProjects;

  if (!opts?.userId || opts.isGlobalAdmin) {
    // Global admin or unauthenticated: return all active/draft projects
    activeProjects = await db
      .select()
      .from(projects)
      .where(inArray(projects.status, ['active', 'draft']));
  } else {
    // Membership filter: subquery approach (avoids row multiplication from M:N join)
    activeProjects = await db
      .select()
      .from(projects)
      .where(
        and(
          inArray(projects.status, ['active', 'draft']),
          inArray(
            projects.id,
            db.select({ id: projectMembers.project_id })
              .from(projectMembers)
              .where(eq(projectMembers.user_id, opts.userId))
          )
        )
      );
  }

  return projectsWithHealth;
}
```

### Project Role Enforcement (Existing Primitive)

```typescript
// Source: lib/auth-server.ts lines 42-97
export async function requireProjectRole(
  projectId: number,
  minRole: 'admin' | 'user' = 'user'
): Promise<ProjectRoleResult> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return { session: null, redirectResponse, projectRole: null };

  // Global admin short-circuit — no need to check project_members
  if (resolveRole(session!) === 'admin') {
    return { session: session!, redirectResponse: null, projectRole: 'admin' };
  }

  // Check project membership
  const [member] = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(and(
      eq(projectMembers.project_id, projectId),
      eq(projectMembers.user_id, session!.user.id)
    ))
    .limit(1);

  if (!member) {
    return {
      session: null,
      redirectResponse: NextResponse.json(
        { error: 'Forbidden: not a member of this project' },
        { status: 403 }
      ),
      projectRole: null,
    };
  }

  return { session: session!, redirectResponse: null, projectRole: member.role };
}
```

### Membership Subquery for Dashboard Watch List

```typescript
// Pattern derived from getActiveProjects() — apply to watch-list route
import { projectMembers } from '@/db/schema';
import { resolveRole } from '@/lib/auth-utils';

export async function GET() {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const role = resolveRole(session);
  const membershipCondition = role === 'admin'
    ? undefined // Global admin sees all
    : inArray(
        projects.id,
        db.select({ id: projectMembers.project_id })
          .from(projectMembers)
          .where(eq(projectMembers.user_id, session.user.id))
      );

  const rows = await db
    .select({ /* fields */ })
    .from(risks)
    .innerJoin(projects, eq(risks.project_id, projects.id))
    .where(and(
      eq(projects.status, 'active'),
      membershipCondition, // ✅ User sees only their projects' risks
      inArray(risks.severity, ['high', 'critical']),
      or(isNull(risks.status), ne(risks.status, 'resolved')),
    ))
    .orderBy(desc(risks.created_at))
    .limit(20);

  return NextResponse.json({ items: rows });
}
```

### Query-Param Route Authorization Upgrade

```typescript
// app/api/artifacts/route.ts — upgrade pattern
export async function GET(req: NextRequest) {
  // 1. Extract projectId FIRST (before auth check)
  const projectId = parseInt(req.nextUrl.searchParams.get('projectId') ?? '', 10);
  if (isNaN(projectId)) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  // 2. Check membership (not just session)
  const { session, redirectResponse } = await requireProjectRole(projectId);
  if (redirectResponse) return redirectResponse; // ✅ 403 if not a member

  // 3. Now safe to query
  const rows = await db.select().from(artifacts).where(eq(artifacts.project_id, projectId));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { project_id } = parsed.data;

  // Check membership before allowing artifact creation
  const { session, redirectResponse } = await requireProjectRole(project_id);
  if (redirectResponse) return redirectResponse; // ✅ 403 if not a member

  // Now safe to insert
  const [created] = await db.insert(artifacts).values({ /* ... */ }).returning();
  return NextResponse.json(created, { status: 201 });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Session-only API guards | Session + role-based project membership | Phase 58 (v7.0) | `requireProjectRole()` primitive added; applied to 50+ `/api/projects/[projectId]/` routes |
| All-user portfolio queries | Membership-filtered queries | Phase 73 (v8.0) | Cross-project routes now respect user membership |
| 404 for unauthorized access | 403 with explicit message | Phase 58 | Clearer distinction between "not found" and "forbidden" |
| Global admin as regular user | Global admin short-circuit in `requireProjectRole()` | Phase 58 | Admins bypass `project_members` checks; see all projects |

**Deprecated/outdated:**
- **Session-only checks on project-scoped routes:** Replaced by `requireProjectRole()` in Phase 58. Any route still using `requireSession()` for project data is a security gap.
- **Client-side project filtering:** Never acceptable. All filtering MUST happen server-side in the query layer.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TENANT-01 | Portfolio returns only user's projects | integration | `npm run test tests/auth/portfolio-isolation.test.ts` | ❌ Wave 0 |
| TENANT-02 | Query-param routes return 403 for non-member | integration | `npm run test tests/auth/query-param-403.test.ts` | ❌ Wave 0 |
| TENANT-03 | Redis cache read requires membership | integration | `npm run test tests/auth/cache-isolation.test.ts` | ❌ Wave 0 |
| TENANT-04 | BullMQ job results scoped to project | integration | `npm run test tests/auth/job-isolation.test.ts` | ❌ Wave 0 |
| TENANT-05 | New user sees empty portfolio | integration | `npm run test tests/auth/invite-empty-state.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test tests/auth/` (auth isolation tests only, ~5 files, < 30s)
- **Per wave merge:** `npm run test` (full suite, 148 existing tests pass, < 2min)
- **Phase gate:** Full suite green + manual verification (create two users, assign to different projects, verify isolation in UI)

### Wave 0 Gaps

- [ ] `tests/auth/portfolio-isolation.test.ts` — covers TENANT-01 (portfolio filtering)
- [ ] `tests/auth/query-param-403.test.ts` — covers TENANT-02 (query-param route 403 response)
- [ ] `tests/auth/cache-isolation.test.ts` — covers TENANT-03 (cache read requires membership)
- [ ] `tests/auth/job-isolation.test.ts` — covers TENANT-04 (job results scoped to project)
- [ ] `tests/auth/invite-empty-state.test.ts` — covers TENANT-05 (invite onboarding empty state)

**Existing test infrastructure:**
- `tests/auth/require-session.test.ts` — existing session enforcement test; pattern to follow
- `tests/api/projects-patch.test.ts` — existing `requireSession()` mock pattern; extend to `requireProjectRole()`
- `vitest` already configured; `vi.mock('@/lib/auth-server')` pattern established

## Sources

### Primary (HIGH confidence)

- `lib/auth-server.ts` (lines 1-97) — `requireSession()`, `requireProjectRole()` implementations
- `lib/auth-utils.ts` (lines 1-32) — `resolveRole()` implementation
- `lib/queries.ts` (lines 280-316) — `getActiveProjects(opts)` membership filtering
- `db/schema.ts` (lines 121-129) — `project_members` table schema
- `db/schema.ts` (lines 382-394) — `skill_runs` table schema (project_id scoping)
- `.planning/STATE.md` (lines 66-68) — Phase 58 established `requireProjectRole()` pattern
- `.planning/phases/73-multi-tenant-isolation/73-CONTEXT.md` — user decisions and implementation strategy

### Secondary (MEDIUM confidence)

- `worker/jobs/weekly-focus.ts` (line 200) — Redis cache key pattern `weekly_focus:${projectId}`
- `app/api/projects/[projectId]/weekly-focus/route.ts` (lines 24-31) — Cache read with membership enforcement
- Existing route handlers (`app/api/projects/route.ts`, `app/api/dashboard/watch-list/route.ts`, `app/api/artifacts/route.ts`, etc.) — current implementation showing gaps

### Tertiary (LOW confidence)

None — all findings verified with codebase inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all primitives exist
- Architecture: HIGH — patterns established in Phase 58; this phase applies them consistently
- Pitfalls: HIGH — common mistakes identified from codebase audit (query-param routes using `requireSession()`, missing membership filters)

**Research date:** 2026-04-20
**Valid until:** 90 days (stable patterns; no fast-moving dependencies)
