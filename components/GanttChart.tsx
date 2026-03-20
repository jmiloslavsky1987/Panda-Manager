'use client'
import { useEffect, useRef } from 'react'

export interface GanttTask {
  id: string
  name: string
  start: string        // 'YYYY-MM-DD'
  end: string          // 'YYYY-MM-DD'
  progress: number
  dependencies: string // comma-separated string of task id strings
  custom_class?: string
}

interface GanttChartProps {
  tasks: GanttTask[]
  viewMode?: 'Day' | 'Week' | 'Month' | 'Quarter Year'
}

export default function GanttChart({ tasks, viewMode = 'Week' }: GanttChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const ganttRef = useRef<unknown>(null)

  useEffect(() => {
    if (!svgRef.current) return
    if (tasks.length === 0) return

    // Clear previous instance to prevent doubles (Pitfall 2)
    svgRef.current.innerHTML = ''
    ganttRef.current = null

    // Dynamic import inside useEffect prevents SSR crash (Pitfall 1)
    // frappe-gantt CSS is bundled in its dist and loaded via the import
    import('frappe-gantt').then(({ default: Gantt }) => {
      if (!svgRef.current) return
      ganttRef.current = new Gantt(svgRef.current, tasks, {
        view_mode: viewMode,
        date_format: 'YYYY-MM-DD',
        popup_trigger: 'click',
      })
    })

    return () => {
      // Cleanup on unmount: clear SVG
      if (svgRef.current) svgRef.current.innerHTML = ''
    }
  }, [tasks, viewMode])

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-zinc-400 text-sm gap-1">
        <span>No tasks with valid dates to display in Gantt view.</span>
        <span>Add tasks with start or due dates to see the timeline.</span>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto" data-testid="gantt-container">
      <svg ref={svgRef} />
    </div>
  )
}
