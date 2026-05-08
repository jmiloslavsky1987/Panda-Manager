'use client'

import { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type {
  WbsGridProps,
  WbsGridItem,
  WbsDependencyItem,
  FocusedCell,
  ColKey,
  WbsGridColumn,
} from './WbsGrid.types'
import { EDITABLE_COL_KEYS } from './WbsGrid.types'

// Re-export for consumers and tests
export { EDITABLE_COL_KEYS as EDITABLE_COLS } from './WbsGrid.types'

// ── Column definitions ─────────────────────────────────────────────────────────

const COLUMNS: WbsGridColumn[] = [
  { key: 'name',             label: 'Task Name',    width: 'flex-1 min-w-[200px]', type: 'text' },
  { key: 'duration_days',    label: 'Duration',     width: 'w-20',                 type: 'number' },
  { key: 'start_date',       label: 'Start',        width: 'w-[110px]',            type: 'date' },
  { key: 'due_date',         label: 'Due',          width: 'w-[110px]',            type: 'date' },
  { key: 'percent_complete', label: '%',            width: 'w-16',                 type: 'number' },
  { key: 'assignee',         label: 'Assigned To',  width: 'w-32',                 type: 'text' },
  { key: 'predecessors',     label: 'Predecessors', width: 'w-24',                 type: 'predecessor' },
]

// ── Pure exported functions ────────────────────────────────────────────────────

/**
 * flattenTree: DFS-ordered flat array from a tree of WbsGridItems.
 * Children are sorted by display_order before visiting.
 */
export function flattenTree(items: WbsGridItem[]): WbsGridItem[] {
  const childrenOf = new Map<number | null, WbsGridItem[]>()
  items.forEach(item => {
    const key = item.parent_id ?? null
    if (!childrenOf.has(key)) childrenOf.set(key, [])
    childrenOf.get(key)!.push(item)
  })
  childrenOf.forEach(children => children.sort((a, b) => a.display_order - b.display_order))
  const result: WbsGridItem[] = []
  function visit(parentId: number | null) {
    const children = childrenOf.get(parentId) ?? []
    children.forEach(item => { result.push(item); visit(item.id) })
  }
  visit(null)
  return result
}

/**
 * buildRowNumberMap: Returns a Map from 1-indexed row number to item ID.
 * Row order follows flattenTree DFS order.
 */
export function buildRowNumberMap(items: WbsGridItem[]): Map<number, number> {
  const flat = flattenTree(items)
  return new Map(flat.map((item, idx) => [idx + 1, item.id]))
}

/**
 * predecessorDisplay: Given an itemId (to_item_id), return comma-separated
 * row numbers of its predecessors using the rowNumberMap.
 */
export function predecessorDisplay(
  itemId: number,
  deps: WbsDependencyItem[],
  rowNumberMap: Map<number, number>
): string {
  const preds = deps.filter(d => d.to_item_id === itemId)
  const rowNums = preds.map(d => {
    for (const [rowNum, id] of rowNumberMap) {
      if (id === d.from_item_id) return rowNum
    }
    return null
  }).filter((n): n is number => n !== null)
  return rowNums.join(',')
}

/**
 * Date helpers — work with YYYY-MM-DD strings in local time.
 */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function diffDays(start: string, due: string): number {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(due + 'T00:00:00')
  return Math.round((e.getTime() - s.getTime()) / 86400000)
}

/**
 * computeDateFields: given an item and the field being edited with its new value,
 * return the multi-field update that keeps start/duration/due consistent.
 *
 * Rules:
 *  - edit duration + start set → recompute due
 *  - edit due + start set → recompute duration
 *  - edit start + duration set → recompute due (preserve duration)
 *  - edit start + due set (no duration) → recompute duration
 */
export function computeDateFields(
  item: { start_date: string | null; due_date: string | null; duration_days: number | null },
  field: 'start_date' | 'due_date' | 'duration_days',
  newValue: string | number | null
): Record<string, string | number | null> {
  const next = {
    start_date: item.start_date,
    due_date: item.due_date,
    duration_days: item.duration_days,
    [field]: newValue,
  } as { start_date: string | null; due_date: string | null; duration_days: number | null }
  const out: Record<string, string | number | null> = { [field]: newValue }

  if (field === 'duration_days' && next.start_date && next.duration_days != null) {
    out.due_date = addDays(next.start_date, next.duration_days)
  } else if (field === 'due_date' && next.start_date && next.due_date) {
    out.duration_days = diffDays(next.start_date, next.due_date)
  } else if (field === 'start_date' && next.start_date) {
    if (next.duration_days != null) {
      out.due_date = addDays(next.start_date, next.duration_days)
    } else if (next.due_date) {
      out.duration_days = diffDays(next.start_date, next.due_date)
    }
  }
  return out
}

/**
 * parsePredecessors: Parse "3,4" → array of item IDs using rowNumberMap.
 */
export function parsePredecessors(input: string, rowNumberMap: Map<number, number>): number[] {
  return input.split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n))
    .map(rowNum => rowNumberMap.get(rowNum))
    .filter((id): id is number => id !== undefined)
}

// ── WbsGrid component ──────────────────────────────────────────────────────────

export function WbsGrid(props: WbsGridProps) {
  const { items, dependencies, projectId, onAddRow, onIndent, onOutdent, onDependenciesChange } = props
  const router = useRouter()

  const [localItems, setLocalItems] = useState<WbsGridItem[]>(items)
  const [localDeps, setLocalDeps] = useState<WbsDependencyItem[]>(dependencies)
  const [focusedCell, setFocusedCell] = useState<FocusedCell>(null)
  const [selectedRowIdx, setSelectedRowIdx] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Track the current editing value separately from item data
  const editValueRef = useRef<string>('')

  // Sync optimistic state when server-fetched props change (after router.refresh)
  useEffect(() => { setLocalItems(items) }, [items])
  useEffect(() => { setLocalDeps(dependencies) }, [dependencies])

  const flatItems = useMemo(() => flattenTree(localItems), [localItems])
  const rowNumberMap = useMemo(() => buildRowNumberMap(localItems), [localItems])

  // ── computeDepth from parent_id chain (verbatim from GanttChart.tsx) ──────────
  const computeDepth = useMemo(() => {
    const parentMap = new Map<number, number | null>()
    localItems.forEach(item => parentMap.set(item.id, item.parent_id ?? null))
    const depthCache = new Map<number, number>()
    function computeDepthFn(id: number): number {
      if (depthCache.has(id)) return depthCache.get(id)!
      const parentId = parentMap.get(id) ?? null
      if (parentId === null) { depthCache.set(id, 1); return 1 }
      const d = computeDepthFn(parentId) + 1
      depthCache.set(id, d)
      return d
    }
    // Pre-compute all depths
    localItems.forEach(item => computeDepthFn(item.id))
    return computeDepthFn
  }, [localItems])

  // ── Save cell function ────────────────────────────────────────────────────────

  async function saveCellMulti(itemId: number, fields: Record<string, unknown>): Promise<boolean> {
    const res = await fetch(`/api/projects/${projectId}/wbs/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (!res.ok) {
      toast.error('Save failed — please try again')
      router.refresh()
      return false
    }
    return true
  }

  async function undoNameChange(itemId: number, priorName: string) {
    setLocalItems(prev => prev.map(i => i.id === itemId ? { ...i, name: priorName } : i))
    await saveCellMulti(itemId, { name: priorName })
    router.refresh()
  }

  // ── Get current input value and save ──────────────────────────────────────────

  async function saveCurrentCell() {
    if (!focusedCell) return
    const item = flatItems[focusedCell.rowIdx]
    if (!item) return
    const value = editValueRef.current
    const col = focusedCell.col

    // Predecessors column — handle directly (delete existing, post new) with visible feedback
    if (col === 'predecessors') {
      const predIds = parsePredecessors(value, rowNumberMap)
      // Skip self-references
      const validPredIds = predIds.filter(id => id !== item.id)
      const newDeps = validPredIds.map(fromId => ({
        from_item_id: fromId,
        to_item_id: item.id,
        dependency_type: 'FS' as const,
      }))

      // Optimistic update: replace any existing deps where this item is the to_item_id
      const existingForItem = localDeps.filter(d => d.to_item_id === item.id)
      setLocalDeps(prev => [
        ...prev.filter(d => d.to_item_id !== item.id),
        ...newDeps.map((d, idx) => ({ id: -(Date.now() + idx), ...d })),
      ])

      try {
        // Delete existing deps targeting this item (use the freshest known list)
        for (const dep of existingForItem) {
          if (dep.id < 0) continue  // skip optimistic temp entries
          const r = await fetch(`/api/projects/${projectId}/wbs/dependencies/${dep.id}`, { method: 'DELETE' })
          if (!r.ok) throw new Error(`DELETE ${dep.id} → ${r.status}: ${await r.text()}`)
        }
        // Insert new deps
        for (const dep of newDeps) {
          const r = await fetch(`/api/projects/${projectId}/wbs/dependencies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dep),
          })
          if (!r.ok) throw new Error(`POST → ${r.status}: ${await r.text()}`)
        }
        if (newDeps.length > 0) toast.success(`Saved ${newDeps.length} predecessor${newDeps.length > 1 ? 's' : ''}`)
        router.refresh()
      } catch (err) {
        toast.error(`Predecessor save failed: ${err instanceof Error ? err.message : String(err)}`)
        router.refresh()  // revert optimistic state from server
      }
      return
    }

    // Coerce value based on column type
    let coerced: string | number | null
    if (value === '') {
      coerced = null
    } else if (col === 'duration_days' || col === 'percent_complete') {
      coerced = Number(value)
    } else {
      coerced = value
    }

    // Compute multi-field update for date/duration fields, single-field otherwise
    const fields: Record<string, string | number | null> =
      (col === 'start_date' || col === 'due_date' || col === 'duration_days')
        ? computeDateFields(item, col, coerced)
        : { [col]: coerced }

    // Skip if no actual change (avoid spurious toasts)
    const isUnchanged = (item as Record<string, unknown>)[col] === coerced
    const priorName = col === 'name' ? item.name : null

    // Optimistic update
    setLocalItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, ...fields } as WbsGridItem : i
    ))

    if (isUnchanged) return  // no-op edit, don't bother PATCHing or toasting

    const ok = await saveCellMulti(item.id, fields)
    if (ok && priorName !== null && coerced !== priorName) {
      toast('Renamed', {
        action: {
          label: 'Undo',
          onClick: () => undoNameChange(item.id, priorName),
        },
      })
    }
  }

  // ── Tab/Enter key handling ────────────────────────────────────────────────────

  function handleGridKeyDown(e: React.KeyboardEvent, rowIdx: number) {
    if (focusedCell !== null) {
      // Cell is active: Tab navigates columns
      if (e.key === 'Tab') {
        e.preventDefault()
        const colIdx = COLUMNS.findIndex(c => c.key === focusedCell.col)
        const nextColIdx = e.shiftKey ? colIdx - 1 : colIdx + 1
        saveCurrentCell()
        if (nextColIdx >= 0 && nextColIdx < COLUMNS.length) {
          setFocusedCell({ rowIdx: focusedCell.rowIdx, col: COLUMNS[nextColIdx].key })
        } else if (!e.shiftKey && focusedCell.rowIdx < flatItems.length - 1) {
          setFocusedCell({ rowIdx: focusedCell.rowIdx + 1, col: COLUMNS[0].key })
        } else if (e.shiftKey && focusedCell.rowIdx > 0) {
          setFocusedCell({ rowIdx: focusedCell.rowIdx - 1, col: COLUMNS[COLUMNS.length - 1].key })
        } else {
          setFocusedCell(null)
        }
      } else if (e.key === 'Enter') {
        e.preventDefault()
        saveCurrentCell()
        if (focusedCell.rowIdx < flatItems.length - 1) {
          setFocusedCell({ rowIdx: focusedCell.rowIdx + 1, col: focusedCell.col })
        } else {
          setFocusedCell(null)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setFocusedCell(null)
        editValueRef.current = ''
      }
    } else {
      // No cell active: Tab = indent, Shift+Tab = outdent
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault()
        const targetIdx = selectedRowIdx !== null ? selectedRowIdx : rowIdx
        if (flatItems[targetIdx]) {
          onIndent(flatItems[targetIdx].id)
        }
      } else if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault()
        const targetIdx = selectedRowIdx !== null ? selectedRowIdx : rowIdx
        if (flatItems[targetIdx]) {
          onOutdent(flatItems[targetIdx].id)
        }
      }
    }
  }

  // ── Cell value for display ────────────────────────────────────────────────────

  function getCellDisplayValue(item: WbsGridItem, col: ColKey): string {
    if (col === 'predecessors') {
      return predecessorDisplay(item.id, localDeps, rowNumberMap)
    }
    const val = item[col as keyof WbsGridItem]
    if (val === null || val === undefined) return ''
    return String(val)
  }

  function getCellEditValue(item: WbsGridItem, col: ColKey): string {
    if (col === 'predecessors') {
      return predecessorDisplay(item.id, localDeps, rowNumberMap)
    }
    const val = item[col as keyof WbsGridItem]
    if (val === null || val === undefined) return ''
    return String(val)
  }

  // ── Focus input when cell becomes active ──────────────────────────────────────

  function handleCellClick(rowIdx: number, col: ColKey, item: WbsGridItem) {
    editValueRef.current = getCellEditValue(item, col)
    setFocusedCell({ rowIdx, col })
    setSelectedRowIdx(rowIdx)
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        {/* Header row */}
        <div className="flex border-b bg-muted/50 text-xs font-medium text-muted-foreground">
          {COLUMNS.map(col => (
            <div key={col.key} className={`${col.width} px-2 py-1.5 shrink-0`}>
              {col.label}
            </div>
          ))}
        </div>

        {/* Data rows */}
        {flatItems.map((item, rowIdx) => (
          <div
            key={item.id}
            className={`flex border-b hover:bg-muted/30 cursor-pointer ${selectedRowIdx === rowIdx ? 'bg-muted/20' : ''}`}
            tabIndex={0}
            onKeyDown={(e) => handleGridKeyDown(e, rowIdx)}
            onClick={() => setSelectedRowIdx(rowIdx)}
          >
            {COLUMNS.map((col) => {
              const isActive = focusedCell?.rowIdx === rowIdx && focusedCell?.col === col.key
              const depth = computeDepth(item.id)
              const namePadding = col.key === 'name'
                ? `${(depth - 1) * 16 + 8}px`
                : undefined

              return (
                <div
                  key={col.key}
                  className={`${col.width} shrink-0 relative`}
                >
                  {isActive ? (
                    <input
                      ref={inputRef}
                      type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                      defaultValue={getCellEditValue(item, col.key)}
                      onChange={e => { editValueRef.current = e.target.value }}
                      onBlur={() => {
                        saveCurrentCell()
                        setFocusedCell(null)
                      }}
                      onKeyDown={(e) => handleGridKeyDown(e, rowIdx)}
                      autoFocus
                      className="w-full h-full px-2 py-1 text-sm border-0 bg-blue-50 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-400"
                      style={namePadding ? { paddingLeft: namePadding } : undefined}
                    />
                  ) : (
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCellClick(rowIdx, col.key, item)
                      }}
                      className="block w-full px-2 py-1 text-sm text-foreground hover:bg-muted/50 cursor-text truncate"
                      style={namePadding ? { paddingLeft: namePadding } : undefined}
                    >
                      {getCellDisplayValue(item, col.key) || <span className="text-muted-foreground/40">—</span>}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* Add Task row */}
        <div
          className="flex border-b text-muted-foreground cursor-pointer hover:bg-muted/20"
          onClick={onAddRow}
        >
          <span className="px-2 py-1 text-sm">+ Add task</span>
        </div>
      </div>
    </div>
  )
}
