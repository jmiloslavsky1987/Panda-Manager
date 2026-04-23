'use client'

import { useState, useRef, memo } from 'react'
import { useRouter } from 'next/navigation'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronRight, ChevronDown, Plus, GripVertical, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { WbsItem, TaskWithBlockedStatus } from '@/lib/queries'

interface WbsNodeProps {
  node: WbsItem
  childrenMap: Map<number | null, WbsItem[]>
  expandedIds: Set<number>
  onToggleExpand: (id: number) => void
  onExpandedIdsChange: (updater: (prev: Set<number>) => Set<number>) => void
  projectId: number
  track: 'ADR' | 'Biggy'
  blockedPhases?: Set<string>
  isNodeBlocked?: (nodeName: string) => boolean
  nodeTasks?: TaskWithBlockedStatus[]
  nodeTasksMap?: Map<number, TaskWithBlockedStatus[]>
}

const STATUS_CLASSES = {
  not_started: 'bg-zinc-100 text-zinc-600',
  in_progress: 'bg-blue-100 text-blue-700',
  complete: 'bg-green-100 text-green-700',
}

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
] as const

function WbsNodeComponent({
  node,
  childrenMap,
  expandedIds,
  onToggleExpand,
  onExpandedIdsChange,
  projectId,
  track,
  blockedPhases,
  isNodeBlocked,
  nodeTasks = [],
  nodeTasksMap,
}: WbsNodeProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(node.name)
  const [saving, setSaving] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [taskDates, setTaskDates] = useState<Map<number, { start: string | null; due: string | null }>>(new Map())

  const getTaskDate = (taskId: number, field: 'start' | 'due', fallback: string | null) => {
    const override = taskDates.get(taskId)
    if (override && field in override) return override[field] ?? ''
    return fallback ?? ''
  }

  const saveTaskDate = async (taskId: number, field: 'start_date' | 'due', value: string | null) => {
    setTaskDates(prev => {
      const m = new Map(prev)
      const cur = m.get(taskId) ?? { start: null, due: null }
      m.set(taskId, { ...cur, [field === 'start_date' ? 'start' : 'due']: value })
      return m
    })
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
  }

  const locked = node.level === 1
  const hasChildren = childrenMap.has(node.id)
  const isExpanded = expandedIds.has(node.id)
  const hasBlockedTask = isNodeBlocked
    ? isNodeBlocked(node.name ?? '')
    : (blockedPhases?.has((node.name ?? '').toLowerCase()) ?? false)
  const indentPx = (node.level - 1) * 16

  // Drag and drop
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Count all descendants recursively
  const countDescendants = (id: number): number => {
    const children = childrenMap.get(id) ?? []
    return children.length + children.reduce((sum, c) => sum + countDescendants(c.id), 0)
  }

  // Collect all descendant IDs for delete cleanup
  const collectDescendantIds = (id: number): number[] => {
    const children = childrenMap.get(id) ?? []
    const ids: number[] = []
    const queue = [...children]
    while (queue.length > 0) {
      const item = queue.shift()!
      ids.push(item.id)
      const itemChildren = childrenMap.get(item.id) ?? []
      queue.push(...itemChildren)
    }
    return ids
  }

  // Handle name edit
  const handleNameClick = () => {
    if (locked) return
    setIsEditing(true)
    setEditedName(node.name)
  }

  const handleNameSave = async () => {
    if (editedName.trim() === node.name || !editedName.trim()) {
      setIsEditing(false)
      setEditedName(node.name)
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/wbs/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editedName.trim() }),
      })

      if (!response.ok) {
        throw new Error('Save failed')
      }

      setIsEditing(false)
      router.refresh()
    } catch (error) {
      toast.error('Save failed — please try again')
      setEditedName(node.name)
    } finally {
      setSaving(false)
    }
  }

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSave()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditedName(node.name)
    }
  }

  // Handle status change
  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (locked) return

    const newStatus = e.target.value as WbsItem['status']
    const previousStatus = node.status

    try {
      const response = await fetch(`/api/projects/${projectId}/wbs/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Status update failed')
      }

      router.refresh()
    } catch (error) {
      toast.error('Status update failed — please try again')
      router.refresh()
    }
  }

  // Handle add child
  const handleAddChild = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/wbs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New item',
          parent_id: node.id,
          level: node.level + 1,
          track,
        }),
      })

      if (!response.ok) {
        throw new Error('Add child failed')
      }

      router.refresh()
      // Expand parent to show new child
      if (!isExpanded) {
        onToggleExpand(node.id)
      }
    } catch (error) {
      toast.error('Add child failed — please try again')
    }
  }

  // Handle delete
  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/wbs/${node.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Delete failed')
      }

      // Remove node and all descendants from expandedIds
      const descendantIds = collectDescendantIds(node.id)
      onExpandedIdsChange(prev => {
        const next = new Set(prev)
        next.delete(node.id)
        descendantIds.forEach(id => next.delete(id))
        return next
      })

      setDeleteDialogOpen(false)
      router.refresh()
    } catch (error) {
      toast.error('Delete failed — please try again')
      setDeleteDialogOpen(false)
    }
  }

  const descendantCount = countDescendants(node.id)

  return (
    <>
      <div
        ref={setNodeRef}
        style={{ ...style, paddingLeft: `${indentPx}px` }}
        className={`flex items-center gap-2 py-1.5 px-2 rounded group relative transition-colors ${
          isDragging ? 'opacity-40 bg-blue-50 ring-1 ring-blue-300' : 'hover:bg-zinc-50'
        }`}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {/* Expand/collapse toggle */}
        <button
          onClick={() => hasChildren && onToggleExpand(node.id)}
          className={`w-5 h-5 flex items-center justify-center ${
            hasChildren ? 'text-zinc-600 hover:text-zinc-900' : 'text-transparent'
          }`}
          disabled={!hasChildren}
        >
          {hasChildren && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
        </button>

        {/* Drag handle — visible on hover or while dragging */}
        {!locked && (
          <div
            {...attributes}
            {...listeners}
            className={`cursor-grab active:cursor-grabbing transition-opacity ${
              hovering || isDragging ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <GripVertical size={16} className="text-zinc-400" />
          </div>
        )}

        {/* Node name */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editedName}
            onChange={e => setEditedName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={handleNameKeyDown}
            disabled={saving}
            autoFocus
            className="flex-1 px-2 py-1 text-sm border border-zinc-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <span
            onClick={handleNameClick}
            className={`flex-1 text-sm ${
              locked ? 'font-medium text-zinc-800' : 'text-zinc-700 cursor-pointer hover:text-zinc-900'
            }`}
          >
            {node.name}
            {hasBlockedTask && (
              <span className="text-xs font-medium bg-red-100 text-red-700 px-1 py-0.5 rounded ml-1">
                Blocked
              </span>
            )}
          </span>
        )}

        {/* Saving indicator */}
        {saving && <span className="text-xs text-zinc-500">Saving...</span>}

        {/* Status badge/select */}
        {locked ? (
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
              STATUS_CLASSES[node.status]
            }`}
          >
            {STATUS_OPTIONS.find(o => o.value === node.status)?.label}
          </span>
        ) : (
          <select
            value={node.status}
            onChange={handleStatusChange}
            className={`px-2 py-1 text-xs font-medium rounded border-0 cursor-pointer ${
              STATUS_CLASSES[node.status]
            }`}
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {/* Action buttons (only for L2/L3) */}
        {!locked && hovering && (
          <div className="flex gap-1">
            <button
              onClick={handleAddChild}
              className="p-1 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Add child"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={() => setDeleteDialogOpen(true)}
              className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Render children recursively */}
      {isExpanded &&
        (childrenMap.get(node.id) ?? []).map(child => (
          <WbsNodeComponent
            key={child.id}
            node={child}
            childrenMap={childrenMap}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            onExpandedIdsChange={onExpandedIdsChange}
            projectId={projectId}
            track={track}
            blockedPhases={blockedPhases}
            isNodeBlocked={isNodeBlocked}
            nodeTasks={nodeTasksMap?.get(child.id) ?? []}
            nodeTasksMap={nodeTasksMap}
          />
        ))}

      {/* Task rows — shown when expanded and tasks exist */}
      {isExpanded && nodeTasks.length > 0 && (
        <div className="ml-8 mt-0.5 mb-1 border-l-2 border-zinc-100 pl-3 space-y-0.5">
          {/* Column headers */}
          <div className="flex items-center gap-2 px-2 py-0.5 text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
            <span className="flex-1">Task</span>
            <span className="w-[90px] text-center">Start</span>
            <span className="w-[90px] text-center">Due</span>
          </div>
          {nodeTasks.map(task => (
            <div key={task.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-50 text-xs">
              <span className="flex-1 truncate text-zinc-700" title={task.title}>{task.title}</span>
              <input
                type="date"
                value={getTaskDate(task.id, 'start', task.start_date)}
                onChange={e => saveTaskDate(task.id, 'start_date', e.target.value || null)}
                className="w-[90px] text-xs text-zinc-500 border border-zinc-200 rounded px-1 py-0.5 bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <input
                type="date"
                value={getTaskDate(task.id, 'due', task.due)}
                onChange={e => saveTaskDate(task.id, 'due', e.target.value || null)}
                className="w-[90px] text-xs text-zinc-500 border border-zinc-200 rounded px-1 py-0.5 bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete WBS Item</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-zinc-700">
              Delete <strong>{node.name}</strong>
              {descendantCount > 0 && (
                <span> and its {descendantCount} sub-item{descendantCount > 1 ? 's' : ''}</span>
              )}
              ?
            </p>
            <p className="text-xs text-zinc-500 mt-2">This cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export const WbsNode = memo(WbsNodeComponent)
