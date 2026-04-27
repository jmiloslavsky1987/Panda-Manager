'use client'

import { useState, useEffect } from 'react'
import { ConfidenceBadge } from './ConfidenceBadge'

interface CalendarEventItem {
  event_id: string
  summary: string
  date: string
  start_time: string
  end_time: string
  duration_hours: string
  matched_project_id: number | null
  matched_project_name: string | null
  match_confidence: 'high' | 'low' | 'none'
}

interface Project {
  id: number
  name: string
}

interface EventRow {
  event: CalendarEventItem
  selectedProjectId: number | null
  skip: boolean
}

interface CalendarImportModalProps {
  projectId?: number
  onSuccess: () => void
}

// ─── URL helper ───────────────────────────────────────────────────────────────

export function getCalendarImportBaseUrl(projectId?: number): string {
  return projectId
    ? `/api/projects/${projectId}/time-entries/calendar-import`
    : `/api/time-entries/calendar-import`
}

// ─── Week helpers ─────────────────────────────────────────────────────────────

function getMondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function CalendarImportModal({ projectId, onSuccess }: CalendarImportModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [weekStart, setWeekStart] = useState(getMondayOfWeek(new Date()))
  const [events, setEvents] = useState<EventRow[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState<number | null>(null)

  // Check connection status when modal opens
  useEffect(() => {
    if (!isOpen) return
    setSuccessCount(null)
    setError(null)

    fetch('/api/oauth/calendar/status')
      .then((r) => r.json())
      .then((data) => setConnected(data.connected))
      .catch(() => setConnected(false))

    // Fetch all projects for override dropdown
    fetch('/api/projects')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        // API may return { projects: [...] } or flat array
        const list = Array.isArray(data) ? data : (data.projects ?? [])
        setProjects(list.map((p: { id: number; customer?: string; name?: string }) => ({
          id: p.id,
          name: p.customer ?? p.name ?? `Project ${p.id}`,
        })))
      })
      .catch(() => setProjects([]))
  }, [isOpen])

  // Fetch events when connected and weekStart changes (while open)
  useEffect(() => {
    if (!isOpen || !connected) return
    setLoading(true)
    setError(null)
    setEvents([])

    const baseUrl = getCalendarImportBaseUrl(projectId)
    fetch(`${baseUrl}?week_start=${weekStart}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error === 'not_connected') {
          setConnected(false)
          return
        }
        if (data.error) {
          setError(data.error)
          return
        }
        const items: CalendarEventItem[] = Array.isArray(data) ? data : []
        setEvents(items.map((e) => ({
          event: e,
          selectedProjectId: e.matched_project_id,
          skip: false,
        })))
      })
      .catch(() => setError('Failed to fetch calendar events'))
      .finally(() => setLoading(false))
  }, [isOpen, connected, weekStart, projectId])

  async function handleImport() {
    setImporting(true)
    setError(null)

    const correctedPayload = events.map((row) => ({
      event_id: row.event.event_id,
      date: row.event.date,
      duration_hours: row.event.duration_hours,
      description: row.event.summary,
      project_id: row.skip ? null : row.selectedProjectId,
      skip: row.skip,
    }))

    try {
      const baseUrl = getCalendarImportBaseUrl(projectId)
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(correctedPayload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Import failed')
        setImporting(false)
        return
      }
      setSuccessCount(data.created_count)
      onSuccess()
      // Close after short delay to show success message
      setTimeout(() => setIsOpen(false), 1500)
    } catch {
      setError('Network error — please try again')
    } finally {
      setImporting(false)
    }
  }

  function updateRow(eventId: string, patch: Partial<Pick<EventRow, 'selectedProjectId' | 'skip'>>) {
    setEvents((prev) =>
      prev.map((row) =>
        row.event.event_id === eventId ? { ...row, ...patch } : row,
      ),
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Trigger button */}
      <button
        data-testid="import-calendar-btn"
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 text-sm border border-zinc-300 rounded hover:bg-zinc-50 flex items-center gap-1.5"
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
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Import from Calendar
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Import from Google Calendar"
          data-testid="calendar-import-modal"
        >
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-3xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900">Import from Google Calendar</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-lg leading-none"
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            {/* Connection check */}
            {connected === null && (
              <p className="text-sm text-zinc-500">Checking calendar connection...</p>
            )}

            {connected === false && (
              <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-sm text-zinc-700">Google Calendar is not connected.</p>
                <button
                  onClick={() => { window.location.href = '/api/oauth/calendar' }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  data-testid="connect-calendar-btn"
                >
                  Connect Google Calendar
                </button>
              </div>
            )}

            {connected === true && (
              <>
                {/* Week picker */}
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-zinc-700">Week starting (Monday)</label>
                  <input
                    type="date"
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    className="border border-zinc-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
                    data-testid="week-start-picker"
                  />
                </div>

                {/* Events table */}
                <div className="overflow-y-auto flex-1 min-h-0">
                  {loading && (
                    <div className="space-y-2 animate-pulse py-4">
                      {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-zinc-100 rounded" />)}
                    </div>
                  )}

                  {!loading && events.length === 0 && !error && (
                    <p className="text-sm text-zinc-400 py-6 text-center">
                      No calendar events found for this week.
                    </p>
                  )}

                  {!loading && events.length > 0 && (
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200">
                          <th className="text-left py-2 px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Event</th>
                          <th className="text-left py-2 px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Date</th>
                          <th className="text-left py-2 px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Duration</th>
                          <th className="text-left py-2 px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Project</th>
                          <th className="text-center py-2 px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Skip</th>
                        </tr>
                      </thead>
                      <tbody>
                        {events.map((row) => (
                          <tr
                            key={row.event.event_id}
                            className={`border-b border-zinc-100 ${row.skip ? 'opacity-40' : ''}`}
                            data-testid="calendar-event-row"
                          >
                            <td className="py-2 px-2">
                              <div className="font-medium text-zinc-900 truncate max-w-[180px]" title={row.event.summary}>
                                {row.event.summary}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {row.event.start_time} – {row.event.end_time}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-zinc-700 whitespace-nowrap">{row.event.date}</td>
                            <td className="py-2 px-2 text-zinc-700 whitespace-nowrap">{row.event.duration_hours} hrs</td>
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={row.selectedProjectId ?? ''}
                                  onChange={(e) =>
                                    updateRow(row.event.event_id, {
                                      selectedProjectId: e.target.value ? parseInt(e.target.value, 10) : null,
                                      skip: !e.target.value,
                                    })
                                  }
                                  disabled={row.skip}
                                  className="border border-zinc-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 max-w-[200px]"
                                  data-testid="project-select"
                                >
                                  <option value="">Non-project activity</option>
                                  {projects.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                                </select>
                                <ConfidenceBadge confidence={row.event.match_confidence} />
                              </div>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={row.skip}
                                onChange={(e) => updateRow(row.event.event_id, { skip: e.target.checked })}
                                className="rounded border-zinc-300"
                                data-testid="skip-checkbox"
                                aria-label={`Skip ${row.event.summary}`}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Error */}
                {error && <p className="text-red-600 text-sm">{error}</p>}

                {/* Success */}
                {successCount !== null && (
                  <p className="text-green-700 text-sm font-medium">
                    {successCount} {successCount === 1 ? 'entry' : 'entries'} imported successfully.
                  </p>
                )}

                {/* Footer */}
                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                  <button
                    onClick={() => setIsOpen(false)}
                    disabled={importing}
                    className="px-4 py-2 text-sm border border-zinc-300 rounded hover:bg-zinc-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importing || events.length === 0 || events.every((r) => r.skip)}
                    className="px-4 py-2 text-sm bg-zinc-900 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
                    data-testid="import-selected-btn"
                  >
                    {importing ? 'Importing...' : 'Import Selected'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
