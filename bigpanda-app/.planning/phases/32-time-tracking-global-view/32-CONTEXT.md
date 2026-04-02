# Phase 32: Time Tracking Global View - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Redesign time tracking as a standalone top-level `/time-tracking` section. Remove the per-project Time tab from the workspace. All time entries the current user has logged — across all their projects — are visible in one cross-project view. Users can add, edit, delete, submit, bulk-action, and export entries from the global view. Calendar import moves here with per-event project selection.

</domain>

<decisions>
## Implementation Decisions

### CRUD Scope
- Full CRUD from the global view: add, edit, and delete entries directly
- Add form has a required project dropdown — user must select a project before saving
- When arriving via redirect from `/customer/[id]/time`, URL carries `?project=:id` and the dropdown pre-fills automatically from the query param
- When arriving at `/time-tracking` directly (no URL context), no default — user picks project explicitly
- Reassign entries between projects via bulk action only (bulk move) — no inline per-row project selector

### Filters & Layout
- Primary layout: entries grouped by week with date range headers (per success criteria)
- Filter controls at top: project dropdown + date range (from/to) — mirrors existing TimeTab filter pattern
- Default state: all projects, all dates shown

### Visibility & Role Scoping
- Users see only their own entries (entries they personally logged)
- Admins and approvers see approve/reject actions on visible entries — role-gated same as per-project tab
- Regular users see status badges but no approve/reject buttons

### Approval Workflow
- Full approval workflow carried over: submit, approve, reject with status badges
- Role guard: admin and approver roles only can approve/reject — same as existing per-project implementation

### Bulk Actions
- All existing bulk actions carried over: approve, reject, delete, move (cross-project reassignment)
- Bulk move is the primary way to reassign entries between projects

### CSV Export
- Export respects active filters (project + date range) — exports what is currently visible
- "Export all AMEX entries for March" works naturally by setting filters then exporting

### Calendar Import
- Carried over with per-event project selection in the import preview (manual — user picks project per event)
- No auto-detection of project from calendar invite data in this phase (explicitly deferred)
- Unmatched or unassigned events: user uses the project dropdown per event row, or bulk move after import

### Route Changes
- New top-level page: `/time-tracking`
- Redirect: `/customer/[id]/time` → `/time-tracking?project=:id` (preserve project context in URL)
- Remove `{ id: 'time', label: 'Time', segment: 'time' }` from `WorkspaceTabs.tsx`
- Replace `app/customer/[id]/time/page.tsx` with a Next.js redirect

### Sidebar Navigation
- Link in the bottom section alongside Knowledge Base, Outputs, Settings, Scheduler
- Use a clock/timer icon (consistent with Lucide icon pattern used in sidebar)

### Claude's Discretion
- Exact weekly grouping header format (e.g., "Mar 31 – Apr 6" vs "Week of Mar 31")
- Whether to reuse/refactor `TimeTab.tsx` as a base or build a new `GlobalTimeView` component
- New API endpoint shape for cross-project queries (`/api/time-entries` or `/api/time-tracking`)
- Exact confidence threshold for calendar event customer name auto-detection

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/TimeTab.tsx`: Full per-project CRUD component — table, inline add form, status badges, approval actions, bulk select, filters. Extract or adapt as basis for the global view.
- `components/TimeEntryModal.tsx`: Edit modal — add a `project_id` field/dropdown for use in global context.
- `lib/time-tracking.ts`: Pure helper functions — `groupEntries()`, `computeSubtotals()`, `getEntryStatus()`, `canEdit()`, `canSubmit()`, `canOverrideLock()`. All reusable as-is. `GroupBy` type supports `'project' | 'team_member' | 'status' | 'date'`.
- `/api/projects/[projectId]/time-entries/bulk/route.ts`: Bulk move action (`action: 'move'`, `target_project_id`) already implemented — cross-project reassignment is production-ready.
- `/app/api/projects/[projectId]/time-entries/calendar-import/route.ts`: Existing calendar import endpoint — will need adaptation for global context (project passed per-event, not from URL path).
- `components/TimeTrackingSettings.tsx`: Settings component at `/settings/time-tracking` — untouched by this phase.

### Established Patterns
- `plain fetch() + useState + useEffect` for data fetching — established in Phase 5.2 and 14, used throughout TimeTab
- `requireSession()` at route handler level for auth — mandatory on all new API routes
- Role guard pattern: check `session.user.role` after `requireSession()` for admin/approver gating
- Weekly grouping helper: `getMondayOfWeek()` already in `TimeTab.tsx` — reusable
- Sidebar bottom section links use `flex items-center gap-2` with Lucide icon + text + optional `NotificationBadge`

### Integration Points
- `components/Sidebar.tsx`: Add `/time-tracking` link in the bottom section (after Scheduler entry)
- `components/WorkspaceTabs.tsx`: Remove `{ id: 'time', label: 'Time', segment: 'time' }` from tabs array
- `app/customer/[id]/time/page.tsx`: Replace with `redirect('/time-tracking?project=' + id)` — Next.js `redirect()` from `next/navigation`
- New API endpoint: cross-project `GET /api/time-entries` — queries `time_entries LEFT JOIN projects`, filters by `user_id` (own entries), optional `project_id` and date range params, returns entries with project name included

</code_context>

<specifics>
## Specific Ideas

- Calendar import auto-detection: match event title/description against `projects.customer` names in DB — fuzzy match (case-insensitive contains). Pre-fill dropdown if match found, leave empty if not. User always has final say per event.
- Unmatched calendar events arrive as unassigned — user uses bulk move to assign them in one action after reviewing the import
- URL-based project pre-fill: `?project=:id` in the add form sets the project dropdown default on mount — same mechanism as redirect from per-project tab

</specifics>

<deferred>
## Deferred Ideas

- Auto-detecting project from Google Calendar invite data (e.g., matching event title/description against `projects.customer` names in DB) — noted for a future phase; calendar import stays manual project selection for now
- Entry reassignment (inline per-row project change) — bulk move covers cross-project reassignment for this phase

</deferred>

---

*Phase: 32-time-tracking-global-view*
*Context gathered: 2026-04-01*
