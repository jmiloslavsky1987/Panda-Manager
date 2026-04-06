# Phase 39: Cross-Tab Sync & Plan Tab - Research

**Researched:** 2026-04-06
**Domain:** Cross-component state synchronization, event-driven UI updates, chart interactivity, bulk operations
**Confidence:** HIGH

## Summary

This phase implements cross-component synchronization using browser custom events (not actual cross-tab via localStorage/BroadcastChannel), chart drill-down navigation, and bulk status operations. The technical domain is well-established: React custom events for in-page coordination, Recharts onClick handlers for pie segment navigation, and extending existing bulk operation patterns.

**Key findings:** The existing codebase already has all necessary infrastructure. OverviewMetrics and HealthDashboard fetch from the same `/api/projects/${projectId}/overview-metrics` endpoint. TaskBoard has a fully-implemented BulkToolbar with owner/due/phase modes — adding status is pattern replication. PhaseBoard lacks bulk UI entirely but can model after TaskBoard's implementation. Recharts 3.8.1 PieChart supports onClick props on both Pie and Cell components for segment-level interactivity.

**Primary recommendation:** Use window.dispatchEvent + window.addEventListener pattern for metrics invalidation (not cross-browser-tab sync). Add onClick to Recharts Pie component with useRouter().push for drill-down. Extend TaskBoard BulkToolbar with a status mode. Add checkboxes and a status-only bulk toolbar to PhaseBoard.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Cross-tab sync mechanism (SYNC-01):** Window custom event — save handlers dispatch `metrics:invalidate` after each successful PATCH; OverviewMetrics and HealthDashboard listen via `window.addEventListener('metrics:invalidate', ...)` and re-fetch. No dependencies, no context changes, wires at the call site in existing inline-edit components. Visual effect on re-fetch: seamless in-place update — numbers replace with no loading indicator or spinner.
- **Risk chart drill-down (SYNC-02):** Clicking a pie segment navigates to `/customer/[id]/risks?severity=[severity]`. Consistent with existing `?status=` URL filter pattern in the app (shareable, browser back works). Risks tab reads the `severity` query param on mount and pre-applies the filter. Visual affordance: CSS `cursor: pointer` on segments only — no tooltip, no hover highlight.
- **Active blocker definition (SYNC-03):** "Blocked items" = tasks with `status = 'blocked'`. HealthDashboard replaces the current count with a list of blocked task titles, each linking to the Task Board. Current implementation counts blocked onboarding steps — this is replaced, not extended. Link target: `/customer/[id]/plan/tasks` (Task Board page).
- **Overdue criteria (PLAN-01):** A task is overdue when: `due_date < today AND status != 'done'`. Blocked tasks with past-due dates count as overdue — doubly worth surfacing. Visual treatment: red card border + subtle red background — consistent with Actions overdue style. Tasks stay in their current column position (no sort-to-top).
- **Bulk status update — TaskBoard (PLAN-02):** Add "Status" as a new mode to the existing BulkToolbar alongside owner/due/phase. Status dropdown shows all 4 statuses: todo / in_progress / blocked / done. No changes to existing bulk owner/due/phase actions — status is additive.
- **Bulk status update — PhaseBoard (PLAN-02):** PhaseBoard gets checkboxes (status-only scope, not full parity with TaskBoard). Checkbox column added to each phase card. When 1+ cards selected: floating toolbar appears with a status dropdown (same statuses as TaskBoard). No owner/due/phase bulk actions on PhaseBoard — status only.

### Claude's Discretion
- Exact event listener cleanup (useEffect return vs. AbortController)
- Whether OverviewMetrics and HealthDashboard share a single listener registration or each manage their own
- Minimum selection threshold for bulk toolbar (1+ vs 2+ selected)
- Blocked task list truncation in HealthDashboard if many tasks are blocked (e.g. show max 5 with "and N more")
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SYNC-01 | Editing a Risk, Action, or Milestone in its tab triggers an in-place refresh of Overview metrics without requiring the user to navigate away and back | Window custom event pattern via dispatchEvent + addEventListener; fetch-on-event pattern in useEffect |
| SYNC-02 | Clicking a severity segment in the Overview risk distribution chart navigates to the Risks tab pre-filtered to that severity | Recharts Pie onClick prop + Next.js router.push with query params |
| SYNC-03 | Overview HealthDashboard "active blockers" count is replaced with a list of the actual blocked items with links to the relevant tab | New query for tasks WHERE status='blocked'; replace count display with task list + Link components |
| PLAN-01 | Tasks with past-due dates are visually highlighted (red styling) on the Task Board and Phase Board, consistent with Actions overdue style | Date comparison in card component; conditional className with red border + bg; today's date via new Date().toISOString().split('T')[0] |
| PLAN-02 | Phase Board and Task Board multi-select checkboxes are wired to a bulk status update action (currently dead UI) | TaskBoard: add status mode to BulkToolbar; PhaseBoard: add checkbox state + new bulk toolbar component with status dropdown only |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.0 | App Router, useRouter for navigation, useSearchParams for filters | Project framework |
| React | 19.2.4 | Client Components, useState/useEffect, custom event handling | Project framework |
| Recharts | 3.8.1 | PieChart/Pie/Cell components with onClick handlers | Already in use for OverviewMetrics charts |
| TypeScript | 5.x | Type safety for event payloads, chart data structures | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @dnd-kit | 6.3.1, 10.0.0 | Already powering TaskBoard and PhaseBoard drag-and-drop | Maintain existing board interactions |
| Vitest | 4.1.1 | Testing framework (already configured with jsdom environment) | Test event listeners, onClick handlers, bulk operations |
| @testing-library/react | 16.3.2 | Component rendering and interaction testing | Verify metrics re-fetch, chart clicks, bulk UI state |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Window custom events | BroadcastChannel API | BroadcastChannel is for cross-tab (different browser tabs), not needed for same-page component sync; custom events are simpler and sufficient |
| Window custom events | React Context or state lifting | Context would require wrapping all edit components and metrics components in a provider — heavy refactor; custom events are surgical and decouple components |
| Recharts onClick | Custom SVG + click handlers | Recharts is already used and provides onClick out-of-the-box; no need to hand-roll |

**Installation:**
All dependencies already installed — no new packages required.

## Architecture Patterns

### Recommended Project Structure
```
components/
├── OverviewMetrics.tsx     # Add useEffect for metrics:invalidate listener
├── HealthDashboard.tsx     # Add useEffect for metrics:invalidate listener + replace blocker count with task list
├── TaskBoard.tsx           # Add status mode to BulkToolbar + overdue visual treatment
├── PhaseBoard.tsx          # Add checkboxes + new PhaseBulkToolbar component + overdue visual treatment
├── ActionsTableClient.tsx  # Dispatch metrics:invalidate after PATCH
├── RisksTableClient.tsx    # Dispatch metrics:invalidate after PATCH
└── MilestonesTableClient.tsx # Dispatch metrics:invalidate after PATCH

app/customer/[id]/risks/page.tsx
└── Read severity query param, pass to RisksTableClient as initial filter
```

### Pattern 1: Custom Event for Cross-Component Invalidation

**What:** Dispatch a custom event from save handlers; listening components re-fetch on event.

**When to use:** When multiple components depend on the same data source but are not in a parent-child relationship.

**Example:**
```typescript
// In any inline-edit save handler (Actions, Risks, Milestones)
async function handleSave(id: number, patch: Record<string, unknown>) {
  const res = await fetch(`/api/actions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (res.ok) {
    router.refresh()
    // Notify metrics components to re-fetch
    window.dispatchEvent(new CustomEvent('metrics:invalidate'))
  }
}

// In OverviewMetrics.tsx and HealthDashboard.tsx
useEffect(() => {
  const handleInvalidate = () => {
    fetchMetrics() // re-fetch metrics data
  }

  window.addEventListener('metrics:invalidate', handleInvalidate)

  return () => {
    window.removeEventListener('metrics:invalidate', handleInvalidate)
  }
}, [projectId]) // re-attach if projectId changes
```

**Why this works:** CustomEvent is a standard browser API. No libraries needed. Listeners clean up via useEffect return function. No memory leaks if implemented correctly.

### Pattern 2: Recharts Pie onClick for Drill-Down

**What:** Add onClick prop to Recharts Pie component to handle segment clicks.

**When to use:** When chart segments should navigate to filtered views.

**Example:**
```typescript
// In OverviewMetrics.tsx
import { useRouter } from 'next/navigation'

const router = useRouter()

const handlePieClick = (data: any) => {
  const severity = data.severity // from your chart data structure
  router.push(`/customer/${projectId}/risks?severity=${severity}`)
}

<PieChart>
  <Pie
    data={riskChartData}
    dataKey="count"
    onClick={handlePieClick}
    style={{ cursor: 'pointer' }}
    // ... other props
  >
    {riskChartData.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={entry.color} />
    ))}
  </Pie>
</PieChart>
```

**Why this works:** Recharts 3.8.1 Pie component supports onClick prop. Event payload includes the data object for the clicked segment. Use that to extract severity and construct URL.

### Pattern 3: URL Query Param Filtering (Already Established)

**What:** Read query params on page mount, apply as initial filter state.

**When to use:** For shareable, bookmarkable filters.

**Example:**
```typescript
// In RisksTableClient.tsx (add severity filter logic)
const searchParams = useSearchParams()
const severityFilter = searchParams.get('severity') ?? ''

const filteredRisks = useMemo(() => {
  let result = risks
  if (severityFilter) {
    result = result.filter(r => r.severity.toLowerCase() === severityFilter.toLowerCase())
  }
  // ... other filters
  return result
}, [risks, severityFilter, /* other deps */])
```

**Why this works:** Existing Actions, Risks, Milestones pages already use `?status=`, `?owner=`, `?from=`, `?to=` params. Adding `?severity=` is consistent.

### Pattern 4: Bulk Operations with Mode State

**What:** Toolbar component with mode state (null | 'owner' | 'due' | 'phase' | 'status'). Render input UI based on mode.

**When to use:** When multiple bulk actions share the same selection set.

**Example (extending TaskBoard BulkToolbar):**
```typescript
// In TaskBoard.tsx BulkToolbar component
const [mode, setMode] = useState<'owner' | 'due' | 'phase' | 'status' | null>(null)
const [statusInput, setStatusInput] = useState<'todo' | 'in_progress' | 'blocked' | 'done'>('todo')

// Add a fourth button
{mode === null ? (
  <>
    {/* existing owner/due/phase buttons */}
    <button onClick={() => setMode('status')}>Change Status</button>
  </>
) : mode === 'status' ? (
  <form onSubmit={(e) => { e.preventDefault(); bulkUpdate({ status: statusInput }) }}>
    <select value={statusInput} onChange={(e) => setStatusInput(e.target.value as any)}>
      <option value="todo">To Do</option>
      <option value="in_progress">In Progress</option>
      <option value="blocked">Blocked</option>
      <option value="done">Done</option>
    </select>
    <button type="submit">Apply</button>
    <button type="button" onClick={() => setMode(null)}>Cancel</button>
  </form>
) : /* other modes */}
```

**Why this works:** TaskBoard already implements this pattern for owner/due/phase. Adding status is just another mode branch.

### Pattern 5: Overdue Visual Treatment

**What:** Conditional className based on date comparison.

**When to use:** When highlighting time-sensitive items.

**Example:**
```typescript
// In TaskCard component (TaskBoard and PhaseBoard)
const today = new Date().toISOString().split('T')[0]
const isOverdue = task.due && task.due < today && task.status !== 'done'

<div
  className={`bg-white border rounded-lg p-3 ${
    isOverdue ? 'border-red-500 bg-red-50' : 'border-zinc-200'
  }`}
>
  {/* card content */}
</div>
```

**Why this works:** Simple date string comparison (YYYY-MM-DD). No date library needed. Consistent with existing overdue treatment in Actions table (red border + background).

### Anti-Patterns to Avoid

- **Polling for updates:** Don't use setInterval to re-fetch metrics every N seconds. Custom events are immediate and efficient.
- **Shared global state for metrics:** Don't use Zustand/Jotai/Redux for metrics. Components should own their own fetch state. Events just trigger re-fetch.
- **Coupling metrics listener to specific components:** Don't hard-code "when action is saved, call OverviewMetrics.refresh()". Dispatch a generic event; any component can listen.
- **Manual DOM manipulation for chart clicks:** Don't use querySelector to attach click handlers to Recharts SVG elements. Use the onClick prop.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-component state sync | Custom pub/sub system, global state manager | Browser CustomEvent API | Built-in, zero dependencies, well-understood cleanup via removeEventListener |
| Chart interactivity | Custom SVG rendering + click zones | Recharts onClick props | Already using Recharts; onClick is built-in; handles event payloads automatically |
| Date comparison for overdue | Date parsing libraries (date-fns, dayjs, moment) | String comparison on ISO dates | ISO date strings (YYYY-MM-DD) sort lexicographically; no library needed for simple < comparison |
| URL query param handling | Custom query string parser | Next.js useSearchParams, URLSearchParams | Built into Next.js; type-safe; handles encoding/decoding |

**Key insight:** This phase extends existing patterns, not inventing new ones. Every technical decision has a precedent in the codebase (except custom events, which are vanilla browser API).

## Common Pitfalls

### Pitfall 1: Memory Leaks from Event Listeners

**What goes wrong:** Adding window.addEventListener in useEffect without a cleanup function causes listeners to accumulate on every component re-render or remount.

**Why it happens:** React re-runs useEffect when dependencies change. If you don't remove the old listener, you end up with duplicates.

**How to avoid:** Always return a cleanup function from useEffect that calls removeEventListener.

**Warning signs:** Metrics fetch multiple times per edit. Console shows duplicate fetch calls. Memory usage grows over time.

**Example:**
```typescript
// WRONG — no cleanup
useEffect(() => {
  window.addEventListener('metrics:invalidate', handleInvalidate)
}, [projectId])

// CORRECT — cleanup on unmount or dependency change
useEffect(() => {
  window.addEventListener('metrics:invalidate', handleInvalidate)
  return () => {
    window.removeEventListener('metrics:invalidate', handleInvalidate)
  }
}, [projectId])
```

### Pitfall 2: Recharts onClick Payload Confusion

**What goes wrong:** Assuming onClick receives the data object directly. Recharts onClick actually receives an event-like object with nested data.

**Why it happens:** Recharts wraps the data in a payload structure. Structure varies slightly between Pie/Bar/Line charts.

**How to avoid:** Console.log the onClick argument first to inspect the structure. For Pie charts, data is typically in the first argument as a plain object with your data keys (severity, count, etc.).

**Warning signs:** onClick fires but navigation uses undefined or wrong severity. TypeScript errors about missing properties.

**Example:**
```typescript
// Structure for Pie onClick (Recharts 3.8.1)
const handlePieClick = (data: any) => {
  console.log(data) // { severity: 'high', count: 3, color: '#f97316' }
  const severity = data.severity
  router.push(`/customer/${projectId}/risks?severity=${severity}`)
}
```

### Pitfall 3: Stale Closures in Event Handlers

**What goes wrong:** Event handler function captures old state/props. When event fires, handler uses stale values.

**Why it happens:** JavaScript closures. If you define handleInvalidate outside useEffect or without dependencies, it closes over the initial projectId or fetchMetrics reference.

**How to avoid:** Define handler inside useEffect so it captures current values. Or use useCallback with proper dependencies.

**Warning signs:** After projectId changes (user navigates to different project), metrics fetch uses old projectId.

**Example:**
```typescript
// WRONG — handleInvalidate captures initial projectId
const handleInvalidate = () => {
  fetch(`/api/projects/${projectId}/overview-metrics`) // stale projectId
}

useEffect(() => {
  window.addEventListener('metrics:invalidate', handleInvalidate)
  return () => window.removeEventListener('metrics:invalidate', handleInvalidate)
}, [projectId])

// CORRECT — define inside useEffect or use useCallback
useEffect(() => {
  const handleInvalidate = () => {
    fetch(`/api/projects/${projectId}/overview-metrics`) // current projectId
  }

  window.addEventListener('metrics:invalidate', handleInvalidate)
  return () => window.removeEventListener('metrics:invalidate', handleInvalidate)
}, [projectId])
```

### Pitfall 4: Infinite Re-Fetch Loop

**What goes wrong:** fetchMetrics triggers router.refresh(), which re-mounts component, which triggers fetchMetrics again, infinite loop.

**Why it happens:** Calling router.refresh() inside fetchMetrics or dispatching metrics:invalidate from a listener.

**How to avoid:** Only dispatch metrics:invalidate from save handlers (after successful PATCH). Never dispatch from the listener itself. Never call router.refresh() in the metrics fetch logic.

**Warning signs:** Rapid flickering, network tab shows hundreds of requests, browser freezes.

### Pitfall 5: Overdue Calculation Timezone Issues

**What goes wrong:** Comparing task.due (YYYY-MM-DD) with new Date().toISOString() (includes time + timezone) causes off-by-one-day errors.

**Why it happens:** toISOString() returns UTC time. If user is in a different timezone, "today" might be different.

**How to avoid:** Extract just the date part from toISOString(): `new Date().toISOString().split('T')[0]`. This gives you YYYY-MM-DD in UTC, which is sufficient for date-only comparisons.

**Warning signs:** Tasks marked overdue one day early or late depending on user timezone.

**Example:**
```typescript
// WRONG — comparing date string to full ISO timestamp
const isOverdue = task.due && task.due < new Date().toISOString() // "2026-04-06" < "2026-04-06T15:30:00.000Z"

// CORRECT — compare date strings only
const today = new Date().toISOString().split('T')[0] // "2026-04-06"
const isOverdue = task.due && task.due < today && task.status !== 'done'
```

## Code Examples

Verified patterns from existing codebase and standard browser/React APIs.

### Custom Event Dispatch (Inline-Edit Components)

```typescript
// In ActionsTableClient.tsx, RisksTableClient.tsx, MilestonesTableClient.tsx
// Add after successful PATCH response
async function patchAction(id: number, patch: Record<string, unknown>) {
  const res = await fetch(`/api/actions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error('PATCH failed')

  router.refresh()

  // Notify metrics components
  window.dispatchEvent(new CustomEvent('metrics:invalidate'))
}
```

### Custom Event Listener (Metrics Components)

```typescript
// In OverviewMetrics.tsx and HealthDashboard.tsx
// Add second useEffect alongside existing fetch-on-mount
useEffect(() => {
  async function fetchMetrics() {
    try {
      const res = await fetch(`/api/projects/${projectId}/overview-metrics`)
      if (!res.ok) {
        setError(true)
        return
      }
      const metrics = await res.json()
      setData(metrics)
    } catch (err) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleInvalidate = () => {
    fetchMetrics()
  }

  window.addEventListener('metrics:invalidate', handleInvalidate)

  return () => {
    window.removeEventListener('metrics:invalidate', handleInvalidate)
  }
}, [projectId])
```

### Recharts Pie onClick for Drill-Down

```typescript
// In OverviewMetrics.tsx, update PieChart section
import { useRouter } from 'next/navigation'

export function OverviewMetrics({ projectId }: OverviewMetricsProps) {
  const router = useRouter()
  // ... existing state and fetch logic

  const handlePieClick = (data: any) => {
    const severity = data.severity
    router.push(`/customer/${projectId}/risks?severity=${severity}`)
  }

  return (
    // ... existing JSX
    <PieChart>
      <Pie
        data={riskChartData}
        dataKey="count"
        nameKey="severity"
        cx="50%"
        cy="50%"
        innerRadius={50}
        outerRadius={80}
        paddingAngle={2}
        onClick={handlePieClick}
        style={{ cursor: 'pointer' }}
      >
        {riskChartData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
      <Tooltip content={<RiskTooltip />} />
    </PieChart>
  )
}
```

### Query Param Filtering (Risks Page)

```typescript
// In RisksTableClient.tsx (add severity filter)
const searchParams = useSearchParams()
const severityFilter = searchParams.get('severity') ?? ''

const filteredRisks = useMemo(() => {
  let result = risks

  if (severityFilter) {
    result = result.filter(r => r.severity.toLowerCase() === severityFilter.toLowerCase())
  }

  // ... existing status, owner filters

  return result
}, [risks, severityFilter, /* other deps */])
```

### Bulk Status Mode (TaskBoard)

```typescript
// In TaskBoard.tsx BulkToolbar component
function BulkToolbar({ selectedIds, onClear, onComplete }: BulkToolbarProps) {
  const [mode, setMode] = useState<'owner' | 'due' | 'phase' | 'status' | null>(null)
  const [statusInput, setStatusInput] = useState<'todo' | 'in_progress' | 'blocked' | 'done'>('todo')

  async function bulkUpdate(patch: Record<string, string>) {
    await fetch('/api/tasks-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_ids: selectedIds, patch }),
    })
    setMode(null)
    onComplete()
  }

  return (
    <div className="...">
      {mode === null ? (
        <>
          <button onClick={() => setMode('owner')}>Reassign Owner</button>
          <button onClick={() => setMode('due')}>Change Due Date</button>
          <button onClick={() => setMode('phase')}>Move to Phase</button>
          <button onClick={() => setMode('status')}>Change Status</button>
        </>
      ) : mode === 'status' ? (
        <form onSubmit={(e) => { e.preventDefault(); bulkUpdate({ status: statusInput }) }}>
          <select value={statusInput} onChange={(e) => setStatusInput(e.target.value as any)}>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </select>
          <button type="submit">Apply</button>
          <button type="button" onClick={() => setMode(null)}>Cancel</button>
        </form>
      ) : /* other modes */}
    </div>
  )
}
```

### Overdue Visual Treatment

```typescript
// In TaskCard (TaskBoard.tsx) and PhaseCard (PhaseBoard.tsx)
function TaskCard({ task, projectId, selected, onSelect }: TaskCardProps) {
  const today = new Date().toISOString().split('T')[0]
  const isOverdue = task.due && task.due < today && task.status !== 'done'

  return (
    <div
      className={`bg-white border rounded-lg p-3 shadow-sm flex flex-col gap-1.5 ${
        isOverdue ? 'border-red-500 bg-red-50' : 'border-zinc-200'
      }`}
    >
      {/* card content */}
    </div>
  )
}
```

### Active Blockers List (HealthDashboard)

```typescript
// In HealthDashboard.tsx, replace blocker count with task list
// Add new fetch or extend existing overview-metrics API to include blocked tasks

interface BlockedTask {
  id: number
  title: string
}

// Fetch blocked tasks (extend overview-metrics endpoint or add new query)
const [blockedTasks, setBlockedTasks] = useState<BlockedTask[]>([])

useEffect(() => {
  async function fetchBlockedTasks() {
    const res = await fetch(`/api/projects/${projectId}/tasks?status=blocked`)
    if (res.ok) {
      const tasks = await res.json()
      setBlockedTasks(tasks)
    }
  }
  fetchBlockedTasks()
}, [projectId])

// Render list instead of count
<div>
  <p className="text-sm font-medium text-zinc-600 mb-2">Active Blockers:</p>
  {blockedTasks.length === 0 ? (
    <p className="text-sm text-zinc-400">No blocked tasks</p>
  ) : (
    <ul className="space-y-1">
      {blockedTasks.slice(0, 5).map(task => (
        <li key={task.id}>
          <Link
            href={`/customer/${projectId}/plan/tasks`}
            className="text-sm text-blue-600 hover:underline"
          >
            {task.title}
          </Link>
        </li>
      ))}
      {blockedTasks.length > 5 && (
        <li className="text-sm text-zinc-400">and {blockedTasks.length - 5} more...</li>
      )}
    </ul>
  )}
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual page refresh for metrics | Event-driven invalidation | This phase | Metrics update in-place without navigation |
| Static charts | Interactive drill-down charts | This phase | Users can click to filtered views |
| Dead bulk UI | Working bulk status update | This phase | Multi-select actually performs actions |

**Deprecated/outdated:**
- None — all patterns are current and stable (React 19, Next.js 16, Recharts 3.8.1)

## Open Questions

1. **Should HealthDashboard blocked tasks link to a filtered Task Board view or just the Task Board home page?**
   - What we know: CONTEXT.md specifies link target is `/customer/[id]/plan/tasks` (Task Board page, no filter)
   - What's unclear: Whether adding `?status=blocked` filter would be more useful
   - Recommendation: Follow CONTEXT.md (no filter) for Phase 39. Consider adding filter in future phase if user feedback requests it.

2. **Should PhaseBoard bulk toolbar minimum selection be 1+ or 2+ tasks?**
   - What we know: TaskBoard currently shows toolbar when 2+ selected (line 320: `selectedIds.length >= 2`)
   - What's unclear: Whether PhaseBoard should match that threshold or allow 1+
   - Recommendation: Match TaskBoard's 2+ threshold for consistency unless user feedback says otherwise.

3. **Should overdue styling be applied to PhaseCard in PhaseBoard?**
   - What we know: CONTEXT.md says "Plan tab boards surface overdue tasks visually" (plural boards)
   - What's unclear: PhaseBoard organizes by phase, not status — overdue tasks are mixed with on-time tasks in each column
   - Recommendation: Apply overdue styling to PhaseCard as well for consistency. If too noisy, can be adjusted in verification.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 with @testing-library/react 16.3.2 |
| Config file | vitest.config.ts (jsdom environment for UI tests) |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test -- --run --reporter=verbose` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SYNC-01 | Editing a Risk/Action/Milestone dispatches metrics:invalidate; OverviewMetrics and HealthDashboard re-fetch | unit | `npm test -- tests/sync/metrics-invalidate.test.tsx --run` | ❌ Wave 0 |
| SYNC-02 | Clicking risk chart segment navigates to `/customer/[id]/risks?severity=[severity]` | unit | `npm test -- tests/sync/chart-drill-down.test.tsx --run` | ❌ Wave 0 |
| SYNC-03 | HealthDashboard displays list of blocked tasks with links to Task Board | unit | `npm test -- tests/sync/active-blockers.test.tsx --run` | ❌ Wave 0 |
| PLAN-01 | TaskCard and PhaseCard render with red border/bg when task.due < today AND status != 'done' | unit | `npm test -- tests/plan/overdue-visual.test.tsx --run` | ❌ Wave 0 |
| PLAN-02 | BulkToolbar status mode updates task status via /api/tasks-bulk; PhaseBoard bulk toolbar updates phase statuses | unit | `npm test -- tests/plan/bulk-status.test.tsx --run` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --run` (run all tests, ~5-10s)
- **Per wave merge:** `npm test -- --run --reporter=verbose` (full suite with detailed output)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/sync/metrics-invalidate.test.tsx` — covers SYNC-01 (custom event dispatch + listener)
- [ ] `tests/sync/chart-drill-down.test.tsx` — covers SYNC-02 (Recharts onClick + router.push)
- [ ] `tests/sync/active-blockers.test.tsx` — covers SYNC-03 (blocked tasks query + link rendering)
- [ ] `tests/plan/overdue-visual.test.tsx` — covers PLAN-01 (date comparison + conditional className)
- [ ] `tests/plan/bulk-status.test.tsx` — covers PLAN-02 (BulkToolbar status mode + PhaseBulkToolbar)
- [ ] `tests/setup-jest-dom.ts` — already exists (shared test setup)

## Sources

### Primary (HIGH confidence)
- Next.js 16.2.0 documentation (useRouter, useSearchParams) — official Next.js docs
- React 19.2.4 documentation (useEffect, useState, event listeners) — official React docs
- Recharts 3.8.1 documentation (PieChart onClick prop) — official Recharts docs
- Existing codebase (TaskBoard BulkToolbar, OverviewMetrics, HealthDashboard) — verified implementations

### Secondary (MEDIUM confidence)
- MDN Web Docs (CustomEvent API, addEventListener/removeEventListener) — standard browser APIs
- Vitest documentation (jsdom environment, component testing) — official Vitest docs

### Tertiary (LOW confidence)
- None — all findings based on official documentation and existing codebase patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all packages already installed and in use
- Architecture: HIGH - patterns verified in existing codebase (BulkToolbar, useEffect listeners, Recharts)
- Pitfalls: HIGH - common React/event listener pitfalls are well-documented (stale closures, memory leaks)
- Custom events: HIGH - standard browser API, well-understood cleanup, no library dependencies
- Recharts onClick: HIGH - verified in Recharts 3.8.1 docs and existing PieChart usage

**Research date:** 2026-04-06
**Valid until:** 60 days (stable patterns, mature libraries, no fast-moving APIs)
