# Phase 39: Cross-Tab Sync & Plan Tab - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Overview metrics refresh in-place when entity edits happen in other tabs. Risk distribution chart segments are clickable and navigate to the Risks tab pre-filtered by severity. HealthDashboard active blockers section is replaced with a list of actual blocked tasks with links. Plan tab boards surface overdue tasks visually and have working bulk status actions.

Scope covers: SYNC-01 (Overview refresh on edit), SYNC-02 (chart drill-down), SYNC-03 (blocker list), PLAN-01 (overdue highlighting), PLAN-02 (bulk status wiring). No new data model changes required.

</domain>

<decisions>
## Implementation Decisions

### Cross-tab sync mechanism (SYNC-01)
- Window custom event — save handlers dispatch `metrics:invalidate` after each successful PATCH; OverviewMetrics and HealthDashboard listen via `window.addEventListener('metrics:invalidate', ...)` and re-fetch
- No dependencies, no context changes, wires at the call site in existing inline-edit components
- Visual effect on re-fetch: seamless in-place update — numbers replace with no loading indicator or spinner

### Risk chart drill-down (SYNC-02)
- Clicking a pie segment navigates to `/customer/[id]/risks?severity=[severity]`
- Consistent with existing `?status=` URL filter pattern in the app (shareable, browser back works)
- Risks tab reads the `severity` query param on mount and pre-applies the filter
- Visual affordance: CSS `cursor: pointer` on segments only — no tooltip, no hover highlight

### Active blocker definition (SYNC-03)
- "Blocked items" = tasks with `status = 'blocked'`
- HealthDashboard replaces the current count with a list of blocked task titles, each linking to the Task Board
- Current implementation counts blocked onboarding steps — this is replaced, not extended
- Link target: `/customer/[id]/plan/tasks` (Task Board page)

### Overdue criteria (PLAN-01)
- A task is overdue when: `due_date < today AND status != 'done'`
- Blocked tasks with past-due dates count as overdue — doubly worth surfacing
- Visual treatment: red card border + subtle red background — consistent with Actions overdue style
- Tasks stay in their current column position (no sort-to-top)

### Bulk status update — TaskBoard (PLAN-02)
- Add "Status" as a new mode to the existing BulkToolbar alongside owner/due/phase
- Status dropdown shows all 4 statuses: todo / in_progress / blocked / done
- No changes to existing bulk owner/due/phase actions — status is additive

### Bulk status update — PhaseBoard (PLAN-02)
- PhaseBoard gets checkboxes (status-only scope, not full parity with TaskBoard)
- Checkbox column added to each phase card
- When 1+ cards selected: floating toolbar appears with a status dropdown (same statuses as TaskBoard)
- No owner/due/phase bulk actions on PhaseBoard — status only

### Claude's Discretion
- Exact event listener cleanup (useEffect return vs. AbortController)
- Whether OverviewMetrics and HealthDashboard share a single listener registration or each manage their own
- Minimum selection threshold for bulk toolbar (1+ vs 2+ selected)
- Blocked task list truncation in HealthDashboard if many tasks are blocked (e.g. show max 5 with "and N more")

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/OverviewMetrics.tsx`: Client Component, self-fetches on mount via `fetchMetrics()` in `useEffect` — add a second `useEffect` listening for `metrics:invalidate` that calls `fetchMetrics()` again
- `components/HealthDashboard.tsx`: same pattern — add event listener, re-fetch, replace blocker count with task list
- `components/TaskBoard.tsx`: `BulkToolbar` already implemented with owner/due/phase modes; add `status` as a 4th mode following the same pattern
- `components/PhaseBoard.tsx`: no bulk UI currently; model new checkbox + toolbar after TaskBoard's implementation
- Recharts `PieChart`/`Pie`/`Cell` already in OverviewMetrics — add `onClick` prop to `<Pie>` for drill-down navigation
- `RISK_SEVERITY_COLORS` map in OverviewMetrics — same keys can be used to map click payload to severity filter value

### Established Patterns
- URL filter params: `?status=` pattern in Actions/Risks/Milestones pages — `?severity=` follows same convention
- Optimistic saves + silent revert on error — established in Phase 37; existing inline-edit components already dispatch `router.refresh()` after PATCH
- `requireSession()` at every API route — no new routes anticipated but applies if any are added
- Badge colors: `bg-{color}-100 text-{color}-800` — use for blocked task links in HealthDashboard

### Integration Points
- Inline-edit save handlers in `ActionsTableClient`, risks page, milestones page — each needs to dispatch `window.dispatchEvent(new CustomEvent('metrics:invalidate'))` after successful PATCH
- `OverviewMetrics.tsx` and `HealthDashboard.tsx` — add `useEffect` for event listener + re-fetch
- `HealthDashboard.tsx` — replace `activeBlockers` count section with a query for `tasks WHERE status='blocked'`; needs a new API endpoint or extension of the existing metrics endpoint
- `components/PhaseBoard.tsx` — `PhaseCard` component needs checkbox; new `PhaseBulkToolbar` component (or reuse TaskBoard's pattern)
- `app/customer/[id]/risks/page.tsx` — read `severity` query param and apply as initial filter (same as `status` param already handled)

</code_context>

<specifics>
## Specific Ideas

- No specific visual references given — standard patterns are fine
- Active blockers list in HealthDashboard should link directly to Task Board, not a filtered view (tasks page)
- PhaseBoard bulk actions are intentionally simpler than TaskBoard — status-only is the right scope

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 39-cross-tab-sync-plan-tab*
*Context gathered: 2026-04-06*
