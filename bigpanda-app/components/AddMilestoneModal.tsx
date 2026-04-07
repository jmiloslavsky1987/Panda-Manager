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

interface AddMilestoneModalProps {
  projectId: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddMilestoneModal({ projectId, open: controlledOpen, onOpenChange }: AddMilestoneModalProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = (value: boolean) => {
    setInternalOpen(value)
    onOpenChange?.(value)
  }
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [owner, setOwner] = useState('')
  const [notes, setNotes] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          name,
          target: target || undefined,
          owner: owner || undefined,
          notes: notes || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Save failed')
        setSaving(false)
        return
      }

      setOpen(false)
      setName('')
      setTarget('')
      setOwner('')
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
        <span data-testid="add-milestone-trigger">
          <Button data-testid="add-milestone-btn">Add Milestone</Button>
        </span>
      </DialogTrigger>
      <DialogContent data-testid="add-milestone-modal">
        <DialogHeader>
          <DialogTitle>Add Milestone</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Milestone name..."
              className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Target <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder="YYYY-MM-DD or TBD"
              className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
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
              placeholder="Who owns this milestone?"
              className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
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
            <Button type="submit" disabled={saving || !name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
