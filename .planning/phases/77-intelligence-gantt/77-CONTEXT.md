# Phase 77: Intelligence & Gantt - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

The project Overview tab surfaces a live exceptions panel listing specific actionable issues with direct navigation links and an auto-computed health badge. The Gantt derives WBS phase date ranges from child tasks and supports baseline snapshot capture with ghost bar comparison and a numeric variance column.

New capabilities (reports, exception export, notification triggers) are out of scope — this phase is UI surfacing and Gantt baseline UX only.

</domain>

<decisions>
## Implementation Decisions

### Exception Types
- Exactly three exception categories: overdue tasks, at-risk milestones, stale items
- No blocked tasks or open risks as exception types (those remain in the health badge formula)

### Exception Definitions
- **Overdue tasks:** `due_date < today` AND status != 'done' (or equivalent completed status)
- **At-risk milestones:** status = 'at_risk' OR (`target_date < today` AND status != 'complete') — catches both explicitly flagged and date-overdue milestones
- **Stale items:** no update (`updated_at`) in 14 days — covers tasks, open actions, and risks

### Exceptions Panel Layout
- New card added below the existing `HealthDashboard` component in the 30% left column
- Replaces the aggregate reason chips in HealthDashboard (e.g., "3 high risks" chips → per-record exception list)
- The existing health badge and per-track badges remain in `HealthDashboard` unchanged
- Individual exception entry format: icon + entity name as a clickable link + short reason label
  - Example: ⚠️ "Deploy integration checklist" — Overdue 3 days → navigates directly to the task
- List capped at 10 entries; if more exist, show "+ X more issues" indicator
- "No issues detected" empty state when exceptions list is empty

### Health Formula
- Current formula unchanged (critical risks → red, high risks/overdue milestones → yellow, else green)
- Health badge now driven by exception count/severity is NOT required for this phase — health formula stays as-is
- The new exceptions panel is additive: surfaces the specific records behind what the badge already summarizes

### Gantt — Phase Date Derivation
- WBS phase row `spanStart`/`spanEnd` already computed from child tasks in `buildWbsRows()` — no new work needed here; the data shape is ready
- This is already implemented (confirmed from code scan)

### Gantt — Baseline Snapshot Save
- Save flow: toolbar button "Save Baseline" → inline text input appears in toolbar → Enter to save
- No modal/dialog — keeps the flow lightweight
- Snapshot stored in `gantt_baselines` table (already migrated in Phase 75)

### Gantt — Baseline Selection
- Toolbar dropdown "Compare: [Baseline name ▾]" to select active baseline
- Selecting a baseline activates ghost bars + variance column
- Selecting "None" (default) hides ghost bars and variance column
- Multiple baselines supported per project — full history available in dropdown

### Gantt — Ghost Bar Visual
- Ghost bar rendered behind the current task bar in the same row
- Same color as the task bar, ~30% opacity
- No row height change — ghost and current bar coexist in the same row slot

### Gantt — Variance Column
- Added as the rightmost column in the task-list panel (left side of Gantt)
- Only visible when a baseline is active (hidden when "None" selected)
- Positive value = behind schedule (current end is later than baseline end) — red text
- Negative value = ahead of schedule — green text
- Zero / no baseline data = dash or blank
- Applies to task rows only (WBS phase rows show aggregate variance — Claude's discretion)

### Claude's Discretion
- Deep-link URL patterns for each exception type (use existing tab routing conventions)
- "X more issues" expand behavior (expand inline vs. link to a filtered view — use what's simpler)
- Exact icon set for exception types (use existing icon library, match severity conventions)
- WBS phase row variance display (aggregate or omit — Claude decides)
- Stale items `updated_at` field availability per entity type (tasks, actions, risks all expected to have this; verify before implementing)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `HealthDashboard.tsx`: Existing health badge + reason chips component. New ExceptionsPanel card goes below it (separate component, same left column). `computeOverallHealth()` is exported and tested — don't touch it.
- `GanttChart.tsx` (976 lines): Full toolbar, `buildWbsRows()` with `spanStart`/`spanEnd` already computed, drag/resize, DatePickerCell. Baseline toolbar additions slot into the existing toolbar section. Variance column adds to the left task-list panel render loop.
- `overview-metrics` API (`/api/projects/[projectId]/overview-metrics/route.ts`): Already returns `blockedTasks` and `overdueMilestones` counts. Needs new query returning per-record exceptions (not just counts).
- `gantt_baselines` table: Exists in DB from Phase 75 migration — no schema work needed. Need API routes: GET (list baselines), POST (save snapshot), and a GET for a specific baseline's task data.

### Established Patterns
- Overview tab layout: Server Component at `app/customer/[id]/overview/page.tsx` renders `HealthDashboard`, `WeeklyFocus`, `OnboardingDashboard`, `OverviewMetrics` — add `ExceptionsPanel` as a new client component import
- Client-side fetch pattern: `useEffect` + `fetch` → `useState` for data (HealthDashboard, WeeklyFocus, OverviewMetrics all follow this pattern)
- `metrics:invalidate` event: HealthDashboard listens for this window event to refresh — ExceptionsPanel should do the same
- Link routing: `Link href="/customer/${projectId}/[tab]"` pattern for deep-links within a project

### Integration Points
- `overview/page.tsx`: Add `<ExceptionsPanel projectId={projectId} />` in the left column below `<HealthDashboard />`
- New API endpoint needed: `/api/projects/[projectId]/exceptions` — returns exception records with type, entity id, entity name, reason, deep-link path
- `GanttChart.tsx` toolbar: Add "Save Baseline" button + inline input + baseline selector dropdown
- `/api/projects/[projectId]/gantt-baselines` — new routes: GET list, POST snapshot, GET single baseline task data for ghost bar rendering

</code_context>

<specifics>
## Specific Ideas

- No specific UI references mentioned — standard implementation approach acceptable
- Ghost bar pattern matches standard Gantt baseline visualization (same row, semi-transparent behind current bar)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 77-intelligence-gantt*
*Context gathered: 2026-04-22*
