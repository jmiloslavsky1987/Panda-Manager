# Phase 48: Architecture & Team Engagement - Research

**Researched:** 2026-04-08
**Domain:** UI implementation with @dnd-kit drag-and-drop, optimistic updates, read-only dashboard aggregation
**Confidence:** HIGH

## Summary

Phase 48 builds two UI features using existing database schema (seeded in Phase 45): (1) Architecture tab enhancements — wire `arch_nodes`/`arch_tracks` into the existing diagram, add click-to-cycle status badges on column headers, and column drag-reordering with `display_order` persistence; (2) Team Engagement Overview — a new read-only sub-tab aggregating structured data into a visual reference styled after the provided HTML reference.

The project already has all necessary infrastructure: @dnd-kit installed (v6.3.1 core, v10.0.0 sortable), established optimistic UI patterns, proven reorder API patterns from Phase 47 WBS, and the target schema already seeded. This is purely UI wiring work — no schema changes, no new libraries, no extraction changes.

**Primary recommendation:** Follow established Phase 47 patterns exactly. Copy WBS reorder API structure for arch node column reordering. Use existing `InlineSelectCell` optimistic UI pattern for status cycling (or adapt for click-to-cycle). Reuse existing component architecture (server RSC + client islands). No new technical research needed — this is pattern application.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Architecture diagram — data model
- `arch_nodes` defines the 5 stage COLUMNS per track (replaces hardcoded `ADR_PHASES`/`BIGGY_PHASES` arrays in `InteractiveArchGraph.tsx`)
- `architecture_integrations` tool cards still render inside each column — no change to that layer
- Track names read from `arch_tracks` DB records (not hardcoded)
- Track switcher pills ("ADR Track" | "Biggy AI Track") read from seeded `arch_tracks` rows
- `getArchNodes(projectId)` is the query — already implemented in `lib/queries.ts`

#### Stage status — display and editing
- Each stage column header shows the `arch_node.status` as a colored badge: `planned` (zinc), `in_progress` (blue), `live` (green)
- Clicking the status badge cycles: `planned → in_progress → live → planned`
- PATCH `/api/projects/[projectId]/arch-nodes/[nodeId]` fires on click — follow existing optimistic UI pattern (app-wide standard)
- Stage notes (`arch_node.notes`) appear as a tooltip on hover — read-only, extraction-populated

#### Column drag and reorder
- @dnd-kit/sortable for left-to-right column reordering (already installed from Phase 3/47)
- Drag end fires PATCH to update `display_order` on affected `arch_nodes` rows
- API: PATCH `/api/projects/[projectId]/arch-nodes/reorder` — bulk update display_order array
- No position_x/y columns needed — `display_order` (already on schema) is sufficient

#### Team Onboarding Status table
- Stays on existing `team_onboarding_status` table (fixed 5-column schema)
- `TeamOnboardingTable` component unchanged — matches screenshots exactly
- `arch_team_status` table (Phase 45) is NOT used in Phase 48

#### Team Engagement Overview — structure
- New "Overview" sub-tab added within the Teams tab (alongside existing "Detail" sub-tab)
- 4 sections rendered (Architecture section from reference HTML is excluded):
  1. **Business Value & Expected Outcomes** — reads `businessOutcomes` table
  2. **End-to-End Workflows** — reads `e2eWorkflows` + `e2eWorkflowSteps` tables
  3. **Teams & Engagement Status** — reads `team_onboarding_status` + `architecture_integrations` (per-team progress)
  4. **Top Focus Areas** — reads `focusAreas` table
- **Read-only snapshot** — no add/edit/delete controls anywhere in the Overview sub-tab
- Users edit data in their respective source tabs (Actions, existing Teams Detail, etc.)

#### Team Engagement Overview — visual design
- Reference: `AMEX_Team_Engagement_2026-03-17.html` (archived at `/Users/jmiloslavsky/Documents/BigPanda Projects/Archive/`)
- Section 1 (Outcomes): Grid of outcome cards — icon, title, ADR/Biggy/E2E pills, description, status footer badge
- Section 2 (E2E Workflows): Workflow cards — pill badge, title, horizontal stepped flow with colored track labels and status badges per step
- Section 3 (Teams): Grid of team cards per team — track sections (ADR/Biggy) with status-icon bullet lists + open items box. Same HTML card structure, bullets ≤10 words each (snappier than reference)
- Section 4 (Focus Areas): Focus cards — color-coded left border, title, "Why" text, status box, owners line
- Status icon system (CSS `::before`): ✓ Live (green), ◐ In Progress (amber), ○ Planned (gray), ⚠ Blocked (red), → Future (blue)
- Track pills: `.pill-adr` (blue), `.pill-biggy` (purple), `.pill-e2e` (green)
- Workflow badge per team card: "Workflow Known" (green), "Partial" (yellow), "Unknown" (gray)

#### Team Engagement Overview — missing data warnings
- `WarnBanner` component (already in `components/teams/`) shown at section top when source table has zero records
- Triggers: `businessOutcomes.length === 0`, `e2eWorkflows.length === 0`, `teamOnboardingStatus.length === 0`, `focusAreas.length === 0`

### Claude's Discretion
- Exact PATCH response handling and optimistic rollback for arch_node status cycling
- @dnd-kit collision detection strategy for column reordering (arrayMove vs custom)
- CSS implementation of status icon system for Team Engagement bullets (Tailwind utility classes vs inline style)
- Sub-tab bar implementation within Teams tab (reuse `SubTabBar` or simple tab buttons)
- Page-level header styling for Team Engagement Overview (gradient or plain header)
- Whether to extract a shared `TrackPill` component or use inline Tailwind classes

### Deferred Ideas (OUT OF SCOPE)
- `arch_team_status` table (Phase 45) — seeded per project but not rendered in Phase 48; may be used in a future phase
- `team_engagement_sections` blobs (Phase 45) — not used for UI in Phase 48; may serve extraction/reporting purposes later
- Editing Team Engagement Overview content directly — user confirmed read-only is correct; edit happens in source tabs
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ARCH-01 | Architecture tab displays two sub-tabs: Before State (legacy flow with customer pain points) and Current & Future State | Existing `WorkflowDiagram` component already implements two-tab structure; wire `getArchNodes()` data to replace hardcoded arrays |
| ARCH-02 | Current & Future State shows ADR Track and AI Assistant Track with per-node status indicators (Live / In Progress / Planned) | `arch_nodes` schema has `status` enum (planned/in_progress/live); status cycling pattern from WBS; colored badges follow Phase 47 precedent |
| ARCH-03 | Team Onboarding Status table below both tracks shows per-team, per-capability-stage status with colored indicators | `TeamOnboardingTable` component exists and unchanged; uses `team_onboarding_status` table (not `arch_team_status`) |
| TEAM-01 | Teams sub-tab displays 5-section engagement map: Business Outcomes, Architecture, E2E Workflows, Teams & Engagement, Top Focus Areas | HTML reference provides exact visual design; `getTeamsTabData()` already returns all needed data; Architecture section explicitly excluded per CONTEXT.md |
| TEAM-03 | Sections with missing or incomplete data display visible warning prompting user to add content | `WarnBanner` component already exists in `components/teams/`; trigger on zero-length arrays |
| TEAM-04 | User can manually edit all fields in every section of the Team Engagement Map | Read-only snapshot per CONTEXT.md — editing happens in source tabs (not in Overview); requirement satisfied by existing edit flows in other tabs |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | ^6.3.1 | Drag-and-drop context provider | Industry-standard React DnD library; collision detection, pointer sensors, accessibility built-in |
| @dnd-kit/sortable | ^10.0.0 | Sortable list/grid utilities | Official sortable extension; handles horizontal reordering, provides `useSortable` hook |
| @dnd-kit/utilities | ^3.2.2 | Transform and array manipulation | Provides `CSS.Transform.toString()` for smooth drag transforms and `arrayMove` utility |
| Next.js 16 | 16.2.0 | Framework (already in use) | Server Components + client islands pattern; `useRouter()` for refresh after mutations |
| Drizzle ORM | ^0.45.1 | Database layer (already in use) | Type-safe queries; `getArchNodes()` and `getTeamsTabData()` already implemented |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | ^2.0.7 | Toast notifications | Error feedback after failed PATCH requests (app-wide standard) |
| lucide-react | ^0.577.0 | Icon library | Chevron icons for expand/collapse, plus/trash for actions (if needed) |
| Radix UI Tooltip | ^1.2.8 | Tooltip component | Display `arch_node.notes` on hover over stage column headers |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit | react-dnd | @dnd-kit already installed; react-dnd would require new dependency and API learning curve |
| Custom status cycle | Inline select dropdown | Click-to-cycle is faster UX for 3-state enum; dropdown adds visual weight |
| Router.refresh() | React Query / SWR | Project uses server-driven refresh pattern throughout; introducing client-side cache now would create inconsistency |

**Installation:**
```bash
# All dependencies already installed
# Verify:
npm list @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── customer/[id]/
│   ├── architecture/
│   │   └── page.tsx                  # Add getArchNodes() call, pass to WorkflowDiagram
│   └── teams/
│       └── page.tsx                  # Add sub-tab structure, new Overview tab
components/
├── arch/
│   ├── InteractiveArchGraph.tsx      # Replace ADR_PHASES/BIGGY_PHASES with arch_nodes data
│   ├── WorkflowDiagram.tsx           # Add tracks/nodes props
│   └── TeamOnboardingTable.tsx       # Unchanged
├── teams/
│   ├── TeamEngagementOverview.tsx    # NEW: Overview sub-tab component
│   ├── BusinessOutcomesSection.tsx   # Reuse for Overview
│   ├── E2eWorkflowsSection.tsx       # Reuse for Overview
│   ├── TeamsEngagementSection.tsx    # NEW: Teams section for Overview
│   ├── FocusAreasSection.tsx         # Reuse for Overview
│   └── WarnBanner.tsx                # Already exists
app/api/projects/[projectId]/
├── arch-nodes/
│   ├── [nodeId]/
│   │   └── route.ts                  # NEW: PATCH for status cycling
│   └── reorder/
│       └── route.ts                  # NEW: PATCH for column drag-reorder
```

### Pattern 1: Server Component Data Fetch → Client Island
**What:** RSC fetches data, passes to client component for interactivity
**When to use:** Standard pattern for all pages in this project
**Example:**
```typescript
// app/customer/[id]/architecture/page.tsx (SERVER)
import { getArchTabData, getArchNodes } from '@/lib/queries'
import { WorkflowDiagram } from '@/components/arch/WorkflowDiagram'

export default async function ArchitecturePage({ params }: { params: { id: string } }) {
  const projectId = parseInt(params.id, 10)
  const [data, archData] = await Promise.all([
    getArchTabData(projectId),
    getArchNodes(projectId),
  ])

  return <WorkflowDiagram
    projectId={projectId}
    {...data}
    tracks={archData.tracks}
    nodes={archData.nodes}
  />
}
```

### Pattern 2: Optimistic UI with Router Refresh
**What:** Update UI immediately, fire PATCH, rollback on error
**When to use:** All mutations that need instant feedback
**Example:**
```typescript
// Adapted from components/InlineSelectCell.tsx
const [optimisticStatus, setOptimisticStatus] = useState(node.status)

async function handleStatusClick() {
  const statusCycle = { planned: 'in_progress', in_progress: 'live', live: 'planned' }
  const newStatus = statusCycle[optimisticStatus]
  const previousStatus = optimisticStatus

  setOptimisticStatus(newStatus)

  try {
    const response = await fetch(`/api/projects/${projectId}/arch-nodes/${node.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })

    if (!response.ok) throw new Error('Status update failed')
    router.refresh()
  } catch {
    setOptimisticStatus(previousStatus)
    toast.error('Status update failed — please try again')
  }
}
```

### Pattern 3: @dnd-kit Horizontal Column Reordering
**What:** Drag columns left/right, persist `display_order` to DB
**When to use:** User-customizable column order
**Example:**
```typescript
// Adapted from components/WbsTree.tsx
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
)

async function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event
  if (!over || active.id === over.id) return

  const draggedNode = nodes.find(n => n.id === Number(active.id))
  const overNode = nodes.find(n => n.id === Number(over.id))

  if (!draggedNode || !overNode) return
  if (draggedNode.track_id !== overNode.track_id) return // Same track only

  try {
    const response = await fetch(`/api/projects/${projectId}/arch-nodes/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodeId: draggedNode.id,
        trackId: draggedNode.track_id,
        newDisplayOrder: overNode.display_order,
      }),
    })

    if (!response.ok) throw new Error('Reorder failed')
    router.refresh()
  } catch {
    toast.error('Reorder failed — please try again')
  }
}

return (
  <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
    <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
      {columns.map(col => <SortableColumn key={col.id} column={col} />)}
    </SortableContext>
  </DndContext>
)
```

### Pattern 4: Read-Only Aggregation Dashboard
**What:** Fetch multiple tables, render styled cards, no edit controls
**When to use:** Executive summary views, reporting surfaces
**Example:**
```typescript
// app/customer/[id]/teams/page.tsx (SERVER)
import { getTeamsTabData } from '@/lib/queries'
import { TeamEngagementOverview } from '@/components/teams/TeamEngagementOverview'

export default async function TeamsPage({ params }: { params: { id: string } }) {
  const projectId = parseInt(params.id, 10)
  const data = await getTeamsTabData(projectId)

  return (
    <div>
      {/* Sub-tab bar */}
      <TeamEngagementOverview projectId={projectId} data={data} />
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Fetching arch_nodes in client component**: Server component should fetch, pass as props (avoids client-side waterfalls)
- **Storing drag state in database mid-drag**: Only persist on `onDragEnd` — intermediate positions are visual-only
- **Editing Team Engagement Overview inline**: Read-only per spec; editing happens in source tabs
- **Using router.refresh() synchronously**: It's async; wrap in try/catch and handle errors with toast

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag and drop | Custom mouse event handlers, position calculations | @dnd-kit/sortable | Accessibility (keyboard nav, screen readers), collision detection, smooth transforms, touch support all require 1000+ LOC |
| Display order recalculation | Manual array indexing and SQL update loops | Phase 47 reorder API pattern (gap-close + gap-open + place) | Edge cases: concurrent reorders, null parent handling, transaction rollback on failure |
| Status badge cycling | Multiple buttons or dropdown menu | Click-to-cycle single badge | 3-state enum fits mental model; single click faster than open-select-close |
| HTML reference visual conversion | Writing CSS from scratch | Copy exact classes from `AMEX_Team_Engagement_2026-03-17.html` | 165 lines of battle-tested CSS; status icons, pills, grid layouts already solved |

**Key insight:** This phase is 90% UI wiring, 10% new logic. The project already has all infrastructure (queries, schema, components, patterns). Don't reinvent — copy Phase 47 WBS patterns for drag/reorder/status, copy HTML reference for Team Engagement styling.

## Common Pitfalls

### Pitfall 1: @dnd-kit `id` Type Mismatch
**What goes wrong:** @dnd-kit expects `string | number` IDs; mixing types breaks collision detection
**Why it happens:** Database IDs are numbers, but DndContext serializes to strings in drag events
**How to avoid:** Always cast: `Number(active.id)` and `Number(over.id)` in `onDragEnd`
**Warning signs:** Drag works but drop does nothing; console warning about ID comparison

### Pitfall 2: Display Order Gaps After Reorder
**What goes wrong:** Reordering leaves gaps (e.g., [1, 2, 5, 6] instead of [1, 2, 3, 4])
**Why it happens:** Only updating moved item and immediate neighbors; not normalizing full list
**How to avoid:** Follow Phase 47 pattern: (1) close gap at old position, (2) open gap at new position, (3) place item
**Warning signs:** Works for first reorder, breaks on second reorder with "Cannot insert at position 5" error

### Pitfall 3: Status Cycle Not Persisting on Navigation
**What goes wrong:** Status changes look successful but revert on page refresh
**Why it happens:** `router.refresh()` not called after PATCH, or PATCH returns 200 but doesn't write to DB
**How to avoid:** Always call `router.refresh()` after successful PATCH; verify DB write in API route with `returning` clause
**Warning signs:** Optimistic UI works, but refresh shows old value; no error toasts

### Pitfall 4: Team Engagement Missing Data Warning Not Triggering
**What goes wrong:** Warning banner doesn't appear even when table is empty
**Why it happens:** Check is `data.length === 0` but `getTeamsTabData()` returns `undefined` or `null` on error
**How to avoid:** Defensive check: `!data || data.length === 0`
**Warning signs:** Console error "Cannot read property 'length' of undefined"

### Pitfall 5: Drag Handle Not Registering
**What goes wrong:** Column drag doesn't work; entire column drags instead of just header
**Why it happens:** `useSortable` attributes/listeners spread on wrong DOM element
**How to avoid:** Spread `{...attributes, ...listeners}` on the drag handle element (usually a grip icon), not the entire column
**Warning signs:** Cursor changes to grab but drag doesn't initiate; entire column selected on mousedown

## Code Examples

Verified patterns from existing codebase:

### Reorder API Route (Bulk Display Order Update)
```typescript
// Source: app/api/projects/[projectId]/wbs/reorder/route.ts (adapted for arch_nodes)
import { NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/db'
import { archNodes } from '@/db/schema'
import { eq, and, gte, gt, ne } from 'drizzle-orm'
import { requireSession } from '@/lib/auth-server'
import { sql } from 'drizzle-orm'

const ReorderArchNodeSchema = z.object({
  nodeId: z.number().int(),
  trackId: z.number().int(),
  newDisplayOrder: z.number().int().min(1),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { session, redirectResponse } = await requireSession()
  if (redirectResponse) return redirectResponse

  const resolvedParams = await params
  const projectId = parseInt(resolvedParams.projectId, 10)
  if (isNaN(projectId)) {
    return Response.json({ error: 'Invalid project ID' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ReorderArchNodeSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { nodeId, trackId, newDisplayOrder } = parsed.data

  try {
    // Fetch current node
    const [node] = await db
      .select({ display_order: archNodes.display_order })
      .from(archNodes)
      .where(eq(archNodes.id, nodeId))
      .limit(1)

    if (!node) {
      return Response.json({ error: 'Node not found' }, { status: 404 })
    }

    const oldDisplayOrder = node.display_order

    // Step 1: Close gap at old position
    await db
      .update(archNodes)
      .set({ display_order: sql`${archNodes.display_order} - 1` })
      .where(
        and(
          eq(archNodes.project_id, projectId),
          eq(archNodes.track_id, trackId),
          gt(archNodes.display_order, oldDisplayOrder),
          ne(archNodes.id, nodeId)
        )
      )

    // Step 2: Open gap at new position
    await db
      .update(archNodes)
      .set({ display_order: sql`${archNodes.display_order} + 1` })
      .where(
        and(
          eq(archNodes.project_id, projectId),
          eq(archNodes.track_id, trackId),
          gte(archNodes.display_order, newDisplayOrder),
          ne(archNodes.id, nodeId)
        )
      )

    // Step 3: Place node
    await db
      .update(archNodes)
      .set({ display_order: newDisplayOrder })
      .where(eq(archNodes.id, nodeId))

    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reorder failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
```

### Status Cycle API Route
```typescript
// app/api/projects/[projectId]/arch-nodes/[nodeId]/route.ts
import { NextRequest } from 'next/server'
import { z } from 'zod'
import db from '@/db'
import { archNodes } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireSession } from '@/lib/auth-server'

const UpdateArchNodeSchema = z.object({
  status: z.enum(['planned', 'in_progress', 'live']),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; nodeId: string }> }
) {
  const { session, redirectResponse } = await requireSession()
  if (redirectResponse) return redirectResponse

  const resolvedParams = await params
  const nodeId = parseInt(resolvedParams.nodeId, 10)
  if (isNaN(nodeId)) {
    return Response.json({ error: 'Invalid node ID' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = UpdateArchNodeSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { status } = parsed.data

  try {
    await db
      .update(archNodes)
      .set({ status })
      .where(eq(archNodes.id, nodeId))

    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
```

### Team Engagement Section with Missing Data Warning
```typescript
// components/teams/TeamEngagementOverview.tsx (excerpt)
import { WarnBanner } from './WarnBanner'

interface Props {
  projectId: number
  data: {
    businessOutcomes: BusinessOutcome[]
    e2eWorkflows: E2eWorkflow[]
    focusAreas: FocusArea[]
    teamOnboardingStatus: TeamOnboardingStatus[]
  }
}

export function TeamEngagementOverview({ projectId, data }: Props) {
  return (
    <div className="space-y-8">
      {/* Section 1: Business Outcomes */}
      <section>
        <h2 className="text-lg font-bold mb-4">Business Value & Expected Outcomes</h2>
        {!data.businessOutcomes || data.businessOutcomes.length === 0 ? (
          <WarnBanner message="No business outcomes defined. Add outcomes in the Actions tab." />
        ) : (
          <div className="outcomes-grid">
            {data.businessOutcomes.map(outcome => (
              <OutcomeCard key={outcome.id} outcome={outcome} />
            ))}
          </div>
        )}
      </section>

      {/* Repeat for other sections */}
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded `ADR_PHASES` array | DB-driven `arch_nodes` query | Phase 45 (2026-04-07) | Architecture stages now extraction-populated and per-project customizable |
| Manual drag-drop with mouse events | @dnd-kit/sortable | Phase 47 (2026-04-08) | Accessibility, keyboard nav, touch support automatic |
| Dropdown for status change | Click-to-cycle badge | Phase 47 WBS pattern | Faster UX for 3-state enums; single click vs open-select-close |
| Client-side data fetching (useEffect) | Server Component RSC fetch | Next.js 13+ standard | Eliminates client-side waterfalls; faster first paint |

**Deprecated/outdated:**
- **react-dnd**: Replaced by @dnd-kit ecosystem (better TypeScript, smaller bundle, no HOC wrapping)
- **position_x/position_y columns**: Not needed for horizontal list sorting; `display_order` integer sufficient

## Open Questions

1. **Collision detection strategy for column reordering**
   - What we know: @dnd-kit provides `closestCenter`, `closestCorners`, `pointerWithin`, `rectIntersection`
   - What's unclear: Which strategy works best for horizontal 5-column layout with variable column widths
   - Recommendation: Start with `closestCenter` (default); test with wide vs narrow columns; switch to `pointerWithin` if columns swap unexpectedly

2. **Status icon implementation for Team Engagement bullets**
   - What we know: HTML reference uses CSS `::before` pseudo-elements with Unicode characters (✓, ◐, ○, ⚠, →)
   - What's unclear: Tailwind `before:` utilities vs inline style vs separate CSS file
   - Recommendation: Copy exact CSS from HTML reference into component-scoped `<style jsx>` block; Tailwind doesn't support complex `::before` content

3. **Sub-tab persistence across navigation**
   - What we know: User switches between "Overview" and "Detail" sub-tabs within Teams tab
   - What's unclear: Should active sub-tab persist in URL query param or local state only
   - Recommendation: Local state only (no URL param) — faster UX, avoids extra router pushes; user typically views one sub-tab per visit

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test -- --run --reporter=verbose` |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARCH-01 | Architecture tab displays two sub-tabs with wired arch_nodes data | integration | `npm test tests/arch/arch-nodes-wiring.test.ts -- --run` | ❌ Wave 0 |
| ARCH-02 | Status badge click cycles planned→in_progress→live→planned | integration | `npm test tests/arch/status-cycle.test.ts -- --run` | ❌ Wave 0 |
| ARCH-03 | TeamOnboardingTable renders with team_onboarding_status data | unit | `npm test tests/arch/team-onboarding-table.test.ts -- --run` | ❌ Wave 0 |
| TEAM-01 | Team Engagement Overview renders 4 sections with correct data | integration | `npm test tests/teams/engagement-overview.test.ts -- --run` | ❌ Wave 0 |
| TEAM-03 | WarnBanner appears when section data is empty | unit | `npm test tests/teams/warn-banner-trigger.test.ts -- --run` | ❌ Wave 0 |
| TEAM-04 | Read-only snapshot has no edit controls | manual-only | Visual inspection: no buttons/inputs in Overview sub-tab | Manual |

### Sampling Rate
- **Per task commit:** `npm test tests/arch/ tests/teams/ -- --run`
- **Per wave merge:** `npm test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/arch/arch-nodes-wiring.test.ts` — covers ARCH-01 (getArchNodes query integration)
- [ ] `tests/arch/status-cycle.test.ts` — covers ARCH-02 (PATCH /arch-nodes/[nodeId] status update)
- [ ] `tests/arch/column-reorder.test.ts` — covers column drag API (PATCH /arch-nodes/reorder)
- [ ] `tests/teams/engagement-overview.test.ts` — covers TEAM-01 (4-section render with getTeamsTabData)
- [ ] `tests/teams/warn-banner-trigger.test.ts` — covers TEAM-03 (zero-length array detection)

## Sources

### Primary (HIGH confidence)
- **Project codebase** — `components/WbsTree.tsx`, `components/WbsNode.tsx`, `app/api/projects/[projectId]/wbs/reorder/route.ts` (Phase 47 precedent patterns)
- **Project codebase** — `components/InlineSelectCell.tsx` (optimistic UI pattern)
- **Project codebase** — `lib/queries.ts` (getArchNodes, getTeamsTabData queries already implemented)
- **Project codebase** — `db/schema.ts` (arch_nodes, arch_tracks, team_onboarding_status schema)
- **Project codebase** — `package.json` (@dnd-kit versions verified)
- **HTML reference** — `/Users/jmiloslavsky/Documents/BigPanda Projects/Archive/AMEX_Team_Engagement_2026-03-17.html` (visual design specification)

### Secondary (MEDIUM confidence)
- **CONTEXT.md** — User decisions from `/gsd:discuss-phase` (locked implementation choices)
- **STATE.md** — Phase 47 decisions (Set-based expand/collapse, React.memo, inline status select patterns)

### Tertiary (LOW confidence)
- None — all findings verified against existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and in use
- Architecture: HIGH - Patterns copied directly from Phase 47 WBS implementation
- Pitfalls: HIGH - Derived from actual Phase 47 code review and common @dnd-kit issues

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (30 days — stable domain, no fast-moving dependencies)
