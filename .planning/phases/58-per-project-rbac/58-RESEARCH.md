# Phase 58: Per-Project RBAC - Research

**Researched:** 2026-04-13
**Domain:** Next.js App Router route handler authorization, Drizzle ORM schema migrations, React membership management UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Bootstrap & migration:**
- Existing projects: All current users are seeded as Admin on all existing projects via a one-time migration. No one loses access on deploy.
- New project creation: The creating user is automatically added as Admin in `project_members`.
- Non-member access: Projects are hidden from the portfolio dashboard for non-members. If a non-member hits a project API directly, return 403.

**Global admin override:**
- Users with global `role: "admin"` on the `users` table bypass per-project RBAC entirely — they always have full Admin-level access on every project.
- Global admins see ALL projects in the portfolio dashboard regardless of membership.
- Global admin role always wins — even if a global admin is explicitly in `project_members` with a User role, their global role takes precedence.
- The `requireProjectRole()` wrapper must short-circuit for global admins before checking `project_members`.

**Membership management UI:**
- New Members sub-tab added to the existing Admin tab in `WorkspaceTabs.tsx` (alongside Artifacts, Review Queue, Engagement History).
- The Members sub-tab shows: list of current project members, each with name, email, role badge (Admin/User), and action buttons (change role, remove).
- An Add button opens a picker populated from existing app users — select a user and assign a role.
- Only project Admins (and global admins) can access this sub-tab and take these actions.

**Role capabilities:**
- Admin role: Full access to everything on the project including delete, archive, manage members, and global scheduler actions.
- User role: Full read/write access to all project data (risks, actions, onboarding, skills, etc.) EXCEPT: delete project, archive project, manage project membership, global scheduler actions.
- Admin-only buttons are hidden/disabled in the UI for User role members. If a User role member hits the API directly, return 403.

**Portfolio visibility:**
- Portfolio dashboard query is filtered by `project_members` for non-global-admin users — strictly membership-based.
- Portfolio-level health metrics (counts, summaries, exceptions panel) reflect only projects the current user can see.
- No "discover all projects" view for User role — they only see what they're assigned to.

### Claude's Discretion
- Exact SQL join strategy for the membership-filtered dashboard query (subquery vs. JOIN)
- Whether `requireProjectRole()` takes a minimum role level ('admin' | 'user') or separate wrappers per role
- Exact shape of the Members sub-tab UI (table vs card list, modal vs inline for add/edit)
- How to handle the edge case of a project with zero Admins (e.g., last Admin is removed)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-02 | Admin can manage project membership and role assignments (Admin/User role per project) | Covered by: `project_members` table schema, Members sub-tab component, membership CRUD API at `/api/projects/[projectId]/members` |
| AUTH-03 | User with Admin role on a project has full access: delete, archive, user management, and global scheduler actions on that project | Covered by: `requireProjectRole('admin')` guard, global scheduler `/api/jobs` admin gate, role capability matrix |
| AUTH-04 | User with User role on a project is restricted from destructive actions (delete, archive) and admin functions | Covered by: `requireProjectRole('admin')` on destructive endpoints, UI hide/disable pattern from existing `resolveRole()` usage |
| AUTH-05 | Role-based access is enforced at the route handler level for all project actions | Covered by: 46 route handlers identified under `[projectId]/`, `requireProjectRole()` wrapper replacing `requireSession()` pattern |
</phase_requirements>

---

## Summary

This phase introduces a `project_members` join table that links users to projects with an 'admin' or 'user' role. The codebase already has a solid auth foundation: `requireSession()` enforces authentication at every route handler, and `resolveRole()` provides global admin checks in settings routes. The new `requireProjectRole(session, projectId, minRole)` function follows exactly the same abstraction pattern — it short-circuits for global admins, then queries `project_members`, and returns a 403 `NextResponse` if the check fails.

There are exactly 46 route handlers under `app/api/projects/[projectId]/` that need to be updated. All of them already call `requireSession()` and destructure `{ session, redirectResponse }`. The migration is mechanical: replace `requireSession()` with `requireProjectRole(projectId, 'user')` for general access handlers, and add an additional `requireProjectRole(projectId, 'admin')` check for the handful of admin-only operations (project delete/archive, membership management, global scheduler). The portfolio dashboard's `getActiveProjects()` / `getPortfolioData()` functions in `lib/queries.ts` must be made user-aware by accepting a `userId` and `isGlobalAdmin` parameter to filter by membership.

The Members sub-tab UI is a direct reuse of the `UsersTab.tsx` table/badge/inline-edit pattern — the component structure, shadcn/ui Table+Badge+Button primitives, and `fetchWithAuth` fetch pattern are all established and available.

**Primary recommendation:** Build `requireProjectRole()` in `lib/auth-server.ts` first, then migrate all 46 route handlers in a single focused pass, then add the Members sub-tab, then update the portfolio query — in that order to keep security guarantees complete at each step.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | (existing, in use) | Define `project_members` table, run membership queries | Already the project's ORM — schema additions follow established pgTable pattern |
| better-auth | (existing, in use) | Session retrieval (`auth.api.getSession`) inside `requireProjectRole()` | Auth layer already integrated; `requireSession()` is the session source |
| Next.js App Router | 16 (Turbopack) | Route handlers, Server Components | Project stack |
| shadcn/ui | (existing) | Table, Badge, Button, Select, Dialog for Members sub-tab | Used throughout — `UsersTab.tsx` is the template |
| Vitest | ^4.1.1 | Unit tests for `requireProjectRole()` and `resolveProjectRole()` | Configured test runner; existing DB mocking pattern with `vi.mock('@/db')` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-orm `inArray` / `eq` / `and` | (existing) | Membership queries | Used in `requireProjectRole()` and portfolio filter |
| `next/headers` + `NextResponse` | (existing) | Request headers for session retrieval inside the wrapper | Already used in `requireSession()` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single `requireProjectRole(projectId, minRole)` function | Separate `requireProjectAdmin()` / `requireProjectUser()` functions | Single parameterized function is DRY and matches AUTH-05 naming requirement; separate wrappers are more readable but duplicate logic |
| JOIN in portfolio query | Subquery (`WHERE id IN (SELECT project_id FROM project_members WHERE user_id = ?)`) | Subquery is simpler with Drizzle and avoids row multiplication from M:N join; JOIN is fine but requires explicit `.distinct()` |

**Installation:** No new packages required. All dependencies already in the project.

---

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── auth-server.ts        # Add requireProjectRole() here — extends requireSession() pattern
├── auth-utils.ts         # Add resolveProjectRole() here — extends resolveRole() pattern
db/
├── schema.ts             # Add project_members table + projectMemberRoleEnum
├── migrations/
│   └── 0032_project_members.sql   # New migration: table creation + bootstrap seed
app/api/projects/
├── [projectId]/
│   ├── members/
│   │   └── route.ts      # New: GET/POST/PATCH/DELETE for membership management
│   └── [all 46 existing routes — update requireSession → requireProjectRole]
└── route.ts              # Update POST to insert creator into project_members
components/
└── workspace/
    └── MembersTab.tsx    # New: Members sub-tab component
```

### Pattern 1: requireProjectRole() Wrapper

**What:** Async function that (1) calls `requireSession()`, (2) short-circuits for global admins, (3) queries `project_members` for the calling user+project, (4) returns 403 if missing or insufficient role.

**When to use:** At the top of every route handler under `app/api/projects/[projectId]/`.

**Example:**
```typescript
// lib/auth-server.ts — new function alongside requireSession()
// Source: derived from existing requireSession() + resolveRole() patterns

export type ProjectRoleResult =
  | { session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>; redirectResponse: null; projectRole: 'admin' | 'user' }
  | { session: null; redirectResponse: NextResponse; projectRole: null };

export async function requireProjectRole(
  projectId: number,
  minRole: 'admin' | 'user' = 'user'
): Promise<ProjectRoleResult> {
  // Step 1: session check (existing pattern)
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return { session: null, redirectResponse, projectRole: null };

  // Step 2: global admin short-circuit (existing resolveRole pattern)
  if (resolveRole(session!) === 'admin') {
    return { session: session!, redirectResponse: null, projectRole: 'admin' };
  }

  // Step 3: project membership lookup
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

  if (minRole === 'admin' && member.role !== 'admin') {
    return {
      session: null,
      redirectResponse: NextResponse.json(
        { error: 'Forbidden: Admin role required' },
        { status: 403 }
      ),
      projectRole: null,
    };
  }

  return { session: session!, redirectResponse: null, projectRole: member.role };
}
```

**Route handler usage:**
```typescript
// Before (current pattern in all 46 handlers):
const { session, redirectResponse } = await requireSession();
if (redirectResponse) return redirectResponse;

// After (for general access handlers — AUTH-05):
const { projectId } = await params;
const numericId = parseInt(projectId, 10);
const { session, redirectResponse } = await requireProjectRole(numericId, 'user');
if (redirectResponse) return redirectResponse;

// For admin-only handlers (delete, archive, member management):
const { session, redirectResponse } = await requireProjectRole(numericId, 'admin');
if (redirectResponse) return redirectResponse;
```

### Pattern 2: project_members Drizzle Table
**What:** New join table in `db/schema.ts` using existing pgTable conventions.

**When to use:** Created in migration 0032; referenced in `requireProjectRole()` and membership CRUD API.

**Example:**
```typescript
// db/schema.ts — add after users table
// Source: follows existing pgTable pattern from same file

export const projectMemberRoleEnum = pgEnum('project_member_role', ['admin', 'user']);

export const projectMembers = pgTable('project_members', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: projectMemberRoleEnum('role').notNull().default('user'),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('project_members_project_user_idx').on(t.project_id, t.user_id),
]);

export type ProjectMember = typeof projectMembers.$inferSelect;
export type ProjectMemberInsert = typeof projectMembers.$inferInsert;
```

### Pattern 3: Bootstrap Migration
**What:** SQL migration that seeds all existing users as Admin on all existing projects in a single INSERT...SELECT, then enforces creator-insert in the POST /api/projects handler.

**Example:**
```sql
-- db/migrations/0032_project_members.sql

CREATE TYPE project_member_role AS ENUM ('admin', 'user');

CREATE TABLE project_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role project_member_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_members_project_user_uniq UNIQUE (project_id, user_id)
);

-- Bootstrap: seed all current users as Admin on all current projects
INSERT INTO project_members (project_id, user_id, role)
SELECT p.id, u.id, 'admin'
FROM projects p
CROSS JOIN users u
ON CONFLICT DO NOTHING;
```

### Pattern 4: Portfolio Query Membership Filter
**What:** Update `getActiveProjects()` and `getPortfolioData()` in `lib/queries.ts` to accept `{ userId: string, isGlobalAdmin: boolean }` and filter by `project_members` for non-global-admin users.

**When to use:** Called from `app/page.tsx` (Server Component) which must pass the current session's user info.

**Example:**
```typescript
// lib/queries.ts — update getActiveProjects signature
export async function getActiveProjects(
  opts?: { userId?: string; isGlobalAdmin?: boolean }
): Promise<ProjectWithHealth[]> {
  const baseQuery = db
    .select()
    .from(projects)
    .where(inArray(projects.status, ['active', 'draft']));

  let activeProjects;
  if (!opts?.userId || opts.isGlobalAdmin) {
    // Global admin or unauthenticated (should not happen in practice): return all
    activeProjects = await baseQuery;
  } else {
    // Membership filter: subquery approach
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
  // ... rest of health computation unchanged
}
```

### Pattern 5: Members Sub-Tab UI
**What:** New `MembersTab.tsx` component following `UsersTab.tsx` table+badge+inline-edit pattern. Added as 4th entry in the Admin tab children array in `WorkspaceTabs.tsx`.

**Example — WorkspaceTabs.tsx update:**
```typescript
// components/WorkspaceTabs.tsx — Admin tab children (currently lines 52-56)
{
  id: 'admin',
  label: 'Admin',
  children: [
    { id: 'artifacts', label: 'Artifacts',          segment: 'artifacts' },
    { id: 'queue',     label: 'Review Queue',       segment: 'queue' },
    { id: 'history',   label: 'Engagement History', segment: 'history' },
    { id: 'members',   label: 'Members',            segment: 'members' },  // NEW
  ],
},
```

### Anti-Patterns to Avoid
- **Skipping `requireProjectRole()` on any handler:** Partial migration creates security holes. AUTH-05 requires ALL 46 handlers. One missed handler is a bypass.
- **Checking role in UI only:** The CONTEXT.md decision is explicit: "If a User role member hits the API directly, return 403." UI gating alone is insufficient.
- **Reading `session.user.role` directly:** The existing convention is `resolveRole(session)` for global role. Follow the same indirection for project role via `resolveProjectRole()`.
- **Forgetting `{ onDelete: 'cascade' }` on project_members FKs:** If a project is deleted (Phase 59), orphaned member rows must be cleaned up automatically.
- **Allowing zero-Admin projects without a guard:** If the last Admin tries to remove themselves or change their own role to User, the API must block it (check remaining admin count before completing the operation).
- **Not wrapping the POST /api/projects creator-insert in the transaction:** The existing project creation is already a `db.transaction(...)` — the creator `project_members` insert belongs inside that same transaction so it's atomic.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session retrieval inside `requireProjectRole()` | Custom session fetch | Call existing `requireSession()` from `lib/auth-server.ts` | It already handles CVE-2025-29927 defense-in-depth; all headers handling is done |
| Global role normalization | `session.user.role === 'admin'` inline check | `resolveRole(session)` from `lib/auth-utils.ts` | Okta-readiness built in; changing auth providers later won't break it |
| DB connection | New pg client | Import `db` from `@/db` | Already configured Drizzle instance with connection pooling |
| User picker for Add Member | Custom autocomplete | `fetchWithAuth('/api/settings/users')` to load users, then a Select dropdown | Existing user listing API returns all app users; reuse it |
| Confirmation dialog for Remove Member | Custom confirm modal | `DeleteConfirmDialog` from `components/DeleteConfirmDialog.tsx` | Already built, tested, exactly the right abstraction |
| Migration tracking | Manual SQL file | Drop into `db/migrations/` as `0032_project_members.sql` | Drizzle migration system already in place; just add the file |

**Key insight:** Every building block exists. This phase is wiring, not invention.

---

## Common Pitfalls

### Pitfall 1: Partial Route Migration Creates Security Holes
**What goes wrong:** Developer updates 40 of 46 handlers, misses 6 (e.g., nested routes like `/[workflowId]/steps/[stepId]/route.ts`), and those 6 bypass RBAC entirely.
**Why it happens:** The route tree is deep — some handlers are 4 levels deep (`[projectId]/e2e-workflows/[workflowId]/steps/[stepId]/route.ts`). It's easy to miss.
**How to avoid:** Use a grep-based checklist: `find app/api/projects/\[projectId\] -name "route.ts"` produces a definitive list of 46 files. Tick each one off. Make the migration in a single wave.
**Warning signs:** Any route handler under `[projectId]/` still importing `requireSession` without wrapping in `requireProjectRole` after the migration wave.

### Pitfall 2: getPortfolioData() Called from Server Component Without Session
**What goes wrong:** `app/page.tsx` is a Server Component that calls `getPortfolioData()` directly. Passing session info requires reading the session server-side in the page component — but `page.tsx` doesn't currently do this.
**Why it happens:** The portfolio page was built before per-user data filtering was needed.
**How to avoid:** Update `app/page.tsx` to call `requireSession()` (or use `auth.api.getSession({ headers: await headers() })`), extract `userId` and `isGlobalAdmin`, and pass them to `getPortfolioData(opts)`.
**Warning signs:** Portfolio shows all projects to all users after the migration.

### Pitfall 3: Zero-Admin Edge Case on Remove Member
**What goes wrong:** A project Admin removes the last Admin from a project (including themselves), leaving a project with only User-role members or no members. No one can manage it.
**Why it happens:** The DELETE `/members/:userId` handler doesn't check remaining admin count.
**How to avoid:** In the membership management API, before removing a member or changing their role to 'user', query `COUNT(*) WHERE project_id = X AND role = 'admin'`. If it would drop to 0, return 400.
**Warning signs:** A project in `project_members` where `SELECT COUNT(*) WHERE role = 'admin' AND project_id = X` returns 0.

### Pitfall 4: Creator Insert Not Inside Existing Transaction
**What goes wrong:** `app/api/projects/route.ts` POST already wraps project creation + WBS seeding + arch track seeding in a single `db.transaction(...)`. If the `project_members` insert is added AFTER the transaction returns, a crash between project creation and member insert leaves a project with no owner.
**Why it happens:** Adding the insert after the `return inserted` line in the transaction callback.
**How to avoid:** The `project_members` insert must be inside the existing `db.transaction(async (tx) => { ... })` block, using `tx.insert(projectMembers)`, before `return inserted`.
**Warning signs:** Projects exist in the DB with no rows in `project_members`.

### Pitfall 5: UI Role Checks Reading Stale Session Data
**What goes wrong:** The Members sub-tab needs to conditionally hide/show admin actions based on the current user's project role. If the component reads only the global session (from `useSession()`), it won't know the per-project role.
**Why it happens:** `useSession()` from `lib/auth-client.ts` returns global user data, not per-project membership.
**How to avoid:** The Members sub-tab (and any component needing per-project role for UI gating) should fetch the current user's role from `/api/projects/[projectId]/members/me` (a dedicated lightweight endpoint) or include the current user's project role in the existing project data API response.
**Warning signs:** Admin-only buttons visible to User-role members in the UI.

---

## Code Examples

### Existing Pattern: requireSession() (template for requireProjectRole)
```typescript
// Source: lib/auth-server.ts (exact current code)
export async function requireSession(): Promise<SessionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return {
      session: null,
      redirectResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session, redirectResponse: null };
}
```

### Existing Pattern: resolveRole() (template for resolveProjectRole)
```typescript
// Source: lib/auth-utils.ts (exact current code)
export function resolveRole(session: CredentialSession | OIDCSession): "admin" | "user" {
  if ("user" in session && session.user?.role) {
    return session.user.role === "admin" ? "admin" : "user";
  }
  // ...OIDC path
  return "user";
}
```

### Existing Pattern: Route Handler Before Migration
```typescript
// Source: app/api/projects/[projectId]/route.ts (exact current code)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;
  const { projectId } = await params;
  // ...
}
```

### Existing Pattern: Admin-Only Check (settings/users route)
```typescript
// Source: app/api/settings/users/route.ts (exact current code)
const { session, redirectResponse } = await requireSession();
if (redirectResponse) return redirectResponse;
if (resolveRole(session!) !== "admin") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

### Existing Pattern: Drizzle uniqueIndex (used in archNodes, template for project_members)
```typescript
// Source: db/schema.ts — archNodes table
}, (t) => [
  uniqueIndex('arch_nodes_project_track_name_idx').on(t.project_id, t.track_id, t.name),
]);
```

### Existing Pattern: DB-mocked Vitest test (template for requireProjectRole tests)
```typescript
// Source: app/api/__tests__/health.test.ts
vi.mock('@/db', () => {
  const dbMock = {
    select: vi.fn(),
    // ...
  };
  return { db: dbMock, default: dbMock };
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global-only RBAC (`users.role`) | Per-project membership table | Phase 58 (this phase) | Projects invisible/403 to non-members |
| `getActiveProjects()` returns all projects | `getActiveProjects(opts)` filters by membership | Phase 58 (this phase) | Portfolio dashboard becomes user-scoped |
| `requireSession()` only at project routes | `requireProjectRole(projectId, minRole)` | Phase 58 (this phase) | All 46 handlers enforce membership + role |

---

## Open Questions

1. **Global scheduler admin gate**
   - What we know: `/api/jobs` routes are Admin-only for global scheduler actions (CONTEXT.md: "User role cannot... global scheduler actions"). These routes are under `/api/jobs/` not `/api/projects/[projectId]/`.
   - What's unclear: The existing `/api/jobs/route.ts` calls `requireSession()` but does NOT call `resolveRole()` to check for global admin. AUTH-03 says "Admin role user can... perform global scheduler actions."
   - Recommendation: Add a `resolveRole(session!) === 'admin'` guard to `/api/jobs/route.ts`, `/api/jobs/[id]/route.ts`, and `/api/jobs/trigger/route.ts`. This is a global role check (not per-project), consistent with the existing pattern in `app/api/settings/users/route.ts`.

2. **Project_members API endpoint for current user's role**
   - What we know: UI components need to know the current user's project role for conditional rendering.
   - What's unclear: Best delivery mechanism — include in project GET response, or a separate `/members/me` endpoint.
   - Recommendation: Add `projectRole: 'admin' | 'user' | null` to the existing `GET /api/projects/[projectId]` response. This avoids an extra round-trip and the data is always available when the workspace loads.

3. **Existing `audit_log` table usage for membership changes**
   - What we know: `audit_log` table exists with `entity_type`, `action`, `actor_id`, `before_json`, `after_json`.
   - What's unclear: Whether RBAC changes (add member, change role, remove member) should be logged to `audit_log`.
   - Recommendation: Yes — log membership changes. Pattern is established in `lib/audit.ts` (if it exists) or inline in the members API. Low effort, high value for debugging.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.1 |
| Config file | `bigpanda-app/vitest.config.ts` |
| Quick run command | `cd bigpanda-app && npx vitest run app/api/__tests__/rbac.test.ts` |
| Full suite command | `cd bigpanda-app && npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-02 | Members CRUD API returns correct data for admin | unit | `npx vitest run app/api/__tests__/rbac.test.ts -t "members"` | Wave 0 |
| AUTH-03 | requireProjectRole('admin') passes for global admin and project admin, blocks project user | unit | `npx vitest run lib/__tests__/require-project-role.test.ts` | Wave 0 |
| AUTH-04 | requireProjectRole('admin') returns 403 for project User role | unit | `npx vitest run lib/__tests__/require-project-role.test.ts -t "user blocked"` | Wave 0 |
| AUTH-05 | requireProjectRole('user') returns 403 for non-member | unit | `npx vitest run lib/__tests__/require-project-role.test.ts -t "non-member"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd bigpanda-app && npx vitest run lib/__tests__/require-project-role.test.ts`
- **Per wave merge:** `cd bigpanda-app && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `bigpanda-app/lib/__tests__/require-project-role.test.ts` — covers AUTH-03, AUTH-04, AUTH-05 (unit tests for `requireProjectRole()` with mocked DB)
- [ ] `bigpanda-app/app/api/__tests__/rbac.test.ts` — covers AUTH-02, AUTH-03, AUTH-04 (integration tests for `/api/projects/[projectId]/members` CRUD)

---

## Sources

### Primary (HIGH confidence)
- Codebase: `bigpanda-app/lib/auth-server.ts` — exact `requireSession()` pattern that `requireProjectRole()` extends
- Codebase: `bigpanda-app/lib/auth-utils.ts` — exact `resolveRole()` pattern for global admin short-circuit
- Codebase: `bigpanda-app/db/schema.ts` — exact Drizzle schema conventions (pgTable, pgEnum, uniqueIndex, FK references)
- Codebase: `bigpanda-app/app/api/settings/users/route.ts` — exact admin-only route handler pattern
- Codebase: `bigpanda-app/components/settings/UsersTab.tsx` — exact UI pattern for Members sub-tab
- Codebase: `bigpanda-app/app/api/projects/route.ts` — exact project creation transaction to extend with member insert
- Codebase: `bigpanda-app/components/WorkspaceTabs.tsx` — exact Admin tab children array location (lines 52–56) for Members sub-tab slot
- Codebase: `bigpanda-app/vitest.config.ts` — test runner configuration
- Codebase: `bigpanda-app/app/api/__tests__/health.test.ts` — DB mock pattern for unit tests
- Codebase: `bigpanda-app/lib/queries.ts` lines 273–288 — `getActiveProjects()` implementation to extend with membership filter

### Secondary (MEDIUM confidence)
- CONTEXT.md `58-CONTEXT.md` — user-locked decisions for all implementation choices

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are existing project dependencies, no new packages
- Architecture: HIGH — patterns are directly observed from codebase, not inferred
- Pitfalls: HIGH — derived from reading actual code paths, not general RBAC theory
- Route handler count: HIGH — `find` command confirmed 46 handlers under `[projectId]/`

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable codebase; recheck if schema migrations added before planning)
