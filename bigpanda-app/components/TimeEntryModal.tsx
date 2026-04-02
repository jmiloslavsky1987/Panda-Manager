'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from './ui/dialog'
import { Button } from './ui/button'
import type { TimeEntry } from '@/db/schema'

interface TimeEntryModalProps {
  projectId?: number         // optional in global context — comes from dropdown selection
  entry?: TimeEntry          // undefined = create, defined = edit
  trigger: React.ReactNode
  onSuccess: () => void      // parent re-fetches on success
  projects?: Array<{ id: number; name: string; customer: string }>  // passed by GlobalTimeView
}

export function TimeEntryModal({ projectId, entry, trigger, onSuccess, projects }: TimeEntryModalProps) {
  const isEdit = entry !== undefined
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Project selection state for global context
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    projectId ?? (isEdit ? entry.project_id : null)
  )

  const [date, setDate] = useState<string>(
    isEdit ? entry.date : new Date().toISOString().slice(0, 10)
  )
  const [hours, setHours] = useState<string>(
    isEdit ? entry.hours : ''
  )
  const [description, setDescription] = useState<string>(
    isEdit ? entry.description : ''
  )

  function resetForm() {
    if (!isEdit) {
      setDate(new Date().toISOString().slice(0, 10))
      setHours('')
      setDescription('')
    }
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validation: ensure project is selected in global context
    if (!isEdit && !selectedProjectId) {
      setError('Please select a project')
      return
    }

    setSaving(true)
    setError(null)

    const payload = { date, hours: String(hours), description }

    try {
      // Use selectedProjectId for create, entry.project_id for edit
      const targetProjectId = isEdit ? entry.project_id : selectedProjectId!

      const url = isEdit
        ? `/api/projects/${targetProjectId}/time-entries/${entry.id}`
        : `/api/projects/${targetProjectId}/time-entries`
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Save failed')
        setSaving(false)
        return
      }

      setSaving(false)
      setOpen(false)
      resetForm()
      onSuccess()
    } catch {
      setError('Network error — please try again')
      setSaving(false)
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <span className="inline-flex">{trigger}</span>
      </DialogTrigger>
      <DialogContent data-testid="time-entry-modal">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Time Entry' : 'Log Time'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project dropdown for global context (create mode only) */}
          {projects && !isEdit && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedProjectId ?? ''}
                onChange={(e) => setSelectedProjectId(e.target.value ? parseInt(e.target.value, 10) : null)}
                required
                className="w-full border border-zinc-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                <option value="">Select a project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.customer}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full border border-zinc-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Hours</label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
              placeholder="e.g. 1.5"
              className="w-full border border-zinc-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="What did you work on?"
              className="w-full border border-zinc-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <DialogFooter>
            {saving && (
              <p className="text-sm text-zinc-500 self-center mr-auto">Saving...</p>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {isEdit ? 'Save' : 'Log Time'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
