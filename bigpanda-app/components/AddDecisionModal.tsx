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

interface AddDecisionModalProps {
  projectId: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddDecisionModal({ projectId, open: controlledOpen, onOpenChange }: AddDecisionModalProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = (value: boolean) => {
    setInternalOpen(value)
    onOpenChange?.(value)
  }
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [decision, setDecision] = useState('')
  const [context, setContext] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, decision, context }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Save failed')
        setSaving(false)
        return
      }

      setOpen(false)
      setDecision('')
      setContext('')
      router.refresh()
    } catch {
      setError('Network error — please try again')
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <span data-testid="add-decision-trigger">
          <Button data-testid="add-decision-btn">Add Decision</Button>
        </span>
      </DialogTrigger>
      <DialogContent data-testid="add-decision-modal">
        <DialogHeader>
          <DialogTitle>Add Key Decision</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Decision <span className="text-red-500">*</span>
            </label>
            <textarea
              value={decision}
              onChange={e => setDecision(e.target.value)}
              rows={3}
              required
              placeholder="Describe the decision made..."
              className="w-full border rounded p-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Context <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              rows={3}
              placeholder="Why was this decision made? What alternatives were considered?"
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
            <Button type="submit" disabled={saving || !decision.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
