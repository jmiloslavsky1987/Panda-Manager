'use client'

import { useState, cloneElement, isValidElement } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'
import type { Milestone } from '../lib/queries'

interface MilestoneEditModalProps {
  milestone: Milestone
  trigger: React.ReactNode
}

export function MilestoneEditModal({ milestone, trigger }: MilestoneEditModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState(milestone.status ?? '')
  const [target, setTarget] = useState(milestone.target ?? '')
  const [owner, setOwner] = useState(milestone.owner ?? '')
  const [notes, setNotes] = useState(milestone.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/milestones/${milestone.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, target, owner, notes }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to save')
        return
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {isValidElement(trigger)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? cloneElement(trigger as React.ReactElement<any>, { onClick: () => setOpen(true), className: ['cursor-pointer', (trigger as React.ReactElement<any>).props.className].filter(Boolean).join(' ') })
        : <div onClick={() => setOpen(true)} className="cursor-pointer">{trigger}</div>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="milestone-edit-modal">
          <DialogHeader>
            <DialogTitle>Edit Milestone</DialogTitle>
            <p className="text-xs text-zinc-500 font-mono">{milestone.external_id}</p>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-zinc-900">{milestone.name}</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700" htmlFor="milestone-status">
                Status
              </label>
              <input
                id="milestone-status"
                type="text"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="e.g. completed, in_progress, blocked..."
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700" htmlFor="milestone-target">
                Target Date
              </label>
              <input
                id="milestone-target"
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="ISO date or TBD"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700" htmlFor="milestone-owner">
                Owner
              </label>
              <input
                id="milestone-owner"
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Owner name"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700" htmlFor="milestone-notes">
                Notes
              </label>
              <textarea
                id="milestone-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Milestone notes..."
                rows={3}
                className="w-full border rounded px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
