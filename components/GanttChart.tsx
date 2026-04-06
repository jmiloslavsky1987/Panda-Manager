'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

// ── Public types (consumed by gantt/page.tsx) ─────────────────────────────────

export interface GanttTask {
  id: string
  name: string
  start: string        // 'YYYY-MM-DD'
  end: string          // 'YYYY-MM-DD'
  progress: number
  dependencies: string
  custom_class?: string
}

export interface GanttMilestone {
  id: number
  name: string
  date: string | null
  status: string | null
}

interface GanttChartProps {
  tasks: GanttTask[]
  viewMode?: ViewMode
  milestones?: GanttMilestone[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

type ViewMode = 'Day' | 'Week' | 'Month' | 'Quarter Year'
const VIEW_MODES: ViewMode[] = ['Day', 'Week', 'Month', 'Quarter Year']
const ROW_H = 36        // px per data row
const HEADER_H = 44     // px for timeline column header
const LEFT_W = 340      // px for left task-list panel

// Pixels per day at each view zoom level
const PX_PER_DAY: Record<ViewMode, number> = {
  Day: 40,
  Week: 14,
  Month: 5,
  'Quarter Year': 2,
}

// 6 cycling colours — one per milestone group
const COLORS = [
  { bar: '#10b981', light: '#d1fae5', text: '#065f46' },  // emerald
  { bar: '#6366f1', light: '#e0e7ff', text: '#3730a3' },  // indigo
  { bar: '#f59e0b', light: '#fef3c7', text: '#92400e' },  // amber
  { bar: '#ef4444', light: '#fee2e2', text: '#991b1b' },  // red
  { bar: '#8b5cf6', light: '#ede9fe', text: '#5b21b6' },  // violet
  { bar: '#06b6d4', light: '#cffafe', text: '#155e75' },  // cyan
]
const UNASSIGNED_COLOR = { bar: '#94a3b8', light: '#f1f5f9', text: '#475569' }

// ── Date helpers ──────────────────────────────────────────────────────────────

function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00')
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function fmtISO(d: Date): string {
  return d.toISOString().split('T')[0]
}
function fmtShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function fmtDuration(start: Date, end: Date): string {
  const days = daysBetween(start, end) + 1
  if (days <= 1) return '1d'
  if (days < 14) return `${days}d`
  const wk = Math.round(days / 7)
  return `${wk}w`
}

// ── Row model ─────────────────────────────────────────────────────────────────

type MilestoneRow = {
  kind: 'milestone'
  key: string
  label: string
  colorIdx: number       // -1 = unassigned
  tasks: GanttTask[]
  spanStart: Date
  spanEnd: Date
}
type TaskRow = {
  kind: 'task'
  task: GanttTask
  colorIdx: number
  rowNum: string
  start: Date
  end: Date
}
type Row = MilestoneRow | TaskRow

// ── Component ─────────────────────────────────────────────────────────────────

export default function GanttChart({
  tasks,
  viewMode: initVM = 'Month',
  milestones = [],
}: GanttChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initVM)
  // Start with all milestone groups expanded
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(milestones.map(m => `ms-${m.id}`))
  )
  const [popup, setPopup] = useState<{ name: string; date: string; status: string | null } | null>(null)
  const [dragOverride, setDragOverride] = useState<Map<string, { start: Date; end: Date }>>(new Map())

  const pxPerDay = PX_PER_DAY[viewMode]

  // ── Milestone → task grouping ─────────────────────────────────────────────

  const milestoneGroups = useMemo(() => {
    const map = new Map<string, GanttTask[]>()
    milestones.forEach(m => map.set(`ms-${m.id}`, []))
    map.set('unassigned', [])
    tasks.forEach(t => {
      const m = t.custom_class?.match(/gantt-ms-(\d+)/)
      if (m) {
        const key = `ms-${m[1]}`
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(t)
      } else {
        map.get('unassigned')!.push(t)
      }
    })
    return map
  }, [tasks, milestones])

  // ── Build ordered row list ────────────────────────────────────────────────

  const rows = useMemo((): Row[] => {
    const result: Row[] = []
    const groups = [
      ...milestones.map((m, i) => ({ key: `ms-${m.id}`, label: m.name, colorIdx: i % COLORS.length, isUnassigned: false })),
      { key: 'unassigned', label: 'Unassigned', colorIdx: -1, isUnassigned: true },
    ]
    groups.forEach((g, gi) => {
      const grpTasks = milestoneGroups.get(g.key) ?? []
      const dates = grpTasks.map(t => ({ s: parseDate(t.start), e: parseDate(t.end) }))
      const spanStart = dates.length ? new Date(Math.min(...dates.map(d => d.s.getTime()))) : new Date()
      const spanEnd   = dates.length ? new Date(Math.max(...dates.map(d => d.e.getTime()))) : new Date()

      result.push({ kind: 'milestone', key: g.key, label: g.label, colorIdx: g.colorIdx, tasks: grpTasks, spanStart, spanEnd })

      if (expanded.has(g.key)) {
        grpTasks.forEach((t, ti) => {
          result.push({
            kind: 'task',
            task: t,
            colorIdx: g.colorIdx,
            rowNum: `${gi + 1}.${ti + 1}`,
            start: parseDate(t.start),
            end: parseDate(t.end),
          })
        })
      }
    })
    return result
  }, [milestones, milestoneGroups, expanded])

  // ── Timeline bounds ───────────────────────────────────────────────────────

  const { timelineStart, totalDays } = useMemo(() => {
    const allDates: Date[] = [
      ...tasks.flatMap(t => [parseDate(t.start), parseDate(t.end)]),
      ...milestones.filter(m => m.date && /^\d{4}-\d{2}-\d{2}/.test(m.date!)).map(m => parseDate(m.date!)),
    ]
    if (!allDates.length) {
      return { timelineStart: addDays(new Date(), -14), totalDays: 120 }
    }
    const minT = Math.min(...allDates.map(d => d.getTime()))
    const maxT = Math.max(...allDates.map(d => d.getTime()))
    const start = addDays(new Date(minT), -14)
    const end   = addDays(new Date(maxT), 21)
    return { timelineStart: start, totalDays: Math.max(60, daysBetween(start, end)) }
  }, [tasks, milestones])

  const totalWidth = totalDays * pxPerDay

  // ── Timeline column headers ───────────────────────────────────────────────

  const headerCols = useMemo(() => {
    const cols: Array<{ label: string; x: number; width: number }> = []

    if (viewMode === 'Day') {
      for (let i = 0; i < totalDays; i++) {
        const d = addDays(timelineStart, i)
        cols.push({ label: d.getDate().toString(), x: i * pxPerDay, width: pxPerDay })
      }
    } else if (viewMode === 'Week') {
      // Align to Monday
      let d = new Date(timelineStart)
      const dow = d.getDay()
      d = addDays(d, -(dow === 0 ? 6 : dow - 1))
      const timelineEnd = addDays(timelineStart, totalDays)
      while (d < timelineEnd) {
        const x = Math.max(0, daysBetween(timelineStart, d)) * pxPerDay
        cols.push({ label: fmtShort(d), x, width: 7 * pxPerDay })
        d = addDays(d, 7)
      }
    } else if (viewMode === 'Month') {
      let y = timelineStart.getFullYear(), m = timelineStart.getMonth()
      for (let iter = 0; iter < 36; iter++) {
        const start = new Date(y, m, 1)
        if (daysBetween(timelineStart, start) > totalDays + 31) break
        const daysInMonth = new Date(y, m + 1, 0).getDate()
        const x = Math.max(0, daysBetween(timelineStart, start)) * pxPerDay
        cols.push({ label: start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), x, width: daysInMonth * pxPerDay })
        m++; if (m > 11) { m = 0; y++ }
      }
    } else {
      // Quarter Year: month columns
      let y = timelineStart.getFullYear(), m = timelineStart.getMonth()
      for (let iter = 0; iter < 48; iter++) {
        const start = new Date(y, m, 1)
        if (daysBetween(timelineStart, start) > totalDays + 31) break
        const daysInMonth = new Date(y, m + 1, 0).getDate()
        const x = Math.max(0, daysBetween(timelineStart, start)) * pxPerDay
        cols.push({ label: start.toLocaleDateString('en-US', { month: 'short' }), x, width: daysInMonth * pxPerDay })
        m++; if (m > 11) { m = 0; y++ }
      }
    }
    return cols
  }, [viewMode, timelineStart, totalDays, pxPerDay])

  // ── Today X ───────────────────────────────────────────────────────────────

  const todayX = useMemo(() => daysBetween(timelineStart, new Date()) * pxPerDay, [timelineStart, pxPerDay])

  // ── Milestone marker positions ────────────────────────────────────────────

  const markerPositions = useMemo(() =>
    milestones
      .filter(m => m.date && /^\d{4}-\d{2}-\d{2}/.test(m.date!))
      .map(m => ({ ...m, x: daysBetween(timelineStart, parseDate(m.date!)) * pxPerDay }))
      .filter(m => m.x >= 0),
  [milestones, timelineStart, pxPerDay])

  // ── Drag-to-reschedule ────────────────────────────────────────────────────

  const dragRef = useRef<{
    taskId: string; origStart: Date; origEnd: Date
    startX: number; pxPerDay: number; curStart: Date; curEnd: Date
  } | null>(null)

  function onBarMouseDown(e: React.MouseEvent, taskId: string, start: Date, end: Date) {
    e.preventDefault()
    dragRef.current = { taskId, origStart: start, origEnd: end, startX: e.clientX, pxPerDay, curStart: start, curEnd: end }
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return
      const delta = Math.round((e.clientX - dragRef.current.startX) / dragRef.current.pxPerDay)
      const ns = addDays(dragRef.current.origStart, delta)
      const ne = addDays(dragRef.current.origEnd, delta)
      dragRef.current.curStart = ns; dragRef.current.curEnd = ne
      setDragOverride(prev => new Map(prev).set(dragRef.current!.taskId, { start: ns, end: ne }))
    }
    async function onUp() {
      if (!dragRef.current) return
      const { taskId, origStart, curStart, curEnd } = dragRef.current
      dragRef.current = null
      if (fmtISO(curStart) === fmtISO(origStart)) {
        setDragOverride(prev => { const m = new Map(prev); m.delete(taskId); return m })
        return
      }
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ start_date: fmtISO(curStart), due: fmtISO(curEnd) }),
        })
        if (!res.ok) throw new Error()
      } catch {
        setDragOverride(prev => { const m = new Map(prev); m.delete(taskId); return m })
        toast.error('Failed to save new dates')
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  function resolvedDates(task: GanttTask): { start: Date; end: Date } {
    return dragOverride.get(task.id) ?? { start: parseDate(task.start), end: parseDate(task.end) }
  }

  // ── Bar geometry ──────────────────────────────────────────────────────────

  const barLeft  = (d: Date) => daysBetween(timelineStart, d) * pxPerDay
  const barWidth = (s: Date, e: Date) => Math.max(pxPerDay, (daysBetween(s, e) + 1) * pxPerDay)

  // ── Scroll sync (vertical) ────────────────────────────────────────────────

  const leftRef  = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const syncing  = useRef(false)

  const syncFromLeft = useCallback(() => {
    if (syncing.current || !rightRef.current || !leftRef.current) return
    syncing.current = true
    rightRef.current.scrollTop = leftRef.current.scrollTop
    requestAnimationFrame(() => { syncing.current = false })
  }, [])
  const syncFromRight = useCallback(() => {
    if (syncing.current || !leftRef.current || !rightRef.current) return
    syncing.current = true
    leftRef.current.scrollTop = rightRef.current.scrollTop
    requestAnimationFrame(() => { syncing.current = false })
  }, [])

  // Scroll right panel to show today on mount / view-mode change
  useEffect(() => {
    if (rightRef.current && todayX > 0) {
      rightRef.current.scrollLeft = Math.max(0, todayX - 240)
    }
  }, [todayX, viewMode])

  // ── Empty state ───────────────────────────────────────────────────────────

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-zinc-400 text-sm gap-1">
        <span>No tasks with dates to display.</span>
        <span className="text-xs">Add start or due dates to tasks to see them here.</span>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col border border-zinc-200 rounded-lg overflow-hidden bg-white select-none">

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-zinc-50 shrink-0">
        <span className="text-xs text-zinc-500">{tasks.length} tasks · {milestones.length} milestones</span>
        <div className="flex rounded border border-zinc-200 overflow-hidden">
          {VIEW_MODES.map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${viewMode === m ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex overflow-hidden" style={{ height: 560 }}>

        {/* ── Left panel ── */}
        <div ref={leftRef} onScroll={syncFromLeft}
          className="shrink-0 flex flex-col overflow-y-auto overflow-x-hidden border-r border-zinc-200"
          style={{ width: LEFT_W }}>

          {/* Left header */}
          <div className="flex items-center shrink-0 border-b border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-500"
            style={{ height: HEADER_H, position: 'sticky', top: 0, zIndex: 10 }}>
            <div className="w-7 pl-2 shrink-0" />
            <div className="flex-1 pl-1 truncate">Project plan</div>
            <div className="w-[52px] text-right shrink-0 pr-1">Start</div>
            <div className="w-[52px] text-right shrink-0 pr-1">Due</div>
            <div className="w-10 text-right shrink-0 pr-3">Dur.</div>
          </div>

          {/* Left rows */}
          {rows.map((row, i) => {
            const color = row.colorIdx === -1 ? UNASSIGNED_COLOR : COLORS[row.colorIdx]

            if (row.kind === 'milestone') {
              const isExp = expanded.has(row.key)
              return (
                <div key={`lms-${row.key}-${i}`}
                  className="flex items-center shrink-0 border-b border-zinc-100 cursor-pointer hover:bg-zinc-100/60 font-medium"
                  style={{ height: ROW_H, background: '#f9f9f9' }}
                  onClick={() => setExpanded(p => { const n = new Set(p); isExp ? n.delete(row.key) : n.add(row.key); return n })}>
                  <div className="w-7 pl-2 shrink-0 text-[11px]" style={{ color: color.bar }}>{isExp ? '▾' : '▸'}</div>
                  <div className="flex-1 pl-1 pr-1 truncate text-sm font-semibold" style={{ color: color.text }}>{row.label}</div>
                  <div className="w-[52px] text-right shrink-0 pr-1 text-xs text-zinc-400">
                    {row.tasks.length ? fmtShort(row.spanStart) : '—'}
                  </div>
                  <div className="w-[52px] text-right shrink-0 pr-1 text-xs text-zinc-400">
                    {row.tasks.length ? fmtShort(row.spanEnd) : '—'}
                  </div>
                  <div className="w-10 text-right shrink-0 pr-3 text-xs text-zinc-400">
                    {row.tasks.length ? fmtDuration(row.spanStart, row.spanEnd) : '—'}
                  </div>
                </div>
              )
            }

            // task row
            const { start, end } = resolvedDates(row.task)
            return (
              <div key={`lt-${row.task.id}-${i}`}
                className="flex items-center shrink-0 border-b border-zinc-100 hover:bg-zinc-50"
                style={{ height: ROW_H }}>
                <div className="w-7 pl-2 shrink-0 text-[10px] text-zinc-300">{row.rowNum}</div>
                <div className="flex-1 pl-2 pr-1 truncate text-xs text-zinc-700">{row.task.name}</div>
                <div className="w-[52px] text-right shrink-0 pr-1 text-xs text-zinc-400">{fmtShort(start)}</div>
                <div className="w-[52px] text-right shrink-0 pr-1 text-xs text-zinc-400">{fmtShort(end)}</div>
                <div className="w-10 text-right shrink-0 pr-3 text-xs text-zinc-400">{fmtDuration(start, end)}</div>
              </div>
            )
          })}
        </div>

        {/* ── Right panel ── */}
        <div ref={rightRef} onScroll={syncFromRight}
          className="flex-1 overflow-auto relative">
          <div style={{ width: Math.max(totalWidth, 800), minHeight: '100%', position: 'relative' }}>

            {/* Timeline header */}
            <div className="flex border-b border-zinc-200 bg-zinc-50 shrink-0"
              style={{ height: HEADER_H, position: 'sticky', top: 0, zIndex: 10, width: Math.max(totalWidth, 800) }}>
              {headerCols.map((col, i) => (
                <div key={i} className="absolute flex items-center justify-center border-r border-zinc-100 text-zinc-500"
                  style={{ left: col.x, width: col.width, height: HEADER_H, fontSize: 11, overflow: 'hidden', whiteSpace: 'nowrap', paddingLeft: 4 }}>
                  {col.label}
                </div>
              ))}
            </div>

            {/* Grid lines + today + milestone markers + rows */}
            <div style={{ position: 'relative', width: Math.max(totalWidth, 800) }}>

              {/* Vertical grid lines */}
              {headerCols.map((col, i) => (
                <div key={`grid-${i}`} className="absolute top-0 bottom-0 border-r border-zinc-100 pointer-events-none"
                  style={{ left: col.x, width: col.width }} />
              ))}

              {/* Today line */}
              {todayX >= 0 && (
                <div className="absolute top-0 bottom-0 pointer-events-none z-20"
                  style={{ left: todayX, width: 2, background: '#ef4444', opacity: 0.5 }} />
              )}

              {/* Milestone markers */}
              {markerPositions.map((m, mi) => {
                // Stagger labels if close together
                const nearby = markerPositions.slice(0, mi).filter(p => Math.abs(p.x - m.x) < 80).length
                return (
                  <div key={`mk-${m.id}`} className="absolute top-0 bottom-0 pointer-events-none z-10"
                    style={{ left: m.x }}>
                    <div className="absolute top-0 bottom-0 pointer-events-none"
                      style={{ left: 0, width: 0, borderLeft: '1.5px dashed #6366f1', opacity: 0.5 }} />
                    <div className="pointer-events-auto absolute cursor-pointer rounded px-1"
                      style={{ top: 4 + nearby * 20, left: 3, fontSize: 10, color: '#6366f1', background: 'rgba(99,102,241,0.08)', whiteSpace: 'nowrap', zIndex: 11 }}
                      onClick={() => setPopup({ name: m.name, date: m.date!, status: m.status })}>
                      {m.name}
                    </div>
                  </div>
                )
              })}

              {/* Data rows */}
              {rows.map((row, i) => {
                const color = row.colorIdx === -1 ? UNASSIGNED_COLOR : COLORS[row.colorIdx]

                if (row.kind === 'milestone') {
                  const left  = row.tasks.length ? barLeft(row.spanStart) : 0
                  const width = row.tasks.length ? barWidth(row.spanStart, row.spanEnd) : 0
                  return (
                    <div key={`rms-${row.key}-${i}`} className="relative border-b border-zinc-100"
                      style={{ height: ROW_H, background: '#fafafa' }}>
                      {row.tasks.length > 0 && (
                        <div className="absolute rounded pointer-events-none"
                          style={{ left, width, top: '50%', transform: 'translateY(-50%)', height: 8, background: color.bar, opacity: 0.25 }} />
                      )}
                    </div>
                  )
                }

                // task row
                const { start, end } = resolvedDates(row.task)
                const left  = barLeft(start)
                const width = barWidth(start, end)
                const isDragging = dragOverride.has(row.task.id)

                return (
                  <div key={`rt-${row.task.id}-${i}`} className="relative border-b border-zinc-100 hover:bg-zinc-50/30"
                    style={{ height: ROW_H }}>
                    <div
                      className="absolute rounded flex items-center px-2 overflow-hidden"
                      style={{
                        left,
                        width,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        height: ROW_H - 10,
                        background: color.bar,
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: isDragging ? 'grabbing' : 'grab',
                        boxShadow: isDragging ? '0 4px 14px rgba(0,0,0,0.18)' : '0 1px 3px rgba(0,0,0,0.1)',
                        userSelect: 'none',
                        zIndex: isDragging ? 30 : 5,
                      }}
                      onMouseDown={e => onBarMouseDown(e, row.task.id, parseDate(row.task.start), parseDate(row.task.end))}>
                      <span className="truncate">{row.task.name}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Milestone click popup */}
      {popup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto bg-white border border-zinc-200 rounded-xl shadow-2xl p-4 min-w-[220px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-zinc-800 text-sm">{popup.name}</div>
                <div className="text-zinc-500 text-sm mt-1">{popup.date}</div>
                {popup.status && <div className="text-zinc-400 text-xs mt-1 capitalize">{popup.status}</div>}
              </div>
              <button onClick={() => setPopup(null)} className="text-zinc-400 hover:text-zinc-600 text-lg leading-none">×</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
