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

interface ArchitectureEditModalProps {
  workstream: {
    id: number
    name: string
    state: string | null
    lead: string | null
  }
}

export function ArchitectureEditModal({ workstream }: ArchitectureEditModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState(workstream.state ?? '')
  const [lead, setLead] = useState(workstream.lead ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/workstreams/${workstream.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, lead }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Save failed')
        setSaving(false)
        return
      }

      setOpen(false)
      router.refresh()
    } catch {
      setError('Network error — please try again')
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <span data-testid="architecture-edit-trigger">
          <Button size="sm" variant="outline">Edit</Button>
        </span>
      </DialogTrigger>
      <DialogContent data-testid="architecture-edit-modal">
        <DialogHeader>
          <DialogTitle>Edit Workstream: {workstream.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Integration State</label>
            <textarea
              value={state}
              onChange={e => setState(e.target.value)}
              rows={6}
              placeholder="Describe the current integration state..."
              className="w-full border rounded p-2 text-sm resize-y whitespace-pre-wrap focus:outline-none focus:ring-2 focus:ring-zinc-400 font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Lead</label>
            <input
              type="text"
              value={lead}
              onChange={e => setLead(e.target.value)}
              placeholder="Workstream lead name..."
              className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
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
            <Button type="submit" disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
