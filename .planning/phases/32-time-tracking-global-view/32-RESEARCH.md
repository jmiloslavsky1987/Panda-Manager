# Phase 32: Time Tracking Global View - Research

**Researched:** 2026-04-01
**Domain:** Next.js App Router routing, cross-project Drizzle ORM queries, React client state, RLS bypass pattern
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Full CRUD from the global view: add, edit, and delete entries directly
- Add form has a required project dropdown — user must select a project before saving
- When arriving via redirect from `/customer/[id]/time`, URL carries `?project=:id` and the dropdown pre-fills automatically from the query param
- When arriving at `/time-tracking` directly (no URL context), no default — user picks project explicitly
- Reassign entries between projects via bulk action only (bulk move) — no inline per-row project selector
- Primary layout: entries grouped by week with date range headers (per success criteria)
- Filter controls at top: project dropdown + date range (from/to) — mirrors existing TimeTab filter pattern
- Default state: all projects, all dates shown
- Users see only their own entries (entries they personally logged)
- Admins and approvers see approve/reject actions on visible entries — role-gated same as per-project tab
- Regular users see status badges but no approve/reject buttons
- Full approval workflow carried over: submit, approve, reject with status badges
- Role guard: admin and approver roles only can approve/reject — same as existing per-project implementation
- All existing bulk actions carried over: approve, reject, delete, move (cross-project reassignment)
- Bulk move is the primary way to reassign entries between projects
- Export respects active filters (project + date range) — exports what is currently visible
- Calendar import carried over with per-event project selection in the import preview (manual)
- No auto-detection of project from calendar invite data in this phase
- New top-level page: `/time-tracking`
- Redirect: `/customer/[id]/time` → `/time-tracking?project=:id` (preserve project context in URL)
- Remove `{ id: 'time', label: 'Time', segment: 'time' }` from `WorkspaceTabs.tsx`
- Replace `app/customer/[id]/time/page.tsx` with a Next.js redirect
- Link in the bottom section alongside Knowledge Base, Outputs, Settings, Scheduler
- Use a clock/timer icon (consistent with Lucide icon pattern used in sidebar)

### Claude's Discretion
- Exact weekly grouping header format (e.g., "Mar 31 – Apr 6" vs "Week of Mar 31")
- Whether to reuse/refactor `TimeTab.tsx` as a base or build a new `GlobalTimeView` component
- New API endpoint shape for cross-project queries (`/api/time-entries` or `/api/time-tracking`)
- Exact confidence threshold for calendar event customer name auto-detection

### Deferred Ideas (OUT OF SCOPE)
- Auto-detecting project from Google Calendar invite data (matching event title/description against `projects.customer` names in DB)
- Entry reassignment (inline per-row project change) — bulk move covers cross-project reassignment
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TIME-01 | User can view all time entries across all projects from a standalone top-level /time-tracking section | New `GET /api/time-entries` endpoint with cross-project Drizzle query (no RLS on time_entries); new `app/time-tracking/page.tsx` + `GlobalTimeView` component |
| TIME-02 | User can assign or attribute each time entry to a project from the global view | Modified `TimeEntryModal` accepting optional `projectId` prop; add form project dropdown seeded from `/api/projects` listing; bulk move for reassignment |
| TIME-03 | Per-project time tracking tab is removed from the workspace | Remove `{ id: 'time', label: 'Time', segment: 'time' }` from `WorkspaceTabs.tsx` `admin` group; replace `app/customer/[id]/time/page.tsx` with Next.js `redirect()` |
</phase_requirements>

## Summary

Phase 32 migrates time tracking from a per-project workspace tab to a top-level standalone `/time-tracking` section. The feature is largely a UI reorganization layered over existing infrastructure: the `time_entries` schema is unchanged, and all business logic helpers (`getEntryStatus`, `groupEntries`, `computeSubtotals`, etc.) in `lib/time-tracking.ts` are already correct and reusable. The primary new work is a cross-project `GET /api/time-entries` endpoint that queries across all projects without a specific `project_id` filter, and a new `GlobalTimeView` React client component that adapts the existing `TimeTab.tsx` patterns for the cross-project context.

The critical technical insight is that `time_entries` does NOT have Row Level Security (confirmed via migrations). This means the new cross-project API endpoint can omit the `SET LOCAL app.current_project_id` RLS setup and simply query all entries with an optional `project_id` filter. All other per-project API routes (PATCH/DELETE single entry, bulk actions, submit, approve, reject, export, calendar-import) continue to work as-is — the global view calls them with the entry's actual `project_id` from the fetched data.

The sidebar, WorkspaceTabs, and redirect changes are straightforward surgery on two components plus one page file. No schema migrations are needed.

**Primary recommendation:** Build `GlobalTimeView` as a new component (not an inline refactor of `TimeTab.tsx`) that imports shared helpers from `lib/time-tracking.ts` and mirrors the TimeTab interaction patterns. This avoids breaking the existing per-project route before the redirect is in place, and keeps the components independently testable.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16 (Turbopack) | Routing — `app/time-tracking/page.tsx`, redirect in `app/customer/[id]/time/page.tsx` | Project baseline |
| Drizzle ORM | Installed | Cross-project `time_entries` query with LEFT JOIN to `projects` | Project baseline — all DB queries use Drizzle |
| React (useState, useEffect, useCallback) | Installed | Client state in `GlobalTimeView` | Same pattern as `TimeTab.tsx` — plain fetch + hooks |
| Lucide React | Installed | Clock icon for sidebar link | All existing sidebar icons use Lucide (`BookOpen`, `CalendarClock`, `Library`, `Settings`) |
| zod | Installed | Request body validation in new API route | All existing time-entry routes use zod schemas |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/navigation `redirect()` | Next.js 16 | Server-side redirect in `app/customer/[id]/time/page.tsx` | Replacing the old page with a permanent redirect |
| next/navigation `useSearchParams()` | Next.js 16 | Read `?project=:id` on mount in `GlobalTimeView` | Pre-filling project dropdown from redirect URL param |
| ExcelJS | Installed | XLSX export in global export endpoint | Already used in per-project export route |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `GlobalTimeView` component | Refactor `TimeTab.tsx` in place | Refactoring in place risks breaking existing per-project tab before redirect lands; new component is safer and independently testable |
| `/api/time-entries` endpoint | Re-use per-project endpoints with loops | Cross-project query is a single DB round-trip vs N fetches; single endpoint is cleaner |

**Installation:**
```bash
# No new packages required — all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
bigpanda-app/
├── app/
│   ├── time-tracking/
│   │   └── page.tsx               # RSC shell — renders GlobalTimeView
│   └── customer/[id]/time/
│       └── page.tsx               # Replace with redirect() to /time-tracking?project=:id
├── app/api/
│   ├── time-entries/
│   │   ├── route.ts               # GET (cross-project list), POST (create with project_id)
│   │   ├── bulk/
│   │   │   └── route.ts           # POST bulk actions — project_id comes from request body
│   │   ├── export/
│   │   │   └── route.ts           # GET CSV/XLSX export with filters
│   │   └── calendar-import/
│   │       └── route.ts           # GET list events, POST import with per-event project_id
│   └── projects/[projectId]/time-entries/
│       └── [entryId]/             # Existing per-entry PATCH/DELETE/approve/reject/submit
│           └── (unchanged)
├── components/
│   ├── GlobalTimeView.tsx         # New primary component — cross-project time entry list
│   ├── TimeEntryModal.tsx         # Modified — add optional project_id prop + project dropdown
│   ├── WorkspaceTabs.tsx          # Remove 'time' subtab from 'admin' group
│   └── Sidebar.tsx               # Add /time-tracking link after Scheduler
└── lib/
    └── time-tracking.ts           # Unchanged — all helpers reusable as-is
```

### Pattern 1: Cross-Project GET Without RLS Setup
**What:** The new `GET /api/time-entries` queries the `time_entries` table directly WITHOUT calling `SET LOCAL app.current_project_id`. The `time_entries` table has no RLS (confirmed — it was created in migration 0006 without RLS policies, and no subsequent migration added them).
**When to use:** Any query spanning multiple projects on a table without RLS.
**Example:**
```typescript
// Source: db/migrations/0006_time_tracking.sql — no ALTER TABLE ... ENABLE ROW LEVEL SECURITY
// Source: db/migrations/0001_initial.sql — last note: "projects, workstreams, tasks, plan_templates,
//         knowledge_base do NOT have RLS" (time_entries follows the same pattern)

// Correct pattern — NO transaction wrapper with SET LOCAL needed:
const conditions = []
if (projectId) conditions.push(eq(timeEntries.project_id, projectId))
if (from) conditions.push(gte(timeEntries.date, from))
if (to) conditions.push(lte(timeEntries.date, to))

const entries = await db
  .select({
    ...timeEntries,
    project_name: projects.customer,
  })
  .from(timeEntries)
  .leftJoin(projects, eq(timeEntries.project_id, projects.id))
  .where(conditions.length > 0 ? and(...conditions) : undefined)
  .orderBy(desc(timeEntries.date))
```

### Pattern 2: Next.js App Router Redirect (Server Component)
**What:** Replace the old per-project time page with a server component that performs a permanent redirect, preserving the project context in the query string.
**When to use:** Replacing a route that should now live elsewhere.
**Example:**
```typescript
// app/customer/[id]/time/page.tsx — replace entire file content
import { redirect } from 'next/navigation'

export default async function TimePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/time-tracking?project=${id}`)
}
```

### Pattern 3: URL Query Param Pre-fill on Mount
**What:** On mount of `GlobalTimeView`, read `?project=:id` from the URL and pre-fill the project filter dropdown. This is the mechanism that makes the redirect from per-project tab feel seamless.
**When to use:** Any global view that needs to accept context from a redirecting per-scoped route.
**Example:**
```typescript
// Source: TimeTab.tsx already uses useSearchParams() for filter state
import { useSearchParams } from 'next/navigation'

export function GlobalTimeView() {
  const searchParams = useSearchParams()
  const [projectFilter, setProjectFilter] = useState<number | null>(
    () => {
      const p = searchParams.get('project')
      return p ? parseInt(p, 10) : null
    }
  )
  // On mount with ?project=123, dropdown shows project 123 immediately
}
```

### Pattern 4: requireSession() + Role Guard in New API Routes
**What:** Every new route handler MUST call `requireSession()` at the top. Role gating for approve/reject uses `session.user.role`.
**When to use:** All new API routes without exception.
**Example:**
```typescript
// Source: lib/auth-server.ts + existing approve route pattern
const { session, redirectResponse } = await requireSession();
if (redirectResponse) return redirectResponse;

// Role guard for approve/reject in bulk:
const role = session.user.role
if (role !== 'admin' && role !== 'approver') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### Pattern 5: Existing Bulk API Reuse for Global Context
**What:** The existing `POST /api/projects/[projectId]/time-entries/bulk` already handles `action: 'move'` with `target_project_id`. For the global view's bulk actions, the `projectId` in the URL is the SOURCE project of the selected entries. When entries from multiple projects are bulk-selected, the UI must group them by `project_id` and call the per-project bulk endpoint once per source project.
**When to use:** Bulk operations from the global view where selected entries span multiple projects.
**Example:**
```typescript
// Group selected entries by project_id, then call per-project bulk for each group
const groups = selectedEntries.reduce((acc, entry) => {
  if (!acc[entry.project_id]) acc[entry.project_id] = []
  acc[entry.project_id].push(entry.id)
  return acc
}, {} as Record<number, number[]>)

for (const [projectId, ids] of Object.entries(groups)) {
  await fetch(`/api/projects/${projectId}/time-entries/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, entry_ids: ids, ...actionParams }),
  })
}
```

### Pattern 6: Weekly Grouping
**What:** `getMondayOfWeek()` exists in `CalendarImportModal.tsx`. A similar helper in `TimeTab.tsx` groups entries into week buckets. The global view reuses this pattern with a computed week key per entry.
**When to use:** Grouping entries by ISO week in the global view table.
**Example:**
```typescript
// getMondayOfWeek already exists in CalendarImportModal.tsx — extract or copy to GlobalTimeView
function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}
// Week header format (Claude's discretion): "Mar 31 – Apr 6, 2026"
```

### Anti-Patterns to Avoid
- **Setting `SET LOCAL app.current_project_id` in the global endpoint:** `time_entries` has no RLS; the SET LOCAL call is unnecessary and misleading. Do not wrap the cross-project query in a transaction just to set this variable.
- **Fetching entries N times (once per project):** Always use a single cross-project query with an optional `project_id` filter — N fetches create unnecessary load.
- **Modifying `TimeTab.tsx` to be both per-project and global:** The components serve different contexts; keep them separate until the global view is stable.
- **Calling the global new endpoint from the per-project tab:** The per-project tab (`/customer/[id]/time`) is being removed; don't mix routing contexts.
- **Omitting `requireSession()` on new global routes:** All routes must have it regardless of context.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Entry status state machine | Custom status logic | `getEntryStatus()`, `canEdit()`, `canSubmit()`, `canOverrideLock()` from `lib/time-tracking.ts` | These are already correct, tested, and handle all edge cases (locked > approved > rejected > submitted > draft priority order) |
| Hour subtotals | Custom aggregation | `computeSubtotals()` from `lib/time-tracking.ts` | Handles billable vs non-billable detection via `[non-billable]` tag correctly |
| Entry grouping | Custom grouping | `groupEntries()` from `lib/time-tracking.ts` | Already supports `'project' | 'team_member' | 'status' | 'date'` — extend with week grouping inline |
| Bulk cross-project move | New move implementation | Existing `POST /api/projects/[projectId]/time-entries/bulk` with `action: 'move'` | Production-ready with audit logging and graceful skip of ineligible entries |
| CSV export logic | Custom CSV builder | Existing `GET /api/projects/[projectId]/time-entries/export` or new global export | ExcelJS workbook builder and CSV escape logic already correct |
| Calendar import UI | New calendar import modal | `CalendarImportModal.tsx` adapted for global context | All calendar OAuth, event listing, confidence badge, and project selection logic is complete |
| Auth session guard | Custom session check | `requireSession()` from `lib/auth-server.ts` | CVE-2025-29927 defense-in-depth — never skip this |
| Edit/create modal | New modal | Adapt `TimeEntryModal.tsx` — add `projectId` prop (optional) + project dropdown | All date/hours/description fields are already correct |
| Delete confirmation | Custom confirm UI | `DeleteConfirmDialog` component | Already used in TimeTab.tsx |

**Key insight:** The infrastructure for time tracking is mature and production-tested. Phase 32 is primarily a routing/UI reorganization. Nearly every functional piece already exists — the work is wiring it into the new global context, not rebuilding it.

## Common Pitfalls

### Pitfall 1: Assuming time_entries Has RLS
**What goes wrong:** Developer wraps the cross-project query in a transaction with `SET LOCAL app.current_project_id = 0` or similar, causing confusing behavior or blocking all rows.
**Why it happens:** Every other time-entry route uses transaction + SET LOCAL, so it looks like a required pattern.
**How to avoid:** The SET LOCAL pattern is ONLY needed for tables with actual RLS policies (actions, risks, milestones, etc.). `time_entries` was created in migration 0006 without `ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY` — confirmed in all 24 migration files. Query directly.
**Warning signs:** Empty results from cross-project query even though entries exist.

### Pitfall 2: Bulk Actions Across Mixed-Project Selection
**What goes wrong:** Bulk approving entries from project A and B by calling `/api/projects/A/time-entries/bulk` with IDs from both projects — entries from B are silently skipped because the route filters by `eq(timeEntries.project_id, numericProjectId)`.
**Why it happens:** The existing bulk route is scoped to a single project.
**How to avoid:** Group selected entries by `project_id` and issue one bulk call per source project group. For cross-project bulk delete/approve, this is N calls but N is small (number of distinct projects in selection, not number of entries).
**Warning signs:** `skipped` count is non-zero in bulk response when all selected entries should be eligible.

### Pitfall 3: Redirect Before Time Tab Removal Causes Dead Links
**What goes wrong:** The redirect in `app/customer/[id]/time/page.tsx` is deployed before the Time tab is removed from `WorkspaceTabs.tsx`, so the tab still appears and clicking it redirects away, creating a jarring UX.
**Why it happens:** Phasing the changes separately.
**How to avoid:** Remove the tab from `WorkspaceTabs.tsx` in the SAME wave as deploying the redirect. The changes are atomic — do them together.
**Warning signs:** Time tab visible in workspace but clicking it navigates away from the project page.

### Pitfall 4: useSearchParams() Requires Suspense Boundary
**What goes wrong:** Next.js 16 throws a build error or hydration error if `useSearchParams()` is used in a component that is NOT wrapped in a `<Suspense>` boundary at the page level.
**Why it happens:** Next.js requires Suspense when reading search params in client components during SSR.
**How to avoid:** The `app/time-tracking/page.tsx` RSC shell must wrap `<GlobalTimeView>` in `<Suspense fallback={<div>Loading...</div>}>`.
**Warning signs:** Build error "useSearchParams() should be wrapped in a suspense boundary at page '...'".

### Pitfall 5: Project Dropdown Empty on First Load
**What goes wrong:** The project dropdown in `GlobalTimeView` (for filtering and for the add form) shows "Loading..." briefly, then shows a stale/empty list if the `/api/projects` GET is not implemented or returns the wrong shape.
**Why it happens:** The existing `GET /api/projects/route.ts` is actually a POST handler — there is no GET projects listing endpoint. `CalendarImportModal.tsx` already handles this by calling `fetch('/api/projects')` and gracefully handling `{ projects: [...] }` or flat array shapes.
**How to avoid:** Confirm `GET /api/projects` exists. Looking at the source, `app/api/projects/route.ts` only exports `POST`. A `GET` handler must be added to return active projects. Alternatively, use the pattern in `CalendarImportModal.tsx` which already has a working projects fetch — check what endpoint it uses and replicate it.
**Warning signs:** 405 Method Not Allowed on `GET /api/projects`.

### Pitfall 6: Calendar Import Endpoint Hardcodes projectId from URL
**What goes wrong:** `CalendarImportModal.tsx` calls `fetch('/api/projects/${projectId}/time-entries/calendar-import?week_start=...')` using the `projectId` prop. In the global context, there is no single project scope — the import endpoint itself already supports per-event project assignment in the POST body.
**Why it happens:** The modal was designed for per-project context; the `projectId` parameter is used in the GET URL path but the route handler ignores it (`await params; // consume params`).
**How to avoid:** The GET route ignores `projectId` in the path (see comment in route handler: `await params; // consume params`). Pass any valid project ID (e.g., `0` or the first active project ID) as a placeholder for the URL path; the actual project assignment happens per-event in the POST body. Or create a new global calendar import endpoint at `/api/time-entries/calendar-import` that drops the projectId path param entirely.
**Warning signs:** TypeScript error or 404 if projectId is undefined when constructing the calendar import URL.

## Code Examples

Verified patterns from existing codebase source:

### New Global GET Endpoint Skeleton
```typescript
// app/api/time-entries/route.ts
// Source: pattern derived from app/api/projects/[projectId]/time-entries/route.ts
// Key difference: no RLS, no SET LOCAL, LEFT JOIN to include project name

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq, gte, lte, desc } from 'drizzle-orm'
import db from '@/db'
import { timeEntries, projects } from '@/db/schema'
import { requireSession } from '@/lib/auth-server'

export async function GET(req: NextRequest) {
  const { session, redirectResponse } = await requireSession()
  if (redirectResponse) return redirectResponse

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('project_id')
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''

  const conditions = []
  if (projectId) conditions.push(eq(timeEntries.project_id, parseInt(projectId, 10)))
  if (from) conditions.push(gte(timeEntries.date, from))
  if (to) conditions.push(lte(timeEntries.date, to))

  const rows = await db
    .select({
      ...timeEntries,           // all time_entries columns
      project_name: projects.customer,
    })
    .from(timeEntries)
    .leftJoin(projects, eq(timeEntries.project_id, projects.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(timeEntries.date))

  return NextResponse.json({ entries: rows })
}
```

### Redirect Page Replacement
```typescript
// app/customer/[id]/time/page.tsx — complete replacement
// Source: Next.js redirect() from next/navigation — App Router pattern
import { redirect } from 'next/navigation'

export default async function TimePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/time-tracking?project=${id}`)
}
```

### Sidebar Link Addition
```typescript
// components/Sidebar.tsx — add after Scheduler link
// Source: existing Sidebar.tsx pattern — all links use same className and Lucide icon
import { Clock } from 'lucide-react'

// Insert after the Scheduler <Link> block:
<Link
  href="/time-tracking"
  className="flex items-center gap-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded px-2 py-1.5 text-sm transition-colors"
  data-testid="sidebar-time-tracking-link"
>
  <Clock className="w-4 h-4" />
  Time Tracking
</Link>
```

### WorkspaceTabs Change
```typescript
// components/WorkspaceTabs.tsx — remove 'time' from admin group children
// Source: WorkspaceTabs.tsx line 53-61
// BEFORE:
{
  id: 'admin',
  label: 'Admin',
  children: [
    { id: 'time', label: 'Time', segment: 'time' },     // REMOVE THIS LINE
    { id: 'artifacts', label: 'Artifacts', segment: 'artifacts' },
    { id: 'queue', label: 'Review Queue', segment: 'queue' },
  ],
},
// AFTER:
{
  id: 'admin',
  label: 'Admin',
  children: [
    { id: 'artifacts', label: 'Artifacts', segment: 'artifacts' },
    { id: 'queue', label: 'Review Queue', segment: 'queue' },
  ],
},
```

### Page Shell with Suspense
```typescript
// app/time-tracking/page.tsx
// Source: scheduler/page.tsx as pattern — RSC shell wrapping client component
import { Suspense } from 'react'
import { GlobalTimeView } from '@/components/GlobalTimeView'

export default function TimeTrackingPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Time Tracking</h1>
      <Suspense fallback={<div className="text-sm text-zinc-500">Loading...</div>}>
        <GlobalTimeView />
      </Suspense>
    </div>
  )
}
```

### TimeEntryModal Adaptation for Global Context
```typescript
// TimeEntryModal interface must gain optional projectId + project dropdown
// Source: TimeEntryModal.tsx — current interface is projectId: number (required)
// In global context, projectId comes from the form dropdown selection, not the URL

// New interface:
interface TimeEntryModalProps {
  projectId?: number            // optional — global context provides from dropdown
  entry?: TimeEntry
  trigger: React.ReactNode
  onSuccess: () => void
  projects?: Array<{ id: number; name: string }>  // passed by GlobalTimeView
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-project Time tab in workspace | Top-level `/time-tracking` route | Phase 32 | Entries visible cross-project; tab removed from workspace |
| `TimeTab.tsx` renders at `/customer/[id]/time` | `GlobalTimeView.tsx` renders at `/time-tracking` | Phase 32 | Old route becomes a redirect |
| Calendar import tied to project URL path | Calendar import uses per-event project selection from dropdown | Phase 32 | Import accessible globally |

**Deprecated/outdated after this phase:**
- `app/customer/[id]/time/page.tsx` as a feature page: becomes a pure redirect stub
- The `{ id: 'time', label: 'Time', segment: 'time' }` tab entry in `WorkspaceTabs.tsx`

## Open Questions

1. **GET /api/projects endpoint missing**
   - What we know: `app/api/projects/route.ts` exports only `POST`. `CalendarImportModal.tsx` calls `fetch('/api/projects')` and expects a project list — but this GET is not implemented in the current API routes.
   - What's unclear: Whether a GET endpoint exists elsewhere, or whether the modal was silently broken. Searching confirms `GET /api/projects` is not implemented in the current routes.
   - Recommendation: Add `GET /api/projects` to `app/api/projects/route.ts` that returns active projects as `{ projects: [...] }`. This is also needed by `GlobalTimeView` for the project filter dropdown. This is a small addition (4-6 lines) and is blocked by no other work.

2. **Global bulk endpoint vs grouping by source project**
   - What we know: Existing bulk route is scoped to `[projectId]` in the URL path. Multi-project selection requires N calls grouped by source project.
   - What's unclear: Whether N-calls complexity justifies a new global `/api/time-entries/bulk` route.
   - Recommendation: For Phase 32, group-by-source-project and make N calls from the client. The existing per-project bulk route handles all actions correctly. A global bulk endpoint is an optimization for a later phase.

3. **Calendar import URL in global context**
   - What we know: `CalendarImportModal.tsx` takes `projectId: number` prop and uses it in the GET URL, but the route handler ignores it (`await params; // consume params`).
   - What's unclear: Whether passing a placeholder project ID (or adapting the modal to accept optional projectId) is cleaner than creating a new global endpoint.
   - Recommendation: Adapt `CalendarImportModal.tsx` to accept `projectId?: number` and construct the URL with a fallback (`projectId ?? 0`). The GET route ignores the path param, so any value works for the GET. The POST already handles per-event `project_id` in the body.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (via `vitest.config.ts`) |
| Config file | `bigpanda-app/vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TIME-01 | Global view fetches entries from all projects | unit | `npx vitest run __tests__/time-tracking-global/global-view.test.ts -x` | Wave 0 |
| TIME-01 | GET /api/time-entries returns entries with project_name | unit | `npx vitest run __tests__/time-tracking-global/api-endpoint.test.ts -x` | Wave 0 |
| TIME-02 | Add form project dropdown pre-fills from ?project= param | unit | `npx vitest run __tests__/time-tracking-global/global-view.test.ts -x` | Wave 0 |
| TIME-02 | TimeEntryModal accepts optional projectId | unit | `npx vitest run __tests__/time-tracking-global/global-view.test.ts -x` | Wave 0 |
| TIME-03 | WorkspaceTabs no longer contains 'time' subtab | unit | `npx vitest run __tests__/time-tracking-global/workspace-tabs.test.ts -x` | Wave 0 |
| TIME-03 | Old /customer/[id]/time route redirects to /time-tracking | smoke | manual — verify redirect in browser | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run __tests__/time-tracking-global/ --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `__tests__/time-tracking-global/global-view.test.ts` — covers TIME-01, TIME-02 (component behavior, project dropdown, weekly grouping)
- [ ] `__tests__/time-tracking-global/api-endpoint.test.ts` — covers TIME-01 (GET /api/time-entries cross-project query shape, filter params)
- [ ] `__tests__/time-tracking-global/workspace-tabs.test.ts` — covers TIME-03 (TAB_GROUPS no longer contains time subtab)
- [ ] `tests/__mocks__/` — existing mock stubs for `server-only` and `@xyflow/react` already present; no new framework install needed

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `bigpanda-app/` source — TimeTab.tsx, TimeEntryModal.tsx, CalendarImportModal.tsx, Sidebar.tsx, WorkspaceTabs.tsx, all time-entries API routes
- Direct inspection of all 24 migration SQL files — confirms `time_entries` has NO RLS
- `lib/time-tracking.ts` — all helpers confirmed reusable as-is
- `lib/auth-server.ts` — requireSession() pattern confirmed
- `vitest.config.ts` — test framework and alias configuration confirmed

### Secondary (MEDIUM confidence)
- Next.js App Router `redirect()` from `next/navigation` — documented pattern, consistent with existing usage in codebase (Phase 26 proxy.ts, Phase 27 SubTabBar)
- `useSearchParams()` requiring Suspense boundary — confirmed by Next.js documentation; existing code in `WorkspaceTabs.tsx` uses `useSearchParams()` wrapped at the page level

### Tertiary (LOW confidence)
- None — all findings are from direct source inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages needed; entire stack confirmed from package.json and existing imports
- Architecture: HIGH — derived from reading actual source code of all affected components and routes
- Pitfalls: HIGH — RLS absence confirmed in 24 migration files; bulk scoping confirmed in route source; useSearchParams/Suspense is a known Next.js constraint
- Open questions: MEDIUM — GET /api/projects absence confirmed by reading route.ts; workaround is known

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable stack — no fast-moving dependencies)
