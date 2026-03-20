'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task, PlanTemplate } from '@/lib/queries'
import { TaskEditModal } from './TaskEditModal'

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

// ─── Template Picker ──────────────────────────────────────────────────────────

interface TemplatePickerProps {
  templates: PlanTemplate[]
  projectId: number
  onClose: () => void
  onCreated: () => void
}

function TemplatePicker({ templates, projectId, onClose, onCreated }: TemplatePickerProps) {
  const [loading, setLoading] = useState(false)

  async function applyTemplate(template: PlanTemplate) {
    if (!template.data) return
    setLoading(true)
    try {
      const parsed = JSON.parse(template.data) as { tasks?: Array<Record<string, unknown>> }
      const templateTasks = parsed.tasks ?? []

      for (const t of templateTasks) {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...t, project_id: projectId, source: 'template' }),
        })
      }
      onCreated()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      data-testid="template-picker"
      className="absolute top-full left-0 mt-1 z-50 bg-white border border-zinc-200 rounded-lg shadow-lg min-w-[220px] py-1"
    >
      {templates.length === 0 ? (
        <p className="px-4 py-3 text-sm text-zinc-400">No templates configured</p>
      ) : (
        templates.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => applyTemplate(tpl)}
            disabled={loading}
            className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {tpl.name}
            {tpl.template_type && (
              <span className="ml-2 text-xs text-zinc-400">({tpl.template_type})</span>
            )}
          </button>
        ))
      )}
    </div>
  )
}

// ─── PhaseBoard ───────────────────────────────────────────────────────────────

export function PhaseBoard({ tasks: initialTasks, projectId, templates }: PhaseBoardProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // Derive phases from tasks (or defaults)
  const phases =
    tasks.length > 0
      ? [...new Set(tasks.map((t) => t.phase ?? 'Unassigned'))]
      : DEFAULT_PHASES

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
        <div className="relative">
          <button
            data-testid="template-btn"
            onClick={() => setTemplatePickerOpen((v) => !v)}
            className="px-3 py-1.5 text-sm border border-zinc-300 rounded hover:bg-zinc-50"
          >
            Templates
          </button>
          {templatePickerOpen && (
            <TemplatePicker
              templates={templates}
              projectId={projectId}
              onClose={() => setTemplatePickerOpen(false)}
              onCreated={() => router.refresh()}
            />
          )}
        </div>

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
                  <div
                    data-column-id={phase}
                    className="flex flex-col gap-2 min-h-[120px] bg-zinc-50 rounded-lg p-2 border border-zinc-200"
                  >
                    {phaseTasks.map((task) => (
                      <PhaseCard key={task.id} task={task} projectId={projectId} />
                    ))}
                    {phaseTasks.length === 0 && (
                      <p className="text-xs text-zinc-400 text-center py-4">No tasks</p>
                    )}
                  </div>
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
