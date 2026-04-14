# Phase 49: Portfolio Dashboard - Research

**Researched:** 2026-04-08
**Domain:** Next.js 16 Server Components, PostgreSQL aggregation queries, client-side filtering
**Confidence:** HIGH

## Summary

Phase 49 replaces the current multi-widget dashboard (`app/page.tsx`) with a portfolio-level view optimized for managing 20+ projects. The new dashboard consists of three sections: health summary stat chips (replacing HealthCards), a filterable multi-project table with 12 standardized columns, and an exceptions panel surfacing anomalies. The architecture follows established patterns from ActionsTableClient and RisksTableClient: Server Component fetches all data in one query, Client Component filters in-memory via URL params.

The core technical challenge is query performance at scale. The existing `getDashboardData()` pattern suffers from N+1 queries (fetch all projects, then loop with per-project sub-queries). Phase 49 replaces this with a single `getPortfolioData()` function using `Promise.all()` for parallel per-project queries after initial project fetch — this is the Phase 34 established pattern noted in STATE.md.

**Primary recommendation:** Use single batch project fetch followed by `Promise.all()` for parallel sub-queries (milestones, workstreams, onboarding_phases, blocked tasks). Reuse existing `computeHealth()` function. Client-side filtering via URL params + `useMemo()`. No new libraries required — all dependencies already in stack.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Page architecture**
- The existing `app/page.tsx` dashboard is replaced in full — all existing widgets removed
- New page layout (top to bottom): summary chips → filterable portfolio table → exceptions panel
- No separate `/portfolio` route — the main `/` page is the portfolio dashboard

**Health summary (DASH-01 + DASH-02)**
- Summary displayed as stat chips: **On Track** (green), **At Risk** (yellow), **Off Track** (red), **Blocked** (orange)
- Each chip shows the count of projects in that state
- Additional chips: total active projects, overdue milestones count
- No Recharts chart component — chips only (fast render, zero extra dependency)

**Portfolio table columns (DASH-03)**
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

**Filtering and search (DASH-04)**
- Filter controls in a **collapsible filter panel** (toggle button to show/hide)
- Text search always visible in the table header (not inside the panel)
- Filter dimensions inside panel: Status, Owner (text match), Track, Phase, Risk Level, Dependency, Milestone Date range
- Client-side filtering via URL params — same pattern as ActionsTableClient / RisksTableClient

**Exceptions panel (DASH-05)**
- Positioned **below the portfolio table**
- Exception types (all five):
  1. Overdue milestones — milestone target date < today and status ≠ 'completed'
  2. Stale updates — project `updated_at` > 14 days ago
  3. Open blockers — any task with non-null `blocked_by` and status ≠ 'completed'
  4. Missing ownership — no ADR workstream with a non-null lead
  5. Unresolved dependencies — same signal as open blockers (surfaces at project level)
- Each exception row shows: project name (linked to workspace) + exception type badge + brief description
- Severity ordering: open blockers first, then overdue milestones, then missing ownership, then stale, then dependencies

**Drill-down (DASH-06)**
- Clicking any portfolio table row navigates to `/customer/[id]` (existing project workspace)
- Entire row is clickable — same as `SidebarProjectItem` navigation pattern

**Query performance**
- Single `getPortfolioData()` query function: fetches all active projects, then uses `Promise.all()` with per-project parallel sub-queries (milestones, workstreams, onboarding_phases, tasks with blocked_by)
- No N+1 loop — all projects fetched first, then parallel per-project queries
- Target: <500ms at 20+ projects

### Claude's Discretion
- Exact column widths and truncation behavior in the table
- Filter panel toggle button placement (above table right, or inline with search)
- Empty state for the table (no active projects)
- Loading skeleton structure
- Exact chip color classes and icon choice for Exec Flag

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | User can view portfolio-level health summary showing total active projects, on track / at risk / off track counts, overdue milestones, and blocked project count | Stat chip UI pattern (Card component). Health derived from existing `computeHealth()`. Blocked count from tasks.blocked_by FK check. |
| DASH-02 | User can view a visual status distribution rollup (chart or heatmap) on the portfolio dashboard | CONTEXT decision: chips only (no Recharts chart). Health state counts aggregated from project array in client component. |
| DASH-03 | User can view a multi-project portfolio table with standardized columns: name, owner, team, phase, health status, % complete, next milestone, next milestone date, risk level, dependency status, last updated, and exec action flag | Server query fetches all columns. Owner from workstreams.lead, Team from distinct track values, Phase from onboarding_phases, % from avg(workstreams.percent_complete), Milestone from date-sorted milestones, Risk from computeHealth highRisks, Dependency from tasks.blocked_by. All derivations specified in CONTEXT.md. |
| DASH-04 | User can filter, sort, and search the portfolio table by status, owner, team, phase, priority, milestone date, risk level, and dependency state | Client-side filtering pattern established in ActionsTableClient/RisksTableClient. URL params via useSearchParams. useMemo for filter computation. Collapsible filter panel for dimensions. |
| DASH-05 | User can view an exceptions panel that surfaces projects with overdue milestones, stale updates, open blockers, missing ownership, or unresolved dependencies | Exception detection logic runs in getPortfolioData per-project. Milestone overdue check (target < today), Stale check (updated_at > 14 days), Blocked check (tasks.blocked_by not null), Missing owner check (no ADR lead), Dependencies same as blockers. Severity-ordered display. |
| DASH-06 | User can drill down from a portfolio table row into the individual project workspace | Row-click navigation to `/customer/[id]` using Next.js Link + router. Pattern already established in SidebarProjectItem (href='/customer/${project.id}/overview'). |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.0 | App Router, Server Components, routing | Already project foundation. Server Components eliminate client JS for data fetch. |
| Drizzle ORM | 0.45.1 | Type-safe PostgreSQL queries | Project ORM. All query functions use Drizzle select/where/join builders. |
| PostgreSQL | (via postgres 3.4.8 driver) | Relational database | Project database. All project/workstream/milestone/task data lives here. |
| React | 19.2.4 | UI rendering | Next.js dependency. Client Components for interactive filtering. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.577.0 | Icon library | Already in stack. Use for Exec Flag icon, filter toggle icon, exception badges. |
| @radix-ui/react-checkbox | 1.3.3 | Checkbox primitive | Already used in ActionsTableClient for multi-select (not needed for Phase 49 — no bulk actions). |
| clsx / tailwind-merge | 2.1.1 / 3.5.0 | Conditional class utilities | Already in stack for dynamic health color classes. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side filtering | Server-side pagination API | Client approach simpler at 20-50 project scale. Server pagination adds complexity (cursor/offset, cache invalidation) without performance gain until 100+ projects. |
| Promise.all() per-project | Single JOIN mega-query | Promise.all() cleaner for nullable relationships (milestones, phases). JOIN approach risks cartesian explosion with multiple one-to-many relations (workstreams × milestones × tasks). |
| Stat chips | Recharts chart | CONTEXT decision: chips only. Zero extra library, faster render, clearer counts. |

**Installation:**
```bash
# No new dependencies required — all libraries already in package.json
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── page.tsx                            # Server Component - fetches getPortfolioData(), renders layout
components/
├── PortfolioTableClient.tsx            # Client island - filtering, search, row navigation
├── PortfolioSummaryChips.tsx           # Client/Server - stat chip display
├── PortfolioExceptionsPanel.tsx        # Server Component - exceptions list with links
lib/
├── queries.ts                          # Add getPortfolioData() function
```

### Pattern 1: Server Component Data Fetch + Client Island Filtering

**What:** Server Component at route level fetches full dataset via async function. Passes data as props to Client Component. Client Component filters in-memory based on URL params.

**When to use:** Data size manageable in memory (20-50 projects = ~10-20KB JSON). User expects instant filter response (no server round-trip).

**Example:**
```typescript
// app/page.tsx (Server Component)
import { getPortfolioData } from '@/lib/queries'
import { PortfolioTableClient } from '@/components/PortfolioTableClient'

export default async function PortfolioDashboard() {
  const portfolioData = await getPortfolioData()

  return (
    <div className="p-6 space-y-8">
      <PortfolioSummaryChips projects={portfolioData} />
      <PortfolioTableClient projects={portfolioData} />
      <PortfolioExceptionsPanel projects={portfolioData} />
    </div>
  )
}

// components/PortfolioTableClient.tsx (Client Component)
'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useMemo, useCallback } from 'react'

export function PortfolioTableClient({ projects }) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const statusFilter = searchParams.get('status') ?? ''
  const ownerFilter = searchParams.get('owner') ?? ''

  const filteredProjects = useMemo(() => {
    let result = projects
    if (statusFilter) result = result.filter(p => p.health === statusFilter)
    if (ownerFilter) result = result.filter(p => p.owner?.includes(ownerFilter))
    return result
  }, [projects, statusFilter, ownerFilter])

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  return (
    <div>
      {/* Filter controls */}
      <input
        placeholder="Search projects..."
        onChange={e => updateParam('q', e.target.value)}
      />

      {/* Table */}
      <table>
        {filteredProjects.map(project => (
          <tr key={project.id} onClick={() => router.push(`/customer/${project.id}`)}>
            <td>{project.name}</td>
            <td>{project.owner}</td>
            {/* ... */}
          </tr>
        ))}
      </table>
    </div>
  )
}
```

**Source:** Established pattern in ActionsTableClient.tsx (lines 30-89) and RisksTableClient.tsx (lines 69-141)

### Pattern 2: Parallel Sub-Query with Promise.all()

**What:** Fetch all parent records first. Then run per-parent sub-queries in parallel using `Promise.all()`. Avoids N+1 sequential queries.

**When to use:** One-to-many relationships where sub-query is fast (<10ms) and independent across parents. Preferred over complex JOINs when multiple one-to-many relations exist (avoids cartesian explosion).

**Example:**
```typescript
// lib/queries.ts
export async function getPortfolioData(): Promise<PortfolioProject[]> {
  // Step 1: Fetch all active projects (single query)
  const projects = await db
    .select()
    .from(projects)
    .where(eq(projects.status, 'active'))

  // Step 2: Parallel per-project enrichment
  const enriched = await Promise.all(
    projects.map(async (project) => {
      // Run all per-project queries in parallel
      const [milestones, workstreams, phases, blockedTasks, healthData] = await Promise.all([
        db.select().from(milestones).where(eq(milestones.project_id, project.id)),
        db.select().from(workstreams).where(eq(workstreams.project_id, project.id)),
        db.select().from(onboarding_phases).where(eq(onboarding_phases.project_id, project.id)),
        db.select().from(tasks).where(
          and(
            eq(tasks.project_id, project.id),
            sql`${tasks.blocked_by} IS NOT NULL`,
            ne(tasks.status, 'completed')
          )
        ),
        computeHealth(project.id), // Already exists, reuse
      ])

      // Derive columns per CONTEXT.md specification
      const owner = workstreams.find(w => w.track === 'ADR' && w.lead)?.lead ?? null
      const teamTrack = [...new Set(workstreams.map(w => w.track).filter(Boolean))].join(' + ')
      const currentPhase = phases.find(p => p.status !== 'completed') ?? phases[phases.length - 1]
      const avgComplete = workstreams.filter(w => w.percent_complete != null)
        .reduce((sum, w) => sum + w.percent_complete!, 0) / workstreams.length || null
      const nextMilestone = milestones
        .filter(m => m.date >= today && m.status !== 'completed')
        .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
      const dependencyStatus = blockedTasks.length > 0 ? 'Blocked' : 'Clear'
      const riskLevel = healthData.highRisks === 0 ? 'None' : healthData.highRisks <= 2 ? 'Medium' : 'High'

      return {
        ...project,
        owner,
        teamTrack,
        phase: currentPhase?.name ?? null,
        percentComplete: avgComplete,
        nextMilestone: nextMilestone?.name ?? null,
        nextMilestoneDate: nextMilestone?.date ?? null,
        health: healthData.health,
        riskLevel,
        dependencyStatus,
      }
    })
  )

  return enriched
}
```

**Source:** STATE.md Phase 34 pattern reference. ActionsTableClient pattern (server fetch all, client filter).

### Pattern 3: Collapsible Filter Panel with URL Param Sync

**What:** Filter controls hidden behind toggle button. URL params store filter state (enables bookmarking, back button). `useSearchParams` + `useCallback` for updates. `useMemo` recomputes filtered data only when params or source data change.

**When to use:** Multiple filter dimensions (5+) that clutter header. User expects shareable filtered views.

**Example:**
```typescript
'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export function PortfolioTableClient({ projects }) {
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  const statusFilter = searchParams.get('status') ?? ''
  const ownerFilter = searchParams.get('owner') ?? ''
  const trackFilter = searchParams.get('track') ?? ''
  const phaseFilter = searchParams.get('phase') ?? ''
  const riskFilter = searchParams.get('risk') ?? ''
  const depFilter = searchParams.get('dep') ?? ''

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <input
          placeholder="Search projects..."
          value={searchParams.get('q') ?? ''}
          onChange={e => updateParam('q', e.target.value)}
          className="flex-1"
        />
        <button onClick={() => setFilterPanelOpen(!filterPanelOpen)}>
          Filters {filterPanelOpen ? '▲' : '▼'}
        </button>
      </div>

      {filterPanelOpen && (
        <div className="border rounded p-4 mb-4 flex flex-wrap gap-3">
          <select value={statusFilter} onChange={e => updateParam('status', e.target.value)}>
            <option value="">All Status</option>
            <option value="green">On Track</option>
            <option value="yellow">At Risk</option>
            <option value="red">Off Track</option>
          </select>

          <input
            placeholder="Owner name..."
            value={ownerFilter}
            onChange={e => updateParam('owner', e.target.value)}
          />

          <select value={trackFilter} onChange={e => updateParam('track', e.target.value)}>
            <option value="">All Tracks</option>
            <option value="ADR">ADR</option>
            <option value="Biggy">Biggy</option>
          </select>

          {/* More filters... */}
        </div>
      )}

      {/* Table */}
    </div>
  )
}
```

**Source:** RisksTableClient.tsx filter bar pattern (lines 233-298). ActionsTableClient.tsx filter bar (lines 189-250).

### Anti-Patterns to Avoid

- **N+1 Query Loop:** Fetching projects, then looping with `for (const p of projects) { await getDetails(p.id) }` — this serializes queries. Use `Promise.all()` instead.
- **Cartesian Explosion JOIN:** `SELECT * FROM projects LEFT JOIN workstreams ON ... LEFT JOIN milestones ON ...` when both are one-to-many — produces N×M rows. Use separate queries or JSON aggregation.
- **Client State for Filter Params:** Storing filter state in `useState()` breaks URL sharing and back button. Always use `useSearchParams()`.
- **Recomputing Health Score:** `computeHealth()` already exists and is used in `getActiveProjects()`. Don't reimplement — reuse.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Health status computation | Custom health score logic per project | Existing `computeHealth()` function in lib/queries.ts (lines 190-275) | Already accounts for overdue actions, stalled milestones, high risks, workstream progress. Well-tested formula (score >= 2 → red, score === 1 → yellow, else green). Handles null values, date parsing edge cases. |
| Client-side filtering state | Custom filter state manager | Next.js `useSearchParams()` + `useRouter()` + `useMemo()` | URL params enable bookmarking, back button, shareable links. useMemo prevents unnecessary recomputation. Pattern established in ActionsTableClient/RisksTableClient. |
| Table column sorting | Custom sort state + sort functions | Start with health/risk pre-sort, defer interactive sort to future phase | Sorting 12 columns × 2 directions = 24 sort functions. Phase 49 requirements don't mandate interactive sort — DASH-04 specifies filter + search. Pre-sort by health descending (red first) sufficient for v1. |
| Row click navigation | onClick with imperative router.push() | Next.js Link component wrapping entire row | Link provides accessibility (keyboard nav, right-click context menu), prefetching, and cleaner semantics. SidebarProjectItem pattern (lines 19-22). |
| Date comparison for "stale" | Manual date arithmetic | `new Date().toISOString().split('T')[0]` for today, direct string comparison | ISO date strings (YYYY-MM-DD) compare lexicographically. Pattern used in computeHealth (line 197) and ActionsTableClient (line 158). |

**Key insight:** The existing codebase has solved all core domain problems. Phase 49 is composition, not invention. Reuse `computeHealth()`, follow ActionsTableClient filter pattern, use SidebarProjectItem navigation pattern.

## Common Pitfalls

### Pitfall 1: N+1 Query Performance Degradation at Scale

**What goes wrong:** Fetching all projects, then running per-project queries sequentially: `for (const p of projects) { const milestones = await getMilestones(p.id); ... }`. At 20 projects × 4 sub-queries, this is 80 sequential round-trips to PostgreSQL (~800ms if 10ms/query).

**Why it happens:** Intuitive loop pattern. Developer doesn't recognize it as N+1 because there's only one loop (vs. ORM nested loops).

**How to avoid:** Fetch projects first, then `Promise.all()` for parallel per-project enrichment. Example: `await Promise.all(projects.map(async p => { const [milestones, workstreams, ...] = await Promise.all([getMilestones(p.id), getWorkstreams(p.id), ...]); return enrichProject(p, milestones, workstreams); }))`. This parallelizes all sub-queries across all projects — typically 10-20x faster than sequential loop.

**Warning signs:** Query time scales linearly with project count (20 projects = 2x time of 10 projects). Database connection pool exhaustion warnings. Multiple `await` calls inside a loop over fetched data.

### Pitfall 2: Null/Undefined Derivation Errors in Column Computation

**What goes wrong:** Portfolio table displays "[object Object]" or throws "Cannot read property 'name' of undefined" because column derivation assumes data always exists. Example: `project.phases[0].name` when `phases` array is empty, or `workstreams.find(...).lead` when no ADR workstream exists.

**Why it happens:** Phase 49 aggregates data from 6+ tables (projects, workstreams, milestones, onboarding_phases, tasks, health). Any table can be empty for a given project (new project, no milestones, no team assigned). Derivation logic must handle all null cases.

**How to avoid:** Use optional chaining (`?.`) and nullish coalescing (`??`) throughout. Examples:
- Owner: `workstreams.find(w => w.track === 'ADR' && w.lead)?.lead ?? null`
- Phase: `phases.find(p => p.status !== 'completed') ?? phases[phases.length - 1] ?? null`, then `phase?.name ?? 'Not started'`
- % Complete: Check length before averaging: `const avg = withPercent.length > 0 ? withPercent.reduce(...) / withPercent.length : null`
- Next Milestone: Filter before sorting: `milestones.filter(m => m.date >= today && m.status !== 'completed').sort(...)[0] ?? null`

**Warning signs:** TypeScript errors about "possibly undefined" during development. Runtime errors in logs with stack traces in derivation code. Empty cells displaying "undefined" or "[object Object]" in table.

### Pitfall 3: Client-Side Filter State Desync from URL Params

**What goes wrong:** User applies filters, refreshes page, filters reset. Or user shares URL, recipient doesn't see filtered view. Or back button doesn't restore previous filter state.

**Why it happens:** Filter values stored in `useState()` instead of URL params. React state is ephemeral — lost on unmount. URL params are durable.

**How to avoid:** Always use `useSearchParams()` as source of truth. Read param values: `const statusFilter = searchParams.get('status') ?? ''`. Update via router: `const params = new URLSearchParams(searchParams.toString()); params.set('status', value); router.push(\`?\${params.toString()}\`, { scroll: false })`. Never use `useState()` for filter values.

**Warning signs:** Filters reset on page refresh. URL doesn't update when filters change. User says "I can't share a filtered view."

### Pitfall 4: Cartesian Explosion with Multi-Join Query

**What goes wrong:** Attempting to fetch all portfolio data with a single JOIN query: `SELECT * FROM projects LEFT JOIN workstreams ON ... LEFT JOIN milestones ON ... LEFT JOIN tasks ON ...`. Query returns 1000+ rows for 20 projects because each project with 3 workstreams × 5 milestones × 10 tasks produces 150 rows. PostgreSQL transfers massive result set, then application must dedupe/aggregate.

**Why it happens:** Desire for "one query" efficiency. Misunderstanding of JOIN behavior with multiple one-to-many relations.

**How to avoid:** Use separate queries for one-to-many relations. Fetch projects first (20 rows), then per-project sub-queries in parallel via `Promise.all()`. Total rows transferred: 20 projects + (20 × avg 10 rows per sub-query × 4 sub-queries) = ~820 rows, all distinct. Cleaner than deduplicating 1000+ rows.

**Warning signs:** Query returns far more rows than project count. Slow network transfer time (seconds). Need to write complex deduplication logic. TypeScript types don't match query result structure (array of arrays vs. expected flat objects).

### Pitfall 5: Overdue Milestone Detection with Invalid Date Strings

**What goes wrong:** Exception panel shows false positives — milestones with date = 'TBD' or 'Q3 2026' flagged as overdue because string comparison `'TBD' < '2026-04-08'` evaluates true in JavaScript.

**Why it happens:** Milestone `date` field is TEXT (allows 'TBD', 'Q3 2026', null). Direct string comparison without format validation.

**How to avoid:** Filter for valid ISO dates before comparison. Pattern from `computeHealth()` (lines 209-210): `sql\`length(\${milestones.date}) >= 10 AND \${milestones.date} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'\`` or client-side: `if (!milestone.date || !/^\d{4}-\d{2}-\d{2}/.test(milestone.date)) return false`. Only compare dates that match YYYY-MM-DD format.

**Warning signs:** Exception panel shows milestones with 'TBD' as overdue. QA finds false positives. Date comparison logic doesn't check format first.

## Code Examples

Verified patterns from existing codebase:

### Parallel Per-Project Enrichment Query

```typescript
// lib/queries.ts - Add this function
export async function getPortfolioData(): Promise<PortfolioProject[]> {
  const today = new Date().toISOString().split('T')[0]

  // Step 1: Fetch all active projects
  const activeProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.status, 'active'))

  // Step 2: Parallel per-project enrichment
  const enriched = await Promise.all(
    activeProjects.map(async (project) => {
      // All per-project queries run in parallel
      const [milestones, workstreams, phases, blockedTasks, healthData] = await Promise.all([
        db.select().from(milestones).where(eq(milestones.project_id, project.id)),
        db.select().from(workstreams).where(eq(workstreams.project_id, project.id)),
        db.select().from(onboardingPhases).where(eq(onboardingPhases.project_id, project.id)),
        db.select().from(tasks).where(
          and(
            eq(tasks.project_id, project.id),
            sql`${tasks.blocked_by} IS NOT NULL`,
            ne(tasks.status, 'completed')
          )
        ),
        computeHealth(project.id), // Reuse existing function
      ])

      // Column derivations per CONTEXT.md
      const owner = workstreams.find(w => w.track === 'ADR' && w.lead)?.lead ?? null
      const tracks = [...new Set(workstreams.map(w => w.track).filter(Boolean))]
      const teamTrack = tracks.length > 0 ? tracks.join(' + ') : null

      const currentPhase = phases.find(p => p.status !== 'completed') ?? phases[phases.length - 1]

      const withPercent = workstreams.filter(w => w.percent_complete != null)
      const avgComplete = withPercent.length > 0
        ? Math.round(withPercent.reduce((sum, w) => sum + w.percent_complete!, 0) / withPercent.length)
        : null

      const upcomingMilestones = milestones.filter(m =>
        m.date && /^\d{4}-\d{2}-\d{2}/.test(m.date) && m.date >= today && m.status !== 'completed'
      ).sort((a, b) => a.date!.localeCompare(b.date!))
      const nextMilestone = upcomingMilestones[0] ?? null

      const dependencyStatus = blockedTasks.length > 0 ? 'Blocked' : 'Clear'

      const riskLevel = healthData.highRisks === 0 ? 'None'
        : healthData.highRisks <= 2 ? 'Medium'
        : 'High'

      // Exception detection for panel
      const exceptions: Array<{ type: string; description: string; severity: number }> = []

      // Open blockers (severity 0 - highest)
      if (blockedTasks.length > 0) {
        exceptions.push({
          type: 'Open Blockers',
          description: `${blockedTasks.length} blocked task${blockedTasks.length > 1 ? 's' : ''}`,
          severity: 0,
        })
      }

      // Overdue milestones (severity 1)
      const overdueMilestones = milestones.filter(m =>
        m.date && /^\d{4}-\d{2}-\d{2}/.test(m.date) && m.date < today && m.status !== 'completed'
      )
      if (overdueMilestones.length > 0) {
        exceptions.push({
          type: 'Overdue Milestones',
          description: `${overdueMilestones.length} milestone${overdueMilestones.length > 1 ? 's' : ''} overdue`,
          severity: 1,
        })
      }

      // Missing ownership (severity 2)
      const hasADRLead = workstreams.some(w => w.track === 'ADR' && w.lead)
      if (!hasADRLead) {
        exceptions.push({
          type: 'Missing Ownership',
          description: 'No ADR lead assigned',
          severity: 2,
        })
      }

      // Stale updates (severity 3)
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
      if (project.updated_at < fourteenDaysAgo) {
        exceptions.push({
          type: 'Stale Update',
          description: `Last updated ${Math.floor((Date.now() - project.updated_at.getTime()) / (1000 * 60 * 60 * 24))} days ago`,
          severity: 3,
        })
      }

      // Unresolved dependencies (severity 4 - same as blockers, lower display priority)
      if (blockedTasks.length > 0) {
        exceptions.push({
          type: 'Unresolved Dependencies',
          description: `${blockedTasks.length} dependency blocker${blockedTasks.length > 1 ? 's' : ''}`,
          severity: 4,
        })
      }

      return {
        id: project.id,
        name: project.name,
        customer: project.customer,
        owner,
        teamTrack,
        phase: currentPhase?.name ?? 'Not started',
        health: healthData.health,
        percentComplete: avgComplete,
        nextMilestone: nextMilestone?.name ?? null,
        nextMilestoneDate: nextMilestone?.date ?? null,
        riskLevel,
        dependencyStatus,
        lastUpdated: project.updated_at,
        execFlag: project.exec_action_required,
        exceptions: exceptions.sort((a, b) => a.severity - b.severity),
      }
    })
  )

  return enriched
}
```

**Source:** Composite pattern. `Promise.all()` from STATE.md Phase 34. `computeHealth()` from lib/queries.ts lines 190-275. Column derivation spec from CONTEXT.md lines 30-42.

### Client-Side Filtering with URL Params

```typescript
// components/PortfolioTableClient.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useCallback, useState } from 'react'
import type { PortfolioProject } from '@/lib/queries'

export function PortfolioTableClient({ projects }: { projects: PortfolioProject[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)

  // Read filters from URL
  const q = searchParams.get('q') ?? ''
  const statusFilter = searchParams.get('status') ?? ''
  const ownerFilter = searchParams.get('owner') ?? ''
  const trackFilter = searchParams.get('track') ?? ''
  const phaseFilter = searchParams.get('phase') ?? ''
  const riskFilter = searchParams.get('risk') ?? ''
  const depFilter = searchParams.get('dep') ?? ''

  // Update URL param helper
  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  // Filter projects in-memory
  const filteredProjects = useMemo(() => {
    let result = projects

    // Text search on name/customer
    if (q) {
      const lowerQ = q.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(lowerQ) ||
        p.customer.toLowerCase().includes(lowerQ)
      )
    }

    // Health status filter
    if (statusFilter) {
      result = result.filter(p => p.health === statusFilter)
    }

    // Owner filter (partial match)
    if (ownerFilter) {
      result = result.filter(p => p.owner?.toLowerCase().includes(ownerFilter.toLowerCase()))
    }

    // Track filter (partial match for combined tracks like "ADR + Biggy")
    if (trackFilter) {
      result = result.filter(p => p.teamTrack?.includes(trackFilter))
    }

    // Phase filter
    if (phaseFilter) {
      result = result.filter(p => p.phase === phaseFilter)
    }

    // Risk level filter
    if (riskFilter) {
      result = result.filter(p => p.riskLevel === riskFilter)
    }

    // Dependency filter
    if (depFilter) {
      result = result.filter(p => p.dependencyStatus === depFilter)
    }

    return result
  }, [projects, q, statusFilter, ownerFilter, trackFilter, phaseFilter, riskFilter, depFilter])

  return (
    <div className="space-y-4">
      {/* Search + Filter Toggle */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search projects..."
          value={q}
          onChange={e => updateParam('q', e.target.value)}
          className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
        <button
          onClick={() => setFilterPanelOpen(!filterPanelOpen)}
          className="px-4 py-2 border rounded text-sm font-medium hover:bg-zinc-50"
        >
          Filters {filterPanelOpen ? '▲' : '▼'}
        </button>
      </div>

      {/* Collapsible Filter Panel */}
      {filterPanelOpen && (
        <div className="border rounded p-4 flex flex-wrap gap-3 bg-zinc-50">
          <select value={statusFilter} onChange={e => updateParam('status', e.target.value)} className="border rounded px-2 py-1.5 text-sm">
            <option value="">All Status</option>
            <option value="green">On Track</option>
            <option value="yellow">At Risk</option>
            <option value="red">Off Track</option>
          </select>

          <input
            placeholder="Owner name..."
            value={ownerFilter}
            onChange={e => updateParam('owner', e.target.value)}
            className="border rounded px-2 py-1.5 text-sm w-40"
          />

          <select value={trackFilter} onChange={e => updateParam('track', e.target.value)} className="border rounded px-2 py-1.5 text-sm">
            <option value="">All Tracks</option>
            <option value="ADR">ADR</option>
            <option value="Biggy">Biggy</option>
          </select>

          <select value={riskFilter} onChange={e => updateParam('risk', e.target.value)} className="border rounded px-2 py-1.5 text-sm">
            <option value="">All Risk Levels</option>
            <option value="None">None</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>

          <select value={depFilter} onChange={e => updateParam('dep', e.target.value)} className="border rounded px-2 py-1.5 text-sm">
            <option value="">All Dependencies</option>
            <option value="Clear">Clear</option>
            <option value="Blocked">Blocked</option>
          </select>

          {(statusFilter || ownerFilter || trackFilter || phaseFilter || riskFilter || depFilter) && (
            <button
              onClick={() => {
                updateParam('status', '')
                updateParam('owner', '')
                updateParam('track', '')
                updateParam('phase', '')
                updateParam('risk', '')
                updateParam('dep', '')
              }}
              className="text-sm text-zinc-600 hover:text-zinc-800 underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-zinc-500">
        Showing {filteredProjects.length} of {projects.length} projects
      </p>

      {/* Table */}
      <div className="border rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Owner</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Team/Track</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Phase</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Health</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">% Complete</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Next Milestone</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Milestone Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Risk Level</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Dependency</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Last Updated</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-zinc-700">Exec</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-zinc-500 text-sm">
                  No projects found.
                </td>
              </tr>
            ) : (
              filteredProjects.map(project => (
                <tr
                  key={project.id}
                  onClick={() => router.push(`/customer/${project.id}`)}
                  className="border-b hover:bg-zinc-50 cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm font-medium text-zinc-900">{project.customer}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{project.owner || '—'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{project.teamTrack || '—'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{project.phase}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                      project.health === 'green' ? 'bg-green-100 text-green-800' :
                      project.health === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {project.health === 'green' ? 'On Track' : project.health === 'yellow' ? 'At Risk' : 'Off Track'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{project.percentComplete != null ? `${project.percentComplete}%` : '—'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600 max-w-xs truncate">{project.nextMilestone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{project.nextMilestoneDate || '—'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{project.riskLevel}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{project.dependencyStatus}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{project.lastUpdated.toISOString().split('T')[0]}</td>
                  <td className="px-4 py-3 text-center">
                    {project.execFlag && <span className="text-red-600 font-bold">⚑</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

**Source:** ActionsTableClient.tsx (lines 30-89 URL param pattern, lines 189-250 filter bar). RisksTableClient.tsx (lines 69-141 useMemo filtering). SidebarProjectItem.tsx (lines 19-22 row navigation pattern).

### Health Summary Chips Component

```typescript
// components/PortfolioSummaryChips.tsx
import type { PortfolioProject } from '@/lib/queries'

export function PortfolioSummaryChips({ projects }: { projects: PortfolioProject[] }) {
  const totalActive = projects.length
  const onTrack = projects.filter(p => p.health === 'green').length
  const atRisk = projects.filter(p => p.health === 'yellow').length
  const offTrack = projects.filter(p => p.health === 'red').length
  const blocked = projects.filter(p => p.dependencyStatus === 'Blocked').length

  const today = new Date().toISOString().split('T')[0]
  const overdueMilestones = projects.reduce((count, p) => {
    return count + p.exceptions.filter(e => e.type === 'Overdue Milestones').length
  }, 0)

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <div className="border rounded p-4 bg-white">
        <p className="text-sm text-zinc-600 mb-1">Active Projects</p>
        <p className="text-3xl font-semibold text-zinc-900">{totalActive}</p>
      </div>

      <div className="border rounded p-4 bg-green-50 border-green-200">
        <p className="text-sm text-green-700 mb-1">On Track</p>
        <p className="text-3xl font-semibold text-green-800">{onTrack}</p>
      </div>

      <div className="border rounded p-4 bg-yellow-50 border-yellow-200">
        <p className="text-sm text-yellow-700 mb-1">At Risk</p>
        <p className="text-3xl font-semibold text-yellow-800">{atRisk}</p>
      </div>

      <div className="border rounded p-4 bg-red-50 border-red-200">
        <p className="text-sm text-red-700 mb-1">Off Track</p>
        <p className="text-3xl font-semibold text-red-800">{offTrack}</p>
      </div>

      <div className="border rounded p-4 bg-orange-50 border-orange-200">
        <p className="text-sm text-orange-700 mb-1">Blocked</p>
        <p className="text-3xl font-semibold text-orange-800">{blocked}</p>
      </div>

      <div className="border rounded p-4 bg-zinc-50 border-zinc-200">
        <p className="text-sm text-zinc-700 mb-1">Overdue Milestones</p>
        <p className="text-3xl font-semibold text-zinc-900">{overdueMilestones}</p>
      </div>
    </div>
  )
}
```

**Source:** Card component from components/ui/card.tsx. Health color classes from HealthCard.tsx (lines 9-16 ragConfig). CONTEXT.md stat chip spec (lines 22-26).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | vitest.config.ts |
| Quick run command | `npm test -- portfolio` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Portfolio health summary displays total active, on track, at risk, off track, blocked counts | unit | `npm test -- tests/portfolio/summary-chips.test.ts -x` | ❌ Wave 0 |
| DASH-02 | Visual status distribution (chips) aggregates project health states | unit | `npm test -- tests/portfolio/summary-chips.test.ts::status-distribution -x` | ❌ Wave 0 |
| DASH-03 | Portfolio table displays all 12 columns with correct derivations | unit | `npm test -- tests/portfolio/table-columns.test.ts -x` | ❌ Wave 0 |
| DASH-04 | Client-side filtering works for status, owner, track, phase, risk, dependency | unit | `npm test -- tests/portfolio/filtering.test.ts -x` | ❌ Wave 0 |
| DASH-05 | Exceptions panel detects and displays all 5 exception types | unit | `npm test -- tests/portfolio/exceptions.test.ts -x` | ❌ Wave 0 |
| DASH-06 | Row click navigates to project workspace | unit | `npm test -- tests/portfolio/navigation.test.ts -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- portfolio -x` (fail-fast on portfolio tests only)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/portfolio/summary-chips.test.ts` — covers DASH-01, DASH-02 (chip rendering, count aggregation)
- [ ] `tests/portfolio/table-columns.test.ts` — covers DASH-03 (all 12 column derivations, null handling)
- [ ] `tests/portfolio/filtering.test.ts` — covers DASH-04 (URL param filtering, useMemo computation)
- [ ] `tests/portfolio/exceptions.test.ts` — covers DASH-05 (all 5 exception types detection, severity ordering)
- [ ] `tests/portfolio/navigation.test.ts` — covers DASH-06 (row click → router.push call)
- [ ] `tests/portfolio/query-performance.test.ts` — validates Promise.all() parallelization, <500ms target at 20+ projects

## Sources

### Primary (HIGH confidence)
- bigpanda-app codebase — lib/queries.ts (computeHealth function lines 190-275, getActiveProjects pattern lines 276-295)
- bigpanda-app codebase — components/ActionsTableClient.tsx (client-side filtering pattern lines 30-89, 189-250)
- bigpanda-app codebase — components/RisksTableClient.tsx (filter bar pattern lines 233-298)
- bigpanda-app codebase — components/SidebarProjectItem.tsx (row navigation pattern lines 19-22)
- bigpanda-app codebase — db/schema.ts (projects, workstreams, milestones, tasks, onboarding_phases table structures)
- .planning/phases/49-portfolio-dashboard/49-CONTEXT.md — all locked implementation decisions

### Secondary (MEDIUM confidence)
- Next.js 16 official docs — Server Components data fetching (async function in Server Component)
- React 19 official docs — useSearchParams, useRouter, useMemo hooks

### Tertiary (LOW confidence)
- None — all research based on existing codebase patterns and official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in package.json, no new dependencies required
- Architecture: HIGH - follows established ActionsTableClient/RisksTableClient patterns from Phase 44
- Pitfalls: HIGH - all derived from existing codebase edge cases (computeHealth null handling, date validation patterns)

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (30 days - stable stack, no fast-moving dependencies)
