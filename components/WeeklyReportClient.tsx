'use client'

import { useEffect, useState, useRef, useCallback, MouseEvent as ReactMouseEvent } from 'react'

const COL_LABELS = [
  'Project Name', 'Type', 'Owner', 'Health',
  'Progress & Next Steps', 'Risks',
  'Start Date', 'Go-Live',
  'Budget (hrs)', 'Consumed', 'Progress', 'Budget %', 'ARR',
] as const

const COL_DEFAULTS = [180, 110, 120, 80, 340, 220, 96, 110, 100, 100, 88, 88, 96]
const COL_ALIGN = ['left','left','left','left','left','left','left','left','right','right','right','right','right'] as const

interface ReportRow {
  id: number
  name: string
  customer: string
  project_type: string
  owner: string
  health: string
  progress_pct: number | null
  notes: string
  open_risks: number
  high_risks: number
  risk_summary: string
  start_date: string
  go_live_target: string
  budgeted_hours: number | null
  hours_consumed: number
  arr: string
}

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function weekLabel(iso: string): string {
  // iso = '2026-W18' → compute Mon–Sun range
  const [yearStr, wStr] = iso.split('-W')
  const year = parseInt(yearStr), week = parseInt(wStr)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const day1 = jan4.getUTCDay() || 7
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - day1 + 1 + (week - 1) * 7)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${fmt(monday)} – ${fmt(sunday)}, ${year}`
}

const HEALTH_STYLES: Record<string, string> = {
  green:  'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red:    'bg-red-100 text-red-800',
}

export function WeeklyReportClient() {
  const [week, setWeek] = useState(() => isoWeek(new Date()))
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [editingMeta, setEditingMeta] = useState<Record<number, boolean>>({})
  const [metaDraft, setMetaDraft] = useState<Record<number, { project_type: string; budgeted_hours: string; arr: string }>>({})
  const noteTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  const [colWidths, setColWidths] = useState<number[]>([...COL_DEFAULTS])
  const resizingCol = useRef<{ index: number; startX: number; startWidth: number } | null>(null)

  const startResize = (e: ReactMouseEvent, colIndex: number) => {
    e.preventDefault()
    resizingCol.current = { index: colIndex, startX: e.clientX, startWidth: colWidths[colIndex] }
    const onMove = (ev: MouseEvent) => {
      if (!resizingCol.current) return
      const delta = ev.clientX - resizingCol.current.startX
      const newWidth = Math.max(50, resizingCol.current.startWidth + delta)
      setColWidths(prev => prev.map((w, i) => i === resizingCol.current!.index ? newWidth : w))
    }
    const onUp = () => {
      resizingCol.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const load = useCallback(async (w: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/weekly-report?week=${w}`)
      if (res.ok) {
        const data = await res.json()
        setRows(data.rows)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(week) }, [week, load])

  // Debounced note save
  const handleNoteChange = (projectId: number, notes: string) => {
    setRows(prev => prev.map(r => r.id === projectId ? { ...r, notes } : r))
    clearTimeout(noteTimers.current[projectId])
    noteTimers.current[projectId] = setTimeout(async () => {
      setSaving(prev => ({ ...prev, [projectId]: true }))
      await fetch('/api/weekly-report/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, week_of: week, notes }),
      })
      setSaving(prev => ({ ...prev, [projectId]: false }))
    }, 800)
  }

  const saveMeta = async (projectId: number) => {
    const draft = metaDraft[projectId]
    if (!draft) return
    setSaving(prev => ({ ...prev, [projectId]: true }))
    await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_type: draft.project_type || null,
        budgeted_hours: draft.budgeted_hours ? parseFloat(draft.budgeted_hours) : null,
        arr: draft.arr || null,
      }),
    })
    setRows(prev => prev.map(r => r.id === projectId ? {
      ...r,
      project_type: draft.project_type,
      budgeted_hours: draft.budgeted_hours ? parseFloat(draft.budgeted_hours) : null,
      arr: draft.arr,
    } : r))
    setEditingMeta(prev => ({ ...prev, [projectId]: false }))
    setSaving(prev => ({ ...prev, [projectId]: false }))
  }

  const startEditMeta = (row: ReportRow) => {
    setMetaDraft(prev => ({
      ...prev,
      [row.id]: {
        project_type: row.project_type,
        budgeted_hours: row.budgeted_hours != null ? String(row.budgeted_hours) : '',
        arr: row.arr,
      }
    }))
    setEditingMeta(prev => ({ ...prev, [row.id]: true }))
  }

  const handleExport = () => {
    window.location.href = `/api/weekly-report/export?week=${week}`
  }

  const prevWeek = () => {
    const [yearStr, wStr] = week.split('-W')
    const year = parseInt(yearStr), w = parseInt(wStr)
    if (w === 1) setWeek(`${year - 1}-W52`)
    else setWeek(`${year}-W${String(w - 1).padStart(2, '0')}`)
  }

  const nextWeek = () => {
    const [yearStr, wStr] = week.split('-W')
    const year = parseInt(yearStr), w = parseInt(wStr)
    if (w === 52) setWeek(`${year + 1}-W01`)
    else setWeek(`${year}-W${String(w + 1).padStart(2, '0')}`)
  }

  return (
    <div className="space-y-4 pb-10">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 pt-2">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Weekly Status Report</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{weekLabel(week)}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Week navigator */}
          <div className="flex items-center gap-1 border border-zinc-200 rounded-lg overflow-hidden text-sm">
            <button onClick={prevWeek} className="px-2 py-1.5 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 transition-colors">‹</button>
            <span className="px-3 py-1.5 font-mono text-xs text-zinc-700 border-x border-zinc-200">{week}</span>
            <button onClick={nextWeek} className="px-2 py-1.5 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 transition-colors">›</button>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
            </svg>
            Export Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="px-6 overflow-x-auto">
        <table
          className="text-sm border-collapse"
          style={{ tableLayout: 'fixed', width: colWidths.reduce((a, b) => a + b, 0) }}
        >
          <colgroup>
            {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
          </colgroup>
          <thead>
            <tr className="bg-zinc-800 text-white text-xs select-none">
              {COL_LABELS.map((label, i) => (
                <th
                  key={label}
                  className={`${COL_ALIGN[i] === 'right' ? 'text-right' : 'text-left'} py-2.5 font-semibold overflow-hidden whitespace-nowrap`}
                  style={{ paddingLeft: 12, paddingRight: 20, position: 'relative' }}
                >
                  {label}
                  {/* Drag handle on right edge */}
                  <span
                    onMouseDown={e => startResize(e, i)}
                    style={{
                      position: 'absolute', right: 0, top: 0, bottom: 0, width: 8,
                      cursor: 'col-resize', userSelect: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <span style={{ width: 2, height: '60%', background: 'rgba(255,255,255,0.25)', borderRadius: 1 }} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-zinc-100">
                  {Array.from({ length: 13 }).map((_, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-3 bg-zinc-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-3 py-8 text-center text-zinc-400 text-sm">No active projects found.</td>
              </tr>
            ) : rows.map((row, i) => {
              const budgetPct = row.budgeted_hours && row.hours_consumed
                ? Math.round((row.hours_consumed / row.budgeted_hours) * 100)
                : null
              const healthKey = (row.health ?? '').toLowerCase()
              const isEditingMeta = editingMeta[row.id]
              const draft = metaDraft[row.id]

              return (
                <tr
                  key={row.id}
                  className={`border-b border-zinc-100 align-top ${i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'} hover:bg-blue-50/30 transition-colors`}
                >
                  {/* Project name */}
                  <td className="px-3 py-2.5">
                    <a href={`/customer/${row.id}/overview`} className="font-medium text-zinc-900 hover:text-blue-600 hover:underline text-xs leading-snug block">
                      {row.customer || row.name}
                    </a>
                  </td>

                  {/* Type */}
                  <td className="px-3 py-2.5 text-xs text-zinc-600">
                    {isEditingMeta ? (
                      <input
                        className="w-full text-xs border border-zinc-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        value={draft?.project_type ?? ''}
                        onChange={e => setMetaDraft(prev => ({ ...prev, [row.id]: { ...prev[row.id], project_type: e.target.value } }))}
                        placeholder="Type…"
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:underline text-zinc-600"
                        onClick={() => startEditMeta(row)}
                        title="Click to edit"
                      >
                        {row.project_type || <span className="text-zinc-300 italic">—</span>}
                      </span>
                    )}
                  </td>

                  {/* Owner */}
                  <td className="px-3 py-2.5 text-xs text-zinc-600 whitespace-nowrap">{row.owner || '—'}</td>

                  {/* Health */}
                  <td className="px-3 py-2.5">
                    {row.health ? (
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize ${HEALTH_STYLES[healthKey] ?? 'bg-zinc-100 text-zinc-600'}`}>
                        {row.health}
                      </span>
                    ) : <span className="text-zinc-300 text-xs">—</span>}
                  </td>

                  {/* Notes — editable */}
                  <td className="px-3 py-2 relative">
                    <textarea
                      rows={4}
                      value={row.notes}
                      onChange={e => handleNoteChange(row.id, e.target.value)}
                      placeholder="Add progress & next steps…"
                      className="w-full text-xs border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-colors bg-transparent"
                      style={{ resize: 'vertical', minHeight: 72 }}
                    />
                    {saving[row.id] && (
                      <span className="absolute bottom-3 right-4 text-[10px] text-zinc-400">saving…</span>
                    )}
                  </td>

                  {/* Risks */}
                  <td className="px-3 py-2.5 text-xs text-zinc-600">
                    {row.open_risks > 0 ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-medium ${row.high_risks > 0 ? 'text-red-600' : 'text-zinc-700'}`}>
                            {row.open_risks} open{row.high_risks > 0 ? ` (${row.high_risks} high)` : ''}
                          </span>
                        </div>
                        {row.risk_summary && (
                          <p className="text-zinc-500 text-[11px] leading-snug line-clamp-3">{row.risk_summary}</p>
                        )}
                      </div>
                    ) : <span className="text-zinc-300">—</span>}
                  </td>

                  {/* Start Date */}
                  <td className="px-3 py-2.5 text-xs text-zinc-600 whitespace-nowrap">{row.start_date || '—'}</td>

                  {/* Go-Live */}
                  <td className="px-3 py-2.5 text-xs text-zinc-600 whitespace-nowrap">{row.go_live_target || '—'}</td>

                  {/* Budgeted hours */}
                  <td className="px-3 py-2.5 text-xs text-right text-zinc-600">
                    {isEditingMeta ? (
                      <input
                        type="number"
                        className="w-20 text-xs border border-zinc-300 rounded px-1.5 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                        value={draft?.budgeted_hours ?? ''}
                        onChange={e => setMetaDraft(prev => ({ ...prev, [row.id]: { ...prev[row.id], budgeted_hours: e.target.value } }))}
                        placeholder="0"
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:underline"
                        onClick={() => startEditMeta(row)}
                        title="Click to edit"
                      >
                        {row.budgeted_hours != null ? `${row.budgeted_hours}h` : <span className="text-zinc-300 italic">—</span>}
                      </span>
                    )}
                  </td>

                  {/* Hours consumed */}
                  <td className="px-3 py-2.5 text-xs text-right text-zinc-600">
                    {row.hours_consumed > 0 ? `${Math.round(row.hours_consumed)}h` : '—'}
                  </td>

                  {/* Progress % */}
                  <td className="px-3 py-2.5 text-xs text-right">
                    {row.progress_pct != null ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-medium text-zinc-700">{row.progress_pct}%</span>
                        <div className="w-16 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(row.progress_pct, 100)}%` }} />
                        </div>
                      </div>
                    ) : <span className="text-zinc-300">—</span>}
                  </td>

                  {/* Budget % */}
                  <td className="px-3 py-2.5 text-xs text-right">
                    {budgetPct != null ? (
                      <span className={`font-medium ${budgetPct > 100 ? 'text-red-600' : budgetPct > 80 ? 'text-yellow-600' : 'text-zinc-700'}`}>
                        {budgetPct}%
                      </span>
                    ) : <span className="text-zinc-300">—</span>}
                  </td>

                  {/* ARR */}
                  <td className="px-3 py-2.5 text-xs text-right text-zinc-600">
                    {isEditingMeta ? (
                      <input
                        className="w-24 text-xs border border-zinc-300 rounded px-1.5 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                        value={draft?.arr ?? ''}
                        onChange={e => setMetaDraft(prev => ({ ...prev, [row.id]: { ...prev[row.id], arr: e.target.value } }))}
                        placeholder="USD 0K"
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:underline"
                        onClick={() => startEditMeta(row)}
                        title="Click to edit"
                      >
                        {row.arr || <span className="text-zinc-300 italic">—</span>}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Save meta buttons — shown per row being edited */}
        {rows.some(r => editingMeta[r.id]) && (
          <div className="mt-3 flex gap-2 justify-end">
            <button
              onClick={() => {
                const editingId = rows.find(r => editingMeta[r.id])?.id
                if (editingId) setEditingMeta(prev => ({ ...prev, [editingId]: false }))
              }}
              className="text-sm px-3 py-1.5 border border-zinc-200 rounded-lg hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const editingId = rows.find(r => editingMeta[r.id])?.id
                if (editingId) saveMeta(editingId)
              }}
              className="text-sm px-3 py-1.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700"
            >
              Save
            </button>
          </div>
        )}
      </div>

      <p className="px-6 text-xs text-zinc-400">
        Click Type, Budget, or ARR cells to edit. Notes auto-save as you type.
      </p>
    </div>
  )
}
