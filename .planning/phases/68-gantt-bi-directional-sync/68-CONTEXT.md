# Phase 68: Gantt Bi-directional Sync - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

The Gantt chart becomes a fully interactive read-write surface. This phase: redesigns the row model to use WBS level-1 items as rows (not milestone groups), adds edge-drag resizing for task and WBS summary bars, adds inline date editing in the left panel, implements transaction-safe date writes for both tasks and milestones, and ensures changes made in workspace tabs (Task Board, Milestones tab) reflect in the Gantt via router.refresh().

Out of scope: adding new WBS items from the Gantt, real-time SSE multi-user sync, dependency cascade between tasks, advisory locks.

</domain>

<decisions>
## Implementation Decisions

### Row model (DLVRY-01) — fundamental change from current implementation
- **Level-1 WBS items are the Gantt rows** — not milestone groups as currently implemented
- Each WBS level-1 item is always present as a row, regardless of whether its child tasks have dates
- Empty WBS rows show a placeholder bar (greyed-out) to preserve the structural skeleton
- Tasks are nested child rows within their WBS parent — expandable (same expand/collapse pattern as current milestone groups)
- The WBS summary bar span is computed from the earliest start to latest end of its child tasks

### Milestone markers
- Milestones are **vertical date markers only** — full-width dashed vertical line + diamond + label
- They are NOT row containers; tasks belong to WBS items, not milestones
- Milestone markers appear at their `date` value across the full chart height
- Current milestone-grouping row model is replaced entirely

### Edge drag (DLVRY-02)
- **Both task rows AND WBS summary rows** get left and right edge handles
- Dragging a **task row edge** updates only that task's `start_date` or `due`
- Dragging a **WBS summary row edge** shifts ALL child tasks by the same delta (preserves relative spacing between tasks)
- Existing whole-bar drag (shifts start + end together) is preserved on all rows
- Dragging a **milestone marker** (vertical line) updates only the milestone's `date` field

### Manual date entry (DLVRY-02)
- Left panel gains **Start** and **End** date columns for task rows
- Clicking a date cell opens an inline date picker or editable text field
- Saving commits a PATCH to the task's `start_date` / `due`

### Cascade rules (DLVRY-03)
- **Task date change** → only the task record updates (`start_date`, `due`); the WBS summary bar recomputes from children on next render — no separate WBS date field to PATCH
- **Milestone date change** → only `milestones.date` updates; no cascade to associated tasks
- All date writes are wrapped in a DB transaction (existing pattern in `PATCH /api/tasks/{id}`)
- No advisory locking needed for drag operations — standard PostgreSQL transaction isolation is sufficient

### Reverse sync (DLVRY-04)
- `router.refresh()` is called after any date PATCH from workspace tabs (Task Board, Milestones tab)
- Navigating back to the Gantt tab always shows fresh data (Next.js server component re-fetches on navigation)
- No polling or SSE required

### Milestone date editability
- Milestone dates are editable from **both** the Gantt (drag marker) and the Milestones tab (inline form)
- `/api/milestones/{id}` PATCH schema must be extended to accept a `date` field
- Milestones tab calls `router.refresh()` after saving a date change

### Claude's Discretion
- Exact placeholder bar styling for empty WBS rows (opacity, color, dashed vs solid)
- Whether WBS rows start collapsed or expanded by default
- Left panel column widths for the new Start / End date columns
- Date picker component choice (native `<input type="date">` vs Shadcn/ui calendar)
- How to handle a WBS row with a mix of tasks with and without dates when computing the summary bar

</decisions>

<specifics>
## Specific Ideas

- "Each row in the Gantt is a level-1 item in the WBS. Milestones are the vertical markers that signify the date completion/goal of that milestone." — user's explicit mental model
- WBS rows should always exist "just like the level 1 items in WBS. They're always there." — structural skeleton is the WBS mirrored into the Gantt

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/GanttChart.tsx` (589 lines): Full custom SVG Gantt. Current row model uses milestone groups — needs to be replaced with WBS-based rows. Drag logic (whole-bar move, `dragRef`, `dragOverride` state) is reusable; edge handles need to be added. Left/right scroll sync and panel resize are reusable as-is.
- `app/customer/[id]/gantt/page.tsx`: Server component fetching tasks + milestones via `getTasksForProject` + `getMilestonesForProject`. Needs to also fetch WBS level-1 items (new query). `mapTasksToGantt` helper needs to be reworked to group by WBS parent instead of milestone.
- `PATCH /api/tasks/{id}`: Accepts `start_date` + `due`. Already supports drag saves. No changes needed to the endpoint.
- `PATCH /api/milestones/{id}`: Exists but schema (`patchSchema`) only accepts `status`, `target`, `owner`, `notes` — must add `date: z.string().nullable().optional()` to support Gantt drag and Milestones tab edit.
- `worker/lock-ids.ts` + `worker/jobs/gantt-snapshot.ts`: Advisory lock infrastructure exists and can be referenced, but not needed for drag operations.

### Established Patterns
- Whole-bar drag: `onBarMouseDown` → `onMove` (mousemove) → `onUp` (mouseup) with `dragRef` + `dragOverride` state. Edge drag should follow the same pattern with a `side: 'left' | 'right'` field added to `dragRef`.
- Advisory locks: `pg_try_advisory_xact_lock(LOCK_IDS.X)` inside a transaction — available if needed but not required for this phase.
- `router.refresh()` pattern: used in Phase 66 inline deletes (`router.refresh()` after DELETE). Same pattern applies here.
- Inline deletes/edits: no confirmation dialog — consistent with app-wide convention.
- `requireProjectRole(numericId, 'user')` guard on all project-scoped routes.

### Integration Points
- `app/customer/[id]/gantt/page.tsx` → add WBS level-1 fetch; rework `mapTasksToGantt` to group by WBS parent
- `components/GanttChart.tsx` → replace milestone-group row model with WBS-item row model; add edge handles to bar SVG render; add Start/End columns to left panel
- `app/api/milestones/[id]/route.ts` → extend `patchSchema` with `date` field
- Milestones tab component → add `date` field to inline edit form + call `router.refresh()` after save
- Task Board component → ensure `router.refresh()` is called after task date changes (verify existing behavior)

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 68-gantt-bi-directional-sync*
*Context gathered: 2026-04-16*
