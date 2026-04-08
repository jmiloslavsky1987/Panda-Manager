# Phase 47: Work Breakdown Structure - Research

**Researched:** 2026-04-08
**Domain:** React collapsible tree UI with drag-and-drop, inline editing, and AI-powered gap-fill generation
**Confidence:** HIGH

## Summary

Phase 47 builds a 3-level collapsible WBS tree UI that displays ADR (10 sections, 25+ L2 items) and Biggy (5 sections, 9+ L2 items) hierarchies with inline CRUD operations and an AI "Generate Plan" feature. The schema and seeding logic already exist (Phase 45), extraction/classification is complete (Phase 46), so Phase 47 focuses on the read/edit surface and AI gap-fill capability.

The implementation follows established app patterns: Server Component fetches via `getWbsItems()`, Client Component handles state/interactions with @dnd-kit for drag-and-drop reordering, optimistic updates for inline edits, and BullMQ job for AI generation. The tree uses recursive rendering with Set-based expand/collapse state for performance at 100+ nodes.

**Primary recommendation:** Build a custom recursive tree component (not a library) using @dnd-kit/core for drag-and-drop, following PhaseBoard.tsx patterns. Use inline editing with optimistic updates (InlineSelectCell pattern) and modal preview for Generate Plan AI proposals. Defer virtualization unless testing reveals performance issues.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **ADR | Biggy tab switcher** — one track visible at a time. ADR is the default on initial load.
- Level 1 section headers expanded by default; Level 2 and Level 3 nodes collapsed.
- Status badge on every node (all three levels) — small colored pill inline with node name.
- Status values: `not_started` (zinc) / `in_progress` (blue) / `complete` (green) — consistent with app-wide color conventions.
- **Preview + confirm modal** — AI proposals are shown to the user before any DB write. User reviews the list and confirms before items are committed.
- Generate Plan button placed in the WBS page header area (above the ADR/Biggy tab switcher), visible at all times.
- On re-runs: propose only genuinely new items — AI detects existing nodes and skips duplicates. User sees only net-new additions.
- AI may propose **Level 2 and Level 3** nodes only. Level 1 section headers are protected — AI cannot add new sections.
- Generate Plan runs against both tracks simultaneously (not scoped per-track).
- **Inline editing** — clicking a node name makes it an editable input in place. Status changed via a dropdown/select in the same row. Enter to save, Escape to cancel.
- **Add child**: `+` icon appears on row hover. Clicking adds a new empty child node directly below (inline, ready to type).
- **Reorder**: drag handle (`≡`) on every row. Nodes can be dragged to any position in the tree, including reparenting to a different Level 1 section. @dnd-kit/core is already installed (Phase 3).
- **Delete**: clicking delete (trash icon on hover) triggers a confirm dialog — "Delete '[name]' and its N sub-items?" — then removes the node and its entire subtree.
- Level 1 section headers are **locked** — cannot be renamed, added, deleted, or reparented by the user. Only L2 and L3 nodes are fully editable/deletable. The add button does not appear on Level 1 rows for adding siblings; it adds L2 children.
- **Name + status only** — no additional fields (no description, owner, due date). No schema migration required.
- `source_trace` column is internal only — not surfaced in the UI anywhere.
- `wbs_task_assignments` link management deferred to a later phase — no task count badge or link UI in Phase 47.

### Claude's Discretion
- Exact drag-and-drop collision detection and reparenting visual affordance (e.g., indent indicator, drop zone highlight)
- Loading/skeleton state for the WBS tree while data fetches
- Error toast copy and retry behavior for failed saves
- Empty state copy when a section has no L2/L3 children
- Generate Plan modal layout — how proposals are grouped and rendered (by track, by section, etc.)
- AI prompt engineering for the Generate Plan call (context selection, gap detection logic)
- Whether to use optimistic UI for inline edits (consistent with app-wide pattern — yes)

### Deferred Ideas (OUT OF SCOPE)
- `wbs_task_assignments` link management UI (linking Plan Board tasks to WBS nodes) — future phase
- AI-generated Level 1 section proposals — Generate Plan is constrained to L2/L3 only in Phase 47
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WBS-04 | "Generate Plan" button analyzes available project context, identifies missing WBS tasks, and fills gaps; re-runnable to catch tasks not covered in earlier runs | BullMQ job pattern (document-extraction.ts model), skill-orchestrator for Claude API calls, deduplication via db query for existing wbs_items, modal preview pattern (AddRiskModal model) |
| WBS-05 | User can manually add, edit, reorder, and delete tasks within any WBS node | @dnd-kit/core + @dnd-kit/sortable (PhaseBoard.tsx pattern), inline editing with optimistic updates (InlineSelectCell pattern), API CRUD routes, recursive subtree deletion with confirm dialog |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (Next.js 16) | 16.x | Server/Client Component model | App framework (already used) |
| @dnd-kit/core | 6.3.1 | Drag-and-drop primitives | Already installed, PhaseBoard.tsx precedent |
| @dnd-kit/sortable | 10.0.0 | Sortable list helpers | Installed with core, provides useSortable hook |
| @dnd-kit/utilities | 3.2.2 | CSS transform utilities | Installed, provides CSS.Transform helper |
| lucide-react | 0.577.0 | Icons (ChevronRight, ChevronDown, Plus, GripVertical, Trash2) | App standard for all icons |
| shadcn/ui Dialog | (Radix 1.1.15) | Modal for Generate Plan preview and delete confirm | App standard for all dialogs |
| Drizzle ORM | (current) | Database queries and mutations | App standard ORM |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| BullMQ | (current) | Background job queue for AI Generate Plan | Long-running AI operations (already used for extraction) |
| Anthropic SDK | 0.80.0 | Claude API calls for Generate Plan skill | AI generation features (already used in skill-orchestrator) |
| Zod | (current) | API request validation | All POST/PATCH route handlers (app standard) |
| sonner | (current) | Toast notifications for errors | Error feedback (app standard) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom recursive tree | react-arborist, react-complex-tree | Libraries add 50-100KB, opinionated styling, learning curve; custom solution ~200 LOC, full control, follows app patterns |
| @dnd-kit | react-beautiful-dnd | DnD deprecated by Atlassian in favor of pragmatic-drag-and-drop; @dnd-kit already installed and proven in PhaseBoard |
| Custom tree | Flat list with indent levels | Loses expand/collapse benefit; WBS domain inherently hierarchical |

**Installation:**
No new packages required — all dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
app/customer/[id]/wbs/
├── page.tsx                      # Server Component — data fetch, props passing
└── (no client islands)          # All interactivity in components/

components/
├── WbsTree.tsx                   # Client Component — main tree container
├── WbsNode.tsx                   # Recursive node component with expand/collapse/drag/edit
├── WbsGeneratePlanModal.tsx      # Modal for AI proposal preview + confirm
└── (reuse existing)
    ├── ui/dialog.tsx
    ├── ui/badge.tsx
    ├── ui/button.tsx
    └── InlineSelectCell.tsx      # Status dropdown pattern

app/api/projects/[projectId]/wbs/
├── route.ts                      # POST (add node), PATCH (edit node)
├── [itemId]/
│   ├── route.ts                  # PATCH (edit single node), DELETE (with cascade)
│   └── reorder/route.ts          # POST (update display_order + parent_id)
└── generate/route.ts             # POST (enqueue Generate Plan BullMQ job)

worker/jobs/
└── wbs-generate-plan.ts          # BullMQ job handler — calls Claude API

lib/
└── queries.ts (additions)
    ├── getWbsItems(projectId, track) — ✅ already exists
    ├── deleteWbsSubtree(itemId)      — new recursive delete helper
    └── getWbsItemCount(projectId)    — count for "N sub-items" confirm dialog
```

### Pattern 1: Recursive Tree Rendering with Set-based State
**What:** WbsNode component renders itself recursively for children, using a Set<number> for expanded node IDs to avoid array iteration on every toggle.

**When to use:** Hierarchical data with expand/collapse (WBS, org charts, file trees).

**Example:**
```typescript
// components/WbsTree.tsx
'use client'

import { useState, useMemo } from 'react'
import { WbsNode } from './WbsNode'
import type { WbsItem } from '@/lib/queries'

interface WbsTreeProps {
  items: WbsItem[]
  track: 'ADR' | 'Biggy'
  projectId: number
}

export function WbsTree({ items, track, projectId }: WbsTreeProps) {
  // Level 1 expanded by default, L2/L3 collapsed
  const defaultExpandedIds = useMemo(() => {
    return new Set(items.filter(item => item.level === 1).map(item => item.id))
  }, [items])

  const [expandedIds, setExpandedIds] = useState<Set<number>>(defaultExpandedIds)

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Build parent → children map
  const childrenMap = useMemo(() => {
    const map = new Map<number | null, WbsItem[]>()
    items.forEach(item => {
      const parentId = item.parent_id ?? null
      if (!map.has(parentId)) map.set(parentId, [])
      map.get(parentId)!.push(item)
    })
    // Sort by display_order within each parent
    map.forEach(children => children.sort((a, b) => a.display_order - b.display_order))
    return map
  }, [items])

  const rootNodes = childrenMap.get(null) ?? []

  return (
    <div className="space-y-1">
      {rootNodes.map(node => (
        <WbsNode
          key={node.id}
          node={node}
          childrenMap={childrenMap}
          expandedIds={expandedIds}
          onToggleExpand={toggleExpand}
          projectId={projectId}
          track={track}
        />
      ))}
    </div>
  )
}
```

### Pattern 2: Inline Editing with Optimistic Updates
**What:** Click to edit pattern — clicking node name switches to input field, saves on Enter/blur, reverts on error.

**When to use:** Table cells, tree nodes, any inline-editable text.

**Example:**
```typescript
// components/WbsNode.tsx (excerpt)
const [editing, setEditing] = useState(false)
const [optimisticName, setOptimisticName] = useState(node.name)
const [saving, setSaving] = useState(false)

async function handleSave(newName: string) {
  if (newName === node.name || !newName.trim()) {
    setEditing(false)
    return
  }

  const prev = optimisticName
  setOptimisticName(newName)
  setEditing(false)
  setSaving(true)

  try {
    const res = await fetch(`/api/projects/${projectId}/wbs/${node.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })
    if (!res.ok) throw new Error('Save failed')
    router.refresh() // sync server state
  } catch {
    setOptimisticName(prev)
    toast.error('Save failed — please try again')
  } finally {
    setSaving(false)
  }
}

return editing ? (
  <input
    autoFocus
    value={optimisticName}
    onChange={(e) => setOptimisticName(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter') handleSave(optimisticName)
      if (e.key === 'Escape') { setEditing(false); setOptimisticName(node.name) }
    }}
    onBlur={() => handleSave(optimisticName)}
    className="border rounded px-2 py-1 text-sm w-full"
  />
) : (
  <span
    onClick={() => !locked && setEditing(true)}
    className="cursor-pointer hover:bg-zinc-100 rounded px-2 py-1"
  >
    {optimisticName}
  </span>
)
```

### Pattern 3: Hierarchical Drag-and-Drop with @dnd-kit
**What:** Nodes can be dragged to reorder within parent or reparent to different Level 1 section. Use DndContext at tree root, useSortable per node.

**When to use:** Sortable lists with nested hierarchy (tree reordering, nested kanban).

**Example:**
```typescript
// components/WbsTree.tsx (additions)
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

async function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event
  if (!over || active.id === over.id) return

  const draggedId = Number(active.id)
  const targetId = Number(over.id)

  // Call API to update parent_id and display_order
  await fetch(`/api/projects/${projectId}/wbs/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId: draggedId, newParentId: targetId }),
  })

  router.refresh()
}

return (
  <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
    <SortableContext items={rootNodes.map(n => n.id)} strategy={verticalListSortingStrategy}>
      {rootNodes.map(node => <WbsNode key={node.id} {...} />)}
    </SortableContext>
  </DndContext>
)
```

### Pattern 4: AI Generation with BullMQ Job + Modal Preview
**What:** Generate Plan enqueues a BullMQ job that calls Claude API, returns proposals, shows modal for user confirmation before DB write.

**When to use:** Long-running AI operations requiring user review (extraction, generation, analysis).

**Example:**
```typescript
// app/api/projects/[projectId]/wbs/generate/route.ts
export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { redirectResponse } = await requireSession()
  if (redirectResponse) return redirectResponse

  const { projectId } = await params
  const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() as any })

  const job = await queue.add('wbs-generate-plan', { projectId: Number(projectId) })
  await queue.close()

  return NextResponse.json({ jobId: job.id })
}

// worker/jobs/wbs-generate-plan.ts
export async function wbsGeneratePlanJob(job: Job) {
  const { projectId } = job.data

  // Fetch existing WBS items to avoid duplicates
  const existingItems = await db.select().from(wbsItems).where(eq(wbsItems.project_id, projectId))

  // Build context from project data (similar to skill-orchestrator)
  const context = await buildWbsContext(projectId)

  // Call Claude API with prompt to generate missing L2/L3 items
  const proposals = await generateWbsProposals(context, existingItems)

  // Return proposals (not written to DB yet — frontend shows modal)
  return proposals
}

// components/WbsGeneratePlanModal.tsx
// Poll for job result, show proposals in Dialog, POST to /wbs/route.ts on confirm
```

### Anti-Patterns to Avoid
- **Flattening the tree in state** — lose parent-child relationships, complex reorder logic. Use parent_id + childrenMap instead.
- **Array.indexOf for expand/collapse** — O(n) on every toggle. Use Set<number> for O(1) lookups.
- **Saving on every keystroke** — network thrash, race conditions. Save on Enter/blur only.
- **Level 1 editable via same code path as L2/L3** — add `locked` prop to WbsNode, check before enabling edit/delete/drag.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop collision detection | Custom mouse event handlers, position calculations | @dnd-kit/core DndContext + collision detection algorithms | Accessibility (keyboard nav), touch support, edge cases (scroll during drag, multi-monitor), browser inconsistencies |
| API request deduplication | Client-side request queue, manual abort controllers | React Query or SWR (future consideration) | Race conditions, stale data, cache invalidation, refetch on focus — solved problems |
| Tree virtualization | Custom windowing logic with IntersectionObserver | react-window or @tanstack/react-virtual (if needed) | Performance edge cases (dynamic heights, scroll anchoring), already battle-tested; defer unless profiling shows >200ms render |
| Recursive subtree deletion | Manual cascade DELETE queries | Drizzle recursive CTE or db-level ON DELETE CASCADE | Easy to miss orphaned records, performance (N+1 queries), already supported by Postgres |

**Key insight:** Drag-and-drop is deceptively complex — accessibility, touch, scroll, collision detection, and browser quirks make @dnd-kit the pragmatic choice over custom implementation. Tree UI is straightforward (recursive component ~150 LOC), but don't hand-roll the drag layer.

## Common Pitfalls

### Pitfall 1: Display Order Gaps After Drag-and-Drop
**What goes wrong:** When a node is dragged and dropped, other nodes' display_order values aren't updated, causing visual jumps or incorrect ordering on reload.

**Why it happens:** Drag handler only updates the moved node's display_order/parent_id without recalculating siblings.

**How to avoid:** Reorder API should recalculate display_order for all siblings at the target level. Use a pattern like:
```sql
-- Shift siblings down to make room
UPDATE wbs_items
SET display_order = display_order + 1
WHERE parent_id = $newParentId AND display_order >= $insertPosition

-- Insert dragged item
UPDATE wbs_items
SET parent_id = $newParentId, display_order = $insertPosition
WHERE id = $draggedId
```

**Warning signs:** Nodes appear in different order after page refresh, drag-and-drop feels "sticky" or requires multiple attempts.

### Pitfall 2: Stale Expanded State After AI Generation
**What goes wrong:** User generates new L2/L3 items via AI, modal confirms, DB writes succeed, but new nodes aren't visible because parent is collapsed.

**Why it happens:** expandedIds Set isn't updated when new items are added to DB — relies on user manually expanding parents.

**How to avoid:** After Generate Plan confirms and writes to DB, auto-expand all parents of newly added items:
```typescript
const newItemParentIds = proposals.map(p => p.parent_id)
setExpandedIds(prev => {
  const next = new Set(prev)
  newItemParentIds.forEach(id => id && next.add(id))
  return next
})
```

**Warning signs:** User complains "Generate Plan doesn't do anything" — items are added but not visible.

### Pitfall 3: Delete Cascade Not Removing UI State
**What goes wrong:** User deletes a parent node, subtree is removed from DB, but expandedIds Set still contains deleted IDs, causing memory leak and stale state.

**Why it happens:** Delete handler doesn't clean up UI state — only calls API and router.refresh().

**How to avoid:** After successful delete, remove deleted node and all descendants from expandedIds:
```typescript
async function handleDelete(nodeId: number) {
  const subtreeIds = getAllDescendantIds(nodeId) // recursive helper
  await fetch(`/api/projects/${projectId}/wbs/${nodeId}`, { method: 'DELETE' })

  setExpandedIds(prev => {
    const next = new Set(prev)
    subtreeIds.forEach(id => next.delete(id))
    next.delete(nodeId)
    return next
  })

  router.refresh()
}
```

**Warning signs:** Expand/collapse stops working after deletes, Set grows unbounded in devtools.

### Pitfall 4: Level 1 Headers Renameable/Deletable
**What goes wrong:** User renames "Solution Design" to "Design Phase" or deletes "Go-Live", breaking ADR template structure and extraction classification.

**Why it happens:** No `locked` check in WbsNode edit/delete handlers — treats all levels equally.

**How to avoid:** Add `locked` prop derived from `node.level === 1`, disable edit/delete UI:
```typescript
const locked = node.level === 1

return (
  <div onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
    {!locked && hovering && (
      <>
        <button onClick={handleDelete}><Trash2 size={14} /></button>
        <button onClick={handleAddChild}><Plus size={14} /></button>
      </>
    )}
    <span onClick={() => !locked && setEditing(true)} className={locked ? 'cursor-default' : 'cursor-pointer'}>
      {node.name}
    </span>
  </div>
)
```

**Warning signs:** Template structure diverges from Phase 45 spec, extraction routing fails with "parent not found" errors.

### Pitfall 5: Drag-and-Drop Reparenting to Wrong Level
**What goes wrong:** User drags an L3 node onto an L2 node, but it becomes a sibling (same level) instead of a child (nested level).

**Why it happens:** Drop target detection doesn't distinguish "drop onto" vs "drop between" — all drops are treated as reorder-within-parent.

**How to avoid:** Use @dnd-kit collision detection with drop zones. If `over.id` is a node ID, set parent_id to that node's ID. If `over.id` is a sortable position, set parent_id to the target's parent_id:
```typescript
async function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event
  if (!over) return

  const draggedItem = items.find(i => i.id === Number(active.id))
  const overItem = items.find(i => i.id === Number(over.id))

  if (!draggedItem || !overItem) return

  // If dropped onto a node (not between), make it a child
  const newParentId = overItem.id
  const newLevel = overItem.level + 1

  await fetch(`/api/projects/${projectId}/wbs/reorder`, {
    method: 'POST',
    body: JSON.stringify({ itemId: draggedItem.id, newParentId, newLevel }),
  })
}
```

**Warning signs:** Tree structure becomes flat, indentation incorrect, L3 nodes appear as L2 siblings.

### Pitfall 6: Generate Plan Hallucinating Non-Existent Parent Sections
**What goes wrong:** AI proposes "Security Configuration" as a Level 2 item, but no Level 1 section exists for it, causing FK constraint error on insert.

**Why it happens:** Claude prompt doesn't include the exact Level 1 section names, so AI invents plausible-sounding parents.

**How to avoid:** Include exhaustive Level 1 section list in system prompt:
```typescript
const level1Sections = existingItems.filter(i => i.level === 1).map(i => i.name)

const systemPrompt = `You are a WBS gap-fill assistant. Analyze the project context and propose Level 2 or Level 3 WBS items that are missing from the current structure.

CRITICAL: You may ONLY propose items under these exact parent section names:
ADR Track: ${level1Sections.filter(s => adrSections.includes(s)).join(', ')}
Biggy Track: ${level1Sections.filter(s => biggySections.includes(s)).join(', ')}

Do NOT invent new Level 1 sections. If a task doesn't fit existing sections, skip it.

Output format:
{ "parent_section_name": "exact match from above", "level": 2 or 3, "name": "task name", "track": "ADR" or "Biggy" }
`
```

**Warning signs:** 500 errors on Generate Plan confirm, FK violations in logs, proposals with unknown parent names.

## Code Examples

Verified patterns from existing codebase:

### PhaseBoard Drag-and-Drop Pattern
```typescript
// Source: bigpanda-app/components/PhaseBoard.tsx (lines 232-262)
async function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event
  setActiveId(null)
  if (!over || active.id === over.id) return

  const overId = String(over.id)
  const targetPhase = phases.includes(overId)
    ? overId
    : tasks.find((t) => t.id === Number(overId))?.phase

  const taskId = Number(active.id)
  const currentPhase = tasks.find((t) => t.id === taskId)?.phase
  if (!targetPhase || targetPhase === currentPhase) return

  // Optimistic update
  setTasks((prev) =>
    prev.map((t) => (t.id === taskId ? { ...t, phase: targetPhase } : t))
  )

  try {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: targetPhase }),
    })

    if (!res.ok) {
      router.refresh() // revert optimistic update
      toast.error('Update failed')
    }
  } catch {
    router.refresh()
  }
}
```

### InlineSelectCell Optimistic Update Pattern
```typescript
// Source: bigpanda-app/components/InlineSelectCell.tsx (lines 13-47)
export function InlineSelectCell<T extends string>({
  value,
  options,
  onSave,
  className
}: InlineSelectCellProps<T>) {
  const [editing, setEditing] = useState(false)
  const [optimisticValue, setOptimisticValue] = useState(value)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!editing && !saving) {
      setOptimisticValue(value)
    }
  }, [value, editing, saving])

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (saving) return

    const newValue = e.target.value as T
    const previousValue = optimisticValue

    setOptimisticValue(newValue)
    setEditing(false)
    setSaving(true)

    try {
      await onSave(newValue)
    } catch {
      setOptimisticValue(previousValue)
      toast.error('Save failed — please try again')
    } finally {
      setSaving(false)
    }
  }

  // ... render logic
}
```

### WBS Seeding Pattern (ADR Track)
```typescript
// Source: bigpanda-app/app/api/projects/route.ts (lines 93-129)
const adrWbsL1 = await tx.insert(wbsItems).values([
  { project_id: inserted.id, level: 1, track: 'ADR', name: 'Solution Design', display_order: 2, status: 'not_started' as const, source_trace: 'template' },
  { project_id: inserted.id, level: 1, track: 'ADR', name: 'Alert Source Integration', display_order: 3, status: 'not_started' as const, source_trace: 'template' },
  // ... 10 total Level 1 items
]).returning({ id: wbsItems.id, name: wbsItems.name })

const adrChildRows = [
  { parentName: 'Solution Design', children: ['Ops Shadowing / Current State', 'Future State Workflow', 'ADR Process Consulting'] },
  { parentName: 'Alert Source Integration', children: ['Outbound Integrations', 'Inbound Integrations'] },
  // ... 25 total Level 2 items
].flatMap(({ parentName, children }) => {
  const parent = adrWbsL1.find(p => p.name === parentName)
  if (!parent) return []
  return children.map((name, i) => ({
    project_id: inserted.id,
    parent_id: parent.id,
    level: 2,
    track: 'ADR',
    name,
    display_order: i + 1,
    status: 'not_started' as const,
    source_trace: 'template',
  }))
})

await tx.insert(wbsItems).values(adrChildRows)
```

### BullMQ Job Enqueue Pattern
```typescript
// Source: bigpanda-app/app/api/ingestion/extract/route.ts (lines 40-56)
const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() as any })

const jobIds: number[] = []
for (const artifactId of artifactIds) {
  const [row] = await db.insert(extractionJobs).values({
    artifact_id: artifactId,
    project_id: projectId,
    batch_id: batchId,
    status: 'pending',
  }).returning({ id: extractionJobs.id })

  await queue.add('document-extraction',
    { jobId: row.id, artifactId, projectId, batchId },
    { jobId: `extraction-${row.id}` }
  )
  jobIds.push(row.id)
}

await queue.close()
return NextResponse.json({ jobIds, batchId })
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit | 2023 (library deprecated) | @dnd-kit smaller bundle (28KB vs 45KB), better TypeScript, maintained |
| Custom tree libraries (react-sortable-tree) | Custom recursive component + @dnd-kit | 2024+ | Removes 100KB+ dependencies, full control over styling/behavior, follows app patterns |
| Modal-based tree editing | Inline editing with optimistic updates | 2024+ (Next.js 13+ pattern) | Faster UX (no modal open/close), fewer clicks, consistent with table inline editing |
| Flat WBS list with indent levels | True hierarchical tree with parent_id FK | Phase 45 (2026-04-07) | Referential integrity, recursive queries, supports drag-to-reparent |

**Deprecated/outdated:**
- **react-beautiful-dnd**: Deprecated by Atlassian (2023), replaced by pragmatic-drag-and-drop (heavier, React 18+ only); @dnd-kit is the community standard replacement
- **react-sortable-tree**: Unmaintained since 2020, React 16 API, bundle size issues
- **Custom CSS-only accordions for tree expand/collapse**: Accessibility issues (no keyboard nav), can't sync state with URL, breaks on dynamic content

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | vitest.config.ts |
| Quick run command | `npm test -- --run wbs` |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WBS-04 | Generate Plan enqueues BullMQ job, polls for result, shows modal preview, confirms and writes to DB | integration | `npm test -- --run tests/wbs/generate-plan.test.ts -x` | ❌ Wave 0 |
| WBS-04 | Generate Plan deduplicates against existing wbs_items (no duplicates on re-run) | unit | `npm test -- --run tests/wbs/generate-dedup.test.ts -x` | ❌ Wave 0 |
| WBS-05 | CRUD API routes (POST /wbs, PATCH /wbs/[itemId], DELETE /wbs/[itemId], POST /wbs/reorder) | integration | `npm test -- --run tests/api/wbs-crud.test.ts -x` | ❌ Wave 0 |
| WBS-05 | Delete cascades to remove entire subtree | unit | `npm test -- --run tests/wbs/delete-cascade.test.ts -x` | ❌ Wave 0 |
| WBS-05 | Drag-and-drop updates parent_id and display_order correctly | integration | `npm test -- --run tests/wbs/reorder.test.ts -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --run tests/wbs/ -x` (all WBS tests, fail-fast)
- **Per wave merge:** `npm test -- --run` (full suite)
- **Phase gate:** Full suite green + manual smoke test (expand/collapse all 100+ nodes, drag L3 to different L1 section, Generate Plan with existing items) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/wbs/generate-plan.test.ts` — covers WBS-04 (enqueue, poll, modal, confirm)
- [ ] `tests/wbs/generate-dedup.test.ts` — covers WBS-04 (duplicate detection logic)
- [ ] `tests/api/wbs-crud.test.ts` — covers WBS-05 (API routes)
- [ ] `tests/wbs/delete-cascade.test.ts` — covers WBS-05 (recursive delete)
- [ ] `tests/wbs/reorder.test.ts` — covers WBS-05 (drag-and-drop reorder)
- [ ] Framework already installed (vitest 4.1.1) — no install needed

## Sources

### Primary (HIGH confidence)
- bigpanda-app/db/schema.ts (lines 771-785) — wbs_items table schema (project_id, parent_id, level, name, track, status, display_order, source_trace)
- bigpanda-app/lib/queries.ts (lines 1142-1148) — getWbsItems(projectId, track) already implemented
- bigpanda-app/app/api/projects/route.ts (lines 90-145) — ADR/Biggy template seeding logic with exact section names and hierarchy
- bigpanda-app/components/PhaseBoard.tsx — @dnd-kit usage pattern (DndContext, useSortable, handleDragEnd)
- bigpanda-app/components/InlineSelectCell.tsx — optimistic update pattern for inline editing
- bigpanda-app/app/api/ingestion/extract/route.ts — BullMQ job enqueue pattern
- bigpanda-app/worker/jobs/document-extraction.ts — BullMQ job handler pattern with Claude API calls
- package.json — confirmed @dnd-kit/core@6.3.1, @dnd-kit/sortable@10.0.0, lucide-react@0.577.0, Radix Dialog@1.1.15 installed
- .planning/phases/45-database-schema-foundation/45-CONTEXT.md — WBS template structure (ADR 10 sections, Biggy 5 sections)
- .planning/phases/47-work-breakdown-structure/47-CONTEXT.md — implementation decisions (ADR/Biggy tabs, Generate Plan UX, inline CRUD UX, Level 1 locked)

### Secondary (MEDIUM confidence)
- .planning/STATE.md — established patterns (requireSession, optimistic UI, BullMQ + polling, React Flow dynamic import)
- vitest.config.ts — test framework configuration, node environment, setupFiles

### Tertiary (LOW confidence)
- None — all findings verified with codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed, verified in package.json and existing components
- Architecture: HIGH - patterns proven in PhaseBoard (drag-drop), InlineSelectCell (editing), extraction (BullMQ jobs)
- Pitfalls: MEDIUM - derived from common React tree/drag-drop issues + app-specific constraints (Level 1 locked, display_order gaps)

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (30 days — stable domain, proven patterns, no fast-moving dependencies)
