'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { TimeEntryModal } from './TimeEntryModal'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { CalendarImportModal } from './CalendarImportModal'
import { Clock, Download, Trash2, CheckCircle, XCircle, Plus } from 'lucide-react'
import { Button } from './ui/button'
import type { TimeEntry } from '@/db/schema'
import { getEntryStatus, canEdit, canSubmit, canOverrideLock, computeSubtotals } from '@/lib/time-tracking'
import type { EntryStatus } from '@/lib/time-tracking'

interface GlobalTimeEntry extends TimeEntry {
  project_name: string | null
}

interface Project {
  id: number
  name: string
  customer: string
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

// ─── Week Helper Functions ─────────────────────────────────────────────────────

/**
 * Returns the Monday date (YYYY-MM-DD) for the week containing the given date.
 * @param dateStr - Date string in YYYY-MM-DD format
 */
export function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

/**
 * Formats a Monday date into a week header like "Mar 31 – Apr 6, 2026"
 */
function formatWeekHeader(mondayStr: string): string {
  const monday = new Date(mondayStr + 'T00:00:00Z')
  const sunday = new Date(monday)
  sunday.setUTCDate(sunday.getUTCDate() + 6)

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const startMonth = monthNames[monday.getUTCMonth()]
  const startDay = monday.getUTCDate()
  const endMonth = monthNames[sunday.getUTCMonth()]
  const endDay = sunday.getUTCDate()
  const year = sunday.getUTCFullYear()

  if (monday.getUTCMonth() === sunday.getUTCMonth()) {
    return `${startMonth} ${startDay} – ${endDay}, ${year}`
  } else {
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`
  }
}

// ─── Main GlobalTimeView Component ─────────────────────────────────────────────

export function GlobalTimeView() {
  const searchParams = useSearchParams()

  // State
  const [entries, setEntries] = useState<GlobalTimeEntry[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string>('user')

  // Filter state
  const [projectFilter, setProjectFilter] = useState<number | null>(() => {
    const p = searchParams.get('project')
    return p ? parseInt(p, 10) : null
  })
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkTargetProject, setBulkTargetProject] = useState<number | null>(null)
  const [bulkProcessing, setBulkProcessing] = useState(false)

  // Fetch session to get user role
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.role) {
          setRole(data.user.role)
        }
      })
      .catch(() => {
        // Ignore - defaults to 'user'
      })
  }, [])

  // Fetch projects for dropdowns
  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.projects ?? [])
        setProjects(
          list.map((p: { id: number; customer?: string; name?: string }) => ({
            id: p.id,
            name: p.customer ?? p.name ?? `Project ${p.id}`,
            customer: p.customer ?? p.name ?? `Project ${p.id}`,
          }))
        )
      })
      .catch(() => setProjects([]))
  }, [])

  // Fetch entries whenever filters change
  const fetchEntries = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (projectFilter) params.set('project_id', projectFilter.toString())
    if (fromDate) params.set('from', fromDate)
    if (toDate) params.set('to', toDate)

    fetch(`/api/time-entries?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setEntries(data.entries ?? [])
        setLoading(false)
      })
      .catch(() => {
        setEntries([])
        setLoading(false)
      })
  }, [projectFilter, fromDate, toDate])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Group entries by week
  const weekGroups = entries.reduce((acc, entry) => {
    const monday = getMondayOfWeek(entry.date)
    if (!acc[monday]) acc[monday] = []
    acc[monday].push(entry)
    return acc
  }, {} as Record<string, GlobalTimeEntry[]>)

  const sortedWeeks = Object.keys(weekGroups).sort((a, b) => b.localeCompare(a))

  // Bulk selection handlers
  function toggleEntry(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(entries.map((e) => e.id)))
    }
  }

  // Bulk action handlers
  async function handleBulkAction(action: 'approve' | 'reject' | 'delete' | 'move') {
    setBulkProcessing(true)

    // Group by project_id
    const groups: Record<number, number[]> = {}
    selectedIds.forEach((id) => {
      const entry = entries.find((e) => e.id === id)
      if (entry) {
        if (!groups[entry.project_id]) groups[entry.project_id] = []
        groups[entry.project_id].push(id)
      }
    })

    try {
      for (const [projectId, ids] of Object.entries(groups)) {
        const payload: Record<string, unknown> = {
          action,
          entry_ids: ids,
        }

        if (action === 'approve') {
          payload.approved_by = role
        } else if (action === 'reject') {
          payload.rejected_by = role
          payload.reason = 'Bulk reject'
        } else if (action === 'move' && bulkTargetProject) {
          payload.target_project_id = bulkTargetProject
        }

        await fetch(`/api/projects/${projectId}/time-entries/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      setSelectedIds(new Set())
      fetchEntries()
    } catch (error) {
      console.error('Bulk action failed:', error)
    } finally {
      setBulkProcessing(false)
    }
  }

  // Export handler
  async function handleExport(format: 'csv' | 'xlsx') {
    const params = new URLSearchParams()
    if (projectFilter) params.set('project_id', projectFilter.toString())
    if (fromDate) params.set('from', fromDate)
    if (toDate) params.set('to', toDate)
    params.set('format', format)

    const url = `/api/time-entries/export?${params}`
    const res = await fetch(url)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = `time-entries.${format}`
    a.click()
    URL.revokeObjectURL(objectUrl)
  }

  // Single entry actions
  async function handleApprove(entry: GlobalTimeEntry) {
    await fetch(`/api/projects/${entry.project_id}/time-entries/${entry.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved_by: role }),
    })
    fetchEntries()
  }

  async function handleReject(entry: GlobalTimeEntry) {
    const reason = window.prompt('Rejection reason:')
    if (!reason) return

    await fetch(`/api/projects/${entry.project_id}/time-entries/${entry.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejected_by: role, reason }),
    })
    fetchEntries()
  }

  const isApprover = role === 'admin' || role === 'approver'

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end border-b border-zinc-200 pb-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700">Project</label>
          <select
            value={projectFilter ?? ''}
            onChange={(e) => setProjectFilter(e.target.value ? parseInt(e.target.value, 10) : null)}
            className="border border-zinc-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-zinc-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-700">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-zinc-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
        </div>

        <div className="ml-auto flex gap-2">
          <TimeEntryModal
            projectId={projectFilter !== null ? projectFilter : undefined}
            projects={projects}
            trigger={
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Entry
              </Button>
            }
            onSuccess={fetchEntries}
          />

          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="w-4 h-4 mr-1" />
            Export CSV
          </Button>

          <Button variant="outline" size="sm" onClick={() => handleExport('xlsx')}>
            <Download className="w-4 h-4 mr-1" />
            Export XLSX
          </Button>

          <CalendarImportModal onSuccess={fetchEntries} />
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
          <span className="text-sm text-blue-900 font-medium">
            {selectedIds.size} selected
          </span>

          {isApprover && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('approve')}
                disabled={bulkProcessing}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('reject')}
                disabled={bulkProcessing}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkAction('delete')}
            disabled={bulkProcessing}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>

          <div className="flex items-center gap-2">
            <select
              value={bulkTargetProject ?? ''}
              onChange={(e) => setBulkTargetProject(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="border border-zinc-300 rounded px-2 py-1 text-sm"
            >
              <option value="">Select target...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('move')}
              disabled={bulkProcessing || !bulkTargetProject}
            >
              Move
            </Button>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto"
          >
            Clear
          </Button>
        </div>
      )}

      {/* Select all */}
      {entries.length > 0 && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedIds.size === entries.length}
            onChange={toggleSelectAll}
            className="rounded"
          />
          <span className="text-sm text-zinc-600">Select all</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-sm text-zinc-500">Loading time entries...</div>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No time entries found</p>
          <p className="text-sm mt-1">Try adjusting your filters or add a new entry</p>
        </div>
      )}

      {/* Week groups */}
      {!loading && sortedWeeks.map((monday) => {
        const weekEntries = weekGroups[monday]
        const subtotals = computeSubtotals(weekEntries)

        return (
          <div key={monday} className="space-y-3">
            <div className="flex items-baseline gap-3 border-b border-zinc-200 pb-2">
              <h3 className="text-lg font-semibold text-zinc-900">
                {formatWeekHeader(monday)}
              </h3>
              <span className="text-sm text-zinc-500">
                {subtotals.total_hours.toFixed(2)} hours total
              </span>
            </div>

            <div className="space-y-2">
              {weekEntries.map((entry) => {
                const status = getEntryStatus(entry)
                const editable = canEdit(entry)
                const submittable = canSubmit(entry)

                return (
                  <div
                    key={entry.id}
                    className="border border-zinc-200 rounded-lg p-3 flex items-center gap-3 hover:bg-zinc-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(entry.id)}
                      onChange={() => toggleEntry(entry.id)}
                      className="rounded"
                    />

                    <div className="flex-1 grid grid-cols-6 gap-3 items-center">
                      <span className="text-sm text-zinc-700">{entry.date}</span>

                      <span className="text-sm font-medium text-zinc-900 bg-blue-50 px-2 py-1 rounded">
                        {entry.project_name ?? 'Unknown'}
                      </span>

                      <span className="text-sm text-zinc-700">{entry.hours} hrs</span>

                      <span className="text-sm text-zinc-700 col-span-2 truncate">
                        {entry.description}
                      </span>

                      <StatusBadge status={status} />
                    </div>

                    <div className="flex gap-2">
                      {isApprover && status === 'submitted' && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleApprove(entry)}
                          >
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReject(entry)}
                          >
                            <XCircle className="w-4 h-4 text-red-600" />
                          </Button>
                        </>
                      )}

                      {editable && (
                        <TimeEntryModal
                          projectId={entry.project_id}
                          entry={entry}
                          trigger={
                            <Button size="sm" variant="ghost">
                              Edit
                            </Button>
                          }
                          onSuccess={fetchEntries}
                        />
                      )}

                      {editable && (
                        <DeleteConfirmDialog
                          entityLabel="time entry"
                          trigger={
                            <Button size="sm" variant="ghost">
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          }
                          onConfirm={async () => {
                            await fetch(`/api/projects/${entry.project_id}/time-entries/${entry.id}`, {
                              method: 'DELETE',
                            })
                            fetchEntries()
                          }}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
