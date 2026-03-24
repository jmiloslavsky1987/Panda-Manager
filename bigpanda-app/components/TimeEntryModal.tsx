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
  projectId: number
  entry?: TimeEntry          // undefined = create, defined = edit
  trigger: React.ReactNode
  onSuccess: () => void      // parent re-fetches on success
}

export function TimeEntryModal({ projectId, entry, trigger, onSuccess }: TimeEntryModalProps) {
  const isEdit = entry !== undefined
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    setSaving(true)
    setError(null)

    const payload = { date, hours: String(hours), description }

    try {
      const url = isEdit
        ? `/api/projects/${projectId}/time-entries/${entry.id}`
        : `/api/projects/${projectId}/time-entries`
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
