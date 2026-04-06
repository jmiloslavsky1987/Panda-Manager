'use client'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export interface GanttTask {
  id: string
  name: string
  start: string        // 'YYYY-MM-DD'
  end: string          // 'YYYY-MM-DD'
  progress: number
  dependencies: string // comma-separated string of task id strings
  custom_class?: string
}

export interface GanttMilestone {
  id: number
  name: string
  date: string | null   // raw value from DB — may be ISO, 'TBD', '2026-Q3', or null
  status: string | null
}

interface GanttChartProps {
  tasks: GanttTask[]
  viewMode?: 'Day' | 'Week' | 'Month' | 'Quarter Year'
  milestones?: GanttMilestone[]   // passed from page; used in Plans 38-03 and 38-04
}

type ViewMode = 'Day' | 'Week' | 'Month' | 'Quarter Year'

const VIEW_MODES: ViewMode[] = ['Day', 'Week', 'Month', 'Quarter Year']

type MilestoneGroup = {
  id: string          // 'milestone-{id}' or 'unassigned'
  label: string
  milestoneIndex: number | null
  tasks: GanttTask[]
}

export default function GanttChart({ tasks, viewMode: initialViewMode = 'Month', milestones = [] }: GanttChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const ganttRef = useRef<unknown>(null)
  const tasksRef = useRef<GanttTask[]>(tasks)  // for rollback in on_date_change
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())  // all collapsed by default
  const [ganttReady, setGanttReady] = useState(false)  // true after frappe-gantt initialises
  const [popup, setPopup] = useState<{ name: string; date: string; status: string | null; x: number; y: number } | null>(null)

  // Build milestone groups
  const groups: MilestoneGroup[] = [
    ...milestones.map((m, i) => ({
      id: `milestone-${m.id}`,
      label: m.name,
      milestoneIndex: i,
      tasks: tasks.filter(t => t.custom_class?.includes(`gantt-ms-${m.id}`)),
    })),
    {
      id: 'unassigned',
      label: 'Unassigned',
      milestoneIndex: null,
      tasks: tasks.filter(t => !t.custom_class || !t.custom_class.includes('gantt-ms-')),
    },
  ]

  // Visible tasks computation
  const visibleTasks = groups
    .filter(g => expandedGroups.has(g.id))
    .flatMap(g => g.tasks)

  // Accordion toggle
  function toggleGroup(groupId: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  // frappe-gantt init effect (re-run when visibleTasks or viewMode change)
  useEffect(() => {
    if (!svgRef.current) return
    setGanttReady(false)
    svgRef.current.innerHTML = ''
    ganttRef.current = null

    if (visibleTasks.length === 0) return

    tasksRef.current = visibleTasks  // keep tasksRef in sync for rollback

    import('frappe-gantt').then(({ default: Gantt }) => {
      if (!svgRef.current) return
      ganttRef.current = new Gantt(svgRef.current, visibleTasks, {
        view_mode: viewMode,
        date_format: 'YYYY-MM-DD',
        popup_trigger: 'click',
        on_date_change: async (task, start, end) => {
          const originalTasks = [...tasksRef.current]
          const taskId = task.id
          const fmt = (d: Date) => d.toISOString().split('T')[0]
          try {
            const res = await fetch(`/api/tasks/${taskId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ start_date: fmt(start), due: fmt(end) }),
            })
            if (!res.ok) throw new Error('Server error')
            // Silent success
          } catch {
            // Roll back bar positions
            if (ganttRef.current) {
              (ganttRef.current as { refresh: (t: GanttTask[]) => void }).refresh(originalTasks)
            }
            toast.error('Failed to save new dates')
          }
        },
      })
      setGanttReady(true)
    })

    return () => {
      if (svgRef.current) svgRef.current.innerHTML = ''
    }
  }, [visibleTasks, viewMode])

  // Milestone marker injection effect
  useEffect(() => {
    if (!ganttReady || !svgRef.current || !ganttRef.current) return

    // Remove any previously injected markers
    const svg = svgRef.current
    svg.querySelectorAll('.milestone-marker, .milestone-label').forEach(el => el.remove())

    const gantt = ganttRef.current as {
      gantt_start: Date
      config: { step: number; column_width: number; unit: string }
    }

    const svgHeight = svg.getAttribute('height') || '400'
    const headerHeight = 85  // frappe-gantt header: 45 + 30 + 10

    // Helper: compute x pixel position for a given ISO date
    function computeMarkerX(isoDate: string): number {
      const milestoneDate = new Date(isoDate)
      const diff = (milestoneDate.getTime() - gantt.gantt_start.getTime()) / (1000 * 60 * 60 * 24)
      return (diff / gantt.config.step) * gantt.config.column_width
    }

    // Stagger y positions to avoid label overlap (24px apart)
    const LABEL_STAGGER_PX = 24
    const markerPositions: Array<{ x: number; label: string; date: string; status: string | null }> = []

    milestones.forEach(m => {
      // Only render markers for valid ISO dates
      if (!m.date || !/^\d{4}-\d{2}-\d{2}/.test(m.date)) return

      const x = computeMarkerX(m.date)

      // Skip markers outside visible range (negative x = before chart start)
      if (x < 0) return

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', String(x))
      line.setAttribute('x2', String(x))
      line.setAttribute('y1', String(headerHeight))
      line.setAttribute('y2', svgHeight)
      line.setAttribute('stroke', '#6366f1')
      line.setAttribute('stroke-width', '1.5')
      line.setAttribute('stroke-dasharray', '4,3')
      line.setAttribute('class', 'milestone-marker')
      line.style.cursor = 'pointer'
      line.addEventListener('click', () => {
        setPopup({ name: m.name, date: m.date!, status: m.status, x, y: headerHeight })
      })
      svg.appendChild(line)

      // Stagger label y: check for nearby existing labels within 60px
      const nearbyCount = markerPositions.filter(p => Math.abs(p.x - x) < 60).length
      const labelY = headerHeight - 8 - (nearbyCount * LABEL_STAGGER_PX)

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      label.setAttribute('x', String(x + 4))
      label.setAttribute('y', String(Math.max(12, labelY)))  // never above top of SVG
      label.setAttribute('font-size', '11')
      label.setAttribute('fill', '#6366f1')
      label.setAttribute('class', 'milestone-label')
      label.style.cursor = 'pointer'
      label.textContent = m.name
      label.addEventListener('click', () => {
        setPopup({ name: m.name, date: m.date!, status: m.status, x, y: headerHeight })
      })
      svg.appendChild(label)

      markerPositions.push({ x, label: m.name, date: m.date!, status: m.status })
    })
  }, [ganttReady, viewMode, milestones, expandedGroups])

  // View mode change handler
  function handleViewChange(mode: ViewMode) {
    setViewMode(mode)
  }

  if (tasks.length === 0) {
    return <div className="flex flex-col items-center justify-center h-48 text-zinc-400 text-sm gap-1">
      <span>No tasks with valid dates to display in Gantt view.</span>
      <span>Add tasks with start or due dates to see the timeline.</span>
    </div>
  }

  return (
    <div className="flex flex-col gap-0 relative">
      {/* Header: title + view toggle */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-zinc-200">
        <span className="text-sm text-zinc-500">{tasks.length} tasks, {milestones.length} milestones</span>
        <div className="flex rounded-md border border-zinc-200 overflow-hidden">
          {VIEW_MODES.map(mode => (
            <button
              key={mode}
              onClick={() => handleViewChange(mode)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-zinc-800 text-white'
                  : 'bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Accordion swim lanes */}
      <div className="flex flex-col">
        {groups.map(group => (
          <div key={group.id}>
            {/* Accordion header */}
            <div
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer select-none ${
                group.id === 'unassigned'
                  ? 'bg-zinc-50 hover:bg-zinc-100 border-b border-zinc-100'
                  : 'bg-zinc-100 hover:bg-zinc-200 border-b border-zinc-200'
              }`}
              onClick={() => toggleGroup(group.id)}
            >
              <span className="text-xs text-zinc-400">{expandedGroups.has(group.id) ? '▼' : '▶'}</span>
              <span className={`text-sm font-medium ${group.id === 'unassigned' ? 'text-zinc-400' : 'text-zinc-700'}`}>
                {group.label}
              </span>
              <span className="text-xs text-zinc-400">({group.tasks.length} tasks)</span>
            </div>
          </div>
        ))}
      </div>

      {/* frappe-gantt SVG — renders all visible tasks in one flat instance */}
      {visibleTasks.length > 0 ? (
        <div className="overflow-x-auto" data-testid="gantt-container">
          <svg ref={svgRef} />
        </div>
      ) : (
        <div className="px-4 py-6 text-sm text-zinc-400 text-center">
          Expand a milestone group to see its tasks on the timeline.
        </div>
      )}

      {/* Milestone click popup — absolutely positioned over the chart */}
      {popup && (
        <div
          className="absolute z-50 bg-white border border-zinc-200 rounded-lg shadow-lg p-3 text-xs min-w-[160px]"
          style={{ left: popup.x + 8, top: popup.y + 90 }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold text-zinc-800 text-sm">{popup.name}</div>
              <div className="text-zinc-500 mt-1">{popup.date}</div>
              {popup.status && <div className="text-zinc-400 mt-0.5 capitalize">{popup.status}</div>}
            </div>
            <button
              onClick={() => setPopup(null)}
              className="text-zinc-400 hover:text-zinc-600 ml-1 flex-shrink-0"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
