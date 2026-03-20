'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Task, Workstream } from '@/lib/queries'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SwimlaneViewProps {
  tasks: Task[]
  workstreams: Workstream[]
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

// ─── Task Card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task
  onStatusChange: (taskId: number, newStatus: string) => void
  isUpdating: boolean
}

function TaskCard({ task, onStatusChange, isUpdating }: TaskCardProps) {
  return (
    <div
      data-testid="task-card"
      className="border rounded p-2 bg-white shadow-sm text-xs mb-2 opacity-100"
      style={{ opacity: isUpdating ? 0.6 : 1 }}
    >
      <p className="font-medium text-zinc-800 leading-tight">{task.title}</p>
      {task.owner && <p className="text-zinc-500 mt-0.5">Owner: {task.owner}</p>}
      {task.due && <p className="text-zinc-500">Due: {task.due}</p>}
      {task.priority && (
        <span
          className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs ${
            PRIORITY_COLORS[task.priority] ?? 'bg-zinc-100 text-zinc-600'
          }`}
        >
          {task.priority}
        </span>
      )}
      {/* Status change select — plan note: click-to-move is acceptable fallback */}
      <div className="mt-1.5">
        <select
          value={task.status}
          disabled={isUpdating}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
          className="text-xs border border-zinc-200 rounded px-1 py-0.5 bg-zinc-50 cursor-pointer w-full"
          aria-label="Change status"
        >
          {COLUMNS.map((col) => (
            <option key={col.id} value={col.id}>
              {col.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="mt-1">
      <progress
        value={percent}
        max={100}
        className="w-full h-2"
        aria-label={`${percent}% complete`}
      />
      <p className="text-zinc-400 text-xs mt-0.5">{percent}% complete</p>
    </div>
  )
}

// ─── SwimlaneView ─────────────────────────────────────────────────────────────

export function SwimlaneView({ tasks, workstreams, projectId }: SwimlaneViewProps) {
  const router = useRouter()
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks)
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set())

  // Group tasks by workstream_id
  const tasksByWorkstream = new Map<number | null, Task[]>()
  for (const task of optimisticTasks) {
    const key = task.workstream_id ?? null
    if (!tasksByWorkstream.has(key)) tasksByWorkstream.set(key, [])
    tasksByWorkstream.get(key)!.push(task)
  }

  // Lanes: workstreams in DB order + Unassigned lane if any tasks have no workstream_id
  type LaneWorkstream = Workstream | { id: null; name: string; percent_complete: null; track: null; project_id: number }
  const lanes: LaneWorkstream[] = [
    ...workstreams,
    { id: null, name: 'Unassigned', percent_complete: null, track: null, project_id: projectId },
  ].filter((ws) => {
    if (ws.id === null) return (tasksByWorkstream.get(null)?.length ?? 0) > 0
    return (tasksByWorkstream.get(ws.id)?.length ?? 0) > 0
  })

  async function handleStatusChange(taskId: number, newStatus: string) {
    const prevTask = optimisticTasks.find((t) => t.id === taskId)
    if (!prevTask || prevTask.status === newStatus) return

    // Optimistic update
    setOptimisticTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    )
    setUpdatingIds((prev) => new Set(prev).add(taskId))

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('PATCH failed')
      router.refresh()
    } catch {
      // Revert on error
      setOptimisticTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: prevTask.status } : t))
      )
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }
  }

  return (
    <div data-testid="swimlane-view" className="flex flex-col gap-4">
      {lanes.map((ws) => {
        const wsId = ws.id
        const laneTasks = tasksByWorkstream.get(wsId) ?? []
        const pct = ws.percent_complete ?? 0

        return (
          <div
            key={wsId ?? 'unassigned'}
            data-testid="swimlane-row"
            className="border border-zinc-200 rounded-lg overflow-hidden"
          >
            {/* Row header */}
            <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-2 flex items-start gap-3">
              <div className="min-w-[180px] max-w-[200px]">
                <p className="font-semibold text-sm text-zinc-800">{ws.name}</p>
                {ws.track && (
                  <span className="inline-block mt-0.5 px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700">
                    {ws.track}
                  </span>
                )}
                {wsId !== null && <ProgressBar percent={pct} />}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">{laneTasks.length} tasks</p>
            </div>

            {/* Status columns */}
            <div className="grid grid-cols-4 gap-0 divide-x divide-zinc-100">
              {COLUMNS.map((col) => {
                const colTasks = laneTasks.filter((t) => t.status === col.id)
                return (
                  <div key={col.id} className="p-2 min-h-[80px]">
                    <p className="text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wide">
                      {col.label}
                      <span className="ml-1 font-normal text-zinc-400">({colTasks.length})</span>
                    </p>
                    {colTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        isUpdating={updatingIds.has(task.id)}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {lanes.length === 0 && (
        <p className="text-zinc-500 text-sm text-center py-8">No tasks to display.</p>
      )}
    </div>
  )
}
