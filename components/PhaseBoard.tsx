'use client'

import { useState, useRef, useEffect } from 'react'
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
import type { Task, PlanTemplate } from '@/lib/queries'
import { TaskEditModal } from './TaskEditModal'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PhaseBoardProps {
  tasks: Task[]
  projectId: number
  templates: PlanTemplate[]
}

const DEFAULT_PHASES = ['Discovery', 'Design', 'Build', 'Test', 'Go-Live']

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
}

const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-zinc-100 text-zinc-600',
  in_progress: 'bg-blue-100 text-blue-700',
  blocked: 'bg-orange-100 text-orange-700',
  done: 'bg-green-100 text-green-700',
}

// ─── Sortable Phase Card ──────────────────────────────────────────────────────

interface PhaseCardProps {
  task: Task
  projectId: number
}

function PhaseCard({ task, projectId }: PhaseCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid="task-card"
      className="bg-white border border-zinc-200 rounded-lg p-3 shadow-sm flex flex-col gap-1.5"
    >
      <div
        className="cursor-grab text-sm font-medium text-zinc-900 leading-snug break-words"
        {...attributes}
        {...listeners}
      >
        {task.title}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {task.owner && <span className="text-xs text-zinc-500">{task.owner}</span>}
        {task.due && <span className="text-xs text-zinc-400">{task.due}</span>}
        {task.priority && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[task.priority] ?? 'bg-zinc-100 text-zinc-600'}`}>
            {task.priority}
          </span>
        )}
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[task.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
          {task.status.replace('_', ' ')}
        </span>
      </div>

      <TaskEditModal
        task={task}
        projectId={projectId}
        trigger={
          <button className="text-xs text-zinc-400 hover:text-zinc-700 underline-offset-2 hover:underline self-start">
            Edit
          </button>
        }
      />
    </div>
  )
}

// ─── Droppable Column ─────────────────────────────────────────────────────────

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      data-column-id={id}
      className={`flex flex-col gap-2 min-h-[120px] rounded-lg p-2 border transition-colors ${
        isOver ? 'bg-indigo-50 border-indigo-300' : 'bg-zinc-50 border-zinc-200'
      }`}
    >
      {children}
    </div>
  )
}

// ─── PhaseBoard ───────────────────────────────────────────────────────────────

export function PhaseBoard({ tasks: initialTasks, projectId, templates }: PhaseBoardProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [activeId, setActiveId] = useState<number | null>(null)

  // Sync when server re-fetches (e.g. after router.refresh() from AiPlanPanel commit).
  // Use a stable signature to avoid firing on every render due to new array references.
  const tasksSig = initialTasks.map((t) => `${t.id}:${t.phase}:${t.title}`).join('|')
  const prevSigRef = useRef(tasksSig)
  useEffect(() => {
    if (activeId !== null) return // never sync mid-drag
    if (tasksSig === prevSigRef.current) return
    prevSigRef.current = tasksSig
    setTasks(initialTasks)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasksSig, activeId])
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const phases = DEFAULT_PHASES

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return

    const overId = String(over.id)
    // Check if dropped onto a column header or another task
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
      if (!res.ok) throw new Error('PATCH failed')
      router.refresh()
    } catch {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, phase: initialTasks.find((i) => i.id === taskId)?.phase ?? t.phase }
            : t
        )
      )
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('project_id', String(projectId))

    try {
      const res = await fetch('/api/plan-import', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      // Reset file input so the same file can be re-imported if needed
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null

  return (
    <div data-testid="phase-board" className="flex flex-col gap-4">
      {/* Header toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
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
          onSaved={() => router.refresh()}
        />

        {/* Templates */}
        <Dialog open={templatePickerOpen} onOpenChange={setTemplatePickerOpen}>
          <DialogTrigger asChild>
            <button
              data-testid="template-btn"
              className="px-3 py-1.5 text-sm border border-zinc-300 rounded hover:bg-zinc-50"
            >
              Templates
            </button>
          </DialogTrigger>
          <DialogContent data-testid="template-picker" className="max-w-md">
            <DialogHeader>
              <DialogTitle>Plan Templates</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2">
              {templates.length === 0 ? (
                <p className="text-sm text-zinc-500">No templates configured</p>
              ) : (
                templates.map((tpl) => {
                  const taskCount = tpl.data
                    ? (JSON.parse(tpl.data) as { tasks?: unknown[] }).tasks?.length ?? 0
                    : 0;
                  return (
                    <button
                      key={tpl.id}
                      onClick={async () => {
                        if (!tpl.data) return;
                        const parsed = JSON.parse(tpl.data) as { tasks?: Array<Record<string, unknown>> };
                        const templateTasks = parsed.tasks ?? [];
                        for (const t of templateTasks) {
                          await fetch('/api/tasks', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ...t, project_id: projectId, source: 'template' }),
                          });
                        }
                        setTemplatePickerOpen(false);
                        router.refresh();
                      }}
                      className="w-full text-left px-3 py-2 rounded border border-zinc-200 hover:bg-zinc-50 text-sm"
                    >
                      <span className="font-medium">{tpl.name}</span>
                      <span className="ml-2 text-xs text-zinc-400">({taskCount} tasks)</span>
                    </button>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Export */}
        <button
          data-testid="export-btn"
          onClick={() => {
            window.location.href = `/api/plan-export/${projectId}`
          }}
          className="px-3 py-1.5 text-sm border border-zinc-300 rounded hover:bg-zinc-50"
        >
          Export .xlsx
        </button>

        {/* Import */}
        <label className="px-3 py-1.5 text-sm border border-zinc-300 rounded hover:bg-zinc-50 cursor-pointer">
          Import .xlsx
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleImport}
          />
        </label>

        <span className="ml-auto text-sm text-zinc-400">{tasks.length} tasks</span>
      </div>

      {/* Phase Kanban */}
      <DndContext
        sensors={sensors}
        onDragStart={(e) => setActiveId(Number(e.active.id))}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {phases.map((phase) => {
            const phaseTasks = tasks.filter((t) => (t.phase ?? 'Unassigned') === phase)
            return (
              <div key={phase} className="flex flex-col gap-2 min-w-[200px] flex-shrink-0">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-zinc-700">{phase}</h3>
                  <span className="text-xs text-zinc-400 bg-zinc-100 rounded px-1.5 py-0.5">
                    {phaseTasks.length}
                  </span>
                </div>

                <SortableContext
                  id={phase}
                  items={phaseTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <DroppableColumn id={phase}>
                    {phaseTasks.map((task) => (
                      <PhaseCard key={task.id} task={task} projectId={projectId} />
                    ))}
                    {phaseTasks.length === 0 && (
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
    </div>
  )
}
