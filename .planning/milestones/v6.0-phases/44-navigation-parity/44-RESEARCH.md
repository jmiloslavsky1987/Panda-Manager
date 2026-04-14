# Phase 44: Navigation & Parity - Research

**Researched:** 2026-04-08
**Domain:** Next.js App Router navigation restructuring, client-side table filtering, bulk API endpoints
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Plan sub-tab landing**
- Plan tab shows Phase Board content directly at `/plan` — board content merged from `plan/board/page.tsx` into `plan/page.tsx`
- SprintSummaryPanel stays on the Plan page (moves from plan layout into plan/page.tsx)
- Plan layout (`plan/layout.tsx`) is dissolved — PlanTabs inner nav removed entirely
- `/plan/board` redirects to `/plan`

**WBS placeholder**
- WBS Delivery sub-tab created in Phase 44 as a placeholder route at `/customer/[id]/wbs`
- Placeholder shows a "coming soon" / empty state — Phase 45 fills in WBS content
- Navigation is structurally complete after Phase 44; no broken nav state between phases

**Delivery sub-tab order**
- Final order: **Plan | WBS | Task Board | Gantt | Actions | Risks | Milestones | Decisions**
- Planning cluster (WBS, Task Board, Gantt) follows Plan; execution cluster (Actions, Risks, Milestones, Decisions) after
- Delivery top-level tab defaults to **Plan** when clicked (Plan is first sub-tab)

**URL redirects (old routes)**
- `/plan/board` → `/plan`
- `/plan/tasks` → `/tasks` (new Delivery sub-tab segment)
- `/plan/gantt` → `/gantt` (new Delivery sub-tab segment)
- `/plan/swimlane` → `/plan` (Swimlane removed)
- Intel tab params (`?tab=intel`) fall back to Overview naturally — no extra redirect handling needed
- Task Board and Gantt routes: promoted to top-level segments (`/customer/[id]/tasks`, `/customer/[id]/gantt`) rather than staying under `/plan/`

**Risks filtering (RISK-01)**
- Filter dimensions: status, severity, owner, date range
- Date range filters on `identified_date` (when risk was logged) — maps to `created_at` in schema
- All risk statuses always visible — no "hide resolved" toggle; user filters by status dropdown
- Client-side filtering via URL params (same pattern as ActionsTableClient: `useSearchParams` + `useMemo`)

**Risks bulk actions (RISK-02)**
- Status-only bulk update — matches Actions bulk pattern exactly
- Bulk bar: floating bar when rows selected, status dropdown + "X selected" count + Clear button
- Uses `/api/risks/bulk-update` endpoint (new — modeled after `/api/actions/bulk-update`)

**Milestones filtering (MILE-01)**
- Filter dimensions: status, owner, date range
- Date range filters on `target` date (planned completion date)
- Incomplete milestones shown first, then completed — existing sort order preserved after filtering
- Client-side filtering via URL params (same pattern as ActionsTableClient)

**Milestones bulk actions (MILE-02)**
- Status-only bulk update — matches Actions/Risks bulk pattern
- Bulk bar: same pattern as Risks (floating, status dropdown, count, clear)
- Uses `/api/milestones/bulk-update` endpoint (new)

### Claude's Discretion
- Exact placeholder content for the WBS route (empty state message)
- Filter bar UI layout (inline above table vs collapsible panel — match ActionsTableClient's inline pattern)
- Whether to extract a shared BulkBar or FilterBar component if the duplication is worth abstracting

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NAV-01 | Delivery tab shows Plan as first sub-tab; old Intel and Phase Board URLs redirect to new locations (no broken links) | `plan/layout.tsx` dissolved, `plan/page.tsx` rewritten, redirects in `plan/board/page.tsx` + `plan/swimlane/page.tsx` |
| NAV-02 | WBS, Task Board, and Gantt are promoted to direct sub-tabs of Delivery at the same level as Plan, Actions, Risks, and Milestones | New routes `customer/[id]/tasks/`, `customer/[id]/gantt/`, `customer/[id]/wbs/`; TAB_GROUPS updated |
| NAV-03 | Swimlane view is removed from the application | `plan/swimlane/page.tsx` replaced with redirect; SwimlaneView component left in place (no deletion needed) |
| NAV-04 | Decisions sub-tab is moved from the Intel tab into the Delivery tab | TAB_GROUPS: remove Decisions from Intel children, add to Delivery children |
| NAV-05 | Intel tab is removed; Engagement History sub-tab is moved to the Admin tab | TAB_GROUPS: remove Intel group entirely, add `history` child to Admin group |
| RISK-01 | User can filter the Risks table by multiple dimensions (status, severity, owner, date range) | RisksTableClient already has `severityFilter` + partial URL-param pattern; extend to full 4-dimension filter bar matching ActionsTableClient |
| RISK-02 | User can multi-select risks and apply bulk status updates | New `selectedIds: Set<number>` state + floating bulk bar + `/api/risks/bulk-update` endpoint |
| MILE-01 | User can filter the Milestones table by multiple dimensions (status, owner, date range) | MilestonesTableClient has sort logic but no URL-param filtering; add full filter bar matching ActionsTableClient |
| MILE-02 | User can multi-select milestones and apply bulk status updates | New `selectedIds: Set<number>` state + floating bulk bar + `/api/milestones/bulk-update` endpoint |
</phase_requirements>

---

## Summary

Phase 44 is a purely structural and UI parity change — no new database tables, no new AI features, no schema migrations. The work divides cleanly into two areas: (1) navigation restructuring through `WorkspaceTabs.tsx` TAB_GROUPS and route-file reorganisation, and (2) extending `RisksTableClient` and `MilestonesTableClient` to match the filtering and bulk-action capabilities already working in `ActionsTableClient`.

The codebase is highly consistent and the patterns are already fully established. `ActionsTableClient.tsx` is the reference implementation: `useSearchParams` + `useMemo` for client-side filtering, `Set<number>` for multi-select state, a floating bulk bar when rows are selected, and a POST to `/api/{entity}/bulk-update`. The risks table already has partial URL-param support (`severityFilter` from `searchParams.get('severity')`), so it only needs to be extended to the full filter-bar pattern. The milestones table needs filter-bar work from scratch (client-side, no new API calls for filter changes).

**Primary recommendation:** Follow ActionsTableClient as the single reference implementation for both RisksTableClient and MilestonesTableClient upgrades. For navigation, edit only TAB_GROUPS in WorkspaceTabs.tsx and create/move the minimum set of route files.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16 (Turbopack) | File-system routing, Server Components, `redirect()` | Project stack; all routes are `.tsx` files under `app/` |
| `next/navigation` `redirect` | Built-in | Hard redirects from old route files | Used throughout codebase for route redirects |
| `useSearchParams` | Built-in | Read URL filter params in client components | Established project pattern (ActionsTableClient) |
| `useRouter` | Built-in | Push URL param updates without page reload | Established project pattern — `router.push(?${params})` |
| `useMemo` | React built-in | In-memory client-side filtering | Established pattern — server passes full data, client filters |
| Zod | In use | Validate bulk-update POST body | Used in all existing API routes |
| Drizzle ORM `inArray` | In use | Bulk update WHERE id IN (...) | Used in `/api/actions/bulk-update/route.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@/components/ui/table` | Shadcn UI | Table primitives | All table components use this |
| `@/components/ui/checkbox` | Shadcn UI | Row selection checkbox | Used in ActionsTableClient — use for Risks + Milestones |
| `@/components/InlineSelectCell` | Internal | Inline status/severity dropdowns | Already used in both table clients |
| `@/components/OwnerCell` | Internal | Inline owner editing | Already used in both table clients |
| `@/components/EmptyState` | Internal | Empty state display | Already used in both table clients |

**Installation:** No new packages required — all libraries already in `bigpanda-app/package.json`.

---

## Architecture Patterns

### Recommended Project Structure (changes only)

```
app/customer/[id]/
├── plan/
│   ├── layout.tsx            # DISSOLVE: remove PlanTabs, SprintSummaryPanel
│   ├── page.tsx              # REWRITE: merge board content + SprintSummaryPanel
│   ├── board/page.tsx        # REPLACE: redirect → /customer/${id}/plan
│   ├── tasks/page.tsx        # REPLACE: redirect → /customer/${id}/tasks
│   ├── gantt/page.tsx        # REPLACE: redirect → /customer/${id}/gantt
│   └── swimlane/page.tsx     # REPLACE: redirect → /customer/${id}/plan
├── wbs/
│   └── page.tsx              # NEW: placeholder "coming soon"
├── tasks/
│   └── page.tsx              # NEW: move content from plan/tasks/page.tsx
└── gantt/
    └── page.tsx              # NEW: move content from plan/gantt/page.tsx

components/
├── WorkspaceTabs.tsx         # EDIT: TAB_GROUPS only
├── RisksTableClient.tsx      # REWRITE: add full filter bar + multi-select
└── MilestonesTableClient.tsx # REWRITE: add full filter bar + multi-select

app/api/
├── risks/bulk-update/
│   └── route.ts              # NEW: modeled after actions/bulk-update/route.ts
└── milestones/bulk-update/
    └── route.ts              # NEW: modeled after actions/bulk-update/route.ts
```

### Pattern 1: TAB_GROUPS Navigation Restructure

**What:** Single-file change to `WorkspaceTabs.tsx` `TAB_GROUPS` array drives all top-level navigation and sub-tab bar changes.

**When to use:** Any navigation change in the workspace — only edit `TAB_GROUPS`, never SubTabBar.tsx.

**Target TAB_GROUPS state:**
```typescript
// Source: /bigpanda-app/components/WorkspaceTabs.tsx (current state, showing changes)
export const TAB_GROUPS: TabGroup[] = [
  { id: 'overview', label: 'Overview', standalone: true },
  {
    id: 'delivery',
    label: 'Delivery',
    children: [
      { id: 'plan',        label: 'Plan',       segment: 'plan' },        // MOVED to first
      { id: 'wbs',         label: 'WBS',        segment: 'wbs' },         // NEW
      { id: 'tasks',       label: 'Task Board', segment: 'tasks' },       // PROMOTED
      { id: 'gantt',       label: 'Gantt',      segment: 'gantt' },       // PROMOTED
      { id: 'actions',     label: 'Actions',    segment: 'actions' },
      { id: 'risks',       label: 'Risks',      segment: 'risks' },
      { id: 'milestones',  label: 'Milestones', segment: 'milestones' },
      { id: 'decisions',   label: 'Decisions',  segment: 'decisions' },   // MOVED from Intel
    ],
  },
  {
    id: 'team',
    label: 'Team',
    children: [
      { id: 'teams',        label: 'Teams',        segment: 'teams' },
      { id: 'architecture', label: 'Architecture', segment: 'architecture' },
      { id: 'stakeholders', label: 'Stakeholders', segment: 'stakeholders' },
    ],
  },
  // Intel group REMOVED entirely
  { id: 'skills',  label: 'Skills',  standalone: true },
  { id: 'chat',    label: 'Chat',    standalone: true },
  { id: 'context', label: 'Context', standalone: true },
  {
    id: 'admin',
    label: 'Admin',
    children: [
      { id: 'artifacts', label: 'Artifacts',          segment: 'artifacts' },
      { id: 'queue',     label: 'Review Queue',       segment: 'queue' },
      { id: 'history',   label: 'Engagement History', segment: 'history' }, // MOVED from Intel
    ],
  },
]
```

### Pattern 2: Next.js App Router Redirect from Old Route Files

**What:** Replace old route file content with a `redirect()` call. The file stays; its content becomes a redirect.

**When to use:** Any existing route that must redirect to a new URL (NAV-01 old URLs).

```typescript
// Source: Next.js App Router docs / established project pattern
// app/customer/[id]/plan/board/page.tsx (AFTER)
import { redirect } from 'next/navigation'

export default async function PlanBoardRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/customer/${id}/plan`)
}
```

The same pattern applies to `plan/tasks/page.tsx` → `/customer/${id}/tasks`, `plan/gantt/page.tsx` → `/customer/${id}/gantt`, `plan/swimlane/page.tsx` → `/customer/${id}/plan`.

### Pattern 3: Dissolving plan/layout.tsx

**What:** The `plan/layout.tsx` currently wraps children in `PlanTabs` + `SprintSummaryPanel`. When dissolved, the layout file must be replaced with a pass-through, and `plan/page.tsx` absorbs both the SprintSummaryPanel and the board content.

**Critical:** The layout file cannot simply be deleted in Next.js App Router — it must exist as a pass-through or be genuinely removed. The cleanest approach: replace layout content with a plain pass-through wrapper, then put all the old board content + SprintSummaryPanel directly in `plan/page.tsx`.

```typescript
// plan/layout.tsx — AFTER (pass-through)
export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// plan/page.tsx — AFTER (absorbs board + SprintSummaryPanel)
import { getTasksForProject, getPlanTemplates } from '@/lib/queries'
import { PhaseBoard } from '@/components/PhaseBoard'
import { AiPlanPanel } from '@/components/AiPlanPanel'
import { SprintSummaryPanel } from '@/components/SprintSummaryPanel'

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = parseInt(id, 10)
  let tasks = [], templates = []
  try {
    ;[tasks, templates] = await Promise.all([getTasksForProject(projectId), getPlanTemplates()])
  } catch { /* DB unavailable */ }

  return (
    <div className="flex flex-col">
      <SprintSummaryPanel projectId={projectId} />
      <div className="p-4">
        <AiPlanPanel projectId={projectId} />
        <PhaseBoard tasks={tasks} projectId={projectId} templates={templates} />
      </div>
    </div>
  )
}
```

### Pattern 4: RisksTableClient — Full Filter Bar + Multi-Select

**What:** Extend existing `RisksTableClient` with 4-dimension filtering and multi-select bulk actions, matching `ActionsTableClient` exactly.

**Current state:** `RisksTableClient` already reads `searchParams.get('severity')` but does not have full URL-param filter state, useMemo filtering, or multi-select. It also lacks `useCallback` for `updateParam`.

**Key difference from Actions:** Risks filter on `created_at` (timestamp) for date range, not a text date field. Date comparison must convert: `risk.created_at` is a `Date` object from Drizzle — use `risk.created_at.toISOString().split('T')[0]` for string comparison against `from`/`to` params.

**Date field mapping:**
- `identified_date` in CONTEXT.md = `created_at` in the Drizzle schema (`risks` table)
- `risk.created_at` is typed as `Date` (Drizzle timestamp inference)
- Filter comparison: `risk.created_at.toISOString().split('T')[0] >= fromDate`

```typescript
// Source: adapted from ActionsTableClient.tsx pattern
// app/bigpanda-app/components/RisksTableClient.tsx (key additions)
import { useState, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// In component body:
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
const statusFilter = searchParams.get('status') ?? ''
const severityFilter = searchParams.get('severity') ?? ''
const ownerFilter = searchParams.get('owner') ?? ''
const fromDate = searchParams.get('from') ?? ''
const toDate = searchParams.get('to') ?? ''

const updateParam = useCallback((key: string, value: string) => {
  const params = new URLSearchParams(searchParams.toString())
  if (value) { params.set(key, value) } else { params.delete(key) }
  router.push(`?${params.toString()}`, { scroll: false })
}, [router, searchParams])

const filteredRisks = useMemo(() => {
  let result = [...risks].sort((a, b) => (SEVERITY_ORDER[a.severity ?? 'low'] ?? 4) - (SEVERITY_ORDER[b.severity ?? 'low'] ?? 4))
  if (statusFilter) result = result.filter(r => normaliseRiskStatus(r.status) === statusFilter)
  if (severityFilter) result = result.filter(r => normaliseSeverity(r.severity) === severityFilter)
  if (ownerFilter) result = result.filter(r => r.owner === ownerFilter)
  if (fromDate) result = result.filter(r => r.created_at.toISOString().split('T')[0] >= fromDate)
  if (toDate) result = result.filter(r => r.created_at.toISOString().split('T')[0] <= toDate)
  return result
}, [risks, statusFilter, severityFilter, ownerFilter, fromDate, toDate])

async function bulkUpdateStatus(status: string) {
  await fetch('/api/risks/bulk-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ risk_ids: Array.from(selectedIds), patch: { status } }),
  })
  setSelectedIds(new Set())
  router.refresh()
}
```

### Pattern 5: New Bulk-Update API Endpoints

**What:** `/api/risks/bulk-update/route.ts` and `/api/milestones/bulk-update/route.ts` modeled after `/api/actions/bulk-update/route.ts`.

**Reference implementation exists:** `app/api/actions/bulk-update/route.ts` — copy structure exactly, substituting table, id field names, and status enum.

```typescript
// Source: /bigpanda-app/app/api/actions/bulk-update/route.ts (reference)
// New: /bigpanda-app/app/api/risks/bulk-update/route.ts
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '../../../../db'
import { risks } from '../../../../db/schema'
import { inArray } from 'drizzle-orm'
import { requireSession } from '@/lib/auth-server'

const BulkUpdateSchema = z.object({
  risk_ids: z.array(z.number()).min(1, 'At least one risk ID required'),
  patch: z.object({
    status: z.enum(['open', 'mitigated', 'resolved', 'accepted']).optional(),
  }),
})

export async function POST(request: NextRequest) {
  const { redirectResponse } = await requireSession()
  if (redirectResponse) return redirectResponse

  let body: unknown
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BulkUpdateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const { risk_ids, patch } = parsed.data
  if (!patch.status) return Response.json({ error: 'No fields to update' }, { status: 400 })

  await db.update(risks).set({ status: patch.status }).where(inArray(risks.id, risk_ids))
  return Response.json({ ok: true, count: risk_ids.length })
}
```

Milestones bulk-update uses the same structure with `milestone_ids`, `milestones` table, and `z.enum(['not_started', 'in_progress', 'completed', 'blocked'])` status.

### Anti-Patterns to Avoid

- **Deleting PlanTabs.tsx or SwimlaneView.tsx:** Don't delete component files; they may be referenced by tests or other consumers. Leave in place — route restructuring is sufficient.
- **Adding API endpoints for filter changes:** Client-side filtering only. Server Component passes full data; no new GET endpoints with filter query params.
- **Removing swimlane route file:** Replace content with a redirect; don't delete the file. Next.js App Router requires the file to exist to handle the route.
- **Modifying SubTabBar.tsx:** No changes needed to SubTabBar — only TAB_GROUPS in WorkspaceTabs.tsx drives the sub-navigation.
- **Changing activeTab/activeSubtab detection logic:** The `useSearchParams` pattern for tab activation in WorkspaceTabs already works correctly; TAB_GROUPS array edits are sufficient.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL param sync | Custom state manager | `useSearchParams` + `router.push` | Already the established pattern in ActionsTableClient |
| In-memory filtering | Custom hook | `useMemo` over server-passed data | Zero-latency, no extra network call, already proven |
| Bulk DB update | Loop of PATCH calls | Single `inArray` Drizzle query | One round-trip, atomic, already used in actions/bulk-update |
| Bulk action bar | Modal or sidebar | Inline floating div when `selectedIds.size > 0` | ActionsTableClient pattern — lightweight, consistent |
| Route redirects | Middleware rewrite | `redirect()` in page file | Simplest approach; works in Next.js App Router Server Components |

---

## Common Pitfalls

### Pitfall 1: `created_at` is a Date Object, Not a String

**What goes wrong:** Comparing `risk.created_at` directly to `fromDate` string fails because `created_at` is a `Date` object in Drizzle's TypeScript inference (`timestamp` columns return `Date`).

**Why it happens:** The `risks` schema uses `timestamp('created_at').defaultNow().notNull()` — Drizzle infers this as `Date`, not `string`.

**How to avoid:** Always convert to ISO string before comparing: `risk.created_at.toISOString().split('T')[0]`.

**Warning signs:** TypeScript type error on `>=` comparison between `Date` and `string`.

### Pitfall 2: Milestone `target` Field is Text, Not a Date

**What goes wrong:** Filtering milestones by date range on `target` using date object comparison fails — `target` is `text('target')`, nullable, can contain values like 'TBD' or '2026-Q3'.

**Why it happens:** The milestones schema explicitly stores flexible date text: `target: text('target')`. See `MilestonesTableClient.tsx` line 84: `const displayDate = m.target ?? m.date ?? null`.

**How to avoid:** Filter only rows where `target` matches ISO date pattern (`/^\d{4}-\d{2}-\d{2}/`), same guard already in `isOverdueMilestone()`. Skip non-ISO target values in date range filter.

**Warning signs:** Rows with 'TBD' targets disappearing incorrectly from filtered view.

### Pitfall 3: New Top-Level Routes Need Correct `?tab=delivery&subtab=` Params

**What goes wrong:** Navigating to `/customer/[id]/tasks` shows the correct content but the Delivery tab is not highlighted as active in WorkspaceTabs.

**Why it happens:** WorkspaceTabs detects the active tab via `searchParams.get('tab')` and `searchParams.get('subtab')`. New top-level routes won't have these params unless SubTabBar links include them.

**How to avoid:** WorkspaceTabs generates hrefs for children as `/customer/${projectId}/${child.segment}?tab=${group.id}&subtab=${child.id}`. As long as TAB_GROUPS is correct, SubTabBar generates correct hrefs automatically. However, redirects from old routes must NOT carry the old subtab params.

**Warning signs:** Active tab highlight missing after navigating to tasks/gantt/wbs.

### Pitfall 4: plan/layout.tsx Must Not Be Simply Emptied

**What goes wrong:** Deleting `plan/layout.tsx` or leaving it empty causes Next.js to error because the layout slot becomes undefined for child routes.

**Why it happens:** In Next.js App Router, layout.tsx files are required to export a default function accepting `children`. Removing the file only works if there are no child routes (which there still are: `board/`, `tasks/`, `gantt/`, `swimlane/`).

**How to avoid:** Replace with a pass-through: `export default function PlanLayout({ children }: { children: React.ReactNode }) { return <>{children}</> }`. This effectively dissolves the layout without breaking child routes.

### Pitfall 5: Intel `?tab=intel` Graceful Fallback — Verify WorkspaceTabs Handles Unknown Tab

**What goes wrong:** Old bookmarked URLs with `?tab=intel` could cause undefined active group, potentially breaking the nav render.

**Why it happens:** WorkspaceTabs finds active group by matching `activeTab === group.id`. If no group matches (Intel is removed), `activeGroup` is `undefined` and `activeGroup.standalone` throws.

**How to avoid:** Verify WorkspaceTabs handles `activeGroup === undefined` gracefully — the current code uses `activeGroup?.id`, `activeGroup?.standalone`, and `activeGroup && !activeGroup.standalone` guards, which all handle `undefined` safely. The CONTEXT.md decision confirms this graceful fallback is sufficient.

**Warning signs:** Runtime error in WorkspaceTabs when navigating with `?tab=intel`.

### Pitfall 6: MilestonesTableClient `useMemo` Must Preserve Incomplete-First Sort After Filtering

**What goes wrong:** Filtering disrupts the existing sort order where incomplete milestones display before completed ones.

**Why it happens:** The current MilestonesTableClient builds `sortedMilestones` by splitting into `incomplete` and `complete` arrays first, then sorting each by date. If `useMemo` re-implements this incorrectly, the sort order changes.

**How to avoid:** In the `useMemo` for `filteredMilestones`, apply URL-param filters to the full `milestones` array first, then split into incomplete/complete and apply the existing `sortByDate` logic on each half before concatenating.

---

## Code Examples

### Adding Checkbox Column to Risks Table Header

```typescript
// Source: ActionsTableClient.tsx pattern
import { Checkbox } from '@/components/ui/checkbox'

// In TableHeader:
<TableHead className="w-12">
  <Checkbox
    checked={filteredRisks.length > 0 && selectedIds.size === filteredRisks.length}
    onCheckedChange={toggleSelectAll}
  />
</TableHead>

// In each TableRow:
<TableCell>
  <Checkbox
    checked={selectedIds.has(risk.id)}
    onCheckedChange={() => toggleSelection(risk.id)}
  />
</TableCell>
```

### Floating Bulk Bar Pattern

```typescript
// Source: ActionsTableClient.tsx lines 253-279
{selectedIds.size > 0 && (
  <div className="flex items-center gap-3 bg-zinc-50 border rounded px-4 py-2">
    <span className="text-sm font-medium">{selectedIds.size} selected</span>
    <select
      onChange={e => {
        if (e.target.value) {
          bulkUpdateStatus(e.target.value)
          e.target.value = ''
        }
      }}
      className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
    >
      <option value="">Change status...</option>
      {RISK_STATUS_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    <button
      onClick={() => setSelectedIds(new Set())}
      className="text-sm text-zinc-600 hover:text-zinc-800"
    >
      Clear
    </button>
  </div>
)}
```

### Risk Date Range Filter (created_at is a Date object)

```typescript
// Correct date range filtering for risks (created_at is Date, not string)
if (fromDate) {
  result = result.filter(r => {
    const dateStr = r.created_at.toISOString().split('T')[0]
    return dateStr >= fromDate
  })
}
if (toDate) {
  result = result.filter(r => {
    const dateStr = r.created_at.toISOString().split('T')[0]
    return dateStr <= toDate
  })
}
```

### Milestone Date Range Filter (target is nullable text)

```typescript
// Correct date range filtering for milestones (target is nullable text, may not be ISO date)
if (fromDate) {
  result = result.filter(m => {
    const d = m.target ?? m.date ?? ''
    if (!/^\d{4}-\d{2}-\d{2}/.test(d)) return false  // skip non-ISO dates (TBD, 2026-Q3, etc.)
    return d >= fromDate
  })
}
if (toDate) {
  result = result.filter(m => {
    const d = m.target ?? m.date ?? ''
    if (!/^\d{4}-\d{2}-\d{2}/.test(d)) return false
    return d <= toDate
  })
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Plan has inner PlanTabs nav with Board/Tasks/Gantt/Swimlane | Plan is first Delivery sub-tab; Tasks and Gantt promoted to Delivery level | Phase 44 | Flatter nav, less nesting |
| Intel tab contains Decisions + Engagement History | Decisions in Delivery, Engagement History in Admin, Intel tab removed | Phase 44 | Simpler tab structure |
| RisksTableClient: severity filter only (single URL param) | Full 4-dimension filter bar (status, severity, owner, date range) | Phase 44 | Parity with Actions |
| MilestonesTableClient: no URL-param filtering | Full 3-dimension filter bar (status, owner, date range) | Phase 44 | Parity with Actions |
| No multi-select on Risks or Milestones | Checkbox selection + bulk status update bar | Phase 44 | Parity with Actions |

**Deprecated/outdated after Phase 44:**
- `PlanTabs.tsx`: The PlanTabs inner nav component is no longer rendered after plan/layout.tsx is dissolved. The component file can remain but is dead code.
- `plan/board`, `plan/tasks`, `plan/gantt`, `plan/swimlane` as navigation destinations: All become redirect-only pages.
- Intel `?tab=intel` URL param: Gracefully falls back to Overview; no active group match.

---

## Open Questions

1. **Should PlanTabs.tsx and SwimlaneView.tsx be deleted after Phase 44?**
   - What we know: Both become dead code (no routes render them); deleting cleans up the codebase
   - What's unclear: Whether any test files reference them by import
   - Recommendation: Leave deletion for a cleanup pass; scope this phase to just navigation routing

2. **Should identified_date label in the filter bar say "Date Identified" or "Date Added"?**
   - What we know: CONTEXT.md says "identified_date" maps to `created_at`
   - What's unclear: UX label preference
   - Recommendation: Use "Date Identified" as the filter label — this is Claude's Discretion per CONTEXT.md

3. **Shared BulkBar / FilterBar component extraction?**
   - What we know: CONTEXT.md explicitly leaves this to Claude's discretion; the 3 tables will have near-identical filter bars and bulk bars
   - What's unclear: Whether the duplication is worth the abstraction overhead in this phase
   - Recommendation: Extract a shared `FilterBar` component if all 3 filter bars can share a common prop interface without complexity. A shared `BulkBar` component is straightforward (just `count`, `statusOptions`, `onStatusChange`, `onClear` props). However, this is optional — inline implementation in each client is acceptable.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `bigpanda-app/vitest.config.ts` |
| Quick run command | `cd bigpanda-app && npx vitest run app/api/__tests__/` |
| Full suite command | `cd bigpanda-app && npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NAV-01 | Old plan/board URL redirects | smoke/manual | Manual browser check | N/A |
| NAV-02 | WBS/Tasks/Gantt appear as Delivery sub-tabs | smoke/manual | Manual browser check | N/A |
| NAV-03 | Swimlane removed from navigation | smoke/manual | Manual browser check | N/A |
| NAV-04 | Decisions appears under Delivery | smoke/manual | Manual browser check | N/A |
| NAV-05 | Intel tab absent; Engagement History under Admin | smoke/manual | Manual browser check | N/A |
| RISK-01 | RisksTableClient filters by status/severity/owner/date | unit | `cd bigpanda-app && npx vitest run app/api/__tests__/` | ❌ Wave 0 |
| RISK-02 | /api/risks/bulk-update updates correct rows | unit | `cd bigpanda-app && npx vitest run app/api/__tests__/` | ❌ Wave 0 |
| MILE-01 | MilestonesTableClient filters by status/owner/date | unit | `cd bigpanda-app && npx vitest run app/api/__tests__/` | ❌ Wave 0 |
| MILE-02 | /api/milestones/bulk-update updates correct rows | unit | `cd bigpanda-app && npx vitest run app/api/__tests__/` | ❌ Wave 0 |

**Navigation requirements (NAV-01 through NAV-05) are not automatable with the current vitest/node environment** — they require browser rendering to verify URL resolution and tab highlighting. These are manual-verify items.

**Parity requirements (RISK-01, RISK-02, MILE-01, MILE-02) are automatable** via unit tests for the new bulk-update API routes (pattern from `health.test.ts` and `sprint-summary.test.ts`).

### Sampling Rate
- **Per task commit:** `cd bigpanda-app && npx vitest run` (full suite, ~370 tests, fast)
- **Per wave merge:** `cd bigpanda-app && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`; manual browser smoke-test for all 5 NAV requirements

### Wave 0 Gaps
- [ ] `bigpanda-app/app/api/__tests__/risks-bulk-update.test.ts` — covers RISK-02
- [ ] `bigpanda-app/app/api/__tests__/milestones-bulk-update.test.ts` — covers MILE-02

**Note:** RISK-01 and MILE-01 (client-side filter logic) are best tested via the unit tests for pure filter functions, or accepted as manual-verify given the current vitest node environment without DOM rendering. The bulk-update API routes are the highest-value automated test targets.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `WorkspaceTabs.tsx`, `ActionsTableClient.tsx`, `RisksTableClient.tsx`, `MilestonesTableClient.tsx`, `plan/layout.tsx`, `plan/board/page.tsx`, `plan/tasks/page.tsx`, `plan/gantt/page.tsx`, `plan/swimlane/page.tsx`, `db/schema.ts`, `app/api/actions/bulk-update/route.ts`, `app/api/risks/[id]/route.ts`, `app/api/milestones/[id]/route.ts`
- `vitest.config.ts` — test framework and configuration verified

### Secondary (MEDIUM confidence)
- Next.js App Router redirect pattern — well-established, matches existing usage in `plan/page.tsx` (which currently redirects to `plan/board`)

### Tertiary (LOW confidence)
- None — all findings from direct codebase inspection

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified present in package.json and in use
- Architecture: HIGH — all existing files read and understood; patterns verified from working code
- Pitfalls: HIGH — all pitfalls derived from actual schema/code inspection (created_at typing, target text field)
- Validation: HIGH — vitest config and test file structure confirmed by inspection

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable stack — no fast-moving dependencies)
