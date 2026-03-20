import dynamic from 'next/dynamic'
import { getTasksForProject } from '@/lib/queries'
import type { GanttTask } from '@/components/GanttChart'

// Dynamic import to disable SSR — frappe-gantt accesses document at import time
const GanttChart = dynamic(() => import('@/components/GanttChart'), { ssr: false })

function toGanttDate(dateStr: string | null, fallback: string): string {
  if (!dateStr) return fallback
  // Validate it looks like YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.slice(0, 10)
  return fallback
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function mapTasksToGantt(tasks: Awaited<ReturnType<typeof getTasksForProject>>): GanttTask[] {
  const today = new Date().toISOString().split('T')[0]

  return tasks
    .filter(task => task.due || task.start_date)  // only tasks with at least one date
    .map(task => {
      const start = toGanttDate(task.start_date, toGanttDate(task.due, today))
      const end = toGanttDate(task.due, addDays(start, 7))
      // end must be >= start
      const safeEnd = end < start ? addDays(start, 1) : end

      // Map status to progress
      const progress =
        task.status === 'done' ? 100 :
        task.status === 'in_progress' ? 50 :
        task.status === 'blocked' ? 10 : 0

      // dependencies: frappe-gantt expects comma-separated string of task IDs as strings
      // blocked_by is a single integer FK — convert to string
      const dependencies = task.blocked_by ? String(task.blocked_by) : ''

      // custom_class for color coding by priority
      const customClass =
        task.priority === 'high' ? 'gantt-high-priority' :
        task.priority === 'low' ? 'gantt-low-priority' : ''

      return {
        id: String(task.id),
        name: task.title,
        start,
        end: safeEnd,
        progress,
        dependencies,
        custom_class: customClass,
      }
    })
}

export default async function GanttPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = parseInt(id)

  const tasks = await getTasksForProject(projectId)
  const ganttTasks = mapTasksToGantt(tasks)

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Gantt Timeline</h2>
        <p className="text-xs text-zinc-400">{tasks.length} tasks ({ganttTasks.length} with dates)</p>
      </div>
      <GanttChart tasks={ganttTasks} viewMode="Week" />
    </div>
  )
}
