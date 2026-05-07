# Phase 85: WBS MS Project-Style Overhaul — Research

**Researched:** 2026-05-07
**Domain:** React spreadsheet grid, PostgreSQL schema evolution, custom SVG Gantt dependency rendering
**Confidence:** HIGH (codebase read directly; all findings from primary source files)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **UI Style:** Spreadsheet grid (MS Project style), NOT an enhanced tree or hybrid. Every row = one task, every column = directly editable inline. Tab moves to next cell, Enter moves to next row. All fields visible per row.
- **Hierarchy Management:** Indent via Tab key or toolbar button (promotes row to child of row above). Outdent via Shift+Tab or toolbar button (demotes one level up). Two-track structure (ADR / Biggy) preserved as tab switcher. Hierarchy depth: unlimited. Level 1 "header" lock removed — all rows freely editable.
- **Dependencies:** FS (Finish-to-Start) and SS (Start-to-Start) only. No auto-scheduling. Predecessor column: comma-separated row numbers (e.g. "3" or "3,4"). Schema extensible to support FF/SF/lag later without a full migration. No dependency arrows in WBS grid.
- **New Columns / Fields:** `duration_days` integer nullable, `percent_complete` integer 0–100 replaces 3-state status enum (keep status for backward compat), `assignee` text nullable, predecessor links via separate junction table `wbs_dependencies (id, from_item_id, to_item_id, dependency_type ENUM 'FS'|'SS')`.
- **Features NOT in scope:** No auto-scheduling, no baseline/planned vs actual, no rollup calculations, no lag/lead time, no resource capacity, no SF/FF types.
- **Gantt Tab Updates:** Use `percent_complete` (0–100) for progress bar fill. Render dependency arrows between tasks. No other Gantt changes.
- **Backward Compatibility:** Existing `wbs_items` must migrate cleanly — `percent_complete` defaults from status (not_started=0, in_progress=50, complete=100). `wbsTaskAssignments` junction table unchanged. Gantt integration query updated to include `percent_complete` and dependencies.

### Claude's Discretion
- Grid library selection (evaluate against existing deps)
- SVG approach for Gantt dependency arrows
- Exact keyboard event handling implementation
- API batch-save vs per-cell-save strategy

### Deferred Ideas (OUT OF SCOPE)
- FF/SF dependency types — schema extensible, UI deferred
- Lag/lead time on dependencies — deferred
- Baseline snapshots — deferred
- Auto-scheduling / forward pass calculation — explicitly out of scope
- Resource capacity tracking — deferred
</user_constraints>

---

## Summary

This phase replaces the existing WBS tree (DnD-based expand/collapse card tree in `WbsTree.tsx` + `WbsNode.tsx`) with a flat spreadsheet grid. The current implementation uses `@dnd-kit/sortable` for drag-reorder, per-node React state for editing, and calls `PATCH /api/projects/[projectId]/wbs/[itemId]` for individual saves. The new grid must handle inline editing across multiple columns, Tab/Enter keyboard navigation across cells, and indent/outdent that rewrites `parent_id` in the database.

The Gantt chart (`GanttChart.tsx`) is a hand-rolled custom SVG/CSS implementation — it does NOT use `frappe-gantt` at all despite the package being in `package.json`. The Gantt renders dependency arrows by overlaying `<svg>` elements; the existing `GanttTask.dependencies` string field is already threaded through the data model but is never rendered as a visual arrow. Dependency arrow rendering for phase 85 must be hand-rolled in the same SVG-overlay style as the existing chart.

The schema additions (three new columns on `wbs_items`, one new table `wbs_dependencies`) are additive and non-destructive. The trickiest parts are: (1) robust Tab/Enter focus management across a virtualized-like grid without a full virtualization library, (2) keeping the predecessor row-number display in sync when rows are reordered, and (3) preventing React re-render storms when 100+ rows have per-cell edit state.

**Primary recommendation:** Build a hand-rolled spreadsheet grid component (`WbsGrid.tsx`) using a flat array of items + local optimistic state. Do NOT introduce a grid library — the project has no existing grid dependency and the schema/interaction model is unusual enough that library overhead outweighs benefit. Use a single focused-cell model (`{rowIdx, colKey}`) to avoid per-row state explosion.

---

## Standard Stack

### Core (already installed, no new deps needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | 19.2.4 | Component rendering | Already in project |
| `useRef` + `useCallback` | — | Focus management, keyboard nav | Zero-dep approach used throughout GanttChart |
| Drizzle ORM | ^0.45.1 | DB schema additions + queries | Already used for all DB access |
| Zod | ^4.3.6 | API body validation | Already used in all route handlers |
| `sonner` | ^2.0.7 | Toast feedback on save errors | Already used throughout |
| Tailwind CSS v4 | ^4 | Grid cell styling | Already used throughout |

### No New Dependencies Recommended
**Evaluated options:**

| Library | Bundle (min+gz) | Verdict |
|---------|----------------|---------|
| TanStack Table v8 | ~14 KB | Overkill — headless, no cell editing built-in, complex API for inline editing |
| AG Grid Community | ~100 KB+ | Too heavy; own styling system conflicts with Kata Design System |
| react-data-grid | ~40 KB | Closest fit but introduces new dep for a pattern we can build in ~300 LOC |
| Hand-rolled grid | 0 KB | Uses same patterns as existing GanttChart left panel (already a working spreadsheet-style column layout) |

The GanttChart left panel (lines 836–1033 of `GanttChart.tsx`) is already a spreadsheet-style column layout with inline `<input type="date">` cells — the same architecture applied to a full grid is the correct pattern for this codebase.

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@dnd-kit/sortable` | ^10.0.0 | Row reorder drag handle (optional, preserve) | If drag-to-reorder rows is kept alongside keyboard indent/outdent |
| `@radix-ui/react-dialog` | ^1.1.15 | Delete confirmation modal | Already used in `WbsNode.tsx` |

---

## Architecture Patterns

### Recommended Project Structure
```
components/
├── WbsGrid.tsx           # New: replaces WbsTree.tsx + WbsNode.tsx
├── WbsGrid.types.ts      # WbsGridItem, WbsGridColumn, FocusedCell types
├── WbsTree.tsx           # Preserved but replaced at the wbs/page.tsx level
├── WbsNode.tsx           # Preserved (Gantt still references WbsItem type)
└── GanttChart.tsx        # Updated: dependency arrows + percent_complete

app/api/projects/[projectId]/
├── wbs/route.ts             # Updated: remove level 2/3 restriction; add new fields
├── wbs/[itemId]/route.ts    # Updated: add percent_complete, duration_days, assignee
├── wbs/reorder/route.ts     # Updated: remove level 1 restriction, add indent semantics
└── wbs/dependencies/route.ts   # New: GET + POST for wbs_dependencies
    └── [depId]/route.ts        # New: DELETE for wbs_dependencies

db/
└── migrations/
    └── 0050_wbs_overhaul.sql   # New columns + new table + migration data

lib/
└── queries.ts   # Updated: getWbsItems returns new fields; new getWbsDependencies fn
```

### Pattern 1: Single Focused-Cell Model
**What:** One piece of state tracks which cell is currently editing: `{rowIdx: number, colKey: string} | null`. All cells render as `<span>` in view mode; the focused cell renders as `<input>`.
**When to use:** Prevents React from mounting 100+ inputs simultaneously. Matches the GanttChart pattern where date inputs are always mounted but the key interaction is controlled.

```typescript
// Source: derived from GanttChart.tsx inline date input pattern (lines 919-937)
type FocusedCell = { rowIdx: number; colKey: 'name' | 'duration_days' | 'percent_complete' | 'assignee' | 'predecessors' | 'start_date' | 'due_date' } | null

const [focusedCell, setFocusedCell] = useState<FocusedCell>(null)
const [localItems, setLocalItems] = useState<WbsGridItem[]>(items)

// Click to focus
function handleCellClick(rowIdx: number, colKey: FocusedCell['colKey']) {
  setFocusedCell({ rowIdx, colKey })
}

// Tab: advance to next column, wrap to next row
function handleKeyDown(e: React.KeyboardEvent, rowIdx: number, colIdx: number) {
  if (e.key === 'Tab') {
    e.preventDefault()
    const cols = EDITABLE_COLS
    const nextColIdx = e.shiftKey ? colIdx - 1 : colIdx + 1
    if (nextColIdx >= 0 && nextColIdx < cols.length) {
      setFocusedCell({ rowIdx, colKey: cols[nextColIdx] })
    } else if (!e.shiftKey && rowIdx < localItems.length - 1) {
      setFocusedCell({ rowIdx: rowIdx + 1, colKey: cols[0] })
    } else if (e.shiftKey && rowIdx > 0) {
      setFocusedCell({ rowIdx: rowIdx - 1, colKey: cols[cols.length - 1] })
    }
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    setFocusedCell({ rowIdx: rowIdx + 1, colKey: focusedCell!.colKey })
  }
}
```

### Pattern 2: Optimistic Local State + Debounced Save
**What:** `localItems` state mirrors DB. On cell blur or Enter, call `PATCH /api/projects/[projectId]/wbs/[itemId]` immediately (no debounce for name). For numeric fields (duration_days, percent_complete), debounce or save on blur only.
**When to use:** Same pattern as `WbsNode.tsx` `handleNameSave` — optimistic update + `router.refresh()` after save.

```typescript
// Source: WbsNode.tsx lines 118-145
async function saveCell(itemId: number, field: string, value: unknown) {
  // Optimistic: already updated in localItems
  const res = await fetch(`/api/projects/${projectId}/wbs/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [field]: value }),
  })
  if (!res.ok) {
    toast.error('Save failed — please try again')
    // Revert: re-fetch or restore from server snapshot
    router.refresh()
  }
}
```

### Pattern 3: Indent / Outdent via Reorder API
**What:** Indent = set `parent_id` to the item immediately above in the flat sorted list (the previous sibling or its last child). Outdent = set `parent_id` to current parent's `parent_id`.
**When to use:** On Tab key press when NOT in a cell edit, or on toolbar button click.

**Indent logic:**
```typescript
// Flatten tree to ordered array, find row above
function indentItem(items: WbsGridItem[], targetId: number): { newParentId: number | null } | null {
  const flatList = flattenTree(items)  // DFS-ordered flat array
  const idx = flatList.findIndex(i => i.id === targetId)
  if (idx === 0) return null  // Cannot indent first row
  const prevItem = flatList[idx - 1]
  // New parent = the previous item (or its last descendant if it has children? No — MS Project makes prev item the parent directly)
  return { newParentId: prevItem.id }
}

function outdentItem(items: WbsGridItem[], targetId: number): { newParentId: number | null } {
  const item = items.find(i => i.id === targetId)!
  if (!item.parent_id) return { newParentId: null }  // Already root, no-op
  const parent = items.find(i => i.id === item.parent_id)!
  return { newParentId: parent.parent_id ?? null }
}
```

The reorder route already handles `parent_id` update. Remove the level-1 restriction that currently blocks this.

### Pattern 4: Predecessor Column Parsing
**What:** Display predecessors as comma-separated row numbers (row position in the current flat DFS order). On edit, parse back to item IDs. This is purely a display transform — the DB stores `from_item_id`/`to_item_id` pairs.

```typescript
// Build row-number → item-id map from flat DFS order
function buildRowNumberMap(items: WbsGridItem[]): Map<number, number> {
  const flat = flattenTree(items)
  return new Map(flat.map((item, idx) => [idx + 1, item.id]))
}

// Display: item id → row number (inverse map)
function itemIdToRowNumber(itemId: number, rowNumberMap: Map<number, number>): number | null {
  for (const [rowNum, id] of rowNumberMap) {
    if (id === itemId) return rowNum
  }
  return null
}

// Parse "3,4" → array of item IDs
function parsePredecessors(input: string, rowNumberMap: Map<number, number>): number[] {
  return input.split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n))
    .map(rowNum => rowNumberMap.get(rowNum))
    .filter((id): id is number => id !== undefined)
}
```

### Pattern 5: Gantt Dependency Arrow Rendering (SVG Overlay)
**What:** After row positions are computed, draw SVG lines between task bars for FS/SS dependencies. The GanttChart already has absolute-positioned elements in the right panel — add an `<svg>` overlay with the same absolute positioning.

**Current Gantt architecture:** Custom hand-rolled SVG/CSS (NOT frappe-gantt despite the package being installed). The right panel (`rightRef`) contains a `<div>` with absolute-positioned bar elements. Dependency arrows are an SVG overlay on top.

```typescript
// Source: GanttChart.tsx right panel structure (lines 1036-1253)
// Add after the existing task rows:
<svg
  className="absolute top-0 left-0 pointer-events-none"
  style={{ width: Math.max(totalWidth, 800), height: rows.length * ROW_H + HEADER_H }}
>
  {dependencies.map(dep => {
    const fromRow = taskRowPositions.get(dep.from_item_id)
    const toRow = taskRowPositions.get(dep.to_item_id)
    if (!fromRow || !toRow) return null

    // FS: arrow from right edge of from-bar to left edge of to-bar
    const x1 = barLeft(fromRow.end) + barWidth(fromRow.start, fromRow.end)
    const y1 = fromRow.rowY + ROW_H / 2
    const x2 = barLeft(toRow.start)
    const y2 = toRow.rowY + ROW_H / 2

    return (
      <g key={dep.id}>
        <path
          d={`M ${x1} ${y1} C ${x1 + 20} ${y1}, ${x2 - 20} ${y2}, ${x2} ${y2}`}
          fill="none"
          stroke="#6366f1"
          strokeWidth={1.5}
          opacity={0.6}
          markerEnd="url(#arrowhead)"
        />
      </g>
    )
  })}
  <defs>
    <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
      <polygon points="0 0, 6 2, 0 4" fill="#6366f1" opacity={0.6} />
    </marker>
  </defs>
</svg>
```

### Anti-Patterns to Avoid
- **Per-row `useState` for editing:** Mounting 100 `<input>` elements causes layout thrashing. Use the single focused-cell model.
- **Calling `router.refresh()` on every keystroke:** Only call after blur/save, not during typing.
- **Using the `level` DB column for depth computation:** The STATE.md explicitly notes "WBS `level` column is unreliable — always compute visual depth from the `parent_id` chain." The existing `GanttChart.tsx` `buildWbsRows` already does this correctly (lines 133–144). The new WbsGrid must use the same `computeDepth()` approach.
- **Storing absolute row numbers in the DB:** Row numbers are positional display labels, not IDs. Never persist row numbers — always persist item IDs in `wbs_dependencies`.
- **Using `frappe-gantt` for dependency rendering:** Despite being in `package.json`, the Gantt chart is entirely hand-rolled and does not use frappe-gantt. Do not attempt to integrate it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast component | `sonner` (already installed) | Already used in WbsNode.tsx |
| Confirmation modal for delete | Custom modal | Radix `@radix-ui/react-dialog` (already installed) | Same as WbsNode.tsx delete dialog |
| Recursive subtree delete | Custom BFS in route handler | `deleteWbsSubtree()` in `lib/queries.ts` | Already handles BFS delete correctly |
| DB migration runner | Custom script | `scripts/run-migrations.ts` + `.sql` file in `db/migrations/` | Standard pattern; 0044–0049 all use this |
| Auth/ownership check | Custom session check | `requireProjectRole(projectId, 'user')` | Every route uses this pattern |

**Key insight:** The codebase has well-established patterns for every supporting concern. The only net-new code is the grid component, the dependencies API, and the Gantt arrow overlay.

---

## Common Pitfalls

### Pitfall 1: Level Column Drift
**What goes wrong:** After indent/outdent, the `level` column in `wbs_items` becomes stale because the route only updates `parent_id`. All code that reads `level` for display depth will show wrong indentation.
**Why it happens:** The reorder route (`wbs/reorder/route.ts`) updates `parent_id` and `display_order` but not `level`. The tree component currently reads `node.level` for `indentPx` (WbsNode.tsx line 80).
**How to avoid:** The new WbsGrid MUST compute visual depth from `parent_id` chain, never from `level`. The `level` column should still be updated by the reorder/indent route for backward compat with queries that filter by level, but it should not be trusted for display.
**Warning signs:** After indent/outdent, items appear at wrong nesting depth on refresh.

### Pitfall 2: Tab Key Conflict with Browser Focus and Indent Intent
**What goes wrong:** Tab key serves two purposes: (1) move to next grid cell when inside an active cell edit, (2) indent a row when NO cell is being edited (cursor is on a row but not in a cell). If not disambiguated, pressing Tab inside the Name cell while wanting to navigate to Duration will trigger an indent.
**Why it happens:** The CONTEXT.md specifies Tab for both "move to next cell" (keyboard navigation) and "indent row" (hierarchy). These are the same key.
**How to avoid:** Resolve by context: if a cell is currently focused/editing, Tab = navigate to next cell. If no cell is focused (row is selected but no cell is active), Tab = indent. This matches how MS Project works — Tab indents only when you are NOT in a cell.
**Warning signs:** User cannot Tab through columns without accidentally indenting rows.

### Pitfall 3: Predecessor Row Number Drift After Reorder
**What goes wrong:** If rows are reordered (by drag or by indent/outdent moving a row to a different position in the flat DFS order), all predecessor display labels need to be recalculated. A predecessor stored as "row 5" may display as "row 7" after a reorder.
**Why it happens:** Row numbers are positional. The DB stores item IDs — the row-number-to-ID map is recomputed on every render from the current tree order. This is correct behavior, but it can confuse users if the predecessor field value appears to change after a save.
**How to avoid:** Never store row numbers in local state between saves. Always re-derive the row-number display from the current flat DFS order. On saving a predecessor edit, immediately convert row-numbers → item IDs before calling the API.
**Warning signs:** Predecessor column shows different numbers after an unrelated reorder.

### Pitfall 4: Level-1 Lock Removal Breaking Existing API Guards
**What goes wrong:** The `PATCH` route (`wbs/[itemId]/route.ts` line 66) returns 403 if `item.level === 1 && name !== undefined`. The `DELETE` route (line 121) returns 403 if `item.level === 1`. The `reorder` route (line 60) returns 403 if `item.level === 1`. The CONTEXT.md locks decision: "Level 1 header lock removed — all rows should be freely editable."
**Why it happens:** These guards were intentionally placed in Phase 47 to prevent accidental edits to section headers.
**How to avoid:** Remove all three level-1 guards in their respective routes. Also update the POST schema (currently `level: z.number().int().min(2).max(3, 'Level must be 2 or 3')`) — with unlimited depth and root-level items, the POST must accept any level including 1.
**Warning signs:** Editing a top-level WBS item name returns 403.

### Pitfall 5: Gantt percent_complete — Two Data Sources
**What goes wrong:** The Gantt currently derives progress from `task.status` (see `gantt/page.tsx` line 107: `progress = task.status === 'done' ? 100 : ...`). After phase 85, WBS items have `percent_complete` but tasks still use status-derived progress. These are different entities (WBS items vs tasks). The dependency arrows belong to WBS item pairs, not task pairs.
**Why it happens:** The Gantt renders both WBS rows (for bar spans) and individual tasks. `percent_complete` is on `wbs_items`, not `tasks`.
**How to avoid:** In the Gantt, use `wbsItem.percent_complete` for the WBS summary bar progress fill. Task bars continue using task status-derived progress. The dependency arrows connect WBS item bars, computed from the `wbs_dependencies` table keyed on `wbs_item_id` pairs.
**Warning signs:** Dependency arrows connecting wrong bars, or percent_complete not showing on WBS summary bars.

### Pitfall 6: `requireProjectRole` Import in Tests
**What goes wrong:** From STATE.md [84-00]: "next/headers mock must be restored in beforeEach: `vi.mocked(nextHeaders).mockResolvedValue(new Headers() as any)` after `vi.resetAllMocks()`". New WBS API tests that add `requireProjectRole` must follow this pattern.
**Why it happens:** `vi.resetAllMocks()` wipes the next/headers mock between tests, causing `requireSession()` to fail.
**How to avoid:** Follow the pattern in `tests/api/wbs-crud.test.ts` — mock `@/lib/auth-server` directly (not next/headers).
**Warning signs:** Tests pass individually but fail when run together.

---

## Schema Changes (Full Detail)

### Migration 0050_wbs_overhaul.sql

```sql
-- Phase 85: WBS overhaul — new columns + dependency table

-- 1. New columns on wbs_items (all additive/nullable — backward safe)
ALTER TABLE wbs_items
  ADD COLUMN IF NOT EXISTS duration_days integer,
  ADD COLUMN IF NOT EXISTS percent_complete integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assignee text;

-- 2. Migrate percent_complete from existing status
UPDATE wbs_items SET percent_complete =
  CASE status
    WHEN 'not_started' THEN 0
    WHEN 'in_progress' THEN 50
    WHEN 'complete' THEN 100
    ELSE 0
  END;

-- 3. Make percent_complete NOT NULL after migration
ALTER TABLE wbs_items ALTER COLUMN percent_complete SET NOT NULL;

-- 4. New wbs_dependencies table (extensible — dependency_type is text not enum for future FF/SF)
CREATE TABLE IF NOT EXISTS wbs_dependencies (
  id serial PRIMARY KEY,
  project_id integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_item_id integer NOT NULL REFERENCES wbs_items(id) ON DELETE CASCADE,
  to_item_id integer NOT NULL REFERENCES wbs_items(id) ON DELETE CASCADE,
  dependency_type text NOT NULL DEFAULT 'FS',
  created_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT wbs_dependencies_unique UNIQUE (from_item_id, to_item_id)
);

CREATE INDEX IF NOT EXISTS wbs_dependencies_project_idx ON wbs_dependencies(project_id);
CREATE INDEX IF NOT EXISTS wbs_dependencies_from_idx ON wbs_dependencies(from_item_id);
CREATE INDEX IF NOT EXISTS wbs_dependencies_to_idx ON wbs_dependencies(to_item_id);
```

**Key design decisions:**
- `dependency_type` is `text` NOT a pgEnum — avoids ALTER TYPE migration when FF/SF are added later (per CONTEXT.md extensibility requirement). Application-level validation enforces 'FS'|'SS'.
- `project_id` on `wbs_dependencies` enables efficient project-scoped queries for Gantt.
- UNIQUE constraint on `(from_item_id, to_item_id)` prevents duplicate dependency pairs.
- `percent_complete` uses `DEFAULT 0` then migrated then set NOT NULL — safe two-step approach avoids NOT NULL constraint violation on existing rows.

### Drizzle Schema additions (db/schema.ts)

```typescript
// Add to wbsItems table:
duration_days: integer('duration_days'),
percent_complete: integer('percent_complete').default(0).notNull(),
assignee: text('assignee'),

// New table:
export const wbsDependencies = pgTable('wbs_dependencies', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projects.id),
  from_item_id: integer('from_item_id').notNull().references(() => wbsItems.id, { onDelete: 'cascade' }),
  to_item_id: integer('to_item_id').notNull().references(() => wbsItems.id, { onDelete: 'cascade' }),
  dependency_type: text('dependency_type').notNull().default('FS'),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniquePair: uniqueIndex('wbs_dependencies_unique').on(table.from_item_id, table.to_item_id),
}))

export type WbsDependency = typeof wbsDependencies.$inferSelect
export type WbsDependencyInsert = typeof wbsDependencies.$inferInsert
```

---

## API Route Changes

### Existing Routes — Required Updates

**`POST /api/projects/[projectId]/wbs`:**
- Remove `level: z.number().int().min(2).max(3)` restriction — allow level 1 and unlimited depth
- Change to `level: z.number().int().min(1)`
- Add optional `parent_id: z.number().int().nullable().optional()` (currently required)
- Add optional `duration_days`, `percent_complete`, `assignee` to schema

**`PATCH /api/projects/[projectId]/wbs/[itemId]`:**
- Remove level-1 name lock (the 403 guard)
- Add `percent_complete: z.number().int().min(0).max(100).optional()`
- Add `duration_days: z.number().int().nullable().optional()`
- Add `assignee: z.string().nullable().optional()`

**`POST /api/projects/[projectId]/wbs/reorder`:**
- Remove level-1 reorder lock (the 403 guard)
- Rename semantically: this route handles indent/outdent (parent_id change) AND same-level reorder
- The existing logic already does the right thing when `newParentId` changes — no logic change needed, only the guard removal
- The `level` column should be recomputed on the server after parent_id update:
  ```typescript
  // After updating parent_id, recompute level from parent chain
  // Simple recursive approach: fetch all items, walk parent chain
  const newLevel = await computeLevelFromParentChain(db, newParentId, projectId)
  await db.update(wbsItems).set({ parent_id: newParentId, display_order: newDisplayOrder, level: newLevel }).where(eq(wbsItems.id, itemId))
  ```

### New Routes

**`GET /api/projects/[projectId]/wbs/dependencies`:**
```typescript
// Returns all wbs_dependencies for a project
// Response: Array<{ id, from_item_id, to_item_id, dependency_type }>
```

**`POST /api/projects/[projectId]/wbs/dependencies`:**
```typescript
const CreateDepSchema = z.object({
  from_item_id: z.number().int(),
  to_item_id: z.number().int(),
  dependency_type: z.enum(['FS', 'SS']),
})
// Returns 201 with created dependency
// Use .onConflictDoNothing() to handle duplicate gracefully
```

**`DELETE /api/projects/[projectId]/wbs/dependencies/[depId]`:**
```typescript
// Verify project ownership via dep.project_id === projectId
// Returns 204
```

---

## Code Examples

### WbsGrid Component Skeleton
```typescript
// Source: pattern derived from GanttChart.tsx left panel + WbsNode.tsx
'use client'

const COLUMNS = [
  { key: 'name',            label: 'Task Name',   width: 'flex-1 min-w-[200px]' },
  { key: 'duration_days',   label: 'Duration',    width: 'w-20' },
  { key: 'start_date',      label: 'Start',       width: 'w-[110px]' },
  { key: 'due_date',        label: 'Due',         width: 'w-[110px]' },
  { key: 'percent_complete',label: '%',           width: 'w-16' },
  { key: 'assignee',        label: 'Assigned To', width: 'w-32' },
  { key: 'predecessors',    label: 'Predecessors',width: 'w-24' },
] as const

type ColKey = typeof COLUMNS[number]['key']

export function WbsGrid({ items, dependencies, projectId }: WbsGridProps) {
  const [localItems, setLocalItems] = useState(items)
  const [focused, setFocused] = useState<{ rowIdx: number; col: ColKey } | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Flat DFS order for row-number display
  const flatItems = useMemo(() => flattenTree(localItems), [localItems])

  // Focus input when focused cell changes
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [focused])

  // ...
}
```

### flattenTree utility
```typescript
// Source: same pattern as childrenMap in WbsTree.tsx + computeDepth in GanttChart.tsx
function flattenTree(items: WbsGridItem[]): WbsGridItem[] {
  const childrenOf = new Map<number | null, WbsGridItem[]>()
  items.forEach(item => {
    const key = item.parent_id ?? null
    if (!childrenOf.has(key)) childrenOf.set(key, [])
    childrenOf.get(key)!.push(item)
  })
  // Sort siblings by display_order
  childrenOf.forEach(children => children.sort((a, b) => a.display_order - b.display_order))

  const result: WbsGridItem[] = []
  function visit(parentId: number | null) {
    const children = childrenOf.get(parentId) ?? []
    children.forEach(item => { result.push(item); visit(item.id) })
  }
  visit(null)
  return result
}
```

### computeDepth from parent_id chain (from GanttChart.tsx)
```typescript
// Source: GanttChart.tsx lines 133–144 — VERBATIM pattern to use
const parentMap = new Map<number, number | null>()
items.forEach(item => parentMap.set(item.id, item.parent_id ?? null))
const depthCache = new Map<number, number>()
function computeDepth(id: number): number {
  if (depthCache.has(id)) return depthCache.get(id)!
  const parentId = parentMap.get(id) ?? null
  if (parentId === null) { depthCache.set(id, 1); return 1 }
  const d = computeDepth(parentId) + 1
  depthCache.set(id, d)
  return d
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tree card UI (DnD expand/collapse) | Flat spreadsheet grid | Phase 85 | Full WbsTree.tsx replacement |
| 3-state `status` enum for progress | `percent_complete` int 0–100 | Phase 85 | status preserved for backward compat |
| Level-1 nodes locked/uneditable | All rows freely editable | Phase 85 | Remove guards in 3 route files |
| Hierarchy max 3 levels | Unlimited depth | Phase 85 | Remove max level check in POST route |
| No predecessor tracking | `wbs_dependencies` table | Phase 85 | New table + 2 new API routes |
| Gantt: status-derived progress | Gantt: `percent_complete`-derived progress | Phase 85 | Update `gantt/page.tsx` mapDataToWbsRows |
| Gantt: no dependency arrows | Gantt: SVG overlay arrows | Phase 85 | New SVG layer in GanttChart.tsx |

**Deprecated/outdated patterns:**
- `WbsTree.tsx` + `WbsNode.tsx`: Replaced by `WbsGrid.tsx`. Files can be kept for now as WbsItem type is still referenced from GanttChart.
- The `locked` variable in `WbsNode.tsx` (`const locked = node.level === 1`): Concept removed from new grid.

---

## Open Questions

1. **Row-number predecessor UX when dependencies exist across tracks (ADR vs Biggy)**
   - What we know: Dependencies are stored by item ID, not track. The predecessor column shows row numbers within the current flat DFS order of the active track.
   - What's unclear: Should cross-track dependencies be supported? The CONTEXT.md is silent on this.
   - Recommendation: Initially scope dependencies to within-track only (same tab). Cross-track dependencies can be added later. Enforce at API level: `from_item_id` and `to_item_id` must belong to the same `track`.

2. **Add-row behavior for the new grid**
   - What we know: Current WbsNode has an "Add child" button (hover-only). The new grid needs an "Add row" affordance.
   - What's unclear: Whether to use an "Add row" button at the bottom, Enter on last cell of last row, or a persistent `+` row.
   - Recommendation: Add a persistent "+ Add task" row at the bottom of each track. On click/Enter, insert a new row at root level (no parent) at the end. Indent/outdent applies after.

3. **Saving predecessor edits — batch or individual**
   - What we know: Predecessors are stored in `wbs_dependencies` as pairs. A single predecessor cell edit may add or remove multiple dependency rows.
   - What's unclear: Should the save be a full replace (DELETE all for this item + INSERT new set) or a diff?
   - Recommendation: Full replace on blur: DELETE FROM wbs_dependencies WHERE from_item_id = $itemId, then INSERT new set. This is simpler and correct for the expected row counts (<100 rows).

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `/Users/jmiloslavsky/Documents/Panda-Manager/vitest.config.ts` |
| Quick run command | `cd /Users/jmiloslavsky/Documents/Panda-Manager && npx vitest run tests/components/WbsGrid.test.tsx tests/api/wbs-dependencies.test.ts` |
| Full suite command | `cd /Users/jmiloslavsky/Documents/Panda-Manager && npx vitest run` |

**Note:** `tests/` dir is gitignored by project design (STATE.md [79-00]). Only `lib/__tests__/` is tracked in git. New test files go to `tests/` on-disk, not committed.

### Phase Requirements → Test Map

| Req Area | Behavior | Test Type | Automated Command | File |
|----------|----------|-----------|-------------------|------|
| Grid cell editing | Click cell → input appears, blur saves | Component | `npx vitest run tests/components/WbsGrid.test.tsx` | Wave 0 |
| Tab navigation | Tab inside active cell → next cell gains focus | Component | `npx vitest run tests/components/WbsGrid.test.tsx` | Wave 0 |
| Enter navigation | Enter → same column, next row | Component | `npx vitest run tests/components/WbsGrid.test.tsx` | Wave 0 |
| Indent row | Tab when no cell focused → parent_id set to row above | Component + API | `npx vitest run tests/api/wbs-reorder.test.ts` | Wave 0 |
| Outdent row | Shift+Tab when no cell focused → parent_id set to grandparent | Component + API | `npx vitest run tests/api/wbs-reorder.test.ts` | Wave 0 |
| Dependency save | Predecessor "3,4" parsed to item IDs → POST wbs/dependencies | API | `npx vitest run tests/api/wbs-dependencies.test.ts` | Wave 0 |
| Dependency load | GET wbs/dependencies returns pairs → displayed as row numbers | Component | `npx vitest run tests/components/WbsGrid.test.tsx` | Wave 0 |
| Migration correctness | percent_complete=0 for not_started, 50 for in_progress, 100 for complete | Schema | `npx vitest run tests/schema/wbs-overhaul.test.ts` | Wave 0 |
| Gantt arrow rendering | `buildWbsDependencyArrows()` pure fn returns correct SVG path coords | Unit | `npx vitest run tests/components/GanttChart-deps.test.ts` | Wave 0 |
| Gantt percent_complete | WBS bar fill uses percent_complete, not status | Unit | `npx vitest run tests/components/GanttChart-deps.test.ts` | Wave 0 |
| Level-1 edit unblocked | PATCH level-1 item name returns 200 (not 403) | API | `npx vitest run tests/api/wbs-crud.test.ts` | Modify existing |
| Level-1 delete unblocked | DELETE level-1 item returns 204 | API | `npx vitest run tests/api/wbs-crud.test.ts` | Modify existing |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/components/WbsGrid.test.tsx tests/api/wbs-dependencies.test.ts tests/api/wbs-crud.test.ts`
- **Per wave merge:** `npx vitest run` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/components/WbsGrid.test.tsx` — covers cell editing, Tab/Enter nav, indent/outdent, dependency display
- [ ] `tests/api/wbs-dependencies.test.ts` — covers GET, POST, DELETE dependency routes
- [ ] `tests/components/GanttChart-deps.test.ts` — covers `buildWbsDependencyArrows()` pure function, percent_complete progress bar logic
- [ ] `tests/schema/wbs-overhaul.test.ts` — covers migration data correctness assertions
- [ ] Existing `tests/api/wbs-crud.test.ts` — MODIFY: remove level-1 403 assertions (now expected to be 200/204)

---

## Sources

### Primary (HIGH confidence)
- `/Users/jmiloslavsky/Documents/Panda-Manager/components/GanttChart.tsx` — full read; confirmed hand-rolled SVG, no frappe-gantt, existing dependency field threading
- `/Users/jmiloslavsky/Documents/Panda-Manager/components/WbsTree.tsx` — full read; DnD-kit architecture confirmed
- `/Users/jmiloslavsky/Documents/Panda-Manager/components/WbsNode.tsx` — full read; level-1 locks, per-row state pattern confirmed
- `/Users/jmiloslavsky/Documents/Panda-Manager/db/schema.ts` (lines 826–860) — wbs_items + wbsTaskAssignments schema confirmed
- `/Users/jmiloslavsky/Documents/Panda-Manager/package.json` — confirmed no grid library installed; frappe-gantt present but unused by GanttChart
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/projects/[projectId]/wbs/route.ts` — level/lock constraints confirmed
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/projects/[projectId]/wbs/[itemId]/route.ts` — level-1 guards confirmed
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/projects/[projectId]/wbs/reorder/route.ts` — parent_id update logic confirmed
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/customer/[id]/gantt/page.tsx` — progress-from-status confirmed, dependency field threaded but unused
- `/Users/jmiloslavsky/Documents/Panda-Manager/vitest.config.ts` — test infrastructure confirmed
- `/Users/jmiloslavsky/Documents/Project Assistant Code/.planning/STATE.md` — level column unreliability warning, test gitignore pattern, requireProjectRole patterns

### Secondary (MEDIUM confidence)
- MS Project UX reference: https://learn.microsoft.com/en-us/dynamics365/project-operations/project-management/create-wbs (from CONTEXT.md; not fetched, behavior is well-understood)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — directly verified from package.json; no external research needed
- Architecture: HIGH — all patterns directly derived from existing codebase files
- Schema changes: HIGH — existing migration files and schema.ts read directly
- Pitfalls: HIGH — level column warning from STATE.md; other pitfalls from direct code reading
- Gantt arrow approach: HIGH — GanttChart.tsx architecture fully read and understood; SVG overlay is the clear extension point

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 (stable codebase, no external dependencies changing)
