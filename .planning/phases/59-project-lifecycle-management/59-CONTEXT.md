# Phase 59: Project Lifecycle Management - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Admins can archive (soft-delete), permanently delete, and restore projects. Archived projects become read-only and appear in a dedicated sidebar section. Users can log out from the sidebar. Portfolio dashboard handles archived/deleted visibility. This phase does NOT include per-project RBAC enforcement — that was Phase 58.

</domain>

<decisions>
## Implementation Decisions

### Archive & delete entry points
- Archive and permanent delete actions live in a **Danger Zone section** at the bottom of the Admin tab (not in the project header)
- Only Admins see and can use these actions (User role does not see the Danger Zone)

### Delete flow (two-step requirement)
- A project **must be archived first** before permanent delete is available — no direct delete from active state
- Once archived, the Admin can choose to permanently delete from the archived project's Admin tab
- Permanent delete uses a **simple confirm dialog** (existing `DeleteConfirmDialog` pattern — no project-name type-in required)

### Archived project navigation
- Archived projects appear in a **collapsed section at the bottom of the sidebar**, below all active projects
- Section is **collapsed by default** — expands on click to show archived project names
- The sidebar section satisfies PROJ-03 (dedicated archived view) and PORTF-01 (portfolio separation)

### Read-only enforcement (archived projects)
- A **"Archived — read only" banner** displays at the top of the workspace when viewing an archived project
- The **banner contains a Restore button** (visible to Admins only)
- All write route handlers return **403 for archived projects** at the API level — this is the hard gate
- UI does not need to hide every edit button individually; API enforcement is the authoritative boundary

### Restore flow
- Restore is triggered from the banner inside the archived project workspace
- Restoring sets `status` back to `'active'`; project reappears in the active sidebar list and is writable again

### Logout
- A **client island at the bottom of the sidebar** shows the logged-in user's **name + logout button**
- Sidebar is a server component — the user section is a `'use client'` wrapper component using `useSession` and `signOut` from `lib/auth-client`
- After logout → redirect to `/login`

### Claude's Discretion
- Exact styling and copy for the archived banner and Danger Zone section
- Whether the sidebar archived section shows a count badge (e.g., "Archived (3)")
- Pre-flight check implementation for permanent delete (e.g., check for active BullMQ jobs before allowing)
- Exact shape of the sidebar user/logout component (spacing, icon choice)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `db/schema.ts` → `projectStatusEnum`: Already includes `'archived'` value — no schema migration needed for archive status
- `components/DeleteConfirmDialog.tsx`: Reusable confirm dialog for archive and permanent delete confirmations
- `lib/auth-client.ts` → `signOut`: Browser-side logout method, exported and ready to use in client components
- `lib/auth-client.ts` → `useSession`: Used in `UsersTab.tsx` — same pattern for the sidebar user section
- `components/Sidebar.tsx`: Server component calling `getActiveProjects()` — add archived query and render collapsed section; bottom section already has nav links, user slot goes here

### Established Patterns
- `requireProjectRole(id, 'admin')` from Phase 58: Write routes gate on this; archived-project write-block adds a second check (after role check, also check `project.status !== 'archived'`)
- Client-side filtering: `PortfolioTableClient` already filters by status URL param — archived projects excluded from portfolio by filtering `status = 'active'` in `getPortfolioData()`
- `'use client'` island inside server component: `SessionExpiredModal.tsx` is an example of a client island mounted inside the server-component layout

### Integration Points
- `lib/queries.ts` → `getActiveProjects()`: Currently powers the sidebar project list — needs to filter `status = 'active'`; add a parallel `getArchivedProjects()` for the collapsed section
- `app/api/projects/[projectId]/route.ts` (PATCH): Archive and restore update `status` field; permanent delete uses DELETE method
- Portfolio dashboard query: `getPortfolioData()` must exclude `status = 'archived'` and deleted projects from the active table; PORTF-01 satisfied by sidebar archived section
- `components/WorkspaceTabs.tsx`: Admin tab already has sub-tabs — Danger Zone is a section within the existing Admin tab (below Members sub-tab content, or a new Settings sub-tab)

</code_context>

<specifics>
## Specific Ideas

- Two-step delete: archive first, then delete from archived state — this prevents accidental permanent deletion of active projects and gives a natural cooling-off period
- Sidebar collapsed-by-default mirrors how most apps treat archived/deleted content: accessible but not in the way

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 59-project-lifecycle-management*
*Context gathered: 2026-04-14*
