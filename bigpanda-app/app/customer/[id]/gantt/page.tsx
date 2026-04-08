import { getTasksForProject, getMilestonesForProject } from '@/lib/queries'
import GanttChart from '@/components/GanttChart'
import type { GanttTask, GanttMilestone } from '@/components/GanttChart'

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

function mapTasksToGantt(
  tasks: Awaited<ReturnType<typeof getTasksForProject>>,
  milestoneList: GanttMilestone[]
): GanttTask[] {
  const today = new Date().toISOString().split('T')[0]
  const milestoneIndexMap = new Map(milestoneList.map((m, i) => [m.id, i]))

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

      // custom_class: encode milestone + priority info
      const msIndex = task.milestone_id ? milestoneIndexMap.get(task.milestone_id) : undefined
      const msClass = msIndex !== undefined ? `gantt-ms-${task.milestone_id} gantt-milestone-${msIndex % 6}` : ''
      const priorityClass = task.priority === 'high' ? 'gantt-high-priority' : task.priority === 'low' ? 'gantt-low-priority' : ''
      const customClass = [msClass, priorityClass].filter(Boolean).join(' ')

      return {
        id: String(task.id),
        name: task.title,
        start,
        end: safeEnd,
        progress,
        dependencies,
        custom_class: customClass || undefined,
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

  let tasks: Awaited<ReturnType<typeof getTasksForProject>> = []
  let milestones: GanttMilestone[] = []
  try {
    const [tasksData, milestonesData] = await Promise.all([
      getTasksForProject(projectId),
      getMilestonesForProject(projectId),
    ])
    tasks = tasksData
    // Map Milestone to GanttMilestone (only the fields GanttChart needs)
    milestones = milestonesData.map(m => ({
      id: m.id,
      name: m.name,
      date: m.date,
      status: m.status,
    }))
  } catch {
    // DB not available — render empty gantt
  }
  const ganttTasks = mapTasksToGantt(tasks, milestones)

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Gantt Timeline</h2>
        <p className="text-xs text-zinc-400">{tasks.length} tasks ({ganttTasks.length} with dates)</p>
      </div>
      {/* gantt-container wraps GanttChart (ssr:false) — div is server-rendered so test can find it */}
      <div data-testid="gantt-container" className="overflow-x-auto">
        <GanttChart tasks={ganttTasks} viewMode="Month" milestones={milestones} />
      </div>
    </div>
  )
}
