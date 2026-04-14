# Phase 58: Per-Project RBAC - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Add per-project Admin/User role membership, enforced at route handler level across all 40+ project API handlers. Each project has its own member list with roles. Project actions are gated by role. Users only see projects they're explicitly added to (except global admins). This phase does NOT include project lifecycle management (archive/delete) — that's Phase 59.

</domain>

<decisions>
## Implementation Decisions

### Bootstrap & migration
- **Existing projects:** All current users are seeded as Admin on all existing projects via a one-time migration. No one loses access on deploy.
- **New project creation:** The creating user is automatically added as Admin in `project_members`.
- **Non-member access:** Projects are hidden from the portfolio dashboard for non-members. If a non-member hits a project API directly, return 403.

### Global admin override
- Users with global `role: "admin"` on the `users` table bypass per-project RBAC entirely — they always have full Admin-level access on every project.
- Global admins see ALL projects in the portfolio dashboard regardless of membership.
- Global admin role always wins — even if a global admin is explicitly in `project_members` with a User role, their global role takes precedence.
- The `requireProjectRole()` wrapper must short-circuit for global admins before checking `project_members`.

### Membership management UI
- New **Members sub-tab** added to the existing Admin tab in `WorkspaceTabs.tsx` (alongside Artifacts, Review Queue, Engagement History).
- The Members sub-tab shows: list of current project members, each with name, email, role badge (Admin/User), and action buttons (change role, remove).
- An Add button opens a picker populated from existing app users — select a user and assign a role.
- Only project Admins (and global admins) can access this sub-tab and take these actions.

### Role capabilities
- **Admin role:** Full access to everything on the project including delete, archive, manage members, and global scheduler actions.
- **User role:** Full read/write access to all project data (risks, actions, onboarding, skills, etc.) EXCEPT: delete project, archive project, manage project membership, global scheduler actions.
- Admin-only buttons are **hidden/disabled in the UI** for User role members. If a User role member hits the API directly, return 403.

### Portfolio visibility
- Portfolio dashboard query is filtered by `project_members` for non-global-admin users — strictly membership-based.
- Portfolio-level health metrics (counts, summaries, exceptions panel) reflect only projects the current user can see.
- No "discover all projects" view for User role — they only see what they're assigned to.

### Claude's Discretion
- Exact SQL join strategy for the membership-filtered dashboard query (subquery vs. JOIN)
- Whether `requireProjectRole()` takes a minimum role level ('admin' | 'user') or separate wrappers per role
- Exact shape of the Members sub-tab UI (table vs card list, modal vs inline for add/edit)
- How to handle the edge case of a project with zero Admins (e.g., last Admin is removed)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/auth-server.ts` → `requireSession()`: Current auth gate — new `requireProjectRole()` wraps or parallels this pattern
- `lib/auth-utils.ts` → `resolveRole(session)`: Global role check pattern — new per-project role check follows the same abstraction approach
- `components/WorkspaceTabs.tsx`: Admin tab already has `children[]` array — Members sub-tab slots in as a new entry in that array
- `components/settings/UsersTab.tsx`: Existing user management component to reference for the Members sub-tab UI pattern
- `components/DeleteConfirmDialog.tsx`: Reusable confirmation dialog for remove-member action

### Established Patterns
- All 40+ route handlers under `app/api/projects/[projectId]/` currently call `requireSession()` then `resolveRole()` for global admin checks — the new `requireProjectRole()` wrapper replaces the `resolveRole()` call in project-scoped handlers
- `resolveRole(session)` is the existing global role abstraction — per-project role check should be a new function (e.g., `resolveProjectRole(session, projectId)`) that queries `project_members`
- Admin tab children defined in `WorkspaceTabs.tsx` lines 52–56: `{ id: 'artifacts' }`, `{ id: 'queue' }`, `{ id: 'history' }` — Members is a 4th entry

### Integration Points
- `db/schema.ts`: New `project_members` table needed — `(project_id: integer, user_id: text, role: 'admin' | 'user', created_at)`; foreign keys to `projects` and `users`
- `app/api/projects/route.ts` (POST new project): Auto-insert creator into `project_members` as Admin after project creation
- Portfolio dashboard query (likely `PortfolioTableClient.tsx` or its API): Add membership filter for non-global-admin users
- Health metrics endpoints: Scope to user-visible projects

</code_context>

<specifics>
## Specific Ideas

- The Admin tab already exists with sub-tabs — Members is a clean fit as a 4th sub-tab, no new tab group needed.
- The migration for existing projects should seed ALL current users as Admin (not User) to avoid disruption on deploy.
- The `requireProjectRole()` function is named explicitly in AUTH-05 requirements — keep that name.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 58-per-project-rbac*
*Context gathered: 2026-04-13*
