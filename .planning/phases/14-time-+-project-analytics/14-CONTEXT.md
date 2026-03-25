# Phase 14: Time + Project Analytics - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Analytics layer on top of existing data: (1) the Time tab gains a weekly summary section + capacity planning target above the existing entry log, (2) Dashboard HealthCards gain an action velocity mini-chart and risk trend indicator inline, and (3) a configurable weekly hour target is stored per-project and drives the capacity planning view.

</domain>

<decisions>
## Implementation Decisions

### Action Velocity Chart (Dashboard HealthCard)
- Visual form: CSS bar columns — 4 vertical bars, one per week, heights proportional to completed actions. Pure Tailwind, no chart library dependency (consistent with RiskHeatMap and GanttChart).
- Placement: Inline on each HealthCard — action velocity lives alongside the existing health signals (RAG, open actions count) on the per-project card. No new dashboard section.
- Trend direction: Compare latest week vs prior week. Up = this week > last week. Flat = within ~10% (1–2 action) difference. Down = this week < last week.
- Completion filter: `status = 'completed'` only — matches the terminal state used throughout the app.

### Risk Trend Indicator (Dashboard HealthCard)
- Placement: Inline on each HealthCard alongside the velocity chart — both analytics live on the HealthCard together.
- Display: Number + directional arrow — e.g. "5 open risks ↑". Arrow indicates whether open risk count is growing (↑), shrinking (↓), or flat (→) vs prior week.
- "Open" definition: `status NOT IN ('resolved', 'closed', 'accepted')` — captures active, monitoring, and escalated risks.

### Weekly Rollup Table Layout (Time Tab)
- Structure: Collapsible "Weekly Summary" section above the existing entry log. The flat log table below stays exactly as-is (Phase 5.2 implementation untouched). Two panels: summary above, log below.
- Weekly summary table columns: Week (date range e.g. "Mar 17–23") | Hours (sum). Two columns only — no variance column in the summary table.
- Covers last 8 weeks as per success criteria.

### Capacity Planning (Time Tab Header)
- Location: Inline in the Time tab header — an editable field: "Weekly Target: [ ] hrs". Click to edit, stored per-project in the DB.
- Storage: New column on the `projects` table (e.g. `weekly_hour_target numeric(5,2)`) or a project-settings row. Per-project, not global.
- Capacity view: The per-week capacity planning is displayed in the Time tab header row alongside the existing "X.X hrs total" summary — shows "Target: X hrs / Actual: Y hrs (this week)" as a simple stat row, separate from the weekly summary table.
- Over/under per week is shown in the weekly summary table as a separate capacity row below the 8-week table, or as an inline ±variance per week — Claude's discretion on exact layout.

### Claude's Discretion
- Exact HealthCard layout for the two new analytics rows (bar chart + risk indicator)
- Whether the weekly summary section is collapsed by default or expanded
- DB migration approach for `weekly_hour_target` column
- Exact capacity planning row styling within the Time tab

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `HealthCard.tsx`: Existing per-project health card on Dashboard — extend this component to add velocity bars + risk trend row. Currently shows RAG status, project name, open high-priority actions count.
- `RiskHeatMap.tsx`: Reference for hand-rolled CSS approach to data visualization — uses Tailwind color classes, no SVG or chart library.
- `GanttChart.tsx`: Another existing chart — hand-rolled, pure React/Tailwind.
- `TimeTab` component (`components/TimeTab.tsx` inferred from `time/page.tsx` import): Existing Phase 5.2 implementation — add weekly summary section above the existing table.

### Established Patterns
- Hand-rolled CSS visualization (no recharts, no d3, no chart library installed)
- `plain fetch() + useState + useEffect` on the Time tab (not TanStack Query — established in Phase 5.2)
- RSC for initial page load on Dashboard; HealthCard may be RSC or client component
- shadcn/ui + Tailwind v4 throughout
- Section headers: `<h2 className="font-medium text-zinc-700 mb-4">`

### Integration Points
- `components/HealthCard.tsx` — add velocity bars + risk trend indicator rows
- `components/TimeTab.tsx` (or equivalent) — add weekly summary section + capacity planning header
- `lib/queries.ts` — new DB queries: weekly action completion counts (4 weeks), open risk counts (4 weeks), weekly time entry rollup (8 weeks)
- `app/api/projects/[projectId]/` — new endpoint for analytics data, or extend existing `/time-entries` endpoint
- `db/schema` — new `weekly_hour_target` column on projects table + migration

</code_context>

<specifics>
## Specific Ideas

- HealthCard layout: Two new rows at the bottom of the card — "Velocity" row with 4 CSS bars + trend arrow, "Risks" row with count + directional arrow
- Weekly summary table: `Week ending Mar 23 | 6.5 hrs` — weeks shown as "Mar 17–23" range format
- Capacity planning header in Time tab: `Weekly Target: 15 hrs  |  This week: 6.5 hrs  |  −8.5 under`
- Empty state for velocity chart: If no actions completed in last 4 weeks, show flat bars at 0 with "No completions yet"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 14-time-project-analytics*
*Context gathered: 2026-03-25*
