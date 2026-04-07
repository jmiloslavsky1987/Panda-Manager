# Phase 38: Gantt Overhaul - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform the existing Gantt chart into a functional planning tool. Adds milestone date markers on the timeline, a view mode toggle, milestone-grouped accordion swim lanes, and drag-to-reschedule with immediate DB save. No new data model changes — tasks already have milestone_id FK and start_date/due fields; milestones already have target_date.

</domain>

<decisions>
## Implementation Decisions

### Milestone markers
- Thin vertical dashed line spanning full chart height at each milestone's target_date
- Milestone name label positioned above the line
- All project milestones shown regardless of whether they have tasks assigned
- When markers are close together, labels stagger vertically to avoid overlap
- Clicking a marker opens a small popup showing milestone name, target date, and status
- Label shows milestone name only (date visible in the click popup)

### Swim lane structure
- Accordion-style: milestone headers are collapsible rows that expand/collapse their tasks
- Default state on page load: all collapsed
- Milestone header shows: milestone name + task count (e.g. "Go-Live (4 tasks)")
- Milestones with no tasks still show as accordion headers (empty, collapsible)
- Tasks with no milestone_id go in an "Unassigned" swim lane at the bottom
- "Unassigned" header is visually distinct — muted/grey styling to de-emphasize

### View mode toggle
- Button group (Day / Week / Month / Quarter Year) in the top-right of the Gantt header
- Default view mode: Month (appropriate for project-scale timelines)

### Drag-to-reschedule
- frappe-gantt on_date_change callback fires on drag completion
- Immediately PATCHes /api/tasks/:id with new start_date and due
- Save is silent — no feedback on success
- On failure: roll back the bar to original position + show a brief error toast

### Claude's Discretion
- Exact stagger algorithm for overlapping milestone labels
- Popup/tooltip component choice (native title, custom div, or existing tooltip pattern)
- Accordion open/close animation timing
- Error toast implementation (reuse existing pattern if one exists)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/GanttChart.tsx`: existing frappe-gantt wrapper with viewMode prop already typed as `'Day' | 'Week' | 'Month' | 'Quarter Year'`; on_date_change already in type defs
- `types/frappe-gantt.d.ts`: GanttOptions includes on_date_change callback `(task, start, end) => void`
- `PATCH /api/tasks/:id`: accepts start_date and due fields — drag-save route already exists and handles audit log
- Tasks have milestone_id FK — grouping data already present

### Established Patterns
- Server Component page (`app/customer/[id]/plan/gantt/page.tsx`) fetches tasks and passes to GanttChart
- Page will need to also fetch milestones to pass to GanttChart for markers
- Dynamic import inside useEffect already established to prevent SSR crash
- Phase 37 established optimistic UI updates with useEffect syncing to prop changes

### Integration Points
- GanttChart.tsx is the main component to overhaul — currently no view toggle, no markers, no swim lanes
- Gantt page needs to fetch milestones in addition to tasks (already available via getProjectData or a direct milestones query)
- The accordion/swim lane grouping likely requires restructuring how frappe-gantt receives tasks (grouped per milestone instance or single flat list with custom header rows)

</code_context>

<specifics>
## Specific Ideas

- No specific visual references given — standard Gantt patterns are fine
- Milestone markers should feel like standard Gantt milestone indicators (vertical dashed line)
- Accordion default collapsed keeps the initial view clean; users expand what they need

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 38-gantt-overhaul*
*Context gathered: 2026-04-06*
