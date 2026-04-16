# Phase 68: Gantt Bi-directional Sync - Research

**Researched:** 2026-04-16
**Domain:** Custom SVG Gantt chart — row model redesign, edge-drag interaction, WBS-based grouping, bi-directional date sync via router.refresh()
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Row model (DLVRY-01)**
- Level-1 WBS items are the Gantt rows — not milestone groups as currently implemented
- Each WBS level-1 item is always present as a row, regardless of whether its child tasks have dates
- Empty WBS rows show a placeholder bar (greyed-out) to preserve the structural skeleton
- Tasks are nested child rows within their WBS parent — expandable (same expand/collapse pattern as current milestone groups)
- The WBS summary bar span is computed from the earliest start to latest end of its child tasks

**Milestone markers**
- Milestones are vertical date markers only — full-width dashed vertical line + diamond + label
- They are NOT row containers; tasks belong to WBS items, not milestones
- Milestone markers appear at their `date` value across the full chart height
- Current milestone-grouping row model is replaced entirely

**Edge drag (DLVRY-02)**
- Both task rows AND WBS summary rows get left and right edge handles
- Dragging a task row edge updates only that task's `start_date` or `due`
- Dragging a WBS summary row edge shifts ALL child tasks by the same delta (preserves relative spacing between tasks)
- Existing whole-bar drag (shifts start + end together) is preserved on all rows
- Dragging a milestone marker (vertical line) updates only the milestone's `date` field

**Manual date entry (DLVRY-02)**
- Left panel gains Start and End date columns for task rows
- Clicking a date cell opens an inline date picker or editable text field
- Saving commits a PATCH to the task's `start_date` / `due`

**Cascade rules (DLVRY-03)**
- Task date change → only the task record updates (`start_date`, `due`); the WBS summary bar recomputes from children on next render — no separate WBS date field to PATCH
- Milestone date change → only `milestones.date` updates; no cascade to associated tasks
- All date writes are wrapped in a DB transaction (existing pattern in `PATCH /api/tasks/{id}`)
- No advisory locking needed for drag operations — standard PostgreSQL transaction isolation is sufficient

**Reverse sync (DLVRY-04)**
- `router.refresh()` is called after any date PATCH from workspace tabs (Task Board, Milestones tab)
- Navigating back to the Gantt tab always shows fresh data (Next.js server component re-fetches on navigation)
- No polling or SSE required

**Milestone date editability**
- Milestone dates are editable from both the Gantt (drag marker) and the Milestones tab (inline form)
- `/api/milestones/{id}` PATCH schema must be extended to accept a `date` field
- Milestones tab calls `router.refresh()` after saving a date change

### Claude's Discretion
- Exact placeholder bar styling for empty WBS rows (opacity, color, dashed vs solid)
- Whether WBS rows start collapsed or expanded by default
- Left panel column widths for the new Start / End date columns
- Date picker component choice (native `<input type="date">` vs Shadcn/ui calendar)
- How to handle a WBS row with a mix of tasks with and without dates when computing the summary bar

### Deferred Ideas (OUT OF SCOPE)
- Adding new WBS items from the Gantt
- Real-time SSE multi-user sync
- Dependency cascade between tasks
- Advisory locks (explicitly out of scope per CONTEXT.md)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DLVRY-01 | Gantt chart displays a static structural skeleton (phases, milestone markers) on page load without user action | WBS level-1 items exist in DB; `getWbsItems(projectId, track)` is available. New server-side query needed to join WBS level-1 items with their child tasks via `wbsTaskAssignments` join table. Placeholder bar styling is Claude's discretion. |
| DLVRY-02 | Gantt chart supports drag-edge date adjustment and manual date entry | Existing whole-bar drag pattern in GanttChart.tsx is reusable. Edge handles require extending `dragRef` with `side: 'left' \| 'right'`. Existing `PATCH /api/tasks/{id}` already accepts `start_date` + `due`. Milestone drag: new drag target on the vertical marker line. |
| DLVRY-03 | Date changes in Gantt propagate to milestone and task records across the application | `PATCH /api/tasks/{id}` already supports `start_date` + `due` with DB transaction + audit log. `PATCH /api/milestones/{id}` needs `date` field added to `patchSchema`. WBS summary bar recomputes from children — no DB write needed. |
| DLVRY-04 | Date changes to milestones or tasks outside the Gantt propagate back to the Gantt display | `MilestoneEditModal` and `MilestonesTableClient` already call `router.refresh()`. `TaskEditModal` calls `router.refresh()`. Gantt page is a Server Component — re-fetches on navigation. MilestonesTableClient's `DatePickerCell` currently PATCHes `target_date` field which is NOT the `date` field used by the Gantt — this is a critical alignment gap. |
</phase_requirements>

---

## Summary

Phase 68 replaces the Gantt chart's milestone-grouping row model with a WBS-level-1-item-based row model, adds edge-drag date editing for both task and summary bars, and wires up bi-directional sync between the Gantt and workspace tabs.

The implementation is entirely within the existing custom SVG Gantt component (`components/GanttChart.tsx`, 589 lines). No new third-party libraries are needed — the existing drag infrastructure, PATCH endpoints, `router.refresh()` pattern, and `DatePickerCell` component are all reusable with targeted modifications.

The most significant architectural change is the row model: GanttChart currently groups tasks under milestone-group headers (using `custom_class` encoding). The new model fetches WBS level-1 items as rows and groups tasks under them via the `wbsTaskAssignments` join table. The page server component (`gantt/page.tsx`) must be updated to supply this WBS-structured data, and `GanttChart`'s props interface must evolve accordingly.

**Primary recommendation:** Treat this as a targeted component surgery — replace the row-model data structures and rendering logic inside GanttChart.tsx; keep all scroll sync, resize, zoom, and drag infrastructure intact. The data-fetching changes in `gantt/page.tsx` are the second major work unit, and the `milestones/{id}` API extension is a small third unit.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React + Next.js 16 | app-wide | Server components (data fetch), client islands (drag interaction) | Locked project stack |
| Drizzle ORM | app-wide | DB queries for WBS items + task join | Established data layer |
| Zod | app-wide | Schema validation for PATCH body | All API routes use it |
| `react-day-picker` | installed | Date picker UI (used by existing `DatePickerCell`) | Already in the project; reuse for inline task date editing in left panel |
| `@radix-ui/react-popover` | installed | Popover wrapper for date picker (used by `DatePickerCell`) | Already in the project |
| `sonner` | installed | Toast notifications on drag save errors | Already used in GanttChart |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `useRouter().refresh()` (Next.js) | Next.js 16 | Trigger server re-render after PATCH from other tabs | DLVRY-04: reverse sync from workspace tabs to Gantt |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `<input type="date">` | `DatePickerCell` (react-day-picker) | Native input is simpler but `DatePickerCell` already exists and is consistent with milestones/task tabs |
| Custom drag for milestone marker | Reuse `dragRef` pattern | Milestone drag is a simpler 1D drag; same pattern with `isMilestone: true` flag in `dragRef` works cleanly |

**No new npm installs required.** All needed libraries are present.

---

## Architecture Patterns

### Recommended Project Structure

No new files required unless task inline date edit warrants a new sub-component. All changes are in:
```
components/
└── GanttChart.tsx          # Row model redesign + edge handles + milestone drag
app/customer/[id]/gantt/
└── page.tsx                # WBS data fetch + new mapTasksToGantt grouping logic
app/api/milestones/[id]/
└── route.ts                # Add `date` to patchSchema
components/
└── MilestonesTableClient.tsx  # Fix target_date → date PATCH field alignment
```

### Pattern 1: New Row Model — WBS-Based

**What:** Replace `MilestoneRow` / `milestoneGroups` useMemo with a WBS-item-based row model. Each level-1 WBS item becomes a `WbsSummaryRow`. Its children are `TaskRow` items drawn from the `wbsTaskAssignments` join.

**Critical data gap discovered in research:** Tasks do NOT have a direct `wbs_item_id` column on the `tasks` table. The relationship is through the `wbs_task_assignments` join table (`wbs_item_id` + `task_id`). The `getTasksForProject` query does NOT join through `wbsTaskAssignments` — it returns flat tasks without WBS membership. A new query is needed:

```typescript
// New server-side query needed in lib/queries.ts or inline in gantt/page.tsx
// Fetches WBS level-1 items for a project (both tracks, or a specific track)
// and the tasks assigned to each item via wbsTaskAssignments

// Option A: Single query with LEFT JOIN
// Returns rows: { wbs_item: WbsItem, task: Task | null }
// Allows reconstructing the tree client-side

// Option B: Two queries + in-memory join (simpler, consistent with project patterns)
//   1. getWbsItems(projectId, track) — exists, returns all WBS items
//   2. getTasksForProject(projectId) — exists, returns all tasks
//   3. Fetch wbsTaskAssignments for the project (new query needed)
//   4. Build Map<wbs_item_id, Task[]> in the server component
```

**Recommendation: Option B** — two existing queries + one new small query for assignments. Consistent with the project's pattern of separate queries + in-memory joins (see `milestoneGroups` useMemo).

**New GanttChart props interface:**
```typescript
export interface GanttWbsRow {
  id: number           // wbs_item.id
  name: string         // wbs_item.name
  level: number        // always 1 for summary rows
  tasks: GanttTask[]   // tasks assigned to this WBS item (empty array if none)
}

interface GanttChartProps {
  wbsRows: GanttWbsRow[]         // replaces loose tasks + milestone grouping
  milestones?: GanttMilestone[]  // unchanged — vertical markers only
  viewMode?: ViewMode
}
```

**Updated row types:**
```typescript
type WbsSummaryRow = {
  kind: 'wbs'
  wbsId: number
  label: string
  tasks: GanttTask[]
  spanStart: Date | null    // null if no tasks have dates
  spanEnd: Date | null
}
type TaskRow = {
  kind: 'task'
  task: GanttTask
  wbsId: number
  rowNum: string
  start: Date
  end: Date
}
type Row = WbsSummaryRow | TaskRow
```

**Placeholder bar rule (Claude's discretion — recommended):** If `spanStart === null` (no dated tasks), render a thin dashed/greyed bar spanning 4 weeks from `timelineStart + 7 days`. Opacity 0.3, dashed border-style.

### Pattern 2: Edge-Drag Handles

**What:** Add left and right resize handles to each bar (both WBS summary bars and task bars). Extend `dragRef` to track `side`.

**Extended dragRef:**
```typescript
const dragRef = useRef<{
  taskId: string
  origStart: Date
  origEnd: Date
  startX: number
  pxPerDay: number
  curStart: Date
  curEnd: Date
  side: 'move' | 'left' | 'right'   // NEW
  wbsChildIds?: string[]              // NEW — for WBS summary drag, list of child task IDs
} | null>(null)
```

**Constraint enforcement in `onMove`:**
- `side === 'left'`: update `curStart` only; ensure `curStart` stays ≤ `curEnd - 1 day`
- `side === 'right'`: update `curEnd` only; ensure `curEnd` stays ≥ `curStart + 1 day`
- `side === 'move'`: existing logic (shift both by same delta)

**WBS summary drag logic in `onUp`:**
- `wbsChildIds` is populated when dragging a WBS summary row
- Fire one `PATCH /api/tasks/{id}` for each child task, applying the same delta
- Use `Promise.all()` for parallel PATCHes — no ordering constraint since tasks are independent

**Handle rendering in SVG row:**
```typescript
// Left edge handle (appears on bar hover)
<div
  className="absolute cursor-ew-resize hover:bg-black/20 rounded-l"
  style={{ left: barLeft, top: barTop, width: 6, height: barHeight, zIndex: 20 }}
  onMouseDown={e => onEdgeMouseDown(e, taskId, start, end, 'left')}
/>
// Right edge handle
<div
  className="absolute cursor-ew-resize hover:bg-black/20 rounded-r"
  style={{ left: barLeft + barWidth - 6, top: barTop, width: 6, height: barHeight, zIndex: 20 }}
  onMouseDown={e => onEdgeMouseDown(e, taskId, start, end, 'right')}
/>
```

### Pattern 3: Milestone Marker Drag

**What:** The milestone vertical line becomes draggable. Dragging it updates `milestones.date`.

**Separate drag state** (milestone drag does not interact with bar drag):
```typescript
const milestoneDragRef = useRef<{
  milestoneId: number
  origDate: Date
  startX: number
  pxPerDay: number
  curDate: Date
} | null>(null)
```

**`onUp` fires:** `PATCH /api/milestones/{id}` with `{ date: fmtISO(curDate) }`

**Optimistic update:** `milestoneOverride` Map (analogous to `dragOverride` for tasks) updates the marker position during drag.

### Pattern 4: Inline Task Date Entry in Left Panel

**What:** Task rows in the left panel show clickable Start/End date cells. Clicking opens a date picker.

**Recommendation (Claude's discretion):** Reuse the existing `DatePickerCell` component. It already wraps `react-day-picker` with Radix popover, handles optimistic updates, and fires `onSave`. Since `GanttChart` is a client component, `DatePickerCell` can be rendered inline.

**Date save flow:**
```typescript
// In left panel task row
<DatePickerCell
  value={fmtISO(start)}
  onSave={async (isoDate) => {
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date: isoDate }),
    })
    // No router.refresh() from GanttChart — update local dragOverride state instead
    // so the bar re-renders immediately without a full page reload
    setDragOverride(prev => new Map(prev).set(task.id, {
      start: isoDate ? parseDate(isoDate) : start,
      end,
    }))
  }}
/>
```

**Note:** Unlike workspace tabs that call `router.refresh()`, the Gantt chart is a Client Component that maintains `dragOverride` state. After a PATCH from an inline date cell, update `dragOverride` in-memory rather than triggering a server round-trip. The server state is updated; the visual state is updated optimistically.

### Pattern 5: Reverse Sync (DLVRY-04)

**What:** Date changes made in Task Board or Milestones tab must reflect in the Gantt when the user navigates there.

**Confirmed existing behavior (from code inspection):**
- `TaskEditModal` calls `router.refresh()` after a successful PATCH — confirmed at line 106
- `TaskBoard` calls `router.refresh()` after status change — confirmed at line 316
- `MilestonesTableClient.patchMilestone()` calls `router.refresh()` — confirmed at line 94

**Gantt page is a Server Component** (`app/customer/[id]/gantt/page.tsx`) — it re-fetches data on every render. So navigating to the Gantt tab always shows fresh data.

**No additional work needed for basic DLVRY-04** — the `router.refresh()` calls already in place, combined with server component re-fetch on navigation, cover the requirement.

**However: the MilestonesTableClient date field gap (CRITICAL):**
- `MilestonesTableClient` line 364: `onSave={(v) => patchMilestone(m.id, { target_date: v })}` — PATCHes `target_date` field
- The milestones PATCH schema does NOT have `target_date` — only `target`, `status`, `owner`, `notes`
- The Gantt marker uses `milestone.date` (the `date` column), NOT `milestone.target`
- These are different fields — fixing DLVRY-03 (add `date` to PATCH schema) also enables DLVRY-04 from the Milestones tab
- The `DatePickerCell` onSave in `MilestonesTableClient` should call `patchMilestone(m.id, { date: v })` (not `target_date`)

### Anti-Patterns to Avoid

- **Calling `router.refresh()` from GanttChart component after drag saves:** GanttChart is a Client Component with local `dragOverride` state. `router.refresh()` would cause the Server Component parent to re-render and pass new props, resetting `dragOverride`. Use in-memory state update after drag PATCH instead.
- **Fetching WBS items from the client:** The gantt page is a Server Component — fetch all data server-side and pass as props to GanttChart. This keeps GanttChart free of data-fetching logic.
- **Using `milestone_id` on tasks as the WBS grouping key:** Tasks have `milestone_id` but NOT `wbs_item_id`. The WBS-task relationship is through `wbs_task_assignments` join table. Failing to use the join table will produce incorrect groupings.
- **Rendering WBS level-2/3 items as Gantt rows:** The row model uses only level-1 WBS items as summary rows. Level-2/3 items are in the WBS tree but are NOT rendered in the Gantt (tasks are rendered as children, not WBS sub-items).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date picker UI | Custom calendar component | `DatePickerCell` (already in project, wraps react-day-picker) | Already handles popover, optimistic updates, ISO date formatting |
| Scroll sync (vertical) | Custom scroll listener | Existing `syncFromLeft` / `syncFromRight` pattern in GanttChart | Already handles scroll sync edge cases (re-entrancy via `syncing.current` ref) |
| Panel resize drag | Custom resize handler | Existing `resizeRef` pattern in GanttChart | Already clamps to 200-600px range |
| DB transaction for PATCH | Raw SQL | `db.transaction()` Drizzle pattern (already in both tasks and milestones routes) | Already includes audit log insert |
| WBS-to-tasks mapping | New join query | Two existing queries + `wbsTaskAssignments` fetch + in-memory Map | Consistent with project's existing pattern; avoids N+1 queries |

---

## Common Pitfalls

### Pitfall 1: dragRef Mutation During Async PATCH
**What goes wrong:** The existing `dragRef` is set to `null` before the PATCH completes. This is correct — it prevents new drag state from being corrupted by a slow save. But with multiple concurrent WBS child PATCHes (`Promise.all`), if the user starts a new drag while the first is saving, `dragOverride` entries for child tasks may be stale.
**Why it happens:** `dragOverride` Map is keyed by taskId; concurrent PATCHes updating overlapping child sets can race.
**How to avoid:** Clear `dragOverride` entries for all `wbsChildIds` in `onUp` immediately (before PATCH). Re-add them only on error (rollback). Same pattern as existing single-task drag.
**Warning signs:** Bar snaps back then re-positions on slow connections.

### Pitfall 2: Empty WBS Rows With No Tasks and No Timeline
**What goes wrong:** WBS summary rows with zero tasks have no date range. The timeline bounds computation (`timelineStart`, `totalDays`) ignores them. If ALL rows are empty, timeline defaults to `addDays(new Date(), -14)` + 120 days — this is handled. But placeholder bar positioning needs explicit fallback.
**Why it happens:** `barLeft(null)` would throw; `spanStart` is null.
**How to avoid:** Explicitly check `spanStart === null` before rendering summary bar. Render placeholder bar at a computed default position (e.g., `timelineStart + 7 days` to `timelineStart + 35 days`).
**Warning signs:** TypeScript errors on `barLeft(row.spanStart)` when `spanStart` is null.

### Pitfall 3: WBS Track Mismatch — ADR vs Biggy
**What goes wrong:** The Gantt page currently fetches tasks and milestones without track scoping. WBS items are track-scoped (ADR or Biggy). If the Gantt shows tasks from both tracks mixed under WBS rows from one track only, tasks assigned to the other track's WBS items will appear unassigned.
**Why it happens:** The page has no track parameter in the current URL scheme.
**How to avoid:** Either: (a) fetch WBS items for both tracks and render them all, OR (b) add a track toggle to the Gantt page UI. The CONTEXT.md does not specify track filtering — recommend fetching level-1 items from both ADR and Biggy tracks and rendering all, since the Gantt is a cross-track view.
**Warning signs:** Large "Unassigned" section in the Gantt with tasks that actually have WBS assignments.

### Pitfall 4: Milestone `date` vs `target` Field Confusion
**What goes wrong:** The `milestones` schema has BOTH a `date` column AND a `target` column. The Gantt uses `milestone.date` for marker positioning. The Milestones tab currently shows `target ?? date` as the display date and PATCHes `target_date` (which is not even in the schema — it would be silently dropped by Zod).
**Why it happens:** Historical schema evolution — `target` is a free-text "target date" field; `date` is the canonical ISO date used by the Gantt.
**How to avoid:** When adding `date` to the milestones PATCH schema, also audit `MilestonesTableClient` to confirm which field its `DatePickerCell` saves. The fix is: `patchMilestone(m.id, { date: v })` — not `target_date`.
**Warning signs:** Dragging a milestone marker saves correctly, but editing the date in the Milestones tab has no effect on the Gantt.

### Pitfall 5: WBS Summary Bar Drag with Mixed Dated/Undated Children
**What goes wrong:** Dragging a WBS summary bar is supposed to shift ALL child tasks. But if some children have no dates, they cannot be shifted (no `start_date` to delta from).
**Why it happens:** Tasks are optional date holders — they may have `start_date: null` and `due: null`.
**How to avoid (Claude's discretion):** Drag a WBS summary bar only shifts children that have at least one date. Children with no dates are ignored (no PATCH fired). The summary bar span is recomputed from dated children after save.
**Warning signs:** PATCH request sent with `start_date: null + delta` (invalid); server returns 200 but no visual change.

### Pitfall 6: Left Panel Width — New Date Columns Crowding
**What goes wrong:** Adding Start and End date columns to the left panel pushes task names into very narrow truncated widths.
**Why it happens:** Current left panel at `LEFT_W_DEFAULT = 380px` already has columns: row number (28px), name (flex-1), Start (52px), Due (52px), Duration (40px). Adding another Start/End column pair at 52px each leaves very little room for task names.
**How to avoid:** The current "Start" and "Due" columns in the header are already the date display columns for tasks. The header shows these for both milestone rows (span dates) and task rows (task dates). No new columns are needed — the existing Start/Due display is the inline editable area. The "edit" affordance is making those cells clickable, not adding new columns.
**Warning signs:** Design confusion between "add columns" and "make existing date cells editable."

---

## Code Examples

Verified patterns from existing codebase:

### Existing Whole-Bar Drag Pattern (extend, don't replace)
```typescript
// Source: components/GanttChart.tsx lines 256-300
function onBarMouseDown(e: React.MouseEvent, taskId: string, start: Date, end: Date) {
  e.preventDefault()
  dragRef.current = { taskId, origStart: start, origEnd: end, startX: e.clientX, pxPerDay, curStart: start, curEnd: end }
}
// Extension: add `side: 'move' | 'left' | 'right'` and `wbsChildIds?: string[]`
```

### Existing PATCH Pattern for Task Dates
```typescript
// Source: components/GanttChart.tsx lines 286-293
const res = await fetch(`/api/tasks/${taskId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ start_date: fmtISO(curStart), due: fmtISO(curEnd) }),
})
if (!res.ok) throw new Error()
// No router.refresh() — update dragOverride state only
```

### Milestone PATCH — Schema Extension Required
```typescript
// Source: app/api/milestones/[id]/route.ts line 8-13
// Current patchSchema — MUST ADD date field:
const patchSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'completed', 'blocked']).optional(),
  target: z.string().optional(),
  owner: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().nullable().optional(),   // ADD THIS
})
```

### WBS Items Query (existing, in lib/queries.ts)
```typescript
// Source: lib/queries.ts line 1185-1191
export async function getWbsItems(projectId: number, track: string): Promise<WbsItem[]> {
  return db
    .select()
    .from(wbsItems)
    .where(and(eq(wbsItems.project_id, projectId), eq(wbsItems.track, track)))
    .orderBy(asc(wbsItems.level), asc(wbsItems.display_order));
}
// Need: new query for wbsTaskAssignments OR modify page.tsx to do
// getWbsItems(id, 'ADR') + getWbsItems(id, 'Biggy') for both tracks
```

### WBS Task Assignments Schema
```typescript
// Source: db/schema.ts lines 815-820
export const wbsTaskAssignments = pgTable('wbs_task_assignments', {
  id: serial('id').primaryKey(),
  wbs_item_id: integer('wbs_item_id').notNull().references(() => wbsItems.id),
  task_id: integer('task_id').notNull().references(() => tasks.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
// NOTE: NOT imported or used in lib/queries.ts — must add new query
```

### router.refresh() Pattern (existing in workspace tabs)
```typescript
// Source: components/MilestonesTableClient.tsx line 84-96
async function patchMilestone(id: number, patch: Record<string, unknown>) {
  const res = await fetch(`/api/milestones/${id}`, { method: 'PATCH', ... })
  if (!res.ok) { ... }
  router.refresh()                                     // triggers Gantt re-fetch
  window.dispatchEvent(new CustomEvent('metrics:invalidate'))
}
// TaskEditModal line 106: router.refresh() after task date save — confirmed present
```

### Existing DatePickerCell (reusable for inline task date editing)
```typescript
// Source: components/DatePickerCell.tsx
// Props: value: string | null, onSave: (isoDate: string | null) => Promise<void>
// Uses react-day-picker + @radix-ui/react-popover
// Handles: optimistic updates, error rollback, ISO date format, "Clear / TBD" button
<DatePickerCell value={fmtISO(start)} onSave={async (v) => { /* PATCH + setDragOverride */ }} />
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Milestone-grouped rows (tasks nested under milestone headers) | WBS level-1-item rows (tasks nested under WBS phase headers) | Phase 68 | Structural skeleton is always visible; tasks that belong to no milestone are now properly placed |
| Milestone markers as row containers | Milestone markers as pure vertical date lines | Phase 68 | Cleaner mental model; milestones mark dates, not task groups |
| Whole-bar drag only | Whole-bar drag + edge handles (left/right resize) | Phase 68 | Users can adjust just start or just end date without shifting the other |
| No date editing from Gantt left panel | Clicking Start/End date cells opens date picker | Phase 68 | Faster date entry without modal dialogs |

**Deprecated/outdated:**
- `MilestoneRow` type and `milestoneGroups` useMemo in GanttChart.tsx — replaced by `WbsSummaryRow` and WBS-based grouping
- `mapTasksToGantt` in `gantt/page.tsx` — replaced by new function that groups by WBS parent
- `custom_class` milestone encoding (`gantt-ms-{id}`) — no longer needed for row grouping; only used for task coloring which can be reworked or removed

---

## Open Questions

1. **Which track(s) does the Gantt show — ADR only, Biggy only, or both?**
   - What we know: CONTEXT.md does not specify; the current Gantt shows all tasks for a project regardless of track
   - What's unclear: WBS items are track-scoped. If we show both tracks, do we interleave rows or group by track?
   - Recommendation: Show both tracks, rows in display_order sequence (ADR first, then Biggy) with no visual separator — consistent with "mirror the WBS structure" goal. If both tracks have level-1 items named identically, they will appear as separate rows (different IDs).

2. **Tasks not assigned to any WBS item — how are they displayed?**
   - What we know: CONTEXT.md says "Each WBS level-1 item is always present as a row." It does not specify what happens to tasks with no WBS assignment.
   - What's unclear: Should unassigned tasks have a fallback row (e.g., "Unassigned") or be hidden?
   - Recommendation: Include an "Unassigned" summary row at the bottom (same as current `unassigned` group). Tasks with no `wbsTaskAssignment` record fall here.

3. **`wbsTaskAssignments` data — is it populated for existing projects?**
   - What we know: The `wbs_task_assignments` table exists in schema and migration. However, `wbsTaskAssignments` is NOT imported or used anywhere in `lib/queries.ts` or any route handler beyond the schema definition. The WBS generate plan job does NOT populate this join table.
   - What's unclear: Are there any rows in `wbs_task_assignments` for existing test projects? If not, all tasks will fall into "Unassigned" on first render.
   - Recommendation: Wave 0 test setup should seed one WBS item + one task + one assignment to verify the join query path. This is a known data gap.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (node environment) |
| Config file | `bigpanda-app/vitest.config.ts` |
| Quick run command | `cd bigpanda-app && npx vitest run tests/api/milestones-patch.test.ts tests/api/tasks-patch-dates.test.ts` |
| Full suite command | `cd bigpanda-app && npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DLVRY-01 | WBS level-1 items appear as Gantt rows on page load | smoke | Manual browser verification | No — Wave 0 |
| DLVRY-01 | Empty WBS rows show placeholder bar (no tasks) | unit | `npx vitest run tests/components/GanttChart-wbs-rows.test.ts` | No — Wave 0 |
| DLVRY-02 | Edge drag updates `start_date` only (left handle) | unit | `npx vitest run tests/components/GanttChart-edge-drag.test.ts` | No — Wave 0 |
| DLVRY-02 | Edge drag updates `due` only (right handle) | unit | `npx vitest run tests/components/GanttChart-edge-drag.test.ts` | No — Wave 0 |
| DLVRY-02 | Inline date cell PATCH fires correct API call | unit | `npx vitest run tests/components/GanttChart-inline-dates.test.ts` | No — Wave 0 |
| DLVRY-03 | PATCH /api/milestones/{id} accepts `date` field | unit | `npx vitest run tests/api/milestones-patch.test.ts` | Yes (extend) |
| DLVRY-03 | PATCH /api/tasks/{id} accepts start_date + due | unit | `npx vitest run tests/api/tasks-patch-dates.test.ts` | Yes (exists) |
| DLVRY-04 | MilestonesTableClient PATCHes `date` field (not `target_date`) | unit | `npx vitest run tests/components/MilestonesTableClient-date-field.test.ts` | No — Wave 0 |

**Note on component tests in vitest node environment:** GanttChart.tsx is a client component using browser APIs (`window.addEventListener`, `ResizeObserver`). Vitest runs in node environment. Component behavior tests for drag logic should focus on the pure computation functions (`barLeft`, `barWidth`, the drag delta math) — not DOM rendering. Browser verification handles the visual/interaction testing.

### Sampling Rate
- **Per task commit:** `cd bigpanda-app && npx vitest run tests/api/milestones-patch.test.ts tests/api/tasks-patch-dates.test.ts`
- **Per wave merge:** `cd bigpanda-app && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/api/milestones-patch.test.ts` — extend with RED test for `date` field acceptance (file exists, add new `it` block)
- [ ] `tests/components/GanttChart-wbs-rows.test.ts` — covers DLVRY-01 WBS row model logic
- [ ] `tests/components/GanttChart-edge-drag.test.ts` — covers DLVRY-02 edge drag delta math
- [ ] `tests/components/MilestonesTableClient-date-field.test.ts` — covers DLVRY-04 field alignment fix

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `components/GanttChart.tsx` (589 lines) — full drag implementation analyzed
- Direct code inspection: `app/customer/[id]/gantt/page.tsx` — current data fetch and mapping
- Direct code inspection: `app/api/milestones/[id]/route.ts` — patchSchema gap confirmed
- Direct code inspection: `db/schema.ts` — wbsItems, wbsTaskAssignments, tasks table structures
- Direct code inspection: `lib/queries.ts` — getWbsItems, getTasksForProject, getMilestonesForProject
- Direct code inspection: `components/MilestonesTableClient.tsx` — `target_date` field gap confirmed at line 364
- Direct code inspection: `components/TaskEditModal.tsx` — `router.refresh()` confirmed at line 106
- Direct code inspection: `components/DatePickerCell.tsx` — reusable component interface confirmed

### Secondary (MEDIUM confidence)
- `.planning/phases/68-gantt-bi-directional-sync/68-CONTEXT.md` — architecture decisions locked by user
- `.planning/STATE.md` — established patterns (router.refresh(), inline deletes, no confirmation dialogs)

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed present in package dependencies via codebase inspection
- Architecture: HIGH — current implementation fully read; new patterns derived directly from existing code structures
- Pitfalls: HIGH — identified from direct gaps in existing code (field name mismatches, missing join table usage, TypeScript null checks)
- Data gap (wbsTaskAssignments): MEDIUM — table exists in schema and migration, but no runtime data confirmed; Wave 0 seeding test should verify

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (stable domain — no fast-moving external dependencies)
