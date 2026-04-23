'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { DatePickerCell } from '@/components/DatePickerCell'

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

export interface GanttWbsRow {
  id: number
  name: string
  colorIdx: number
  level: number
  parentId: number | null
  track?: 'ADR' | 'Biggy'
  tasks: GanttTask[]
}

interface GanttChartProps {
  wbsRows: GanttWbsRow[]
  unassignedTasks?: GanttTask[]
  milestones?: GanttMilestone[]
  viewMode?: ViewMode
  projectId?: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

type ViewMode = 'Day' | 'Week' | 'Month' | 'Quarter Year'
const VIEW_MODES: ViewMode[] = ['Day', 'Week', 'Month', 'Quarter Year']
const ROW_H = 36        // px per data row
const HEADER_H = 44     // px for timeline column header
const LEFT_W_DEFAULT = 380  // initial px for left task-list panel

// Pixels per day at each view zoom level
const PX_PER_DAY: Record<ViewMode, number> = {
  Day: 40,
  Week: 14,
  Month: 5,
  'Quarter Year': 2,
}

// 6 cycling colours — one per WBS item
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

type WbsSummaryRow = {
  kind: 'wbs'
  wbsId: number | 'unassigned'
  label: string
  colorIdx: number       // -1 = unassigned
  level: number
  parentWbsId: number | null
  hasChildren: boolean   // true if any WBS item lists this as parentId
  track?: 'ADR' | 'Biggy'
  tasks: GanttTask[]
  spanStart: Date | null
  spanEnd: Date | null
}
type TaskRow = {
  kind: 'task'
  task: GanttTask
  wbsId: number | 'unassigned'
  colorIdx: number
  rowNum: string
  start: Date
  end: Date
}
type SectionHeaderRow = {
  kind: 'section-header'
  label: string
}
type Row = WbsSummaryRow | TaskRow | SectionHeaderRow

// ── Pure function: build WBS summary rows with span computation ───────────────

export function buildWbsRows(
  wbsItems: Array<{ id: number; name: string; colorIdx: number; level: number; parentId: number | null; track?: 'ADR' | 'Biggy'; tasks: GanttTask[] }>,
  unassignedTasks: GanttTask[]
): WbsSummaryRow[] {
  // Compute actual tree depth from parent chain (DB `level` column can be stale/wrong)
  const parentMap = new Map<number, number | null>()
  wbsItems.forEach(item => parentMap.set(item.id, item.parentId))
  const depthCache = new Map<number, number>()
  function computeDepth(id: number): number {
    if (depthCache.has(id)) return depthCache.get(id)!
    const parentId = parentMap.get(id) ?? null
    if (parentId === null) { depthCache.set(id, 1); return 1 }
    const d = computeDepth(parentId) + 1
    depthCache.set(id, d)
    return d
  }
  wbsItems.forEach(item => computeDepth(item.id))

  const childParentIds = new Set(wbsItems.map(i => i.parentId).filter((id): id is number => id !== null))
  const rows: WbsSummaryRow[] = wbsItems.map(item => {
    const depth = depthCache.get(item.id) ?? item.level
    const dated = item.tasks.filter(t => t.start && t.end)
    const dates = dated.map(t => ({ s: parseDate(t.start), e: parseDate(t.end) }))
    const spanStart = dates.length ? new Date(Math.min(...dates.map(d => d.s.getTime()))) : null
    const spanEnd = dates.length ? new Date(Math.max(...dates.map(d => d.e.getTime()))) : null
    return { kind: 'wbs', wbsId: item.id, label: item.name, colorIdx: item.colorIdx, level: depth, parentWbsId: item.parentId, hasChildren: childParentIds.has(item.id), track: item.track, tasks: item.tasks, spanStart, spanEnd }
  })
  // Propagate spans bottom-up so parent rows reflect descendant task dates
  const rowById = new Map(rows.map(r => [r.wbsId, r]))
  const maxLevel = rows.reduce((m, r) => Math.max(m, r.level), 1)
  for (let l = maxLevel; l >= 1; l--) {
    rows.filter(r => r.level === l && r.parentWbsId !== null).forEach(row => {
      if (!row.spanStart && !row.spanEnd) return
      const parent = rowById.get(row.parentWbsId!)
      if (!parent) return
      if (row.spanStart) parent.spanStart = parent.spanStart ? new Date(Math.min(parent.spanStart.getTime(), row.spanStart.getTime())) : row.spanStart
      if (row.spanEnd)   parent.spanEnd   = parent.spanEnd   ? new Date(Math.max(parent.spanEnd.getTime(),   row.spanEnd.getTime()))   : row.spanEnd
    })
  }
  // Unassigned group
  const unassignedDates = unassignedTasks.filter(t => t.start && t.end).map(t => ({ s: parseDate(t.start), e: parseDate(t.end) }))
  const unassignedSpanStart = unassignedDates.length ? new Date(Math.min(...unassignedDates.map(d => d.s.getTime()))) : null
  const unassignedSpanEnd = unassignedDates.length ? new Date(Math.max(...unassignedDates.map(d => d.e.getTime()))) : null
  if (unassignedTasks.length > 0) {
    rows.push({ kind: 'wbs', wbsId: 'unassigned', label: 'Unassigned', colorIdx: -1, level: 1, parentWbsId: null, hasChildren: false, tasks: unassignedTasks, spanStart: unassignedSpanStart, spanEnd: unassignedSpanEnd })
  }
  return rows
}

// ── Pure function: compute edge drag delta for TDD (DLVRY-02) ────────────────

export function computeEdgeDrag(
  side: 'left' | 'right',
  origStart: string,
  origEnd: string,
  deltaDays: number
): { start: string; end: string } {
  const s = parseDate(origStart)
  const e = parseDate(origEnd)
  if (side === 'left') {
    const ns = addDays(s, deltaDays)
    // clamp: start must be at most end - 1 day
    const clamped = ns >= e ? addDays(e, -1) : ns
    return { start: fmtISO(clamped), end: origEnd }
  } else {
    const ne = addDays(e, deltaDays)
    // clamp: end must be at least start + 1 day
    const clamped = ne <= s ? addDays(s, 1) : ne
    return { start: origStart, end: fmtISO(clamped) }
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

type BaselineMeta = { id: number; name: string; createdAt: string }

export default function GanttChart({
  wbsRows,
  unassignedTasks = [],
  viewMode: initVM = 'Month',
  milestones = [],
  projectId,
}: GanttChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initVM)
  // Start with all WBS groups collapsed
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [popup, setPopup] = useState<{ name: string; date: string; status: string | null } | null>(null)
  const [dragOverride, setDragOverride] = useState<Map<string, { start: Date; end: Date }>>(new Map())
  const [leftWidth, setLeftWidth] = useState(LEFT_W_DEFAULT)
  const [containerWidth, setContainerWidth] = useState(1200)
  const [labelTip, setLabelTip] = useState<{ text: string; x: number; y: number } | null>(null)

  // ── Baseline state ────────────────────────────────────────────────────────
  const [baselines, setBaselines] = useState<BaselineMeta[]>([])
  const [activeBaselineId, setActiveBaselineId] = useState<number | null>(null)
  const [activeBaselineSnapshot, setActiveBaselineSnapshot] = useState<Record<string, { start: string; end: string }> | null>(null)
  const [saveMode, setSaveMode] = useState(false)
  const [baselineName, setBaselineName] = useState('')
  const [savingBaseline, setSavingBaseline] = useState(false)

  // ── Fetch baselines on mount ──────────────────────────────────────────────

  useEffect(() => {
    if (!projectId) return
    fetch(`/api/projects/${projectId}/gantt-baselines`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.baselines) setBaselines(data.baselines) })
      .catch(() => {})
  }, [projectId])

  // ── Baseline handlers ─────────────────────────────────────────────────────

  async function handleSelectBaseline(id: number | null) {
    setActiveBaselineId(id)
    if (id === null) { setActiveBaselineSnapshot(null); return }
    try {
      const res = await fetch(`/api/projects/${projectId}/gantt-baselines/${id}`)
      if (!res.ok) return
      const data = await res.json()
      setActiveBaselineSnapshot(data.snapshot ?? null)
    } catch {}
  }

  async function handleSaveBaseline() {
    if (!baselineName.trim() || savingBaseline) return
    setSavingBaseline(true)
    const snapshot: Record<string, { start: string; end: string }> = {}
    const allTasks = [...wbsRows.flatMap(r => r.tasks), ...unassignedTasks]
    allTasks.forEach(t => { snapshot[t.id] = { start: t.start, end: t.end } })
    try {
      const res = await fetch(`/api/projects/${projectId}/gantt-baselines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: baselineName.trim(), snapshot }),
      })
      if (res.ok) {
        const created = await res.json()
        setBaselines(prev => [created, ...prev])
        toast.success(`Baseline "${created.name}" saved`)
        setBaselineName('')
        setSaveMode(false)
      } else {
        toast.error('Failed to save baseline')
      }
    } catch { toast.error('Failed to save baseline') }
    finally { setSavingBaseline(false) }
  }

  // ── Build WBS summary rows ────────────────────────────────────────────────

  const wbsSummaryRows = useMemo(() =>
    buildWbsRows(wbsRows, unassignedTasks),
  [wbsRows, unassignedTasks])

  // ── Build ordered row list ────────────────────────────────────────────────

  const rows = useMemo((): Row[] => {
    const result: Row[] = []
    let currentTrack: string | undefined
    let wbsIdx = 0

    // Build parent → ordered children map for DFS
    const childrenOf = new Map<string, WbsSummaryRow[]>()
    wbsSummaryRows.forEach(row => {
      const key = row.wbsId !== 'unassigned' && row.parentWbsId !== null
        ? String(row.parentWbsId)
        : '__root__'
      if (!childrenOf.has(key)) childrenOf.set(key, [])
      childrenOf.get(key)!.push(row)
    })

    function visitRow(row: WbsSummaryRow): void {
      // Section header at L1 track transitions only
      if (row.parentWbsId === null && row.wbsId !== 'unassigned' && row.track && row.track !== currentTrack) {
        result.push({ kind: 'section-header', label: row.track })
        currentTrack = row.track
      }
      const gi = wbsIdx++
      result.push(row)
      if (!expanded.has(String(row.wbsId))) return

      const children = childrenOf.get(String(row.wbsId)) ?? []
      // Show WBS children (structural hierarchy)
      children.forEach(child => visitRow(child))
      // Show direct tasks on this row below any WBS children
      row.tasks.forEach((t, ti) => {
        result.push({ kind: 'task', task: t, wbsId: row.wbsId, colorIdx: row.colorIdx, rowNum: `${gi + 1}.${ti + 1}`, start: parseDate(t.start), end: parseDate(t.end) })
      })
    }

    // DFS from root rows (L1, no parent)
    const rootRows = childrenOf.get('__root__') ?? []
    rootRows.filter(r => r.wbsId !== 'unassigned').forEach(row => visitRow(row))

    // Unassigned always at bottom
    const unassigned = wbsSummaryRows.find(r => r.wbsId === 'unassigned')
    if (unassigned) {
      result.push(unassigned)
      if (expanded.has('unassigned')) {
        unassigned.tasks.forEach((t, ti) => {
          result.push({ kind: 'task', task: t, wbsId: 'unassigned', colorIdx: -1, rowNum: `U.${ti + 1}`, start: parseDate(t.start), end: parseDate(t.end) })
        })
      }
    }
    return result
  }, [wbsSummaryRows, expanded])

  // ── Timeline bounds ───────────────────────────────────────────────────────

  const { timelineStart, totalDays } = useMemo(() => {
    const allTasks = [...wbsRows.flatMap(r => r.tasks), ...unassignedTasks]
    const allDates: Date[] = [
      ...allTasks.flatMap(t => [parseDate(t.start), parseDate(t.end)]),
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
  }, [wbsRows, unassignedTasks, milestones])

  // Auto-scale: ensure timeline always fills the container — prevents tiny chart in Quarter/Month views
  const pxPerDay = useMemo(() => {
    const base = PX_PER_DAY[viewMode]
    if (totalDays <= 0 || containerWidth <= 0) return base
    return Math.max(base, containerWidth / totalDays)
  }, [viewMode, totalDays, containerWidth])

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

  // ── Milestone drag state ──────────────────────────────────────────────────

  const [milestoneOverride, setMilestoneOverride] = useState<Map<number, Date>>(new Map())

  // ── Milestone marker positions ────────────────────────────────────────────

  const markerPositions = useMemo(() =>
    milestones
      .filter(m => m.date && /^\d{4}-\d{2}-\d{2}/.test(m.date!))
      .map(m => {
        const effectiveDate = milestoneOverride.get(m.id) ?? parseDate(m.date!)
        return { ...m, x: daysBetween(timelineStart, effectiveDate) * pxPerDay, effectiveDate }
      })
      .filter(m => m.x >= 0),
  [milestones, timelineStart, pxPerDay, milestoneOverride])

  // ── Drag-to-reschedule ────────────────────────────────────────────────────

  const dragRef = useRef<{
    taskId: string; origStart: Date; origEnd: Date
    startX: number; pxPerDay: number; curStart: Date; curEnd: Date
    side: 'move' | 'left' | 'right'
    wbsChildOriginals?: Array<{ taskId: string; origStart: Date; origEnd: Date }>
  } | null>(null)

  function onBarMouseDown(
    e: React.MouseEvent,
    taskId: string,
    start: Date,
    end: Date,
    wbsChildOriginals?: Array<{ taskId: string; origStart: Date; origEnd: Date }>
  ) {
    e.preventDefault()
    dragRef.current = {
      taskId,
      origStart: start,
      origEnd: end,
      startX: e.clientX,
      pxPerDay,
      curStart: start,
      curEnd: end,
      side: 'move',
      wbsChildOriginals
    }
  }

  function onEdgeMouseDown(
    e: React.MouseEvent,
    taskId: string,
    start: Date,
    end: Date,
    side: 'left' | 'right',
    wbsChildOriginals?: Array<{ taskId: string; origStart: Date; origEnd: Date }>
  ) {
    e.preventDefault()
    e.stopPropagation()  // prevent whole-bar drag from also firing
    dragRef.current = {
      taskId,
      origStart: start,
      origEnd: end,
      startX: e.clientX,
      pxPerDay,
      curStart: start,
      curEnd: end,
      side,
      wbsChildOriginals
    }
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return
      const delta = Math.round((e.clientX - dragRef.current.startX) / dragRef.current.pxPerDay)
      const { side, origStart, origEnd, taskId, wbsChildOriginals } = dragRef.current
      let ns: Date, ne: Date

      if (side === 'left') {
        const result = computeEdgeDrag('left', fmtISO(origStart), fmtISO(origEnd), delta)
        ns = parseDate(result.start)
        ne = parseDate(result.end)
      } else if (side === 'right') {
        const result = computeEdgeDrag('right', fmtISO(origStart), fmtISO(origEnd), delta)
        ns = parseDate(result.start)
        ne = parseDate(result.end)
      } else {
        // side === 'move' — shift both by delta
        ns = addDays(origStart, delta)
        ne = addDays(origEnd, delta)
      }

      dragRef.current.curStart = ns
      dragRef.current.curEnd = ne
      setDragOverride(prev => new Map(prev).set(taskId, { start: ns, end: ne }))

      // For WBS summary drag: update all child task overrides too
      if (wbsChildOriginals && wbsChildOriginals.length > 0) {
        setDragOverride(prev => {
          const m = new Map(prev)
          wbsChildOriginals.forEach(child => {
            if (side === 'move') {
              m.set(child.taskId, {
                start: addDays(child.origStart, delta),
                end: addDays(child.origEnd, delta)
              })
            }
            // For edge drag on WBS summary, we also shift children by delta
            // (dragging WBS edge = move all children together)
            else {
              m.set(child.taskId, {
                start: addDays(child.origStart, delta),
                end: addDays(child.origEnd, delta)
              })
            }
          })
          return m
        })
      }
    }
    async function onUp() {
      if (!dragRef.current) return
      const { taskId, origStart, origEnd, curStart, curEnd, side, wbsChildOriginals } = dragRef.current
      dragRef.current = null

      // WBS summary drag: patch all children
      if (wbsChildOriginals && wbsChildOriginals.length > 0) {
        const delta = daysBetween(origStart, curStart)
        if (delta === 0) {
          wbsChildOriginals.forEach(c => {
            setDragOverride(prev => {
              const m = new Map(prev)
              m.delete(c.taskId)
              return m
            })
          })
          return
        }
        try {
          await Promise.all(wbsChildOriginals.map(async (c) => {
            const ns = addDays(c.origStart, delta)
            const ne = addDays(c.origEnd, delta)
            const res = await fetch(`/api/tasks/${c.taskId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ start_date: fmtISO(ns), due: fmtISO(ne) }),
            })
            if (!res.ok) throw new Error()
          }))
        } catch {
          wbsChildOriginals.forEach(c => {
            setDragOverride(prev => {
              const m = new Map(prev)
              m.delete(c.taskId)
              return m
            })
          })
          toast.error('Failed to save new dates')
        }
        return
      }

      // Single task drag — check if anything changed
      const startChanged = fmtISO(curStart) !== fmtISO(origStart)
      const endChanged = fmtISO(curEnd) !== fmtISO(origEnd)
      if (!startChanged && !endChanged) {
        setDragOverride(prev => { const m = new Map(prev); m.delete(taskId); return m })
        return
      }

      // Build PATCH body based on side
      const body: Record<string, string> = {}
      if (side === 'left' || side === 'move') body.start_date = fmtISO(curStart)
      if (side === 'right' || side === 'move') body.due = fmtISO(curEnd)

      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
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

  // ── Milestone drag ────────────────────────────────────────────────────────

  const milestoneDragRef = useRef<{
    milestoneId: number; origDate: Date; startX: number; pxPerDay: number; curDate: Date
  } | null>(null)

  useEffect(() => {
    function onMsMove(e: MouseEvent) {
      if (!milestoneDragRef.current) return
      const delta = Math.round((e.clientX - milestoneDragRef.current.startX) / milestoneDragRef.current.pxPerDay)
      const nd = addDays(milestoneDragRef.current.origDate, delta)
      milestoneDragRef.current.curDate = nd
      setMilestoneOverride(prev => new Map(prev).set(milestoneDragRef.current!.milestoneId, nd))
    }
    async function onMsUp() {
      if (!milestoneDragRef.current) return
      const { milestoneId, origDate, curDate } = milestoneDragRef.current
      milestoneDragRef.current = null
      if (fmtISO(curDate) === fmtISO(origDate)) {
        setMilestoneOverride(prev => { const m = new Map(prev); m.delete(milestoneId); return m })
        return
      }
      try {
        const res = await fetch(`/api/milestones/${milestoneId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: fmtISO(curDate) }),
        })
        if (!res.ok) throw new Error()
      } catch {
        setMilestoneOverride(prev => { const m = new Map(prev); m.delete(milestoneId); return m })
        toast.error('Failed to save milestone date')
      }
    }
    window.addEventListener('mousemove', onMsMove)
    window.addEventListener('mouseup', onMsUp)
    return () => { window.removeEventListener('mousemove', onMsMove); window.removeEventListener('mouseup', onMsUp) }
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

  // Observe right panel width so pxPerDay auto-scales to fill it
  useEffect(() => {
    const el = rightRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Left panel resize drag ────────────────────────────────────────────────

  const resizeRef = useRef<{ startX: number; startW: number } | null>(null)

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!resizeRef.current) return
      const delta = e.clientX - resizeRef.current.startX
      setLeftWidth(Math.max(200, Math.min(600, resizeRef.current.startW + delta)))
    }
    function onUp() { resizeRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  // ── Empty state ───────────────────────────────────────────────────────────

  const totalTaskCount = wbsRows.reduce((sum, r) => sum + r.tasks.length, 0) + unassignedTasks.length
  if (totalTaskCount === 0 && wbsRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-zinc-400 text-sm gap-1">
        <span>No tasks with dates to display.</span>
        <span className="text-xs">Add start or due dates to tasks to see them here.</span>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const allTaskCount = wbsRows.reduce((sum, r) => sum + r.tasks.length, 0) + unassignedTasks.length

  return (
    <div className="flex flex-col border border-zinc-200 rounded-lg overflow-hidden bg-white select-none">

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-zinc-50 shrink-0">
        <span className="text-xs text-zinc-500">{allTaskCount} tasks · {wbsRows.length} phases · {milestones.length} milestones</span>

        {/* Save Baseline + Compare */}
        <div className="flex items-center gap-2">
          {saveMode ? (
            <>
              <input
                autoFocus
                type="text"
                placeholder="Baseline name…"
                value={baselineName}
                onChange={e => setBaselineName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveBaseline(); if (e.key === 'Escape') { setSaveMode(false); setBaselineName('') } }}
                className="text-xs border border-zinc-300 rounded px-2 py-1 w-40 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                disabled={savingBaseline}
              />
              <button onClick={handleSaveBaseline} disabled={savingBaseline || !baselineName.trim()}
                className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-40">
                {savingBaseline ? '…' : 'Save'}
              </button>
              <button onClick={() => { setSaveMode(false); setBaselineName('') }}
                className="text-xs px-2 py-1 border border-zinc-200 rounded hover:bg-zinc-50 text-zinc-600">
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setSaveMode(true)}
              className="text-xs px-2 py-1 border border-zinc-200 rounded hover:bg-zinc-50 text-zinc-600">
              Save Baseline
            </button>
          )}

          {baselines.length > 0 && (
            <select
              value={activeBaselineId ?? ''}
              onChange={e => handleSelectBaseline(e.target.value === '' ? null : Number(e.target.value))}
              className="text-xs border border-zinc-200 rounded px-2 py-1 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-400">
              <option value="">Compare: None</option>
              {baselines.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
        </div>

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
          style={{ width: leftWidth }}>

          {/* Left header */}
          <div className="flex items-center shrink-0 border-b border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-500"
            style={{ height: HEADER_H, position: 'sticky', top: 0, zIndex: 10 }}>
            <div className="w-7 pl-2 shrink-0" />
            <div className="flex-1 pl-1 truncate">Project plan</div>
            {/* Drag this grip to resize the Project plan column */}
            <div className="shrink-0 w-3 self-stretch cursor-col-resize flex items-center justify-center group/grip hover:bg-indigo-50"
              onMouseDown={e => { e.preventDefault(); resizeRef.current = { startX: e.clientX, startW: leftWidth } }}>
              <div className="w-0.5 h-5 rounded-full bg-zinc-300 group-hover/grip:bg-indigo-400 transition-colors" />
            </div>
            <div className="w-[52px] text-right shrink-0 pr-1">Start</div>
            <div className="w-[52px] text-right shrink-0 pr-1">Due</div>
            <div className="w-10 text-right shrink-0 pr-3">Dur.</div>
            {activeBaselineSnapshot && (
              <div className="w-14 text-right shrink-0 pr-3 text-zinc-500">Var.</div>
            )}
          </div>

          {/* Left rows */}
          {rows.map((row, i) => {
            if (row.kind === 'section-header') {
              return (
                <div key={`lsec-${row.label}-${i}`}
                  className="flex items-center shrink-0 border-b border-zinc-300 bg-zinc-100 px-3 gap-2"
                  style={{ height: ROW_H }}>
                  <div className="h-px flex-1 bg-zinc-300" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 shrink-0">{row.label}</span>
                  <div className="h-px flex-1 bg-zinc-300" />
                  {activeBaselineSnapshot && <div className="w-14 shrink-0" />}
                </div>
              )
            }

            const color = row.colorIdx === -1 ? UNASSIGNED_COLOR : COLORS[row.colorIdx]

            if (row.kind === 'wbs') {
              const isExp = expanded.has(String(row.wbsId))
              return (
                <div key={`lwbs-${row.wbsId}-${i}`}
                  className="flex items-center shrink-0 border-b border-zinc-100 cursor-pointer hover:bg-zinc-100/60 font-medium"
                  style={{ height: ROW_H, background: '#f9f9f9' }}
                  onClick={() => setExpanded(p => { const n = new Set(p); isExp ? n.delete(String(row.wbsId)) : n.add(String(row.wbsId)); return n })}>
                  <div className="flex items-center min-w-0 flex-1" style={{ paddingLeft: 8 + (row.level - 1) * 20 }}>
                    <div className="w-5 shrink-0 text-base" style={{ color: color.bar }}>
                      {(row.hasChildren || row.tasks.length > 0) ? (isExp ? '▾' : '▸') : <span className="text-zinc-300">–</span>}
                    </div>
                    <div
                      className={`flex-1 pl-1 pr-1 truncate text-sm ${row.level === 1 ? 'font-semibold' : 'font-normal'}`}
                      style={{ color: row.level === 1 ? color.text : '#111827' }}
                      onMouseEnter={e => { const r = e.currentTarget.getBoundingClientRect(); setLabelTip({ text: row.label, x: r.left, y: r.bottom + 6 }) }}
                      onMouseLeave={() => setLabelTip(null)}>
                      {row.label}
                    </div>
                  </div>
                  <div className="w-[52px] text-right shrink-0 pr-1 text-xs text-zinc-400">
                    {row.spanStart ? fmtShort(row.spanStart) : '—'}
                  </div>
                  <div className="w-[52px] text-right shrink-0 pr-1 text-xs text-zinc-400">
                    {row.spanEnd ? fmtShort(row.spanEnd) : '—'}
                  </div>
                  <div className="w-10 text-right shrink-0 pr-3 text-xs text-zinc-400">
                    {row.spanStart && row.spanEnd ? fmtDuration(row.spanStart, row.spanEnd) : '—'}
                  </div>
                  {activeBaselineSnapshot && (() => {
                    const baselineEnds = row.tasks
                      .map(t => activeBaselineSnapshot[t.id]?.end)
                      .filter((e): e is string => Boolean(e))
                      .map(e => parseDate(e))
                    const baselineSpanEnd = baselineEnds.length
                      ? new Date(Math.max(...baselineEnds.map(d => d.getTime())))
                      : null
                    const varianceDays = baselineSpanEnd && row.spanEnd
                      ? daysBetween(baselineSpanEnd, row.spanEnd)
                      : null
                    return (
                      <div className={`w-14 text-right shrink-0 pr-3 text-xs font-medium ${
                        varianceDays === null ? 'text-zinc-300'
                        : varianceDays > 0 ? 'text-red-500'
                        : varianceDays < 0 ? 'text-green-600'
                        : 'text-zinc-400'
                      }`}>
                        {varianceDays === null ? '—' : varianceDays > 0 ? `+${varianceDays}d` : `${varianceDays}d`}
                      </div>
                    )
                  })()}
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
                <div className="flex-1 pl-2 pr-1 truncate text-xs text-zinc-700" title={row.task.name}>{row.task.name}</div>
                <div className="w-[52px] shrink-0 flex items-center justify-end">
                  <DatePickerCell
                    value={fmtISO(start)}
                    onSave={async (v) => {
                      await fetch(`/api/tasks/${row.task.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ start_date: v }),
                      })
                      if (v) setDragOverride(prev => new Map(prev).set(row.task.id, { start: parseDate(v), end }))
                    }}
                  />
                </div>
                <div className="w-[52px] shrink-0 flex items-center justify-end">
                  <DatePickerCell
                    value={fmtISO(end)}
                    onSave={async (v) => {
                      await fetch(`/api/tasks/${row.task.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ due: v }),
                      })
                      if (v) setDragOverride(prev => new Map(prev).set(row.task.id, { start, end: parseDate(v) }))
                    }}
                  />
                </div>
                <div className="w-10 text-right shrink-0 pr-3 text-xs text-zinc-400">{fmtDuration(start, end)}</div>
                {activeBaselineSnapshot && (() => {
                  const entry = activeBaselineSnapshot[row.task.id]
                  const baselineEnd = entry ? parseDate(entry.end) : null
                  const varianceDays = baselineEnd ? daysBetween(baselineEnd, end) : null
                  return (
                    <div className={`w-14 text-right shrink-0 pr-3 text-xs font-medium ${
                      varianceDays === null ? 'text-zinc-300'
                      : varianceDays > 0 ? 'text-red-500'
                      : varianceDays < 0 ? 'text-green-600'
                      : 'text-zinc-400'
                    }`}>
                      {varianceDays === null ? '—' : varianceDays > 0 ? `+${varianceDays}d` : `${varianceDays}d`}
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>

        {/* ── Right panel ── */}
        <div ref={rightRef} onScroll={syncFromRight}
          className="flex-1 overflow-auto relative">
          <div key={viewMode} style={{ width: Math.max(totalWidth, 800), minHeight: '100%', position: 'relative' }}>

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
                const nearby = markerPositions.slice(0, mi).filter(p => Math.abs(p.x - m.x) < 120).length
                return (
                  <div key={`mk-${m.id}`} className="absolute top-0 bottom-0 pointer-events-none z-10"
                    style={{ left: m.x }}>
                    <div
                      className="absolute top-0 bottom-0 pointer-events-auto cursor-ew-resize"
                      style={{ left: 0, width: 8, borderLeft: '1.5px dashed #6366f1', opacity: 0.5 }}
                      onMouseDown={e => {
                        e.preventDefault()
                        milestoneDragRef.current = {
                          milestoneId: m.id,
                          origDate: m.effectiveDate,
                          startX: e.clientX,
                          pxPerDay,
                          curDate: m.effectiveDate
                        }
                      }}
                    />
                    <div className="pointer-events-auto absolute cursor-pointer rounded px-1"
                      style={{ top: 4 + nearby * 24, left: 3, fontSize: 10, color: '#6366f1', background: 'rgba(99,102,241,0.08)', whiteSpace: 'nowrap', zIndex: 11 }}
                      onClick={() => setPopup({ name: m.name, date: m.date!, status: m.status })}>
                      {m.name}
                    </div>
                  </div>
                )
              })}

              {/* Data rows */}
              {rows.map((row, i) => {
                if (row.kind === 'section-header') {
                  return (
                    <div key={`rsec-${row.label}-${i}`} className="relative border-b border-zinc-300 bg-zinc-100"
                      style={{ height: ROW_H }} />
                  )
                }

                const color = row.colorIdx === -1 ? UNASSIGNED_COLOR : COLORS[row.colorIdx]

                if (row.kind === 'wbs') {
                  // WBS summary row with placeholder or span bar
                  if (row.spanStart === null || row.spanEnd === null) {
                    // Placeholder bar for empty WBS rows
                    const placeholderStart = addDays(timelineStart, 7)
                    const placeholderEnd = addDays(placeholderStart, 28)
                    const left  = barLeft(placeholderStart)
                    const width = barWidth(placeholderStart, placeholderEnd)
                    return (
                      <div key={`rwbs-${row.wbsId}-${i}`} className="relative border-b border-zinc-100"
                        style={{ height: ROW_H, background: '#fafafa' }}>
                        <div className="absolute rounded pointer-events-none"
                          style={{ left, width, top: '50%', transform: 'translateY(-50%)', height: 8, background: color.bar, opacity: 0.3, border: '1px dashed rgba(0,0,0,0.2)' }} />
                      </div>
                    )
                  } else {
                    // Span bar showing actual task range (draggable with edge handles)
                    const left  = barLeft(row.spanStart)
                    const width = barWidth(row.spanStart, row.spanEnd)
                    const childOriginals = row.tasks
                      .filter(t => t.start && t.end)
                      .map(t => ({ taskId: t.id, origStart: parseDate(t.start), origEnd: parseDate(t.end) }))
                    // Ghost WBS span bar
                    const ghostWbsBar = (() => {
                      if (!activeBaselineSnapshot) return null
                      const baselineStarts = row.tasks
                        .map(t => activeBaselineSnapshot[t.id]?.start)
                        .filter((s): s is string => Boolean(s))
                        .map(s => parseDate(s))
                      const baselineEnds = row.tasks
                        .map(t => activeBaselineSnapshot[t.id]?.end)
                        .filter((e): e is string => Boolean(e))
                        .map(e => parseDate(e))
                      if (!baselineStarts.length || !baselineEnds.length) return null
                      const ghostStart = new Date(Math.min(...baselineStarts.map(d => d.getTime())))
                      const ghostEnd = new Date(Math.max(...baselineEnds.map(d => d.getTime())))
                      return (
                        <div
                          className="absolute rounded pointer-events-none"
                          style={{
                            left: barLeft(ghostStart),
                            width: barWidth(ghostStart, ghostEnd),
                            top: '50%',
                            transform: 'translateY(-50%)',
                            height: 8,
                            background: color.bar,
                            opacity: 0.3,
                            zIndex: 3,
                          }}
                        />
                      )
                    })()
                    return (
                      <div key={`rwbs-${row.wbsId}-${i}`} className="relative border-b border-zinc-100"
                        style={{ height: ROW_H, background: '#fafafa' }}>
                        {ghostWbsBar}
                        <div
                          className="absolute rounded flex items-center cursor-grab"
                          style={{ left, width, top: '50%', transform: 'translateY(-50%)', height: 8, background: color.bar, opacity: 0.25, zIndex: 5 }}
                          onMouseDown={e => onBarMouseDown(e, `wbs-${row.wbsId}`, row.spanStart!, row.spanEnd!, childOriginals)}>
                          {/* Left edge handle */}
                          <div
                            className="absolute top-0 bottom-0 w-1.5 rounded-l cursor-ew-resize hover:bg-black/20 z-20"
                            style={{ left: 0 }}
                            onMouseDown={e => onEdgeMouseDown(e, `wbs-${row.wbsId}`, row.spanStart!, row.spanEnd!, 'left', childOriginals)}
                          />
                          {/* Right edge handle */}
                          <div
                            className="absolute top-0 bottom-0 w-1.5 rounded-r cursor-ew-resize hover:bg-black/20 z-20"
                            style={{ right: 0 }}
                            onMouseDown={e => onEdgeMouseDown(e, `wbs-${row.wbsId}`, row.spanStart!, row.spanEnd!, 'right', childOriginals)}
                          />
                        </div>
                      </div>
                    )
                  }
                }

                // task row
                const { start, end } = resolvedDates(row.task)
                const left  = barLeft(start)
                const width = barWidth(start, end)
                const isDragging = dragOverride.has(row.task.id)
                const isUndated = row.task.custom_class?.includes('gantt-undated') ?? false

                return (
                  <div key={`rt-${row.task.id}-${i}`} className="relative border-b border-zinc-100 hover:bg-zinc-50/30"
                    style={{ height: ROW_H }}>
                    {/* Ghost bar — only when baseline active and this task has a baseline entry */}
                    {(() => {
                      if (!activeBaselineSnapshot) return null
                      const entry = activeBaselineSnapshot[row.task.id]
                      if (!entry) return null
                      const ghostStart = parseDate(entry.start)
                      const ghostEnd = parseDate(entry.end)
                      return (
                        <div
                          className="absolute rounded pointer-events-none"
                          style={{
                            left: barLeft(ghostStart),
                            width: barWidth(ghostStart, ghostEnd),
                            top: '50%',
                            transform: 'translateY(-50%)',
                            height: ROW_H - 10,
                            background: color.bar,
                            opacity: 0.3,
                            zIndex: 3,
                          }}
                        />
                      )
                    })()}
                    <div
                      className="absolute rounded flex items-center px-2 overflow-hidden"
                      style={{
                        left,
                        width,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        height: ROW_H - 10,
                        background: isUndated ? 'transparent' : color.bar,
                        border: isUndated ? `2px dashed ${color.bar}` : 'none',
                        color: isUndated ? color.bar : '#fff',
                        fontSize: 11,
                        fontWeight: 500,
                        opacity: isUndated ? 0.6 : 1,
                        cursor: isDragging ? 'grabbing' : 'grab',
                        boxShadow: isDragging ? '0 4px 14px rgba(0,0,0,0.18)' : isUndated ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
                        userSelect: 'none',
                        zIndex: isDragging ? 30 : 5,
                      }}
                      onMouseDown={e => onBarMouseDown(e, row.task.id, parseDate(row.task.start), parseDate(row.task.end))}>
                      {/* Left edge handle */}
                      <div
                        className="absolute top-0 bottom-0 w-1.5 rounded-l cursor-ew-resize hover:bg-black/20 z-20"
                        style={{ left: 0 }}
                        onMouseDown={e => onEdgeMouseDown(e, row.task.id, parseDate(row.task.start), parseDate(row.task.end), 'left')}
                      />
                      <span className="truncate">{row.task.name}</span>
                      {/* Right edge handle */}
                      <div
                        className="absolute top-0 bottom-0 w-1.5 rounded-r cursor-ew-resize hover:bg-black/20 z-20"
                        style={{ right: 0 }}
                        onMouseDown={e => onEdgeMouseDown(e, row.task.id, parseDate(row.task.start), parseDate(row.task.end), 'right')}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Full-name tooltip for truncated WBS labels */}
      {labelTip && (
        <div className="fixed z-50 bg-zinc-800 text-white text-xs rounded px-2.5 py-1.5 shadow-lg max-w-xs pointer-events-none"
          style={{ left: labelTip.x, top: labelTip.y }}>
          {labelTip.text}
        </div>
      )}

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
