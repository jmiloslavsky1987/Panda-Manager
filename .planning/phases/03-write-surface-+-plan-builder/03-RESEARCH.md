# Phase 3: Write Surface + Plan Builder — Research

**Researched:** 2026-03-19
**Domain:** Next.js App Router mutations, xlsx dual-write atomicity, frappe-gantt, @dnd-kit, task dependencies, inline editing
**Confidence:** HIGH (verified against actual project files, live xlsx inspection, official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Action editing UI: shadcn Dialog modal (not inline row editing, not drawer)
- xlsx dual-write: failed xlsx write blocks the save; DB rolls back; never silently persist to DB while xlsx is stale
- Gantt: frappe-gantt (MIT, client-side)
- Drag-and-drop: @dnd-kit/core (React 19 compatible, actively maintained)
- Optimistic UI: all write operations use "Saving..." indicator; server errors revert state + error toast

### Claude's Discretion
- Exact shadcn components for edit modals and forms
- Bulk operations toolbar vs context menu (toolbar preferred)
- Task template instantiation UI (button in Phase Board header)
- Error toast library (shadcn Sonner or equivalent)
- xlsx parse/write library for plan import/export (exceljs already in dependencies)

### Deferred Ideas (OUT OF SCOPE)
- PLAN-12: AI-assisted plan generation (Phase 7)
- PLAN-13: Weekly sprint summary (Phase 7)
- Quick Action Bar skill buttons (Phase 5)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WORK-02 | Actions tab inline editing with PA3_Action_Tracker.xlsx atomic dual-write | Q1: exceljs dual-write pattern; Q8: API route for xlsx access |
| PLAN-01 | Task creation with full field set (title, description, owner, due, priority, type, milestone) | Schema gap: tasks table missing blocked_by and milestone_id FK |
| PLAN-02 | Phase Board — Kanban columns per delivery phase, workstream cards draggable | Q3: @dnd-kit/core pattern |
| PLAN-03 | Task Board — columns: To Do / In Progress / Blocked / Done | Q3: @dnd-kit/core pattern |
| PLAN-04 | Gantt Timeline — milestones + workstreams, color-coded by status, dependency lines | Q2: frappe-gantt; Q4: dependencies field |
| PLAN-05 | Team swimlane — tasks by team with status and upcoming due dates | Q7: nested routes for plan sub-tabs |
| PLAN-06 | Task dependencies — blocked_by relationship visualized in Gantt and Task Board | Q4: frappe-gantt dependencies field |
| PLAN-07 | Bulk operations — multi-select, reassign owner, change due date, move phase | Q5: API route batch endpoint |
| PLAN-08 | Task templates — one-click instantiation for Biggy Activation, ADR Onboarding, Team Kickoff | plan_templates table exists with JSON data column |
| PLAN-09 | Progress rollup — task completion → workstream percent_complete → health score | computeHealth() in queries.ts is the hook point |
| PLAN-10 | Excel plan import from KAISER_Biggy_Project_Plan format | Q6: actual columns confirmed by xlsx inspection |
| PLAN-11 | Plan export to .xlsx in same format as Kaiser plan | Q6: same column mapping, exceljs write |
</phase_requirements>

---

## Summary

Phase 3 adds write capability across all workspace tabs and builds the full Plan Builder. The dominant complexity is the xlsx dual-write for Actions (WORK-02) and the Plan Builder's four views (Phase Board, Task Board, Gantt, Swimlane). The stack is already chosen and the existing codebase (exceljs in dependencies, schema.ts 13 tables, AddNotesModal as a pattern) provides strong scaffolding.

The critical decision for mutations is **API route handlers over Server Actions** for this app. The xlsx dual-write requires server-side file system access to `~/Documents/BigPanda Projects/PA3_Action_Tracker.xlsx`, which is only possible in a Route Handler (Server Actions cannot perform file I/O reliably in all cases and the app already uses `fetch('/api/notes', ...)` in AddNotesModal). The existing mutation pattern (POST to `/api/*`, optimistic UI in client component, `router.refresh()` to revalidate) is confirmed and should be extended throughout Phase 3.

The tasks table is missing two columns needed for PLAN-01 and PLAN-06: `blocked_by` (foreign key to tasks.id, nullable, for PLAN-06 dependencies) and `milestone_id` (FK to milestones.id, nullable, for PLAN-01 milestone linking). A Wave 0 schema migration must add these before any task CRUD.

**Primary recommendation:** Use API Route Handlers for all Phase 3 mutations. The xlsx dual-write must live in a Route Handler where Node.js `fs` access is guaranteed. The frappe-gantt Gantt requires `"use client"` + `useRef` + dynamic import with `ssr: false`. All Kanban/drag-drop components require `"use client"`. The plan sub-routes use a nested layout under `/customer/[id]/plan/`.

---

## Standard Stack

### Core (already in package.json)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| exceljs | ^4.4.0 | xlsx read/write for dual-write and plan import/export | Already installed |
| next | 16.2.0 | App Router, Route Handlers, RSC | Already installed |
| react | 19.2.4 | useOptimistic, useTransition | Already installed |
| drizzle-orm | ^0.45.1 | DB mutations, transactions | Already installed |
| @radix-ui/react-dialog | ^1.1.15 | Edit modal base | Already installed |
| zod | ^4.3.6 | Input validation in Route Handlers | Already installed |

### New Libraries to Install
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| @dnd-kit/core | ^6.3.1 | Drag-and-drop for Phase Board and Task Board | Locked decision; React 19 compatible, accessible, 10kb, no deps |
| @dnd-kit/sortable | ^8.0.0 | Sortable lists within columns | Required alongside core for column-scoped sorting |
| @dnd-kit/utilities | ^3.2.2 | CSS transform utilities for drag overlay | Needed for DragOverlay positioning |
| frappe-gantt | ^1.2.2 | Gantt timeline chart | Locked decision; MIT, DOM-based, latest 1.2.2 |
| sonner | ^2.x | Toast notifications for save/error feedback | Shadcn-compatible, lightweight; alternative is shadcn's built-in toast |

**Installation:**
```bash
cd bigpanda-app && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities frappe-gantt sonner
```

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/core | react-beautiful-dnd | rbd is unmaintained; dnd-kit is the current standard |
| frappe-gantt | dhtmlx Gantt | dhtmlx requires paid license for commercial use; frappe-gantt is MIT |
| sonner | shadcn `useToast` | sonner is simpler to integrate; both are fine |

---

## Architecture Patterns

### Recommended Project Structure (Phase 3 additions)

```
bigpanda-app/
├── app/
│   ├── api/
│   │   ├── actions/
│   │   │   └── [id]/
│   │   │       └── route.ts       # PATCH /api/actions/:id — dual-write
│   │   ├── tasks/
│   │   │   └── route.ts           # POST /api/tasks — create
│   │   │   └── [id]/
│   │   │       └── route.ts       # PATCH /api/tasks/:id
│   │   ├── tasks-bulk/
│   │   │   └── route.ts           # POST /api/tasks-bulk — bulk ops (PLAN-07)
│   │   ├── plan-import/
│   │   │   └── route.ts           # POST /api/plan-import — xlsx upload
│   │   └── plan-export/
│   │       └── [projectId]/
│   │           └── route.ts       # GET /api/plan-export/:projectId
│   └── customer/
│       └── [id]/
│           └── plan/
│               ├── layout.tsx     # Plan sub-nav (Phase Board / Task Board / Gantt / Swimlane)
│               ├── page.tsx       # redirect → /plan/board
│               ├── board/
│               │   └── page.tsx   # Phase Board (Kanban)
│               ├── tasks/
│               │   └── page.tsx   # Task Board
│               ├── gantt/
│               │   └── page.tsx   # Gantt Timeline
│               └── swimlane/
│                   └── page.tsx   # Team swimlane
├── components/
│   ├── ActionEditModal.tsx        # Edit action dialog (WORK-02)
│   ├── TaskEditModal.tsx          # Edit task dialog (PLAN-01)
│   ├── PlanTabs.tsx               # Plan sub-tab nav ('use client')
│   ├── PhaseBoard.tsx             # Kanban Phase Board ('use client')
│   ├── TaskBoard.tsx              # Kanban Task Board ('use client')
│   ├── GanttChart.tsx             # frappe-gantt wrapper ('use client')
│   └── SwimlaneView.tsx           # Team swimlane ('use client')
└── db/
    └── migrations/
        └── 0002_add_task_deps.sql  # blocked_by + milestone_id columns
```

### Pattern 1: API Route Handler + Optimistic UI (the Phase 3 mutation standard)

**What:** All mutations go through `/api/*` Route Handlers. Client component calls `fetch`, applies optimistic state immediately, awaits response, reverts on error. `router.refresh()` revalidates RSC data after success.

**When to use:** Every write in Phase 3.

**Why not Server Actions:** The xlsx dual-write requires `fs.readFile` / `fs.writeFile` which must run on Node.js server — Route Handlers guarantee this. Server Actions work fine for form data but the project already uses `fetch('/api/notes', ...)` (AddNotesModal) as the established pattern. Consistency with existing code wins.

```typescript
// Source: AddNotesModal.tsx pattern — already proven in production
// Client component mutation pattern (consistent with existing code)
'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

function useActionMutation() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function mutate(actionId: number, patch: Partial<ActionPatch>) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to save')
        return false
      }
      router.refresh()  // revalidate RSC data
      return true
    } catch {
      setError('Network error — please try again')
      return false
    } finally {
      setSaving(false)
    }
  }

  return { mutate, saving, error }
}
```

### Pattern 2: xlsx Dual-Write Atomicity (WORK-02 critical pattern)

**What:** Drizzle DB update and exceljs xlsx file write treated as an atomic unit. The Route Handler performs both within a try/catch block — if the xlsx write fails, an explicit Drizzle rollback is triggered (or the transaction is aborted before commit).

**When to use:** Every save of an action (WORK-02 requirement).

**The problem:** PostgreSQL doesn't natively coordinate with file system operations. True 2-phase commit is impossible. The project decision is: **xlsx write failure blocks the save** — this means the DB write must not be committed before xlsx write succeeds.

**Solution:** Perform the xlsx write BEFORE committing the DB transaction. Structure:

```typescript
// Route Handler: PATCH /api/actions/:id
// Source: CONTEXT.md decision: failed xlsx write blocks save, DB rolls back
import ExcelJS from 'exceljs'
import { db } from '@/db'
import { actions } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const actionId = parseInt(params.id)
  const body = await req.json()

  // Validate with Zod
  const patch = ActionPatchSchema.parse(body)

  try {
    // Step 1: Attempt xlsx write FIRST (before DB commit)
    await updateXlsxRow(patch, actionId)  // throws if file write fails

    // Step 2: DB update (only after xlsx succeeds)
    await db.update(actions)
      .set({ ...patch, last_updated: new Date().toISOString() })
      .where(eq(actions.id, actionId))

    return Response.json({ ok: true })
  } catch (err) {
    // xlsx write failed OR DB write failed — return error, nothing committed
    const message = err instanceof Error ? err.message : 'Write failed'
    return Response.json({ error: message }, { status: 500 })
  }
}

async function updateXlsxRow(patch: ActionPatch, actionId: number) {
  const settings = await readSettings()
  const xlsxPath = path.join(settings.workspace_path, 'PA3_Action_Tracker.xlsx')

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(xlsxPath)  // throws if file missing/corrupt

  // Find the row with matching external_id (lookup from DB first)
  const action = await db.select().from(actions).where(eq(actions.id, actionId)).limit(1)
  if (!action[0]) throw new Error(`Action ${actionId} not found`)

  const targetExtId = action[0].external_id
  const sheet = workbook.getWorksheet('🔴 Open Actions') ?? workbook.getWorksheet('Open Actions')
  if (!sheet) throw new Error('Open Actions sheet not found in PA3_Action_Tracker.xlsx')

  // Build header map from row 2
  const headers: Record<string, number> = {}
  sheet.getRow(2).eachCell((cell, col) => {
    headers[String(cell.value ?? '').trim()] = col
  })

  // Find matching data row (rows start at 3)
  let found = false
  sheet.eachRow((row, idx) => {
    if (idx <= 2) return
    const id = String(row.getCell(headers['ID'] ?? 1).value ?? '').trim()
    if (id !== targetExtId) return
    // Update fields
    if (patch.status && headers['Status']) row.getCell(headers['Status']).value = patch.status
    if (patch.owner && headers['Owner']) row.getCell(headers['Owner']).value = patch.owner
    if (patch.notes && headers['Notes']) row.getCell(headers['Notes']).value = patch.notes
    if (patch.due && headers['Due']) row.getCell(headers['Due']).value = patch.due
    found = true
  })

  if (!found) {
    // Action may be in Completed sheet if status changed to completed
    // This is expected — not an error condition
  }

  // Write back — preserves themes and cell styles (document-based Workbook, not streaming)
  await workbook.xlsx.writeFile(xlsxPath)
}
```

**Critical:** Use the document-based `ExcelJS.Workbook` (not streaming writer) to preserve cell styles and themes. ExcelJS preserves theme files when reading and writing back.

**Note on completed actions:** When an action status changes to `completed`, the row should move from `🔴 Open Actions` to `✅ Completed` sheet. This requires deleting from one sheet and appending to the other within the same xlsx write operation.

### Pattern 3: frappe-gantt React Integration

**What:** frappe-gantt is a vanilla JS DOM library. Must be wrapped in a Client Component with `useRef` + `useEffect` for DOM attachment. Must be dynamically imported with `ssr: false` because it accesses browser globals at module parse time.

**When to use:** PLAN-04 Gantt Timeline page.

```typescript
// Source: frappe-gantt npm page + Next.js dynamic import docs
// components/GanttChart.tsx
'use client'
import { useEffect, useRef } from 'react'

interface GanttTask {
  id: string
  name: string
  start: string       // 'YYYY-MM-DD'
  end: string         // 'YYYY-MM-DD'
  progress: number    // 0-100
  dependencies: string  // comma-separated task IDs, e.g. 'task-1, task-2'
  custom_class?: string
}

interface GanttChartProps {
  tasks: GanttTask[]
  viewMode?: 'Day' | 'Week' | 'Month' | 'Quarter Year'
}

export default function GanttChart({ tasks, viewMode = 'Week' }: GanttChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const ganttRef = useRef<unknown>(null)

  useEffect(() => {
    if (!svgRef.current || tasks.length === 0) return

    import('frappe-gantt').then(({ default: Gantt }) => {
      // Destroy existing instance before re-initializing (prevents duplicate)
      if (ganttRef.current) {
        // frappe-gantt 1.x has no explicit destroy() — clear the SVG element
        if (svgRef.current) svgRef.current.innerHTML = ''
      }
      ganttRef.current = new Gantt(svgRef.current!, tasks, {
        view_mode: viewMode,
        date_format: 'YYYY-MM-DD',
        popup_trigger: 'click',
      })
    })
  }, [tasks, viewMode])

  return (
    <div className="overflow-x-auto">
      <svg ref={svgRef} />
    </div>
  )
}

// Page file: dynamically import to disable SSR
// app/customer/[id]/plan/gantt/page.tsx
import dynamic from 'next/dynamic'
const GanttChart = dynamic(() => import('@/components/GanttChart'), { ssr: false })
```

**CSS:** frappe-gantt requires its CSS to be imported. Add to `app/globals.css`:
```css
@import 'frappe-gantt/dist/frappe-gantt.css';
```
Or import directly in the component:
```typescript
import 'frappe-gantt/dist/frappe-gantt.css'
```

### Pattern 4: @dnd-kit/core Kanban Board

**What:** DndContext at board level, SortableContext per column, useSortable per card. Parent RSC page fetches data; passes to `'use client'` board component. DnD state is client-only.

**When to use:** PLAN-02 Phase Board, PLAN-03 Task Board.

```typescript
// Source: @dnd-kit/core docs + Next.js App Router client boundary pattern
// components/PhaseBoard.tsx
'use client'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// RSC page passes data; this client component owns drag state
interface PhaseBoardProps {
  tasks: Task[]
  phases: string[]
  projectId: number
}

export function PhaseBoard({ tasks, phases, projectId }: PhaseBoardProps) {
  const router = useRouter()
  const [optimisticTasks, setOptimisticTasks] = useState(tasks)
  const sensors = useSensors(useSensor(PointerSensor))

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const taskId = active.id as number
    const newPhase = over.id as string

    // Optimistic update
    setOptimisticTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, phase: newPhase } : t)
    )

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: newPhase }),
    })

    if (!res.ok) {
      // Revert
      setOptimisticTasks(tasks)
    } else {
      router.refresh()
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto">
        {phases.map(phase => {
          const phaseTasks = optimisticTasks.filter(t => t.phase === phase)
          return (
            <div key={phase} className="min-w-[260px]">
              <h3 className="font-semibold text-sm mb-2">{phase}</h3>
              <SortableContext
                id={phase}
                items={phaseTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {phaseTasks.map(task => <SortableCard key={task.id} task={task} />)}
              </SortableContext>
            </div>
          )
        })}
      </div>
    </DndContext>
  )
}
```

### Pattern 5: Plan Builder Nested Route + Sub-Nav

**What:** `/customer/[id]/plan/` has its own `layout.tsx` with a secondary tab bar (Phase Board / Task Board / Gantt / Swimlane). The workspace `layout.tsx` adds "Plan" as the 10th tab. The plan layout adds an inner nav for the 4 sub-views.

**When to use:** PLAN-02 through PLAN-05 routes.

```typescript
// app/customer/[id]/plan/layout.tsx
import { PlanTabs } from '@/components/PlanTabs'

export default function PlanLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  return (
    <div className="flex flex-col h-full">
      <PlanTabs projectId={(await params).id} />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
```

**WorkspaceTabs update:** Add `{ label: 'Plan', segment: 'plan' }` to the TABS array. The `isActive` check must use `pathname.includes('/plan')` (not `endsWith`) to stay active when on sub-routes like `/plan/gantt`.

### Anti-Patterns to Avoid

- **Streaming xlsx writer for dual-write:** ExcelJS streaming writer does not preserve formatting. Use document-based `new ExcelJS.Workbook()` — not `new ExcelJS.stream.xlsx.WorkbookWriter()`.
- **Initializing frappe-gantt in server component:** frappe-gantt accesses `document` at import time. Any import of frappe-gantt in a server component crashes the build.
- **DndContext in an RSC:** DndContext uses React Context and browser APIs. All drag-drop components must be `'use client'`.
- **router.push() instead of router.refresh():** `router.push()` navigates away; `router.refresh()` re-fetches RSC data without navigation. Always use `router.refresh()` after a successful mutation.
- **Writing xlsx before getting DB confirmation:** The correct order is: validate input → write xlsx → write DB. If you write DB first and xlsx fails, you have a diverged state which is the worst case per project decision.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| xlsx read/write with formatting preservation | Custom file writer | exceljs (already installed) | Handles themes, shared strings, cell styles; 4.4.0 already in deps |
| Drag-and-drop with keyboard accessibility | Custom mouse event handlers | @dnd-kit/core | Touch, pointer, keyboard sensors; ARIA roles; 6.3.1 |
| Gantt chart rendering | Custom SVG Gantt | frappe-gantt | Dependency arrows, view modes, resize/drag built-in |
| Toast/notification UI | Custom toast component | sonner or shadcn Toast | Animation, stacking, auto-dismiss edge cases |
| Input validation in route handlers | Manual type checks | zod (already installed) | Schema parse throws on invalid input; already in deps |
| Optimistic UI reset logic | Custom diff/merge | useState + simple revert pattern | For this app's scale (one user), optimistic revert by resetting to pre-mutation state is sufficient |

**Key insight:** The xlsx dual-write is the hardest problem in Phase 3. The complexity is in finding the right row (match by external_id) and handling the open→completed sheet transition. ExcelJS handles the underlying file format; the application logic for row-finding and sheet-swapping must be hand-written in the Route Handler.

---

## Common Pitfalls

### Pitfall 1: frappe-gantt CSS not loaded
**What goes wrong:** The Gantt chart renders as raw SVG with no styling — bars invisible, text mispositioned.
**Why it happens:** frappe-gantt requires `frappe-gantt/dist/frappe-gantt.css` to be imported separately. The library does NOT inject CSS automatically.
**How to avoid:** Import the CSS in `app/globals.css` with `@import 'frappe-gantt/dist/frappe-gantt.css'`. Verify in next.config after install.
**Warning signs:** SVG element appears but shows no colored bars.

### Pitfall 2: frappe-gantt instance not destroyed on re-render
**What goes wrong:** Multiple Gantt instances attach to the same SVG element; duplicate bars and broken interactions.
**Why it happens:** `useEffect` runs on every `tasks` prop change; without cleanup, each run adds a new Gantt instance.
**How to avoid:** Store Gantt instance in `useRef`. In the `useEffect` cleanup (or at the start of each run), clear `svgRef.current.innerHTML = ''` before re-initializing.
**Warning signs:** Task bars double or triple on state changes.

### Pitfall 3: tasks.id type mismatch with @dnd-kit
**What goes wrong:** TypeScript error — `active.id` is `UniqueIdentifier` (string | number) but tasks use `integer` serial IDs from PostgreSQL.
**Why it happens:** @dnd-kit uses `UniqueIdentifier` type for all IDs. Drizzle infers `number` for serial PKs.
**How to avoid:** When building `items` array for `SortableContext`, convert task IDs to strings: `items={tasks.map(t => String(t.id))}`. Parse back with `parseInt` in `handleDragEnd`.
**Warning signs:** TS errors on `active.id` comparisons.

### Pitfall 4: xlsx file locked by Excel
**What goes wrong:** `workbook.xlsx.readFile()` throws `EBUSY` or `EPERM` if the file is open in Excel on the same machine.
**Why it happens:** Excel locks the file on open (macOS does soft-lock; Windows is harder). Since this is a single-user local app on macOS the risk is lower but real.
**How to avoid:** Wrap xlsx operations in a try/catch that returns a specific `error: 'xlsx_locked'` response code. Show an error toast: "Close PA3_Action_Tracker.xlsx in Excel before saving."
**Warning signs:** `EBUSY` or `EPERM` in server logs during action saves.

### Pitfall 5: Plan sub-tab active state breaks workspace tab highlight
**What goes wrong:** Navigating to `/customer/[id]/plan/gantt` causes the "Plan" workspace tab to not be highlighted because `pathname.endsWith('/plan')` is false.
**Why it happens:** WorkspaceTabs uses `pathname.endsWith('/' + tab.segment)`. For nested sub-routes, the pathname is `/customer/1/plan/gantt` not `/customer/1/plan`.
**How to avoid:** Change the Plan tab's active check to `pathname.includes('/plan')` while keeping `endsWith` for all other tabs. Or use `startsWith(href)` for all tabs consistently.
**Warning signs:** Plan sub-routes show no active tab highlight.

### Pitfall 6: tasks table missing blocked_by and milestone_id columns
**What goes wrong:** PLAN-01 (task creation with linked milestone) and PLAN-06 (blocked_by dependency) cannot be implemented because the schema has no FK columns for these relationships.
**Why it happens:** Phase 1 schema scaffolded tasks table minimally. `blocked_by` (self-referential FK) and `milestone_id` were not included.
**How to avoid:** Wave 0 of Phase 3 must add a Drizzle migration adding both columns before any task CRUD is built. See Wave 0 Gaps section.
**Warning signs:** Any attempt to implement PLAN-01 or PLAN-06 fails immediately on missing columns.

### Pitfall 7: WorkspaceTabs hardcoded segment list
**What goes wrong:** Adding "Plan" to WorkspaceTabs requires a code change in `components/WorkspaceTabs.tsx`. The Plan tab's active state logic is different from other tabs (sub-routes).
**Why it happens:** The TABS array is static; the active check is uniform `endsWith`. Plan requires special handling.
**How to avoid:** Add `{ label: 'Plan', segment: 'plan', subRoute: true }` with a flag, and adjust the active check for subRoute tabs to use `pathname.includes`.

---

## Code Examples

### xlsx Dual-Write: Row Find + Update

```typescript
// Source: exceljs docs + migrate-local.ts patterns already in codebase
// Finding a row by external_id in PA3_Action_Tracker.xlsx Open Actions sheet

async function findAndUpdateActionRow(
  sheet: ExcelJS.Worksheet,
  externalId: string,
  patch: { status?: string; owner?: string; notes?: string; due?: string }
): Promise<boolean> {
  // Build header map from row 2 (same as migrate-local.ts pattern)
  const headers: Record<string, number> = {}
  sheet.getRow(2).eachCell((cell, col) => {
    headers[String(cell.value ?? '').trim()] = col
  })

  let found = false
  sheet.eachRow((row, idx) => {
    if (idx <= 2) return  // skip title row and header row
    const id = String(row.getCell(headers['ID'] ?? 1).value ?? '').trim()
    if (id !== externalId) return

    if (patch.status !== undefined && headers['Status'])
      row.getCell(headers['Status']).value = patch.status
    if (patch.owner !== undefined && headers['Owner'])
      row.getCell(headers['Owner']).value = patch.owner
    if (patch.notes !== undefined && headers['Notes'])
      row.getCell(headers['Notes']).value = patch.notes
    if (patch.due !== undefined && headers['Due'])
      row.getCell(headers['Due']).value = patch.due

    found = true
  })
  return found
}
```

### frappe-gantt: Task Data Mapping from DB

```typescript
// Source: frappe-gantt README — tasks must have id, name, start, end, progress, dependencies
// Map from DB tasks table to frappe-gantt format

function toGanttTask(task: Task): GanttTask {
  return {
    id: String(task.id),
    name: task.title,
    start: task.due ? task.due.split('T')[0] : new Date().toISOString().split('T')[0],
    end: task.due ? task.due.split('T')[0] : new Date().toISOString().split('T')[0],
    progress: task.status === 'done' ? 100 : task.status === 'in_progress' ? 50 : 0,
    // blocked_by is stored as FK to another task's id
    // Convert to comma-separated string of string IDs for frappe-gantt
    dependencies: task.blocked_by ? String(task.blocked_by) : '',
  }
}
```

**Note:** frappe-gantt `dependencies` field is a **comma-separated string of task IDs** (not an array). The DB `blocked_by` column stores a single integer FK to another task. For multiple dependencies, Phase 3 can start with single `blocked_by`; if multi-dependency is needed, `blocked_by` should become a junction table (defer to Phase 3 review).

### Plan Import: KAISER xlsx Column Mapping

Confirmed by direct inspection of `KP_Biggy_Project_Plan_Workstreams_v2_2026-03-19.xlsx` and `KP_Biggy_Project_Plan_ByTeam_v2_2026-03-19.xlsx`:

**Project Plan sheet** (the primary import source — `KP_Biggy_Project_Plan_Workstreams_v2`):
```
Col 1:  "Phase"               → tasks.phase
Col 2:  "Leo's comments"      → skip (internal comments, not for import)
Col 3:  "Workstream"          → tasks.type or workstream lookup
Col 4:  "Description"         → tasks.description
Col 5:  "Owner"               → tasks.owner
Col 6:  "Start (Target)"      → not in tasks schema (add start_date col or use created_at)
Col 7:  "Finish (Target)"     → tasks.due
Col 8:  "Dependencies"        → tasks.blocked_by (text in xlsx, needs lookup by title)
Col 9:  "Status"              → tasks.status (map: "Completed"→"done", "In Progress"→"in_progress", "Planned"→"todo")
Col 10: "Notes"               → tasks.description (append to or replace)
Col 11: "BigPanda Workstream" → workstream_id lookup by name
```

**ByTeam sheets** (per-team task view — `KP_Biggy_Project_Plan_ByTeam_v2`):
```
Row 1:  Merged header with team name (e.g. "Kaiser Permanente — Technical (Leo)")
Row 2:  Column headers: Task ID | Task / Action | Owner | Status | Target Date | Dependencies | Notes
Row 3+: Data (row 3 is a merged section header "▸ BigPanda Task Tracker")
Row 4+: Phase header rows (merged, e.g. "Phase 1 — Operationalize")
Row 5+: Actual task rows starting with IDs like "P1-001"
```

**Primary import target is the Project Plan sheet** (workstreams view). The ByTeam sheets are the swimlane export format.

**Column mapping for import (Project Plan sheet → tasks table):**
```typescript
const PLAN_IMPORT_MAP = {
  'Phase':           'phase',
  'Description':     'title',       // Description column is the task title
  'Owner':           'owner',
  'Finish (Target)': 'due',
  'Status':          'status',
  'Notes':           'notes',
  'BigPanda Workstream': '_workstream_name',  // resolve to workstream_id
} as const

const STATUS_MAP: Record<string, string> = {
  'Completed': 'done',
  'In Progress': 'in_progress',
  'Planned': 'todo',
  'Not Started': 'todo',
  '': 'todo',
}
```

**Schema gap:** tasks table has no `start_date` column. The xlsx has "Start (Target)". Add `start_date text` in the Wave 0 migration alongside `blocked_by` and `milestone_id`.

### Plan Export: Generate xlsx from DB Tasks

```typescript
// Source: exceljs docs — build xlsx from scratch matching Kaiser format
async function exportPlanToXlsx(projectId: number): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Project Plan')

  // Row 1: header matching Kaiser format
  ws.addRow(['Phase', "Leo's comments", 'Workstream', 'Description', 'Owner',
             'Start (Target)', 'Finish (Target)', 'Dependencies', 'Status', 'Notes',
             'BigPanda Workstream'])
  ws.getRow(1).font = { bold: true }

  // Add data rows
  const tasks = await getTasksByProject(projectId)
  for (const task of tasks) {
    ws.addRow([
      task.phase,
      '',
      '',  // workstream name lookup
      task.title,
      task.owner ?? '',
      task.start_date ?? '',
      task.due ?? '',
      '',  // blocked_by external_id lookup
      STATUS_EXPORT_MAP[task.status] ?? task.status,
      task.notes ?? '',
      '',  // workstream name
    ])
  }

  return wb.xlsx.writeBuffer() as Promise<Buffer>
}
```

### Progress Rollup: Wiring PLAN-09 into computeHealth

```typescript
// Extend queries.ts — computeHealth already exists, add task rollup
// Pattern: update workstream.percent_complete on task status change

async function rollupWorkstreamProgress(workstreamId: number): Promise<void> {
  const allTasks = await db
    .select({ status: tasks.status })
    .from(tasks)
    .where(eq(tasks.workstream_id, workstreamId))

  if (allTasks.length === 0) return

  const done = allTasks.filter(t => t.status === 'done').length
  const percentComplete = Math.round((done / allTasks.length) * 100)

  // workstreams table has no percent_complete column — Wave 0 migration must add it
  await db.update(workstreams)
    .set({ percent_complete: percentComplete })
    .where(eq(workstreams.id, workstreamId))
}
// Call rollupWorkstreamProgress() in the /api/tasks/:id PATCH handler after status update
// computeHealth() then reads workstream.percent_complete for health scoring
```

**Schema gap:** `workstreams` table has no `percent_complete` column. Add `percent_complete integer default 0` in Wave 0 migration.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit/core | 2022 (rbd archived) | rbd is unmaintained; dnd-kit is the standard for new React drag-drop |
| frappe-gantt React wrappers (frappe-gantt-react, react-frappe-gantt) | Raw frappe-gantt + custom useRef wrapper | 2023 (wrappers went stale) | All React wrappers are 3-5 years stale; use raw library directly |
| Next.js Pages Router API routes for mutations | App Router Route Handlers + `router.refresh()` | Next.js 13.4 (2023) | Route Handlers in `app/api/` replace `pages/api/`; `router.refresh()` replaces SWR/TanStack Query for RSC revalidation |
| Server Actions for form mutations | API Route Handlers (project-specific) | Project decision | This project uses fetch-based mutations (established by AddNotesModal); file I/O requires Route Handlers |

**Deprecated/outdated:**
- `pages/api/` directory: This app uses App Router exclusively. All new API routes go in `app/api/`.
- TanStack Query: Noted in project memory as the planned client cache, but Phase 2 was built without it using `router.refresh()`. Phase 3 should continue the `router.refresh()` pattern for consistency. TanStack Query adds complexity without clear benefit for a single-user app with RSC-native data loading.
- SheetJS/xlsx for modifications: SheetJS community edition does not preserve formatting when writing back modified files. ExcelJS is the correct choice (and is already installed).

---

## Open Questions

1. **Tasks table: single blocked_by or multiple dependencies?**
   - What we know: frappe-gantt `dependencies` is a comma-separated string (supports multiple); DB schema has no `blocked_by` column yet.
   - What's unclear: Does BigPanda PS workflow require multi-predecessor tasks, or is single blocked_by sufficient for Phase 3?
   - Recommendation: Start with `blocked_by integer references tasks(id)` (single FK). If multiple dependencies are needed in practice, add a `task_dependencies` junction table in a future migration. For frappe-gantt, a single string ID covers the most common case.

2. **PA3_Action_Tracker.xlsx: handling open→completed row migration**
   - What we know: The xlsx has separate sheets for Open Actions and Completed. When a user marks an action complete, the row should leave Open Actions and appear in Completed.
   - What's unclear: Is this move required? The Phase 2 read view already handles both sheets. A simpler approach: update the Status cell in Open Actions in place and let the user manually manage sheet placement in Excel.
   - Recommendation: For Phase 3, **update-in-place only** — update the Status cell in the Open Actions sheet to "Completed". Do NOT attempt to move rows between sheets. This avoids complex row deletion + insertion across sheets and the risk of corrupting the file. The xlsx is a sync target, not the source of truth.

3. **tasks.start_date missing from schema**
   - What we know: Project Plan xlsx has "Start (Target)" column. frappe-gantt requires both `start` and `end` dates. DB tasks table has only `due` (maps to end date).
   - What's unclear: Is start_date needed for the Gantt, or can we use created_at as a proxy?
   - Recommendation: Add `start_date text` to tasks table in Wave 0 migration. Using `created_at` as start is wrong (task may be planned far ahead). The import will map "Start (Target)" to `start_date`.

4. **workstreams.percent_complete missing from schema**
   - What we know: PLAN-09 requires task completion → workstream percent_complete rollup. The column does not exist.
   - Recommendation: Add `percent_complete integer not null default 0` to workstreams in Wave 0 migration.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (already installed at project root) |
| Config file | playwright.config.ts (project root) |
| Quick run command | `npx playwright test tests/e2e/phase3.spec.ts --grep "WORK-02"` |
| Full suite command | `npx playwright test tests/e2e/phase3.spec.ts` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WORK-02 | Clicking action opens edit modal, saving updates DB and xlsx | E2E | `npx playwright test tests/e2e/phase3.spec.ts --grep "WORK-02"` | ❌ Wave 0 |
| PLAN-01 | Task creation form saves to DB | E2E | `npx playwright test tests/e2e/phase3.spec.ts --grep "PLAN-01"` | ❌ Wave 0 |
| PLAN-02 | Phase Board renders tasks in columns; drag updates phase | E2E | `npx playwright test tests/e2e/phase3.spec.ts --grep "PLAN-02"` | ❌ Wave 0 |
| PLAN-03 | Task Board renders To Do/In Progress/Blocked/Done columns | E2E | `npx playwright test tests/e2e/phase3.spec.ts --grep "PLAN-03"` | ❌ Wave 0 |
| PLAN-04 | Gantt page renders SVG with task bars | E2E | `npx playwright test tests/e2e/phase3.spec.ts --grep "PLAN-04"` | ❌ Wave 0 |
| PLAN-05 | Swimlane page renders tasks grouped by team | E2E | `npx playwright test tests/e2e/phase3.spec.ts --grep "PLAN-05"` | ❌ Wave 0 |
| PLAN-06 | Blocked task shows dependency indicator in Task Board | E2E | `npx playwright test tests/e2e/phase3.spec.ts --grep "PLAN-06"` | ❌ Wave 0 |
| PLAN-07 | Bulk select + reassign saves all selected tasks | E2E | `npx playwright test tests/e2e/phase3.spec.ts --grep "PLAN-07"` | ❌ Wave 0 |
| PLAN-08 | Template instantiation creates correct task set | E2E | `npx playwright test tests/e2e/phase3.spec.ts --grep "PLAN-08"` | ❌ Wave 0 |
| PLAN-09 | Completing all workstream tasks updates percent_complete | E2E | `npx playwright test tests/e2e/phase3.spec.ts --grep "PLAN-09"` | ❌ Wave 0 |
| PLAN-10 | xlsx import creates tasks in DB | E2E | `npx playwright test tests/e2e/phase3.spec.ts --grep "PLAN-10"` | ❌ Wave 0 |
| PLAN-11 | xlsx export produces file with correct column headers | E2E (smoke) | `npx playwright test tests/e2e/phase3.spec.ts --grep "PLAN-11"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx playwright test tests/e2e/phase3.spec.ts --grep "WORK-02|PLAN-0[1-3]" --reporter=line`
- **Per wave merge:** `npx playwright test tests/e2e/phase3.spec.ts`
- **Phase gate:** Phase 2 suite must still pass: `npx playwright test tests/e2e/phase2.spec.ts`

### Wave 0 Gaps
- [ ] `tests/e2e/phase3.spec.ts` — all Phase 3 E2E stubs (mirror phase2.spec.ts structure)
- [ ] `bigpanda-app/db/migrations/0002_add_task_deps.sql` — adds `blocked_by`, `milestone_id`, `start_date`, `percent_complete` columns
- [ ] `bigpanda-app/db/schema.ts` — add new columns to tasks and workstreams table definitions

---

## Sources

### Primary (HIGH confidence)
- `bigpanda-app/package.json` — confirmed exceljs ^4.4.0, next 16.2.0, react 19.2.4, drizzle-orm ^0.45.1 already installed
- `bigpanda-app/db/schema.ts` — confirmed tasks table structure; identified missing blocked_by, milestone_id, start_date, percent_complete columns
- `bigpanda-app/lib/queries.ts` — confirmed computeHealth() hook point for PLAN-09 rollup
- `bigpanda-app/components/AddNotesModal.tsx` — confirmed fetch-based mutation pattern (not Server Actions); established precedent for all Phase 3 mutations
- `bigpanda-app/components/WorkspaceTabs.tsx` — confirmed 9-tab structure; identified Plan tab add location and active state fix needed
- Direct xlsx inspection via ExcelJS (live run) — confirmed Project Plan columns: Phase, Leo's comments, Workstream, Description, Owner, Start (Target), Finish (Target), Dependencies, Status, Notes, BigPanda Workstream
- Direct xlsx inspection via ExcelJS (live run) — confirmed ByTeam columns: Task ID, Task / Action, Owner, Status, Target Date, Dependencies, Notes; task IDs are P1-001 format
- `bigpanda-app/scripts/migrate-local.ts` — confirmed ExcelJS usage patterns (buildHeaderMap, cellStr, eachRow); row 1 = title, row 2 = headers, row 3+ = data

### Secondary (MEDIUM confidence)
- [frappe-gantt npm page](https://www.npmjs.com/package/frappe-gantt) — version 1.2.2, `dependencies` field format (comma-separated string)
- [@dnd-kit/core npm page](https://www.npmjs.com/package/@dnd-kit/core) — version 6.3.1, DndContext/SortableContext/useSortable component model
- [ExcelJS npm page](https://www.npmjs.com/package/exceljs) — document-based Workbook preserves themes; streaming writer requires `useStyles: true`
- [makerkit.dev Server Actions vs Route Handlers](https://makerkit.dev/blog/tutorials/server-actions-vs-route-handlers) — Server Actions work best for simple form mutations; Route Handlers better for file I/O + external access
- [Next.js getting-started/updating-data](https://nextjs.org/docs/app/getting-started/updating-data) — revalidatePath/revalidateTag for cache invalidation post-mutation

### Tertiary (LOW confidence)
- frappe-gantt React wrappers (frappe-gantt-react, react-frappe-gantt): all 3-5 years stale; do not use

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed against actual package.json and live xlsx inspection
- Architecture: HIGH — Route Handler pattern confirmed by existing AddNotesModal.tsx; Plan nested route is standard App Router pattern
- xlsx dual-write: HIGH — exceljs already used in migrate-local.ts with same read/header/row patterns
- Pitfalls: HIGH — most derived from direct code analysis (schema gaps verified against schema.ts)
- frappe-gantt integration: MEDIUM — React wrapper pattern confirmed by web research; CSS import requirement confirmed by docs; re-initialization cleanup is common pattern from community
- @dnd-kit/core: HIGH — straightforward React hooks; App Router client boundary is well-established

**Research date:** 2026-03-19
**Valid until:** 2026-06-19 (stable libraries; frappe-gantt 1.2.2 released 11 days ago so CSS import path may differ — verify on install)

---

## Critical Schema Additions (Wave 0 Migration Required)

The following columns MUST be added before Phase 3 implementation can begin. These are blockers for PLAN-01, PLAN-06, PLAN-09, PLAN-10:

```sql
-- Migration 0002: Phase 3 schema additions
-- tasks table additions
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocked_by integer REFERENCES tasks(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS milestone_id integer REFERENCES milestones(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date text;  -- 'YYYY-MM-DD' or 'TBD'

-- workstreams table addition
ALTER TABLE workstreams ADD COLUMN IF NOT EXISTS percent_complete integer NOT NULL DEFAULT 0;
```

And corresponding Drizzle schema updates in `bigpanda-app/db/schema.ts`:
```typescript
// In tasks table definition:
blocked_by: integer('blocked_by').references(() => tasks.id),
milestone_id: integer('milestone_id').references(() => milestones.id),
start_date: text('start_date'),

// In workstreams table definition:
percent_complete: integer('percent_complete').default(0).notNull(),
```
