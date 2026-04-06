# Phase 38: Gantt Overhaul - Research

**Researched:** 2026-04-06
**Domain:** frappe-gantt v1.2.2 SVG manipulation, React/Next.js client-side state, swim lane accordion UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Milestone markers:**
- Thin vertical dashed line spanning full chart height at each milestone's `target_date` (schema column: `date`)
- Milestone name label positioned above the line
- All project milestones shown regardless of whether they have tasks assigned
- When markers are close together, labels stagger vertically to avoid overlap
- Clicking a marker opens a small popup showing milestone name, target date, and status
- Label shows milestone name only (date visible in the click popup)

**Swim lane structure:**
- Accordion-style: milestone headers are collapsible rows that expand/collapse their tasks
- Default state on page load: all collapsed
- Milestone header shows: milestone name + task count (e.g. "Go-Live (4 tasks)")
- Milestones with no tasks still show as accordion headers (empty, collapsible)
- Tasks with no milestone_id go in an "Unassigned" swim lane at the bottom
- "Unassigned" header is visually distinct — muted/grey styling to de-emphasize

**View mode toggle:**
- Button group (Day / Week / Month / Quarter Year) in the top-right of the Gantt header
- Default view mode: Month (appropriate for project-scale timelines)

**Drag-to-reschedule:**
- frappe-gantt `on_date_change` callback fires on drag completion
- Immediately PATCHes `/api/tasks/:id` with new `start_date` and `due`
- Save is silent — no feedback on success
- On failure: roll back the bar to original position + show a brief error toast

### Claude's Discretion
- Exact stagger algorithm for overlapping milestone labels
- Popup/tooltip component choice (native title, custom div, or existing tooltip pattern)
- Accordion open/close animation timing
- Error toast implementation (reuse existing pattern if one exists)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GNTT-01 | Gantt chart displays milestone target dates as labelled vertical markers on the timeline | frappe-gantt renders on an SVG; milestone markers must be injected as SVG `<line>` + `<text>` elements after Gantt renders, positioned by converting the milestone's ISO date to an x-pixel offset using the same math frappe-gantt uses internally |
| GNTT-02 | User can switch Gantt view mode between Day, Week, Month, and Quarter Year via a UI toggle | frappe-gantt exposes `change_view_mode(mode)` on the Gantt instance; the wrapper component holds view mode in React state and calls this method; the view mode type `'Day' | 'Week' | 'Month' | 'Quarter Year'` already exists in `types/frappe-gantt.d.ts` |
| GNTT-03 | Gantt chart groups tasks under their associated milestone in labelled swim lanes | frappe-gantt renders a flat ordered list; swim lanes require a hybrid approach: accordion-controlled task visibility in the React wrapper sits above a frappe-gantt instance per expanded milestone (or a single flat instance with re-ordering); see Architecture Patterns for the recommended hybrid |
| GNTT-04 | User can drag task bars on the Gantt to reschedule start and end dates, saving immediately to the DB | `on_date_change` callback in GanttOptions receives `(task, start, end)` with Date objects; PATCH `/api/tasks/:id` already accepts `start_date` and `due`; rollback requires storing original task data and calling `ganttRef.current.refresh(tasks)` |
| PLAN-03 | Gantt view colour-codes or groups tasks by their associated milestone so milestone membership is visible on the timeline | Satisfied by GNTT-03's swim lane grouping; colour-coding via `custom_class` on GanttTask can also be added (milestone-specific CSS classes) |
</phase_requirements>

---

## Summary

Phase 38 is entirely a frontend overhaul of a single component (`GanttChart.tsx`) and its server page. There are no data model changes needed — `tasks.milestone_id` and `milestones.date` (the target date field) are already in the schema.

The primary technical challenge is that frappe-gantt v1.2.2 renders a flat ordered task list into an SVG and does not natively support swim lanes, milestone markers, or an external view mode toggle. All three features require extending the component: swim lanes via a React accordion wrapping per-milestone frappe-gantt renders (or a hybrid single-instance with custom header rows injected into the SVG), milestone markers via post-render SVG element injection, and the view toggle by holding state in React and calling `ganttRef.current.change_view_mode()`.

The drag-to-reschedule feature is the simplest: frappe-gantt's `on_date_change` callback already fires correctly, and the PATCH route already exists and handles all required fields. Error rollback requires a reference to the original task list to call `ganttRef.current.refresh()`.

**Primary recommendation:** Implement swim lanes as a React accordion with a single frappe-gantt instance that is rebuilt/filtered per expansion state, injecting SVG milestone markers after render via a `useEffect` that runs after frappe-gantt initialises.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| frappe-gantt | 1.2.2 | Gantt bar rendering and drag interaction | Already installed, already in use, `on_date_change` callback already typed |
| sonner | (installed) | Error toast on drag-save failure | Already in layout.tsx (`<Toaster position="bottom-right" richColors />`), already used in inline edit components |
| React useState/useEffect | (Next.js built-in) | View mode state, accordion state, SVG post-render injection | Established pattern in GanttChart.tsx |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | (project standard) | Accordion header styling, button group toggle | All UI elements |
| Drizzle ORM | (project standard) | `getMilestonesForProject` query (simple select) | Querying milestones in the page Server Component |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| frappe-gantt SVG injection for markers | react-gantt-timeline or dhtmlx-gantt | Would require replacing entire Gantt library; too invasive |
| Single frappe-gantt instance with accordion visibility | Multiple frappe-gantt instances per milestone | Simpler to sync drag state with one instance; multiple instances complicate `on_date_change` wiring |

**Installation:** No new packages needed. All dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure
No new files required beyond the three already identified:
```
bigpanda-app/
├── lib/queries.ts                       # Add getMilestonesForProject
├── app/customer/[id]/plan/gantt/
│   └── page.tsx                         # Fetch milestones, pass to GanttChart
└── components/
    └── GanttChart.tsx                   # All rendering changes live here
```

### Pattern 1: View Mode Toggle
**What:** React state for `viewMode` in `GanttChart.tsx`. Button group renders in a header `<div>` above the SVG. On click, updates state and calls `ganttRef.current.change_view_mode(newMode)` (no full re-render needed).
**When to use:** When frappe-gantt is already initialised (instance exists in `ganttRef.current`).
**Example:**
```typescript
// Source: frappe-gantt.es.js — change_view_mode(mode) exists on the class instance
const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month' | 'Quarter Year'>('Month')

function handleViewChange(mode: typeof viewMode) {
  setViewMode(mode)
  if (ganttRef.current) {
    (ganttRef.current as { change_view_mode: (m: string) => void }).change_view_mode(mode)
  }
}
```

### Pattern 2: Swim Lanes via Accordion + frappe-gantt Task Filtering
**What:** GanttChart.tsx renders:
1. A `<div>` accordion header for each milestone group (collapsible)
2. When a milestone group is expanded, passes only that group's tasks to frappe-gantt (or re-orders the flat list with visible tasks only)
3. A single frappe-gantt SVG instance containing all currently-visible tasks

**Recommended approach:** Single frappe-gantt instance. The React component maintains `expandedGroups: Set<string>`. Compute `visibleTasks` by filtering to tasks whose `milestone_id` is in `expandedGroups`, plus "Unassigned" tasks if that group is expanded. Re-initialise frappe-gantt (clear SVG + new instance) whenever `expandedGroups` changes. Header rows are rendered as HTML divs above the SVG, NOT inside the SVG.

**Why not inject header rows into the SVG:** frappe-gantt recomputes `_index` for every task to position bars on the y-axis. Injecting fake "header" tasks would offset every real task's position. HTML divs above the SVG are simpler and more robust.

**When to use:** For all accordion expand/collapse interactions.
**Example:**
```typescript
// Accordion header rendered as HTML above the frappe-gantt SVG
<div
  className="flex items-center gap-2 px-3 py-2 bg-zinc-100 cursor-pointer hover:bg-zinc-200"
  onClick={() => toggleGroup(milestoneId)}
>
  <span>{isExpanded ? '▼' : '▶'}</span>
  <span className="font-medium text-sm">{milestoneName}</span>
  <span className="text-xs text-zinc-500">({taskCount} tasks)</span>
</div>
// frappe-gantt renders below with only visible tasks
```

### Pattern 3: Milestone Markers via Post-Render SVG Injection
**What:** After frappe-gantt renders, a second `useEffect` queries `ganttRef.current` for its internal coordinate system data (`gantt_start`, `config.column_width`, `config.step`, `config.unit`) to compute the x-pixel position of each milestone date, then appends `<line>` and `<text>` elements to the SVG.

**X-position formula** (verified from frappe-gantt source lines 606-608):
```typescript
// From frappe-gantt.es.js compute_x():
// x = diff(task._start, gantt_start, config.unit) / config.step * column_width
// Same formula applies to milestone dates:
const ganttInstance = ganttRef.current as any
const markerX = dateDiff(milestoneDate, ganttInstance.gantt_start, ganttInstance.config.unit)
  / ganttInstance.config.step * ganttInstance.config.column_width
```

The `d.diff` function from frappe-gantt is not exported, but the same calculation can be reproduced:
```typescript
function daysDiff(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)
}
```
For Day view: `x = daysDiff(milestoneDate, gantt_start) * column_width`
For Week view: `x = daysDiff(milestoneDate, gantt_start) / 7 * column_width`
For Month view: use `d.diff` approach (months) — approximate: `x = monthsDiff * column_width`

**Simpler alternative** (recommended for reliability): Instead of computing x from gantt internals, render markers as absolutely positioned HTML elements over the scrollable `.gantt-container` div, using the same date-to-pixel math but driven entirely from React state. This avoids coupling to frappe-gantt internals.

**When to use:** After every frappe-gantt re-render (tasks change, view mode changes, groups expand/collapse).

### Pattern 4: Drag-to-Reschedule Save and Rollback
**What:** `on_date_change` callback receives the updated task. Immediately calls PATCH. On error, stores original tasks array before render, calls `ganttRef.current.refresh(originalTasks)` to reset positions, and fires `toast.error()`.

```typescript
// Source: types/frappe-gantt.d.ts — on_date_change: (task, start, end) => void
on_date_change: async (task, start, end) => {
  const originalTasks = [...tasksRef.current] // saved before render
  const taskId = task.id
  const formatDate = (d: Date) => d.toISOString().split('T')[0]

  try {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_date: formatDate(start),
        due: formatDate(end),
      }),
    })
    // Silent success — no toast
  } catch {
    // Roll back
    if (ganttRef.current) {
      (ganttRef.current as { refresh: (t: unknown[]) => void }).refresh(originalTasks)
    }
    toast.error('Failed to save new dates')
  }
}
```

### Anti-Patterns to Avoid
- **Injecting milestone tasks as frappe-gantt task objects:** frappe-gantt uses `_index` for y-positioning. Fake tasks would shift all real tasks down and break drag calculations.
- **Calling `ganttRef.current.change_view_mode()` before initialisation:** The ref is null until the dynamic import resolves. Always guard with `if (ganttRef.current)`.
- **Re-initialising frappe-gantt (clearing SVG) on every state change:** Only re-initialise when tasks or viewMode actually changes. The current `useEffect([tasks, viewMode])` dependency array pattern is correct.
- **Using frappe-gantt's `popup` option for milestone click popup:** That popup is task-scoped. Milestone marker click events are on injected SVG elements and should use a separate React state-controlled div.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error toast on save failure | Custom toast component | `sonner` — `toast.error()` | Already in layout.tsx with `<Toaster>`, pattern exists in InlineSelectCell.tsx |
| Date formatting for PATCH body | Custom date serialiser | `d.toISOString().split('T')[0]` | frappe-gantt passes Date objects; ISO slice is safe and already used in the page |
| Type declarations for frappe-gantt | Rewrite type file | Use existing `types/frappe-gantt.d.ts` | Already has `on_date_change`, `change_view_mode`, `refresh` typed |

**Key insight:** The project already has all required infrastructure (toast, API route, types). This phase is purely a rendering/interaction problem inside GanttChart.tsx.

---

## Common Pitfalls

### Pitfall 1: Milestone Date Field Name
**What goes wrong:** CONTEXT.md and the page layer refer to "milestone `target_date`" but the actual schema column in `db/schema.ts` is `date` (and there is also a separate `target` text column for the milestone's target deliverable description).
**Why it happens:** The Milestone type is `typeof milestones.$inferSelect` — the field is `m.date`, not `m.target_date`.
**How to avoid:** Reference `milestone.date` everywhere. Only use ISO dates (filter with `/^\d{4}-\d{2}-\d{2}/`); treat 'TBD', quarter strings like '2026-Q3', and null as having no renderable marker.
**Warning signs:** TypeScript error `Property 'target_date' does not exist on type 'Milestone'`.

### Pitfall 2: frappe-gantt SSR Crash
**What goes wrong:** frappe-gantt accesses `document` and `SVGElement` at import time. Importing it at module level in a Next.js Client Component crashes SSR.
**Why it happens:** Next.js renders Client Components on the server for hydration.
**How to avoid:** The existing pattern in GanttChart.tsx is correct — `import('frappe-gantt')` inside `useEffect`. Do not move this import to the module level.
**Warning signs:** `ReferenceError: document is not defined` during Next.js build or server render.

### Pitfall 3: Stale ganttRef After Re-render
**What goes wrong:** `ganttRef.current` holds the previous Gantt instance after tasks change if the `useEffect` cleanup doesn't run first.
**Why it happens:** The cleanup (`svgRef.current.innerHTML = ''`) runs, but the ref isn't set to null before the new instance is created.
**How to avoid:** The existing pattern sets `ganttRef.current = null` immediately after clearing the SVG, before the dynamic import resolves. Keep this null-assignment step.
**Warning signs:** Duplicate bars appearing, or `change_view_mode` being called on a stale/detached instance.

### Pitfall 4: View Mode Toggle Calling Wrong Method
**What goes wrong:** Calling `new Gantt(...)` to change view mode instead of `change_view_mode()` causes a full re-initialise, losing scroll position and injected markers.
**Why it happens:** Not knowing frappe-gantt exposes `change_view_mode` on the class instance (not just in the constructor options).
**How to avoid:** Use `ganttRef.current.change_view_mode(newMode)` for view changes after initial render. Only call `new Gantt(...)` when tasks actually change.
**Warning signs:** Scroll position resets to start on every view toggle, milestone markers disappear.

### Pitfall 5: Accordion State Causes Frappe-Gantt Re-Init Loop
**What goes wrong:** Expand/collapse triggers a tasks-array change → frappe-gantt re-init → inject markers → triggers another effect.
**Why it happens:** Effect dependency arrays that include derived state.
**How to avoid:** Keep `visibleTasks` computation inside the `useEffect([tasks, viewMode])` (not a separate state). Use `expandedGroups` as a dependency that controls which tasks to pass to `new Gantt(...)`.

### Pitfall 6: Milestone Marker X-Position Desync After View Mode Change
**What goes wrong:** SVG milestone markers are positioned correctly after initial render but appear at wrong x-positions after switching view mode.
**Why it happens:** Marker injection only runs in the frappe-gantt init effect, not when view mode changes.
**How to avoid:** Run marker injection in a separate `useEffect` that depends on `[viewMode, ganttReady, milestones]`. Use a `ganttReady` state flag that is set after frappe-gantt initialises, so marker injection can depend on it.
**Warning signs:** Milestone markers drift to wrong dates when switching Day/Week/Month/Quarter.

---

## Code Examples

Verified patterns from project source:

### Toast Error (sonner — already in project)
```typescript
// Source: bigpanda-app/components/InlineSelectCell.tsx line 4, 44
import { toast } from 'sonner'
toast.error('Save failed — please try again')
// Toaster already mounted in app/layout.tsx line 40:
// <Toaster position="bottom-right" richColors />
```

### Existing Dynamic Import Pattern (must preserve)
```typescript
// Source: bigpanda-app/components/GanttChart.tsx lines 23-40
useEffect(() => {
  if (!svgRef.current) return
  if (tasks.length === 0) return
  svgRef.current.innerHTML = ''
  ganttRef.current = null
  import('frappe-gantt').then(({ default: Gantt }) => {
    if (!svgRef.current) return
    ganttRef.current = new Gantt(svgRef.current, tasks, {
      view_mode: viewMode,
      date_format: 'YYYY-MM-DD',
      popup_trigger: 'click',
    })
  })
  return () => {
    if (svgRef.current) svgRef.current.innerHTML = ''
  }
}, [tasks, viewMode])
```

### frappe-gantt on_date_change Signature
```typescript
// Source: bigpanda-app/types/frappe-gantt.d.ts line 17
on_date_change?: (task: GanttTask, start: Date, end: Date) => void
// Note: start and end are Date objects, not strings
```

### PATCH /api/tasks/:id — accepted fields
```typescript
// Source: bigpanda-app/app/api/tasks/[id]/route.ts lines 12-25
// Both start_date and due are accepted as nullable strings
start_date: z.string().nullable().optional(),
due: z.string().nullable().optional(),
// Returns: { ok: true } on success, { error: string } on failure
```

### getMilestonesForProject Pattern (to be added)
```typescript
// Source: pattern from bigpanda-app/lib/queries.ts getTasksForProject (line 424)
export async function getMilestonesForProject(projectId: number): Promise<Milestone[]> {
  return db.select().from(milestones).where(eq(milestones.project_id, projectId))
    .orderBy(milestones.created_at)
}
// Milestone.date is the target date field (TEXT — ISO or 'TBD' or '2026-Q3')
// Milestone.name is the display label
// Milestone.status is the status string
```

### SVG Line Injection for Milestone Markers
```typescript
// Pattern for injecting a dashed vertical marker into the frappe-gantt SVG
// Must run AFTER frappe-gantt renders (i.e., inside .then() or a separate useEffect with ganttReady)
const svg = svgRef.current
const gridHeight = svg.getAttribute('height') || '400'
const headerHeight = 85 // frappe-gantt default: upper_header_height(45) + lower_header_height(30) + 10

const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
line.setAttribute('x1', String(markerX))
line.setAttribute('x2', String(markerX))
line.setAttribute('y1', String(headerHeight))
line.setAttribute('y2', gridHeight)
line.setAttribute('stroke', '#6366f1')       // indigo — milestone colour
line.setAttribute('stroke-width', '1.5')
line.setAttribute('stroke-dasharray', '4,3')
line.setAttribute('class', 'milestone-marker')
svg.appendChild(line)

const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
label.setAttribute('x', String(markerX + 4))
label.setAttribute('y', String(headerHeight - 6))
label.setAttribute('font-size', '11')
label.setAttribute('fill', '#6366f1')
label.setAttribute('class', 'milestone-label')
label.textContent = milestone.name
svg.appendChild(label)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| frappe-gantt v0.x — no `on_date_change` in type defs | v1.2.2 — `on_date_change`, `change_view_mode`, `refresh` all typed and available | Already at v1.2.2 in project | Drag-save and view toggle work without library upgrade |
| `popup_trigger: 'click'` (old option name) | `popup_on: 'click'` (v1.2.2 option name) | frappe-gantt v1.x | Current GanttChart.tsx uses the old name — it still works but `popup_on` is the canonical option |

**Note on `popup_trigger` vs `popup_on`:** The existing GanttChart.tsx passes `popup_trigger: 'click'` but the v1.2.2 source uses `popup_on`. The old option name appears to be silently accepted (the code checks `options.popup_on` internally). No change needed unless popup behaviour is broken.

---

## Open Questions

1. **Milestone marker x-position in Month/Quarter Year view**
   - What we know: frappe-gantt Month view uses `step: '1m'` and `column_width: 120`. Day diff logic approximates months.
   - What's unclear: Exact pixel accuracy for milestone markers in Month view (months have variable day counts). The `d.diff` internal function accounts for this.
   - Recommendation: Use `daysDiff(milestoneDate, ganttStart) / 30 * columnWidth` for Month view as a close approximation, or expose gantt internals via type assertion to access the real `d.diff` function. The approximation is acceptable since markers are visual indicators, not pixel-perfect.

2. **Accordion + single frappe-gantt instance: re-render strategy**
   - What we know: Expanding a group means adding tasks to frappe-gantt's task list. `ganttRef.current.refresh(newTasks)` updates the task list without full re-init.
   - What's unclear: Whether `refresh()` preserves scroll position.
   - Recommendation: Test `refresh()` first. If scroll resets, use `change_view_mode(currentMode, true)` after refresh (the second `true` arg preserves scroll position per frappe-gantt source line 947-948).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts) |
| Config file | `bigpanda-app/vitest.config.ts` |
| Quick run command | `cd bigpanda-app && npx vitest run tests/api/tasks-patch-dates.test.ts` |
| Full suite command | `cd bigpanda-app && npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GNTT-01 | Milestone markers rendered when milestones have ISO dates | manual-only | N/A — SVG DOM output requires browser environment | N/A |
| GNTT-02 | View mode toggle changes Gantt view | manual-only | N/A — requires browser + frappe-gantt DOM | N/A |
| GNTT-03 | Tasks grouped in milestone swim lanes; unassigned in last lane | manual-only | N/A — requires browser rendering | N/A |
| GNTT-04 | PATCH /api/tasks/:id accepts start_date + due fields and saves | unit | `cd bigpanda-app && npx vitest run tests/api/tasks-patch-dates.test.ts` | ❌ Wave 0 |
| PLAN-03 | Milestone grouping visible on Gantt timeline | manual-only | N/A — visual verification | N/A |

**Rationale for manual-only tests:** frappe-gantt accesses `document`, `SVGElement`, and `requestAnimationFrame` at runtime. The vitest config uses `environment: 'node'`. The existing pattern in the project is to test API routes in unit tests and verify UI features manually. The Gantt component cannot be unit-tested without a full jsdom/browser environment not present in this setup.

### Sampling Rate
- **Per task commit:** `cd bigpanda-app && npx tsc --noEmit` — TypeScript compile check
- **Per wave merge:** `cd bigpanda-app && npx vitest run` — full unit suite
- **Phase gate:** Full suite green + manual browser verification of all 4 GNTT requirements

### Wave 0 Gaps
- [ ] `bigpanda-app/tests/api/tasks-patch-dates.test.ts` — covers GNTT-04: verifies PATCH `/api/tasks/:id` correctly persists `start_date` and `due` fields (follow pattern from `tests/api/actions-patch.test.ts`)

---

## Sources

### Primary (HIGH confidence)
- `bigpanda-app/node_modules/frappe-gantt/dist/frappe-gantt.es.js` — full source read; confirmed `on_date_change`, `change_view_mode(mode, preserveScroll)`, `refresh(tasks)`, `gantt_start`, `config.column_width`, `config.step`, `config.unit`, `view_mode: 'Quarter Year'` all present in v1.2.2
- `bigpanda-app/types/frappe-gantt.d.ts` — confirmed existing type declarations cover all needed callbacks
- `bigpanda-app/components/GanttChart.tsx` — confirmed existing SSR-safe dynamic import pattern
- `bigpanda-app/app/api/tasks/[id]/route.ts` — confirmed `start_date` and `due` are in the PATCH schema
- `bigpanda-app/db/schema.ts` — confirmed `milestones.date` (not `target_date`) is the correct field name; confirmed `tasks.milestone_id` FK exists
- `bigpanda-app/app/layout.tsx` — confirmed `<Toaster>` from sonner is already mounted; `position="bottom-right" richColors`
- `bigpanda-app/components/InlineSelectCell.tsx` — confirmed `toast.error()` pattern for rollback in existing inline edit components

### Secondary (MEDIUM confidence)
- `bigpanda-app/.planning/phases/38-gantt-overhaul/38-CONTEXT.md` — user decisions captured from /gsd:discuss-phase
- `bigpanda-app/app/customer/[id]/plan/gantt/page.tsx` — confirmed current Server Component structure; no milestone fetch today

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified by direct source read
- Architecture: HIGH — frappe-gantt internals fully read; SVG injection pattern confirmed from source
- Pitfalls: HIGH — date field name mismatch verified against schema; SSR pattern verified in existing code
- Milestone date field name: HIGH — `milestones.date` confirmed; CONTEXT.md uses informal "target_date" term

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (frappe-gantt is stable; no version change expected)

---

### Critical Implementation Note: `milestones.date` vs `target_date`

The CONTEXT.md, requirements, and planning shorthand all refer to "milestone `target_date`" but the actual Drizzle schema column (and therefore the TypeScript `Milestone` type) uses the field name **`date`**:

```typescript
// db/schema.ts line 173
date: text('date'), // TEXT — 'TBD', '2026-Q3', ISO date
```

The planner and executor MUST use `milestone.date` in all code. The milestone also has a `target` column (text description of what the milestone targets) which is separate and unrelated. The date filter for renderable markers is: `m.date && /^\d{4}-\d{2}-\d{2}/.test(m.date)`.
