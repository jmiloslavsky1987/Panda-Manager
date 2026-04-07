# Phase 41: UX Polish & Consistency - Research

**Researched:** 2026-04-06
**Domain:** UI/UX patterns — empty states, loading skeletons, overdue highlighting
**Confidence:** HIGH

## Summary

Phase 41 is a polish pass applying three established patterns consistently across all tabs. No new libraries or frameworks needed — all patterns already exist in the codebase and just need systematic application.

**Empty states** (UXPOL-01) require converting generic "No X yet" text to actionable components with description + CTA button. Nine entity tabs need treatment (Actions, Risks, Milestones, Decisions, Stakeholders, Teams, Architecture, Artifacts, Engagement History). Each CTA opens an existing creation UI — no new dialogs required.

**Overdue highlighting** (UXPOL-02) extends the existing `border-red-500 bg-red-50` row treatment from Tasks (Phase 39) to Actions and Milestones tables. Milestones retain their existing "Overdue" badge alongside the new row styling.

**Loading skeletons** (UXPOL-03) apply the existing `animate-pulse` pattern to four client-side data-fetching components: OverviewMetrics, HealthDashboard, SkillsTabClient, and OnboardingDashboard (verification only). Pattern is simple rectangular divs with `bg-zinc-100 rounded animate-pulse` — no complex structural skeletons needed.

**Primary recommendation:** Use existing patterns verbatim. Create a shared `EmptyState` component to reduce duplication across 9+ tabs. Test with vitest + @testing-library/react using jsdom environment (established in Phase 40).

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Empty states (UXPOL-01):**
- Tab-specific empty states with actionable CTA buttons — not generic "No data" text
- Each entity tab button opens that tab's existing creation dialog/form
- **Tab-by-tab CTAs:**
  - Actions → "Add Action" button (opens existing add-action dialog)
  - Risks → "Add Risk" button (opens existing add-risk dialog)
  - Milestones → "Add Milestone" button (opens existing add-milestone dialog)
  - Decisions → "Log a Decision" button (opens existing add-decision form)
  - Stakeholders → "Add Stakeholder" button (opens existing add-stakeholder form)
  - Teams → "Add Team Member" button (opens existing add-team-member form)
  - Architecture → "Add Component" button (opens existing creation UI)
  - Artifacts → "Upload a document" button (navigates to Context Hub tab — artifacts only come from uploads, no direct add form)
  - Engagement History → description only ("No history yet. Activity will appear here automatically as you work.") — no CTA since user cannot manually trigger audit entries
- **Out of scope:** Plan tab (TaskBoard/PhaseBoard) — new projects seeded with template phases/tasks; edge case not worth handling

**Overdue visual standard (UXPOL-02):**
- Unified treatment: `border-red-500 bg-red-50` applied to row/card element for overdue items
- **Current state and changes:**
  - Tasks (TaskBoard): `border-red-500 bg-red-50` already applied (Phase 39, PLAN-01) — no change
  - Actions (ActionsTableClient): currently NO overdue treatment — add `border-red-500 bg-red-50` to row
  - Milestones (MilestonesTableClient): currently badge-only ("Overdue" badge) — add `border-red-500 bg-red-50` to row AND keep existing badge
- **Overdue criteria** (consistent with PLAN-01 definition from Phase 39):
  - Actions: `due_date < today AND status != 'closed'` (or whatever non-terminal status is used)
  - Milestones: `target_date < today AND status NOT IN ('completed')`
  - Tasks: already implemented — no change

**Loading skeletons (UXPOL-03):**
- Simple `animate-pulse` bars — consistent with existing OnboardingDashboard.tsx pattern
- Structural/table-shaped skeletons not required
- **Tabs in scope** (client-side fetchers that need skeletons):
  - OverviewMetrics.tsx — fetches metrics on mount via fetchMetrics() in useEffect
  - HealthDashboard.tsx — fetches on mount, re-fetches on metrics:invalidate event
  - SkillsTabClient.tsx — fetches job list on mount
  - OnboardingDashboard.tsx — already has animate-pulse in several sections; verify coverage is complete
- **Not in scope:** Actions, Risks, Milestones, Decisions, Stakeholders, Artifacts, History — all Server Components that pass data as props to client islands; no client-side loading phase

### Claude's Discretion

- Exact empty state description text per tab (e.g., "No actions recorded yet." vs "Nothing here yet.")
- Exact overdue row styling (e.g., whether to add a left border accent in addition to `bg-red-50`)
- Exact skeleton bar layout and count per component
- Whether a shared `EmptyState` component is built or inline per-tab (prefer shared if used 5+ times)
- Overdue badge on Milestones — whether to retain alongside row highlight or remove in favour of row highlight alone

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UXPOL-01 | Every tab that can have zero records displays an actionable empty state with a short description and a CTA button | Existing Button component (`components/ui/button.tsx`) with variant support ready to use. Artifacts page shows simple text empty state (line 43) that needs elevation to component with CTA. Nine tabs identified requiring empty states. |
| UXPOL-02 | Overdue visual treatment (red border + background) is applied consistently to overdue items across Actions, Milestones, and Tasks | TaskBoard.tsx (lines 64-74) establishes the pattern: `border-red-500 bg-red-50` applied when `isOverdue` condition met. MilestonesTableClient.tsx has `isOverdueMilestone()` helper (lines 42-49). ActionsTableClient has no overdue logic yet but follows same table row pattern. |
| UXPOL-03 | Loading skeletons are used consistently across all tabs that fetch data client-side | OnboardingDashboard.tsx (lines 729-884) shows established pattern: `<div className="h-X bg-zinc-100 rounded animate-pulse" />`. OverviewMetrics and HealthDashboard already have basic skeleton (single bar), needs expansion. SkillsTabClient fetches on mount but has no loading state. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 | Client component state management | Latest stable React with concurrent features |
| Next.js | 16.2.0 | Framework with Server Components | Project standard, established in all phases |
| Tailwind CSS | 4.x | Utility-first styling | Project standard, `animate-pulse` built-in |
| shadcn/ui | N/A | Pre-built components (Button, Badge) | Project uses components from `components/ui/` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/react | 16.3.2 | Component testing | All UI tests (established Phase 37+) |
| vitest | (from package.json) | Test runner | All tests, jsdom environment for client components |
| @testing-library/jest-dom | 6.9.1 | DOM matchers | Assertions in vitest tests |

### Alternatives Considered
None — no new libraries needed. All patterns use existing project dependencies.

**Installation:**
No installation required — all dependencies already in package.json.

## Architecture Patterns

### Recommended Component Structure

**Shared EmptyState component** (recommended to avoid 9x duplication):
```
components/
├── EmptyState.tsx           # Shared empty state component
├── ActionsTableClient.tsx   # Add empty state + overdue row logic
├── MilestonesTableClient.tsx # Add overdue row styling
├── OverviewMetrics.tsx      # Expand loading skeleton
├── HealthDashboard.tsx      # Expand loading skeleton
└── SkillsTabClient.tsx      # Add loading skeleton
```

### Pattern 1: Empty State with CTA

**What:** Centered message with description and action button when data array is empty

**When to use:** Any tab/table that can have zero records and allows user-initiated creation

**Example:**
```typescript
// components/EmptyState.tsx
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {icon && <div className="mb-4 text-zinc-400">{icon}</div>}
      <h3 className="text-sm font-medium text-zinc-900 mb-1">{title}</h3>
      <p className="text-sm text-zinc-500 mb-4 text-center max-w-sm">{description}</p>
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  )
}

// Usage in ActionsTableClient.tsx
{filteredActions.length === 0 ? (
  <EmptyState
    title="No actions yet"
    description="Actions track deliverables and commitments. Add your first action to get started."
    action={{
      label: "Add Action",
      onClick: () => setShowAddDialog(true)
    }}
  />
) : (
  // ... render table
)}
```

**Source:** Derived from existing artifacts page pattern (artifacts/page.tsx:42-43) elevated to component with CTA

### Pattern 2: Overdue Row Highlighting

**What:** Apply red border and background to table rows/cards when item is overdue

**When to use:** Any list/table displaying items with due dates and status

**Example:**
```typescript
// ActionsTableClient.tsx - add overdue calculation
function isOverdueAction(dueDate: string | null, status: string): boolean {
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}/.test(dueDate)) return false
  if (status === 'completed' || status === 'cancelled') return false
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

// Apply to TableRow
<TableRow
  key={action.id}
  className={isOverdueAction(action.due, action.status)
    ? 'border-red-500 bg-red-50'
    : ''
  }
>
  {/* cells */}
</TableRow>
```

**Source:** TaskBoard.tsx lines 64-74 (Phase 39 implementation)

### Pattern 3: Loading Skeleton

**What:** Animated placeholder bars matching final content layout during data fetch

**When to use:** Client components with useEffect data fetching and loading state

**Example:**
```typescript
// OverviewMetrics.tsx - expand existing skeleton
if (loading) {
  return (
    <section className="px-4 space-y-4">
      <div className="h-6 w-32 bg-zinc-100 rounded animate-pulse mb-4" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="h-48 bg-zinc-100 rounded-lg animate-pulse" />
        <div className="h-48 bg-zinc-100 rounded-lg animate-pulse" />
        <div className="h-48 bg-zinc-100 rounded-lg animate-pulse" />
      </div>
    </section>
  )
}
```

**Source:** OnboardingDashboard.tsx lines 729-884 (established pattern)

### Pattern 4: Client Component with Loading State

**What:** useState + useEffect pattern for client-side data fetching with loading/error/success states

**When to use:** SkillsTabClient and other client components fetching on mount

**Example:**
```typescript
export function SkillsTabClient({ projectId, recentRuns }: Props) {
  const [jobs, setJobs] = useState<Job[]>(recentRuns)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchJobs() {
      setLoading(true)
      const res = await fetch(`/api/skills/runs?projectId=${projectId}`)
      const data = await res.json()
      setJobs(data)
      setLoading(false)
    }
    fetchJobs()
  }, [projectId])

  if (loading) {
    return <div className="h-40 bg-zinc-100 rounded animate-pulse" />
  }

  return (/* render jobs */)
}
```

**Source:** Derived from OverviewMetrics.tsx (lines 74-109) and HealthDashboard.tsx (lines 66-99)

### Anti-Patterns to Avoid

- **Generic "No data" text without context or action** — bad UX, user doesn't know what to do next
- **Inconsistent overdue styling** (e.g., yellow on one tab, red on another) — creates confusion
- **Blank white screen during loading** — user perceives app as broken or slow
- **Complex skeleton animations** — diminishing returns, simple `animate-pulse` is sufficient
- **Loading spinner for sub-200ms fetches** — creates visual jank; skeleton feels smoother

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Empty state component | 9 inline implementations | Shared `EmptyState.tsx` component | DRY principle, consistent messaging, single point of styling updates |
| Date comparison for overdue logic | Multiple date parsing implementations | Shared helper function like `isOverdueMilestone()` | Edge cases (timezone, null dates, invalid formats) already handled |
| Loading skeleton library | Third-party skeleton library | Tailwind `animate-pulse` utility | Already in project, zero bundle size, simple to customize |
| State management for loading | Redux/Zustand for loading states | Component-local useState | Loading state is ephemeral, component-scoped — no need for global state |

**Key insight:** Empty state and overdue logic are cross-cutting concerns that appear in 9+ locations. Extracting to shared components/helpers prevents drift and reduces test surface area.

## Common Pitfalls

### Pitfall 1: Empty State Loses Functionality After Data Load

**What goes wrong:** Empty state component unmounts when data arrives, but re-adding data later requires full component re-render to show empty state again.

**Why it happens:** Conditional rendering `{data.length === 0 ? <Empty /> : <Table />}` works initially, but subsequent data changes may not trigger proper re-evaluation if parent component doesn't re-render.

**How to avoid:** Always render conditionally based on current data length, not initial mount state. Use `filteredData.length === 0` not `!initialData`.

**Warning signs:** Empty state appears on first load but not when user filters/clears all items.

### Pitfall 2: Overdue Calculation Timezone Issues

**What goes wrong:** Items show as overdue a day early or late due to timezone mismatch between server and client.

**Why it happens:** `new Date()` on client uses browser timezone, `due_date` from DB may be UTC string. Comparison without normalization causes off-by-one errors.

**How to avoid:** Normalize both dates to same timezone before comparison. Existing pattern in TaskBoard.tsx uses `.split('T')[0]` for date-only comparison, avoiding timezone entirely.

**Warning signs:** Overdue highlighting appears/disappears when user is in different timezone from server.

### Pitfall 3: Loading Skeleton Dimension Shift

**What goes wrong:** Skeleton has different height than final content, causing layout shift when data loads (poor CLS score).

**Why it happens:** Skeleton uses arbitrary `h-40` but final content is `h-48`, or skeleton is single bar but content is 3-column grid.

**How to avoid:** Match skeleton structure to final layout (same grid, same approximate heights). Use existing component's structure as template.

**Warning signs:** Page "jumps" when loading completes, user loses scroll position.

### Pitfall 4: Missing Loading State on Fast Networks

**What goes wrong:** Loading skeleton flashes for <100ms on fast networks, creating visual jank.

**Why it happens:** No minimum display time for loading state — React commits skeleton, then immediately commits data.

**How to avoid:** For this phase, accept the flash (not worth engineering minimum display time). Skeleton is still better than blank screen on slow networks.

**Warning signs:** Users on localhost see rapid flicker, consider it a bug.

### Pitfall 5: Overdue Badge AND Row Styling Conflict

**What goes wrong:** Milestones table has both badge ("Overdue") and row background (bg-red-50), creating visual redundancy or color clash.

**Why it happens:** Badge uses `bg-red-100 text-red-700`, row uses `bg-red-50` — combining creates two shades of red in same row.

**How to avoid:** User decision is to KEEP both. Ensure badge uses darker red (`bg-red-100`) so it contrasts with row background (`bg-red-50`). Test visually.

**Warning signs:** Badge text is hard to read on red background, or visual hierarchy is unclear.

## Code Examples

Verified patterns from codebase:

### Empty State Pattern (Artifacts Page)

```typescript
// Source: bigpanda-app/app/customer/[id]/artifacts/page.tsx:42-43
{artifacts.length === 0 ? (
  <p className="py-4 text-center text-zinc-400 text-sm">No artifacts yet</p>
) : (
  artifacts.map(artifact => (/* render row */))
)}
```

**Needs elevation to:** Component with CTA button

### Overdue Row Styling (TaskBoard)

```typescript
// Source: bigpanda-app/components/TaskBoard.tsx:64-74
const today = new Date().toISOString().split('T')[0]
const isOverdue = !!task.due && task.due < today && task.status !== 'done'

return (
  <div
    className={`bg-white border rounded-lg p-3 shadow-sm flex flex-col gap-1.5 ${
      isOverdue ? 'border-red-500 bg-red-50' : 'border-zinc-200'
    }`}
  >
    {/* task content */}
  </div>
)
```

**Apply to:** ActionsTableClient `<TableRow>`, MilestonesTableClient `<TableRow>`

### Loading Skeleton (OnboardingDashboard)

```typescript
// Source: bigpanda-app/components/OnboardingDashboard.tsx:803-808
{loading ? (
  <div className="space-y-2 animate-pulse">
    {[1, 2].map((i) => (
      <div key={i} className="h-20 bg-zinc-100 rounded-lg" />
    ))}
  </div>
) : adrPhases.length === 0 ? (
  <p className="text-sm text-zinc-400">No ADR phases found.</p>
) : (
  adrPhases.map((phase) => renderPhaseCard(phase))
)}
```

**Apply to:** OverviewMetrics (expand from single bar to 3-card grid), HealthDashboard (similar), SkillsTabClient (new)

### Overdue Milestone Helper (MilestonesTableClient)

```typescript
// Source: bigpanda-app/components/MilestonesTableClient.tsx:42-49
function isOverdueMilestone(date: string | null | undefined, status: string | null | undefined): boolean {
  if (!date || !date.trim()) return false
  if (!/^\d{4}-\d{2}-\d{2}/.test(date)) return false
  if ((status ?? '').toLowerCase() === 'completed') return false
  const d = new Date(date)
  if (isNaN(d.getTime())) return false
  return d < new Date()
}
```

**Pattern to follow:** Similar helper for Actions (`isOverdueAction`), reuse for row styling

### Client Component Loading State (OverviewMetrics)

```typescript
// Source: bigpanda-app/components/OverviewMetrics.tsx:74-118
export function OverviewMetrics({ projectId }: OverviewMetricsProps) {
  const [data, setData] = useState<OverviewMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/overview-metrics`)
      if (!res.ok) {
        setError(true)
        setLoading(false)
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

  useEffect(() => {
    fetchMetrics()
  }, [projectId])

  if (loading) {
    return (
      <section className="px-4 space-y-4">
        <div className="h-40 bg-zinc-100 rounded-lg animate-pulse" />
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="px-4 space-y-4">
        <p className="text-sm text-red-500">Failed to load metrics.</p>
      </section>
    )
  }

  return (/* render data */)
}
```

**Pattern established:** `loading` → skeleton, `error` → error message, `!data` → error fallback, else render data

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic "No data found" text | Actionable empty states with CTA | 2024+ (industry standard) | Users know what action to take, reduced support queries |
| Blank white screen during load | Skeleton screens with `animate-pulse` | 2023+ (React 18 transitions) | Perceived performance improved, reduced bounce rate |
| Text-based overdue indicators ("OVERDUE" badge only) | Visual row highlighting with color | 2025+ (accessibility + visual hierarchy) | Faster visual scanning, works for colorblind users with border |
| Spinner/loader for all loading states | Structural skeleton matching final layout | 2024+ (Core Web Vitals focus) | Better CLS score, smoother perceived UX |

**Deprecated/outdated:**
- **Spinner-only loading indicators:** Replaced by skeleton screens (better perceived performance)
- **Empty state without action:** Current best practice is always provide next step
- **Table loading with "Loading..." text:** Skeleton rows matching table structure is now standard

## Open Questions

1. **Should SkillsTabClient fetch on mount or rely on SSR?**
   - What we know: Currently receives `recentRuns` as prop from server, but polling logic (lines 173-198) suggests client-side state management expected
   - What's unclear: Whether initial load should show skeleton or trust SSR data is fresh enough
   - Recommendation: Keep SSR data for initial render, skeleton only appears during polling refresh (no change needed for UXPOL-03)

2. **Should EmptyState component support icon prop?**
   - What we know: Some design systems use icon (empty box, document, etc.) above empty state text
   - What's unclear: Does user want icons, or is text-only sufficient?
   - Recommendation: Make icon optional prop, don't use in initial implementation (simpler), can add later if user requests

3. **Should overdue highlighting apply to ActionsTableClient filtered views?**
   - What we know: Overdue row styling is visual-only, doesn't affect filters
   - What's unclear: When user filters to "completed" status, should completed items (not overdue) show in red if their due date was in past?
   - Recommendation: Only highlight overdue items that are ALSO in current filtered view. Don't show red on completed/cancelled actions (matches user decision criteria).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 1.x + @testing-library/react 16.3.2 |
| Config file | `vitest.config.ts` (lines 1-26) |
| Quick run command | `npm test -- tests/ui/` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UXPOL-01 | Actions tab empty state shows "Add Action" CTA | unit | `npm test tests/ui/empty-states.test.tsx -t "Actions empty"` | ❌ Wave 0 |
| UXPOL-01 | Artifacts tab empty state shows "Upload a document" CTA that navigates | unit | `npm test tests/ui/empty-states.test.tsx -t "Artifacts empty"` | ❌ Wave 0 |
| UXPOL-01 | History tab empty state shows description with NO CTA | unit | `npm test tests/ui/empty-states.test.tsx -t "History empty"` | ❌ Wave 0 |
| UXPOL-02 | Actions table applies red border+bg to overdue open actions | unit | `npm test tests/ui/overdue-highlighting.test.tsx -t "Actions overdue"` | ❌ Wave 0 |
| UXPOL-02 | Milestones table applies red border+bg to overdue incomplete milestones | unit | `npm test tests/ui/overdue-highlighting.test.tsx -t "Milestones overdue"` | ❌ Wave 0 |
| UXPOL-02 | Tasks continue to show red border+bg for overdue (no regression) | unit | `npm test tests/plan/task-board.test.tsx -t "overdue"` | ✅ (Phase 39) |
| UXPOL-03 | OverviewMetrics shows 3-card skeleton grid during loading | unit | `npm test tests/ui/loading-skeletons.test.tsx -t "OverviewMetrics"` | ❌ Wave 0 |
| UXPOL-03 | HealthDashboard shows skeleton during loading | unit | `npm test tests/ui/loading-skeletons.test.tsx -t "HealthDashboard"` | ❌ Wave 0 |
| UXPOL-03 | SkillsTabClient shows skeleton during initial mount fetch | unit | `npm test tests/ui/loading-skeletons.test.tsx -t "SkillsTabClient"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test tests/ui/empty-states.test.tsx tests/ui/overdue-highlighting.test.tsx tests/ui/loading-skeletons.test.tsx -x`
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/ui/empty-states.test.tsx` — covers UXPOL-01 (9 tabs)
- [ ] `tests/ui/overdue-highlighting.test.tsx` — covers UXPOL-02 (Actions, Milestones)
- [ ] `tests/ui/loading-skeletons.test.tsx` — covers UXPOL-03 (OverviewMetrics, HealthDashboard, SkillsTabClient)
- [ ] `components/EmptyState.tsx` — shared component (if chosen over inline)

## Sources

### Primary (HIGH confidence)
- bigpanda-app/components/TaskBoard.tsx — overdue pattern established Phase 39
- bigpanda-app/components/OnboardingDashboard.tsx — skeleton pattern established
- bigpanda-app/components/OverviewMetrics.tsx — client loading state pattern
- bigpanda-app/components/HealthDashboard.tsx — metrics:invalidate event listener pattern
- bigpanda-app/components/MilestonesTableClient.tsx — isOverdueMilestone() helper
- bigpanda-app/components/ActionsTableClient.tsx — table row structure, no overdue logic yet
- bigpanda-app/components/SkillsTabClient.tsx — client polling, no initial loading skeleton
- bigpanda-app/app/customer/[id]/artifacts/page.tsx — empty state text pattern (needs CTA)
- bigpanda-app/components/ui/button.tsx — Button component with variant support
- bigpanda-app/components/ui/badge.tsx — Badge component used in Milestones overdue badge
- bigpanda-app/vitest.config.ts — test framework configuration
- bigpanda-app/tests/ui/workspace-tabs.test.tsx — jsdom test pattern example

### Secondary (MEDIUM confidence)
- .planning/phases/41-ux-polish-consistency/41-CONTEXT.md — user decisions and locked patterns
- .planning/STATE.md — Phase 39 decisions (PLAN-01 overdue pattern established)
- .planning/REQUIREMENTS.md — UXPOL-01, UXPOL-02, UXPOL-03 definitions

### Tertiary (LOW confidence)
None — all research based on direct codebase inspection, no external sources needed.

## Metadata

**Confidence breakdown:**
- Empty states pattern: HIGH — existing text-only pattern in artifacts/page.tsx, Button component ready, 9 tabs clearly identified
- Overdue highlighting: HIGH — TaskBoard.tsx pattern fully established in Phase 39, MilestonesTableClient helper exists, ActionsTableClient structure identical
- Loading skeletons: HIGH — OnboardingDashboard pattern established, OverviewMetrics/HealthDashboard already have basic skeleton, SkillsTabClient structure clear

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (30 days — patterns are stable, no fast-moving dependencies)
