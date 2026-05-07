// components/WbsGrid.types.ts
import type { WbsItem, WbsDependency } from '@/db/schema'

export type WbsGridItem = WbsItem

export type WbsDependencyItem = Pick<WbsDependency, 'id' | 'from_item_id' | 'to_item_id' | 'dependency_type'>

export const EDITABLE_COL_KEYS = [
  'name',
  'duration_days',
  'start_date',
  'due_date',
  'percent_complete',
  'assignee',
  'predecessors',
] as const

export type ColKey = typeof EDITABLE_COL_KEYS[number]

export type FocusedCell = { rowIdx: number; col: ColKey } | null

export interface WbsGridColumn {
  key: ColKey
  label: string
  width: string
  type: 'text' | 'number' | 'date' | 'predecessor'
}

export interface WbsGridProps {
  items: WbsGridItem[]
  dependencies: WbsDependencyItem[]
  projectId: number
  onAddRow: () => void
  onIndent: (itemId: number) => void
  onOutdent: (itemId: number) => void
  onDependenciesChange: (itemId: number, newDeps: Array<{ from_item_id: number; to_item_id: number; dependency_type: string }>) => void
}
