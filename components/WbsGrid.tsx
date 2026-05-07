'use client'

import { useRef, useState, useMemo, useCallback } from 'react'
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
  const [focusedCell, setFocusedCell] = useState<FocusedCell>(null)
  const [selectedRowIdx, setSelectedRowIdx] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Track the current editing value separately from item data
  const editValueRef = useRef<string>('')

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

  async function saveCell(itemId: number, field: string, value: unknown) {
    const res = await fetch(`/api/projects/${projectId}/wbs/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    if (!res.ok) {
      toast.error('Save failed — please try again')
      router.refresh()
    }
  }

  // ── Get current input value and save ──────────────────────────────────────────

  function saveCurrentCell() {
    if (!focusedCell) return
    const item = flatItems[focusedCell.rowIdx]
    if (!item) return
    const value = editValueRef.current
    // Optimistic update
    setLocalItems(prev => prev.map(i =>
      i.id === item.id
        ? { ...i, [focusedCell.col]: value === '' ? null : focusedCell.col === 'duration_days' || focusedCell.col === 'percent_complete' ? Number(value) : value }
        : i
    ))
    if (focusedCell.col !== 'predecessors') {
      const coercedValue = value === '' ? null : (focusedCell.col === 'duration_days' || focusedCell.col === 'percent_complete') ? Number(value) : value
      saveCell(item.id, focusedCell.col, coercedValue)
    } else {
      // Predecessors column — parse and call onDependenciesChange
      const predIds = parsePredecessors(value, rowNumberMap)
      const newDeps = predIds.map(fromId => ({
        from_item_id: fromId,
        to_item_id: item.id,
        dependency_type: 'FS',
      }))
      onDependenciesChange(item.id, newDeps)
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
      return predecessorDisplay(item.id, dependencies, rowNumberMap)
    }
    const val = item[col as keyof WbsGridItem]
    if (val === null || val === undefined) return ''
    return String(val)
  }

  function getCellEditValue(item: WbsGridItem, col: ColKey): string {
    if (col === 'predecessors') {
      return predecessorDisplay(item.id, dependencies, rowNumberMap)
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
