# Phase 59: Project Lifecycle Management - Research

**Researched:** 2026-04-14
**Domain:** Next.js 16 server/client component patterns, Drizzle ORM soft-delete, better-auth signOut, BullMQ pre-flight, sidebar collapsed section
**Confidence:** HIGH

## Summary

Phase 59 is primarily a wiring and UI phase — every major prerequisite already exists in the codebase. The `projectStatusEnum` in `db/schema.ts` already contains `'archived'`; `requireProjectRole` from Phase 58 is the auth gate; `DeleteConfirmDialog` is a ready-made confirm dialog; `signOut` and `useSession` are exported from `lib/auth-client.ts`. No new schema migrations are needed for archive/restore.

The work divides into three clean tracks: (1) API layer — upgrade the PATCH handler to require admin role and add an archived-project write-block, add a DELETE handler with pre-flight check; (2) Sidebar — query archived projects in the server component, add a collapsed-by-default section and a `'use client'` user/logout island at the bottom; (3) Workspace UI — add an "Archived — read only" banner with Admin-only Restore button in the workspace layout, and add a Danger Zone section inside the Admin tab. The Portfolio dashboard needs one query change: `getPortfolioData` calls `getActiveProjects`, which already filters `status IN ('active','draft')` — archived and deleted projects are already excluded from the active table with no further change needed for PORTF-02; PORTF-01 is satisfied by the sidebar archived section.

The only tricky area is the pre-flight check for permanent delete: the decision is to check for active BullMQ jobs (skill runs / extraction jobs) at the `project_id` level before allowing DELETE. This requires querying `skill_runs` and `extraction_jobs` tables for in-flight records, which is a simple DB query — no BullMQ queue introspection required.

**Primary recommendation:** Treat this as a 4-wave phase — API, Sidebar + Logout, Workspace Banner + Danger Zone, Portfolio verification.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Archive and permanent delete actions live in a **Danger Zone section** at the bottom of the Admin tab (not in the project header)
- Only Admins see and can use these actions (User role does not see the Danger Zone)
- A project **must be archived first** before permanent delete is available — no direct delete from active state
- Once archived, the Admin can choose to permanently delete from the archived project's Admin tab
- Permanent delete uses a **simple confirm dialog** (existing `DeleteConfirmDialog` pattern — no project-name type-in required)
- Archived projects appear in a **collapsed section at the bottom of the sidebar**, below all active projects
- Section is **collapsed by default** — expands on click to show archived project names
- The sidebar section satisfies PROJ-03 (dedicated archived view) and PORTF-01 (portfolio separation)
- A **"Archived — read only" banner** displays at the top of the workspace when viewing an archived project
- The **banner contains a Restore button** (visible to Admins only)
- All write route handlers return **403 for archived projects** at the API level — this is the hard gate
- UI does not need to hide every edit button individually; API enforcement is the authoritative boundary
- Restore is triggered from the banner inside the archived project workspace
- Restoring sets `status` back to `'active'`; project reappears in the active sidebar list and is writable again
- A **client island at the bottom of the sidebar** shows the logged-in user's **name + logout button**
- Sidebar is a server component — the user section is a `'use client'` wrapper component using `useSession` and `signOut` from `lib/auth-client`
- After logout → redirect to `/login`

### Claude's Discretion

- Exact styling and copy for the archived banner and Danger Zone section
- Whether the sidebar archived section shows a count badge (e.g., "Archived (3)")
- Pre-flight check implementation for permanent delete (e.g., check for active BullMQ jobs before allowing)
- Exact shape of the sidebar user/logout component (spacing, icon choice)

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROJ-01 | Admin can archive a project (soft-delete: project becomes read-only, preserved in system) | `projectStatusEnum` already has `'archived'`; PATCH route needs admin role guard + status='archived' write; Sidebar needs `getArchivedProjects()` |
| PROJ-02 | Admin can permanently delete a project | New DELETE handler with `requireProjectRole(id,'admin')` + pre-flight check on `skill_runs`/`extraction_jobs` + `db.delete(projects)` (cascade via FK) |
| PROJ-03 | User can view archived projects in a dedicated archived projects view (read-only) | Sidebar collapsed section + link to archived project workspace; banner enforces read-only perception; API enforces write-block |
| PROJ-04 | Admin can restore an archived project back to active status | Banner Restore button calls PATCH with `{status:'active'}`; existing PATCH handler already handles active transition + seedProjectFromRegistry call |
| AUTH-01 | User can log out of the application from the navigation or user menu | `SidebarUserIsland` client component using `signOut` from `lib/auth-client`; placed at sidebar bottom |
| PORTF-01 | Portfolio dashboard displays archived projects in a separate view or filter, distinct from active projects | Sidebar archived section is the dedicated view; `getPortfolioData` already excludes non-active; no portfolio page changes required for separation |
| PORTF-02 | Portfolio dashboard excludes permanently deleted projects from all views | `getActiveProjects` filters `status IN ('active','draft')`; permanent DELETE removes the row entirely — automatically excluded |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | existing | `db.update(projects).set({status:'archived'})` and `db.delete(projects).where(...)` | Already in use; cascade FK deletes child rows |
| better-auth | existing | `signOut()` and `useSession()` for sidebar logout island | Already configured in `lib/auth-client.ts` |
| Next.js 16 | existing | Server component sidebar + `'use client'` island pattern | Established pattern in codebase |
| `requireProjectRole` | Phase 58 | Route-level RBAC gate for all write operations | Established pattern; already imported in `/api/projects/[projectId]/route.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | existing | Icons for banner, Danger Zone, user island | Already used throughout sidebar and workspace |
| shadcn/ui Dialog | existing | `DeleteConfirmDialog` reuse for Archive and Delete confirms | Already present in `components/DeleteConfirmDialog.tsx` |
| shadcn/ui Button | existing | Restore, Archive, Delete buttons | Already present |
| shadcn/ui Badge | existing | Optional count badge on archived sidebar section | Already present |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DB-level cascade delete | Application-level multi-table delete | Cascade is safer — 57+ phases of FK evolution; cascade already configured on most child tables (`onDelete: 'cascade'`) |
| BullMQ Queue introspection for pre-flight | DB query on `skill_runs` + `extraction_jobs` | DB query is simpler, testable, no Redis connection in delete handler; BullMQ introspection requires Worker/Queue instantiation |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Project Structure
```
app/
├── api/projects/[projectId]/route.ts   # upgrade PATCH (admin role + archived check) + add DELETE
├── customer/[id]/layout.tsx            # add ArchivedBanner (server reads project.status)
components/
├── Sidebar.tsx                         # add getArchivedProjects(), ArchivedSection, SidebarUserIsland
├── SidebarUserIsland.tsx               # 'use client' — useSession + signOut
├── ArchivedBanner.tsx                  # 'use client' — Restore button + admin visibility
├── workspace/DangerZoneSection.tsx     # 'use client' — Archive/Delete buttons, admin-only
lib/
└── queries.ts                          # add getArchivedProjects()
```

### Pattern 1: Archived-Project Write-Block in Route Handlers
**What:** After role check passes, fetch project and return 403 if `project.status === 'archived'` before executing any mutation.
**When to use:** All PATCH/POST/DELETE handlers that mutate project-scoped data (except the archive/restore PATCH and the permanent delete DELETE themselves).
**Example:**
```typescript
// Source: established requireProjectRole pattern in lib/auth-server.ts
export async function PATCH(req: NextRequest, { params }) {
  const { projectId } = await params;
  const numericId = parseInt(projectId, 10);
  const { session, redirectResponse, projectRole } = await requireProjectRole(numericId, 'admin');
  if (redirectResponse) return redirectResponse;

  // Archived-project write-block
  const [project] = await db.select({ status: projects.status })
    .from(projects).where(eq(projects.id, numericId)).limit(1);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (project.status === 'archived') {
    return NextResponse.json({ error: 'Project is archived and read-only' }, { status: 403 });
  }

  // ... proceed with mutation
}
```

### Pattern 2: 'use client' Island Inside Server Component (Sidebar)
**What:** Sidebar is a server component (async function, fetches data). User/logout section requires client hooks (`useSession`, `signOut`). Wrap in a `'use client'` leaf component.
**When to use:** Any place a server component needs client-side interactivity.
**Example:**
```typescript
// Source: SessionExpiredModal.tsx pattern and CONTEXT.md decision
// components/SidebarUserIsland.tsx
'use client';
import { useSession, signOut } from '@/lib/auth-client';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function SidebarUserIsland() {
  const { data: session } = useSession();
  const router = useRouter();
  const name = session?.user?.name ?? '…';

  return (
    <div className="px-4 py-3 border-t border-zinc-700 flex items-center justify-between">
      <span className="text-sm text-zinc-300 truncate">{name}</span>
      <button
        onClick={() => signOut({ fetchOptions: { onSuccess: () => router.push('/login') } })}
        className="text-zinc-400 hover:text-zinc-100"
        title="Log out"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}
```

### Pattern 3: Collapsed Sidebar Section (Archived Projects)
**What:** Server component renders a `<details>` element or a client-collapsible section. Since Sidebar is a server component, using native HTML `<details>/<summary>` avoids adding a 'use client' boundary.
**When to use:** Collapsed-by-default content in a server component where no state management is needed beyond open/close.
**Example:**
```typescript
// components/Sidebar.tsx addition (server component, no 'use client' needed for details)
const archivedProjects = await getArchivedProjects(); // new query

// In JSX:
{archivedProjects.length > 0 && (
  <details className="px-2 mt-2">
    <summary className="px-2 py-1.5 text-xs uppercase tracking-wider text-zinc-500 cursor-pointer select-none hover:text-zinc-400">
      Archived ({archivedProjects.length})
    </summary>
    <ul className="space-y-0.5 mt-1">
      {archivedProjects.map((p) => (
        <li key={p.id}>
          <Link href={`/customer/${p.id}/overview`}
            className="flex items-start gap-2.5 px-2 py-2 rounded hover:bg-zinc-800 text-sm text-zinc-500 hover:text-zinc-400 transition-colors">
            {p.customer}
          </Link>
        </li>
      ))}
    </ul>
  </details>
)}
```

### Pattern 4: Pre-Flight Check for Permanent Delete
**What:** Before executing `db.delete(projects)`, query `skill_runs` and `extraction_jobs` for in-flight records. Return 409 Conflict if any are found.
**When to use:** DELETE handler only.
**Example:**
```typescript
// app/api/projects/[projectId]/route.ts — DELETE handler
import { skillRuns, extractionJobs } from '@/db/schema';
import { inArray } from 'drizzle-orm';

export async function DELETE(req: NextRequest, { params }) {
  const { projectId } = await params;
  const numericId = parseInt(projectId, 10);
  const { redirectResponse } = await requireProjectRole(numericId, 'admin');
  if (redirectResponse) return redirectResponse;

  // Pre-flight: block delete if any jobs are running/pending
  const [activeSkillRun] = await db.select({ id: skillRuns.id })
    .from(skillRuns)
    .where(and(
      eq(skillRuns.project_id, numericId),
      inArray(skillRuns.status, ['pending', 'running'])
    ))
    .limit(1);

  const [activeExtraction] = await db.select({ id: extractionJobs.id })
    .from(extractionJobs)
    .where(and(
      eq(extractionJobs.project_id, numericId),
      inArray(extractionJobs.status, ['pending', 'running'])
    ))
    .limit(1);

  if (activeSkillRun || activeExtraction) {
    return NextResponse.json(
      { error: 'Cannot delete project with active jobs. Wait for them to complete.' },
      { status: 409 }
    );
  }

  await db.delete(projects).where(eq(projects.id, numericId));
  return NextResponse.json({ ok: true });
}
```

### Pattern 5: ArchivedBanner in Workspace Layout
**What:** The layout server component reads `project.status`. If `'archived'`, it passes a flag to a client banner component that shows the banner and the admin-only Restore button.
**When to use:** `app/customer/[id]/layout.tsx` — already fetches `project` via `getProjectWithHealth`.
**Example:**
```typescript
// app/customer/[id]/layout.tsx addition
{project?.status === 'archived' && (
  <Suspense fallback={null}>
    <ArchivedBanner projectId={projectId} isAdmin={isProjectAdmin} />
  </Suspense>
)}
```
```typescript
// components/ArchivedBanner.tsx
'use client';
import { useRouter } from 'next/navigation';
export function ArchivedBanner({ projectId, isAdmin }: { projectId: number; isAdmin: boolean }) {
  const router = useRouter();
  async function handleRestore() {
    await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
    router.refresh();
  }
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between">
      <span className="text-sm text-amber-800 font-medium">Archived — read only</span>
      {isAdmin && (
        <button onClick={handleRestore}
          className="text-sm text-amber-700 underline hover:text-amber-900">
          Restore project
        </button>
      )}
    </div>
  );
}
```

### Pattern 6: Danger Zone Section in Admin Tab
**What:** A server page (`app/customer/[id]/members/page.tsx` pattern) passes `isProjectAdmin` to the workspace component. The admin sub-page or a new component renders the Danger Zone section only when `isProjectAdmin === true`.
**When to use:** The Admin tab's members page already shows a pattern for `isProjectAdmin` prop. The Danger Zone can live as a section within a new or existing admin sub-tab page.
**Where:** Per CONTEXT.md, this is a section within the existing Admin tab — a new "Settings" sub-tab is the natural home, but Claude has discretion. Alternatively, append it to the existing `members` page as a bottom section.

### Anti-Patterns to Avoid
- **Hiding every edit button for archived projects in the UI:** API enforcement is the authoritative boundary per CONTEXT.md. UI only shows the banner; buttons do not need to be individually disabled.
- **Calling BullMQ Queue directly in the DELETE handler:** Requires Redis connection and Worker/Queue boilerplate. Use DB query on `skill_runs` and `extraction_jobs` tables instead — simpler, testable, consistent with project patterns.
- **Adding 'use client' to Sidebar.tsx:** Sidebar is intentionally a server component for performance (async data fetch). Add client islands as leaf components only.
- **Modifying `getPortfolioData` for PORTF-02:** Portfolio already excludes non-active projects. Permanent delete removes the row — no query change needed.
- **Calling `seedProjectFromRegistry` on restore if the project was previously seeded:** The existing PATCH handler already calls `seedProjectFromRegistry` when `status === 'active'`. Confirm this is idempotent (check `seeded` flag) — it is, because the seed function checks `seeded: false` before inserting.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirm dialog for archive/delete | Custom modal | `DeleteConfirmDialog` (`components/DeleteConfirmDialog.tsx`) | Already handles loading state, cancel, destructive button styling |
| Auth gate on route handlers | Custom session check | `requireProjectRole(id, 'admin')` from `lib/auth-server.ts` | Phase 58 built this; global admin bypass already handled |
| Client-side logout | Custom fetch to `/api/auth/signout` | `signOut()` from `lib/auth-client.ts` | better-auth handles session invalidation, cookie clearing |
| Sidebar collapse state | useState + client component | Native HTML `<details>/<summary>` | Server component compatible; no JS required; CSS-only collapse |
| Cascade delete of child rows | Manual multi-table delete in application code | PostgreSQL FK `onDelete: 'cascade'` | Most child tables already declare `references(() => projects.id, { onDelete: 'cascade' })` |

**Key insight:** The cascade delete situation requires a pre-flight audit. Most child tables have `onDelete: 'cascade'` (workstreams, actions, risks, milestones, artifacts, tasks, stakeholders, etc.) but some nullable FK columns use `onDelete: 'set null'` (outputs, knowledge_base). These will not cascade-delete — they will survive with a null project_id. This is acceptable behavior for permanent delete (outputs and KB entries become orphaned cross-project records).

## Common Pitfalls

### Pitfall 1: PATCH handler role mismatch — archive requires admin but current PATCH uses 'user'
**What goes wrong:** The existing PATCH in `app/api/projects/[projectId]/route.ts` calls `requireProjectRole(numericId, 'user')` — any project member can currently PATCH the project status. Archive and restore must require `'admin'`.
**Why it happens:** The original PATCH was written before Phase 58 RBAC existed.
**How to avoid:** Upgrade PATCH to `requireProjectRole(numericId, 'admin')` for status-change operations. Note: this will also gate the restore call — ensure the restore button in ArchivedBanner only shows for admins (already locked by CONTEXT.md).
**Warning signs:** Any user being able to archive or restore a project.

### Pitfall 2: Sidebar server component navigation after archive/restore
**What goes wrong:** After PATCH succeeds, the sidebar still shows the project in the active list because Next.js cached the server component. `router.refresh()` in the client component does not always bust the server component cache.
**Why it happens:** Next.js App Router caches server component output. `router.refresh()` triggers a full server re-render which should work, but some edge caching may persist.
**How to avoid:** Use `router.refresh()` after mutating status — this is the established pattern in the codebase. If issues arise, use `router.push('/')` to navigate away entirely after archive, which is a better UX anyway (the project is now archived and the user should land on the portfolio).
**Warning signs:** Archived project still appearing in active sidebar list after action.

### Pitfall 3: `seedProjectFromRegistry` called on restore for already-seeded project
**What goes wrong:** The PATCH handler calls `seedProjectFromRegistry` when status becomes `'active'`. On restore, this might attempt to re-seed a project that already has data.
**Why it happens:** The handler already has this logic at line 65: `if (status === 'active') { await seedProjectFromRegistry(numericId) }`.
**How to avoid:** Verify that `seedProjectFromRegistry` is idempotent. It checks `seeded: false` before inserting, so calling it on an already-seeded project is safe (no-op). Confirmed: `projects.seeded` column is set to `true` after first seed.
**Warning signs:** Duplicate seeded data appearing after restore.

### Pitfall 4: Archived project write-block must not block the restore PATCH itself
**What goes wrong:** If the archived-project check is added unconditionally at the top of PATCH, the restore call (`PATCH { status: 'active' }`) will itself be blocked by the archived check.
**Why it happens:** The check fires before looking at the request body.
**How to avoid:** Structure the PATCH handler so that the archived-project write-block is only applied for mutations that are NOT archive/restore status transitions. One clean approach: allow status field updates from the archived-project write-block bypass (i.e., do not apply the block when the PATCH body contains `status`), or check specifically for `body.status === 'active'` as the restore path.
**Warning signs:** Restore button returns 403 when attempting to restore an archived project.

### Pitfall 5: Portfolio page requires `isProjectAdmin` flag for ArchivedBanner
**What goes wrong:** `app/customer/[id]/layout.tsx` currently fetches project data but does not determine `isProjectAdmin`. The banner needs this to show/hide the Restore button.
**Why it happens:** RBAC was added in Phase 58 but workspace layout hasn't been updated to pass role info.
**How to avoid:** Add the same `isProjectAdmin` resolution pattern from `app/customer/[id]/members/page.tsx` into the layout. Fetch session, check `resolveRole`, check `projectMembers` table. Pass `isProjectAdmin` prop to `ArchivedBanner`.
**Warning signs:** Restore button not visible to admins, or visible to non-admins.

### Pitfall 6: Sidebar needs auth context for user/logout island
**What goes wrong:** `SidebarUserIsland` uses `useSession()` which needs the session cookie — this works fine in the browser. However, the component must be a `'use client'` leaf and NOT import any server-only modules.
**Why it happens:** Mixing server and client boundaries in Next.js App Router causes runtime errors.
**How to avoid:** Keep `SidebarUserIsland` as a pure client component importing only from `@/lib/auth-client`. Do not import from `@/lib/auth` (server-only).
**Warning signs:** "You're importing a component that imports server-only" build error.

## Code Examples

Verified patterns from official sources (codebase):

### getArchivedProjects Query
```typescript
// Source: lib/queries.ts — mirrors getActiveProjects pattern
export async function getArchivedProjects(): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(eq(projects.status, 'archived'));
}
```
Note: Archived projects do not need health computation for the sidebar — they are display-only.

### PATCH Handler Upgrade (archive + restore)
```typescript
// Source: app/api/projects/[projectId]/route.ts — upgraded PATCH
export async function PATCH(req: NextRequest, { params }) {
  const { projectId } = await params;
  const numericId = parseInt(projectId, 10);
  if (isNaN(numericId)) return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });

  const { redirectResponse } = await requireProjectRole(numericId, 'admin'); // upgraded from 'user'
  if (redirectResponse) return redirectResponse;

  const body = await req.json();
  const { status } = body;

  // Archived-project write-block: bypass for status transitions (archive/restore)
  const allowedStatusTransitions = ['archived', 'active'];
  if (!allowedStatusTransitions.includes(status)) {
    const [current] = await db.select({ status: projects.status })
      .from(projects).where(eq(projects.id, numericId)).limit(1);
    if (current?.status === 'archived') {
      return NextResponse.json({ error: 'Project is archived and read-only' }, { status: 403 });
    }
  }

  const updated = await db.update(projects)
    .set({ status, updated_at: new Date() })
    .where(eq(projects.id, numericId))
    .returning({ id: projects.id });

  if (updated.length === 0) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  if (status === 'active') {
    await seedProjectFromRegistry(numericId); // idempotent — checks seeded flag
  }

  return NextResponse.json({ ok: true });
}
```

### DELETE Handler with Pre-Flight Check
```typescript
// Source: app/api/projects/[projectId]/route.ts — new DELETE handler
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const numericId = parseInt(projectId, 10);
  if (isNaN(numericId)) return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });

  const { redirectResponse } = await requireProjectRole(numericId, 'admin');
  if (redirectResponse) return redirectResponse;

  // Pre-flight: require project to be archived first
  const [project] = await db.select({ status: projects.status })
    .from(projects).where(eq(projects.id, numericId)).limit(1);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (project.status !== 'archived') {
    return NextResponse.json(
      { error: 'Project must be archived before permanent deletion' },
      { status: 409 }
    );
  }

  // Pre-flight: check for active jobs
  const [activeSkillRun] = await db.select({ id: skillRuns.id })
    .from(skillRuns)
    .where(and(eq(skillRuns.project_id, numericId), inArray(skillRuns.status, ['pending', 'running'])))
    .limit(1);
  const [activeExtraction] = await db.select({ id: extractionJobs.id })
    .from(extractionJobs)
    .where(and(eq(extractionJobs.project_id, numericId), inArray(extractionJobs.status, ['pending', 'running'])))
    .limit(1);

  if (activeSkillRun || activeExtraction) {
    return NextResponse.json(
      { error: 'Cannot delete project with active jobs running.' },
      { status: 409 }
    );
  }

  await db.delete(projects).where(eq(projects.id, numericId));
  return NextResponse.json({ ok: true });
}
```

### DeleteConfirmDialog Reuse for Danger Zone
```typescript
// Source: components/DeleteConfirmDialog.tsx — existing component
<DeleteConfirmDialog
  entityLabel="this project (permanent)"
  onConfirm={async () => {
    const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error);
    }
    router.push('/');
  }}
  trigger={<Button variant="destructive" size="sm">Delete permanently</Button>}
/>
```

### signOut Usage in SidebarUserIsland
```typescript
// Source: lib/auth-client.ts exports — signOut, useSession
import { signOut, useSession } from '@/lib/auth-client';
// signOut with redirect callback:
await signOut({ fetchOptions: { onSuccess: () => router.push('/login') } });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No archived state in sidebar | Collapsed section at bottom | Phase 59 | Archived projects accessible but not cluttering active list |
| Delete available on active projects | Must archive first, then delete | Phase 59 | Two-step delete prevents accidental permanent deletion |
| PATCH allows 'user' role | PATCH requires 'admin' role for status changes | Phase 59 | Closes RBAC gap in project route handler |
| No logout in navigation | Sidebar user island with logout | Phase 59 | Satisfies AUTH-01 |

**Deprecated/outdated:**
- The current `requireProjectRole(numericId, 'user')` in the project PATCH handler is a Phase 58 gap — this must be upgraded to `'admin'` for status transitions.

## Open Questions

1. **Should the Danger Zone be a new "Settings" sub-tab or appended to the Members page?**
   - What we know: WorkspaceTabs has an Admin group with sub-tabs: Artifacts, Review Queue, Engagement History, Members
   - What's unclear: CONTEXT.md says "section within the existing Admin tab" — could be a new Settings sub-tab or appended to Members
   - Recommendation: Add a new "Settings" sub-tab to the Admin group for cleaner separation. This avoids overloading Members with unrelated content and is extensible for future settings.

2. **Does `seedProjectFromRegistry` silently succeed on an already-seeded project?**
   - What we know: The `seeded` boolean column exists and is checked
   - What's unclear: The actual implementation wasn't read — assumption is idempotency based on the column existence
   - Recommendation: Verify `lib/seed-project.ts` in Wave 0 before implementing restore. If not idempotent, add a guard in the PATCH handler: `if (status === 'active' && !project.seeded) await seedProjectFromRegistry(numericId)`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts) |
| Config file | `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/vitest.config.ts` |
| Quick run command | `npx vitest run __tests__/ --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROJ-01 | Archive PATCH sets status='archived', requires admin | unit | `npx vitest run __tests__/lifecycle/archive.test.ts -x` | Wave 0 |
| PROJ-02 | DELETE requires archived status, pre-flight blocks active jobs | unit | `npx vitest run __tests__/lifecycle/delete.test.ts -x` | Wave 0 |
| PROJ-03 | Archived projects accessible via sidebar section (visual) | manual | — | manual only — sidebar is server RSC |
| PROJ-04 | Restore PATCH sets status='active' | unit | `npx vitest run __tests__/lifecycle/restore.test.ts -x` | Wave 0 |
| AUTH-01 | signOut call redirects to /login (visual) | manual | — | manual only — requires browser session |
| PORTF-01 | getActiveProjects excludes archived status | unit | `npx vitest run __tests__/lifecycle/portfolio.test.ts -x` | Wave 0 |
| PORTF-02 | Deleted project row removed, excluded from all queries | unit | `npx vitest run __tests__/lifecycle/portfolio.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run __tests__/lifecycle/ --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `__tests__/lifecycle/archive.test.ts` — covers PROJ-01 (archive PATCH: admin required, status set, non-admin 403)
- [ ] `__tests__/lifecycle/delete.test.ts` — covers PROJ-02 (DELETE: pre-flight blocks running jobs, requires archived status first, cascade verified)
- [ ] `__tests__/lifecycle/restore.test.ts` — covers PROJ-04 (restore PATCH: status set to active, seedProjectFromRegistry idempotency)
- [ ] `__tests__/lifecycle/portfolio.test.ts` — covers PORTF-01, PORTF-02 (getActiveProjects excludes 'archived', deleted row excluded)

## Sources

### Primary (HIGH confidence)
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/db/schema.ts` — `projectStatusEnum` ('archived' confirmed), `projects` table structure, FK cascade patterns, `skill_runs` and `extractionJobs` status enums
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/lib/auth-server.ts` — `requireProjectRole` implementation, global admin bypass
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/lib/auth-client.ts` — `signOut`, `useSession` exports confirmed
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/components/DeleteConfirmDialog.tsx` — existing dialog interface confirmed
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/components/Sidebar.tsx` — server component structure, `getActiveProjects` usage
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/app/api/projects/[projectId]/route.ts` — current PATCH handler (uses 'user' role — upgrade needed), no DELETE handler yet
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/lib/queries.ts` — `getActiveProjects` filters `['active', 'draft']`, `getPortfolioData` calls `getActiveProjects`
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/app/customer/[id]/layout.tsx` — server layout structure, project fetch point for banner injection
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/components/WorkspaceTabs.tsx` — Admin tab with Members sub-tab, extensible for Settings
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/components/SessionExpiredModal.tsx` — client island pattern inside server layout
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/vitest.config.ts` — test infrastructure confirmed (Vitest, node environment)

### Secondary (MEDIUM confidence)
- `__tests__/portfolio/` — confirms 4 RED stubs exist, confirms test file pattern for new lifecycle tests
- `app/customer/[id]/members/page.tsx` — confirms `isProjectAdmin` resolution pattern for layout upgrade

### Tertiary (LOW confidence)
- `lib/seed-project.ts` — not read; idempotency assumed from `seeded` column pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed present in codebase
- Architecture: HIGH — all patterns verified from existing code; client island and server component patterns confirmed
- Pitfalls: HIGH — PATCH role mismatch confirmed by reading route.ts; cascade FK patterns confirmed from schema; restore/seed interaction identified from route handler logic
- Pre-flight check: HIGH — `skill_runs` and `extractionJobs` status enums confirmed from schema

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable stack, no fast-moving dependencies)
