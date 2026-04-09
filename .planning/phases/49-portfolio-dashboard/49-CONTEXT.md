# Phase 49: Portfolio Dashboard - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the current `/` dashboard page entirely with a portfolio-level view. The new page shows a health summary bar, a filterable multi-project table, and an exceptions panel. All existing widgets (Morning Briefing, Risk Heat Map, Watch List, HealthCards grid, Quick Actions, Activity Feed) are removed. Drill-down from a table row navigates to the project workspace. No new routes — this replaces `app/page.tsx`.

</domain>

<decisions>
## Implementation Decisions

### Page architecture
- The existing `app/page.tsx` dashboard is replaced in full — all existing widgets removed
- New page layout (top to bottom): summary chips → filterable portfolio table → exceptions panel
- No separate `/portfolio` route — the main `/` page is the portfolio dashboard

### Health summary (DASH-01 + DASH-02)
- Summary displayed as stat chips: **On Track** (green), **At Risk** (yellow), **Off Track** (red), **Blocked** (orange)
- Each chip shows the count of projects in that state
- Additional chips: total active projects, overdue milestones count
- No Recharts chart component — chips only (fast render, zero extra dependency)

### Portfolio table columns (DASH-03)
Final column order: Name | Owner | Team/Track | Phase | Health | % Complete | Next Milestone | Next Milestone Date | Risk Level | Dependency | Last Updated | Exec Flag

Column derivation decisions:
- **Owner** — `lead` field from the ADR-track workstream (first ADR workstream with a non-null lead); falls back to empty
- **Team/Track** — distinct `track` values from the project's workstreams (e.g., "ADR", "Biggy", "ADR + Biggy")
- **Phase** — current onboarding phase name from `onboarding_phases` table (first phase with status not 'completed', or last phase if all complete)
- **% Complete** — average of `workstreams.percent_complete` across all workstreams with a non-null value; null if none exist
- **Next Milestone** — name of the nearest upcoming milestone (target date ≥ today, status ≠ 'completed')
- **Next Milestone Date** — target date of that milestone
- **Health** — from existing `computeHealth()` → `green`/`yellow`/`red`
- **Risk Level** — `highRisks` count from existing health computation (0 = None, 1–2 = Medium, 3+ = High)
- **Dependency** — "Blocked" if any tasks in the project have a non-null `blocked_by` FK and status ≠ 'completed'; otherwise "Clear"
- **Last Updated** — project `updated_at` timestamp
- **Exec Flag** — `exec_action_required` boolean (already on projects table) — shown as a flag icon when true

### Filtering and search (DASH-04)
- Filter controls in a **collapsible filter panel** (toggle button to show/hide)
- Text search always visible in the table header (not inside the panel)
- Filter dimensions inside panel: Status, Owner (text match), Track, Phase, Risk Level, Dependency, Milestone Date range
- Client-side filtering via URL params — same pattern as ActionsTableClient / RisksTableClient

### Exceptions panel (DASH-05)
- Positioned **below the portfolio table**
- Exception types (all five):
  1. Overdue milestones — milestone target date < today and status ≠ 'completed'
  2. Stale updates — project `updated_at` > 14 days ago
  3. Open blockers — any task with non-null `blocked_by` and status ≠ 'completed'
  4. Missing ownership — no ADR workstream with a non-null lead
  5. Unresolved dependencies — same signal as open blockers (surfaces at project level)
- Each exception row shows: project name (linked to workspace) + exception type badge + brief description
- Severity ordering: open blockers first, then overdue milestones, then missing ownership, then stale, then dependencies

### Drill-down (DASH-06)
- Clicking any portfolio table row navigates to `/customer/[id]` (existing project workspace)
- Entire row is clickable — same as `SidebarProjectItem` navigation pattern

### Query performance
- Single `getPortfolioData()` query function: fetches all active projects, then uses `Promise.all()` with per-project parallel sub-queries (milestones, workstreams, onboarding_phases, tasks with blocked_by)
- No N+1 loop — all projects fetched first, then parallel per-project queries
- Target: <500ms at 20+ projects

### Claude's Discretion
- Exact column widths and truncation behavior in the table
- Filter panel toggle button placement (above table right, or inline with search)
- Empty state for the table (no active projects)
- Loading skeleton structure
- Exact chip color classes and icon choice for Exec Flag

</decisions>

<specifics>
## Specific Ideas

- The stat chips replace what was previously HealthCards — cleaner at portfolio scale
- Collapsible filter panel preferred over inline bar to keep table header clean
- "Stale" = 14 days without project update — firm threshold for PS delivery cadence

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/queries.ts` → `getActiveProjects()` + `computeHealth()` — existing base; Phase 49 extends into `getPortfolioData()` with parallel sub-queries per project
- `components/ActionsTableClient.tsx` — client-side filtering pattern with URL params + `useSearchParams` + `useMemo`; replicate for portfolio table
- `components/RisksTableClient.tsx` — filter bar pattern (most recent implementation); use as model for collapsible filter panel
- `components/ui/table`, `components/ui/badge`, `components/ui/card` — standard UI primitives
- `components/HealthCard.tsx` — health color config (`green`/`yellow`/`red` → label/className); reuse `ragConfig` or extract to shared util
- `components/NewProjectButton.tsx` — keep in new page header (still needed)
- `components/SidebarProjectItem.tsx` — row-click nav pattern to `/customer/[id]`

### Established Patterns
- Client-side filtering: Server Component passes full data → `PortfolioTableClient` filters in-memory via URL params
- `Promise.all()` for parallel sub-queries (Phase 34 pattern — `getPortfolioData` should follow this)
- `requireSession()` at Route Handler level — applies to any new API endpoints
- `computeHealth()` auto-derives `green`/`yellow`/`red` — reuse directly, no recalculation

### Integration Points
- `app/page.tsx` — full replacement; existing imports (getDashboardData, HealthCard, ActivityFeed, etc.) removed
- `lib/queries.ts` — add `getPortfolioData()` function returning enriched project rows
- No new API routes needed for the dashboard itself (Server Component data fetch); filter/search is client-side

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 49-portfolio-dashboard*
*Context gathered: 2026-04-08*
