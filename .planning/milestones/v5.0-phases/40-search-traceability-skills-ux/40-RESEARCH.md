# Phase 40: Search, Traceability & Skills UX - Research

**Researched:** 2026-04-06
**Domain:** Full-text search UX, audit log queries, BullMQ job management, client-side filtering patterns
**Confidence:** HIGH

## Summary

Phase 40 adds four independent UX improvements: global search, Decisions tab filtering, artifact reverse lookup, audit-driven engagement history, and skill job progress/cancellation. All features build on existing infrastructure — the FTS API is already built, audit_log table exists, BullMQ is running, and Radix UI components are installed.

**Key findings:**
- `/api/search` FTS endpoint is complete with all entity types indexed — zero new API work for global search
- Client-side filtering pattern from Phase 37 (ActionsTableClient) extends perfectly to Decisions tab
- `audit_log` table has `before_json`/`after_json` columns for field-level diffs — history tab can show "Risk R-003: status open → mitigated"
- BullMQ `Queue.remove(jobId)` for pending jobs, but running jobs require worker cooperation (status override pattern)
- Radix UI Tabs already installed (`@radix-ui/react-tabs@1.1.13`) — two-tab ArtifactEditModal is straightforward

**Primary recommendation:** This is a "wire what exists" phase — 95% of the work is UI composition and query logic, not new infrastructure. Prioritize SRCH-01 (global search) first as it provides immediate value across all entity types.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Global search bar (SRCH-01):**
- Placement: in the workspace header (ProjectHeader area) — always visible, no extra interaction needed
- Results surface as a floating dropdown panel below the search bar — no page navigation
- Trigger: type-to-search, debounced ~300ms, minimum 2 characters (matches API validation)
- Results grouped by entity type in the dropdown: Actions, Risks, Milestones, Tasks, Decisions, Stakeholders — each section labelled with count (e.g. "Actions (3)")
- Each result shows ID + short excerpt + is a clickable link
- Click result → navigate to that entity's tab (dropdown closes)
- Uses existing `/api/search` FTS endpoint — no new API needed

**Decisions tab filtering (SRCH-02):**
- Text search input + date-range filter added above the decisions list
- Consistent with existing URL filter param pattern (`?q=`, `?from=`, `?to=`) — shareable, browser back works
- Decisions page converts to Server Component + Client Component island (consistent with ActionsTableClient pattern)
- Client-side filtering on already-fetched data (no additional API calls)

**Engagement History + audit log (HIST-01):**
- Unified chronological feed: existing append-only notes AND audit log entries coexist in one sorted-by-date timeline
- All entity types that write to `audit_log` are surfaced (risks, actions, milestones, tasks, stakeholders, artifacts, decisions)
- Each audit entry shows field-level diff: e.g. "Risk R-BP-003: status open → mitigated (changed by alex@bigpanda.io)" — uses `before_json`/`after_json` columns
- Notes retain their existing display style; audit entries get a distinct visual treatment (e.g. "Activity" badge vs note source badges)
- Requires a new query function to fetch audit log entries for a project (joining `entity_id` to project-scoped records)

**Artifact reverse lookup (ARTF-01):**
- `ArtifactEditModal` gets two tabs: **Details** (existing edit form, unchanged) and **Extracted Entities** (new)
- Extracted Entities tab shows entities grouped by type: Risks (N), Actions (N), Milestones (N), Decisions (N) — each as labelled sections
- Each entity item shows: ID + short description + clickable link
- Click entity link → navigate to that entity's tab (`/customer/[id]/risks`, `/customer/[id]/actions`, etc.); modal closes
- Reverse lookup query: for each entity type, `WHERE source_artifact_id = $artifactId` — all FKs already exist

**Skills job progress indicator (SKLS-01):**
- Progress lives on the skill card while a job is pending or running
- Shows: elapsed time counter (e.g. "2m 14s") + spinner replacing the current static badge
- Elapsed time: client-side `setInterval` ticking every second (no API call for the counter)
- Status polling: separate `setInterval` every 5 seconds calling `/api/skills/runs/[runId]` to check if job completed or failed — auto-stops polling and clears timer when terminal state reached

**Skills job cancel (SKLS-02):**
- Cancel button appears on the skill card for jobs in `pending` or `running` state
- Immediate cancel — no confirmation dialog (consistent with inline edit UX: no extra confirm step)
- Cancel calls a new endpoint (e.g. `DELETE /api/skills/runs/[runId]` or `POST /api/skills/runs/[runId]/cancel`)
- After cancel: card returns to idle state, Recent Runs table entry marks as cancelled

### Claude's Discretion

- Exact elapsed time formatting (MM:SS vs "Xm Ys" vs "X seconds")
- Search dropdown max height and scroll behaviour (cap at ~400px, internal scroll)
- Whether the search bar shows a keyboard shortcut hint (e.g. "⌘K" label) or just placeholder text
- Decisions tab filter UI layout (same one-row toolbar as Actions, or a simpler two-input row above the list)
- Audit entry visual styling — badge colour / icon to distinguish activity from notes
- Which `audit_log` `action` values map to which display verb ("updated", "created", "deleted")
- BullMQ cancel implementation details (job removal vs status override for running jobs)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SRCH-01 | Global search bar accessible from workspace header searches across all project data using existing FTS API | `/api/search` endpoint complete, returns SearchResult[] grouped by entity type, debounced client-side input pattern |
| SRCH-02 | Decisions tab supports text search and date-range filtering | ActionsTableClient pattern (Server Component + Client island with URL params) extends directly, client-side Array.filter() on text + date fields |
| ARTF-01 | Artifact detail view shows all entities extracted from that artifact with clickable links | All entity tables have `source_artifact_id` FK, reverse lookup is simple `WHERE` query, Radix Tabs already installed for two-tab modal |
| HIST-01 | Engagement History tab surfaces audit log entries showing who changed what and when | `audit_log` table exists with `before_json`/`after_json` for field diffs, new query joins entity_id to project-scoped entities, unified feed sorts by created_at |
| SKLS-01 | Skills tab shows elapsed time and progress indicator for running/queued jobs | Client-side setInterval for elapsed time counter, separate 5-second polling to `/api/skills/runs/[runId]` for status checks |
| SKLS-02 | User can cancel queued or in-progress skill job | BullMQ Queue.remove() for pending jobs, running jobs need status override in skill_runs + worker cooperation, new cancel endpoint |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.0 | React framework | Already project stack, Server Components + Client islands pattern established in Phase 37 |
| Radix UI Tabs | 1.1.13 | Accessible tab component | Already installed, used for two-tab ArtifactEditModal (Details + Extracted Entities) |
| Radix UI Popover | 1.1.15 | Accessible popover | Already installed, perfect for global search dropdown positioning and click-outside behaviour |
| BullMQ | 5.71.0 | Job queue | Already project stack, powers all skill runs, cancellation uses Queue.remove() API |
| Drizzle ORM | 0.45.1 | Database queries | Already project stack, audit log queries use existing join patterns |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React hooks | 19.2.4 | useState, useEffect, useCallback | Debounced search, polling timers, client-side filter state |
| next/navigation | 16.2.0 | useRouter, useSearchParams | URL param management for Decisions filters (consistent with Phase 37 pattern) |
| PostgreSQL tsvector | Built-in | Full-text search | Already powering `/api/search`, no new FTS setup needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Radix Popover | Headless UI Popover | Radix already installed, no benefit to adding second library |
| Client-side debounce | Third-party library (lodash.debounce) | Vanilla useEffect + setTimeout is 8 lines, no dependency needed |
| BullMQ Queue.remove() | Custom job cancellation table | BullMQ has native API, custom solution adds complexity |

**Installation:**
No new packages required — all dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
app/
├── api/
│   ├── search/route.ts              # [EXISTS] FTS endpoint
│   └── skills/
│       └── runs/
│           └── [runId]/
│               ├── route.ts          # [EXISTS] GET status
│               └── cancel/
│                   └── route.ts      # [NEW] POST cancel
components/
├── ProjectHeader.tsx                 # [MODIFY] Add GlobalSearchBar
├── GlobalSearchBar.tsx               # [NEW] Search input + dropdown
├── ArtifactEditModal.tsx             # [MODIFY] Add Tabs wrapper
├── SkillsTabClient.tsx               # [MODIFY] Add progress + cancel
└── DecisionsTableClient.tsx          # [NEW] Client island for filtering
lib/
└── queries.ts                        # [MODIFY] Add getAuditLogForProject()
```

### Pattern 1: Debounced Search with useEffect
**What:** Input triggers API call after N milliseconds of inactivity
**When to use:** Global search bar (300ms debounce), any type-to-search UI
**Example:**
```typescript
// Source: Established React pattern, verified in ActionsTableClient
function GlobalSearchBar({ projectId }: { projectId: number }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&account=${projectId}`)
      const data = await res.json()
      setResults(data.results ?? [])
      setLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, projectId])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search actions, risks, milestones..."
        />
      </PopoverTrigger>
      <PopoverContent>
        {loading && <Spinner />}
        {results.map(r => <ResultItem key={r.id} result={r} />)}
      </PopoverContent>
    </Popover>
  )
}
```

### Pattern 2: Server Component + Client Island with URL Filters
**What:** Page is Server Component, filtering logic lives in Client Component using URL params
**When to use:** Decisions tab filtering (consistent with ActionsTableClient from Phase 37)
**Example:**
```typescript
// app/customer/[id]/decisions/page.tsx (Server Component)
export default async function DecisionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = parseInt(id, 10)
  const data = await getWorkspaceData(projectId)

  return <DecisionsTableClient decisions={data.keyDecisions} projectId={projectId} />
}

// components/DecisionsTableClient.tsx (Client Component)
'use client'
export function DecisionsTableClient({ decisions }: { decisions: KeyDecision[] }) {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const fromDate = searchParams.get('from') ?? ''
  const toDate = searchParams.get('to') ?? ''

  const filtered = useMemo(() => {
    let result = decisions
    if (q) result = result.filter(d => d.decision.toLowerCase().includes(q.toLowerCase()))
    if (fromDate) result = result.filter(d => d.date >= fromDate)
    if (toDate) result = result.filter(d => d.date <= toDate)
    return result
  }, [decisions, q, fromDate, toDate])

  // Render filtered list with filter controls...
}
```

### Pattern 3: Audit Log with JSONB Field Diffs
**What:** Query `audit_log` table, extract field changes from `before_json` and `after_json`
**When to use:** Engagement History unified feed (HIST-01)
**Example:**
```typescript
// lib/queries.ts
export async function getAuditLogForProject(projectId: number) {
  // Join audit_log to each entity type to filter by project_id
  const results = await db.execute(sql`
    SELECT
      a.id, a.entity_type, a.entity_id, a.action, a.actor_id,
      a.before_json, a.after_json, a.created_at,
      CASE
        WHEN a.entity_type = 'risks' THEN r.external_id
        WHEN a.entity_type = 'actions' THEN ac.external_id
        WHEN a.entity_type = 'milestones' THEN m.external_id
        ELSE NULL
      END as external_id
    FROM audit_log a
    LEFT JOIN risks r ON a.entity_type = 'risks' AND a.entity_id = r.id
    LEFT JOIN actions ac ON a.entity_type = 'actions' AND a.entity_id = ac.id
    LEFT JOIN milestones m ON a.entity_type = 'milestones' AND a.entity_id = m.id
    WHERE (r.project_id = ${projectId} OR ac.project_id = ${projectId} OR m.project_id = ${projectId})
    ORDER BY a.created_at DESC
  `)

  // Client-side: compute field diffs
  function computeDiff(before: any, after: any): string {
    const changes = []
    for (const key in after) {
      if (before[key] !== after[key]) {
        changes.push(`${key}: ${before[key] ?? 'null'} → ${after[key]}`)
      }
    }
    return changes.join(', ')
  }
}
```

### Pattern 4: Client-Side Polling with Auto-Stop
**What:** setInterval polls API every N seconds until terminal state reached
**When to use:** Skills job progress (SKLS-01)
**Example:**
```typescript
// components/SkillsTabClient.tsx
const [runningJobs, setRunningJobs] = useState<Map<string, { runId: string, startedAt: Date }>>(new Map())

useEffect(() => {
  if (runningJobs.size === 0) return

  const statusInterval = setInterval(async () => {
    for (const [skillName, { runId }] of runningJobs) {
      const res = await fetch(`/api/skills/runs/${runId}`)
      const data = await res.json()

      if (data.status === 'completed' || data.status === 'failed') {
        setRunningJobs(prev => {
          const next = new Map(prev)
          next.delete(skillName)
          return next
        })
        router.refresh() // Update Recent Runs list
      }
    }
  }, 5000)

  return () => clearInterval(statusInterval)
}, [runningJobs, router])

// Elapsed time display (separate 1-second ticker)
const elapsed = Math.floor((Date.now() - job.startedAt.getTime()) / 1000)
const minutes = Math.floor(elapsed / 60)
const seconds = elapsed % 60
return <span>{minutes}m {seconds}s</span>
```

### Pattern 5: Reverse Lookup via Foreign Key
**What:** Query entities WHERE source_artifact_id = X
**When to use:** Artifact Extracted Entities tab (ARTF-01)
**Example:**
```typescript
// lib/queries.ts
export async function getEntitiesExtractedFromArtifact(artifactId: number) {
  const [risks, actions, milestones, decisions] = await Promise.all([
    db.select().from(risks).where(eq(risks.source_artifact_id, artifactId)),
    db.select().from(actions).where(eq(actions.source_artifact_id, artifactId)),
    db.select().from(milestones).where(eq(milestones.source_artifact_id, artifactId)),
    db.select().from(keyDecisions).where(eq(keyDecisions.source_artifact_id, artifactId)),
  ])
  return { risks, actions, milestones, decisions }
}

// components/ArtifactEditModal.tsx (add Tabs wrapper)
<Tabs defaultValue="details">
  <TabsList>
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="extracted">Extracted Entities</TabsTrigger>
  </TabsList>
  <TabsContent value="details">
    {/* Existing form */}
  </TabsContent>
  <TabsContent value="extracted">
    <h3>Risks ({extractedRisks.length})</h3>
    {extractedRisks.map(r => <Link href={`/customer/${projectId}/risks`}>{r.external_id}: {r.description}</Link>)}
  </TabsContent>
</Tabs>
```

### Anti-Patterns to Avoid

- **Debouncing on every keystroke without cleanup**: Always return cleanup function from useEffect to cancel pending timers
- **Polling without terminal check**: Always stop setInterval when job reaches completed/failed state to avoid infinite API calls
- **Hardcoding entity type navigation**: Use a lookup map for entity type → tab path (risks → `/customer/[id]/risks`)
- **Fetching audit log on every render**: Query once on page load, merge with existing notes array, sort by date
- **BullMQ Queue instance reuse**: Always create fresh Queue instance for each API call, call .close() after operation (connection leak prevention)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible dropdown | Custom div with z-index positioning | Radix Popover | Keyboard nav, focus trap, click-outside, ARIA attributes — 500+ lines to do correctly |
| Tab component | Custom button group with conditional rendering | Radix Tabs | ARIA roles, keyboard navigation, URL sync support |
| Date range parsing | Custom regex for ISO dates | Existing ActionsTableClient pattern | Already handles "TBD", "2026-Q3", ISO dates — regex exists |
| Job cancellation | Custom "cancelled" flag without queue coordination | BullMQ Queue.remove() | Race conditions: job might start between flag check and worker read |
| JSONB diff computation | Manual key-by-key comparison | Simple for-in loop with null checks | Only need changed fields, not full diff library |

**Key insight:** Phase 40 is UX composition, not infrastructure. Don't reinvent: debounce (8 lines), polling (12 lines), client-side filter (Array.filter). Custom solutions add bugs without benefit.

## Common Pitfalls

### Pitfall 1: Debounce Without Cleanup Causes Double API Calls
**What goes wrong:** User types "risk", debounce timer starts, user types "s" before timer fires — two API calls fire for "risk" and "risks"
**Why it happens:** useEffect dependency array changes, old timer not cancelled
**How to avoid:** Always return cleanup function:
```typescript
useEffect(() => {
  const timer = setTimeout(() => { /* API call */ }, 300)
  return () => clearTimeout(timer) // CRITICAL
}, [query])
```
**Warning signs:** Network tab shows multiple search requests for same query prefix

### Pitfall 2: BullMQ Queue Connection Leak
**What goes wrong:** API route creates Queue instance, doesn't call .close(), Redis connections accumulate until server crashes
**Why it happens:** BullMQ Queue creates persistent Redis connection, Next.js API routes are stateless — each request creates new Queue
**How to avoid:** Always call queue.close() in finally block:
```typescript
const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() })
try {
  await queue.remove(jobId)
} finally {
  await queue.close() // CRITICAL
}
```
**Warning signs:** Redis MONITOR shows growing connection count, server becomes unresponsive after ~100 requests

### Pitfall 3: Cancelling Running Jobs Requires Worker Cooperation
**What goes wrong:** Call `queue.remove(jobId)` on a job that's already running — job keeps running, but disappears from queue UI
**Why it happens:** BullMQ can only remove pending jobs; running jobs are locked by Worker
**How to avoid:** Two-phase cancel: (1) Set `skill_runs.status = 'cancelled'` in DB, (2) Worker checks status before each chunk write
**Warning signs:** Job disappears from Recent Runs but skill output still streams

### Pitfall 4: Audit Log Query Performance Without Project Filter
**What goes wrong:** Query `SELECT * FROM audit_log ORDER BY created_at` — scans entire table, grows linearly with total system activity
**Why it happens:** Audit log is cross-project, no project_id column (entity_id is foreign key to project-scoped tables)
**How to avoid:** Always join to entity table and filter by project_id:
```sql
SELECT a.* FROM audit_log a
JOIN risks r ON a.entity_type = 'risks' AND a.entity_id = r.id
WHERE r.project_id = $1
```
**Warning signs:** History tab takes >1 second to load on projects with <100 entities

### Pitfall 5: Search Dropdown Stays Open After Navigation
**What goes wrong:** User clicks search result, navigates to entity tab, search dropdown still visible
**Why it happens:** Radix Popover controlled state not cleared on navigation
**How to avoid:** Set open state to false in result click handler:
```typescript
function handleResultClick(result: SearchResult) {
  setOpen(false) // Close dropdown
  router.push(`/customer/${projectId}/${result.table}`)
}
```
**Warning signs:** Search dropdown overlays new page content

### Pitfall 6: Polling Continues After Component Unmount
**What goes wrong:** User navigates away from Skills tab, setInterval keeps polling `/api/skills/runs/[runId]`
**Why it happens:** setInterval not cleared in useEffect cleanup
**How to avoid:** Return cleanup function:
```typescript
useEffect(() => {
  const interval = setInterval(() => { /* poll status */ }, 5000)
  return () => clearInterval(interval) // CRITICAL
}, [runningJobs])
```
**Warning signs:** Network tab shows API calls to `/api/skills/runs/[runId]` on unrelated pages

## Code Examples

Verified patterns from existing codebase:

### Global Search API Call with Debounce
```typescript
// Source: ActionsTableClient pattern + standard React debounce
'use client'
import { useState, useEffect } from 'react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

interface SearchResult {
  id: number
  table: string
  section: string
  project_id: number
  project_name: string
  customer: string
  date: string | null
  title: string
  snippet: string | null
}

export function GlobalSearchBar({ projectId }: { projectId: number }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&account=${projectId}`)
      const data = await res.json()
      setResults(data.results ?? [])
      setLoading(false)
      setOpen(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, projectId])

  const handleResultClick = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    router.push(`/customer/${projectId}/${result.table}`)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search actions, risks, milestones..."
          className="w-64 px-3 py-1.5 text-sm border rounded-md"
        />
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-96 overflow-y-auto">
        {loading && <p className="text-sm text-zinc-500">Searching...</p>}
        {!loading && results.length === 0 && query.length >= 2 && (
          <p className="text-sm text-zinc-500">No results found</p>
        )}
        {!loading && results.length > 0 && (
          <div className="space-y-4">
            {Object.entries(groupBySection(results)).map(([section, items]) => (
              <div key={section}>
                <h3 className="text-xs font-semibold text-zinc-700 mb-2">
                  {section} ({items.length})
                </h3>
                <div className="space-y-1">
                  {items.map((item) => (
                    <button
                      key={`${item.table}-${item.id}`}
                      onClick={() => handleResultClick(item)}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-zinc-100 text-sm"
                    >
                      <div className="font-medium">{item.title}</div>
                      {item.snippet && (
                        <div className="text-xs text-zinc-500 truncate">{item.snippet}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function groupBySection(results: SearchResult[]) {
  return results.reduce((acc, r) => {
    if (!acc[r.section]) acc[r.section] = []
    acc[r.section].push(r)
    return acc
  }, {} as Record<string, SearchResult[]>)
}
```

### Client-Side Filtering with URL Params (Decisions)
```typescript
// Source: ActionsTableClient pattern from Phase 37
'use client'
import { useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { KeyDecision } from '@/lib/queries'

export function DecisionsTableClient({ decisions }: { decisions: KeyDecision[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const q = searchParams.get('q') ?? ''
  const fromDate = searchParams.get('from') ?? ''
  const toDate = searchParams.get('to') ?? ''

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  const filtered = useMemo(() => {
    let result = decisions

    if (q) {
      const lowerQ = q.toLowerCase()
      result = result.filter(d =>
        d.decision.toLowerCase().includes(lowerQ) ||
        d.context?.toLowerCase().includes(lowerQ)
      )
    }

    if (fromDate) {
      result = result.filter(d => {
        const date = d.date ?? new Date(d.created_at).toISOString().split('T')[0]
        return date >= fromDate
      })
    }

    if (toDate) {
      result = result.filter(d => {
        const date = d.date ?? new Date(d.created_at).toISOString().split('T')[0]
        return date <= toDate
      })
    }

    return result.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [decisions, q, fromDate, toDate])

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search decisions..."
          value={q}
          onChange={(e) => updateParam('q', e.target.value)}
          className="flex-1 px-3 py-2 border rounded-md text-sm"
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => updateParam('from', e.target.value)}
          className="px-3 py-2 border rounded-md text-sm"
          placeholder="From"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => updateParam('to', e.target.value)}
          className="px-3 py-2 border rounded-md text-sm"
          placeholder="To"
        />
      </div>
      <div className="space-y-4">
        {filtered.map(decision => (
          <div key={decision.id} className="border rounded-lg p-4">
            <p className="text-sm">{decision.decision}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Audit Log Query with Project Filter
```typescript
// lib/queries.ts
import { sql } from 'drizzle-orm'

export interface AuditLogEntry {
  id: number
  entity_type: string
  entity_id: number
  external_id: string | null
  action: string
  actor_id: string | null
  before_json: Record<string, any> | null
  after_json: Record<string, any> | null
  created_at: Date
}

export async function getAuditLogForProject(projectId: number): Promise<AuditLogEntry[]> {
  // Join audit_log to each entity type to filter by project_id
  const results = await db.execute(sql`
    SELECT
      a.id,
      a.entity_type,
      a.entity_id,
      a.action,
      a.actor_id,
      a.before_json,
      a.after_json,
      a.created_at,
      CASE
        WHEN a.entity_type = 'risks' THEN r.external_id
        WHEN a.entity_type = 'actions' THEN ac.external_id
        WHEN a.entity_type = 'milestones' THEN m.external_id
        WHEN a.entity_type = 'tasks' THEN CAST(t.id AS TEXT)
        ELSE NULL
      END as external_id
    FROM audit_log a
    LEFT JOIN risks r ON a.entity_type = 'risks' AND a.entity_id = r.id
    LEFT JOIN actions ac ON a.entity_type = 'actions' AND a.entity_id = ac.id
    LEFT JOIN milestones m ON a.entity_type = 'milestones' AND a.entity_id = m.id
    LEFT JOIN tasks t ON a.entity_type = 'tasks' AND a.entity_id = t.id
    LEFT JOIN stakeholders s ON a.entity_type = 'stakeholders' AND a.entity_id = s.id
    LEFT JOIN artifacts art ON a.entity_type = 'artifacts' AND a.entity_id = art.id
    LEFT JOIN key_decisions kd ON a.entity_type = 'decisions' AND a.entity_id = kd.id
    WHERE
      (r.project_id = ${projectId} OR
       ac.project_id = ${projectId} OR
       m.project_id = ${projectId} OR
       t.project_id = ${projectId} OR
       s.project_id = ${projectId} OR
       art.project_id = ${projectId} OR
       kd.project_id = ${projectId})
    ORDER BY a.created_at DESC
  `)

  return results.rows as AuditLogEntry[]
}

// Compute field-level diff for display
export function computeAuditDiff(before: Record<string, any> | null, after: Record<string, any> | null): string {
  if (!before || !after) return 'Created'

  const changes: string[] = []
  for (const key in after) {
    if (before[key] !== after[key]) {
      changes.push(`${key}: ${before[key] ?? 'null'} → ${after[key]}`)
    }
  }
  return changes.join(', ') || 'No changes'
}
```

### Skills Job Progress Polling
```typescript
// components/SkillsTabClient.tsx
'use client'
import { useState, useEffect } from 'react'

interface RunningJob {
  runId: string
  startedAt: Date
}

export function SkillsTabClient({ projectId }: { projectId: number }) {
  const [runningJobs, setRunningJobs] = useState<Map<string, RunningJob>>(new Map())
  const router = useRouter()

  // Status polling: check every 5 seconds
  useEffect(() => {
    if (runningJobs.size === 0) return

    const interval = setInterval(async () => {
      for (const [skillName, { runId }] of runningJobs) {
        try {
          const res = await fetch(`/api/skills/runs/${runId}`)
          const data = await res.json()

          if (data.status === 'completed' || data.status === 'failed') {
            setRunningJobs(prev => {
              const next = new Map(prev)
              next.delete(skillName)
              return next
            })
            router.refresh() // Update Recent Runs list
          }
        } catch (err) {
          console.error(`Polling error for ${skillName}:`, err)
        }
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [runningJobs, router])

  // Render elapsed time for each running job
  function ElapsedTime({ startedAt }: { startedAt: Date }) {
    const [elapsed, setElapsed] = useState(0)

    useEffect(() => {
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000))
      }, 1000)

      return () => clearInterval(interval)
    }, [startedAt])

    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60
    return <span className="text-xs text-zinc-500">{minutes}m {seconds}s</span>
  }

  // ... rest of component
}
```

### BullMQ Job Cancellation
```typescript
// app/api/skills/runs/[runId]/cancel/route.ts
import { NextResponse } from 'next/server'
import { Queue } from 'bullmq'
import { createApiRedisConnection } from '@/worker/connection'
import db from '@/db'
import { skillRuns } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireSession } from '@/lib/auth-server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { session, redirectResponse } = await requireSession()
  if (redirectResponse) return redirectResponse

  const { runId } = await params

  try {
    // 1. Update DB status to 'cancelled' (worker checks this)
    const [run] = await db
      .update(skillRuns)
      .set({ status: 'cancelled' as const, completed_at: new Date() })
      .where(eq(skillRuns.run_id, runId))
      .returning()

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    // 2. Remove from BullMQ queue if still pending
    const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() as any })
    try {
      const jobId = `skill-run-${runId}`
      await queue.remove(jobId) // No-op if job already started
    } finally {
      await queue.close() // CRITICAL: prevent connection leak
    }

    return NextResponse.json({ success: true, status: 'cancelled' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

## Validation Architecture

> Nyquist validation enabled in .planning/config.json

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 + @testing-library/react 16.3.2 |
| Config file | vitest.config.ts |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SRCH-01 | Global search bar triggers debounced API call with min 2 chars | unit | `npm test tests/search/global-search.test.tsx -- --run -x` | ❌ Wave 0 |
| SRCH-01 | Search results group by entity type and navigate on click | integration | `npm test tests/search/global-search.test.tsx -- --run -x` | ❌ Wave 0 |
| SRCH-02 | Decisions tab filters by text and date range using URL params | unit | `npm test tests/search/decisions-filter.test.tsx -- --run -x` | ❌ Wave 0 |
| ARTF-01 | Artifact modal shows extracted entities grouped by type with links | integration | `npm test tests/artifacts/extracted-entities.test.tsx -- --run -x` | ❌ Wave 0 |
| HIST-01 | Engagement history merges audit log entries with notes in chronological order | unit | `npm test tests/history/audit-log-feed.test.tsx -- --run -x` | ❌ Wave 0 |
| HIST-01 | Audit log entries show field-level diffs from before_json/after_json | unit | `npm test tests/history/audit-log-feed.test.tsx -- --run -x` | ❌ Wave 0 |
| SKLS-01 | Skills tab shows elapsed time counter for running jobs | unit | `npm test tests/skills/job-progress.test.tsx -- --run -x` | ❌ Wave 0 |
| SKLS-01 | Skills tab polls status every 5s and stops on completion | unit | `npm test tests/skills/job-progress.test.tsx -- --run -x` | ❌ Wave 0 |
| SKLS-02 | Cancel button removes pending job from queue and updates DB status | integration | `npm test tests/skills/job-cancel.test.tsx -- --run -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test tests/search/ tests/artifacts/ tests/history/ tests/skills/ -- --run -x` (phase-specific tests)
- **Per wave merge:** `npm test -- --run` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/search/global-search.test.tsx` — covers SRCH-01 (debounce, grouping, navigation)
- [ ] `tests/search/decisions-filter.test.tsx` — covers SRCH-02 (URL params, client-side filter)
- [ ] `tests/artifacts/extracted-entities.test.tsx` — covers ARTF-01 (reverse lookup, tabs, links)
- [ ] `tests/history/audit-log-feed.test.tsx` — covers HIST-01 (merge, diffs)
- [ ] `tests/skills/job-progress.test.tsx` — covers SKLS-01 (elapsed time, polling)
- [ ] `tests/skills/job-cancel.test.tsx` — covers SKLS-02 (cancel endpoint, queue removal)

## Sources

### Primary (HIGH confidence)
- `/app/api/search/route.ts` - FTS API implementation, verified 2-char min, SearchResult shape
- `/components/ActionsTableClient.tsx` - Client-side filtering pattern, URL params, useMemo
- `/db/schema.ts` - audit_log table structure (before_json, after_json, entity_type, entity_id)
- `/components/SkillsTabClient.tsx` - Existing skills UI, running Set pattern, error handling
- `/app/api/skills/runs/[runId]/route.ts` - Status endpoint for polling
- `/worker/index.ts` - BullMQ Worker setup, job handler pattern
- `package.json` - Radix UI Tabs 1.1.13, Popover 1.1.15, BullMQ 5.71.0 confirmed
- `.planning/STATE.md` - Phase 37 pattern decisions (Server+Client islands, URL params)

### Secondary (MEDIUM confidence)
- React debounce pattern (useEffect + setTimeout + cleanup) - standard React pattern, no external library needed
- BullMQ Queue.remove() API - official BullMQ documentation pattern for job cancellation
- PostgreSQL CASE expressions for multi-table joins - standard SQL pattern for union-like queries with type discrimination

### Tertiary (LOW confidence)
- None — all findings verified against existing codebase or standard library documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already installed, versions verified in package.json
- Architecture: HIGH - All patterns exist in Phase 37/39 code, audit_log table confirmed in schema
- Pitfalls: MEDIUM-HIGH - Debounce cleanup, BullMQ connection leak, running job cancellation verified in codebase patterns; polling cleanup is standard React knowledge

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (30 days — stable domain, Next.js 16 + React 19 + BullMQ 5 are current releases)
