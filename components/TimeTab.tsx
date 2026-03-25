'use client'

import { useState, useEffect } from 'react'
import { TimeEntryModal } from './TimeEntryModal'
import type { TimeEntry } from '@/db/schema'

interface TimeTabProps {
  projectId: number
}

function exportCSV(entries: TimeEntry[], projectName: string) {
  const header = 'date,hours,description,project name'
  const rows = entries.map((e) =>
    [e.date, e.hours, `"${e.description.replace(/"/g, '""')}"`, `"${projectName}"`].join(',')
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `time-log-${projectName}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Inline add form (not modal)
interface AddFormProps {
  projectId: number
  onSuccess: () => void
  onCancel: () => void
}

function AddTimeForm({ projectId, onSuccess, onCancel }: AddFormProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [hours, setHours] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, hours: String(hours), description }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to save entry')
        setSaving(false)
        return
      }

      onSuccess()
    } catch {
      setError('Network error — please try again')
      setSaving(false)
    }
  }

  return (
    <form
      data-testid="add-time-form"
      onSubmit={handleSubmit}
      className="border border-zinc-200 rounded-lg p-4 bg-zinc-50 space-y-3"
    >
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="border border-zinc-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700">Hours</label>
          <input
            type="number"
            step="0.25"
            min="0.25"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            required
            placeholder="1.5"
            className="border border-zinc-300 rounded px-2 py-1.5 text-sm w-24 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label className="text-xs font-medium text-zinc-700">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="What did you work on?"
            className="border border-zinc-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
        </div>
        <div className="flex gap-2 items-center">
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-1.5 bg-zinc-900 text-white text-sm rounded hover:bg-zinc-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm border border-zinc-300 rounded hover:bg-zinc-100"
          >
            Cancel
          </button>
        </div>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  )
}

export function TimeTab({ projectId }: TimeTabProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)

  // Analytics state
  const [weeklyRollup, setWeeklyRollup] = useState<{ weekLabel: string; hours: number; variance: number | null }[]>([])
  const [weeklyTarget, setWeeklyTarget] = useState<number | null>(null)
  const [totalHoursThisWeek, setTotalHoursThisWeek] = useState<number>(0)
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetInput, setTargetInput] = useState('')
  const [summaryExpanded, setSummaryExpanded] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (fromDate) params.set('from', fromDate)
    if (toDate) params.set('to', toDate)
    const query = params.toString() ? `?${params.toString()}` : ''

    fetch(`/api/projects/${projectId}/time-entries${query}`)
      .then((r) => (r.ok ? r.json() : { entries: [], projectName: '' }))
      .then((data) => {
        setEntries(data.entries ?? [])
        setProjectName(data.projectName ?? '')
      })
      .finally(() => setLoading(false))

    fetch(`/api/projects/${projectId}/analytics`)
      .then((r) => r.json())
      .then((data) => {
        setWeeklyRollup(data.weeklyRollup ?? [])
        setWeeklyTarget(data.weeklyTarget ?? null)
        setTotalHoursThisWeek(data.totalHoursThisWeek ?? 0)
      })
  }, [projectId, fromDate, toDate, refreshCount])

  async function handleSaveTarget() {
    const val = parseFloat(targetInput)
    if (!isNaN(val) && val > 0) {
      await fetch(`/api/projects/${projectId}/analytics`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekly_hour_target: val }),
      })
      setWeeklyTarget(val)
    }
    setEditingTarget(false)
  }

  const totalHours = entries.reduce((sum, e) => sum + parseFloat(e.hours), 0).toFixed(2)

  async function handleDelete(entryId: number) {
    await fetch(`/api/projects/${projectId}/time-entries/${entryId}`, {
      method: 'DELETE',
    })
    setRefreshCount((c) => c + 1)
  }

  function handleAddSuccess() {
    setShowAddForm(false)
    setRefreshCount((c) => c + 1)
  }

  return (
    <div data-testid="time-tab" className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <span
            data-testid="total-hours"
            className="text-sm font-semibold text-zinc-900"
          >
            {totalHours} hrs total
          </span>

          {/* Capacity planning: weekly target inline editor */}
          <span className="text-sm text-zinc-500">|</span>
          <span className="text-sm text-zinc-600">
            Target:{' '}
            {editingTarget ? (
              <input
                autoFocus
                type="number"
                step="0.5"
                min="0"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                onBlur={handleSaveTarget}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTarget()
                  if (e.key === 'Escape') setEditingTarget(false)
                }}
                className="border border-zinc-300 rounded px-2 py-0.5 text-sm w-16 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                data-testid="weekly-target"
              />
            ) : (
              <button
                onClick={() => { setEditingTarget(true); setTargetInput(String(weeklyTarget ?? '')) }}
                className="text-sm text-zinc-600 hover:underline cursor-pointer"
                data-testid="weekly-target"
              >
                {weeklyTarget != null ? `${weeklyTarget} hrs` : 'Set target'}
              </button>
            )}
          </span>
          {weeklyTarget != null && (
            <span className="text-sm text-zinc-500">
              This week: {totalHoursThisWeek.toFixed(1)} hrs
              {' '}
              <span className={totalHoursThisWeek >= weeklyTarget ? 'text-green-600' : 'text-zinc-400'}>
                ({totalHoursThisWeek >= weeklyTarget ? '+' : ''}{(totalHoursThisWeek - weeklyTarget).toFixed(1)})
              </span>
            </span>
          )}

          {/* Date range filter */}
          <div className="flex items-center gap-2 text-sm">
            <label className="text-xs text-zinc-500">From</label>
            <input
              data-testid="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-zinc-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
            <label className="text-xs text-zinc-500">To</label>
            <input
              data-testid="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-zinc-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
            {(fromDate || toDate) && (
              <button
                onClick={() => { setFromDate(''); setToDate('') }}
                className="text-xs text-zinc-400 hover:text-zinc-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            data-testid="export-csv"
            onClick={() => exportCSV(entries, projectName)}
            disabled={entries.length === 0}
            className="px-3 py-1.5 text-sm border border-zinc-300 rounded hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Export CSV
          </button>
          <button
            data-testid="log-time-btn"
            onClick={() => setShowAddForm((v) => !v)}
            className="px-3 py-1.5 text-sm bg-zinc-900 text-white rounded hover:bg-zinc-700"
          >
            {showAddForm ? 'Cancel' : '+ Log Time'}
          </button>
        </div>
      </div>

      {/* Inline add form */}
      {showAddForm && (
        <AddTimeForm
          projectId={projectId}
          onSuccess={handleAddSuccess}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Weekly Summary collapsible */}
      <div className="mb-6">
        <button
          className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-3"
          onClick={() => setSummaryExpanded((e) => !e)}
        >
          <span>{summaryExpanded ? '▾' : '▸'}</span>
          Weekly Summary
        </button>
        {summaryExpanded && (
          <div data-testid="weekly-summary">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-1.5 text-zinc-500 font-normal">Week</th>
                  <th className="text-right py-1.5 text-zinc-500 font-normal">Hours</th>
                  {weeklyTarget != null && (
                    <th className="text-right py-1.5 text-zinc-500 font-normal">vs Target</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {weeklyRollup.map((row, i) => (
                  <tr key={i} className="border-b border-zinc-100" data-testid="weekly-summary-row">
                    <td className="py-1.5 text-zinc-700">{row.weekLabel}</td>
                    <td className="py-1.5 text-right text-zinc-700">{row.hours.toFixed(1)}</td>
                    {weeklyTarget != null && (
                      <td className={`py-1.5 text-right text-xs ${row.variance != null && row.variance >= 0 ? 'text-green-600' : 'text-zinc-400'}`}>
                        {row.variance != null ? `${row.variance >= 0 ? '+' : ''}${row.variance.toFixed(1)}` : '—'}
                      </td>
                    )}
                  </tr>
                ))}
                {weeklyRollup.length === 0 && (
                  <tr>
                    <td colSpan={weeklyTarget != null ? 3 : 2} className="py-3 text-zinc-400 text-center">No time entries in the last 8 weeks</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-zinc-100 rounded" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div
          data-testid="empty-state"
          className="py-12 text-center text-zinc-400 text-sm border border-dashed border-zinc-200 rounded-lg"
        >
          No time logged yet &mdash; click &lsquo;Log Time&rsquo; to add your first entry
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  Date
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  Hours
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  Description
                </th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  data-testid="time-entry-row"
                  className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                >
                  <td className="py-2 px-3 text-zinc-700 whitespace-nowrap">{entry.date}</td>
                  <td className="py-2 px-3 text-zinc-700 whitespace-nowrap">{entry.hours}</td>
                  <td className="py-2 px-3 text-zinc-900">{entry.description}</td>
                  <td className="py-2 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      {/* Edit — opens TimeEntryModal */}
                      <TimeEntryModal
                        projectId={projectId}
                        entry={entry}
                        trigger={
                          <button
                            className="p-1 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
                            title="Edit entry"
                            aria-label="Edit entry"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        }
                        onSuccess={() => setRefreshCount((c) => c + 1)}
                      />
                      {/* Delete — immediate */}
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-1 rounded hover:bg-red-50 text-zinc-500 hover:text-red-600"
                        title="Delete entry"
                        aria-label="Delete entry"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
