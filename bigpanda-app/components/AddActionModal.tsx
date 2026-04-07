'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface AddActionModalProps {
  projectId: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddActionModal({ projectId, open: controlledOpen, onOpenChange }: AddActionModalProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = (value: boolean) => {
    setInternalOpen(value)
    onOpenChange?.(value)
  }
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [owner, setOwner] = useState('')
  const [due, setDue] = useState('')
  const [status, setStatus] = useState('open')
  const [notes, setNotes] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, description, owner: owner || undefined, due: due || undefined, status, notes: notes || undefined }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Save failed')
        setSaving(false)
        return
      }

      setOpen(false)
      setDescription('')
      setOwner('')
      setDue('')
      setStatus('open')
      setNotes('')
      router.refresh()
    } catch {
      setError('Network error — please try again')
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <span data-testid="add-action-trigger">
          <Button data-testid="add-action-btn">Add Action</Button>
        </span>
      </DialogTrigger>
      <DialogContent data-testid="add-action-modal">
        <DialogHeader>
          <DialogTitle>Add Action</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              required
              placeholder="Describe the action..."
              className="w-full border rounded p-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Owner <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={owner}
              onChange={e => setOwner(e.target.value)}
              placeholder="Who owns this action?"
              className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Due <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={due}
              onChange={e => setDue(e.target.value)}
              placeholder="YYYY-MM-DD or TBD"
              className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Notes <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Additional notes..."
              className="w-full border rounded p-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          {error && (
            <p data-testid="error-toast" className="text-red-600 text-sm">
              {error}
            </p>
          )}

          <DialogFooter>
            {saving && (
              <p data-testid="saving-indicator" className="text-sm text-zinc-500 self-center mr-auto">
                Saving...
              </p>
            )}
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !description.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
