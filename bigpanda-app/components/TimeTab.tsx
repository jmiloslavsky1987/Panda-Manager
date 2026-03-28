'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { TimeEntryModal } from './TimeEntryModal'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { CalendarImportModal } from './CalendarImportModal'
import type { TimeEntry } from '@/db/schema'
import { getEntryStatus, canEdit, canSubmit, canOverrideLock } from '@/lib/time-tracking'
import type { EntryStatus } from '@/lib/time-tracking'

interface TimeTabProps {
  projectId: number
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<EntryStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-500',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  locked: 'bg-amber-100 text-amber-700',
}

function StatusBadge({ status }: { status: EntryStatus }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${STATUS_COLORS[status]}`}
      data-testid="status-badge"
    >
      {status === 'locked' && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-0.5"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )}
      {status}
    </span>
  )
}

// ─── ISO week helpers ──────────────────────────────────────────────────────────

function getMondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday = start of ISO week
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

// ─── CSV export ────────────────────────────────────────────────────────────────

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

// ─── Inline add form ───────────────────────────────────────────────────────────

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

// ─── Submit Week Dialog ────────────────────────────────────────────────────────

interface SubmitWeekDialogProps {
  projectId: number
  role: string
  entries: TimeEntry[]
  onClose: () => void
  onSuccess: () => void
}

function SubmitWeekDialog({ projectId, role, entries, onClose, onSuccess }: SubmitWeekDialogProps) {
  const [weekStart, setWeekStart] = useState(getMondayOfWeek(new Date()))
  const [submittedBy, setSubmittedBy] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Collect unique submitted_by values from existing entries for the approver dropdown
  const recentSubmitters = Array.from(
    new Set(entries.map((e) => e.submitted_by).filter((v): v is string => Boolean(v)))
  )

  const isApprover = role === 'approver' || role === 'admin'

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    try {
      const body: { week_start: string; submitted_by?: string } = { week_start: weekStart }
      if (isApprover && submittedBy) {
        body.submitted_by = submittedBy
      }
      const res = await fetch(`/api/projects/${projectId}/time-entries/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit')
        setSaving(false)
        return
      }
      onSuccess()
      onClose()
    } catch {
      setError('Network error — please try again')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Submit Week for Approval"
      data-testid="submit-week-dialog"
    >
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-base font-semibold text-zinc-900">Submit Week for Approval</h2>

        {/* Week picker */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700">Week starting (Monday)</label>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="border border-zinc-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
        </div>

        {/* Submit for: selector — approver/admin only (TTADV-09) */}
        {isApprover && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700">Submit for:</label>
            <input
              list="recent-submitters"
              value={submittedBy}
              onChange={(e) => setSubmittedBy(e.target.value)}
              placeholder="Enter username or select..."
              className="border border-zinc-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
              data-testid="submit-for-input"
            />
            {recentSubmitters.length > 0 && (
              <datalist id="recent-submitters">
                {recentSubmitters.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            )}
            <p className="text-xs text-zinc-400">Leave blank to submit on your own behalf.</p>
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm border border-zinc-300 rounded hover:bg-zinc-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Confirm Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main TimeTab ──────────────────────────────────────────────────────────────

export function TimeTab({ projectId }: TimeTabProps) {
  const searchParams = useSearchParams()
  const role = searchParams.get('role') ?? 'user'

  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)

  // Per-entry action saving state: entryId → action string
  const [savingEntry, setSavingEntry] = useState<Record<number, string>>({})

  // Analytics state
  const [weeklyRollup, setWeeklyRollup] = useState<{ weekLabel: string; hours: number; variance: number | null }[]>([])
  const [weeklyTarget, setWeeklyTarget] = useState<number | null>(null)
  const [totalHoursThisWeek, setTotalHoursThisWeek] = useState<number>(0)
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetInput, setTargetInput] = useState('')
  const [summaryExpanded, setSummaryExpanded] = useState(true)

  // ─── Notification state ────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<{
    id: number
    type: string
    title: string
    body: string
    read: boolean
    created_at: string
  }[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)

  const isApprover = role === 'approver' || role === 'admin'

  const refresh = useCallback(() => setRefreshCount((c) => c + 1), [])

  // ─── Notification fetch + auto-refresh ───────────────────────────────────
  const fetchNotifications = useCallback(() => {
    fetch('/api/notifications/time-tracking')
      .then((r) => (r.ok ? r.json() : { notifications: [], unread_count: 0 }))
      .then((data) => {
        setNotifications(data.notifications ?? [])
        setUnreadCount(data.unread_count ?? 0)
      })
      .catch(() => {/* non-fatal — notifications are supplementary */})
  }, [])

  useEffect(() => {
    fetchNotifications()
    // Auto-refresh every 60 seconds while component is mounted
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  async function handleDismissNotification(id: number) {
    await fetch('/api/notifications/time-tracking', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {/* non-fatal */})
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setUnreadCount((c) => Math.max(0, c - 1))
  }

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
    refresh()
  }

  function handleAddSuccess() {
    setShowAddForm(false)
    refresh()
  }

  // Approve a single entry (approver/admin only)
  async function handleApprove(entryId: number) {
    setSavingEntry((prev) => ({ ...prev, [entryId]: 'approve' }))
    try {
      const res = await fetch(
        `/api/projects/${projectId}/time-entries/${entryId}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved_by: role }),
        }
      )
      if (res.ok) {
        refresh()
      }
    } finally {
      setSavingEntry((prev) => {
        const next = { ...prev }
        delete next[entryId]
        return next
      })
    }
  }

  // Reject a single entry (approver/admin only)
  async function handleReject(entryId: number) {
    const reason = window.prompt('Rejection reason (required):')
    if (!reason || !reason.trim()) return

    setSavingEntry((prev) => ({ ...prev, [entryId]: 'reject' }))
    try {
      const res = await fetch(
        `/api/projects/${projectId}/time-entries/${entryId}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rejected_by: role, reason: reason.trim() }),
        }
      )
      if (res.ok) {
        refresh()
      }
    } finally {
      setSavingEntry((prev) => {
        const next = { ...prev }
        delete next[entryId]
        return next
      })
    }
  }

  // Override lock (admin/approver only)
  async function handleOverrideLock(entryId: number) {
    setSavingEntry((prev) => ({ ...prev, [entryId]: 'unlock' }))
    try {
      const res = await fetch(
        `/api/projects/${projectId}/time-entries/${entryId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locked: false }),
        }
      )
      if (res.ok) {
        refresh()
      }
    } finally {
      setSavingEntry((prev) => {
        const next = { ...prev }
        delete next[entryId]
        return next
      })
    }
  }

  return (
    <div data-testid="time-tab" className="space-y-4">
      {/* Notification Banner — shown when unread timesheet notifications exist */}
      {unreadCount > 0 && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm text-yellow-800 font-medium">
            You have {unreadCount} timesheet notification{unreadCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setShowNotifications((v) => !v)}
            className="text-sm text-yellow-700 underline hover:text-yellow-900"
          >
            {showNotifications ? 'Hide' : 'View'}
          </button>
        </div>
      )}

      {/* Notification list — expanded when user clicks View */}
      {showNotifications && notifications.filter((n) => !n.read).length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-white divide-y divide-yellow-100">
          {notifications.filter((n) => !n.read).map((n) => (
            <div key={n.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-900">{n.title}</p>
                <p className="text-sm text-zinc-600 mt-0.5">{n.body}</p>
              </div>
              <button
                onClick={() => handleDismissNotification(n.id)}
                className="shrink-0 text-xs text-zinc-400 hover:text-zinc-700 border border-zinc-200 rounded px-2 py-0.5"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Submit Week Dialog */}
      {showSubmitDialog && (
        <SubmitWeekDialog
          projectId={projectId}
          role={role}
          entries={entries}
          onClose={() => setShowSubmitDialog(false)}
          onSuccess={refresh}
        />
      )}

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
          {/* Submit Week button */}
          <button
            data-testid="submit-week-btn"
            onClick={() => setShowSubmitDialog(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Submit Week
          </button>
          {/* Import from Calendar — CalendarImportModal manages its own open/close state */}
          <CalendarImportModal projectId={projectId} onSuccess={refresh} />
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

      {/* Entry Table */}
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
                <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const status = getEntryStatus(entry)
                const editable = canEdit(entry)
                const submittable = canSubmit(entry)
                const locked = entry.locked
                const isSaving = savingEntry[entry.id]

                return (
                  <tr
                    key={entry.id}
                    data-testid="time-entry-row"
                    className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                  >
                    <td className="py-2 px-3 text-zinc-700 whitespace-nowrap">{entry.date}</td>
                    <td className="py-2 px-3 text-zinc-700 whitespace-nowrap">{entry.hours}</td>
                    <td className="py-2 px-3 text-zinc-900">{entry.description}</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <StatusBadge status={status} />
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Saving indicator */}
                        {isSaving && (
                          <span className="text-xs text-zinc-400">Saving...</span>
                        )}

                        {/* Approve button — shown to approver/admin when entry is submitted */}
                        {isApprover && status === 'submitted' && !isSaving && (
                          <button
                            onClick={() => handleApprove(entry.id)}
                            className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                            title="Approve entry"
                            aria-label="Approve entry"
                            data-testid="approve-btn"
                          >
                            Approve
                          </button>
                        )}

                        {/* Reject button — shown to approver/admin when entry is submitted */}
                        {isApprover && status === 'submitted' && !isSaving && (
                          <button
                            onClick={() => handleReject(entry.id)}
                            className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                            title="Reject entry"
                            aria-label="Reject entry"
                            data-testid="reject-btn"
                          >
                            Reject
                          </button>
                        )}

                        {/* Override Lock button — admin/approver when entry is locked */}
                        {locked && canOverrideLock(role) && !isSaving && (
                          <button
                            onClick={() => handleOverrideLock(entry.id)}
                            className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                            title="Override lock"
                            aria-label="Override lock"
                            data-testid="override-lock-btn"
                          >
                            Unlock
                          </button>
                        )}

                        {/* Edit — only when canEdit */}
                        {editable && !isSaving && (
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
                            onSuccess={refresh}
                          />
                        )}

                        {/* Lock icon when entry is locked (non-override users) */}
                        {locked && !canOverrideLock(role) && (
                          <span
                            className="p-1 text-amber-500"
                            title="Entry is locked"
                            aria-label="Entry is locked"
                            data-testid="lock-icon"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          </span>
                        )}

                        {/* Delete — only when canEdit and not locked */}
                        {editable && !isSaving && (
                          <DeleteConfirmDialog
                            entityLabel="this time entry"
                            onConfirm={() => handleDelete(entry.id)}
                            trigger={
                              <button
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
                            }
                          />
                        )}

                        {/* Submittable indicator — shown for user role when canSubmit */}
                        {!isApprover && submittable && !editable && (
                          <span className="text-xs text-zinc-400 italic">ready</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
