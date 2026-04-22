'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '@/lib/queries'
import { TaskEditModal } from './TaskEditModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskBoardProps {
  tasks: Task[]
  projectId: number
}

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS: { id: string; label: string }[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'done', label: 'Done' },
]

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  todo: 'bg-zinc-100 text-zinc-600',
  in_progress: 'bg-blue-100 text-blue-700',
  blocked: 'bg-red-100 text-red-700',
  done: 'bg-green-100 text-green-700',
}

// ─── Week view helpers ────────────────────────────────────────────────────────

function getWeekBuckets(referenceDate: Date): { label: string; start: string; end: string }[] {
  const day = referenceDate.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(referenceDate)
  monday.setDate(referenceDate.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 4 }, (_, i) => {
    const start = new Date(monday)
    start.setDate(monday.getDate() + i * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return {
      label: `${fmt(start)} – ${fmt(end)}`,
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    }
  })
}

// ─── Week Task Card ───────────────────────────────────────────────────────────

function WeekTaskCard({ task }: { task: Task }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2 flex items-center gap-3 shadow-sm">
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_BADGE_COLORS[task.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
        {task.status.replace('_', ' ')}
      </span>
      <span className="text-sm text-zinc-900 flex-1 min-w-0 truncate">{task.title}</span>
      {task.owner && <span className="text-xs text-zinc-400 shrink-0">{task.owner}</span>}
      {task.due && <span className="text-xs text-zinc-400 shrink-0">{task.due}</span>}
      {task.priority && (
        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${PRIORITY_COLORS[task.priority] ?? 'bg-zinc-100 text-zinc-600'}`}>
          {task.priority}
        </span>
      )}
    </div>
  )
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ tasks }: { tasks: Task[] }) {
  const buckets = getWeekBuckets(new Date())
  const isIsoDate = (d: string | null) => !!d && /^\d{4}-\d{2}-\d{2}/.test(d)

  const tasksInBucket = (start: string, end: string) =>
    tasks.filter(t => isIsoDate(t.due) && t.due! >= start && t.due! <= end)

  const unscheduled = tasks.filter(t => !isIsoDate(t.due))

  return (
    <div className="flex flex-col gap-4">
      {buckets.map(bucket => {
        const bucketTasks = tasksInBucket(bucket.start, bucket.end)
        return (
          <div key={bucket.start} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-700">{bucket.label}</h3>
              <span className="text-xs text-zinc-400 bg-zinc-100 rounded px-1.5 py-0.5">{bucketTasks.length}</span>
            </div>
            {bucketTasks.length === 0 ? (
              <p className="text-xs text-zinc-400 px-2 py-3 bg-zinc-50 rounded border border-zinc-200">No tasks due this week</p>
            ) : (
              <div className="flex flex-col gap-2">
                {bucketTasks.map(task => (
                  <WeekTaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Unscheduled group */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-500">Unscheduled</h3>
          <span className="text-xs text-zinc-400 bg-zinc-100 rounded px-1.5 py-0.5">{unscheduled.length}</span>
        </div>
        {unscheduled.length === 0 ? (
          <p className="text-xs text-zinc-400 px-2 py-3 bg-zinc-50 rounded border border-zinc-200">No unscheduled tasks</p>
        ) : (
          <div className="flex flex-col gap-2">
            {unscheduled.map(task => (
              <WeekTaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sortable Task Card ───────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task
  projectId: number
  selected: boolean
  onSelect: (id: number, checked: boolean) => void
}

function TaskCard({ task, projectId, selected, onSelect }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const today = new Date().toISOString().split('T')[0]
  const isOverdue = !!task.due && task.due < today && task.status !== 'done'

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid="task-card"
      className={`bg-white border rounded-lg p-3 shadow-sm flex flex-col gap-1.5 ${
        isOverdue ? 'border-red-500 bg-red-50' : 'border-zinc-200'
      }`}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(task.id, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 shrink-0"
        />
        <div className="flex-1 min-w-0 cursor-grab" {...attributes} {...listeners}>
          <p className="text-sm font-medium text-zinc-900 leading-snug break-words">{task.title}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap pl-6">
        {task.owner && (
          <span className="text-xs text-zinc-500">{task.owner}</span>
        )}
        {task.due && (
          <span className="text-xs text-zinc-400">{task.due}</span>
        )}
        {task.priority && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[task.priority] ?? 'bg-zinc-100 text-zinc-600'}`}>
            {task.priority}
          </span>
        )}
        {task.blocked_by && (
          <span className="text-xs text-orange-600">⚠ blocked by #{task.blocked_by}</span>
        )}
      </div>

      {/* Edit button */}
      <div className="pl-6">
        <TaskEditModal
          task={task}
          projectId={projectId}
          trigger={
            <button className="text-xs text-zinc-400 hover:text-zinc-700 underline-offset-2 hover:underline">
              Edit
            </button>
          }
        />
      </div>
    </div>
  )
}

// ─── Droppable Column ─────────────────────────────────────────────────────────

function DroppableColumn({ columnId, children }: { columnId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId })
  return (
    <div
      ref={setNodeRef}
      data-column-id={columnId}
      className={`flex flex-col gap-2 min-h-[120px] rounded-lg p-2 border transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50' : 'bg-zinc-50 border-zinc-200'
      }`}
    >
      {children}
    </div>
  )
}

// ─── Bulk Toolbar ─────────────────────────────────────────────────────────────

interface BulkToolbarProps {
  selectedIds: number[]
  onClear: () => void
  onComplete: () => void
}

function BulkToolbar({ selectedIds, onClear, onComplete }: BulkToolbarProps) {
  const [ownerInput, setOwnerInput] = useState('')
  const [dueInput, setDueInput] = useState('')
  const [phaseInput, setPhaseInput] = useState('')
  const [statusInput, setStatusInput] = useState<'todo' | 'in_progress' | 'blocked' | 'done'>('todo')
  const [mode, setMode] = useState<'owner' | 'due' | 'phase' | 'status' | null>(null)

  async function bulkUpdate(patch: Record<string, string>) {
    await fetch('/api/tasks-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_ids: selectedIds, patch }),
    })
    setMode(null)
    onComplete()
  }

  async function handleBulkDelete() {
    await fetch('/api/tasks-bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_ids: selectedIds }),
    })
    onComplete()
  }

  return (
    <div
      data-testid="bulk-toolbar"
      className="flex items-center gap-2 flex-wrap bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 mb-3"
    >
      <span className="text-sm font-medium text-zinc-700">{selectedIds.length} selected</span>

      {mode === null ? (
        <>
          <button
            onClick={() => setMode('owner')}
            className="px-2.5 py-1 text-xs border border-zinc-300 rounded hover:bg-zinc-100"
          >
            Reassign Owner
          </button>
          <button
            onClick={() => setMode('due')}
            className="px-2.5 py-1 text-xs border border-zinc-300 rounded hover:bg-zinc-100"
          >
            Change Due Date
          </button>
          <button
            onClick={() => setMode('phase')}
            className="px-2.5 py-1 text-xs border border-zinc-300 rounded hover:bg-zinc-100"
          >
            Move to Phase
          </button>
          <button
            onClick={() => setMode('status')}
            className="px-2.5 py-1 text-xs border border-zinc-300 rounded hover:bg-zinc-100"
          >
            Change Status
          </button>
          <button
            onClick={handleBulkDelete}
            className="px-2.5 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50"
          >
            Delete Selected
          </button>
        </>
      ) : mode === 'owner' ? (
        <form
          onSubmit={(e) => { e.preventDefault(); bulkUpdate({ owner: ownerInput }) }}
          className="flex items-center gap-1.5"
        >
          <input
            autoFocus
            value={ownerInput}
            onChange={(e) => setOwnerInput(e.target.value)}
            placeholder="New owner name"
            className="border border-zinc-300 rounded px-2 py-1 text-xs"
          />
          <button type="submit" className="px-2 py-1 text-xs bg-zinc-900 text-white rounded">Apply</button>
          <button type="button" onClick={() => setMode(null)} className="px-2 py-1 text-xs rounded hover:bg-zinc-100">Cancel</button>
        </form>
      ) : mode === 'due' ? (
        <form
          onSubmit={(e) => { e.preventDefault(); bulkUpdate({ due: dueInput }) }}
          className="flex items-center gap-1.5"
        >
          <input
            autoFocus
            value={dueInput}
            onChange={(e) => setDueInput(e.target.value)}
            placeholder="YYYY-MM-DD or TBD"
            className="border border-zinc-300 rounded px-2 py-1 text-xs"
          />
          <button type="submit" className="px-2 py-1 text-xs bg-zinc-900 text-white rounded">Apply</button>
          <button type="button" onClick={() => setMode(null)} className="px-2 py-1 text-xs rounded hover:bg-zinc-100">Cancel</button>
        </form>
      ) : mode === 'phase' ? (
        <form
          onSubmit={(e) => { e.preventDefault(); bulkUpdate({ phase: phaseInput }) }}
          className="flex items-center gap-1.5"
        >
          <input
            autoFocus
            value={phaseInput}
            onChange={(e) => setPhaseInput(e.target.value)}
            placeholder="Phase name"
            className="border border-zinc-300 rounded px-2 py-1 text-xs"
          />
          <button type="submit" className="px-2 py-1 text-xs bg-zinc-900 text-white rounded">Apply</button>
          <button type="button" onClick={() => setMode(null)} className="px-2 py-1 text-xs rounded hover:bg-zinc-100">Cancel</button>
        </form>
      ) : mode === 'status' ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); bulkUpdate({ status: statusInput }) }}
        >
          <select
            value={statusInput}
            onChange={(e) => setStatusInput(e.target.value as typeof statusInput)}
            className="text-xs border border-zinc-200 rounded px-1 py-1"
            aria-label="status"
          >
            <option value="todo">todo</option>
            <option value="in_progress">in_progress</option>
            <option value="blocked">blocked</option>
            <option value="done">done</option>
          </select>
          <button type="submit" className="px-2 py-1 text-xs bg-zinc-900 text-white rounded">Apply</button>
          <button type="button" onClick={() => setMode(null)} className="px-2 py-1 text-xs rounded hover:bg-zinc-100">Cancel</button>
        </form>
      ) : null}

      <button
        onClick={onClear}
        className="ml-auto text-xs text-zinc-400 hover:text-zinc-600"
      >
        Clear selection
      </button>
    </div>
  )
}

// ─── TaskBoard ────────────────────────────────────────────────────────────────

export function TaskBoard({ tasks: initialTasks, projectId }: TaskBoardProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [activeId, setActiveId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'board' | 'week'>('board')

  // Sync with new props only when task content actually changes AND no drag is active.
  // Using a stable signature avoids firing on every reference change (new array on each render).
  const tasksSig = initialTasks.map((t) => `${t.id}:${t.status}:${t.title}`).join('|')
  const prevSigRef = useRef(tasksSig)
  useEffect(() => {
    if (activeId !== null) return // never sync mid-drag
    if (tasksSig === prevSigRef.current) return
    prevSigRef.current = tasksSig
    setTasks(initialTasks)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasksSig, activeId])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleSelect = useCallback((id: number, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return

    // over.id could be column ID or another task ID — find target column
    const overId = String(over.id)
    const columnId = COLUMNS.find((c) => c.id === overId)?.id
      ?? tasks.find((t) => t.id === Number(overId))?.status

    if (!columnId || columnId === tasks.find((t) => t.id === Number(active.id))?.status) return

    const taskId = Number(active.id)

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: columnId } : t))
    )

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: columnId }),
      })
      if (!res.ok) throw new Error('PATCH failed')
      router.refresh()
    } catch {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: initialTasks.find((i) => i.id === taskId)?.status ?? t.status }
            : t
        )
      )
    }
  }

  const selectedIds = Array.from(selected)
  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null

  return (
    <div data-testid="task-board" className="flex flex-col gap-3">
      {/* Create Task button */}
      <div className="flex items-center justify-between">
        <TaskEditModal
          projectId={projectId}
          trigger={
            <button
              data-testid="create-task-btn"
              className="px-3 py-1.5 text-sm font-medium text-white bg-zinc-900 rounded hover:bg-zinc-700"
            >
              + Add Task
            </button>
          }
        />
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-zinc-200 overflow-hidden">
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1 text-xs font-medium ${viewMode === 'board' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'}`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-xs font-medium border-l border-zinc-200 ${viewMode === 'week' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'}`}
            >
              Week
            </button>
          </div>
          <span className="text-sm text-zinc-500">{tasks.length} tasks</span>
        </div>
      </div>

      {/* Bulk toolbar — shows when 2+ selected */}
      {selectedIds.length >= 2 && (
        <BulkToolbar
          selectedIds={selectedIds}
          onClear={() => setSelected(new Set())}
          onComplete={() => {
            setSelected(new Set())
            router.refresh()
          }}
        />
      )}

      {/* Board or Week view */}
      {viewMode === 'week' ? (
        <WeekView tasks={tasks} />
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={(e) => setActiveId(Number(e.active.id))}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-4 gap-3">
            {COLUMNS.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.id)
              return (
                <div key={col.id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-semibold text-zinc-700">{col.label}</h3>
                    <span className="text-xs text-zinc-400 bg-zinc-100 rounded px-1.5 py-0.5">
                      {colTasks.length}
                    </span>
                  </div>

                  <SortableContext
                    id={col.id}
                    items={colTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableColumn columnId={col.id}>
                      {colTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          projectId={projectId}
                          selected={selected.has(task.id)}
                          onSelect={handleSelect}
                        />
                      ))}
                      {colTasks.length === 0 && (
                        <p className="text-xs text-zinc-400 text-center py-4">No tasks</p>
                      )}
                    </DroppableColumn>
                  </SortableContext>
                </div>
              )
            })}
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeTask && (
              <div className="bg-white border border-zinc-300 rounded-lg p-3 shadow-lg text-sm font-medium text-zinc-900 opacity-90">
                {activeTask.title}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
