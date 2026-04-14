# Phase 44: Navigation & Parity - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure Delivery tab navigation (NAV-01–05): Plan first, WBS/Task Board/Gantt promoted to direct Delivery sub-tabs, Swimlane removed, Decisions moved into Delivery, Intel tab removed, Engagement History moved to Admin. Add filtering and multi-select bulk actions to Risks (RISK-01–02) and Milestones (MILE-01–02) to match Actions table capabilities.

</domain>

<decisions>
## Implementation Decisions

### Plan sub-tab landing
- Plan tab shows Phase Board content directly at `/plan` — board content merged from `plan/board/page.tsx` into `plan/page.tsx`
- SprintSummaryPanel stays on the Plan page (moves from plan layout into plan/page.tsx)
- Plan layout (`plan/layout.tsx`) is dissolved — PlanTabs inner nav removed entirely
- `/plan/board` redirects to `/plan`

### WBS placeholder
- WBS Delivery sub-tab created in Phase 44 as a placeholder route at `/customer/[id]/wbs`
- Placeholder shows a "coming soon" / empty state — Phase 45 fills in WBS content
- Navigation is structurally complete after Phase 44; no broken nav state between phases

### Delivery sub-tab order
- Final order: **Plan | WBS | Task Board | Gantt | Actions | Risks | Milestones | Decisions**
- Planning cluster (WBS, Task Board, Gantt) follows Plan; execution cluster (Actions, Risks, Milestones, Decisions) after
- Delivery top-level tab defaults to **Plan** when clicked (Plan is first sub-tab)

### URL redirects (old routes)
- `/plan/board` → `/plan`
- `/plan/tasks` → `/tasks` (new Delivery sub-tab segment)
- `/plan/gantt` → `/gantt` (new Delivery sub-tab segment)
- `/plan/swimlane` → `/plan` (Swimlane removed)
- Intel tab params (`?tab=intel`) fall back to Overview naturally — no extra redirect handling needed
- Task Board and Gantt routes: promoted to top-level segments (`/customer/[id]/tasks`, `/customer/[id]/gantt`) rather than staying under `/plan/`

### Risks filtering (RISK-01)
- Filter dimensions: status, severity, owner, date range
- Date range filters on `identified_date` (when risk was logged)
- All risk statuses always visible — no "hide resolved" toggle; user filters by status dropdown
- Client-side filtering via URL params (same pattern as ActionsTableClient: `useSearchParams` + `useMemo`)

### Risks bulk actions (RISK-02)
- Status-only bulk update — matches Actions bulk pattern exactly
- Bulk bar: floating bar when rows selected, status dropdown + "X selected" count + Clear button
- Uses `/api/risks/bulk-update` endpoint (new — modeled after `/api/actions/bulk-update`)

### Milestones filtering (MILE-01)
- Filter dimensions: status, owner, date range
- Date range filters on `target` date (planned completion date)
- Incomplete milestones shown first, then completed — existing sort order preserved after filtering
- Client-side filtering via URL params (same pattern as ActionsTableClient)

### Milestones bulk actions (MILE-02)
- Status-only bulk update — matches Actions/Risks bulk pattern
- Bulk bar: same pattern as Risks (floating, status dropdown, count, clear)
- Uses `/api/milestones/bulk-update` endpoint (new)

### Claude's Discretion
- Exact placeholder content for the WBS route (empty state message)
- Filter bar UI layout (inline above table vs collapsible panel — match ActionsTableClient's inline pattern)
- Whether to extract a shared BulkBar or FilterBar component if the duplication is worth abstracting

</decisions>

<specifics>
## Specific Ideas

- Pattern to follow precisely: `ActionsTableClient.tsx` — URL params for filters, `useMemo` for client-side filtering, floating bulk bar with status dropdown, `selectedIds: Set<number>` state, `/api/actions/bulk-update` for bulk PATCH
- The `WorkspaceTabs.tsx` `TAB_GROUPS` array is the single source of truth for navigation — all restructuring flows through changes to this array
- Task Board and Gantt route files (`plan/tasks/page.tsx`, `plan/gantt/page.tsx`) should move to top-level routes (`tasks/page.tsx`, `gantt/page.tsx`) to match the new segments

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ActionsTableClient.tsx` — the exact pattern to replicate for Risks and Milestones (URL params, filtering, bulk bar)
- `RisksTableClient.tsx` — already has severity filter + InlineSelectCell + inline status cycling; extend with full URL-param filter bar and multi-select
- `MilestonesTableClient.tsx` — has sort logic and incomplete-first ordering; extend with URL-param filter bar and multi-select
- `SubTabBar.tsx` + `WorkspaceTabs.tsx` — change `TAB_GROUPS` array only; no SubTabBar changes needed
- `SprintSummaryPanel` (used in `plan/layout.tsx`) — move import to `plan/page.tsx`

### Established Patterns
- Client-side filtering: Server Component passes full data; Client island filters in-memory using `useSearchParams` + `useMemo` — do NOT add new API endpoints for filter changes
- URL params as filter state: `searchParams.get('status')`, `searchParams.get('owner')`, etc. — `router.push(?${params})` on change
- Bulk update: `selectedIds: Set<number>` in component state; floating div when `selectedIds.size > 0`; PATCH via `/api/{entity}/bulk-update`
- `CustomEvent('metrics:invalidate')` dispatch after any mutation to refresh Overview metrics

### Integration Points
- `WorkspaceTabs.tsx` TAB_GROUPS: add `{ id: 'wbs', label: 'WBS', segment: 'wbs' }`, `{ id: 'tasks', label: 'Task Board', segment: 'tasks' }`, `{ id: 'gantt', label: 'Gantt', segment: 'gantt' }` to Delivery children; remove Intel group; add Decisions to Delivery; add Engagement History to Admin
- New routes needed: `app/customer/[id]/wbs/page.tsx`, `app/customer/[id]/tasks/page.tsx` (moved from `plan/tasks`), `app/customer/[id]/gantt/page.tsx` (moved from `plan/gantt`)
- Redirect files: `app/customer/[id]/plan/board/page.tsx` → redirect to `/customer/${id}/plan`; `app/customer/[id]/plan/tasks/page.tsx` → redirect to `/customer/${id}/tasks`; `app/customer/[id]/plan/gantt/page.tsx` → redirect to `/customer/${id}/gantt`; `app/customer/[id]/plan/swimlane/page.tsx` → redirect to `/customer/${id}/plan`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 44-navigation-parity*
*Context gathered: 2026-04-08*
