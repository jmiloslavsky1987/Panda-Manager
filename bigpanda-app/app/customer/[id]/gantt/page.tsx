import { getTasksForProject, getMilestonesForProject, getWbsItems, getWbsTaskAssignments } from '@/lib/queries'
import GanttChart from '@/components/GanttChart'
import type { GanttTask, GanttMilestone, GanttWbsRow } from '@/components/GanttChart'
import type { WbsItem } from '@/db/schema'

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

function mapDataToWbsRows(
  adrWbsItems: WbsItem[],
  biggyWbsItems: WbsItem[],
  tasks: Awaited<ReturnType<typeof getTasksForProject>>,
  assignments: Array<{ wbs_item_id: number; task_id: number }>,
  milestoneList: GanttMilestone[]
): GanttWbsRow[] {
  const allWbsItems = [...adrWbsItems, ...biggyWbsItems]
  const adrItemIds = new Set(adrWbsItems.map(i => i.id))
  // Filter to level-1 items only (summary rows)
  const level1Items = allWbsItems.filter(item => item.level === 1)

  // Build parent/level lookups so we can walk any WBS item up to its level-1 ancestor
  const parentOf = new Map<number, number | null>()
  const levelOf = new Map<number, number>()
  allWbsItems.forEach(item => {
    parentOf.set(item.id, item.parent_id ?? null)
    levelOf.set(item.id, item.level)
  })
  function level1AncestorOf(wbsId: number): number | null {
    let cur: number | null = wbsId
    while (cur !== null) {
      if (levelOf.get(cur) === 1) return cur
      cur = parentOf.get(cur) ?? null
    }
    return null
  }

  // Build task-id → directly-assigned wbs_item_id map (from junction table)
  const taskToWbs = new Map<number, number>()
  assignments.forEach(a => taskToWbs.set(a.task_id, a.wbs_item_id))

  // Build level-1 wbs_item_id → tasks[] map
  const wbsToTasks = new Map<number, typeof tasks>()
  level1Items.forEach(item => wbsToTasks.set(item.id, []))

  // Build case-insensitive name → level-1 WBS item id map (fallback for task.phase matching)
  const wbsNameToId = new Map<string, number>()
  level1Items.forEach(item => wbsNameToId.set(item.name.toLowerCase(), item.id))

  const today = new Date().toISOString().split('T')[0]

  tasks.forEach(task => {
    const wbsId = taskToWbs.get(task.id)
    let l1Id: number | null = null

    if (wbsId !== undefined) {
      // Primary: junction table — walk up to level-1 ancestor
      l1Id = level1AncestorOf(wbsId)
    } else if (task.phase) {
      // Fallback: match task.phase against level-1 WBS item names (case-insensitive)
      l1Id = wbsNameToId.get(task.phase.toLowerCase()) ?? null
    }

    if (l1Id !== null && wbsToTasks.has(l1Id)) {
      wbsToTasks.get(l1Id)!.push(task)
    }
    // tasks that still don't match fall into unassigned (handled in GanttChart)
  })

  // Build milestone index for custom_class (keep priority coloring)
  const milestoneIndexMap = new Map(milestoneList.map((m, i) => [m.id, i]))

  function toGanttTask(task: (typeof tasks)[0]): GanttTask | null {
    if (!task.due && !task.start_date) return null  // skip undated tasks
    const start = toGanttDate(task.start_date, toGanttDate(task.due, today))
    const end = toGanttDate(task.due, addDays(start, 7))
    const safeEnd = end < start ? addDays(start, 1) : end
    const progress = task.status === 'done' ? 100 : task.status === 'in_progress' ? 50 : task.status === 'blocked' ? 10 : 0
    const dependencies = task.blocked_by ? String(task.blocked_by) : ''
    const msIndex = task.milestone_id ? milestoneIndexMap.get(task.milestone_id) : undefined
    const msClass = msIndex !== undefined ? `gantt-ms-${task.milestone_id} gantt-milestone-${msIndex % 6}` : ''
    const priorityClass = task.priority === 'high' ? 'gantt-high-priority' : task.priority === 'low' ? 'gantt-low-priority' : ''
    return { id: String(task.id), name: task.title, start, end: safeEnd, progress, dependencies, custom_class: [msClass, priorityClass].filter(Boolean).join(' ') || undefined }
  }

  return level1Items.map((item, idx) => {
    const rawTasks = wbsToTasks.get(item.id) ?? []
    const ganttTasks = rawTasks.map(toGanttTask).filter((t): t is GanttTask => t !== null)
    return { id: item.id, name: item.name, colorIdx: idx % 6, track: adrItemIds.has(item.id) ? 'ADR' : 'Biggy', tasks: ganttTasks }
  })
}

export default async function GanttPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = parseInt(id)

  let wbsRows: GanttWbsRow[] = []
  let unassignedTasks: GanttTask[] = []
  let milestones: GanttMilestone[] = []

  try {
    const [adrWbs, biggyWbs, tasks, assignments, milestonesData] = await Promise.all([
      getWbsItems(projectId, 'ADR'),
      getWbsItems(projectId, 'Biggy'),
      getTasksForProject(projectId),
      getWbsTaskAssignments(projectId),
      getMilestonesForProject(projectId),
    ])

    // Map Milestone to GanttMilestone (only the fields GanttChart needs)
    milestones = milestonesData.map(m => ({
      id: m.id,
      name: m.name,
      date: m.date,
      status: m.status,
    }))

    // Build WBS rows with assigned tasks — ADR first, then Biggy
    wbsRows = mapDataToWbsRows(adrWbs, biggyWbs, tasks, assignments, milestones)

    // Compute unassigned tasks — exclude any task already placed in a WBS row
    // (covers both junction-table assignments and phase-name fallback matches)
    const today = new Date().toISOString().split('T')[0]
    const assignedTaskIds = new Set<number>()
    wbsRows.forEach(row => row.tasks.forEach(t => assignedTaskIds.add(Number(t.id))))
    const milestoneIndexMap = new Map(milestones.map((m, i) => [m.id, i]))

    function toGanttTask(task: (typeof tasks)[0]): GanttTask | null {
      if (!task.due && !task.start_date) return null
      const start = toGanttDate(task.start_date, toGanttDate(task.due, today))
      const end = toGanttDate(task.due, addDays(start, 7))
      const safeEnd = end < start ? addDays(start, 1) : end
      const progress = task.status === 'done' ? 100 : task.status === 'in_progress' ? 50 : task.status === 'blocked' ? 10 : 0
      const dependencies = task.blocked_by ? String(task.blocked_by) : ''
      const msIndex = task.milestone_id ? milestoneIndexMap.get(task.milestone_id) : undefined
      const msClass = msIndex !== undefined ? `gantt-ms-${task.milestone_id} gantt-milestone-${msIndex % 6}` : ''
      const priorityClass = task.priority === 'high' ? 'gantt-high-priority' : task.priority === 'low' ? 'gantt-low-priority' : ''
      return { id: String(task.id), name: task.title, start, end: safeEnd, progress, dependencies, custom_class: [msClass, priorityClass].filter(Boolean).join(' ') || undefined }
    }

    unassignedTasks = tasks
      .filter(t => !assignedTaskIds.has(t.id) && (t.due || t.start_date))
      .map(toGanttTask)
      .filter((t): t is GanttTask => t !== null)
  } catch {
    // DB not available — render empty gantt
  }

  const totalTaskCount = wbsRows.reduce((sum, r) => sum + r.tasks.length, 0) + unassignedTasks.length

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Gantt Timeline</h2>
        <p className="text-xs text-zinc-400">{totalTaskCount} tasks · {wbsRows.length} phases</p>
      </div>
      {/* gantt-container wraps GanttChart (ssr:false) — div is server-rendered so test can find it */}
      <div data-testid="gantt-container" className="overflow-x-auto">
        <GanttChart
          wbsRows={wbsRows}
          unassignedTasks={unassignedTasks}
          viewMode="Month"
          milestones={milestones}
        />
      </div>
    </div>
  )
}
